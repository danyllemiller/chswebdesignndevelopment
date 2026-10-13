// server/routes/aiTutor.js
// Sandboxed AI tutor -- Socratic-only (hints/questions, never the final
// answer or finished code: see the system prompt in server/lib/aiTutorVendor.js).
// Gated entirely behind /admin/ (the blanket staff-only middleware in
// server/api.js) on purpose: this is not wired into any real student-facing
// page yet, so only a teacher/admin session can ever reach it. It exists so
// the experience can be tried out before any real student talks to it, and
// before the district has approved a specific AI vendor for this use.
//
// Vendor-isolated: aiTutorVendor.js is the only file that knows which AI
// vendor is actually behind getTutorReply() -- built against Claude for
// now, swappable to Gemini later without touching this file.
//
// No student_id/name is ever sent to the vendor -- only message content.
// Every message (both sides) is logged here, tied to whoever is testing,
// so this is a teacher-visible transcript by design, not a private chat.
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { getTutorReply } = require('../lib/aiTutorVendor');

const TABLE_DDL = `
    CREATE TABLE IF NOT EXISTS ai_tutor_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        tester_id VARCHAR(100) NOT NULL,
        chapter_context VARCHAR(150) NULL,
        role ENUM('user','assistant') NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session (session_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function ensureTable(connection) {
    await connection.execute(TABLE_DDL);
}

// In-memory per-tester rate limit -- resets on a server restart, which is
// fine for a staff-only sandbox. This bounds real API spend while the
// feature is being tried out; it is not a security control.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 60;
const rateLimitLog = new Map(); // testerId -> timestamps[]

function isRateLimited(testerId) {
    const now = Date.now();
    const timestamps = (rateLimitLog.get(testerId) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    rateLimitLog.set(testerId, timestamps);
    return timestamps.length >= RATE_LIMIT_MAX;
}
function recordRequest(testerId) {
    const timestamps = rateLimitLog.get(testerId) || [];
    timestamps.push(Date.now());
    rateLimitLog.set(testerId, timestamps);
}

function testerIdFor(req) {
    const u = req.session?.user;
    return String(u?.username || u?.student_id || 'unknown-staff').slice(0, 100);
}

router.post('/admin/ai-tutor/message', async (req, res) => {
    const { session_id, chapter_context, message } = req.body || {};
    const sessionId = String(session_id || '').trim();
    const userMessage = String(message || '').trim();
    if (!sessionId || !userMessage) {
        return res.status(400).json({ error: 'session_id and message are required' });
    }
    if (userMessage.length > 2000) {
        return res.status(400).json({ error: 'Message is too long (2000 character max).' });
    }

    const testerId = testerIdFor(req);
    if (isRateLimited(testerId)) {
        return res.status(429).json({ error: `Sandbox rate limit reached (${RATE_LIMIT_MAX} messages/hour). Try again later.` });
    }

    try {
        const reply = await withConnection(async (connection) => {
            await ensureTable(connection);

            const [historyRows] = await connection.execute(
                `SELECT role, content FROM ai_tutor_messages WHERE session_id = ? ORDER BY id ASC LIMIT 40`,
                [sessionId]
            );

            await connection.execute(
                `INSERT INTO ai_tutor_messages (session_id, tester_id, chapter_context, role, content) VALUES (?, ?, ?, 'user', ?)`,
                [sessionId, testerId, chapter_context || null, userMessage]
            );

            const history = [...historyRows, { role: 'user', content: userMessage }];
            const reply = await getTutorReply({ history, chapterContext: chapter_context || null });

            await connection.execute(
                `INSERT INTO ai_tutor_messages (session_id, tester_id, chapter_context, role, content) VALUES (?, ?, ?, 'assistant', ?)`,
                [sessionId, testerId, chapter_context || null, reply]
            );

            return reply;
        });
        recordRequest(testerId);
        res.json({ reply });
    } catch (err) {
        console.error('[ai-tutor] message failed:', err);
        res.status(500).json({ error: err.message || 'The AI tutor failed to respond. Try again.' });
    }
});

router.get('/admin/ai-tutor/history', async (req, res) => {
    const sessionId = String(req.query.session_id || '').trim();
    if (!sessionId) return res.status(400).json({ error: 'session_id is required' });
    try {
        const rows = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [rows] = await connection.execute(
                `SELECT role, content, created_at FROM ai_tutor_messages WHERE session_id = ? ORDER BY id ASC`,
                [sessionId]
            );
            return rows;
        });
        res.json({ messages: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load conversation history' }); }
});

// Every past sandbox conversation, newest first -- the "teacher-visible
// transcript" half of the FERPA story: nothing here is private between a
// tester and the model, by design.
router.get('/admin/ai-tutor/sessions', async (req, res) => {
    try {
        const rows = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [rows] = await connection.execute(`
                SELECT session_id, MIN(tester_id) AS tester_id, MAX(chapter_context) AS chapter_context,
                       COUNT(*) AS message_count, MAX(created_at) AS last_activity
                FROM ai_tutor_messages
                GROUP BY session_id
                ORDER BY last_activity DESC
                LIMIT 100
            `);
            return rows;
        });
        res.json({ sessions: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load sessions' }); }
});

module.exports = router;
