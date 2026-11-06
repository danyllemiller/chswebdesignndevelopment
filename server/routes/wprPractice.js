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
// A teacher can instead limit a session to a class list they paste in (kept in their own browser, and here
// only in the session's memory like everything else): students then join only with a student ID and last
// name on it, and the teacher can set time and Read aloud before anyone joins.
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
const { loadCfa } = require('../lib/wprCfaQuestions');
const { loadReadyQuestions } = require('./wprBanks');

const LENGTHS = {
    sprint: { label: '10-minute Sprint (100 questions)', count: 100, seconds: 600 },
    short: { label: '25 questions, 20 minutes', count: 25, seconds: 1200 },
    half: { label: '50 questions, 40 minutes', count: 50, seconds: 2400 },
    full: { label: 'Full state practice: 100 questions, 1 hour', count: 100, seconds: 3600 },
    // The PLC's common baseline (wprCfaQuestions.js): the same questions for every student, untimed
    cfa: { label: 'Baseline CFA (untimed)', count: 50, seconds: 0, untimed: true }
};
const SESSION_HOURS = 12;
const GRACE_SECONDS = 30;
const IN_USE_MINUTES = 45;
const MARKER_DIR = process.env.WPR_MARKER_DIR || '/tmp';
const TIME_X = [1, 1.5, 2];   // standard, time and a half, double time
const RELEASE_MINUTES = 15;   // after the teacher ends the test: students see their answers and save their report
const sessions = new Map(); // code -> session

// The pilot-test recording (lib/wprBetaLog.js): off unless a window is set on the server. A student is
// only their join number in the session (st.n), never their name or student ID.
const { recording, record, startHealth } = require('../lib/wprBetaLog');
startHealth(() => {
    let students = 0, testing = 0;
    sessions.forEach(s => s.students.forEach(st => { students++; if (st.startedAt && !st.submittedAt) testing++; }));
    return { sessions: sessions.size, students, testing };
});
// Every WPR call while recording: how long it took, its status, and any error message it answered with
router.use((req, res, next) => {
    if (!req.path.startsWith('/wpr/') || !recording()) return next();
    const t0 = process.hrtime.bigint(), json = res.json.bind(res);
    res.json = body => { if (res.statusCode >= 400 && body && body.error) res.locals.wprError = String(body.error).slice(0, 200); return json(body); };
    res.on('finish', () => {
        const body = req.body || {};
        const code = String(body.code || (req.path.match(/^\/wpr\/session\/([A-Za-z0-9]{6})/) || [])[1] || '').toUpperCase();
        const s = sessions.get(code), st = s && body.token ? [...s.students.values()].find(x => x.token === body.token) : null;
        record({ ev: 'api', method: req.method, path: req.path.replace(/^(\/wpr\/session\/)[A-Za-z0-9]{6}/, '$1:code'), status: res.statusCode,
                 ms: Number((process.hrtime.bigint() - t0) / 1000000n), code: code || undefined, s: st ? st.n : undefined, error: res.locals.wprError });
    });
    next();
});

// One student's time limit: the session's, or more if the teacher gave them time and a half or double
// time (POST /wpr/session/:code/time). An untimed test (the Baseline CFA) never runs out.
const secondsFor = (session, st) => session.untimed ? Infinity : Math.round(session.seconds * (st.timeX || 1));
// Seconds of that time a student has used. The clock stops while the teacher has them paused for a break
// (POST /wpr/session/:code/supports), and the time a test sat closed before the teacher let the student back in
// (closedMs, POST /wpr/session/:code/reopen) doesn't count either.
const usedSeconds = (st, now = Date.now()) => (now - st.startedAt - (st.pausedMs || 0) - (st.closedMs || 0) - (st.pausedAt ? now - st.pausedAt : 0)) / 1000;
const pausedSeconds = (st, now = Date.now()) => Math.round(((st.pausedMs || 0) + (st.pausedAt ? now - st.pausedAt : 0)) / 1000);
// Seconds a student has left, or null on an untimed test
const secondsLeft = (session, st, now = Date.now()) => session.untimed ? null : Math.max(0, Math.round(secondsFor(session, st) - usedSeconds(st, now)));

function writeActiveMarker() {
    const now = Date.now();
    let active = 0, inUse = 0;
    sessions.forEach(s => {
        if (now - s.lastActive < IN_USE_MINUTES * 60 * 1000) inUse++;
        s.students.forEach(st => { if (st.startedAt && !st.submittedAt && usedSeconds(st, now) < secondsFor(s, st) + 120) active++; });
    });
    try {
        fs.writeFileSync(`${MARKER_DIR}/wpr_active_sessions`, String(active));
        fs.writeFileSync(`${MARKER_DIR}/wpr_sessions_in_use`, String(inUse));
    } catch (e) { /* best effort */ }
}
setInterval(() => {
    const now = Date.now();
    sessions.forEach((s, code) => { if (now > s.expiresAt) sessions.delete(code); });
    attempts.forEach((list, key) => { if (!list.some(t => now - t < PASS_MISSES.ms)) attempts.delete(key); });
    writeActiveMarker();
}, 60 * 1000).unref();

// Small in-memory throttles so the passcode and class codes can't be guessed. A whole school shares one
// internet address (15 classes of 25 can start at once), so only wrong tries count: a class code that
// doesn't exist, a wrong passcode. Students joining or rejoining, and teachers starting sessions, never do.
const attempts = new Map();
const JOIN_MISSES = { max: 100, ms: 10 * 60 * 1000 }, PASS_MISSES = { max: 20, ms: 15 * 60 * 1000 };
const MAX_STUDENTS = 200;   // per session, so a known class code can't be flooded with made-up students
const recent = (key, limit) => (attempts.get(key) || []).filter(t => Date.now() - t < limit.ms);
const tooMany = (key, limit) => recent(key, limit).length >= limit.max;
const miss = (key, limit) => attempts.set(key, [...recent(key, limit), Date.now()]);
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
// On a class list, a student joins with a student ID on it and its last name (teacher 2026-11-06: in the pilot a
// student got a second test by joining with an initial and a different ID). IDs ignore spaces, capitals and
// leading zeros. A last name ignores capitals, accents, spaces and punctuation ("OBrien" is O'Brien, "Nunez" is
// Núñez), or matches when every word of one is in the other ("Garcia" matches "Garcia Lopez"); an initial
// alone never matches.
const listId = id => { const x = clean(id, 20).replace(/\s+/g, '').toUpperCase(); return /^\d+$/.test(x) ? x.replace(/^0+(?=\d)/, '') : x; };
const plainName = n => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['\u2019`]/g, '');
const nameWords = n => plainName(n).split(/[^a-z]+/).filter(w => w.length > 1);
function sameLastName(typed, listed) {
    const compact = n => plainName(n).replace(/[^a-z]/g, '');
    if (compact(typed).length > 1 && compact(typed) === compact(listed)) return true;
    const a = nameWords(typed), b = nameWords(listed);
    return a.length > 0 && b.length > 0 && (a.every(w => b.includes(w)) || b.every(w => a.includes(w)));
}
// A student in the session, or on a class list one who hasn't joined yet (their time and Read aloud can be set early)
function findStudent(s, id) {
    const st = s.students.get(String(id || ''));
    if (st || !s.list) return st;
    const entry = s.list.get(listId(id));
    return entry && (s.students.get(entry.studentId) || entry);
}

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
// The score a teacher grades on (teacher 2026-11-06): on the 10-minute Sprint, the percent right of the questions a
// student answered, since nobody is expected to reach all 100; on every other test, unanswered questions count as wrong.
const scoreFor = (s, r) => s.length === 'sprint'
    ? { score: r.answered ? Math.round(100 * r.correct / r.answered) : 0, scoring: 'answered' }
    : { score: r.total ? Math.round(100 * r.correct / r.total) : 0, scoring: 'all' };
// What a student sees before the teacher ends the test: the score, not the answers.
const scoreOnly = r => ({ answered: r.answered, correct: r.correct, total: r.total, score: r.score, scoring: r.scoring });
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
    Object.assign(st.result, scoreFor(session, st.result));
    writeActiveMarker();
    // Each question as [CFA key or indicator, 1 right / 0 wrong / -1 skipped], in the student's order
    record({ ev: 'finish', code: session.code, s: st.n, reason, answered: st.result.answered, correct: st.result.correct, total: st.result.total,
             minutes: Number(((st.submittedAt - st.startedAt) / 60000).toFixed(1)), violations: st.violations,
             items: st.questions.map((q, i) => [q.key || q.indicator || '', answers[i] === undefined ? -1 : Number(answers[i]) === q.correct ? 1 : 0]) });
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
// The Baseline CFA: every student gets the same questions, in their own order, with the choices shuffled
function cfaTest() {
    return shuffled(loadCfa().items).map(x => {
        const options = shuffled(x.options);
        return { kind: 'mc', topic: 'cfa', key: x.key, prompt: x.prompt || '', q: x.q, options, correct: options.indexOf(x.answer), hint: '', indicator: x.indicator };
    }).filter(q => q.correct >= 0);
}
function buildSessionTest(session) {
    if (session.length === 'cfa') return cfaTest();
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
    const passKey = 'pass:' + ipOf(req);
    if (tooMany(passKey, PASS_MISSES)) return res.status(429).json({ error: 'Too many wrong passcodes. Wait 15 minutes.' });
    const body = req.body || {};
    if (!safeEq(String(body.passcode || '').trim(), expected)) {
        miss(passKey, PASS_MISSES);
        return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    }
    const length = LENGTHS[body.length] ? body.length : 'full';
    // The Baseline CFA only runs once the PLC's review is final (never the draft), and only on its own questions
    const cfa = length === 'cfa' ? loadCfa() : null;
    if (length === 'cfa' && (!cfa || cfa.draft || !(cfa.items || []).length)) return res.status(409).json({ error: 'The Baseline CFA isn\'t ready yet. Pick another test.' });
    // Where questions come from: the standard WRS pool, the standard pool plus
    // teacher question banks (server/routes/wprBanks.js), or only the banks.
    // Bank questions are loaded once here, not per student.
    const source = !cfa && ['mixed', 'bank'].includes(body.source) ? body.source : 'standard';
    let bankQs = [];
    if (source !== 'standard') {
        try { bankQs = await loadReadyQuestions(body.banks); } catch (e) { console.error('[wpr] banks', e); }
        if (!bankQs.length) return res.status(400).json({ error: 'Those question banks have no questions with answers yet. Add answers, or use the standard questions.' });
    }
    // Only the students on the teacher's class list: student ID -> { studentId, firstName, lastName, timeX, readAloud }
    let list = null;
    if (body.listOnly) {
        list = new Map();
        (Array.isArray(body.classList) ? body.classList : []).slice(0, MAX_STUDENTS).forEach(r => {
            const id = listId(r && r.id), lastName = clean(r && r.last, 40);
            if (id && lastName && !list.has(id)) list.set(id, { studentId: clean(r.id, 20).replace(/\s+/g, ''), firstName: clean(r.first, 40), lastName, timeX: 1, readAloud: false });
        });
        if (!list.size) return res.status(400).json({ error: 'Your class list has no students with a last name and a student ID. Check it and try again.' });
    }
    const code = newCode();
    const now = Date.now();
    const session = {
        code, teacherToken: token(), teacher: clean(body.teacher, 60), length, ...LENGTHS[length], source, bankQs, list,
        createdAt: now, lastActive: now, expiresAt: now + SESSION_HOURS * 3600 * 1000, students: new Map(), joined: 0
    };
    if (cfa) {
        session.count = cfa.items.length;
        session.label = `Baseline CFA: ${cfa.items.length} questions, untimed`;
    }
    // Only-bank tests can't be longer than the bank.
    if (source === 'bank' && bankQs.length < session.count) {
        session.count = bankQs.length;
        session.label = `${bankQs.length} questions from your question banks, ${Math.round(session.seconds / 60)} minutes`;
    }
    sessions.set(code, session);
    writeActiveMarker();
    record({ ev: 'session', code, length, source, count: session.count, untimed: !!session.untimed, classList: list ? list.size : 0 });
    res.json({ code, teacherToken: session.teacherToken, length, label: session.label, expiresAt: session.expiresAt, bank_questions: bankQs.length, rec: recording() });
});

// GET /wpr/session/:code -- teacher's live view, with everything needed for the downloads
router.get('/wpr/session/:code', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found. It may have ended or expired.' });
    const now = Date.now();
    const students = [...s.students.values()].map(st => ({
        firstName: st.firstName, lastName: st.lastName, studentId: st.studentId,
        status: st.submittedAt ? 'submitted' : st.startedAt ? 'testing' : 'joined',
        secondsLeft: st.startedAt && !st.submittedAt ? secondsLeft(s, st, now) : null,
        timeX: st.timeX || 1, secondsAllowed: s.untimed ? null : secondsFor(s, st),
        readAloud: !!st.readAloud, paused: !!(st.pausedAt && !st.submittedAt), pausedSeconds: st.startedAt ? pausedSeconds(st, now) : 0,
        answeredSoFar: st.submittedAt ? st.result.answered : Object.keys(st.answers || {}).length,
        violations: st.violations, endReason: st.endReason || '', submittedAt: st.submittedAt || null, reopened: st.reopened || 0,
        result: st.submittedAt ? scoreOnly(st.result) : null,
        // Question-by-question detail (only after submitting)
        items: st.submittedAt ? st.questions.map((q, i) => ({
            n: i + 1, topic: q.topic, indicator: q.indicator || '', prompt: q.prompt || '', q: q.q, answer: q.options[q.correct],
            yours: st.answers[i] !== undefined ? q.options[st.answers[i]] : '', right: st.answers[i] !== undefined ? st.answers[i] === q.correct : null
        })) : null
    }));
    // On a class list, everyone who hasn't joined yet, with any time or Read aloud already set for them
    const notJoined = s.list ? [...s.list.values()].filter(e => !s.students.has(e.studentId)).map(e => ({
        firstName: e.firstName, lastName: e.lastName, studentId: e.studentId, status: 'waiting',
        timeX: e.timeX || 1, secondsAllowed: s.untimed ? null : secondsFor(s, e), readAloud: !!e.readAloud, paused: false, pausedSeconds: 0
    })) : [];
    res.json({ code: s.code, label: s.label, length: s.length, teacher: s.teacher, createdAt: s.createdAt, expiresAt: s.expiresAt, endedAt: s.endedAt || null, timed: !s.untimed, rec: recording(),
        classList: s.list ? s.list.size : 0, students, notJoined });
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
        record({ ev: 'end', code: s.code, finished: [...s.students.values()].filter(st => st.submittedAt).length, joined: s.students.size });
        s.expiresAt = Math.min(s.expiresAt, s.endedAt + RELEASE_MINUTES * 60 * 1000);
        writeActiveMarker();
    }
    res.json({ endedAt: s.endedAt, expiresAt: s.expiresAt });
});

// POST /wpr/session/:code/time -- { studentId, x } gives one student standard time (1), time and a half
// (1.5), or double time (2). It can change mid-test: the student's clock catches up within 5 seconds
// (/wpr/clock). Downloads call it "Time allowed" and never say why.
router.post('/wpr/session/:code/time', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found. It may have ended or expired.' });
    const st = findStudent(s, (req.body || {}).studentId);
    if (!st) return res.status(404).json({ error: 'That student isn\'t in this session.' });
    if (s.untimed) return res.status(400).json({ error: 'This test has no time limit.' });
    const x = Number(req.body.x);
    if (!TIME_X.includes(x)) return res.status(400).json({ error: 'Pick standard time, time and a half, or double time.' });
    if (st.submittedAt) return res.status(409).json({ error: 'That student already finished.' });
    st.timeX = x;
    record({ ev: 'support', code: s.code, s: st.n, timeX: x });
    writeActiveMarker();
    res.json({ success: true, secondsAllowed: secondsFor(s, st) });
});

// POST /wpr/session/:code/supports -- { studentId, readAloud, headphones, paused } for one student:
// readAloud turns on the test's Read aloud button (only once the teacher confirms, with headphones: true,
// that the student has headphones or is testing alone), and paused stops their clock for a break and
// starts it again. Their screen picks it up within 5 seconds (/wpr/clock). Like the time limit, downloads
// show what was used and never say why.
router.post('/wpr/session/:code/supports', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found. It may have ended or expired.' });
    const b = req.body || {};
    const st = findStudent(s, b.studentId);
    if (!st) return res.status(404).json({ error: 'That student isn\'t in this session.' });
    if (st.submittedAt) return res.status(409).json({ error: 'That student already finished.' });
    if (typeof b.readAloud === 'boolean') {
        if (b.readAloud && b.headphones !== true) return res.status(400).json({ error: 'Check the box first: the student has headphones, or is testing alone.' });
        st.readAloud = b.readAloud;
    }
    if (typeof b.paused === 'boolean') {
        const now = Date.now();
        if (b.paused && !st.pausedAt) {
            if (!st.startedAt) return res.status(409).json({ error: 'That student hasn\'t started the test yet.' });
            st.pausedAt = now;
        } else if (!b.paused && st.pausedAt) {
            st.pausedMs = (st.pausedMs || 0) + (now - st.pausedAt);
            st.pausedAt = null;
        }
        writeActiveMarker();
    }
    record({ ev: 'support', code: s.code, s: st.n, readAloud: !!st.readAloud, paused: !!st.pausedAt });
    res.json({ success: true, readAloud: !!st.readAloud, paused: !!st.pausedAt });
});

// POST /wpr/session/:code/reopen -- { studentId } "Let back in": a student whose test submitted itself because they
// left it twice gets back in with their answers kept, until the teacher ends the test (teacher 2026-11-06: in the
// pilot a computer that dropped out of full screen closed a student's test on question 1). On a timed test the
// time it sat closed doesn't count. Their results page notices within 10 seconds (or they join again), and the
// leaving rules start over for them; the count of times they left keeps adding up for the teacher.
router.post('/wpr/session/:code/reopen', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found. It may have ended or expired.' });
    const st = s.students.get(String((req.body || {}).studentId || ''));
    if (!st) return res.status(404).json({ error: 'That student isn\'t in this session.' });
    if (s.endedAt) return res.status(409).json({ error: 'The test has ended, so it can\'t be reopened.' });
    if (!st.submittedAt) return res.status(409).json({ error: 'That student is still testing.' });
    if (st.endReason !== 'left-test') return res.status(409).json({ error: 'Only a test that submitted itself because the student left it can be reopened.' });
    st.closedMs = (st.closedMs || 0) + (Date.now() - st.submittedAt);
    st.priorLeaves = st.violations;
    st.submittedAt = null; st.endReason = null; st.result = null;
    st.reopened = (st.reopened || 0) + 1;
    writeActiveMarker();
    record({ ev: 'reopen', code: s.code, s: st.n, answered: Object.keys(st.answers || {}).length });
    res.json({ success: true });
});

// DELETE /wpr/session/:code -- the teacher erases everything now (or, on an older page, ends without the 15 minutes)
router.delete('/wpr/session/:code', (req, res) => {
    const s = teacherSession(req);
    if (!s) return res.status(404).json({ error: 'Session not found.' });
    sessions.delete(s.code);
    writeActiveMarker();
    record({ ev: 'erase', code: s.code });
    res.json({ success: true });
});

// POST /wpr/telemetry -- { code, token?, events: [{ ev, ... }] } while a pilot test is being recorded: what
// students and the teacher do on screen (screens, buttons, tools, leaving full screen) and any browser
// errors. A student is their number in the session; the teacher is sent with their teacher token. Nothing
// is written outside the recording window, and pages only send when the server says it's recording.
const plain = v => typeof v === 'number' ? (Number.isFinite(v) ? v : null) : typeof v === 'boolean' ? v : String(v ?? '').slice(0, 300);
// Fields never written even if a page sent them: who someone is, and what they answered
const NOT_RECORDED = /^(ev|t|s|ui|role|code|token|first|last|firstname|lastname|name|initials|studentid|sid|id|answers?)$/i;
router.post('/wpr/telemetry', (req, res) => {
    if (!recording()) return res.json({ rec: false });
    const b = req.body || {};
    const session = sessions.get(String(b.code || '').toUpperCase());
    const st = session && b.token ? [...session.students.values()].find(x => x.token === b.token) : null;
    const t = req.get('x-teacher-token') || '';
    const who = st ? { s: st.n } : session && t && safeEq(t, session.teacherToken) ? { role: 'teacher' } : { role: 'unjoined' };
    (Array.isArray(b.events) ? b.events : []).slice(0, 100).forEach(e => {
        if (!e || typeof e !== 'object') return;
        const out = { ev: 'ui', ui: String(e.ev || '').slice(0, 40), code: session ? session.code : undefined, ...who };
        Object.entries(e).slice(0, 20).forEach(([k, v]) => { if (/^[a-zA-Z]{1,20}$/.test(k) && !NOT_RECORDED.test(k)) out[k] = plain(v); });
        if (Number.isFinite(e.t)) out.clientT = e.t;
        record(out);
    });
    res.json({ rec: true });
});

// ---- Student -------------------------------------------------------------

// POST /wpr/join -- { code, firstName, lastName, studentId }
router.post('/wpr/join', (req, res) => {
    const joinKey = 'join:' + ipOf(req);
    if (tooMany(joinKey, JOIN_MISSES)) return res.status(429).json({ error: 'Too many wrong class codes. Wait a few minutes.' });
    const body = req.body || {};
    const session = sessions.get(String(body.code || '').trim().toUpperCase());
    if (!session) {
        miss(joinKey, JOIN_MISSES);
        return res.status(404).json({ error: 'That class code has ended or does not exist. Check with your teacher.' });
    }
    session.lastActive = Date.now();
    const firstName = clean(body.firstName, 40), lastName = clean(body.lastName, 40), studentId = clean(body.studentId, 20);
    if (!firstName || !lastName || !studentId) return res.status(400).json({ error: 'Enter your first name, last name, and student ID.' });
    // On a class list: an ID on it, with its last name. The student then shows under the list's name.
    const entry = session.list ? session.list.get(listId(studentId)) : null;
    if (session.list && !entry) {
        miss(joinKey, JOIN_MISSES);
        return res.status(403).json({ error: 'That student ID isn\'t on the class list for this test. Check your ID, or ask your teacher.' });
    }
    if (entry && !sameLastName(lastName, entry.lastName)) {
        miss(joinKey, JOIN_MISSES);
        return res.status(403).json({ error: 'That last name doesn\'t match the class list for this student ID. Check both, or ask your teacher.' });
    }
    let st = session.students.get(entry ? entry.studentId : studentId);
    if (st && !entry && (st.firstName.toLowerCase() !== firstName.toLowerCase() || st.lastName.toLowerCase() !== lastName.toLowerCase())) {
        return res.status(409).json({ error: 'That student ID is already in use in this class. Check your ID or ask your teacher.' });
    }
    // A student who finished can come back to their results (a closed tab, a refresh in a new tab, another
    // device), including after the teacher ends the test, when their answers and report unlock.
    // Their key stays the same, so a results page they still have open elsewhere keeps working.
    if (st && st.submittedAt) {
        return res.json({ token: st.token, code: session.code, label: session.label, count: session.count, seconds: session.untimed ? null : secondsFor(session, st), started: true, submitted: true, endReason: st.endReason });
    }
    if (session.endedAt) return res.status(409).json({ error: 'This test has ended. Check with your teacher.' });
    if (!st && session.students.size >= MAX_STUDENTS) return res.status(409).json({ error: `This class code is full (${MAX_STUDENTS} students). Check with your teacher.` });
    if (!st) {
        st = entry
            ? { firstName: entry.firstName || firstName, lastName: entry.lastName, studentId: entry.studentId, timeX: entry.timeX, readAloud: entry.readAloud }
            : { firstName, lastName, studentId };
        Object.assign(st, { token: token(), n: ++session.joined, joinedAt: Date.now(), startedAt: null, questions: null, answers: {}, violations: 0, submittedAt: null });
        session.students.set(st.studentId, st);
        record({ ev: 'join', code: session.code, s: st.n });
    } else {
        st.token = token(); // rejoining (e.g. after a refresh) issues a fresh token
        record({ ev: 'rejoin', code: session.code, s: st.n, started: !!st.startedAt });
    }
    res.json({ token: st.token, code: session.code, label: session.label, count: session.count, seconds: session.untimed ? null : secondsFor(session, st), started: !!st.startedAt, rec: recording() });
});

// POST /wpr/start -- { code, token } begins (or resumes) the clock
router.post('/wpr/start', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (st.submittedAt) return res.status(409).json({ error: 'You already took this test.' });
    if (session.endedAt) return res.status(409).json({ error: 'This test has ended. Check with your teacher.' });
    if (!st.startedAt) {
        st.questions = buildSessionTest(session);
        record({ ev: 'start', code: session.code, s: st.n, questions: st.questions.length, waitedSec: Math.round((Date.now() - st.joinedAt) / 1000) });
        st.startedAt = Date.now();
        writeActiveMarker();
    }
    const elapsed = usedSeconds(st);
    if (elapsed > secondsFor(session, st) + GRACE_SECONDS) {
        finish(session, st, st.answers, 'time');
        return res.status(409).json({ error: 'Time ran out. Your saved answers were scored.' });
    }
    res.json({ questions: publicQuestions(st.questions), answers: st.answers, secondsLeft: secondsLeft(session, st),
        readAloud: !!st.readAloud, paused: !!st.pausedAt });
});

// POST /wpr/clock -- { code, token } -> the student's time left, which changes if the teacher changes their time,
// and their supports (read aloud, paused for a break), which the teacher can change mid-test
router.post('/wpr/clock', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (st.submittedAt) return res.json({ secondsLeft: 0 });   // the teacher ended the test: the student's screen wraps up
    if (!st.startedAt) return res.json({ secondsLeft: null, readAloud: !!st.readAloud });
    res.json({ secondsLeft: secondsLeft(session, st), readAloud: !!st.readAloud, paused: !!st.pausedAt });
});

// POST /wpr/results -- { code, token } -> 'testing', 'held' (the score only), or 'released' once the teacher
// ends the test: every question the student answered, with the right answers, and what their report needs.
router.post('/wpr/results', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (!st.submittedAt) return res.json({ status: 'testing' });
    if (!session.endedAt) return res.json({ status: 'held', result: scoreOnly(st.result), endReason: st.endReason });
    if (!st.releasedSeen) { st.releasedSeen = true; record({ ev: 'released', code: session.code, s: st.n, afterEndSec: Math.round((Date.now() - session.endedAt) / 1000) }); }
    res.json({ status: 'released', result: st.result, endReason: st.endReason, report: reportFor(session, st) });
});

// POST /wpr/save -- { code, token, answers }
router.post('/wpr/save', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (st.startedAt && !st.submittedAt && usedSeconds(st) <= secondsFor(session, st) + GRACE_SECONDS) {
        st.answers = cleanAnswers(req.body.answers, st.questions.length);
    }
    res.json({ success: true });
});

// POST /wpr/violation -- { code, token, count }
router.post('/wpr/violation', (req, res) => {
    const { st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    // After "Let back in" the page counts from 1 again, so add the times from before
    st.violations = Math.max(st.violations, (st.priorLeaves || 0) + Math.min(20, parseInt(req.body.count, 10) || 1));
    record({ ev: 'violation', code: String(req.body.code || '').toUpperCase(), s: st.n, count: st.violations });
    res.json({ success: true });
});

// POST /wpr/submit -- { code, token, answers, reason }
router.post('/wpr/submit', (req, res) => {
    const { session, st, error } = getStudent(req);
    if (error) return res.status(404).json({ error });
    if (!st.startedAt) return res.status(400).json({ error: 'The test has not started.' });
    if (!st.submittedAt) {
        const inTime = usedSeconds(st) <= secondsFor(session, st) + GRACE_SECONDS;
        const answers = inTime ? cleanAnswers(req.body.answers, st.questions.length) : st.answers;
        const reason = ['student', 'time', 'left-test'].includes(req.body.reason) ? req.body.reason : 'student';
        finish(session, st, answers, reason);
    }
    res.json({ result: scoreOnly(st.result), endReason: st.endReason, released: !!session.endedAt });
});

module.exports = router;
