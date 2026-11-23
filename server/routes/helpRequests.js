// server/routes/helpRequests.js
// Private "I'm stuck" requests (teacher 2026-11-23: a way for students who
// won't raise their hand to ask for help). A student presses the button on
// any lesson page (js/help-button.js); only the teacher sees it, as an alert
// on every teacher page with the student's name, period, and page. Nobody in
// class can tell who asked. One open request per student: pressing again
// from another page just moves it there.
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { requireLogin } = require('../helpers');

let tableReady = false;
async function ensureTable(connection) {
    if (tableReady) return;
    await connection.execute(`CREATE TABLE IF NOT EXISTS help_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        page_path VARCHAR(300) NOT NULL DEFAULT '',
        page_title VARCHAR(200) NOT NULL DEFAULT '',
        note VARCHAR(300) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        resolved_at DATETIME NULL,
        resolved_by VARCHAR(20) NULL,
        INDEX idx_open (resolved_at),
        INDEX idx_student (student_id)
    )`);
    tableReady = true;
}

// Requests older than this are treated as stale (the class is long over).
const OPEN_HOURS = 6;
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, n);
const studentOf = (req) => {
    const u = req.session && req.session.user;
    return u && u.student_id && u.section_id !== 'Teacher' && u.role !== 'admin' && u.role !== 'teacher' ? String(u.student_id) : null;
};

async function openRequest(connection, studentId) {
    const [rows] = await connection.execute(
        `SELECT id, page_path, page_title, note, created_at FROM help_requests
         WHERE student_id = ? AND resolved_at IS NULL AND created_at > NOW() - INTERVAL ${OPEN_HOURS} HOUR
         ORDER BY id DESC LIMIT 1`, [studentId]);
    return rows[0] || null;
}

// The student's own open request, if any (so the button shows "Help is on the way").
router.get('/student/stuck', requireLogin, async (req, res) => {
    const sid = studentOf(req);
    if (!sid) return res.json({ open: null });
    try {
        const open = await withConnection(async (c) => { await ensureTable(c); return openRequest(c, sid); });
        res.json({ open });
    } catch (e) { console.error('[help] get', e); res.status(500).json({ error: 'Could not check your help request.' }); }
});

router.post('/student/stuck', requireLogin, async (req, res) => {
    const sid = studentOf(req);
    if (!sid) return res.status(403).json({ error: 'Only students can send a help request.' });
    const pagePath = clean(req.body.page_path, 300) || '/';
    const pageTitle = clean(req.body.page_title, 200);
    const note = clean(req.body.note, 300);
    try {
        await withConnection(async (c) => {
            await ensureTable(c);
            const open = await openRequest(c, sid);
            if (open) {
                await c.execute('UPDATE help_requests SET page_path = ?, page_title = ?, note = ?, updated_at = NOW() WHERE id = ?',
                    [pagePath, pageTitle, note || open.note, open.id]);
            } else {
                await c.execute(`INSERT INTO help_requests (student_id, page_path, page_title, note, created_at, updated_at)
                                 VALUES (?, ?, ?, ?, NOW(), NOW())`, [sid, pagePath, pageTitle, note]);
            }
        });
        res.json({ success: true });
    } catch (e) { console.error('[help] post', e); res.status(500).json({ error: 'Could not send your help request. Try again.' }); }
});

router.post('/student/stuck/cancel', requireLogin, async (req, res) => {
    const sid = studentOf(req);
    if (!sid) return res.status(403).json({ error: 'Only students can cancel a help request.' });
    try {
        await withConnection(async (c) => {
            await ensureTable(c);
            await c.execute("UPDATE help_requests SET resolved_at = NOW(), resolved_by = 'student' WHERE student_id = ? AND resolved_at IS NULL", [sid]);
        });
        res.json({ success: true });
    } catch (e) { console.error('[help] cancel', e); res.status(500).json({ error: 'Could not cancel. Try again.' }); }
});

// Teacher: every open request (all /admin/ routes are staff-only, see api.js).
// students.student_id uses a different collation than a new table gets, so the join names one.
router.get('/admin/stuck', async (req, res) => {
    try {
        const rows = await withConnection(async (c) => {
            await ensureTable(c);
            const [r] = await c.execute(
                `SELECT h.id, h.student_id, h.page_path, h.page_title, h.note, h.created_at, h.updated_at,
                        TIMESTAMPDIFF(MINUTE, h.created_at, NOW()) AS minutes,
                        s.first_name, s.last_name, s.section_id
                 FROM help_requests h LEFT JOIN students s ON s.student_id COLLATE utf8mb4_unicode_ci = h.student_id
                 WHERE h.resolved_at IS NULL AND h.created_at > NOW() - INTERVAL ${OPEN_HOURS} HOUR
                 ORDER BY h.created_at ASC`);
            return r;
        });
        res.json({ requests: rows });
    } catch (e) { console.error('[help] admin list', e); res.status(500).json({ error: 'Could not load help requests.' }); }
});

router.post('/admin/stuck/:id/resolve', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Bad request id.' });
    try {
        await withConnection(async (c) => {
            await ensureTable(c);
            await c.execute("UPDATE help_requests SET resolved_at = NOW(), resolved_by = 'teacher' WHERE id = ? AND resolved_at IS NULL", [id]);
        });
        res.json({ success: true });
    } catch (e) { console.error('[help] resolve', e); res.status(500).json({ error: 'Could not mark it done.' }); }
});

module.exports = router;
