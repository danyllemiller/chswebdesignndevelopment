const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
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

// ==============================================================================
// DAY-TYPE / BELL-SCHEDULE RESOLUTION (server-side)
// Mirrors the identical merge logic already used client-side in
// js/student/timeclock.js, admin/tools/tardy-tracker.html, and
// student/intervention.html (special-dates.csv as the base layer,
// calendar_events overriding it when its type outranks the CSV's) so
// grading decisions here never disagree with what those pages show.
// ==============================================================================

const EVENT_TYPE_PRI = { A: 6, B: 5, C: 4, A_MIN: 3, B_MIN: 2, S: 2, OFF: 1, none: 0 };

function parseSpecialDatesCSV(text) {
    const map = new Map();
    const lines = text.split(/\r?\n/);
    const firstLine = lines.find(l => l.trim());
    const delim = firstLine && firstLine.includes('\t') ? '\t' : ',';
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].trim();
        if (!raw) continue;
        if (i === 0 && /^date/i.test(raw.split(delim)[0].trim())) continue;
        const cols = raw.split(delim);
        const date = cols[0]?.trim();
        const type = cols[1]?.trim();
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && type) map.set(date, { type });
    }
    return map;
}

// Briefly cached (60s) -- this runs on every clock-in/clock-out check, and
// the underlying data (a static CSV + a rarely-changing events table)
// doesn't need to be re-read on every single request.
let dayTypesCache = null;
let dayTypesCacheAt = 0;

async function getDayTypes(connection) {
    if (dayTypesCache && Date.now() - dayTypesCacheAt < 60000) return dayTypesCache;
    let csvText = '';
    try { csvText = fs.readFileSync(path.join(__dirname, '../../special-dates.csv'), 'utf8'); } catch (e) { /* fall through with an empty CSV layer */ }
    const dayTypes = parseSpecialDatesCSV(csvText);
    const [events] = await connection.execute('SELECT event_date, type FROM calendar_events');
    events.forEach(ev => {
        const dateStr = getLocalDateStr(new Date(ev.event_date));
        const existing = dayTypes.get(dateStr);
        if (existing) {
            if ((EVENT_TYPE_PRI[ev.type] ?? 0) > (EVENT_TYPE_PRI[existing.type] ?? 0)) existing.type = ev.type;
        } else {
            dayTypes.set(dateStr, { type: ev.type });
        }
    });
    dayTypesCache = dayTypes;
    dayTypesCacheAt = Date.now();
    return dayTypes;
}

function getBellScheduleKeyForDate(dayTypes, dateStr) {
    const info = dayTypes.get(dateStr);
    if (!info || info.type === 'OFF' || info.type === 'none') return null;
    const jsDay = new Date(dateStr + 'T00:00:00').getDay();
    if (jsDay === 0 || jsDay === 6) return null;
    return info.type === 'S' ? 'summer' : info.type;
}

function isSchoolDay(dayTypes, dateStr) {
    return getBellScheduleKeyForDate(dayTypes, dateStr) !== null;
}

function mondayOf(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d;
}

// Which "pair group" a date belongs to for question-rotation purposes:
// within each Monday-based week, count real school days in order -- the
// 1st is solo, the 2nd+3rd pair up, the 4th+5th pair up, and so on. Built
// on the ACTUAL school-day sequence (skipping weekends/holidays/off days
// via the real calendar), not fixed weekday names, so a Monday holiday
// correctly shifts the whole week's pairing instead of breaking it.
function pairGroupKey(dayTypes, dateStr) {
    const monday = mondayOf(dateStr);
    const mondayStr = getLocalDateStr(monday);
    let idx = 0;
    const cursor = new Date(monday);
    for (let i = 0; i < 14; i++) {
        const cStr = getLocalDateStr(cursor);
        if (isSchoolDay(dayTypes, cStr)) idx++;
        if (cStr === dateStr) {
            const group = idx > 0 ? Math.floor(idx / 2) + 1 : 0;
            return `${mondayStr}-g${group}`;
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return dateStr; // defensive fallback -- shouldn't normally be reached
}

async function getBellStartTime(connection, dayTypes, dateStr, period) {
    const scheduleKey = getBellScheduleKeyForDate(dayTypes, dateStr);
    if (!scheduleKey) return null;
    const p = String(period || '').trim().toUpperCase();
    const [rows] = await connection.execute(
        'SELECT start_time FROM bell_schedule WHERE schedule_type = ? AND period_label = ?',
        [scheduleKey, p]
    );
    let row = rows[0];
    if (!row) {
        const [allRows] = await connection.execute('SELECT period_label, start_time FROM bell_schedule WHERE schedule_type = ?', [scheduleKey]);
        row = allRows.find(r => p.includes(r.period_label));
    }
    return row ? row.start_time : null;
}

// On time = clocked in anywhere from the window opening (5 min before the
// bell) through 5 minutes after it. Arriving later than that is late;
// arriving early is always fine since the clock-in window itself doesn't
// open any earlier than 5 minutes before the bell.
function isOnTime(startTimeStr, now = new Date()) {
    if (!startTimeStr) return null; // no schedule resolved -- can't judge, don't penalize
    const [sh, sm] = String(startTimeStr).split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return (nowMinutes - startMinutes) <= 5;
}

// Deterministic hash so every student in the same course sees the exact
// same question for the whole pair-group window, without needing to
// coordinate or store which question was "already picked" anywhere.
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    return Math.abs(hash);
}

const PERIOD_COURSE_MAP = { A1: 'WD1', B2: 'WD2', A3: 'CS', A5: 'CS', B4: 'CS', B6: 'CS', B8: 'CS' };
const TC_COURSE_ID_MAP = { CS: '10003GS', WD1: '05254G1S', WD2: '05254G2S' };

function periodToCourseKeyServer(period) {
    const p = String(period || '').trim().toUpperCase();
    if (PERIOD_COURSE_MAP[p]) return PERIOD_COURSE_MAP[p];
    const prefix = p.match(/^[A-Z]+/)?.[0];
    return (prefix && PERIOD_COURSE_MAP[prefix]) || null;
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

// Deterministic, not random -- every student in the same course must see
// the identical question for the whole pair-group window (see
// pairGroupKey above), so the pool is fetched in a stable order and
// indexed via a hash of (groupKey, table, chapter) instead of RAND().
async function getDeterministicQuestion(connection, table, chapter, groupKey) {
    const [rows] = await connection.execute(
        `SELECT question_text AS question, option_a, option_b, option_c, option_d, correct_answer AS answer
         FROM ${table} WHERE chapter_number = ? ORDER BY question_id ASC`,
        [chapter]
    );
    if (rows.length === 0) return null;
    const idx = hashString(`${groupKey}|${table}|${chapter}`) % rows.length;
    const r = rows[idx];
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
        const dayTypes = await getDayTypes(connection);
        const groupKey = pairGroupKey(dayTypes, getLocalDateStr());

        let chapter, isFallback, title, q;
        if (kind === 'CS') {
            ({ chapter, isFallback } = await getCurrentCSChapter(connection));
            title = CS_CHAPTER_TITLES[chapter] || `Chapter ${chapter}`;
            q = await getDeterministicQuestion(connection, 'questions', chapter, groupKey);
        } else if (kind === 'WD1' || kind === 'WD2') {
            ({ chapter, isFallback } = await getCurrentWDChapter(connection, kind));
            title = WD_CHAPTER_TITLES[chapter] || `Chapter ${chapter}`;
            q = await getDeterministicQuestion(connection, 'wd_questions', chapter, `${kind}|${groupKey}`);
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
    const { student_id, section_id, mode, answer, is_correct } = req.body;
    if (!student_id || !mode) return res.status(400).json({ error: 'student_id and mode are required' });
    const today = getLocalDateStr();
    const period = section_id || '';
    try {
        const connection = await getDbConnection();
        if (mode === 'in') {
            const isCorrectVal = is_correct === undefined || is_correct === null ? null : (is_correct ? 1 : 0);
            await connection.execute(
                'INSERT INTO clockins (student_id, section_id, type, answer, is_correct, timestamp) VALUES (?, ?, ?, ?, ?, NOW())',
                [student_id, period, 'in', answer || '', isCorrectVal]
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

            // Grade the clock-in: 1 pt for doing it, 1 pt for being on time
            // (within 5 min of the bell), 1 pt for a correct answer. Written
            // straight into the real gradebook (exams/responses) so it shows
            // up in the normal admin/student views like any other assignment
            // -- one shared entry per course per day, matching how exams and
            // pretests already work. Best-effort: a failure here shouldn't
            // block the clock-in itself from succeeding.
            try {
                const courseKey = periodToCourseKeyServer(period);
                const courseId = TC_COURSE_ID_MAP[courseKey];
                if (courseId) {
                    const dayTypes = await getDayTypes(connection);
                    const startTime = await getBellStartTime(connection, dayTypes, today, period);
                    const onTime = isOnTime(startTime);
                    let points = 1; // attempted
                    if (onTime) points += 1;
                    if (isCorrectVal === 1) points += 1;

                    const examId = `TC-${courseKey}-${today}`;
                    await connection.execute(
                        `INSERT INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE title = VALUES(title), total_points = VALUES(total_points), course_id = VALUES(course_id)`,
                        [examId, `Timeclock Check-In — ${today}`, 3, courseId]
                    );
                    await connection.execute(
                        `INSERT INTO responses (student_id, exam_id, score, total_points, timestamp) VALUES (?, ?, ?, ?, NOW())
                         ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()`,
                        [student_id, examId, points, 3]
                    );
                }
            } catch (gradeErr) { console.error('[timeclock] Failed to grade clock-in:', gradeErr); }
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
