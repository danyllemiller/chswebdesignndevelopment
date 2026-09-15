const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

// Mock Interview sign-up + scoring, Chapter 1 (year1/join-the-developers-guild.html).
// Slots only ever run inside the A1 period (7:35-9:00am), skipping the
// first 20 minutes for attendance/classroom admin -- so the bookable
// window is 7:55am-9:00am. 5-minute interview + a 3-minute buffer for the
// teacher to switch files/students = an 8-minute cadence.
const WINDOW_START_MIN = 7 * 60 + 55; // 7:55am
const WINDOW_END_MIN = 9 * 60;        // 9:00am
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

function buildSlotsForDate() {
    const slots = [];
    for (let start = WINDOW_START_MIN; start + INTERVIEW_MIN <= WINDOW_END_MIN; start += SLOT_CADENCE_MIN) {
        slots.push({ start: minutesToTimeStr(start), end: minutesToTimeStr(start + INTERVIEW_MIN) });
    }
    return slots;
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

router.get('/interview-rubric-criteria', (req, res) => {
    res.json({ criteria: RUBRIC_CRITERIA, examId: EXAM_ID, maxPoints: EXAM_TOTAL_POINTS });
});

// ---- Student-facing sign-up ----

router.get('/interview-slots', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT s.id, s.slot_date, s.start_time, s.end_time, s.student_id,
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

router.post('/interview-slots/claim', async (req, res) => {
    const { student_id, slot_id } = req.body;
    if (!student_id || !slot_id) return res.status(400).json({ error: 'student_id and slot_id are required' });
    try {
        const connection = await getDbConnection();
        // One slot per student -- free any prior claim by this student
        // before taking the new one, so switching slots doesn't leave two
        // reserved under their name.
        await connection.execute(
            'UPDATE interview_slots SET student_id = NULL, claimed_at = NULL WHERE student_id = ?',
            [student_id]
        );
        const [result] = await connection.execute(
            'UPDATE interview_slots SET student_id = ?, claimed_at = NOW() WHERE id = ? AND student_id IS NULL',
            [student_id, slot_id]
        );
        await connection.release();
        if (result.affectedRows === 0) {
            return res.status(409).json({ error: 'That slot was just taken by someone else. Pick another.' });
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to claim slot' }); }
});

router.post('/interview-slots/release', async (req, res) => {
    const { student_id, slot_id } = req.body;
    if (!student_id || !slot_id) return res.status(400).json({ error: 'student_id and slot_id are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'UPDATE interview_slots SET student_id = NULL, claimed_at = NULL WHERE id = ? AND student_id = ?',
            [slot_id, student_id]
        );
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
        const slots = buildSlotsForDate();
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
        await connection.execute('DELETE FROM interview_slots WHERE id = ?', [req.params.id]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete slot' }); }
});

router.get('/admin/interview-slots', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT s.id, s.slot_date, s.start_time, s.end_time, s.student_id,
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
