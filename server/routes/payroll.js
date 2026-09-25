const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { resolveCourseId, getCurrentSchoolYear, isStaffSession, requireSelfOrStaff, timeToMinutes } = require('../helpers');

// WD1/WD2/AS are the paid "job simulation" courses this employee-portal
// payroll UI models; CS clocks in/out too (server/routes/timeclock.js), but
// only for participation points, not pay -- js/student/student-payroll.js's
// CS-detection used to check `section_id.startsWith('CS')`, which can never
// match a real section_id (real values are period codes like A3/A5/B4/B6/B8
// for CS, A1/B2 for WD1/WD2, "AS-B2" for Monique's practicum -- none start
// with the literal string "CS"), so every student, CS included, saw the
// full payroll UI. Resolving through class_sections (same as gradebook
// weighting) instead of pattern-matching the section_id string, and
// checking every section a student is enrolled in (not just their primary),
// is what correctly keeps payroll visible for a CS-primary student who's
// also enrolled in WD.
const PAID_COURSE_IDS = new Set(['05254G1S', '05254G2S', '05254EF-201']); // WD1, WD2, AS

router.get('/payroll/roster', async (req, res) => {
    const { username } = req.query;
    const sessionUser = req.session?.user;
    const isSelf = sessionUser?.username && username && sessionUser.username === username;
    if (!isSelf && !isStaffSession(req)) return res.status(401).json({ error: 'Not authorized.' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT s.*, r.title, r.hourly_rate
             FROM students s
             LEFT JOIN pay_roles r ON s.role_id = r.id
             WHERE s.username = ?`,
            [username]
        );
        if (rows.length === 0) { await connection.release(); return res.json({}); }
        const student = rows[0];

        const [extraRows] = await connection.execute(
            'SELECT section_id FROM student_additional_sections WHERE student_id = ?',
            [student.student_id]
        );
        const allSectionIds = [student.section_id, ...extraRows.map(r => r.section_id)].filter(Boolean);
        let hasPaidRole = false;
        for (const sectionId of allSectionIds) {
            const courseId = await resolveCourseId(connection, sectionId);
            if (PAID_COURSE_IDS.has(courseId)) { hasPaidRole = true; break; }
        }
        student.has_paid_role = hasPaidRole;

        await connection.release();
        res.json(student);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch payroll roster' }); }
});

// h:mm AM/PM for display -- built from timeToMinutes (see helpers.js) so
// this shares the exact same TIME-column handling as the actual payroll run
// (server/routes/paystubs.js), rather than the string-concat parsing this
// endpoint used to leave to the client (`new Date(date + 'T' + clock_in)`),
// which silently produced Invalid Date/NaN once mysql2 started handing back
// TIME columns as Date objects instead of "HH:MM:SS" strings.
function formatTimeOfDay(t) {
    const mins = timeToMinutes(t);
    if (mins === null) return null;
    const h = Math.floor(mins / 60);
    const displayMin = Math.round(mins % 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    let displayHour = h % 12;
    if (displayHour === 0) displayHour = 12;
    return `${displayHour}:${String(displayMin).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d) {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return String(d).split('T')[0];
}

router.get('/payroll/timesheets', requireSelfOrStaff(), async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM timesheets WHERE student_id = ?',
            [student_id]
        );
        await connection.release();

        const timesheets = rows.map(row => {
            const inMin = timeToMinutes(row.clock_in);
            const outMin = timeToMinutes(row.clock_out);
            return {
                ...row,
                // row.date arrives from mysql2 as a real Date object, which
                // JSON.stringifies to a full ISO datetime -- the student
                // payroll page used to re-parse that by appending "T12:00:00"
                // onto it (the same anti-pattern already fixed for
                // duration_minutes below), producing Invalid Date on every
                // row. Normalized to a plain YYYY-MM-DD here so nothing
                // downstream needs to re-derive it.
                date: fmtDate(row.date),
                clock_in_display: formatTimeOfDay(row.clock_in),
                clock_out_display: formatTimeOfDay(row.clock_out),
                duration_minutes: (inMin !== null && outMin !== null) ? Math.round(outMin - inMin) : null
            };
        });
        res.json({ timesheets });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch timesheets' }); }
});

router.get('/admin/payroll/roster', async (req, res) => {
    try {
        const connection = await getDbConnection();
        // Current-year, not-archived only -- matches the scoping payroll
        // runs use (server/routes/paystubs.js computePayrollForPeriod), so
        // the course checklist this feeds on Run Payroll doesn't offer
        // courses/sections that don't actually apply to anyone current.
        const [rows] = await connection.execute(`
            SELECT s.student_id, s.first_name, s.last_name, s.section_id, s.username,
                   COALESCE(pr.title, 'Web Developer') AS pay_role_title,
                   COALESCE(pr.hourly_rate, 35.00)     AS hourly_rate
            FROM students s
            LEFT JOIN pay_roles pr ON s.role_id = pr.id
            WHERE (s.role IS NULL OR LOWER(s.role) NOT IN ('admin', 'teacher'))
              AND (s.section_id IS NULL OR s.section_id != 'Teacher')
              AND (s.archived IS NULL OR s.archived = 0)
              AND s.school_year = ?
              AND s.section_id IN (SELECT DISTINCT period_label FROM bell_schedule)
            ORDER BY s.last_name ASC, s.first_name ASC
        `, [getCurrentSchoolYear()]);
        // Same section_id -> course_id resolution payroll runs use (raw
        // students.course_id is NULL for a lot of legacy enrollments), so
        // the course checklist on the Run Payroll page groups students the
        // same way a run actually will.
        const courseIdBySection = new Map();
        for (const r of rows) {
            const key = r.section_id || '';
            if (!courseIdBySection.has(key)) courseIdBySection.set(key, await resolveCourseId(connection, key));
            r.course_id = courseIdBySection.get(key);
        }
        const courseIds = [...new Set(rows.map(r => r.course_id).filter(Boolean))];
        let courseNames = {};
        if (courseIds.length > 0) {
            const [courseRows] = await connection.execute(
                `SELECT course_id, course_name FROM courses WHERE course_id IN (${courseIds.map(() => '?').join(',')})`,
                courseIds
            );
            courseNames = Object.fromEntries(courseRows.map(c => [c.course_id, c.course_name]));
        }
        rows.forEach(r => { r.course_name = courseNames[r.course_id] || r.course_id || 'Unassigned'; });
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
        res.json({ timesheets: rows.map(r => ({ ...r, date: fmtDate(r.date) })) });
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
        res.json({ timesheets: rows.map(r => ({ ...r, date: fmtDate(r.date) })) });
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
