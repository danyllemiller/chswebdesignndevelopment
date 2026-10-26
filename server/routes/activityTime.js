// Students' active time on the site (js/activity-time.js): seconds per student, day, page and kind
// (reading, notes, activity, test, project, other), for questions like "how long does he spend
// reading and taking notes" (teacher request 2026-10-26). Teacher view: admin/tools/activity-time.html.
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { requireLogin, requireStaff, isStaffSession } = require('../helpers');
const { getLocalDateStr } = require('../tardyLogic');

const CATS = ['reading', 'notes', 'activity', 'test', 'project', 'other'];
let tableReady = false;
// The table takes the students table's collation: made with the server's default, a join on
// student_id failed with "Illegal mix of collations" (2026-10-26), and the default differs between
// database versions, so it's read, not hard-coded, and a table made the old way is converted.
async function ensureTable(connection) {
    if (tableReady) return;
    const [[col]] = await connection.execute(`SELECT CHARACTER_SET_NAME AS cs, COLLATION_NAME AS co FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'student_id'`);
    const ok = v => /^[a-z0-9_]+$/i.test(v || ''), cs = ok(col?.cs) ? col.cs : 'utf8mb4', co = ok(col?.co) ? col.co : null;
    await connection.execute(`CREATE TABLE IF NOT EXISTS student_activity_time (
        student_id VARCHAR(20) NOT NULL, day DATE NOT NULL, path VARCHAR(190) NOT NULL, category VARCHAR(12) NOT NULL,
        seconds INT NOT NULL DEFAULT 0, title VARCHAR(190) NULL, first_at DATETIME NOT NULL, last_at DATETIME NOT NULL,
        PRIMARY KEY (student_id, day, path, category), KEY by_day (day)
    )${co ? ` DEFAULT CHARSET=${cs} COLLATE=${co}` : ''}`);
    if (co) {
        const [[t]] = await connection.execute(`SELECT TABLE_COLLATION AS co FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_activity_time'`);
        if (t && t.co !== co) await connection.execute(`ALTER TABLE student_activity_time CONVERT TO CHARACTER SET ${cs} COLLATE ${co}`);
    }
    tableReady = true;
}

// Never more seconds than the clock allows since this student's last send, so a page open in
// several tabs (or a scripted send) can't pile up time. Forgotten when the server restarts.
const lastSend = new Map();
router.post('/activity/time', requireLogin, async (req, res) => {
    if (isStaffSession(req)) return res.status(204).end();
    const sid = String(req.session.user.student_id || '');
    const entries = (Array.isArray(req.body?.entries) ? req.body.entries : []).slice(0, 30)
        .map(e => ({ path: String(e?.path || '').split(/[?#]/)[0].slice(0, 190), cat: String(e?.cat || ''), secs: Math.round(Number(e?.secs) || 0), title: String(e?.title || '').trim().slice(0, 190) }))
        .filter(e => /^\/[\w\-./&%]*$/.test(e.path) && CATS.includes(e.cat) && e.secs > 0);
    if (!sid || !entries.length) return res.status(204).end();
    const now = Date.now(), room = (now - (lastSend.get(sid) || now - 90000)) / 1000 + 10;
    const total = entries.reduce((s, e) => s + e.secs, 0), scale = total > room ? room / total : 1;
    lastSend.set(sid, now);
    try {
        await withConnection(async (connection) => {
            await ensureTable(connection);
            const day = getLocalDateStr();
            for (const e of entries) {
                const secs = Math.min(600, Math.round(e.secs * scale)); if (secs <= 0) continue;
                await connection.execute(
                    `INSERT INTO student_activity_time (student_id, day, path, category, seconds, title, first_at, last_at)
                     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                     ON DUPLICATE KEY UPDATE seconds = LEAST(seconds + VALUES(seconds), 43200), title = COALESCE(VALUES(title), title), last_at = NOW()`,
                    [sid, day, e.path, e.cat, secs, e.title || null]);
            }
        });
        res.status(204).end();
    } catch (err) { console.error('[activity-time] save:', err.message); res.status(500).json({ error: 'Not saved.' }); }
});

const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
function range(q) {
    const today = getLocalDateStr(), d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));  // this week's Monday
    return { from: isDay(q.from) ? q.from : getLocalDateStr(d), to: isDay(q.to) ? q.to : today };
}
// A period's own pages: a CS period counts the CS chapters, workspace and CS tests; a Web Design
// period its chapters, guided notes and quizzes. Shared student pages (the Notes page) count for both.
const CS = new Set(['A3', 'A5', 'B4', 'B6', 'B8']), WD = new Set(['A1', 'B2', 'AS-B2']);
function coursePaths(section) {
    if (CS.has(section)) return `AND (a.path REGEXP '^/(compsci/|cs-|exams/cs-)' OR a.path LIKE '/student/%')`;
    if (WD.has(section)) return `AND (a.path REGEXP '^/(year1|year2|notes|quizzes)/' OR (a.path LIKE '/exams/%' AND a.path NOT LIKE '/exams/cs-%') OR a.path LIKE '/student/%')`;
    return '';
}

// GET /admin/activity-time?section=B6&from=&to= -> each student's seconds by kind, days active, last seen
router.get('/admin/activity-time', requireStaff, async (req, res) => {
    const section = String(req.query.section || '').trim().toUpperCase(), { from, to } = range(req.query);
    try {
        const out = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [sections] = await connection.execute('SELECT section_id FROM class_sections WHERE COALESCE(archived, 0) = 0 ORDER BY section_id');
            if (!section) return { from, to, sections: sections.map(s => s.section_id), students: [] };
            const [rows] = await connection.execute(
                `SELECT s.student_id, s.first_name, s.last_name, a.category, SUM(a.seconds) AS secs
                 FROM students s
                 LEFT JOIN student_activity_time a ON a.student_id = s.student_id AND a.day BETWEEN ? AND ? ${coursePaths(section)}
                 WHERE COALESCE(s.archived, 0) = 0
                   AND (s.section_id = ? OR s.student_id IN (SELECT student_id FROM student_additional_sections WHERE section_id = ?))
                 GROUP BY s.student_id, s.first_name, s.last_name, a.category`, [from, to, section, section]);
            const [days] = await connection.execute(
                `SELECT a.student_id, COUNT(DISTINCT a.day) AS days, MAX(a.last_at) AS last_at FROM student_activity_time a
                 WHERE a.day BETWEEN ? AND ? ${coursePaths(section)} GROUP BY a.student_id`, [from, to]);
            const dayBy = new Map(days.map(d => [String(d.student_id), d]));
            const by = new Map();
            for (const r of rows) {
                const id = String(r.student_id);
                if (!by.has(id)) by.set(id, { student_id: id, name: `${r.first_name} ${r.last_name}`, secs: {}, days: Number(dayBy.get(id)?.days || 0), last_at: dayBy.get(id)?.last_at || null });
                if (r.category) by.get(id).secs[r.category] = Number(r.secs);
            }
            return { from, to, section, sections: sections.map(s => s.section_id), students: [...by.values()].sort((a, b) => a.name.localeCompare(b.name)) };
        });
        res.json(out);
    } catch (err) { console.error('[activity-time] summary:', err.message); res.status(500).json({ error: 'Could not load activity time.' }); }
});

// GET /admin/activity-time/student?student_id=&from=&to= -> every page and day
router.get('/admin/activity-time/student', requireStaff, async (req, res) => {
    const sid = String(req.query.student_id || ''), { from, to } = range(req.query);
    if (!sid) return res.status(400).json({ error: 'student_id is required' });
    try {
        const rows = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [r] = await connection.execute(
                `SELECT DATE_FORMAT(day, '%Y-%m-%d') AS day, path, title, category, seconds,
                        DATE_FORMAT(first_at, '%H:%i') AS first_at, DATE_FORMAT(last_at, '%H:%i') AS last_at
                 FROM student_activity_time WHERE student_id = ? AND day BETWEEN ? AND ? ORDER BY day DESC, seconds DESC`, [sid, from, to]);
            return r;
        });
        res.json({ from, to, rows });
    } catch (err) { console.error('[activity-time] student:', err.message); res.status(500).json({ error: 'Could not load activity time.' }); }
});

module.exports = router;
