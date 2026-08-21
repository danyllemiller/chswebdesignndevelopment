const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

// Standalone tardy-pass tracker -- deliberately not attendance. Logs a
// timestamped entry per tardy so a teacher can hand out passes and see both
// a running log and a per-student count, without touching grading/attendance.

// Dedicated lookup, deliberately not reusing /api/admin/student -- that
// endpoint LEFT JOINs a payroll_roster table that doesn't exist in this
// database, so it 500s on every call regardless of tardy tracking.
router.get('/tardy/lookup', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT student_id, first_name, last_name, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        await connection.release();
        if (rows.length === 0) return res.status(404).json({ error: 'No student found with that ID.' });
        res.json(rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to look up student.' }); }
});

router.post('/tardy/log', async (req, res) => {
    const { student_id, period, reason, date, time } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    // The form always sends the actual claimed arrival date+time (not "now"),
    // defaulted to today/current-time client-side but editable for backdating
    // or entering an earlier arrival. Falls back to NOW() only if either is
    // missing/malformed.
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : null;
    const validTime = /^\d{2}:\d{2}$/.test(time || '') ? time : null;
    const useTimestamp = (validDate && validTime) ? `${validDate} ${validTime}:00` : null;
    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute(
            'SELECT student_id, first_name, last_name, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        if (students.length === 0) {
            await connection.release();
            return res.status(404).json({ error: 'No student found with that ID.' });
        }
        const [result] = await connection.execute(
            useTimestamp
                ? 'INSERT INTO tardy_passes (student_id, period, reason, created_at) VALUES (?, ?, ?, ?)'
                : 'INSERT INTO tardy_passes (student_id, period, reason) VALUES (?, ?, ?)',
            useTimestamp
                ? [student_id, period || students[0].section_id || '', reason || '', useTimestamp]
                : [student_id, period || students[0].section_id || '', reason || '']
        );
        await connection.release();
        res.json({
            success: true,
            entry: {
                id: result.insertId,
                student_id,
                first_name: students[0].first_name,
                last_name: students[0].last_name,
                period: period || students[0].section_id || '',
                reason: reason || ''
            }
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to log tardy.' }); }
});

router.get('/tardy/log', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const params = [];
        let where = '';
        if (student_id) { where = 'WHERE t.student_id = ?'; params.push(student_id); }
        const [rows] = await connection.execute(
            `SELECT t.id, t.student_id, t.period, t.reason, t.created_at,
                    s.first_name, s.last_name
             FROM tardy_passes t
             LEFT JOIN students s ON s.student_id = t.student_id
             ${where}
             ORDER BY t.created_at DESC`,
            params
        );
        await connection.release();
        res.json({ entries: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch tardy log.' }); }
});

router.get('/tardy/summary', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT t.student_id, s.first_name, s.last_name, s.section_id,
                    COUNT(*) AS tardy_count, MAX(t.created_at) AS last_tardy
             FROM tardy_passes t
             LEFT JOIN students s ON s.student_id = t.student_id
             GROUP BY t.student_id, s.first_name, s.last_name, s.section_id
             ORDER BY tardy_count DESC, last_tardy DESC`
        );
        await connection.release();
        res.json({ summary: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch tardy summary.' }); }
});

router.delete('/tardy/log/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM tardy_passes WHERE id = ?', [id]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete entry.' }); }
});

module.exports = router;
