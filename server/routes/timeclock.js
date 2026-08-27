const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

// new Date().toISOString().split('T')[0] gives the UTC calendar date, which
// for any Pacific evening between ~5pm and midnight is already "tomorrow" --
// causing every "today" lookup in this file to miss same-day rows that
// MySQL's NOW()/CURTIME() (server-local time) actually stored under the
// real local date. Use the server's own local date fields instead.
function getLocalDateStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

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

// Scoped by period when provided: a dual-enrolled student who already
// clocked in for their morning period shouldn't be told they need to
// "clock out" the moment their afternoon period's page loads -- that's a
// separate class with its own separate clock-in. Falls back to the old
// student+date-only behavior if no period is given (backward compatible).
router.get('/timeclock/status', async (req, res) => {
    const { student_id, period } = req.query;
    try {
        const connection = await getDbConnection();
        const today = getLocalDateStr();
        const sql = period
            ? 'SELECT * FROM clockins WHERE student_id = ? AND section_id = ? AND DATE(timestamp) = ? ORDER BY timestamp DESC LIMIT 1'
            : 'SELECT * FROM clockins WHERE student_id = ? AND DATE(timestamp) = ? ORDER BY timestamp DESC LIMIT 1';
        const params = period ? [student_id, period, today] : [student_id, today];
        const [rows] = await connection.execute(sql, params);
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
    const today = getLocalDateStr();
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

    const upcoming = parsed.find(r => getLocalDateStr(new Date(r.dueDate)) >= today);
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
    const { type, student_id } = req.query; // CS, WD1, WD2
    const kind = String(type || '');
    const today = getLocalDateStr();
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

        // Prefer what this specific student actually worked on today (their
        // most recent notebook/worksheet save) over the class-wide due-date
        // schedule -- students progress through chapters at their own pace,
        // so the due-date-driven "current chapter" often isn't the one a
        // given student was actually in that day.
        let todaysChapterLabel = null;
        if (student_id) {
            // Excludes the exam scratchpad -- it's for jotting notes during a
            // test, not chapter content, so "reflect on what you learned in
            // Unit Exam Scratchpad" isn't a meaningful prompt even though
            // it's technically their most recent save.
            const [turninRows] = await connection.execute(
                `SELECT chapter FROM turnins
                 WHERE student_id = ? AND DATE(timestamp) = ? AND chapter IS NOT NULL AND chapter != ''
                   AND chapter NOT LIKE '%Exam Scratchpad%'
                 ORDER BY timestamp DESC LIMIT 1`,
                [student_id, today]
            );
            if (turninRows.length > 0) todaysChapterLabel = turninRows[0].chapter;
        }

        if (todaysChapterLabel) {
            await connection.release();
            return res.json({
                prompt_text: `In 2-3 sentences, reflect on what you learned today in ${todaysChapterLabel}. What's one thing that made sense, and one thing you're still working through?`,
                isCustom: false
            });
        }

        // Fallback: no recorded activity for this student today (e.g. they
        // clocked in but didn't save any notes) -- use the class-wide
        // due-date schedule as a reasonable default.
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
    const today = getLocalDateStr();
    const period = section_id || '';
    try {
        const connection = await getDbConnection();
        if (mode === 'in') {
            await connection.execute(
                'INSERT INTO clockins (student_id, section_id, type, answer, timestamp) VALUES (?, ?, ?, ?, NOW())',
                [student_id, period, 'in', answer || '']
            );
            // timesheets has no unique constraint to make "ON DUPLICATE KEY
            // UPDATE" actually trigger (it never has -- every prior clock-in
            // silently INSERTed a brand-new row instead of updating, which is
            // why some students have dozens of rows for a single day).
            // Explicit check-then-write instead, scoped by period so a
            // dual-enrolled student's two classes each get their own row for
            // the same day rather than colliding or overwriting each other.
            const [existing] = await connection.execute(
                'SELECT id FROM timesheets WHERE student_id = ? AND date = ? AND section_id = ? LIMIT 1',
                [student_id, today, period]
            );
            if (existing.length > 0) {
                await connection.execute(
                    'UPDATE timesheets SET clock_in = CURTIME(), in_answer = ? WHERE id = ?',
                    [answer || '', existing[0].id]
                );
            } else {
                await connection.execute(
                    'INSERT INTO timesheets (student_id, date, section_id, clock_in, in_answer) VALUES (?, ?, ?, CURTIME(), ?)',
                    [student_id, today, period, answer || '']
                );
            }
        } else if (mode === 'out') {
            await connection.execute(
                'INSERT INTO clockins (student_id, section_id, type, answer, timestamp) VALUES (?, ?, ?, ?, NOW())',
                [student_id, period, 'out', answer || '']
            );
            // Scoped by section_id and limited to one row so clocking out of
            // one period can never stamp the same clock-out time onto a
            // different period's still-open record for the same day.
            await connection.execute(
                `UPDATE timesheets SET clock_out = CURTIME(), out_answer = ?
                 WHERE student_id = ? AND date = ? AND section_id = ? AND clock_out IS NULL
                 ORDER BY id DESC LIMIT 1`,
                [answer || '', student_id, today, period]
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
