// server/routes/wprPractice.js
// WPR Practice Test for other teachers at the school (wpr-practice/).
// A teacher enters the shared teacher passcode (WPR_TEACHER_PASSCODE in .env)
// on wpr-practice/teacher.html, picks a test length, and gets a 6-letter
// class code. Students open wpr-practice/ (no login), enter the code, their
// name, and student ID, and take the same locked-down test as the Monday
// Sprint (js/wrs-test-ui.js).
//
// NOTHING IS STORED: sessions live only in this process's memory. They are
// erased 15 minutes after the teacher ends the session, 12 hours after they
// start, or whenever the server restarts -- so teachers download their
// results (summary CSV, question-by-question CSV, printable report).
//
// Answers are held: when students submit they see only their score. Ending
// the session releases every student's answers and their report (a PDF made
// in their browser, wpr-practice/assets/report-pdf.js) for those 15 minutes.
// A count of active sessions (no student data) is written to
// /tmp/wpr_active_sessions so deploys can wait instead of restarting mid-test,
// and a count of sessions still in use (anyone active in the last 45 minutes,
// including a teacher's results page, which checks in every few seconds) to
// /tmp/wpr_sessions_in_use, so a deploy also waits for a teacher whose class
// has finished but who may not have downloaded the results yet.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const { buildTest } = require('../lib/wrsPool');
const { loadReadyQuestions } = require('./wprBanks');

const LENGTHS = {
    sprint: { label: '10-minute Sprint (100 questions)', count: 100, seconds: 600 },
    short: { label: '25 questions, 20 minutes', count: 25, seconds: 1200 },
    half: { label: '50 questions, 40 minutes', count: 50, seconds: 2400 },
    full: { label: 'Full state practice: 100 questions, 1 hour', count: 100, seconds: 3600 }
};
const SESSION_HOURS = 12;
const GRACE_SECONDS = 30;
const IN_USE_MINUTES = 45;
const MARKER_DIR = process.env.WPR_MARKER_DIR || '/tmp';
const TIME_X = [1, 1.5, 2];   // standard, time and a half, double time
const RELEASE_MINUTES = 15;   // after the teacher ends the test: students see their answers and save their report
const sessions = new Map(); // code -> session

// One student's time limit: the session's, or more if the teacher gave them time and a half or double
// time (POST /wpr/session/:code/time).
const secondsFor = (session, st) => Math.round(session.seconds * (st.timeX || 1));

function writeActiveMarker() {
    const now = Date.now();
    let active = 0, inUse = 0;
    sessions.forEach(s => {
        if (now - s.lastActive < IN_USE_MINUTES * 60 * 1000) inUse++;
        s.students.forEach(st => { if (st.startedAt && !st.submittedAt && now - st.startedAt < (secondsFor(s, st) + 120) * 1000) active++; });
    });
    try {
        fs.writeFileSync(`${MARKER_DIR}/wpr_active_sessions`, String(active));
        fs.writeFileSync(`${MARKER_DIR}/wpr_sessions_in_use`, String(inUse));
    } catch (e) { /* best effort */ }
}
setInterval(() => {
    const now = Date.now();
    sessions.forEach((s, code) => { if (now > s.expiresAt) sessions.delete(code); });
    writeActiveMarker();
}, 60 * 1000).unref();

// Small in-memory throttle so the passcode and class codes can't be guessed.
const attempts = new Map();
function throttled(key, max, windowMs) {
    const now = Date.now();
    const list = (attempts.get(key) || []).filter(t => now - t < windowMs);
    list.push(now);
    attempts.set(key, list);
    return list.length > max;
}
const ipOf = req => String(req.headers['cf-connecting-ip'] || req.ip || '');
const token = () => crypto.randomBytes(18).toString('hex');
const safeEq = (a, b) => {
    const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(x, y);
};
function newCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do { code = Array.from(crypto.randomBytes(6)).map(b => alphabet[b % alphabet.length]).join(''); } while (sessions.has(code));
    return code;
}
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

const publicQuestions = qs => qs.map((q, i) => ({ n: i + 1, kind: q.kind, topic: q.topic || '', prompt: q.prompt, q: q.q, options: q.options }));
function grade(questions, answers) {
    let answered = 0, correct = 0;
    const review = [];
    questions.forEach((q, i) => {
        const a = answers[i];
        if (a === null || a === undefined || a === '') return;
        answered++;
        const right = Number(a) === q.correct;
        if (right) correct++;
        review.push({ n: i + 1, prompt: q.prompt, q: q.q, topic: q.topic || '', indicator: q.indicator || '', right, yours: q.options[Number(a)] ?? '', answer: q.options[q.correct], hint: q.hint });
    });
    return { answered, correct, total: questions.length, review };
}
// What a student sees before the teacher ends the test: the score, not the answers.
const scoreOnly = r => ({ answered: r.answered, correct: r.correct, total: r.total });
// What the student's report needs, once released. Initials only: the report never shows a name or student ID.
const initials = st => [st.firstName, st.lastName].map(n => (String(n || '').trim()[0] || '').toUpperCase()).filter(Boolean).map(c => c + '.').join('');
const reportFor = (s, st) => ({
    initials: initials(st), teacher: s.teacher, code: s.code, label: s.label,
    submittedAt: st.submittedAt, violations: st.violations, endReason: st.endReason, availableUntil: s.expiresAt
});
function cleanAnswers(raw, total) {
    const out = {};
    if (raw && typeof raw === 'object') Object.entries(raw).forEach(([k, v]) => {
        const i = Number(k), n = Number(v);
        if (Number.isInteger(i) && i >= 0 && i < total && Number.isInteger(n) && n >= 0 && n < 10) out[i] = n;
    });
    return out;
}
function finish(session, st, answers, reason) {
    if (st.submittedAt) return;
    st.answers = answers;
    st.submittedAt = Date.now();
    st.endReason = reason;
    st.result = grade(st.questions, answers);
    writeActiveMarker();
}
function getStudent(req) {
    const body = req.body || {};
    const session = sessions.get(String(body.code || '').toUpperCase());
    if (!session) return { error: 'That class code has ended or does not exist.' };
    session.lastActive = Date.now();
    const st = [...session.students.values()].find(x => x.token === body.token);
    if (!st) return { error: 'Your test session was not found. Ask your teacher.' };
    return { session, st };
}
function teacherSession(req) {
    const session = sessions.get(String(req.params.code || '').toUpperCase());
    const t = req.get('x-teacher-token') || '';
    if (!session || !t || !safeEq(t, session.teacherToken)) return null;
    session.lastActive = Date.now();
    return session;
}

// One student's test for a session, from the standard pool and/or banks.
function shuffled(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function bankItem(x) {
    const isTf = x.options.length === 2 && x.options.every(o => /^(true|false)$/i.test(o));
    const options = isTf ? ['True', 'False'] : shuffled(x.options);
    return { kind: isTf ? 'tf' : 'mc', topic: 'bank', prompt: isTf ? 'True or false?' : '', q: x.q, options, correct: options.findIndex(o => o.toLowerCase() === String(x.answer).toLowerCase()), hint: '' };
}
function buildSessionTest(session) {
    if (session.source === 'standard' || !session.bankQs || !session.bankQs.length) return buildTest(session.count);
    const bank = shuffled(session.bankQs).map(bankItem).filter(q => q.correct >= 0);
    if (session.source === 'bank') return bank.slice(0, session.count);
    // Standard + banks: up to half the test from the banks.
    const fromBank = bank.slice(0, Math.min(bank.length, Math.floor(session.count / 2)));
    return shuffled([...fromBank, ...buildTest(session.count - fromBank.length)]);
}

// ---- Teacher -------------------------------------------------------------

// POST /wpr/session -- { passcode, length, teacher } -> { code, teacherToken }
router.post('/wpr/session', async (req, res) => {
    const expected = process.env.WPR_TEACHER_PASSCODE || '';
    if (expected.length < 6) return res.status(503).json({ error: 'The WPR Practice Test is not set up yet.' });
    if (throttled('pass:' + ipOf(req), 10, 15 * 60 * 1000)) return res.status(429).json({ error: 'Too many tries. Wait 15 minutes.' });
    const body = req.body || {};
    if (!safeEq(String(body.passcode || '').trim(), expected)) return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    const length = LENGTHS[body.length] ? body.length : 'full';
    // Where questions come from: the standard WRS pool, the standard pool plus
    // teacher question banks (server/routes/wprBanks.js), or only the banks.
    // Bank questions are loaded once here, not per student.
    const source = ['mixed', 'bank'].includes(body.source) ? body.source : 'standard';
    let bankQs = [];
    if (source !== 'standard') {
        try { bankQs = await loadReadyQuestions(body.banks); } catch (e) { console.error('[wpr] banks', e); }
        if (!bankQs.length) return res.status(400).json({ error: 'Those question banks have no questions with answers yet. Add answers, or use the standard questions.' });
    }
    const code = newCode();
    const now = Date.now();
    const session = {
        code, teacherToken: token(), teacher: clean(body.teacher, 60), length, ...LENGTHS[length], source, bankQs,
        createdAt: now, lastActive: now, expiresAt: now + SESSION_HOURS * 3600 * 1000, students: new Map()
    };
    // Only-bank tests can't be longer than the bank.
    if (source === 'bank' && bankQs.length < session.count) {
        session.count = bankQs.length;
        session.label = `${bankQs.length} questions from your question banks, ${Math.round(session.seconds / 60)} minutes`;
    }
    sessions.set(code, session);
    writeActiveMarker();
    res.json({ code, teacherToken: session.teacherToken, length, label: session.label, expiresAt: session.expiresAt, bank_questions: bankQs.length });
});

// GET /wpr/session/:code -- teacher's live view, with everything needed for the downloads
router.get('/wpr/session/:code', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found. It may have ended or expired.' });
    const now = Date.now();
    const students = [...s.students.values()].map(st => ({
        firstName: st.firstName, lastName: st.lastName, studentId: st.studentId,
        status: st.submittedAt ? 'submitted' : st.startedAt ? 'testing' : 'joined',
        secondsLeft: st.startedAt && !st.submittedAt ? Math.max(0, Math.round((st.startedAt + secondsFor(s, st) * 1000 - now) / 1000)) : null,
        timeX: st.timeX || 1, secondsAllowed: secondsFor(s, st),
        answeredSoFar: st.submittedAt ? st.result.answered : Object.keys(st.answers || {}).length,
        violations: st.violations, endReason: st.endReason || '', submittedAt: st.submittedAt || null,
        result: st.submittedAt ? { answered: st.result.answered, correct: st.result.correct, total: st.result.total } : null,
        // Question-by-question detail (only after submitting)
        items: st.submittedAt ? st.questions.map((q, i) => ({
            n: i + 1, topic: q.topic, indicator: q.indicator || '', prompt: q.prompt || '', q: q.q, answer: q.options[q.correct],
            yours: st.answers[i] !== undefined ? q.options[st.answers[i]] : '', right: st.answers[i] !== undefined ? st.answers[i] === q.correct : null
        })) : null
    }));
    res.json({ code: s.code, label: s.label, length: s.length, teacher: s.teacher, createdAt: s.createdAt, expiresAt: s.expiresAt, endedAt: s.endedAt || null, timed: s.seconds > 0, students });
});

// POST /wpr/session/:code/end -- the teacher ends the test. Anyone still testing is scored on their saved
// answers, and every student can see their answers and save their report for RELEASE_MINUTES; then it's
// all erased. If no one finished, there's nothing to release, so it's erased right away.
router.post('/wpr/session/:code/end', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found. It may have ended or expired.' });
    if (!s.endedAt) {
        s.students.forEach(st => { if (st.startedAt && !st.submittedAt) finish(s, st, st.answers, 'ended'); });
        if (![...s.students.values()].some(st => st.submittedAt)) {
            sessions.delete(s.code);
            writeActiveMarker();
            return res.json({ erased: true });
        }
        s.endedAt = Date.now();
        s.expiresAt = Math.min(s.expiresAt, s.endedAt + RELEASE_MINUTES * 60 * 1000);
        writeActiveMarker();
    }
    res.json({ endedAt: s.endedAt, expiresAt: s.expiresAt });
});

// POST /wpr/session/:code/time -- { studentId, x } gives one student standard time (1), time and a half
// (1.5), or double time (2). It can change mid-test: the student's clock catches up within 15 seconds
// (/wpr/clock). Downloads call it "Time allowed" and never say why.
router.post('/wpr/session/:code/time', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found. It may have ended or expired.' });
    const st = s.students.get(String((req.body || {}).studentId || ''));
    if (!st) return res.status(404).json({ error: 'That student isn\'t in this session.' });
    const x = Number(req.body.x);
    if (!TIME_X.includes(x)) return res.status(400).json({ error: 'Pick standard time, time and a half, or double time.' });
    if (st.submittedAt) return res.status(409).json({ error: 'That student already finished.' });
    st.timeX = x;
    writeActiveMarker();
    res.json({ success: true, secondsAllowed: secondsFor(s, st) });
});

// DELETE /wpr/session/:code -- the teacher erases everything now (or, on an older page, ends without the 15 minutes)
router.delete('/wpr/session/:code', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found.' });
    sessions.delete(s.code);
    writeActiveMarker();
    res.json({ success: true });
});

// ---- Student -------------------------------------------------------------

// POST /wpr/join -- { code, firstName, lastName, studentId }
router.post('/wpr/join', (req, res) => {
    if (throttled('join:' + ipOf(req), 60, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many tries. Wait a few minutes.' });
    const body = req.body || {};
    const session = sessions.get(String(body.code || '').trim().toUpperCase());
    if (!session) return res.status(404).json({ error: 'That class code has ended or does not exist. Check with your teacher.' });
    if (session.endedAt) return res.status(409).json({ error: 'This test has ended. Check with your teacher.' });
    session.lastActive = Date.now();
    const firstName = clean(body.firstName, 40), lastName = clean(body.lastName, 40), studentId = clean(body.studentId, 20);
    if (!firstName || !lastName || !studentId) return res.status(400).json({ error: 'Enter your first name, last name, and student ID.' });
    let st = session.students.get(studentId);
    if (st && st.submittedAt) return res.status(409).json({ error: 'You already took this test. If you closed your results page, ask your teacher for your score.' });
    if (st && (st.firstName.toLowerCase() !== firstName.toLowerCase() || st.lastName.toLowerCase() !== lastName.toLowerCase())) {
        return res.status(409).json({ error: 'That student ID is already in use in this class. Check your ID or ask your teacher.' });
    }
    if (!st) {
        st = { token: token(), firstName, lastName, studentId, joinedAt: Date.now(), startedAt: null, questions: null, answers: {}, violations: 0, submittedAt: null };
        session.students.set(studentId, st);
    } else {
        st.token = token(); // rejoining (e.g. after a refresh) issues a fresh token
    }
    res.json({ token: st.token, code: session.code, label: session.label, count: session.count, seconds: secondsFor(session, st), started: !!st.startedAt });
});

// POST /wpr/start -- { code, token } begins (or resumes) the clock
router.post('/wpr/start', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (st.submittedAt) return res.status(409).json({ error: 'You already took this test.' });
    if (session.endedAt) return res.status(409).json({ error: 'This test has ended. Check with your teacher.' });
    if (!st.startedAt) {
        st.questions = buildSessionTest(session);
        st.startedAt = Date.now();
        writeActiveMarker();
    }
    const elapsed = (Date.now() - st.startedAt) / 1000;
    if (elapsed > secondsFor(session, st) + GRACE_SECONDS) {
        finish(session, st, st.answers, 'time');
        return res.status(409).json({ error: 'Time ran out. Your saved answers were scored.' });
    }
    res.json({ questions: publicQuestions(st.questions), answers: st.answers, secondsLeft: Math.max(0, Math.round(secondsFor(session, st) - elapsed)) });
});

// POST /wpr/clock -- { code, token } -> the student's time left, which changes if the teacher changes their time
router.post('/wpr/clock', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (st.submittedAt) return res.json({ secondsLeft: 0 });   // the teacher ended the test: the student's screen wraps up
    if (!st.startedAt) return res.json({ secondsLeft: null });
    res.json({ secondsLeft: Math.max(0, Math.round(secondsFor(session, st) - (Date.now() - st.startedAt) / 1000)) });
});

// POST /wpr/results -- { code, token } -> 'testing', 'held' (the score only), or 'released' once the teacher
// ends the test: every question the student answered, with the right answers, and what their report needs.
router.post('/wpr/results', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (!st.submittedAt) return res.json({ status: 'testing' });
    if (!session.endedAt) return res.json({ status: 'held', result: scoreOnly(st.result), endReason: st.endReason });
    res.json({ status: 'released', result: st.result, endReason: st.endReason, report: reportFor(session, st) });
});

// POST /wpr/save -- { code, token, answers }
router.post('/wpr/save', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (st.startedAt && !st.submittedAt && (Date.now() - st.startedAt) / 1000 <= secondsFor(session, st) + GRACE_SECONDS) {
        st.answers = cleanAnswers(req.body.answers, st.questions.length);
    }
    res.json({ success: true });
});

// POST /wpr/violation -- { code, token, count }
router.post('/wpr/violation', (req, res) => {
    const { st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    st.violations = Math.max(st.violations, Math.min(20, parseInt(req.body.count, 10) || 1));
    res.json({ success: true });
});

// POST /wpr/submit -- { code, token, answers, reason }
router.post('/wpr/submit', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (!st.startedAt) return res.status(400).json({ error: 'The test has not started.' });
    if (!st.submittedAt) {
        const inTime = (Date.now() - st.startedAt) / 1000 <= secondsFor(session, st) + GRACE_SECONDS;
        const answers = inTime ? cleanAnswers(req.body.answers, st.questions.length) : st.answers;
        const reason = ['student', 'time', 'left-test'].includes(req.body.reason) ? req.body.reason : 'student';
        finish(session, st, answers, reason);
    }
    res.json({ result: scoreOnly(st.result), endReason: st.endReason, released: !!session.endedAt });
});

module.exports = router;
