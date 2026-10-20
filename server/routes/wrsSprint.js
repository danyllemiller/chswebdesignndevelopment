// server/routes/wrsSprint.js
// Monday WRS Sprint (student/wrs-sprint.html): every Monday, Web Design 2
// (B2) students get 100 random Workplace Readiness Skills questions and
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

const SECTION = 'B2';
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
}

const isMonday = (dateStr) => new Date(`${dateStr}T12:00:00`).getDay() === 1;
const toDateStr = d => (d instanceof Date) ? getLocalDateStr(d) : String(d).slice(0, 10);

async function inSection(connection, studentId) {
    const [[s]] = await connection.execute('SELECT section_id FROM students WHERE student_id = ? LIMIT 1', [studentId]);
    if (s && s.section_id === SECTION) return true;
    const [extra] = await connection.execute('SELECT 1 FROM student_additional_sections WHERE student_id = ? AND section_id = ? LIMIT 1', [studentId, SECTION]);
    return extra.length > 0;
}

// Questions as the page sees them: no answers, no hints.
const publicQuestions = qs => qs.map((q, i) => ({ n: i + 1, kind: q.kind, prompt: q.prompt, q: q.q, options: q.options }));

function grade(questions, answers) {
    let answered = 0, correct = 0;
    const missed = [];
    questions.forEach((q, i) => {
        const a = answers[i];
        if (a === null || a === undefined || a === '') return;
        answered++;
        if (Number(a) === q.correct) correct++;
        else missed.push({ n: i + 1, prompt: q.prompt, q: q.q, yours: q.options[Number(a)] ?? '', answer: q.options[q.correct], hint: q.hint });
    });
    return { answered, correct, missed };
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

async function finish(connection, row, answers) {
    const questions = JSON.parse(row.questions_json);
    const g = grade(questions, answers);
    await connection.execute(
        'UPDATE wrs_sprint_attempts SET submitted_at = NOW(), answers_json = ?, answered = ?, correct = ? WHERE id = ? AND submitted_at IS NULL',
        [JSON.stringify(answers), g.answered, g.correct, row.id]);
    return g;
}

function resultFor(row) {
    const questions = JSON.parse(row.questions_json);
    const answers = row.answers_json ? JSON.parse(row.answers_json) : {};
    const g = grade(questions, answers);
    return { answered: g.answered, correct: g.correct, total: questions.length, missed: g.missed };
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
            let state = 'closed';
            if (!eligible) state = 'not-enrolled';
            else if (row && row.submitted_at) state = 'done';
            else if (row) state = 'in-progress';
            else if (isMonday(today) || staff) state = 'open';
            const body = { state, today, isMonday: isMonday(today), preview: staff, history: await history(connection, studentId) };
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
            if (!staff && !(await inSection(connection, studentId))) return { status: 403, body: { error: 'The WRS Sprint is for Web Design 2 (B2).' } };
            let [[row]] = await connection.execute(
                'SELECT * FROM wrs_sprint_attempts WHERE student_id = ? AND week_date = ?', [studentId, today]);
            if (row && row.submitted_at && row.is_preview) {
                // Teacher previews can be retaken any time.
                await connection.execute('DELETE FROM wrs_sprint_attempts WHERE id = ?', [row.id]);
                row = undefined;
            }
            if (row && row.submitted_at) return { status: 409, body: { error: 'You already took this week\'s WRS Sprint.' } };
            if (!row) {
                if (!isMonday(today) && !staff) return { status: 403, body: { error: 'The WRS Sprint opens on Mondays.' } };
                const questions = buildTest(100);
                await connection.execute(
                    'INSERT IGNORE INTO wrs_sprint_attempts (student_id, week_date, started_at, questions_json, total, is_preview) VALUES (?, ?, NOW(), ?, ?, ?)',
                    [studentId, today, JSON.stringify(questions), questions.length, staff ? 1 : 0]);
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
                await finish(connection, row, answers);
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

// GET /admin/wrs-sprint -- every B2 student's weekly results
router.get('/admin/wrs-sprint', requireStaff, async (req, res) => {
    try {
        const out = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [students] = await connection.execute(
                `SELECT DISTINCT s.student_id, s.first_name, s.last_name FROM students s
                 LEFT JOIN student_additional_sections x ON x.student_id = s.student_id AND x.section_id = ?
                 WHERE (s.section_id = ? OR x.student_id IS NOT NULL) AND (s.archived IS NULL OR s.archived = 0)
                 ORDER BY s.last_name, s.first_name`, [SECTION, SECTION]);
            const [rows] = await connection.execute(
                `SELECT student_id, week_date, answered, correct, total, submitted_at FROM wrs_sprint_attempts
                 WHERE is_preview = 0 ORDER BY week_date`);
            return {
                students,
                attempts: rows.map(r => ({ student_id: r.student_id, week: toDateStr(r.week_date), answered: r.answered, correct: r.correct, total: r.total, done: !!r.submitted_at }))
            };
        });
        res.json(out);
    } catch (err) {
        console.error('[wrs-sprint] admin error:', err);
        res.status(500).json({ error: 'Could not load WRS Sprint results.' });
    }
});

module.exports = router;
