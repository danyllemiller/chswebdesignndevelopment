const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

// Private 1:1 messaging between the teacher and a student -- one running
// thread per student (not per-project/per-topic), used for 5-minute
// tardy-conference notes, project feedback, and "I need help" requests.
// Unlike most of this API, these routes derive identity from the session
// rather than trusting a client-supplied student_id, since this is
// genuinely private correspondence and must not be readable by other
// students or writable under an impersonated identity.

// Both students and the teacher are rows in the same students table --
// the teacher's row has role='teacher' and section_id='Teacher' in the
// live DB (not role='admin', which is what js/auth-guard.js's primary
// client-side check assumes). Matches the same fallback already used
// server-side in server/routes/gallery.js:57 and the role set treated as
// staff in paystubs.js/payroll.js.
function isTeacherSession(sessionUser) {
    if (!sessionUser) return false;
    const role = String(sessionUser.role || '').toLowerCase();
    return role === 'admin' || role === 'teacher' || sessionUser.section_id === 'Teacher';
}

async function ensureMessagesTable(connection) {
    // student_id must match students.student_id's actual collation
    // (utf8mb4_uca1400_ai_ci) explicitly -- letting it default silently
    // picked the connection's default (utf8mb4_unicode_ci) instead, which
    // broke every JOIN against students with "Illegal mix of collations"
    // (caught server-side as a 500, surfacing to the admin inbox as
    // "nothing here" with no obvious error).
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(50) COLLATE utf8mb4_uca1400_ai_ci NOT NULL,
            sender ENUM('student','teacher') NOT NULL,
            body TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP NULL DEFAULT NULL,
            INDEX idx_student_created (student_id, created_at)
        )
    `);
}

// ==============================================================================
// STUDENT SIDE -- identity always comes from the session, never from a
// client-supplied student_id, so one student can never read or post into
// another student's thread.
// ==============================================================================

router.get('/student/messages', async (req, res) => {
    const sessionUser = req.session?.user;
    if (!sessionUser?.student_id || isTeacherSession(sessionUser)) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    try {
        const connection = await getDbConnection();
        await ensureMessagesTable(connection);
        const [rows] = await connection.execute(
            'SELECT id, sender, body, created_at, read_at FROM messages WHERE student_id = ? ORDER BY created_at ASC',
            [sessionUser.student_id]
        );
        await connection.execute(
            `UPDATE messages SET read_at = NOW() WHERE student_id = ? AND sender = 'teacher' AND read_at IS NULL`,
            [sessionUser.student_id]
        );
        await connection.release();
        res.json({ messages: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load messages.' }); }
});

// No side effect -- polled every ~20s by the nav badge, which must not
// silently mark things read just from a background check.
router.get('/student/messages/unread-count', async (req, res) => {
    const sessionUser = req.session?.user;
    if (!sessionUser?.student_id || isTeacherSession(sessionUser)) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    try {
        const connection = await getDbConnection();
        await ensureMessagesTable(connection);
        const [rows] = await connection.execute(
            `SELECT COUNT(*) AS count FROM messages WHERE student_id = ? AND sender = 'teacher' AND read_at IS NULL`,
            [sessionUser.student_id]
        );
        await connection.release();
        res.json({ count: rows[0].count });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load unread count.' }); }
});

router.post('/student/messages', async (req, res) => {
    const sessionUser = req.session?.user;
    if (!sessionUser?.student_id || isTeacherSession(sessionUser)) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (body.length > 5000) return res.status(400).json({ error: 'Message is too long.' });
    try {
        const connection = await getDbConnection();
        await ensureMessagesTable(connection);
        const [result] = await connection.execute(
            `INSERT INTO messages (student_id, sender, body) VALUES (?, 'student', ?)`,
            [sessionUser.student_id, body]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to send message.' }); }
});

// ==============================================================================
// TEACHER SIDE -- student_id in the query/body is legitimate here, since
// it's the teacher choosing which of HER students to view/message, not a
// student impersonating anyone.
// ==============================================================================

router.get('/admin/messages/threads', async (req, res) => {
    if (!isTeacherSession(req.session?.user)) return res.status(403).json({ error: 'Not authorized.' });
    try {
        const connection = await getDbConnection();
        await ensureMessagesTable(connection);
        const [rows] = await connection.execute(`
            SELECT m.student_id, s.first_name, s.last_name, s.section_id,
                   MAX(m.created_at) AS last_message_at,
                   SUM(CASE WHEN m.sender = 'student' AND m.read_at IS NULL THEN 1 ELSE 0 END) AS unread_count
            FROM messages m
            LEFT JOIN students s ON s.student_id = m.student_id
            GROUP BY m.student_id, s.first_name, s.last_name, s.section_id
            ORDER BY last_message_at DESC
        `);
        await connection.release();
        res.json({ threads: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load message threads.' }); }
});

router.get('/admin/messages/thread', async (req, res) => {
    if (!isTeacherSession(req.session?.user)) return res.status(403).json({ error: 'Not authorized.' });
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        await ensureMessagesTable(connection);
        const [students] = await connection.execute(
            'SELECT student_id, first_name, last_name, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        if (students.length === 0) {
            await connection.release();
            return res.status(404).json({ error: 'No student found with that ID.' });
        }
        const [rows] = await connection.execute(
            'SELECT id, sender, body, created_at, read_at FROM messages WHERE student_id = ? ORDER BY created_at ASC',
            [student_id]
        );
        await connection.execute(
            `UPDATE messages SET read_at = NOW() WHERE student_id = ? AND sender = 'student' AND read_at IS NULL`,
            [student_id]
        );
        await connection.release();
        res.json({ student: students[0], messages: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load thread.' }); }
});

router.post('/admin/messages', async (req, res) => {
    if (!isTeacherSession(req.session?.user)) return res.status(403).json({ error: 'Not authorized.' });
    const { student_id } = req.body;
    const body = String(req.body?.body || '').trim();
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    if (!body) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (body.length > 5000) return res.status(400).json({ error: 'Message is too long.' });
    try {
        const connection = await getDbConnection();
        await ensureMessagesTable(connection);
        const [students] = await connection.execute(
            'SELECT student_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        if (students.length === 0) {
            await connection.release();
            return res.status(404).json({ error: 'No student found with that ID.' });
        }
        const [result] = await connection.execute(
            `INSERT INTO messages (student_id, sender, body) VALUES (?, 'teacher', ?)`,
            [student_id, body]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to send message.' }); }
});

// No side effect -- polled every ~20s by the nav badge.
router.get('/admin/messages/unread-count', async (req, res) => {
    if (!isTeacherSession(req.session?.user)) return res.status(403).json({ error: 'Not authorized.' });
    try {
        const connection = await getDbConnection();
        await ensureMessagesTable(connection);
        const [rows] = await connection.execute(
            `SELECT COUNT(*) AS count FROM messages WHERE sender = 'student' AND read_at IS NULL`
        );
        await connection.release();
        res.json({ count: rows[0].count });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load unread count.' }); }
});

module.exports = router;
