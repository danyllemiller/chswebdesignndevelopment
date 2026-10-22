// server/routes/agenda.js
// Replaces api/agenda/get.php and api/admin/save-agenda-content.php --
// neither had any auth. get.php only reads lesson-plan text (not student
// PII), but save-agenda-content.php let anyone silently overwrite any
// day's lesson plan/warm-up content with no check at all.
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { requireStaff, requireLogin, isStaffSession } = require('../helpers');

const AGENDA_CONTENT_DDL = `CREATE TABLE IF NOT EXISTS agenda_content (
    course     VARCHAR(20) NOT NULL,
    block_num  INT         NOT NULL,
    content    LONGTEXT    NOT NULL,
    updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (course, block_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const AGENDA_SCHEDULE_DDL = `CREATE TABLE IF NOT EXISTS agenda_schedule (
    course     VARCHAR(20) NOT NULL,
    track      VARCHAR(10) NOT NULL DEFAULT 'main',
    block_num  INT         NOT NULL,
    event_date DATE        NOT NULL,
    PRIMARY KEY (course, track, block_num),
    KEY idx_lookup (course, track, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const AGENDA_DAYS_DDL = `CREATE TABLE IF NOT EXISTS agenda_days (
    course     VARCHAR(20) NOT NULL,
    track      VARCHAR(10) NOT NULL DEFAULT 'main',
    event_date DATE        NOT NULL,
    block_num  INT         NOT NULL,
    PRIMARY KEY (course, track, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

// mysql2 hands DATE columns back as local-midnight Date objects; toISOString()
// would shift them a day early west of UTC, so format the local parts.
const ymd = d => (d instanceof Date)
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : String(d).slice(0, 10);

// This is the teacher's own daily-planning tool (admin/daily-agenda.html),
// not student-facing, so staff-only rather than merely requireLogin.
router.get('/agenda/get', requireStaff, async (req, res) => {
    const course = String(req.query.course || '').trim();
    if (!course) return res.status(400).json({ error: 'course is required' });
    try {
        const result = await withConnection(async (connection) => {
            await connection.execute(AGENDA_CONTENT_DDL);
            await connection.execute(AGENDA_SCHEDULE_DDL);

            const [contentRows] = await connection.execute(
                'SELECT block_num, content FROM agenda_content WHERE course = ? ORDER BY block_num', [course]
            );
            const content = {};
            contentRows.forEach(r => { content[r.block_num] = JSON.parse(r.content); });

            const [scheduleRows] = await connection.execute(
                'SELECT track, block_num, event_date FROM agenda_schedule WHERE course = ? ORDER BY track, block_num', [course]
            );
            const schedule = {};
            scheduleRows.forEach(r => {
                if (!schedule[r.track]) schedule[r.track] = {};
                schedule[r.track][r.block_num] = r.event_date.toISOString().split('T')[0];
            });

            // Date -> block, written by Jotability. A block can land on more
            // than one date here (a "didn't finish" day repeats the same
            // slide), which agenda_schedule's one-date-per-block key can't hold.
            await connection.execute(AGENDA_DAYS_DDL);
            const [dayRows] = await connection.execute(
                'SELECT track, event_date, block_num FROM agenda_days WHERE course = ?', [course]
            );
            const days = {};
            dayRows.forEach(r => { (days[r.track] = days[r.track] || {})[ymd(r.event_date)] = r.block_num; });

            return { content, schedule, days };
        });
        res.json({ course, content: result.content, schedule: result.schedule, days: result.days });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch agenda' }); }
});

// ── Student agenda (student/agenda.html) ─────────────────────────────────
// Read-only view of a student's own class agenda for any class day (past or
// future). Only student-facing fields of the slide are sent. The course and
// track come from the student's enrolled sections (primary + additional):
// a WD1 section -> wd1, WD2 and AS sections -> wd2, CS -> cs_s1 on the A- or
// B-day track by the period's letter. Staff can view any course.
const COURSE_BY_ID = { '05254G1S': 'wd1', '05254G2S': 'wd2', '05254EF-201': 'wd2', '05254ES': 'wd2', '10003GS': 'cs_s1' };
const COURSE_LABELS = { wd1: 'Web Design 1', wd2: 'Web Design 2', cs_s1: 'Computer Science' };
const STUDENT_FIELDS = ['chapterLabel', 'minimumDay', 'objective', 'doNowType', 'doNowPrompt', 'tasksTitle', 'tasksList', 'exitTicket', 'milestone'];

async function studentAgendaOptions(connection, req) {
    if (isStaffSession(req)) {
        return [
            { course: 'wd1', track: 'main', label: 'Web Design 1' }, { course: 'wd2', track: 'main', label: 'Web Design 2' },
            { course: 'cs_s1', track: 'A', label: 'Computer Science (A days)' }, { course: 'cs_s1', track: 'B', label: 'Computer Science (B days)' }
        ];
    }
    const sid = String(req.session.user.student_id);
    const [rows] = await connection.execute(
        `SELECT cs.section_id, cs.course_id FROM class_sections cs
         WHERE cs.archived = 0 AND (cs.section_id = (SELECT section_id FROM students WHERE student_id = ? LIMIT 1)
            OR cs.section_id IN (SELECT section_id FROM student_additional_sections WHERE student_id = ?))`, [sid, sid]);
    const seen = new Set(), out = [];
    rows.forEach(r => {
        const course = COURSE_BY_ID[r.course_id];
        if (!course) return;
        const track = course === 'cs_s1' ? (String(r.section_id).charAt(0).toUpperCase() === 'B' ? 'B' : 'A') : 'main';
        const key = course + track;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ course, track, label: `${COURSE_LABELS[course]} (${r.section_id})` });
    });
    return out;
}

// GET /agenda/student?course=&track=&date=YYYY-MM-DD
router.get('/agenda/student', requireLogin, async (req, res) => {
    try {
        const out = await withConnection(async (connection) => {
            await connection.execute(AGENDA_CONTENT_DDL);
            await connection.execute(AGENDA_SCHEDULE_DDL);
            await connection.execute(AGENDA_DAYS_DDL);
            const options = await studentAgendaOptions(connection, req);
            if (!options.length) return { options, error: 'No class agenda found for your schedule.' };
            const pick = options.find(o => o.course === req.query.course && o.track === (req.query.track || o.track)) || options[0];
            // Class days: Jotability's dates when it has sent them, else the original schedule.
            let [dayRows] = await connection.execute(
                'SELECT event_date, block_num FROM agenda_days WHERE course = ? AND track = ? ORDER BY event_date', [pick.course, pick.track]);
            if (!dayRows.length) {
                [dayRows] = await connection.execute(
                    'SELECT event_date, block_num FROM agenda_schedule WHERE course = ? AND track = ? ORDER BY event_date', [pick.course, pick.track]);
            }
            const days = dayRows.map(r => ({ date: ymd(r.event_date), block: r.block_num }));
            const today = ymd(new Date());
            const want = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '')) ? String(req.query.date) : today;
            const hit = days.find(d => d.date === want);
            const prev = [...days].reverse().find(d => d.date < want) || null;
            const next = days.find(d => d.date > want) || null;
            let content = null;
            if (hit) {
                const [[row]] = await connection.execute('SELECT content FROM agenda_content WHERE course = ? AND block_num = ?', [pick.course, hit.block]);
                if (row) {
                    const c = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
                    content = {};
                    STUDENT_FIELDS.forEach(f => { if (c[f] !== undefined) content[f] = c[f]; });
                }
            }
            return { options, course: pick.course, track: pick.track, label: pick.label, date: want, today,
                     isClassDay: !!hit, content, prevDate: prev && prev.date, nextDate: next && next.date };
        });
        res.json(out);
    } catch (err) { console.error('[agenda] student view error:', err); res.status(500).json({ error: 'Failed to load the agenda.' }); }
});

// Under /admin/ -- already covered by the blanket admin gate in server/api.js.
router.post('/admin/save-agenda-content', async (req, res) => {
    const course = String(req.body?.course || '').trim();
    const blockNum = parseInt(req.body?.block_num, 10) || 0;
    const content = req.body?.content;
    if (!course || !blockNum || typeof content !== 'object' || content === null || Array.isArray(content)) {
        return res.status(400).json({ error: 'course, block_num, and content are required' });
    }
    try {
        await withConnection(async (connection) => {
            await connection.execute(AGENDA_CONTENT_DDL);
            await connection.execute(
                `INSERT INTO agenda_content (course, block_num, content) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE content = VALUES(content)`,
                [course, blockNum, JSON.stringify(content)]
            );
        });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save agenda content' }); }
});

// ── Jotability sync ─────────────────────────────────────────────────────
// Jotability (the teacher's planner app) is the master pacing calendar: it
// decides which date each agenda block is taught on, including repeats for
// "didn't finish" days and shifts for snow days. It runs on a different
// origin (an iPad home-screen app), so these routes use a shared secret
// (AGENDA_SYNC_KEY in .env) instead of the session cookie, plus CORS.
const crypto = require('crypto');
const { syncDueDates, AUTO_ENABLED: DUE_DATE_SYNC_ON } = require('../jobs/dueDateSync');
const SYNC_COURSES = new Set(['wd1', 'wd2', 'cs_s1']);
const MEETING_DAY_TYPES = { wd1: { main: ['A', 'A_MIN', 'C'] } };
const SPECIAL_DATES_CSV = require('path').join(__dirname, '../../special-dates.csv');
function loadDayTypes() {
    const types = {};
    try {
        require('fs').readFileSync(SPECIAL_DATES_CSV, 'utf8').split(/\r?\n/).slice(1).forEach(line => {
            const [date, type] = line.split(',');
            if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) types[date] = (type || '').trim();
        });
    } catch (e) { console.error('[agenda sync] special-dates.csv:', e.message); }
    return types;
}

function syncCors(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
}
function requireSyncKey(req, res, next) {
    const expected = process.env.AGENDA_SYNC_KEY || '';
    if (expected.length < 24) return res.status(503).json({ error: 'Sync is not set up on the server yet (AGENDA_SYNC_KEY in .env).' });
    const given = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(expected).digest();
    if (!given || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'That sync key isn’t right.' });
    next();
}
router.use('/agenda/sync', syncCors);

// Chapter outline of a course's agenda, so Jotability can match each of its
// pacing units to a chapter's agenda blocks. A group is every block sharing
// the same chapterLabel prefix (the part before " · Day N of M"), in block
// order -- even when a re-teach day interrupts the chapter partway through.
router.get('/agenda/sync/outline', requireSyncKey, async (req, res) => {
    const course = String(req.query.course || '').trim();
    if (!SYNC_COURSES.has(course)) return res.status(400).json({ error: 'Unknown course' });
    try {
        const rows = await withConnection(async (connection) => {
            await connection.execute(AGENDA_CONTENT_DDL);
            const [r] = await connection.execute('SELECT block_num, content FROM agenda_content WHERE course = ? ORDER BY block_num', [course]);
            return r;
        });
        const groups = [], byName = new Map();
        rows.forEach(r => {
            let c = {}; try { c = JSON.parse(r.content); } catch (e) { }
            const name = String(c.chapterLabel || `Block ${r.block_num}`).split(' · ')[0].trim();
            let g = byName.get(name);
            if (!g) { g = { name, full: [], short: [] }; groups.push(g); byName.set(name, g); }
            (c.minimumDay ? g.short : g.full).push(r.block_num);
        });
        res.json({ course, blocks: rows.length, groups });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to read the agenda outline' }); }
});

// Replace one course/track's dates. Body: { course, track, days: [{ date: 'YYYY-MM-DD', block: N }] }
router.post('/agenda/sync/schedule', requireSyncKey, async (req, res) => {
    const course = String(req.body?.course || '').trim();
    const track = String(req.body?.track || 'main').trim();
    const days = Array.isArray(req.body?.days) ? req.body.days : null;
    if (!SYNC_COURSES.has(course) || !/^(main|A|B)$/.test(track) || !days) return res.status(400).json({ error: 'course, track and days are required' });
    const clean = [];
    for (const d of days) {
        const date = String(d?.date || ''), block = parseInt(d?.block, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(block > 0) || block > 1000) return res.status(400).json({ error: `Bad day entry: ${JSON.stringify(d)}` });
        clean.push([date, block]);
    }
    if (clean.length > 1000) return res.status(400).json({ error: 'Too many days' });
    // WD1 (A1) only meets on A, A_MIN and C days (special-dates.csv). A sync
    // that puts it on a B/OFF day is a calendar mismatch on the sending side --
    // refuse the whole send and name the dates, rather than save wrong slides.
    const allowed = MEETING_DAY_TYPES[course] && MEETING_DAY_TYPES[course][track];
    if (allowed) {
        const types = loadDayTypes();
        const bad = clean.filter(([date]) => !allowed.includes(types[date])).map(([date]) => `${date} (${types[date] || 'not in special-dates.csv'})`);
        if (bad.length) return res.status(400).json({ error: `${course} ${track} only meets on ${allowed.join('/')} days. These dates are not: ${bad.join(', ')}. Use special-dates.csv for A/B days.`, bad_dates: bad });
    }
    try {
        await withConnection(async (connection) => {
            await connection.execute(AGENDA_SCHEDULE_DDL);
            await connection.execute(AGENDA_DAYS_DDL);
            // Keep the hand-made dates from before the first sync, once.
            await connection.execute('CREATE TABLE IF NOT EXISTS agenda_schedule_backup LIKE agenda_schedule');
            await connection.execute('INSERT IGNORE INTO agenda_schedule_backup SELECT * FROM agenda_schedule WHERE course = ? AND track = ?', [course, track]);
            await connection.beginTransaction();
            try {
                await connection.execute('DELETE FROM agenda_days WHERE course = ? AND track = ?', [course, track]);
                await connection.execute('DELETE FROM agenda_schedule WHERE course = ? AND track = ?', [course, track]);
                const firstDate = new Map();
                for (const [date, block] of clean) {
                    await connection.execute('INSERT INTO agenda_days (course, track, event_date, block_num) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE block_num = VALUES(block_num)', [course, track, date, block]);
                    if (!firstDate.has(block) || date < firstDate.get(block)) firstDate.set(block, date);
                }
                // agenda_schedule keeps one date per block (the first) so the jump list still labels each slide.
                for (const [block, date] of firstDate) {
                    await connection.execute('INSERT INTO agenda_schedule (course, track, block_num, event_date) VALUES (?, ?, ?, ?)', [course, track, block, date]);
                }
                await connection.commit();
            } catch (e) { await connection.rollback(); throw e; }
        });
        // Gradebook due dates and the student calendar follow the new pacing
        // too (server/jobs/dueDateSync.js). A failure there never fails the
        // schedule save itself -- the slides are already updated.
        let dueDatesMoved = null;
        try {
            const r = DUE_DATE_SYNC_ON ? await syncDueDates(course) : null;
            dueDatesMoved = r ? r.applied : null;
        } catch (e) { console.error('[agenda sync] due-date sync failed:', e); }
        res.json({ success: true, course, track, days: clean.length, due_dates_moved: dueDatesMoved });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save the schedule' }); }
});

module.exports = router;
