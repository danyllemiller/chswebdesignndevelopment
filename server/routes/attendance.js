// server/routes/attendance.js
// Scan-based attendance: a USB barcode scanner (keyboard-emulation, same as
// a cafeteria/library station) reads a student ID card and types the
// student_id + Enter into the kiosk page (admin/attendance-scan.html). This
// file turns that scan into present/tardy/absent without the teacher typing
// anything -- the one thing a student still has to do by hand is the tardy
// self-report form (student/tardy-form.html) BEFORE a late scan will count,
// which is what feeds the existing tardy_passes consequence ladder instead
// of a second, disconnected "attendance tardy" that the ladder never sees.
const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { requireStaff, requireLogin, timeToMinutes } = require('../helpers');
const { getDayTypes, getBellScheduleKeyForDate, getLocalDateStr } = require('../tardyLogic');
const { GRACE_MINUTES, ensureAttendanceTables, realPeriod, getEnrolledStudents } = require('../lib/attendanceStore');

// GET /admin/attendance/current-period -- auto-detects which real
// bell-schedule period is in session right now, for the kiosk's header
// (still overridable client-side, e.g. taking attendance for a period that
// just ended because the line was long).
router.get('/admin/attendance/current-period', requireStaff, async (req, res) => {
    try {
        const connection = await getDbConnection();
        const todayStr = getLocalDateStr();
        const dayTypes = await getDayTypes(connection);
        const scheduleKey = getBellScheduleKeyForDate(dayTypes, todayStr);
        if (!scheduleKey) { await connection.release(); return res.json({ date: todayStr, current: null, periods: [] }); }
        const [periods] = await connection.execute(
            `SELECT period_label, start_time, end_time FROM bell_schedule WHERE schedule_type = ? ORDER BY sort_order`,
            [scheduleKey]
        );
        await connection.release();
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const current = periods.find(p => nowMin >= timeToMinutes(p.start_time) - 10 && nowMin <= timeToMinutes(p.end_time));
        res.json({
            date: todayStr, scheduleKey,
            current: current ? current.period_label : null,
            periods: periods.map(p => ({ label: p.period_label, start_time: p.start_time, end_time: p.end_time }))
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to resolve current period.' }); }
});

// GET /admin/attendance/periods -- every real period label that ever
// appears in the bell schedule (not just today's), for a date/period picker
// that needs to work for a day other than today.
router.get('/admin/attendance/periods', requireStaff, async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`SELECT DISTINCT period_label FROM bell_schedule ORDER BY period_label`);
        await connection.release();
        res.json({ periods: rows.map(r => r.period_label) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load periods.' }); }
});

// POST /admin/attendance/scan -- { student_id, section_id }
router.post('/admin/attendance/scan', requireStaff, async (req, res) => {
    const { student_id, section_id } = req.body || {};
    if (!student_id || !section_id) return res.status(400).json({ error: 'student_id and section_id are required' });
    try {
        const connection = await getDbConnection();
        await ensureAttendanceTables(connection);

        const [[student]] = await connection.execute(
            'SELECT student_id, first_name, last_name, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        if (!student) { await connection.release(); return res.status(404).json({ error: 'Unknown ID -- no student found.' }); }

        const [extra] = await connection.execute('SELECT section_id FROM student_additional_sections WHERE student_id = ?', [student_id]);
        const enrolledPeriods = new Set([realPeriod(student.section_id), ...extra.map(r => realPeriod(r.section_id))]);
        if (!enrolledPeriods.has(section_id)) {
            await connection.release();
            return res.status(400).json({ error: `${student.first_name} ${student.last_name} isn't enrolled in ${section_id}.`, student });
        }

        const today = getLocalDateStr();
        const [[existing]] = await connection.execute(
            'SELECT * FROM attendance WHERE student_id = ? AND section_id = ? AND date = ?',
            [student_id, section_id, today]
        );
        if (existing) {
            await connection.release();
            return res.json({ already: true, status: existing.status, student, scanned_at: existing.scanned_at });
        }

        const dayTypes = await getDayTypes(connection);
        const scheduleKey = getBellScheduleKeyForDate(dayTypes, today);
        const [[periodRow]] = scheduleKey
            ? await connection.execute('SELECT start_time FROM bell_schedule WHERE schedule_type = ? AND period_label = ? LIMIT 1', [scheduleKey, section_id])
            : [[null]];

        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
        const startMin = periodRow ? timeToMinutes(periodRow.start_time) : null;
        const withinGrace = startMin === null ? true : nowMin <= startMin + GRACE_MINUTES;

        if (withinGrace) {
            await connection.execute(
                'INSERT INTO attendance (student_id, section_id, date, status, scanned_at) VALUES (?, ?, ?, ?, NOW())',
                [student_id, section_id, today, 'present']
            );
            await connection.release();
            return res.json({ success: true, status: 'present', student });
        }

        const [[pending]] = await connection.execute(
            'SELECT * FROM tardy_form_pending WHERE student_id = ? AND date = ? AND consumed_at IS NULL',
            [student_id, today]
        );
        if (!pending) {
            await connection.release();
            return res.status(409).json({ error: `${student.first_name}, you're late -- please fill out the tardy form first, then scan again.`, needsForm: true, student });
        }

        await connection.execute('UPDATE tardy_form_pending SET consumed_at = NOW() WHERE id = ?', [pending.id]);
        const [passResult] = await connection.execute(
            'INSERT INTO tardy_passes (student_id, period, reason) VALUES (?, ?, ?)',
            [student_id, student.section_id, pending.reason || '']
        );
        await connection.execute(
            'INSERT INTO attendance (student_id, section_id, date, status, scanned_at, tardy_pass_id) VALUES (?, ?, ?, ?, NOW(), ?)',
            [student_id, section_id, today, 'tardy', passResult.insertId]
        );
        await connection.release();
        res.json({ success: true, status: 'tardy', student, reason: pending.reason });
    } catch (err) {
        console.error('[attendance] scan error:', err);
        res.status(500).json({ error: 'Scan failed.' });
    }
});

// POST /admin/attendance/mark-tardy -- { student_id, section_id, reason }.
// Staff-only shortcut for a paper tardy slip (or any case with no online
// tardy-form submission) -- skips the tardy_form_pending lookup entirely,
// since a staff member entering it directly from the kiosk IS the
// accountability check the online form normally provides. Writes the same
// attendance + tardy_passes rows a real "form then scan" tardy would.
router.post('/admin/attendance/mark-tardy', requireStaff, async (req, res) => {
    const { student_id, section_id, reason } = req.body || {};
    if (!student_id || !section_id) return res.status(400).json({ error: 'student_id and section_id are required' });
    try {
        const connection = await getDbConnection();
        await ensureAttendanceTables(connection);

        const [[student]] = await connection.execute(
            'SELECT student_id, first_name, last_name, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        if (!student) { await connection.release(); return res.status(404).json({ error: 'Unknown ID -- no student found.' }); }

        const [extra] = await connection.execute('SELECT section_id FROM student_additional_sections WHERE student_id = ?', [student_id]);
        const enrolledPeriods = new Set([realPeriod(student.section_id), ...extra.map(r => realPeriod(r.section_id))]);
        if (!enrolledPeriods.has(section_id)) {
            await connection.release();
            return res.status(400).json({ error: `${student.first_name} ${student.last_name} isn't enrolled in ${section_id}.`, student });
        }

        const today = getLocalDateStr();
        const [[existing]] = await connection.execute(
            'SELECT * FROM attendance WHERE student_id = ? AND section_id = ? AND date = ?',
            [student_id, section_id, today]
        );
        if (existing) {
            await connection.release();
            return res.json({ already: true, status: existing.status, student, scanned_at: existing.scanned_at });
        }

        const [passResult] = await connection.execute(
            'INSERT INTO tardy_passes (student_id, period, reason) VALUES (?, ?, ?)',
            [student_id, student.section_id, String(reason || '').trim().slice(0, 255)]
        );
        await connection.execute(
            'INSERT INTO attendance (student_id, section_id, date, status, scanned_at, tardy_pass_id) VALUES (?, ?, ?, ?, NOW(), ?)',
            [student_id, section_id, today, 'tardy', passResult.insertId]
        );
        await connection.release();
        res.json({ success: true, status: 'tardy', student, reason: reason || '' });
    } catch (err) {
        console.error('[attendance] mark-tardy error:', err);
        res.status(500).json({ error: 'Failed to mark tardy.' });
    }
});

// POST /admin/attendance/correct -- { student_id, section_id, date, status,
// reason? }. Fixes a wrong status after the fact (e.g. a scan line that
// ran past the 3-minute grace window through no fault of the students
// still in it -- rather than loosening the grace window itself, which
// would make every future scan less accurate). Works whether or not an
// attendance row already exists yet. Entering/leaving "tardy" creates or
// deletes the matching tardy_passes entry so the consequence ladder
// reflects the correction too, and ic_synced resets to 0 since whatever
// was (or wasn't) entered in Infinite Campus for the old status is now
// stale either way.
router.post('/admin/attendance/correct', requireStaff, async (req, res) => {
    const { student_id, section_id, date, status, reason } = req.body || {};
    if (!student_id || !section_id || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !['present', 'tardy', 'absent'].includes(status)) {
        return res.status(400).json({ error: 'student_id, section_id, a valid date, and a valid status are required' });
    }
    try {
        const connection = await getDbConnection();
        await ensureAttendanceTables(connection);

        const [[student]] = await connection.execute('SELECT first_name, last_name, section_id FROM students WHERE student_id = ?', [student_id]);
        if (!student) { await connection.release(); return res.status(404).json({ error: 'Unknown student.' }); }

        const [[existing]] = await connection.execute(
            'SELECT * FROM attendance WHERE student_id = ? AND section_id = ? AND date = ?',
            [student_id, section_id, date]
        );
        if (existing && existing.status === status) {
            await connection.release();
            return res.json({ success: true, unchanged: true });
        }

        let tardyPassId = existing ? existing.tardy_pass_id : null;

        if (existing && existing.status === 'tardy' && status !== 'tardy' && tardyPassId) {
            await connection.execute('DELETE FROM tardy_passes WHERE id = ?', [tardyPassId]);
            tardyPassId = null;
        }
        if (status === 'tardy' && (!existing || existing.status !== 'tardy')) {
            const [passResult] = await connection.execute(
                'INSERT INTO tardy_passes (student_id, period, reason) VALUES (?, ?, ?)',
                [student_id, student.section_id, String(reason || 'Corrected by staff').trim().slice(0, 255)]
            );
            tardyPassId = passResult.insertId;
        }

        await connection.execute(
            `INSERT INTO attendance (student_id, section_id, date, status, tardy_pass_id, ic_synced)
             VALUES (?, ?, ?, ?, ?, 0)
             ON DUPLICATE KEY UPDATE status = VALUES(status), tardy_pass_id = VALUES(tardy_pass_id), ic_synced = 0`,
            [student_id, section_id, date, status, tardyPassId]
        );

        await connection.release();
        res.json({ success: true, status });
    } catch (err) {
        console.error('[attendance] correct error:', err);
        res.status(500).json({ error: 'Failed to correct attendance.' });
    }
});

// GET /admin/attendance/ic-pending -- every tardy/absent row not yet
// flagged as re-entered in Infinite Campus. Nothing here talks to IC
// itself (no API access to it exists) -- this just tracks what still
// needs the teacher to go do that by hand.
router.get('/admin/attendance/ic-pending', requireStaff, async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureAttendanceTables(connection);
        const [rows] = await connection.execute(
            `SELECT a.id, a.student_id, a.section_id, a.date, a.status, a.scanned_at, s.first_name, s.last_name
             FROM attendance a
             JOIN students s ON s.student_id = a.student_id
             WHERE a.status IN ('tardy', 'absent') AND (a.ic_synced IS NULL OR a.ic_synced = 0)
             ORDER BY a.date DESC, s.last_name ASC`
        );
        await connection.release();
        res.json({ count: rows.length, rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load IC-pending attendance.' }); }
});

// POST /admin/attendance/ic-sync -- { ids: [...] } or { all: true }
router.post('/admin/attendance/ic-sync', requireStaff, async (req, res) => {
    const { ids, all } = req.body || {};
    try {
        const connection = await getDbConnection();
        await ensureAttendanceTables(connection);
        if (all) {
            await connection.execute(`UPDATE attendance SET ic_synced = 1 WHERE status IN ('tardy', 'absent') AND (ic_synced IS NULL OR ic_synced = 0)`);
        } else if (Array.isArray(ids) && ids.length > 0) {
            await connection.execute(
                `UPDATE attendance SET ic_synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
                ids
            );
        } else {
            await connection.release();
            return res.status(400).json({ error: 'ids or all is required' });
        }
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update IC-sync status.' }); }
});

// POST /student/tardy-form/submit -- { reason }. student_id always comes
// from the session, never the request body, so a student can only ever
// file this for themselves.
router.post('/student/tardy-form/submit', requireLogin, async (req, res) => {
    const studentId = req.session.user?.student_id;
    if (!studentId) return res.status(400).json({ error: 'No student account on this session.' });
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    try {
        const connection = await getDbConnection();
        await ensureAttendanceTables(connection);
        const today = getLocalDateStr();
        await connection.execute(
            `INSERT INTO tardy_form_pending (student_id, date, reason) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE reason = VALUES(reason), submitted_at = NOW(), consumed_at = NULL`,
            [studentId, today, reason]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error('[attendance] tardy form error:', err);
        res.status(500).json({ error: 'Failed to submit tardy form.' });
    }
});

// GET /admin/attendance/summary?section_id=X&date=Y -- the full roster for
// that real period with each student's attendance status, so taking
// attendance by scanning still leaves something to actually look at.
router.get('/admin/attendance/summary', requireStaff, async (req, res) => {
    const { section_id } = req.query;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : getLocalDateStr();
    if (!section_id) return res.status(400).json({ error: 'section_id is required' });
    try {
        const connection = await getDbConnection();
        await ensureAttendanceTables(connection);
        const roster = await getEnrolledStudents(connection, section_id);
        const [attendanceRows] = await connection.execute(
            'SELECT * FROM attendance WHERE section_id = ? AND date = ?',
            [section_id, date]
        );
        await connection.release();
        const byStudent = {};
        attendanceRows.forEach(r => { byStudent[r.student_id] = r; });
        const rows = roster
            .map(s => ({
                student_id: s.student_id, first_name: s.first_name, last_name: s.last_name, section_id: s.section_id,
                status: byStudent[s.student_id]?.status || null,
                scanned_at: byStudent[s.student_id]?.scanned_at || null
            }))
            .sort((a, b) => a.last_name.localeCompare(b.last_name));
        res.json({ date, section_id, rows });
    } catch (err) {
        console.error('[attendance] summary error:', err);
        res.status(500).json({ error: 'Failed to load attendance summary.' });
    }
});

module.exports = router;
