// server/routes/appointments.js
// Replaces api/appointments/{book,office-hours,requests,slots,update-status}.php.
// Same pattern as the rest of this pass: no real auth anywhere.
// - office-hours.php's POST and update-status.php's POST both had a
//   client-supplied `teacher_id` that was only checked against the roster
//   if the field was present at all -- omitting it from the request body
//   skipped the check entirely.
// - book.php took `student_id` straight from the request body with no
//   identity check, so any student could book (or spam-book, denying slots
//   to everyone else) appointments as any other student.
// - requests.php's `?role=teacher` returned every student's name, section,
//   and appointment reason -- real personal context, not just a time slot --
//   to anyone who added that query param, no check at all.
const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { requireLogin, requireStaff, requireSelfOrStaff, isStaffSession, isSelfOrStaffSession } = require('../helpers');

router.get('/appointments/slots.php', requireLogin, async (req, res) => {
    const date = String(req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });

    try {
        const connection = await getDbConnection();
        const dow = new Date(date + 'T00:00:00').getDay();
        const [windows] = await connection.execute(
            'SELECT start_time, end_time, slot_duration FROM office_hours WHERE day_of_week = ? ORDER BY start_time ASC',
            [dow]
        );
        if (windows.length === 0) {
            await connection.release();
            return res.json({ slots: [], message: 'No office hours set for this day.' });
        }

        const slotMap = new Map();
        for (const w of windows) {
            const start = new Date(`${date}T${w.start_time}`);
            const end = new Date(`${date}T${w.end_time}`);
            const stepMs = Number(w.slot_duration) * 60000;
            for (let t = start.getTime(); t < end.getTime(); t += stepMs) {
                const d = new Date(t);
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                slotMap.set(`${hh}:${mm}`, Number(w.slot_duration));
            }
        }

        const [bookedRows] = await connection.execute(
            `SELECT TIME_FORMAT(time,'%H:%i') AS t FROM appointments WHERE date = ? AND status != 'denied'`,
            [date]
        );
        const booked = new Set(bookedRows.map(r => r.t));
        await connection.release();

        const times = Array.from(slotMap.keys()).sort();
        res.json({ slots: times.map(time => ({ time, available: !booked.has(time) })) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch slots' }); }
});

router.post('/appointments/book.php', requireSelfOrStaff('student_id'), async (req, res) => {
    const studentId = String(req.body?.student_id || '').trim();
    const date = String(req.body?.date || '').trim();
    const time = String(req.body?.time || '').trim();
    const reason = String(req.body?.reason || '').trim();
    if (!studentId || !date || !time) return res.status(400).json({ error: 'student_id, date, and time are required' });

    try {
        const connection = await getDbConnection();
        const [existing] = await connection.execute('SELECT student_id FROM students WHERE student_id = ? LIMIT 1', [studentId]);
        if (existing.length === 0) {
            await connection.release();
            return res.status(403).json({ error: 'Invalid student' });
        }
        try {
            const [result] = await connection.execute(
                `INSERT INTO appointments (student_id, date, time, reason, status) VALUES (?, ?, ?, ?, 'pending')`,
                [studentId, date, time, reason]
            );
            await connection.release();
            res.json({ success: true, appointment_id: result.insertId });
        } catch (dupErr) {
            await connection.release();
            res.status(409).json({ error: 'That time slot is already booked. Please pick another.' });
        }
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to book appointment' }); }
});

router.get('/appointments/requests.php', async (req, res) => {
    const role = String(req.query.role || 'student');
    const studentId = String(req.query.student_id || '').trim();

    if (role === 'teacher' || role === 'admin') {
        if (!isStaffSession(req)) return res.status(401).json({ error: 'Not authorized.' });
        try {
            const connection = await getDbConnection();
            const [rows] = await connection.execute(`
                SELECT a.id, a.student_id,
                       COALESCE(CONCAT(s.first_name,' ',s.last_name), a.student_id) AS student_name,
                       s.section_id,
                       DATE_FORMAT(a.date,'%Y-%m-%d') AS date,
                       TIME_FORMAT(a.time,'%H:%i')    AS time,
                       a.reason, a.status, a.teacher_note,
                       DATE_FORMAT(a.created_at,'%Y-%m-%d %H:%i') AS created_at
                FROM appointments a
                LEFT JOIN students s ON s.student_id = a.student_id
                ORDER BY a.date ASC, a.time ASC
            `);
            await connection.release();
            res.json({ appointments: rows });
        } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch appointments' }); }
        return;
    }

    if (!studentId) return res.status(400).json({ error: 'student_id required' });
    if (!isSelfOrStaffSession(req, studentId)) return res.status(401).json({ error: 'Not authorized.' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT id, student_id,
                    DATE_FORMAT(date,'%Y-%m-%d') AS date,
                    TIME_FORMAT(time,'%H:%i')    AS time,
                    reason, status, teacher_note,
                    DATE_FORMAT(created_at,'%Y-%m-%d %H:%i') AS created_at
             FROM appointments WHERE student_id = ? ORDER BY date ASC, time ASC`,
            [studentId]
        );
        await connection.release();
        res.json({ appointments: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch appointments' }); }
});

router.post('/appointments/update-status.php', requireStaff, async (req, res) => {
    const id = parseInt(req.body?.id, 10) || 0;
    const status = String(req.body?.status || '').trim();
    const teacherNote = String(req.body?.teacher_note || '').trim();
    if (!id || !['approved', 'denied', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'id and valid status required' });
    }
    try {
        const connection = await getDbConnection();
        const [result] = await connection.execute(
            'UPDATE appointments SET status = ?, teacher_note = ? WHERE id = ?',
            [status, teacherNote, id]
        );
        await connection.release();
        res.json({ success: result.affectedRows > 0 });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update status' }); }
});

router.get('/appointments/office-hours.php', requireLogin, async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT id, day_of_week, start_time, end_time, slot_duration FROM office_hours ORDER BY day_of_week ASC, start_time ASC'
        );
        await connection.release();
        res.json({ hours: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch office hours' }); }
});

router.post('/appointments/office-hours.php', requireStaff, async (req, res) => {
    const hours = Array.isArray(req.body?.hours) ? req.body.hours : [];
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM office_hours');
        for (const h of hours) {
            const dow = parseInt(h.day_of_week, 10) || 0;
            const start = h.start_time || '08:00';
            const end = h.end_time || '09:00';
            const duration = parseInt(h.slot_duration, 10) || 15;
            if (start >= end) continue;
            await connection.execute(
                'INSERT INTO office_hours (day_of_week, start_time, end_time, slot_duration) VALUES (?, ?, ?, ?)',
                [dow, start, end, duration]
            );
        }
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save office hours' }); }
});

module.exports = router;
