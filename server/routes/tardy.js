const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { getCurrentSchoolYear } = require('../helpers');
const { getTardyStep, computeEffectiveCount, getLocalDateStr } = require('../tardyLogic');

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
        if (rows.length === 0) {
            await connection.release();
            return res.status(404).json({ error: 'No student found with that ID.' });
        }
        // A student in more than one of the teacher's periods (dual-enrolled
        // via student_additional_sections) needs to pick which one the
        // tardy actually happened in, rather than always defaulting to
        // their primary section.
        const [extra] = await connection.execute(
            'SELECT section_id FROM student_additional_sections WHERE student_id = ?',
            [student_id]
        );
        await connection.release();
        const periods = [rows[0].section_id, ...extra.map(r => r.section_id)].filter(Boolean);
        res.json({ ...rows[0], periods: [...new Set(periods)] });
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
    const currentYear = getCurrentSchoolYear();
    try {
        const connection = await getDbConnection();
        const params = [];
        let where = '';
        if (student_id) { where = 'WHERE t.student_id = ?'; params.push(student_id); }
        // Excludes archived/prior-year students -- that's also how
        // test/dummy accounts (teststudent, testcsstudent, etc.) are flagged
        // in this DB, so this keeps them out of the log and the per-student
        // lookup alike.
        params.push(currentYear);
        const [rows] = await connection.execute(
            `SELECT t.id, t.student_id, t.period, t.reason, t.created_at,
                    s.first_name, s.last_name, s.section_id
             FROM tardy_passes t
             LEFT JOIN students s ON s.student_id = t.student_id
             ${where ? where + ' AND' : 'WHERE'} (s.archived IS NULL OR s.archived = 0) AND s.school_year = ?
             ORDER BY t.created_at DESC`,
            params
        );

        let effective = null;
        if (student_id && rows.length > 0) {
            const period = rows[0].period || rows[0].section_id || '';
            const tardyDates = rows.map(r => getLocalDateStr(new Date(r.created_at)));
            effective = await computeEffectiveCount(connection, period, tardyDates);
        }

        await connection.release();
        res.json({ entries: rows, effective });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch tardy log.' }); }
});

// One row per student: raw lifetime count (for the log's display badge) and
// the effective count (quarter-scoped, decayed per computeEffectiveCount) --
// the effective count is what should drive any consequence-ladder decision,
// the raw count is just "how many tardies are on file, ever."
router.get('/tardy/summary', async (req, res) => {
    const currentYear = getCurrentSchoolYear();
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT t.student_id, t.period, t.created_at, s.first_name, s.last_name, s.section_id
             FROM tardy_passes t
             LEFT JOIN students s ON s.student_id = t.student_id
             WHERE (s.archived IS NULL OR s.archived = 0) AND s.school_year = ?
             ORDER BY t.created_at ASC`,
            [currentYear]
        );

        const byStudent = new Map();
        rows.forEach(r => {
            if (!byStudent.has(r.student_id)) {
                byStudent.set(r.student_id, {
                    student_id: r.student_id, first_name: r.first_name, last_name: r.last_name,
                    section_id: r.section_id, period: r.period || r.section_id || '', dates: []
                });
            }
            byStudent.get(r.student_id).dates.push(getLocalDateStr(new Date(r.created_at)));
        });

        const summary = [];
        for (const s of byStudent.values()) {
            const effective = await computeEffectiveCount(connection, s.period, s.dates);
            summary.push({
                student_id: s.student_id, first_name: s.first_name, last_name: s.last_name, section_id: s.section_id,
                tardy_count: effective.rawCount, effective_count: effective.effectiveCount, last_tardy: effective.lastTardyDate
            });
        }
        summary.sort((a, b) => b.effective_count - a.effective_count || new Date(b.last_tardy) - new Date(a.last_tardy));

        await connection.release();
        res.json({ summary });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch tardy summary.' }); }
});

router.put('/tardy/log/:id', async (req, res) => {
    const { id } = req.params;
    const { period, reason, date, time } = req.body;
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : null;
    const validTime = /^\d{2}:\d{2}$/.test(time || '') ? time : null;
    if (!validDate || !validTime) return res.status(400).json({ error: 'A valid date and time are required.' });
    try {
        const connection = await getDbConnection();
        const [result] = await connection.execute(
            'UPDATE tardy_passes SET period = ?, reason = ?, created_at = ? WHERE id = ?',
            [period || '', reason || '', `${validDate} ${validTime}:00`, id]
        );
        await connection.release();
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Entry not found.' });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update entry.' }); }
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

// ==============================================================================
// FOLLOW-UPS: who currently needs a consequence conversation, per the tardy
// ladder, based on their EFFECTIVE (decayed, quarter-scoped) count. Moved
// here from server/routes/daily-activity.js so all tardy-related admin work
// lives on one page (admin/tools/tardy-tracker.html) instead of being split
// across Daily Activity and a separate Tardy Tracker page.
// ==============================================================================

async function ensureFollowupTables(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS tardy_followup_resolutions (
            student_id VARCHAR(50) PRIMARY KEY,
            resolved_through_count INT NOT NULL,
            resolution_type ENUM('letter','minor_flag','consequence_done') NOT NULL,
            resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    // Older deployments created this table before 'consequence_done' existed
    // -- widen the ENUM in place rather than assuming a fresh install.
    try {
        await connection.execute(`ALTER TABLE tardy_followup_resolutions MODIFY resolution_type ENUM('letter','minor_flag','consequence_done') NOT NULL`);
    } catch (e) { /* already current, or a permissions issue -- non-fatal either way */ }
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS staff_contacts (
            id INT PRIMARY KEY DEFAULT 1,
            counselor_name VARCHAR(150),
            counselor_email VARCHAR(150)
        )
    `);
}

router.get('/tardy/followups', async (req, res) => {
    const currentYear = getCurrentSchoolYear();
    try {
        const connection = await getDbConnection();
        await ensureFollowupTables(connection);
        const [tardyRows] = await connection.execute(
            `SELECT tp.student_id, tp.period, tp.created_at, s.first_name, s.last_name, s.section_id
             FROM tardy_passes tp
             JOIN students s ON s.student_id = tp.student_id
             WHERE (s.archived IS NULL OR s.archived = 0) AND s.school_year = ?
             ORDER BY tp.created_at ASC`,
            [currentYear]
        );
        const [resolutionRows] = await connection.execute(
            `SELECT student_id, resolved_through_count FROM tardy_followup_resolutions`
        );
        const resolvedThrough = new Map(resolutionRows.map(r => [r.student_id, r.resolved_through_count]));

        const byStudent = new Map();
        tardyRows.forEach(r => {
            if (!byStudent.has(r.student_id)) {
                byStudent.set(r.student_id, {
                    student_id: r.student_id, first_name: r.first_name, last_name: r.last_name,
                    period: r.period || r.section_id || '', dates: []
                });
            }
            byStudent.get(r.student_id).dates.push(getLocalDateStr(new Date(r.created_at)));
        });

        const followups = [];
        for (const s of byStudent.values()) {
            const { effectiveCount } = await computeEffectiveCount(connection, s.period, s.dates);
            if (effectiveCount > 1 && effectiveCount > (resolvedThrough.get(s.student_id) || 1)) {
                followups.push({
                    student_id: s.student_id, first_name: s.first_name, last_name: s.last_name,
                    count: effectiveCount, step: getTardyStep(effectiveCount)
                });
            }
        }
        followups.sort((a, b) => b.count - a.count);

        await connection.release();
        res.json({ followups });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to build tardy follow-up list.' }); }
});

// Marks a student's tardy follow-up as handled -- a letter sent, judged not
// worth one ("minor"), or (new) just a plain checkbox confirming whatever
// consequence the ladder called for at this count was actually carried out
// -- up through their CURRENT effective count. They drop off the list until
// the count moves past this again.
router.post('/tardy/followup-resolve', async (req, res) => {
    const { student_id, count, resolution_type } = req.body;
    if (!student_id || !count || !['letter', 'minor_flag', 'consequence_done'].includes(resolution_type)) {
        return res.status(400).json({ error: 'student_id, count, and a valid resolution_type are required' });
    }
    try {
        const connection = await getDbConnection();
        await ensureFollowupTables(connection);
        await connection.execute(
            `INSERT INTO tardy_followup_resolutions (student_id, resolved_through_count, resolution_type)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE resolved_through_count = VALUES(resolved_through_count), resolution_type = VALUES(resolution_type), resolved_at = NOW()`,
            [student_id, count, resolution_type]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save resolution' }); }
});

router.get('/tardy/staff-contacts', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureFollowupTables(connection);
        const [rows] = await connection.execute('SELECT counselor_name, counselor_email FROM staff_contacts WHERE id = 1');
        await connection.release();
        res.json(rows[0] || { counselor_name: '', counselor_email: '' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch staff contacts.' }); }
});

router.post('/tardy/staff-contacts', async (req, res) => {
    const { counselor_name, counselor_email } = req.body;
    try {
        const connection = await getDbConnection();
        await ensureFollowupTables(connection);
        await connection.execute(
            `INSERT INTO staff_contacts (id, counselor_name, counselor_email) VALUES (1, ?, ?)
             ON DUPLICATE KEY UPDATE counselor_name = VALUES(counselor_name), counselor_email = VALUES(counselor_email)`,
            [counselor_name || '', counselor_email || '']
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save staff contacts.' }); }
});

module.exports = router;
