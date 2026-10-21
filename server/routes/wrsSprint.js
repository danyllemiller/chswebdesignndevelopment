// server/routes/wrsSprint.js
// Monday WRS Sprint (student/wrs-sprint.html): every Monday, Web Design 2
// (B2) and AS-B2 students get 100 random Workplace Readiness Skills questions and
// answer as many as they can in 10 minutes. Progress only -- no gradebook
// column. One attempt per student per Monday. Questions and answers live
// server-side in the attempt row (the page only ever gets prompts and
// options), the 10-minute deadline is the server's clock, and answers
// autosave so a closed tab or an auto-submit still counts what was done.
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { requireLogin, requireStaff, isStaffSession } = require('../helpers');
const { getLocalDateStr } = require('../tardyLogic');
const { buildTest } = require('../lib/wrsPool');

const SECTIONS = ['B2', 'AS-B2'];
// Extra one-off days the Sprint is open as a PRACTICE run (is_preview = 2):
// students take it normally, but it never appears on their weekly chart.
// 2026-10-21: the teacher's trial run before the first real Monday.
const PRACTICE_DATES = new Set(['2026-10-21']);
// Beta testers help the teacher test the Sprint. They never take it for
// real: every run, any day (Mondays too), is a preview that can be retaken,
// never appears on their chart, and they're left off the class results.
const BETA_TESTERS = new Set(['8009627']); // Monique Bongo (AS-B2), added 2026-10-21
const TEST_SECONDS = 600;
const LATE_GRACE_SECONDS = 30; // network delay on the auto-submit

async function ensureTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS wrs_sprint_attempts (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            student_id     VARCHAR(50) NOT NULL,
            week_date      DATE NOT NULL,
            started_at     DATETIME NOT NULL,
            submitted_at   DATETIME NULL,
            questions_json LONGTEXT NOT NULL,
            answers_json   LONGTEXT NULL,
            answered       INT NULL,
            correct        INT NULL,
            total          INT NOT NULL DEFAULT 100,
            is_preview     TINYINT(1) NOT NULL DEFAULT 0,
            UNIQUE KEY uniq_student_week (student_id, week_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // Lockdown (js/wrs-test-ui.js): times the student left the test, and why
    // it ended ('student', 'time', or 'left-test' = auto-submitted on the 2nd leave).
    await connection.execute('ALTER TABLE wrs_sprint_attempts ADD COLUMN IF NOT EXISTS violations INT NOT NULL DEFAULT 0');
    await connection.execute('ALTER TABLE wrs_sprint_attempts ADD COLUMN IF NOT EXISTS end_reason VARCHAR(20) NULL');
}

const isMonday = (dateStr) => new Date(`${dateStr}T12:00:00`).getDay() === 1;
const toDateStr = d => (d instanceof Date) ? getLocalDateStr(d) : String(d).slice(0, 10);

async function inSection(connection, studentId) {
    const [[s]] = await connection.execute('SELECT section_id FROM students WHERE student_id = ? LIMIT 1', [studentId]);
    if (s && SECTIONS.includes(s.section_id)) return true;
    const [extra] = await connection.execute(
        `SELECT 1 FROM student_additional_sections WHERE student_id = ? AND section_id IN (${SECTIONS.map(() => '?').join(',')}) LIMIT 1`,
        [studentId, ...SECTIONS]);
    return extra.length > 0;
}

// Questions as the page sees them: no answers, no hints.
const publicQuestions = qs => qs.map((q, i) => ({ n: i + 1, kind: q.kind, topic: q.topic || '', prompt: q.prompt, q: q.q, options: q.options }));

// review: every question the student answered, in test order, right or
// wrong (students asked to see all of them, not just the misses).
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
    return { answered, correct, review, missed: review.filter(r => !r.right) };
}

function cleanAnswers(raw, total) {
    const out = {};
    if (raw && typeof raw === 'object') {
        Object.entries(raw).forEach(([k, v]) => {
            const i = Number(k), n = Number(v);
            if (Number.isInteger(i) && i >= 0 && i < total && Number.isInteger(n) && n >= 0 && n < 10) out[i] = n;
        });
    }
    return out;
}

async function history(connection, studentId) {
    const [rows] = await connection.execute(
        `SELECT week_date, answered, correct, total FROM wrs_sprint_attempts
         WHERE student_id = ? AND submitted_at IS NOT NULL AND is_preview = 0 ORDER BY week_date`, [studentId]);
    return rows.map(r => ({ week: toDateStr(r.week_date), answered: r.answered, correct: r.correct, total: r.total }));
}

async function finish(connection, row, answers, reason) {
    const questions = JSON.parse(row.questions_json);
    const g = grade(questions, answers);
    await connection.execute(
        'UPDATE wrs_sprint_attempts SET submitted_at = NOW(), answers_json = ?, answered = ?, correct = ?, end_reason = ? WHERE id = ? AND submitted_at IS NULL',
        [JSON.stringify(answers), g.answered, g.correct, reason || 'time', row.id]);
    return g;
}

function resultFor(row) {
    const questions = JSON.parse(row.questions_json);
    const answers = row.answers_json ? JSON.parse(row.answers_json) : {};
    const g = grade(questions, answers);
    return { answered: g.answered, correct: g.correct, total: questions.length, review: g.review, missed: g.missed };
}

// GET /wrs-sprint/status -- can this student take it today, and their history
router.get('/wrs-sprint/status', requireLogin, async (req, res) => {
    const studentId = String(req.session.user.student_id);
    const staff = isStaffSession(req);
    try {
        const out = await withConnection(async (connection) => {
            await ensureTable(connection);
            const today = getLocalDateStr();
            const eligible = staff || await inSection(connection, studentId);
            const [[row]] = await connection.execute(
                'SELECT * FROM wrs_sprint_attempts WHERE student_id = ? AND week_date = ?', [studentId, today]);
            const beta = BETA_TESTERS.has(studentId);
            let state = 'closed';
            if (!eligible) state = 'not-enrolled';
            else if (row && row.submitted_at && !beta) state = 'done';
            else if (row && !row.submitted_at) state = 'in-progress';
            else if (isMonday(today) || PRACTICE_DATES.has(today) || staff || beta) state = 'open';
            const body = { state, today, isMonday: isMonday(today), practice: !isMonday(today) && PRACTICE_DATES.has(today), beta, preview: staff, history: await history(connection, studentId) };
            if (state === 'done') body.result = resultFor(row);
            return body;
        });
        res.json(out);
    } catch (err) {
        console.error('[wrs-sprint] status error:', err);
        res.status(500).json({ error: 'Could not load the WRS Sprint.' });
    }
});

// POST /wrs-sprint/start -- begins (or resumes) this Monday's attempt
router.post('/wrs-sprint/start', requireLogin, async (req, res) => {
    const studentId = String(req.session.user.student_id);
    const staff = isStaffSession(req);
    try {
        const out = await withConnection(async (connection) => {
            await ensureTable(connection);
            const today = getLocalDateStr();
            if (!staff && !(await inSection(connection, studentId))) return { status: 403, body: { error: 'The WRS Sprint is for Web Design 2 (B2) and AS-B2.' } };
            let [[row]] = await connection.execute(
                'SELECT * FROM wrs_sprint_attempts WHERE student_id = ? AND week_date = ?', [studentId, today]);
            const beta = BETA_TESTERS.has(studentId);
            if (row && row.submitted_at && (staff || beta)) {
                // Teacher previews and beta-tester practice runs can be retaken any time.
                await connection.execute('DELETE FROM wrs_sprint_attempts WHERE id = ?', [row.id]);
                row = undefined;
            }
            if (row && row.submitted_at) return { status: 409, body: { error: 'You already took this week\'s WRS Sprint.' } };
            if (!row) {
                const practice = !isMonday(today) && PRACTICE_DATES.has(today);
                if (!isMonday(today) && !practice && !staff && !beta) return { status: 403, body: { error: 'The WRS Sprint opens on Mondays.' } };
                const questions = buildTest(100);
                await connection.execute(
                    'INSERT IGNORE INTO wrs_sprint_attempts (student_id, week_date, started_at, questions_json, total, is_preview) VALUES (?, ?, NOW(), ?, ?, ?)',
                    [studentId, today, JSON.stringify(questions), questions.length, (staff || beta) ? 1 : (practice ? 2 : 0)]);
                [[row]] = await connection.execute(
                    'SELECT * FROM wrs_sprint_attempts WHERE student_id = ? AND week_date = ?', [studentId, today]);
            }
            const [[{ now }]] = await connection.execute('SELECT NOW() AS now');
            const elapsed = (new Date(now) - new Date(row.started_at)) / 1000;
            const answers = row.answers_json ? JSON.parse(row.answers_json) : {};
            if (elapsed > TEST_SECONDS + LATE_GRACE_SECONDS) {
                await finish(connection, row, answers);
                return { status: 409, body: { error: 'Time ran out on this attempt. Your saved answers were scored.', expired: true } };
            }
            return { status: 200, body: {
                questions: publicQuestions(JSON.parse(row.questions_json)),
                answers, secondsLeft: Math.max(0, Math.round(TEST_SECONDS - elapsed))
            } };
        });
        res.status(out.status).json(out.body);
    } catch (err) {
        console.error('[wrs-sprint] start error:', err);
        res.status(500).json({ error: 'Could not start the WRS Sprint.' });
    }
});

// POST /wrs-sprint/save -- { answers } autosave while the clock runs
router.post('/wrs-sprint/save', requireLogin, async (req, res) => {
    const studentId = String(req.session.user.student_id);
    try {
        await withConnection(async (connection) => {
            await ensureTable(connection);
            const [[row]] = await connection.execute(
                `SELECT id, total, started_at FROM wrs_sprint_attempts WHERE student_id = ? AND week_date = ? AND submitted_at IS NULL
                 AND started_at > NOW() - INTERVAL ${TEST_SECONDS + LATE_GRACE_SECONDS} SECOND`, [studentId, getLocalDateStr()]);
            if (row) {
                await connection.execute('UPDATE wrs_sprint_attempts SET answers_json = ? WHERE id = ?',
                    [JSON.stringify(cleanAnswers(req.body && req.body.answers, row.total)), row.id]);
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error('[wrs-sprint] save error:', err);
        res.status(500).json({ error: 'Could not save.' });
    }
});

// POST /wrs-sprint/submit -- { answers } finish (the page calls this at 0:00 too)
router.post('/wrs-sprint/submit', requireLogin, async (req, res) => {
    const studentId = String(req.session.user.student_id);
    try {
        const out = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [[row]] = await connection.execute(
                'SELECT * FROM wrs_sprint_attempts WHERE student_id = ? AND week_date = ?', [studentId, getLocalDateStr()]);
            if (!row) return { status: 404, body: { error: 'No WRS Sprint in progress.' } };
            if (!row.submitted_at) {
                const [[{ now }]] = await connection.execute('SELECT NOW() AS now');
                const elapsed = (new Date(now) - new Date(row.started_at)) / 1000;
                // Past the deadline, only the last autosave counts.
                const answers = elapsed <= TEST_SECONDS + LATE_GRACE_SECONDS
                    ? cleanAnswers(req.body && req.body.answers, row.total)
                    : (row.answers_json ? JSON.parse(row.answers_json) : {});
                const reason = ['student', 'time', 'left-test'].includes(req.body && req.body.reason) ? req.body.reason : 'student';
                await finish(connection, row, answers, reason);
            }
            const [[done]] = await connection.execute('SELECT * FROM wrs_sprint_attempts WHERE id = ?', [row.id]);
            return { status: 200, body: { result: resultFor(done), history: await history(connection, studentId) } };
        });
        res.status(out.status).json(out.body);
    } catch (err) {
        console.error('[wrs-sprint] submit error:', err);
        res.status(500).json({ error: 'Could not submit.' });
    }
});

// POST /wrs-sprint/violation -- { count } the student left the test screen
router.post('/wrs-sprint/violation', requireLogin, async (req, res) => {
    const studentId = String(req.session.user.student_id);
    const count = Math.max(1, Math.min(20, parseInt(req.body && req.body.count, 10) || 1));
    try {
        await withConnection(async (connection) => {
            await ensureTable(connection);
            await connection.execute(
                'UPDATE wrs_sprint_attempts SET violations = GREATEST(violations, ?) WHERE student_id = ? AND week_date = ? AND submitted_at IS NULL',
                [count, studentId, getLocalDateStr()]);
        });
        res.json({ success: true });
    } catch (err) {
        console.error('[wrs-sprint] violation error:', err);
        res.status(500).json({ error: 'Could not record.' });
    }
});

// GET /admin/wrs-sprint -- every B2 student's weekly results
router.get('/admin/wrs-sprint', requireStaff, async (req, res) => {
    try {
        const out = await withConnection(async (connection) => {
            await ensureTable(connection);
            const ph = SECTIONS.map(() => '?').join(',');
            const [students] = await connection.execute(
                `SELECT DISTINCT s.student_id, s.first_name, s.last_name, s.section_id FROM students s
                 LEFT JOIN student_additional_sections x ON x.student_id = s.student_id AND x.section_id IN (${ph})
                 WHERE (s.section_id IN (${ph}) OR x.student_id IS NOT NULL) AND (s.archived IS NULL OR s.archived = 0)
                 ORDER BY s.last_name, s.first_name`, [...SECTIONS, ...SECTIONS]);
            const [rows] = await connection.execute(
                `SELECT student_id, week_date, answered, correct, total, submitted_at, is_preview, violations, end_reason FROM wrs_sprint_attempts
                 WHERE is_preview IN (0, 2) ORDER BY week_date`);
            return {
                students: students.filter(st => !BETA_TESTERS.has(String(st.student_id))),
                attempts: rows.filter(r => !BETA_TESTERS.has(String(r.student_id))).map(r => ({ student_id: r.student_id, week: toDateStr(r.week_date), answered: r.answered, correct: r.correct, total: r.total, done: !!r.submitted_at, practice: r.is_preview === 2, violations: r.violations || 0, endReason: r.end_reason || '' }))
            };
        });
        res.json(out);
    } catch (err) {
        console.error('[wrs-sprint] admin error:', err);
        res.status(500).json({ error: 'Could not load WRS Sprint results.' });
    }
});

module.exports = router;
