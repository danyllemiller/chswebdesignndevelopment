const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

router.get('/payroll/roster', async (req, res) => {
    const { username } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT s.*, r.title, r.hourly_rate
             FROM students s
             LEFT JOIN pay_roles r ON s.role_id = r.id
             WHERE s.username = ?`,
            [username]
        );
        await connection.release();
        res.json(rows.length > 0 ? rows[0] : {});
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch payroll roster' }); }
});

router.get('/payroll/timesheets', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM timesheets WHERE student_id = ?',
            [student_id]
        );
        await connection.release();
        res.json({ timesheets: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch timesheets' }); }
});

router.get('/admin/payroll/roster', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT s.student_id, s.first_name, s.last_name, s.section_id, s.username,
                   COALESCE(pr.title, 'Web Developer') AS pay_role_title,
                   COALESCE(pr.hourly_rate, 35.00)     AS hourly_rate
            FROM students s
            LEFT JOIN pay_roles pr ON s.role_id = pr.id
            WHERE (s.role IS NULL OR LOWER(s.role) NOT IN ('admin', 'teacher'))
              AND (s.section_id IS NULL OR s.section_id != 'Teacher')
            ORDER BY s.last_name ASC, s.first_name ASC
        `);
        await connection.release();
        res.json({ roster: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch payroll roster' }); }
});

router.get('/admin/payroll/timesheets-daily', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM timesheets WHERE date = ? ORDER BY student_id',
            [date]
        );
        await connection.release();
        res.json({ timesheets: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch daily timesheets' }); }
});

router.get('/admin/payroll/timesheets-period', async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM timesheets WHERE date >= ? AND date <= ? ORDER BY student_id, date ASC',
            [from, to]
        );
        await connection.release();
        res.json({ timesheets: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch period timesheets' }); }
});

router.post('/admin/update-student-role', async (req, res) => {
    const { student_id, role_id } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'UPDATE students SET role_id = ? WHERE student_id = ?',
            [role_id, student_id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update student role' }); }
});

module.exports = router;
