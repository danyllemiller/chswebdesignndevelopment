const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { ensureOffDaysTable, requireLogin, requireStaff } = require('../helpers');

const CALENDAR_EVENTS_DDL = `CREATE TABLE IF NOT EXISTS calendar_events (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    event_date    DATE         NOT NULL,
    title         VARCHAR(255) NOT NULL,
    type          VARCHAR(20)  NOT NULL DEFAULT 'none',
    description   TEXT,
    all_day       TINYINT(1)   NOT NULL DEFAULT 1,
    start_time    TIME                  DEFAULT NULL,
    end_time      TIME                  DEFAULT NULL,
    source        VARCHAR(20)  NOT NULL DEFAULT 'manual',
    course_bucket VARCHAR(10)           DEFAULT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
async function ensureCalendarEventsTable(connection) {
    await connection.execute(CALENDAR_EVENTS_DDL);
}

// School off-days -- holidays, teacher workdays, anything students aren't
// in class -- used to gate test-taking to real school hours (see
// isTestingWindowOpen in helpers.js). No real school-calendar data source
// exists in the app, so this is a small manually-maintained list.
router.get('/admin/off-days', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureOffDaysTable(connection);
        const [rows] = await connection.execute('SELECT off_date, label FROM school_off_days ORDER BY off_date');
        await connection.release();
        res.json({ offDays: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch off days' }); }
});

router.post('/admin/off-days', async (req, res) => {
    const { off_date, label } = req.body;
    if (!off_date || !/^\d{4}-\d{2}-\d{2}$/.test(off_date)) {
        return res.status(400).json({ error: 'A valid off_date (YYYY-MM-DD) is required' });
    }
    try {
        const connection = await getDbConnection();
        await ensureOffDaysTable(connection);
        await connection.execute(
            'INSERT INTO school_off_days (off_date, label) VALUES (?, ?) ON DUPLICATE KEY UPDATE label = VALUES(label)',
            [off_date, label || null]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save off day' }); }
});

router.delete('/admin/off-days/:date', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureOffDaysTable(connection);
        await connection.execute('DELETE FROM school_off_days WHERE off_date = ?', [req.params.date]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete off day' }); }
});

const CHECKLIST_DDL = `CREATE TABLE IF NOT EXISTS teacher_checklist_state (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id VARCHAR(50) NOT NULL,
    cadence    ENUM('daily','weekly','biweekly','monthly','quarterly','semester') NOT NULL,
    item_key   VARCHAR(100) NOT NULL,
    period_key VARCHAR(30) NOT NULL,
    completed  TINYINT(1) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_state (teacher_id, cadence, item_key, period_key)
)`;

const CHECKLIST_ITEMS = {
    daily: [
        { key: 'd1', text: 'Take/submit attendance in Infinite Campus for every section, all 4 preps.' },
        { key: 'd2', text: "Scan the site's admin gradebook for overnight exam/quiz/notebook submissions that need a human look." },
        { key: 'd3', text: "Confirm today's agenda/warm-up is live and correct on the Google Slides Agenda for each prep." },
        { key: 'd4', text: 'Check ParentSquare and email for messages needing a same-day reply.' },
        { key: 'd5', text: 'Quick check of the student clock-in/timesheet log if running the classroom job simulation that day.' },
        { key: 'd6', text: 'End of day: spot-check that grade entries saved correctly on the site.' },
    ],
    weekly: [
        { key: 'w1', text: 'Pull scores from the course site and post/reconcile them in Infinite Campus.' },
        { key: 'w2', text: 'Export the gradebook to CSV as a weekly backup, and use it to spot students below grade threshold in each of the 4 preps; send those students/parents a ParentSquare or email note.' },
        { key: 'w3', text: "Skim self_assessments and notebook entries for the week's chapters — are students actually reflecting, or just clicking through?" },
        { key: 'w4', text: "Update next week's due dates in the admin due-dates page, across all 4 preps." },
        { key: 'w5', text: "Prep next week's warm-ups/bell-ringers per prep if not already templated out." },
    ],
    biweekly: [
        { key: 'bw1', text: 'Pull a missing-work list per section from the site; message students/parents.' },
        { key: 'bw2', text: 'Reconcile timesheets for students in the payroll/clock-in simulation.' },
    ],
    monthly: [
        { key: 'm1', text: "Reconcile the site's student roster against Infinite Campus (adds, drops, schedule changes)." },
        { key: 'm2', text: 'Review exam/quiz question banks for reported errors (mis-keyed answers, confusing wording).' },
        { key: 'm3', text: 'Check Workplace Readiness Skills Assessment progress for completer-track seniors.' },
        { key: 'm4', text: 'Flag completer-track students whose GPA has dropped below 3.0 in program courses.' },
        { key: 'm5', text: "Skim the site's api/error_log for recurring backend failures." },
        { key: 'm6', text: 'Review office-hours/appointment bookings — any pattern worth adjusting?' },
        { key: 'm7', text: 'Reconcile pay_roles/timesheets if the classroom payroll simulation feeds any real rewards/grades.' },
    ],
    quarterly: [
        { key: 'q1', text: "Verify quarter grades in Infinite Campus match the site's gradebook for all 4 preps before the deadline." },
        { key: 'q2', text: 'Run End-of-Program-Assessment checkpoints for completer-track students.' },
        { key: 'q3', text: 'Update proficiency scales for chapters taught this quarter.' },
        { key: 'q4', text: 'Archive/export a snapshot of grades, responses, and notebook entries for records.' },
        { key: 'q5', text: 'Revisit open TODO items on the site (grading logic fixes, cleanup) before they pile up.' },
        { key: 'q6', text: 'Re-run the completer-status check (3.0 GPA + assessments passed) and notify newly eligible students.' },
    ],
    semester: [
        { key: 's1', text: 'Finalize and submit semester grades to Infinite Campus; reconcile any gaps from the manual sync workaround.' },
        { key: 's2', text: "Compare actual pacing against scope & sequence / year-at-a-glance plan for each prep; adjust next semester's plan." },
        { key: 's3', text: 'Archive the full semester of clock-in/timesheet/payroll data.' },
        { key: 's4', text: 'Run the full completer audit for graduating seniors: cord, seal, industry credential, college credit eligibility.' },
        { key: 's5', text: 'Roll over class sections and rosters for the new semester; reset due-dates templates.' },
        { key: 's6', text: "Site maintenance pass: fix long-standing broken routes before they block next semester's workflow." },
    ],
};

function getAutoPeriodKey(cadence) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    if (cadence === 'daily')    return `${y}-${m}-${String(d.getDate()).padStart(2, '0')}`;
    if (cadence === 'monthly')  return `${y}-${m}`;
    if (cadence === 'biweekly') return `${y}-${m}-${d.getDate() < 15 ? '01' : '15'}`;
    if (cadence === 'weekly') {
        const thu = new Date(d);
        thu.setDate(d.getDate() + (4 - (d.getDay() || 7)));
        const yearStart = new Date(thu.getFullYear(), 0, 1);
        const wk = Math.ceil(((thu - yearStart) / 86400000 + 1) / 7);
        return `${thu.getFullYear()}-W${String(wk).padStart(2, '0')}`;
    }
    return `${y}-${m}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- CALENDAR SETTINGS ---
router.get('/admin/calendar-settings', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT config_json FROM calendar_settings WHERE id = 1');
        await connection.release();
        if (rows.length > 0) return res.json(rows[0].config_json);
        res.status(404).json({ error: 'Configuration not found' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch calendar settings' }); }
});

router.post('/admin/calendar-settings', async (req, res) => {
    const config = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO calendar_settings (id, config_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)',
            [JSON.stringify(config)]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save calendar settings' }); }
});

// --- BELL SCHEDULE ---
router.get('/bell-schedule', requireLogin, async (req, res) => {
    const type = String(req.query.type || '').trim();
    try {
        const connection = await getDbConnection();
        let rows;
        if (type) {
            [rows] = await connection.execute(
                `SELECT id, schedule_type, period_label, sort_order,
                        TIME_FORMAT(start_time,'%H:%i') AS start_time,
                        TIME_FORMAT(end_time,'%H:%i')   AS end_time,
                        section_id, course_name
                 FROM bell_schedule WHERE schedule_type = ?
                 ORDER BY sort_order ASC, start_time ASC`,
                [type]
            );
        } else {
            [rows] = await connection.execute(
                `SELECT id, schedule_type, period_label, sort_order,
                        TIME_FORMAT(start_time,'%H:%i') AS start_time,
                        TIME_FORMAT(end_time,'%H:%i')   AS end_time,
                        section_id, course_name
                 FROM bell_schedule
                 ORDER BY schedule_type ASC, sort_order ASC, start_time ASC`
            );
        }
        await connection.release();
        res.json({ schedule: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch bell schedule' }); }
});

// --- TEACHER CHECKLIST ---
router.get('/admin/checklist', async (req, res) => {
    const { teacher_id, cadence, period_key } = req.query;
    if (!teacher_id || !cadence) return res.status(400).json({ error: 'teacher_id and cadence are required' });
    if (!CHECKLIST_ITEMS[cadence]) return res.status(400).json({ error: `Unknown cadence: ${cadence}` });
    const pKey = period_key || getAutoPeriodKey(cadence);
    const items = CHECKLIST_ITEMS[cadence];
    try {
        const connection = await getDbConnection();
        await connection.execute(CHECKLIST_DDL);
        const [rows] = await connection.execute(
            'SELECT item_key, completed FROM teacher_checklist_state WHERE teacher_id = ? AND cadence = ? AND period_key = ?',
            [teacher_id, cadence, pKey]
        );
        const stateMap = {};
        rows.forEach(r => { stateMap[r.item_key] = !!r.completed; });
        await connection.release();
        res.json({
            cadence, period_key: pKey,
            items: items.map(item => ({ key: item.key, text: item.text, completed: stateMap[item.key] || false }))
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch checklist' }); }
});

router.post('/admin/checklist/toggle', async (req, res) => {
    const { teacher_id, cadence, item_key, period_key, completed } = req.body;
    if (!teacher_id || !cadence || !item_key || !period_key)
        return res.status(400).json({ error: 'teacher_id, cadence, item_key, and period_key are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(CHECKLIST_DDL);
        await connection.execute(
            `INSERT INTO teacher_checklist_state (teacher_id, cadence, item_key, period_key, completed)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE completed = VALUES(completed), updated_at = CURRENT_TIMESTAMP`,
            [teacher_id, cadence, item_key, period_key, completed ? 1 : 0]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to toggle checklist item' }); }
});

router.post('/admin/checklist/reset', async (req, res) => {
    const { teacher_id, cadence, period_key } = req.body;
    if (!teacher_id || !cadence || !period_key)
        return res.status(400).json({ error: 'teacher_id, cadence, and period_key are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(CHECKLIST_DDL);
        await connection.execute(
            'UPDATE teacher_checklist_state SET completed = 0 WHERE teacher_id = ? AND cadence = ? AND period_key = ?',
            [teacher_id, cadence, period_key]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to reset checklist' }); }
});

// --- LEGACY PHP CALENDAR ENDPOINTS (bell-schedule.php, events.php,
// school-config.php, dedupe-calendar.php) --------------------------------
// These four .php files had NO server-side auth at all -- bell-schedule.php's
// POST had a client-supplied `teacher_id` check that was silently skipped
// whenever the field was just omitted from the request, and events.php's
// POST/PUT/DELETE had no check whatsoever, meaning anyone who found the URL
// could wipe/rewrite the whole school calendar or bell schedule. Reusing
// the exact same URL (including the .php suffix every existing front-end
// caller already uses) and response shape here, then deleting the real .php
// file, so there's no ambiguity about which implementation actually serves
// the request regardless of how the front-facing web server routes .php.

router.get('/bell-schedule.php', requireLogin, async (req, res) => {
    const type = String(req.query.type || '').trim();
    try {
        const connection = await getDbConnection();
        let rows;
        if (type) {
            [rows] = await connection.execute(
                `SELECT id, schedule_type, period_label, sort_order,
                        TIME_FORMAT(start_time,'%H:%i') AS start_time,
                        TIME_FORMAT(end_time,'%H:%i')   AS end_time,
                        section_id, course_name
                 FROM bell_schedule WHERE schedule_type = ?
                 ORDER BY sort_order ASC, start_time ASC`,
                [type]
            );
        } else {
            [rows] = await connection.execute(
                `SELECT id, schedule_type, period_label, sort_order,
                        TIME_FORMAT(start_time,'%H:%i') AS start_time,
                        TIME_FORMAT(end_time,'%H:%i')   AS end_time,
                        section_id, course_name
                 FROM bell_schedule
                 ORDER BY schedule_type ASC, sort_order ASC, start_time ASC`
            );
        }
        await connection.release();
        res.json({ schedule: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch bell schedule' }); }
});

router.post('/bell-schedule.php', requireStaff, async (req, res) => {
    const { schedule_type: type, periods } = req.body || {};
    const saveAll = !!(req.body && req.body.all);
    const schedTypes = Array.isArray(req.body?.schedule_types)
        ? req.body.schedule_types.map(t => String(t).trim()).filter(Boolean)
        : [];

    try {
        const connection = await getDbConnection();

        if (saveAll) {
            await connection.execute('DELETE FROM bell_schedule');
        } else if (schedTypes.length > 0) {
            const placeholders = schedTypes.map(() => '?').join(',');
            await connection.execute(`DELETE FROM bell_schedule WHERE schedule_type IN (${placeholders})`, schedTypes);
        } else if (type) {
            await connection.execute('DELETE FROM bell_schedule WHERE schedule_type = ?', [String(type).trim()]);
        } else {
            await connection.release();
            return res.status(400).json({ error: 'schedule_types array or schedule_type required' });
        }

        if (Array.isArray(periods) && periods.length > 0) {
            for (let i = 0; i < periods.length; i++) {
                const p = periods[i];
                const label = String(p.period_label || '').trim();
                const start = p.start_time || '08:00';
                const end = p.end_time || '09:00';
                if (!label || start >= end) continue;
                const section = String(p.section_id || '').trim() || null;
                const course = String(p.course_name || '').trim() || null;
                const rowType = String(p.schedule_type || '').trim() || String(type || '').trim();
                await connection.execute(
                    `INSERT INTO bell_schedule (schedule_type, period_label, sort_order, start_time, end_time, section_id, course_name)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [rowType, label, i, start, end, section, course]
                );
            }
        }

        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save bell schedule' }); }
});

router.get('/events.php', requireLogin, async (req, res) => {
    const bucket = String(req.query.bucket || '').trim();
    try {
        const connection = await getDbConnection();
        await ensureCalendarEventsTable(connection);
        let rows;
        if (bucket) {
            [rows] = await connection.execute(
                `SELECT id, DATE_FORMAT(event_date,'%Y-%m-%d') AS event_date,
                        title, type, description, all_day, source,
                        TIME_FORMAT(start_time,'%H:%i') AS start_time,
                        TIME_FORMAT(end_time,'%H:%i')   AS end_time
                 FROM calendar_events
                 WHERE course_bucket IS NULL OR course_bucket = ?
                 ORDER BY event_date ASC`,
                [bucket]
            );
        } else {
            [rows] = await connection.execute(
                `SELECT id, DATE_FORMAT(event_date,'%Y-%m-%d') AS event_date,
                        title, type, description, all_day, source,
                        TIME_FORMAT(start_time,'%H:%i') AS start_time,
                        TIME_FORMAT(end_time,'%H:%i')   AS end_time
                 FROM calendar_events ORDER BY event_date ASC`
            );
        }
        await connection.release();
        res.json({ events: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch events' }); }
});

router.post('/events.php', requireStaff, async (req, res) => {
    const { event_date, title, type, description } = req.body || {};
    const date = String(event_date || '').trim();
    const evtTitle = String(title || '').trim();
    const evtType = String(type || 'none').trim();
    const desc = String(description || '').trim();
    const allDay = req.body?.all_day ? 1 : 0;
    const start = allDay ? null : (String(req.body?.start_time || '').trim() || null);
    const end = allDay ? null : (String(req.body?.end_time || '').trim() || null);

    if (!date || !evtTitle) return res.status(400).json({ error: 'event_date and title are required' });

    try {
        const connection = await getDbConnection();
        await ensureCalendarEventsTable(connection);
        const [result] = await connection.execute(
            `INSERT INTO calendar_events (event_date, title, type, description, all_day, start_time, end_time)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [date, evtTitle, evtType, desc, allDay, start, end]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to add event' }); }
});

router.put('/events.php', requireStaff, async (req, res) => {
    const id = parseInt(req.body?.id, 10) || 0;
    const date = String(req.body?.event_date || '').trim();
    const evtTitle = String(req.body?.title || '').trim();
    const evtType = String(req.body?.type || 'none').trim();
    const desc = String(req.body?.description || '').trim();
    const allDay = req.body?.all_day ? 1 : 0;
    const start = allDay ? null : (String(req.body?.start_time || '').trim() || null);
    const end = allDay ? null : (String(req.body?.end_time || '').trim() || null);

    if (!id || !date || !evtTitle) return res.status(400).json({ error: 'id, event_date and title are required' });

    try {
        const connection = await getDbConnection();
        await ensureCalendarEventsTable(connection);
        await connection.execute(
            `UPDATE calendar_events SET event_date=?, title=?, type=?, description=?, all_day=?, start_time=?, end_time=? WHERE id=?`,
            [date, evtTitle, evtType, desc, allDay, start, end, id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update event' }); }
});

router.delete('/events.php', requireStaff, async (req, res) => {
    const id = parseInt(req.query.id, 10) || 0;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
        const connection = await getDbConnection();
        await ensureCalendarEventsTable(connection);
        await connection.execute('DELETE FROM calendar_events WHERE id = ?', [id]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete event' }); }
});

router.post('/dedupe-calendar.php', requireStaff, async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureCalendarEventsTable(connection);
        const [result] = await connection.execute(`
            DELETE t1 FROM calendar_events t1
            INNER JOIN calendar_events t2
              ON t1.event_date = t2.event_date
              AND t1.title = t2.title
              AND t1.type = t2.type
              AND COALESCE(t1.description,'') = COALESCE(t2.description,'')
              AND t1.source = t2.source
              AND COALESCE(t1.course_bucket,'') = COALESCE(t2.course_bucket,'')
              AND t1.all_day = t2.all_day
              AND COALESCE(t1.start_time,'') = COALESCE(t2.start_time,'')
              AND COALESCE(t1.end_time,'') = COALESCE(t2.end_time,'')
              AND t1.id > t2.id
        `);
        await connection.release();
        res.json({ success: true, deleted: result.affectedRows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Dedupe failed: ' + err.message }); }
});

const SCHOOL_CONFIG_DDL = `CREATE TABLE IF NOT EXISTS school_config (
    config_key   VARCHAR(50) NOT NULL PRIMARY KEY,
    config_value VARCHAR(20) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
const SCHOOL_CONFIG_KEYS = ['regular_start', 'regular_end', 'summer_start', 'summer_end'];

router.get('/school-config.php', requireLogin, async (req, res) => {
    try {
        const connection = await getDbConnection();
        await connection.execute(SCHOOL_CONFIG_DDL);
        const [rows] = await connection.execute('SELECT config_key, config_value FROM school_config');
        await connection.release();
        const config = {};
        rows.forEach(r => { config[r.config_key] = r.config_value; });
        const out = {};
        SCHOOL_CONFIG_KEYS.forEach(k => { out[k] = config[k] || ''; });
        res.json(out);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch school config' }); }
});

router.post('/school-config.php', requireStaff, async (req, res) => {
    try {
        const connection = await getDbConnection();
        await connection.execute(SCHOOL_CONFIG_DDL);
        for (const key of SCHOOL_CONFIG_KEYS) {
            if (!Object.prototype.hasOwnProperty.call(req.body || {}, key)) continue;
            const val = String(req.body[key] || '').trim();
            await connection.execute(
                `INSERT INTO school_config (config_key, config_value) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
                [key, val]
            );
        }
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save school config' }); }
});

module.exports = router;
