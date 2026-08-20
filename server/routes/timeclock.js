const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

// Legacy clock-in endpoint (kept for backward compatibility)
router.post('/clockin', async (req, res) => {
    const { student_id, section_id, type, answer } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO clockins (student_id, section_id, type, answer, timestamp) VALUES (?, ?, ?, ?, NOW())',
            [student_id, section_id, type, answer]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Clock in failed.' }); }
});

router.get('/timeclock/status', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await connection.execute(
            'SELECT * FROM clockins WHERE student_id = ? AND DATE(timestamp) = ? ORDER BY timestamp DESC LIMIT 1',
            [student_id, today]
        );
        await connection.end();
        if (rows.length === 0) return res.json({ mode: 'in' });
        const type = rows[0].type;
        res.json({ mode: type === 'out' ? 'done' : 'out', ...rows[0] });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch status' }); }
});

// Current unit = the lowest-numbered Unit N Exam whose due date hasn't
// passed yet, i.e. the unit students are actively working toward. Falls
// back to Unit 1 (flagged) if no CS unit exam has a due date set at all.
async function getCurrentCSUnit(connection) {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await connection.execute(
        `SELECT exam_id, due_date FROM exams
         WHERE course_id LIKE '10003%' AND exam_id REGEXP '^Unit[0-9]+-Exam$' AND due_date IS NOT NULL
         ORDER BY due_date ASC`
    );
    const parsed = rows
        .map(r => ({ unit: parseInt(r.exam_id.match(/^Unit(\d+)-Exam$/i)[1], 10), dueDate: r.due_date }))
        .filter(r => !isNaN(r.unit))
        .sort((a, b) => a.unit - b.unit);

    const upcoming = parsed.find(r => new Date(r.dueDate).toISOString().split('T')[0] >= today);
    if (upcoming) return { unit: upcoming.unit, isFallback: false };
    if (parsed.length > 0) return { unit: parsed[parsed.length - 1].unit, isFallback: false }; // all past — stick with the last one
    return { unit: 1, isFallback: true }; // no due dates set anywhere yet
}

async function getRandomCSQuestion(connection, unit) {
    const [rows] = await connection.execute(
        `SELECT question_text AS question, option_a, option_b, option_c, option_d, correct_answer AS answer
         FROM questions WHERE chapter_number = ? ORDER BY RAND() LIMIT 1`,
        [unit]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return { question: r.question, options: [r.option_a, r.option_b, r.option_c, r.option_d], answer: r.answer };
}

router.get('/timeclock/question', async (req, res) => {
    const { type } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const isCS = String(type).startsWith('CS');
    const defaultOptions = JSON.stringify(['On Time', 'A few minutes late (1-5 min)', 'Tardy (5+ min late)']);
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT wd_question, cs_question FROM teacher_daily_questions WHERE date = ?',
            [today]
        );
        const dailyQ = rows[0];
        const baseText = isCS ? (dailyQ?.cs_question || '') : (dailyQ?.wd_question || '');
        const questionText = baseText
            ? `${baseText}\n\nAlso — how are you arriving today?`
            : 'How are you arriving today?';

        let reviewQuestion = null;
        if (isCS) {
            const { unit, isFallback } = await getCurrentCSUnit(connection);
            const q = await getRandomCSQuestion(connection, unit);
            if (q) reviewQuestion = { ...q, unit, isFallback };
        }

        await connection.end();
        res.json({ question_text: questionText, options: defaultOptions, reviewQuestion });
    } catch (err) {
        console.error(err);
        res.json({ question_text: 'How are you arriving today?', options: defaultOptions, reviewQuestion: null });
    }
});

router.post('/timeclock/save', async (req, res) => {
    const { student_id, section_id, mode, answer } = req.body;
    if (!student_id || !mode) return res.status(400).json({ error: 'student_id and mode are required' });
    const today = new Date().toISOString().split('T')[0];
    try {
        const connection = await getDbConnection();
        if (mode === 'in') {
            await connection.execute(
                'INSERT INTO clockins (student_id, section_id, type, answer, timestamp) VALUES (?, ?, ?, ?, NOW())',
                [student_id, section_id || '', 'in', answer || '']
            );
            await connection.execute(
                `INSERT INTO timesheets (student_id, date, clock_in, in_answer)
                 VALUES (?, ?, CURTIME(), ?)
                 ON DUPLICATE KEY UPDATE clock_in = CURTIME(), in_answer = VALUES(in_answer)`,
                [student_id, today, answer || '']
            );
        } else if (mode === 'out') {
            await connection.execute(
                'INSERT INTO clockins (student_id, section_id, type, answer, timestamp) VALUES (?, ?, ?, ?, NOW())',
                [student_id, section_id || '', 'out', answer || '']
            );
            await connection.execute(
                `UPDATE timesheets SET clock_out = CURTIME(), out_answer = ?
                 WHERE student_id = ? AND date = ? AND clock_out IS NULL`,
                [answer || '', student_id, today]
            );
        }
        await connection.end();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Timeclock save failed.' }); }
});

router.get('/admin/daily-questions', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS teacher_daily_questions (
                date DATE NOT NULL PRIMARY KEY,
                wd_question TEXT,
                cs_question TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        const [rows] = await connection.execute(
            'SELECT wd_question, cs_question FROM teacher_daily_questions WHERE date = ?',
            [date]
        );
        await connection.end();
        res.json(rows.length > 0
            ? { wdQuestion: rows[0].wd_question || '', csQuestion: rows[0].cs_question || '' }
            : { wdQuestion: '', csQuestion: '' }
        );
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch daily questions' }); }
});

router.post('/admin/daily-questions', async (req, res) => {
    const { date, wdQuestion, csQuestion } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS teacher_daily_questions (
                date DATE NOT NULL PRIMARY KEY,
                wd_question TEXT,
                cs_question TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await connection.execute(
            `INSERT INTO teacher_daily_questions (date, wd_question, cs_question) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE wd_question = VALUES(wd_question), cs_question = VALUES(cs_question)`,
            [date, wdQuestion || '', csQuestion || '']
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save daily questions' }); }
});

router.post('/admin/inject-timesheets', async (req, res) => {
    const { student_id, timesheets } = req.body;
    if (!student_id || !Array.isArray(timesheets)) {
        return res.status(400).json({ error: 'student_id and timesheets array are required' });
    }
    try {
        const connection = await getDbConnection();
        let count = 0;
        for (const ts of timesheets) {
            await connection.execute(
                'DELETE FROM timesheets WHERE student_id = ? AND date = ?',
                [student_id, ts.date]
            );
            await connection.execute(
                `INSERT INTO timesheets (student_id, date, clock_in, clock_out, in_answer, out_answer)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [student_id, ts.date, ts.clock_in, ts.clock_out, ts.in_answer || 'Simulated Answer', ts.out_answer || 'Simulated Reflection']
            );
            count++;
        }
        await connection.end();
        res.json({ success: true, count });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to inject timesheets' }); }
});

module.exports = router;
