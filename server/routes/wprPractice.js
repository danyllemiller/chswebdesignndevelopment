// server/routes/wprPractice.js
// WPR Practice Test for other teachers at the school (wpr-practice/).
// A teacher enters the shared teacher passcode (WPR_TEACHER_PASSCODE in .env)
// on wpr-practice/teacher.html, picks a test length, and gets a 6-letter
// class code. Students open wpr-practice/ (no login), enter the code, their
// name, and student ID, and take the same locked-down test as the Monday
// Sprint (js/wrs-test-ui.js).
//
// NOTHING IS STORED: sessions live only in this process's memory. They are
// erased when the teacher ends the session, 12 hours after they start, or
// whenever the server restarts -- so teachers download their results
// (summary CSV, question-by-question CSV, printable report) before ending.
// A count of active sessions (no student data) is written to
// /tmp/wpr_active_sessions so deploys can wait instead of restarting mid-test.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const { buildTest } = require('../lib/wrsPool');

const LENGTHS = {
    sprint: { label: '10-minute Sprint (100 questions)', count: 100, seconds: 600 },
    short: { label: '25 questions, 20 minutes', count: 25, seconds: 1200 },
    half: { label: '50 questions, 40 minutes', count: 50, seconds: 2400 },
    full: { label: 'Full state practice: 100 questions, 1 hour', count: 100, seconds: 3600 }
};
const SESSION_HOURS = 12;
const GRACE_SECONDS = 30;
const sessions = new Map(); // code -> session

function writeActiveMarker() {
    const now = Date.now();
    let active = 0;
    sessions.forEach(s => { s.students.forEach(st => { if (st.startedAt && !st.submittedAt && now - st.startedAt < (s.seconds + 120) * 1000) active++; }); });
    try { fs.writeFileSync('/tmp/wpr_active_sessions', String(active)); } catch (e) { /* best effort */ }
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
        review.push({ n: i + 1, prompt: q.prompt, q: q.q, topic: q.topic || '', right, yours: q.options[Number(a)] ?? '', answer: q.options[q.correct], hint: q.hint });
    });
    return { answered, correct, total: questions.length, review };
}
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
    const st = [...session.students.values()].find(x => x.token === body.token);
    if (!st) return { error: 'Your test session was not found. Ask your teacher.' };
    return { session, st };
}
function teacherSession(req) {
    const session = sessions.get(String(req.params.code || '').toUpperCase());
    const t = req.get('x-teacher-token') || '';
    if (!session || !t || !safeEq(t, session.teacherToken)) return null;
    return session;
}

// ---- Teacher -------------------------------------------------------------

// POST /wpr/session -- { passcode, length, teacher } -> { code, teacherToken }
router.post('/wpr/session', (req, res) => {
    const expected = process.env.WPR_TEACHER_PASSCODE || '';
    if (expected.length < 6) return res.status(503).json({ error: 'The WPR Practice Test is not set up yet.' });
    if (throttled('pass:' + ipOf(req), 10, 15 * 60 * 1000)) return res.status(429).json({ error: 'Too many tries. Wait 15 minutes.' });
    const body = req.body || {};
    if (!safeEq(String(body.passcode || '').trim(), expected)) return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    const length = LENGTHS[body.length] ? body.length : 'full';
    const code = newCode();
    const now = Date.now();
    const session = {
        code, teacherToken: token(), teacher: clean(body.teacher, 60), length, ...LENGTHS[length],
        createdAt: now, expiresAt: now + SESSION_HOURS * 3600 * 1000, students: new Map()
    };
    sessions.set(code, session);
    res.json({ code, teacherToken: session.teacherToken, length, label: session.label, expiresAt: session.expiresAt });
});

// GET /wpr/session/:code -- teacher's live view, with everything needed for the downloads
router.get('/wpr/session/:code', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found. It may have ended or expired.' });
    const now = Date.now();
    const students = [...s.students.values()].map(st => ({
        firstName: st.firstName, lastName: st.lastName, studentId: st.studentId,
        status: st.submittedAt ? 'submitted' : st.startedAt ? 'testing' : 'joined',
        secondsLeft: st.startedAt && !st.submittedAt ? Math.max(0, Math.round((st.startedAt + s.seconds * 1000 - now) / 1000)) : null,
        answeredSoFar: st.submittedAt ? st.result.answered : Object.keys(st.answers || {}).length,
        violations: st.violations, endReason: st.endReason || '',
        result: st.submittedAt ? { answered: st.result.answered, correct: st.result.correct, total: st.result.total } : null,
        // Question-by-question detail (only after submitting)
        items: st.submittedAt ? st.questions.map((q, i) => ({
            n: i + 1, topic: q.topic, q: q.q, answer: q.options[q.correct],
            yours: st.answers[i] !== undefined ? q.options[st.answers[i]] : '', right: st.answers[i] !== undefined ? st.answers[i] === q.correct : null
        })) : null
    }));
    res.json({ code: s.code, label: s.label, length: s.length, teacher: s.teacher, createdAt: s.createdAt, expiresAt: s.expiresAt, students });
});

// DELETE /wpr/session/:code -- teacher ends the session; everything is erased
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
    const firstName = clean(body.firstName, 40), lastName = clean(body.lastName, 40), studentId = clean(body.studentId, 20);
    if (!firstName || !lastName || !studentId) return res.status(400).json({ error: 'Enter your first name, last name, and student ID.' });
    let st = session.students.get(studentId);
    if (st && st.submittedAt) return res.status(409).json({ error: 'You already took this test.' });
    if (st && (st.firstName.toLowerCase() !== firstName.toLowerCase() || st.lastName.toLowerCase() !== lastName.toLowerCase())) {
        return res.status(409).json({ error: 'That student ID is already in use in this class. Check your ID or ask your teacher.' });
    }
    if (!st) {
        st = { token: token(), firstName, lastName, studentId, joinedAt: Date.now(), startedAt: null, questions: null, answers: {}, violations: 0, submittedAt: null };
        session.students.set(studentId, st);
    } else {
        st.token = token(); // rejoining (e.g. after a refresh) issues a fresh token
    }
    res.json({ token: st.token, code: session.code, label: session.label, count: session.count, seconds: session.seconds, started: !!st.startedAt });
});

// POST /wpr/start -- { code, token } begins (or resumes) the clock
router.post('/wpr/start', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (st.submittedAt) return res.status(409).json({ error: 'You already took this test.' });
    if (!st.startedAt) {
        st.questions = buildTest(session.count);
        st.startedAt = Date.now();
        writeActiveMarker();
    }
    const elapsed = (Date.now() - st.startedAt) / 1000;
    if (elapsed > session.seconds + GRACE_SECONDS) {
        finish(session, st, st.answers, 'time');
        return res.status(409).json({ error: 'Time ran out. Your saved answers were scored.' });
    }
    res.json({ questions: publicQuestions(st.questions), answers: st.answers, secondsLeft: Math.max(0, Math.round(session.seconds - elapsed)) });
});

// POST /wpr/save -- { code, token, answers }
router.post('/wpr/save', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (st.startedAt && !st.submittedAt && (Date.now() - st.startedAt) / 1000 <= session.seconds + GRACE_SECONDS) {
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
        const inTime = (Date.now() - st.startedAt) / 1000 <= session.seconds + GRACE_SECONDS;
        const answers = inTime ? cleanAnswers(req.body.answers, st.questions.length) : st.answers;
        const reason = ['student', 'time', 'left-test'].includes(req.body.reason) ? req.body.reason : 'student';
        finish(session, st, answers, reason);
    }
    res.json({ result: st.result, endReason: st.endReason });
});

module.exports = router;
