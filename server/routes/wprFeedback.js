// server/routes/wprFeedback.js
// Feedback for WPR Practice Pro (wpr-practice/assets/feedback.js). During the pilot, testers, teachers, and
// students in a pilot class send bug reports, ideas, 1-5 ratings and an optional screenshot; after it, anyone
// can still report a bug or request a feature. Nothing here identifies a student: there is no student ID
// field, and a student taking the test in class is never asked for a name. Screenshots are kept outside the
// website (WPR_FEEDBACK_DIR) and open only from the teacher's inbox on the class site
// (admin/tools/wpr-feedback.html), whose /api/admin/* routes need a staff login (server/api.js).
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { withConnection } = require('../db');

const DIR = process.env.WPR_FEEDBACK_DIR || '/var/lib/chs-site/wpr-feedback';
const PILOT_UNTIL = '2026-12-01';   // the pilot questions (roles, ratings, class survey) end after the 12/1 PLC
const KINDS = ['pilot', 'report', 'survey'];
const ROLES = ['tester', 'teacher', 'class-student', 'other'];
const TYPES = ['bug', 'confusing', 'idea', 'great'];
const SEVERITY = ['blocks', 'annoying', 'minor'];
const STATUS = ['new', 'working', 'fixed', 'wontfix'];
const IMAGE = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 30 },
    fileFilter: (req, file, cb) => cb(null, !!IMAGE[file.mimetype])
});

async function ensureTable(c) {
    await c.execute(`
        CREATE TABLE IF NOT EXISTS wpr_feedback (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            kind         VARCHAR(10) NOT NULL,
            role         VARCHAR(16) NULL,
            type         VARCHAR(12) NULL,
            severity     VARCHAR(10) NULL,
            message      TEXT NULL,
            expected     TEXT NULL,
            ratings_json VARCHAR(300) NULL,
            name         VARCHAR(60) NULL,
            contact      VARCHAR(120) NULL,
            page         VARCHAR(120) NULL,
            device       VARCHAR(160) NULL,
            class_code   CHAR(6) NULL,
            screenshot   VARCHAR(80) NULL,
            status       VARCHAR(12) NOT NULL DEFAULT 'new',
            note         VARCHAR(500) NULL,
            created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const pick = (v, list) => (list.includes(v) ? v : null);
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const pilotOn = () => today() <= PILOT_UNTIL;
const ipOf = req => String(req.headers['cf-connecting-ip'] || req.ip || '');

// A whole school shares one internet address, so the limits per address are roomy: 120 sends (a few classes'
// after-test surveys) and 10 screenshots every 15 minutes. The counts stay in memory for 15 minutes at most,
// as the privacy policy (wpr-practice/privacy.html) promises.
const WINDOW = 15 * 60 * 1000;
const sends = new Map(), shots = new Map();
function over(counts, req, max) {
    const ip = ipOf(req), now = Date.now(), list = (counts.get(ip) || []).filter(t => now - t < WINDOW);
    const full = list.length >= max;
    if (!full) list.push(now);
    counts.set(ip, list);
    if (counts.size > 5000) counts.clear();
    return full;
}
// The file really starts like the image it claims to be.
function realImage(buf, type) {
    const h = buf.subarray(0, 12).toString('hex');
    return (type === 'image/png' && h.startsWith('89504e47')) || (type === 'image/jpeg' && h.startsWith('ffd8ff'))
        || (type === 'image/gif' && h.startsWith('47494638')) || (type === 'image/webp' && h.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP');
}
function ratings(raw) {
    let r = {};
    try { r = JSON.parse(raw || '{}'); } catch (e) { return null; }
    const out = {};
    ['easy', 'clear', 'reports'].forEach(k => { const n = Number(r[k]); if (Number.isInteger(n) && n >= 1 && n <= 5) out[k] = n; });
    if (['no', 'yes'].includes(r.broke)) out.broke = r.broke;
    if (['smooth', 'okay', 'frustrating'].includes(r.felt)) out.felt = r.felt;
    return Object.keys(out).length ? JSON.stringify(out) : null;
}

// GET /wpr/feedback/config -> whether the pilot questions are on, and where to email
router.get('/wpr/feedback/config', (req, res) => {
    res.json({ pilot: pilotOn(), contact: process.env.WPR_CONTACT_EMAIL || 'contact@wprpracticepro.com' });
});

// POST /wpr/feedback (multipart form, with an optional "screenshot" image)
router.post('/wpr/feedback', (req, res) => {
    upload.single('screenshot')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'That picture is too big. Use one under 5 MB.' : 'Could not read that form.' });
        const b = req.body || {};
        if (b.website) return res.json({ success: true });   // a hidden field only bots fill in
        if (over(sends, req, 120)) return res.status(429).json({ error: 'Thanks! That\'s a lot of feedback all at once. Try again in a few minutes.' });
        const kind = pick(b.kind, KINDS) || 'report';
        const role = kind === 'survey' ? 'class-student' : pick(b.role, ROLES);
        const type = pick(b.type, TYPES);
        const message = clean(b.message, 4000);
        if (kind !== 'survey' && type !== 'great' && message.length < 3) return res.status(400).json({ error: 'Tell us what happened (a sentence is plenty).' });
        let screenshot = null;
        if (req.file && role !== 'class-student') {   // a screenshot of the test could show the student's name
            if (!realImage(req.file.buffer, req.file.mimetype)) return res.status(400).json({ error: 'That file doesn\'t look like a picture. Use a PNG or JPG screenshot.' });
            if (over(shots, req, 10)) return res.status(429).json({ error: 'That\'s a lot of screenshots for now. Send this one without the picture, or try again in a few minutes.' });
            screenshot = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${IMAGE[req.file.mimetype]}`;
            try { fs.mkdirSync(DIR, { recursive: true, mode: 0o700 }); fs.writeFileSync(path.join(DIR, screenshot), req.file.buffer, { mode: 0o600 }); }
            catch (e) { console.error('[wpr-feedback] screenshot', e.message); screenshot = null; }
        }
        const row = [
            kind, role, type, type === 'bug' || type === 'confusing' ? pick(b.severity, SEVERITY) : null,
            message || null, clean(b.expected, 2000) || null, ratings(b.ratings),
            role === 'class-student' ? null : clean(b.name, 60) || null,       // students in a class never give a name
            role === 'class-student' ? null : clean(b.contact, 120) || null,
            clean(String(b.page || '').split(/[?#]/)[0], 120) || null, clean(b.device, 160) || null,
            /^[A-Z2-9]{6}$/.test(String(b.code || '').toUpperCase()) ? String(b.code).toUpperCase() : null,
            screenshot
        ];
        try {
            await withConnection(async (c) => {
                await ensureTable(c);
                await c.execute(`INSERT INTO wpr_feedback (kind, role, type, severity, message, expected, ratings_json, name, contact, page, device, class_code, screenshot)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, row);
            });
            res.json({ success: true });
        } catch (e) {
            console.error('[wpr-feedback] save', e);
            res.status(500).json({ error: 'Could not save your feedback. Please try again.' });
        }
    });
});

// ---- The teacher's inbox (staff only: every /api/admin/* route is checked in server/api.js) ----
router.get('/admin/wpr-feedback', async (req, res) => {
    try {
        const rows = await withConnection(async (c) => {
            await ensureTable(c);
            const [r] = await c.execute('SELECT * FROM wpr_feedback ORDER BY created_at DESC LIMIT 1000');
            return r;
        });
        res.json({ pilot: pilotOn(), pilotUntil: PILOT_UNTIL, items: rows.map(r => ({ ...r, ratings: r.ratings_json ? JSON.parse(r.ratings_json) : null, ratings_json: undefined })) });
    } catch (e) { console.error('[wpr-feedback] list', e); res.status(500).json({ error: 'Could not load feedback.' }); }
});

router.get('/admin/wpr-feedback/:id/screenshot', async (req, res) => {
    try {
        const name = await withConnection(async (c) => {
            await ensureTable(c);
            const [[r]] = await c.execute('SELECT screenshot FROM wpr_feedback WHERE id = ?', [Number(req.params.id)]);
            return r && r.screenshot;
        });
        if (!name || !/^\d+-[0-9a-f]{16}\.(png|jpg|webp|gif)$/.test(name)) return res.status(404).end();
        res.set('Cache-Control', 'private, no-store');
        res.sendFile(path.join(DIR, name), err => { if (err && !res.headersSent) res.status(404).end(); });
    } catch (e) { res.status(500).end(); }
});

router.post('/admin/wpr-feedback/:id', async (req, res) => {
    const status = pick(req.body?.status, STATUS);
    const note = req.body?.note !== undefined ? clean(req.body.note, 500) : undefined;
    try {
        await withConnection(async (c) => {
            await ensureTable(c);
            if (status) await c.execute('UPDATE wpr_feedback SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
            if (note !== undefined) await c.execute('UPDATE wpr_feedback SET note = ? WHERE id = ?', [note || null, Number(req.params.id)]);
        });
        res.json({ success: true });
    } catch (e) { console.error('[wpr-feedback] update', e); res.status(500).json({ error: 'Could not save.' }); }
});

router.delete('/admin/wpr-feedback/:id', async (req, res) => {
    try {
        await withConnection(async (c) => {
            await ensureTable(c);
            const [[r]] = await c.execute('SELECT screenshot FROM wpr_feedback WHERE id = ?', [Number(req.params.id)]);
            if (r && r.screenshot && /^\d+-[0-9a-f]{16}\.(png|jpg|webp|gif)$/.test(r.screenshot)) { try { fs.unlinkSync(path.join(DIR, r.screenshot)); } catch (e) { /* already gone */ } }
            await c.execute('DELETE FROM wpr_feedback WHERE id = ?', [Number(req.params.id)]);
        });
        res.json({ success: true });
    } catch (e) { console.error('[wpr-feedback] delete', e); res.status(500).json({ error: 'Could not delete.' }); }
});

module.exports = router;
module.exports._test = { ratings, realImage, pick };
