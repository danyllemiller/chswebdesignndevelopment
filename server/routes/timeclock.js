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
        await connection.release();
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
        await connection.release();
        if (rows.length === 0) return res.json({ mode: 'in' });
        const type = rows[0].type;
        res.json({ mode: type === 'out' ? 'done' : 'out', ...rows[0] });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch status' }); }
});

// ==============================================================================
// CURRENT-CHAPTER RESOLUTION
// "Current chapter" = the lowest-numbered chapter whose lab/milestone exam_id
// (cs_chN_... for CS, chN_... for WD) has the earliest due date that hasn't
// passed yet -- i.e. the chapter students are actively working on right now.
// Falls back to Chapter 1 if no due dates are set at all yet.
// ==============================================================================

const CS_COURSE_ID = '10003GS';
const WD_COURSE_IDS = { WD1: '05254G1S', WD2: '05254G2S' };

const CS_CHAPTER_TITLES = {
    1: 'Essential Computer Skills', 2: 'Ethics, Privacy & Law', 3: 'How Computers Work',
    4: 'Intro to Office Software', 5: 'The Language of Computers', 6: 'Storing Data',
    7: 'Mastering Spreadsheets', 8: 'Computational Modeling', 9: 'Problem Solving & Algorithms',
    10: 'Control Structures & Events', 11: 'Culture, Equity & Bias', 12: 'Ethics & Societal Impact',
    13: 'AI & Cross-Disciplinary Tech', 14: 'Advanced Data Structures', 15: 'Modularity & Procedures',
    16: 'The Software Development Lifecycle', 17: 'How the Internet Works', 18: 'Cybersecurity Threats',
    19: 'Defending Systems'
};

const WD_CHAPTER_TITLES = {
    1: "The Developer's World", 2: 'The Rules (How Not to Get Sued)', 3: 'The Blueprint',
    4: 'The Why (Intro to UI/UX)', 5: 'The "Bones" (Intro to HTML)', 6: 'The "Clothes" (Intro to CSS)',
    7: 'The Style (Advanced CSS Layout)', 8: 'Sights & Sounds (Media & Tables)',
    9: 'The "Brains" (Intro to JavaScript)', 10: 'The Game Dev (Advanced JS Game Logic)',
    11: 'The "Cloud" (Collaboration & Hosting)', 12: 'The "Manager" (CMS Platforms)',
    13: 'The Network (Intro to APIs)', 14: 'The "Brain" (Databases)',
    15: 'The "Future" (The Game Never Ends)', 16: 'The "Final Boss" (Going Live)'
};

async function getCurrentChapter(connection, courseId, examIdRegex, chapterRegex) {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await connection.execute(
        `SELECT exam_id, due_date FROM exams WHERE course_id = ? AND exam_id REGEXP ? AND due_date IS NOT NULL ORDER BY due_date ASC`,
        [courseId, examIdRegex]
    );
    const parsed = rows
        .map(r => {
            const m = r.exam_id.match(chapterRegex);
            return m ? { chapter: parseInt(m[1], 10), dueDate: r.due_date } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.chapter - b.chapter);

    const upcoming = parsed.find(r => new Date(r.dueDate).toISOString().split('T')[0] >= today);
    if (upcoming) return { chapter: upcoming.chapter, isFallback: false };
    if (parsed.length > 0) return { chapter: parsed[parsed.length - 1].chapter, isFallback: false }; // all past — stick with the last one
    return { chapter: 1, isFallback: true }; // no due dates set anywhere yet
}

function getCurrentCSChapter(connection) {
    return getCurrentChapter(connection, CS_COURSE_ID, '^cs_ch[0-9]+_', /^cs_ch(\d+)_/);
}

function getCurrentWDChapter(connection, wdKey) {
    return getCurrentChapter(connection, WD_COURSE_IDS[wdKey], '^ch[0-9]+_', /^ch(\d+)_/);
}

async function getRandomQuestion(connection, table, chapter) {
    const [rows] = await connection.execute(
        `SELECT question_text AS question, option_a, option_b, option_c, option_d, correct_answer AS answer
         FROM ${table} WHERE chapter_number = ? ORDER BY RAND() LIMIT 1`,
        [chapter]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return { question: r.question, options: [r.option_a, r.option_b, r.option_c, r.option_d], answer: r.answer };
}

// type is one of CS_IN / WD1_IN / WD2_IN — the clock-in question is always a
// real test-bank question pulled from the chapter the student is currently
// working on, never a manually-typed or generic question.
router.get('/timeclock/question', async (req, res) => {
    const { type } = req.query;
    const kind = String(type || '').replace(/_IN$/, ''); // CS, WD1, WD2
    try {
        const connection = await getDbConnection();

        let chapter, isFallback, title, q;
        if (kind === 'CS') {
            ({ chapter, isFallback } = await getCurrentCSChapter(connection));
            title = CS_CHAPTER_TITLES[chapter] || `Chapter ${chapter}`;
            q = await getRandomQuestion(connection, 'questions', chapter);
        } else if (kind === 'WD1' || kind === 'WD2') {
            ({ chapter, isFallback } = await getCurrentWDChapter(connection, kind));
            title = WD_CHAPTER_TITLES[chapter] || `Chapter ${chapter}`;
            q = await getRandomQuestion(connection, 'wd_questions', chapter);
        } else {
            await connection.release();
            return res.status(400).json({ error: 'Unrecognized type' });
        }

        await connection.release();

        if (!q) {
            return res.json({
                question_text: `No test-bank questions found yet for Chapter ${chapter}: ${title}.`,
                options: [], correct_answer: null, chapterLabel: `Chapter ${chapter}: ${title}`, unavailable: true
            });
        }

        res.json({
            question_text: q.question,
            options: q.options,
            correct_answer: q.answer,
            chapterLabel: `Chapter ${chapter}: ${title}${isFallback ? ' (no due dates set yet — defaulting to Ch. 1)' : ''}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch clock-in question' });
    }
});

// Clock-out prompt: a teacher's manually-set exit ticket for today takes
// priority (admin/payroll.html's "Set Clock Out Prompts" modal); otherwise
// auto-generate a reflection prompt tied to the chapter the student is
// actually working on right now, resolved the same way as the clock-in
// question so the two never disagree about "today's" content.
router.get('/timeclock/reflection-prompt', async (req, res) => {
    const { type } = req.query; // CS, WD1, WD2
    const kind = String(type || '');
    const today = new Date().toISOString().split('T')[0];
    try {
        const connection = await getDbConnection();

        const [rows] = await connection.execute(
            'SELECT wd_question, cs_question FROM teacher_daily_questions WHERE date = ?',
            [today]
        );
        const dailyQ = rows[0];
        const custom = kind === 'CS' ? dailyQ?.cs_question : dailyQ?.wd_question;
        if (custom && custom.trim()) {
            await connection.release();
            return res.json({ prompt_text: custom.trim(), isCustom: true });
        }

        let chapter, title;
        if (kind === 'CS') {
            ({ chapter } = await getCurrentCSChapter(connection));
            title = CS_CHAPTER_TITLES[chapter] || `Chapter ${chapter}`;
        } else if (kind === 'WD1' || kind === 'WD2') {
            ({ chapter } = await getCurrentWDChapter(connection, kind));
            title = WD_CHAPTER_TITLES[chapter] || `Chapter ${chapter}`;
        } else {
            await connection.release();
            return res.status(400).json({ error: 'Unrecognized type' });
        }
        await connection.release();

        res.json({
            prompt_text: `In 2-3 sentences, reflect on what you learned today in Chapter ${chapter}: ${title}. What's one thing that made sense, and one thing you're still working through?`,
            isCustom: false
        });
    } catch (err) {
        console.error(err);
        res.json({
            prompt_text: 'In 2-3 sentences, reflect on what you learned today.',
            isCustom: false
        });
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
        await connection.release();
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
        await connection.release();
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
        await connection.release();
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
        await connection.release();
        res.json({ success: true, count });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to inject timesheets' }); }
});

module.exports = router;
