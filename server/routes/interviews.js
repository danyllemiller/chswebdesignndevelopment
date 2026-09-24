const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { requireLogin, requireSelfOrStaff } = require('../helpers');
const { getDayTypes, getBellScheduleKeyForDate } = require('../tardyLogic');

// Mock Interview sign-up + scoring, Chapter 1 (year1/join-the-developers-guild.html).
// A1's actual start/end time isn't fixed -- it depends on that calendar
// date's rotation (special-dates.csv -> bell_schedule, same resolution
// tardyLogic.js already uses for tardy tracking), so a C-day (e.g. an
// "All Period Day") can run A1 as short as 7:35-8:21 instead of the usual
// 7:35-9:00. The bookable window always skips the first 20 minutes for
// attendance/classroom admin, and always ends at least 5 minutes before
// the period's real end time so an interview never runs into clock-out.
// 5-minute interview + a 3-minute buffer for the teacher to switch
// files/students = an 8-minute cadence.
const ATTENDANCE_SKIP_MIN = 20;
const BUFFER_BEFORE_END_MIN = 5;
const INTERVIEW_MIN = 5;
const BUFFER_MIN = 3;
const SLOT_CADENCE_MIN = INTERVIEW_MIN + BUFFER_MIN;

const EXAM_ID = 'ch1_lab_mock_interview';
const EXAM_TITLE = 'Milestone: Mock Interview Reflection';
const EXAM_TOTAL_POINTS = 25;

function minutesToTimeStr(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function timeStrToMinutes(t) {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
}

// Returns null when A1 doesn't meet at all on this date (weekend, day
// off, or a rotation that skips A1 entirely) -- callers must treat that
// as "no slots can be generated," not fall back to a default window.
async function getInterviewWindowForDate(connection, dateStr) {
    const dayTypes = await getDayTypes(connection);
    const scheduleKey = getBellScheduleKeyForDate(dayTypes, dateStr);
    if (!scheduleKey) return null;
    const [[period]] = await connection.execute(
        `SELECT start_time, end_time FROM bell_schedule WHERE schedule_type = ? AND period_label = 'A1' LIMIT 1`,
        [scheduleKey]
    );
    if (!period) return null;
    return {
        start: timeStrToMinutes(period.start_time) + ATTENDANCE_SKIP_MIN,
        end: timeStrToMinutes(period.end_time) - BUFFER_BEFORE_END_MIN
    };
}

function buildSlotsForWindow(windowStart, windowEnd) {
    const slots = [];
    for (let start = windowStart; start + INTERVIEW_MIN <= windowEnd; start += SLOT_CADENCE_MIN) {
        slots.push({ start: minutesToTimeStr(start), end: minutesToTimeStr(start + INTERVIEW_MIN) });
    }
    return slots;
}

function formatTime12h(timeStr) {
    const [h, m] = String(timeStr).split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Writes into the same calendar_events table the PHP class calendar
// (calendar.html / api/events.php) already reads -- no separate calendar
// system, this is the one students and the teacher already use.
// events.php filters student requests with `course_bucket IS NULL OR
// course_bucket = ?bucket`, and only the teacher/admin view omits
// ?bucket (so it gets every row back unfiltered). 'STAFF' never matches
// a real student bucket, so a 'STAFF'-tagged event is invisible to
// students but still shows on the teacher's own calendar -- that's the
// only lever this table gives us for a teacher-only event, short of
// building real per-student filtering.
const CALENDAR_SOURCE = 'interview';
const CALENDAR_STUDENT_BUCKET = 'WD1'; // A1 period maps to WD1 (server/routes/timeclock.js)

async function addInterviewCalendarEvents(connection, slotId) {
    const [[slot]] = await connection.execute(
        `SELECT s.id, DATE_FORMAT(s.slot_date, '%Y-%m-%d') AS slot_date, s.start_time, s.end_time,
                st.first_name, st.last_name
         FROM interview_slots s LEFT JOIN students st ON st.student_id = s.student_id
         WHERE s.id = ?`,
        [slotId]
    );
    if (!slot || !slot.first_name) return;

    // One generic, name-free reminder per interview day, visible to the
    // whole class -- created once on that day's first sign-up, not
    // duplicated on every claim after.
    const [[existingReminder]] = await connection.execute(
        `SELECT id FROM calendar_events WHERE source = ? AND event_date = ? AND course_bucket = ? LIMIT 1`,
        [CALENDAR_SOURCE, slot.slot_date, CALENDAR_STUDENT_BUCKET]
    );
    if (!existingReminder) {
        await connection.execute(
            `INSERT INTO calendar_events (event_date, title, type, all_day, source, course_bucket)
             VALUES (?, 'Mock Interviews Today', 'none', 1, ?, ?)`,
            [slot.slot_date, CALENDAR_SOURCE, CALENDAR_STUDENT_BUCKET]
        );
    }

    // Named entry, teacher-only (course_bucket = 'STAFF'). description
    // carries a machine-readable key so a later release can delete this
    // exact row without guessing off the title.
    await connection.execute(
        `INSERT INTO calendar_events (event_date, title, type, description, all_day, start_time, end_time, source, course_bucket)
         VALUES (?, ?, 'none', ?, 0, ?, ?, ?, 'STAFF')`,
        [
            slot.slot_date,
            `Mock Interview — ${slot.last_name}, ${slot.first_name} (${formatTime12h(slot.start_time)})`,
            `slot_id:${slot.id}`,
            slot.start_time,
            slot.end_time,
            CALENDAR_SOURCE
        ]
    );
}

async function removeInterviewCalendarEvent(connection, slotId) {
    await connection.execute(
        `DELETE FROM calendar_events WHERE source = ? AND description = ?`,
        [CALENDAR_SOURCE, `slot_id:${slotId}`]
    );
}

// Rubric criteria, 0-4 each, grounded in Nevada Workplace Readiness
// Skills (Personal Qualities/People Skills + Professional Image
// standards already used elsewhere in Ch1). Kept in one place so the
// admin scoring form and the score math below can't drift apart.
const RUBRIC_CRITERIA = [
    { key: 'attire', label: 'Professional Attire' },
    { key: 'punctuality', label: 'Punctuality & Preparedness' },
    { key: 'professionalism', label: 'Professionalism & Courtesy' },
    { key: 'communication', label: 'Communication & Verbal Presentation' },
    { key: 'content', label: 'Content of Answers' },
    { key: 'confidence', label: 'Confidence & Poise' }
];

router.get('/interview-rubric-criteria', requireLogin, (req, res) => {
    res.json({ criteria: RUBRIC_CRITERIA, examId: EXAM_ID, maxPoints: EXAM_TOTAL_POINTS });
});

// ---- Interview question script (teacher's talking points, editable from
// the same schedule page she scores from -- see interview_questions table) ----

router.get('/interview-questions', requireLogin, async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT id, question_text FROM interview_questions ORDER BY sort_order ASC, id ASC'
        );
        await connection.release();
        res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load interview questions' }); }
});

router.post('/admin/interview-questions', async (req, res) => {
    const { question_text } = req.body;
    if (!question_text || !question_text.trim()) return res.status(400).json({ error: 'question_text is required' });
    try {
        const connection = await getDbConnection();
        const [[row]] = await connection.execute('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM interview_questions');
        const [result] = await connection.execute(
            'INSERT INTO interview_questions (question_text, sort_order) VALUES (?, ?)',
            [question_text.trim(), row.next]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to add question' }); }
});

router.delete('/admin/interview-questions/:id', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM interview_questions WHERE id = ?', [req.params.id]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete question' }); }
});

// ---- Student-facing sign-up ----

router.get('/interview-slots', requireLogin, async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT s.id, DATE_FORMAT(s.slot_date, '%Y-%m-%d') AS slot_date, s.start_time, s.end_time, s.student_id,
                    st.first_name, st.last_name
             FROM interview_slots s
             LEFT JOIN students st ON st.student_id = s.student_id
             ORDER BY s.slot_date ASC, s.start_time ASC`
        );
        await connection.release();
        const out = rows.map(r => ({
            id: r.id,
            slot_date: r.slot_date,
            start_time: r.start_time,
            end_time: r.end_time,
            available: !r.student_id,
            is_mine: !!student_id && r.student_id === student_id
        }));
        res.json(out);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load interview slots' }); }
});

router.post('/interview-slots/claim', requireSelfOrStaff(), async (req, res) => {
    const { student_id, slot_id } = req.body;
    if (!student_id || !slot_id) return res.status(400).json({ error: 'student_id and slot_id are required' });
    try {
        const connection = await getDbConnection();
        // One slot per student -- free any prior claim by this student
        // before taking the new one, so switching slots doesn't leave two
        // reserved under their name. Grab its id first so the matching
        // calendar event can be cleaned up too, not just the slot row.
        const [[priorSlot]] = await connection.execute(
            'SELECT id FROM interview_slots WHERE student_id = ?', [student_id]
        );
        if (priorSlot) {
            await connection.execute(
                'UPDATE interview_slots SET student_id = NULL, claimed_at = NULL WHERE id = ?', [priorSlot.id]
            );
            await removeInterviewCalendarEvent(connection, priorSlot.id);
        }
        const [result] = await connection.execute(
            'UPDATE interview_slots SET student_id = ?, claimed_at = NOW() WHERE id = ? AND student_id IS NULL',
            [student_id, slot_id]
        );
        if (result.affectedRows === 0) {
            await connection.release();
            return res.status(409).json({ error: 'That slot was just taken by someone else. Pick another.' });
        }
        await addInterviewCalendarEvents(connection, slot_id);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to claim slot' }); }
});

router.post('/interview-slots/release', requireSelfOrStaff(), async (req, res) => {
    const { student_id, slot_id } = req.body;
    if (!student_id || !slot_id) return res.status(400).json({ error: 'student_id and slot_id are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'UPDATE interview_slots SET student_id = NULL, claimed_at = NULL WHERE id = ? AND student_id = ?',
            [slot_id, student_id]
        );
        await removeInterviewCalendarEvent(connection, slot_id);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to release slot' }); }
});

// ---- Admin: schedule management + rubric scoring ----

router.post('/admin/interview-slots/generate', async (req, res) => {
    const { slot_date } = req.body;
    if (!slot_date) return res.status(400).json({ error: 'slot_date is required' });
    try {
        const connection = await getDbConnection();
        const window = await getInterviewWindowForDate(connection, slot_date);
        if (!window) {
            await connection.release();
            return res.status(400).json({ error: 'A1 does not meet on this date, so no interview slots can be generated.' });
        }
        const slots = buildSlotsForWindow(window.start, window.end);
        for (const s of slots) {
            await connection.execute(
                'INSERT IGNORE INTO interview_slots (slot_date, start_time, end_time) VALUES (?, ?, ?)',
                [slot_date, s.start, s.end]
            );
        }
        await connection.release();
        res.json({ success: true, generated: slots.length });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate slots' }); }
});

router.delete('/admin/interview-slots/:id', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await removeInterviewCalendarEvent(connection, req.params.id);
        await connection.execute('DELETE FROM interview_slots WHERE id = ?', [req.params.id]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete slot' }); }
});

router.get('/admin/interview-slots', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT s.id, DATE_FORMAT(s.slot_date, '%Y-%m-%d') AS slot_date, s.start_time, s.end_time, s.student_id,
                    st.first_name, st.last_name,
                    r.score AS rubric_score
             FROM interview_slots s
             LEFT JOIN students st ON st.student_id = s.student_id
             LEFT JOIN interview_rubric_scores r ON r.slot_id = s.id
             ORDER BY s.slot_date ASC, s.start_time ASC`
        );
        await connection.release();
        res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load schedule' }); }
});

router.get('/admin/interview-rubric', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM interview_rubric_scores WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        await connection.release();
        if (rows.length === 0) return res.json(null);
        res.json({ ...rows[0], ratings: JSON.parse(rows[0].rubric_json) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load rubric score' }); }
});

router.post('/admin/interview-rubric', async (req, res) => {
    const { student_id, slot_id, ratings, notes } = req.body;
    if (!student_id || !ratings) return res.status(400).json({ error: 'student_id and ratings are required' });

    const values = RUBRIC_CRITERIA.map(c => Number(ratings[c.key]));
    if (values.some(v => !Number.isFinite(v) || v < 0 || v > 4)) {
        return res.status(400).json({ error: 'Every criterion must be rated 0-4.' });
    }
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const score = Math.round((avg / 4) * EXAM_TOTAL_POINTS * 100) / 100;

    try {
        const connection = await getDbConnection();
        await connection.execute(
            `INSERT INTO interview_rubric_scores (student_id, slot_id, rubric_json, score, notes)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE slot_id = VALUES(slot_id), rubric_json = VALUES(rubric_json),
                score = VALUES(score), notes = VALUES(notes), scored_at = NOW()`,
            [student_id, slot_id || null, JSON.stringify(ratings), score, notes || null]
        );

        // Teacher's rubric score IS the Mock Interview grade -- write
        // straight to responses, unconditionally (not keep-highest like
        // /submit-exam: a rescore after review should always win, not just
        // a higher number). category is deliberately left untouched --
        // ch1_lab_mock_interview is already correctly categorized and this
        // INSERT never includes that column, so ON DUPLICATE KEY UPDATE
        // can't downgrade it.
        await connection.execute(
            'INSERT INTO exams (exam_id, title, total_points) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title = COALESCE(VALUES(title), title), total_points = COALESCE(VALUES(total_points), total_points)',
            [EXAM_ID, EXAM_TITLE, EXAM_TOTAL_POINTS]
        );
        await connection.execute(
            'INSERT INTO responses (student_id, exam_id, score, total_points, timestamp, entered_in_ic) VALUES (?, ?, ?, ?, NOW(), 0) ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW(), entered_in_ic = 0',
            [student_id, EXAM_ID, score, EXAM_TOTAL_POINTS]
        );

        await connection.release();
        res.json({ success: true, score });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save rubric score' }); }
});

module.exports = router;
