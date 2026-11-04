// server/routes/siteReports.js
// Student bug reports and app/feature requests (student/report.html), with a
// triage step: each report is routed to Monique (basic site maintenance she
// can fix in her practicum: typos, broken images/links, alt text, oversized
// files), to Claude (needs real code: new features, logins, saving, grades,
// errors), or kept for the teacher. Every report gets an automatic first
// guess at submit time; the teacher (or Claude, reading the queue with the
// teacher) confirms or changes it on admin/tools/site-reports.html.
// Reports routed to Monique show up on her practicum page
// (student/monique-practicum.html), where she marks them fixed for review.
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { requireLogin } = require('../helpers');

const MONIQUE_STUDENT_ID = '8009627';
const KINDS = new Set(['bug', 'request']);
const ROUTES = new Set(['monique', 'claude', 'teacher']);
const STATUSES = new Set(['new', 'assigned', 'fixed', 'done', 'declined']);

async function ensureTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS site_reports (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            student_id   VARCHAR(50) NOT NULL,
            kind         VARCHAR(10) NOT NULL,
            page_url     VARCHAR(500) NULL,
            description  TEXT NOT NULL,
            route        VARCHAR(10) NOT NULL,
            route_reason VARCHAR(255) NULL,
            route_auto   TINYINT(1) NOT NULL DEFAULT 1,
            status       VARCHAR(10) NOT NULL DEFAULT 'new',
            staff_note   TEXT NULL,
            fixer_note   TEXT NULL,
            created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_status (status), KEY idx_route (route)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

// First-guess routing. Requests for something new always need real code.
// Bugs that are about page CONTENT (spelling, an image, a link, alt text, a
// slow image) are Monique-sized; bugs about the site BEHAVING wrong (can't
// log in, didn't save, grade wrong, error message, button does nothing)
// need code. Anything unclear goes to the teacher to decide.
const MONIQUE_WORDS = /\b(typo|spell(ing|ed)?|misspell|grammar|broken (image|picture|link)|image (is )?(missing|broken|not (showing|loading))|picture (is )?(missing|broken)|missing (image|picture)|link (is )?(broken|wrong|dead|doesn'?t work)|dead link|404|alt text|blurry|pixelated|stretched|wrong (image|picture)|favicon|caption|loads? slow(ly)?|huge image|wrong word)\b/i;
const CODE_WORDS = /\b(log ?in|logout|password|sign ?in|save[sd]?|saving|submit(ted|ting)?|grade|gradebook|score|points|error|crash|freez(e|es|ing)|won'?t (load|open|work)|doesn'?t (load|open|work|save)|not working|button|timer|clock ?(in|out)|upload|quiz|test|exam|notebook|calendar|agenda|game|feature|add a|could you add|can you add|would like|wish|app)\b/i;

function autoRoute(kind, text) {
    if (kind === 'request') return { route: 'claude', reason: 'A new feature or app request needs real code.' };
    const m = text.match(MONIQUE_WORDS), c = text.match(CODE_WORDS);
    if (m && !c) return { route: 'monique', reason: `Looks like a content fix ("${m[0]}"): practice-level site maintenance.` };
    if (c && !m) return { route: 'claude', reason: `Something isn't working right ("${c[0]}"): needs a code fix.` };
    if (m && c) return { route: 'teacher', reason: `Mentions both a content problem ("${m[0]}") and site behavior ("${c[0]}"): teacher decides.` };
    return { route: 'teacher', reason: 'Not enough detail to tell yet: teacher decides.' };
}

// ---- Students ---------------------------------------------------------
router.post('/student/site-report', requireLogin, async (req, res) => {
    const kind = KINDS.has(req.body?.kind) ? req.body.kind : null;
    const description = String(req.body?.description || '').trim().slice(0, 3000);
    const pageUrl = String(req.body?.page_url || '').trim().slice(0, 500) || null;
    if (!kind || description.length < 10) return res.status(400).json({ error: 'Pick bug or request and describe it in at least a sentence.' });
    const sid = String(req.session.user.student_id || '');
    try {
        const out = await withConnection(async (connection) => {
            await ensureTable(connection);
            // Light flood guard: at most 10 reports per student per day.
            const [[{ n }]] = await connection.execute(
                'SELECT COUNT(*) AS n FROM site_reports WHERE student_id = ? AND created_at > NOW() - INTERVAL 1 DAY', [sid]);
            if (n >= 10) return { status: 429, body: { error: 'That is a lot of reports for one day. Thank you! Try again tomorrow.' } };
            const { route, reason } = autoRoute(kind, `${description} ${pageUrl || ''}`);
            const [r] = await connection.execute(
                'INSERT INTO site_reports (student_id, kind, page_url, description, route, route_reason) VALUES (?, ?, ?, ?, ?, ?)',
                [sid, kind, pageUrl, description, route, reason]);
            return { status: 200, body: { success: true, id: r.insertId } };
        });
        res.status(out.status).json(out.body);
    } catch (err) { console.error('[site-reports] submit', err); res.status(500).json({ error: 'Could not send your report.' }); }
});

router.get('/student/site-reports/mine', requireLogin, async (req, res) => {
    try {
        const rows = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [r] = await connection.execute(
                'SELECT id, kind, page_url, description, status, created_at, updated_at FROM site_reports WHERE student_id = ? ORDER BY id DESC LIMIT 50',
                [String(req.session.user.student_id || '')]);
            return r;
        });
        res.json({ reports: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Could not load your reports.' }); }
});

// ---- Monique (practicum) ------------------------------------------------
const isMoniqueOrStaff = (req) => {
    const u = req.session && req.session.user;
    return !!u && (u.student_id === MONIQUE_STUDENT_ID || u.role === 'admin' || u.section_id === 'Teacher');
};

router.get('/practicum/assigned-reports', async (req, res) => {
    if (!isMoniqueOrStaff(req)) return res.status(401).json({ error: 'Not authorized.' });
    try {
        const rows = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [r] = await connection.execute(
                `SELECT id, kind, page_url, description, status, staff_note, fixer_note, created_at FROM site_reports
                 WHERE route = 'monique' AND status IN ('assigned', 'fixed') ORDER BY id`);
            return r;
        });
        res.json({ reports: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Could not load reports.' }); }
});

router.post('/practicum/report-fixed', async (req, res) => {
    if (!isMoniqueOrStaff(req)) return res.status(401).json({ error: 'Not authorized.' });
    const id = Number(req.body?.id);
    const note = String(req.body?.note || '').trim().slice(0, 1000);
    if (!id || note.length < 5) return res.status(400).json({ error: 'Say what you changed (which file, what you fixed).' });
    try {
        await withConnection(async (connection) => {
            await ensureTable(connection);
            await connection.execute(
                `UPDATE site_reports SET status = 'fixed', fixer_note = ? WHERE id = ? AND route = 'monique' AND status = 'assigned'`, [note, id]);
        });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Could not save.' }); }
});

// ---- Teacher (under /admin/: staff-gated in server/api.js) --------------
router.get('/admin/site-reports', async (req, res) => {
    try {
        const rows = await withConnection(async (connection) => {
            await ensureTable(connection);
            // Names come from a second query: site_reports and students were created with different
            // collations, and comparing their student_id columns in a JOIN is an error in MariaDB.
            const [r] = await connection.execute('SELECT * FROM site_reports ORDER BY id DESC LIMIT 500');
            const ids = [...new Set(r.map(x => String(x.student_id)).filter(Boolean))];
            const [names] = ids.length ? await connection.execute(
                `SELECT student_id, first_name, last_name, section_id FROM students WHERE student_id IN (${ids.map(() => '?').join(',')})`, ids) : [[]];
            const byId = new Map(names.map(n => [String(n.student_id), n]));
            return r.map(x => { const n = byId.get(String(x.student_id)) || {}; return { ...x, first_name: n.first_name || null, last_name: n.last_name || null, section_id: n.section_id || null }; });
        });
        res.json({ reports: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Could not load reports.' }); }
});

router.post('/admin/site-reports/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { route, status, staff_note } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Bad report id.' });
    if (route && !ROUTES.has(route)) return res.status(400).json({ error: 'Bad route.' });
    if (status && !STATUSES.has(status)) return res.status(400).json({ error: 'Bad status.' });
    try {
        await withConnection(async (connection) => {
            await ensureTable(connection);
            const sets = [], vals = [];
            if (route) { sets.push('route = ?', 'route_auto = 0'); vals.push(route); }
            if (status) { sets.push('status = ?'); vals.push(status); }
            if (typeof staff_note === 'string') { sets.push('staff_note = ?'); vals.push(staff_note.slice(0, 2000)); }
            if (!sets.length) return;
            await connection.execute(`UPDATE site_reports SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
        });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Could not update.' }); }
});

module.exports = router;
