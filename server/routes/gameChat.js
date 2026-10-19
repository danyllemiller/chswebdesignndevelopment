// server/routes/gameChat.js
// Room chat for the multiplayer review games (js/games/game-chat.js).
// One chat per review page + room code. Identity always comes from the
// session -- students show as "First L." from the students table, never a
// typed-in name -- so every message is attributable. Every message is kept
// (hidden ones too) so the teacher page (admin/tools/game-chat.html) is a
// complete log, and the teacher can hide messages or switch chat off.
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { requireLogin, requireStaff, isStaffSession } = require('../helpers');

const MAX_LEN = 150;
const MIN_GAP_MS = 2000;
const lastPostAt = new Map(); // student_id -> ms, simple per-process rate limit

async function ensureChatTables(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS game_chat_messages (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            room_key     VARCHAR(300) NOT NULL,
            student_id   VARCHAR(50) NOT NULL,
            display_name VARCHAR(80) NOT NULL,
            is_teacher   TINYINT(1) NOT NULL DEFAULT 0,
            message      VARCHAR(300) NOT NULL,
            hidden       TINYINT(1) NOT NULL DEFAULT 0,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_chat_room (room_key, id)
        )
    `);
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS game_chat_settings (
            id      TINYINT PRIMARY KEY,
            enabled TINYINT(1) NOT NULL DEFAULT 1
        )
    `);
}

async function chatEnabled(connection) {
    const [[row]] = await connection.execute('SELECT enabled FROM game_chat_settings WHERE id = 1');
    return !row || !!row.enabled;
}

// ---- School-appropriate filter -------------------------------------------
// Rejects (doesn't mask) so students get told why. Matches whole words after
// undoing common letter swaps, plus words spelled out with spaces ("f u c k"),
// without the false hits plain substring matching causes ("class", "push it").
const BLOCK_PREFIXES = ['fuck', 'fuk', 'shit', 'bitch', 'cunt', 'pussy', 'whore', 'slut', 'bastard',
    'nigg', 'fagg', 'retard', 'asshole', 'motherf', 'dumbass', 'jackass', 'porn', 'rape'];
const BLOCK_WORDS = new Set(['ass', 'asses', 'dick', 'dicks', 'dickhead', 'cock', 'cocks', 'fag', 'fags',
    'tits', 'titties', 'boobs', 'hoe', 'hoes', 'kys', 'stfu', 'wtf', 'fu', 'nig', 'pedo', 'sex', 'sexy', 'damn', 'dammit']);
const BLOCK_PHRASES = ['kill yourself', 'kill urself', 'go die'];
const LEET = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't' };

function isBlocked(text) {
    const lower = text.toLowerCase();
    if (BLOCK_PHRASES.some(p => lower.replace(/\s+/g, ' ').includes(p))) return true;
    const norm = lower.replace(/[01!34@5$7+]/g, c => LEET[c]).replace(/(.)\1{2,}/g, '$1$1');
    const words = norm.split(/[^a-z]+/).filter(Boolean);
    const hit = w => BLOCK_WORDS.has(w) || BLOCK_PREFIXES.some(p => w.startsWith(p));
    if (words.some(hit)) return true;
    // Runs of single letters ("f u c k") collapse into one word and get checked too.
    const singles = norm.split(/[^a-z]+/).reduce((acc, w) => {
        if (w.length === 1) acc[acc.length - 1] += w; else acc.push('');
        return acc;
    }, ['']).filter(w => w.length >= 3);
    return singles.some(w => hit(w) || BLOCK_PREFIXES.some(p => w.includes(p)));
}

function cleanRoomKey(raw) {
    const key = String(raw || '').trim();
    return key && key.length <= 300 ? key : null;
}

// GET /game-chat?room=...&after=ID -- new messages in a room since ID
router.get('/game-chat', requireLogin, async (req, res) => {
    const room = cleanRoomKey(req.query.room);
    if (!room) return res.status(400).json({ error: 'room is required' });
    const after = Math.max(0, parseInt(req.query.after, 10) || 0);
    try {
        const out = await withConnection(async (connection) => {
            await ensureChatTables(connection);
            const enabled = await chatEnabled(connection);
            if (!enabled) return { enabled: false, messages: [], hiddenIds: [] };
            // First load (after=0) gets the last 50; later polls get only new ones.
            const me = String(req.session.user.student_id);
            const cols = 'id, display_name, is_teacher, message, created_at, (student_id = ?) AS mine';
            const [rows] = after
                ? await connection.execute(
                    `SELECT ${cols} FROM game_chat_messages WHERE room_key = ? AND id > ? AND hidden = 0 ORDER BY id LIMIT 100`,
                    [me, room, after])
                : await connection.execute(
                    `SELECT * FROM (SELECT ${cols} FROM game_chat_messages WHERE room_key = ? AND hidden = 0 ORDER BY id DESC LIMIT 50) t ORDER BY id`,
                    [me, room]);
            // Lets open chat windows drop messages the teacher hid after they were shown.
            const [hidden] = await connection.execute(
                'SELECT id FROM game_chat_messages WHERE room_key = ? AND hidden = 1 AND created_at > NOW() - INTERVAL 1 DAY',
                [room]);
            return { enabled: true, messages: rows, hiddenIds: hidden.map(h => h.id) };
        });
        res.json(out);
    } catch (err) {
        console.error('[game-chat] read error:', err);
        res.status(500).json({ error: 'Failed to load chat.' });
    }
});

// POST /game-chat -- { room, message }
router.post('/game-chat', requireLogin, async (req, res) => {
    const room = cleanRoomKey(req.body && req.body.room);
    const message = String((req.body && req.body.message) || '').replace(/\s+/g, ' ').trim();
    if (!room) return res.status(400).json({ error: 'room is required' });
    if (!message) return res.status(400).json({ error: 'Type a message first.' });
    if (message.length > MAX_LEN) return res.status(400).json({ error: `Keep it under ${MAX_LEN} characters.` });

    const user = req.session.user;
    const staff = isStaffSession(req);
    const now = Date.now();
    if (!staff && now - (lastPostAt.get(user.student_id) || 0) < MIN_GAP_MS) {
        return res.status(429).json({ error: 'Slow down a little.' });
    }
    if (!staff && isBlocked(message)) {
        return res.status(400).json({ error: 'That message isn\'t school-appropriate. Try again.' });
    }
    try {
        const out = await withConnection(async (connection) => {
            await ensureChatTables(connection);
            if (!(await chatEnabled(connection))) return { status: 403, body: { error: 'Chat is turned off right now.' } };
            const [[s]] = await connection.execute(
                'SELECT first_name, last_name FROM students WHERE student_id = ? LIMIT 1', [user.student_id]);
            const name = staff ? 'Teacher'
                : s ? `${s.first_name} ${String(s.last_name || '').charAt(0)}.`.trim() : String(user.username || 'Student');
            const [r] = await connection.execute(
                'INSERT INTO game_chat_messages (room_key, student_id, display_name, is_teacher, message) VALUES (?, ?, ?, ?, ?)',
                [room, String(user.student_id), name, staff ? 1 : 0, message]);
            return { status: 200, body: { success: true, id: r.insertId } };
        });
        if (out.status === 200 && !staff) lastPostAt.set(user.student_id, now);
        res.status(out.status).json(out.body);
    } catch (err) {
        console.error('[game-chat] post error:', err);
        res.status(500).json({ error: 'Message didn\'t send -- try again.' });
    }
});

// ---- Teacher -----------------------------------------------------------------

// GET /admin/game-chat?days=N -- every message (hidden included), newest first
router.get('/admin/game-chat', requireStaff, async (req, res) => {
    const days = Math.min(30, Math.max(1, parseInt(req.query.days, 10) || 1));
    try {
        const out = await withConnection(async (connection) => {
            await ensureChatTables(connection);
            const [rows] = await connection.execute(
                `SELECT id, room_key, student_id, display_name, is_teacher, message, hidden, created_at
                 FROM game_chat_messages WHERE created_at > NOW() - INTERVAL ${days} DAY
                 ORDER BY id DESC LIMIT 500`);
            return { enabled: await chatEnabled(connection), messages: rows };
        });
        res.json(out);
    } catch (err) {
        console.error('[game-chat] admin list error:', err);
        res.status(500).json({ error: 'Failed to load chat log.' });
    }
});

// POST /admin/game-chat/hide -- { id, hidden }
router.post('/admin/game-chat/hide', requireStaff, async (req, res) => {
    const id = Number(req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'id is required' });
    const hidden = req.body.hidden === false ? 0 : 1;
    try {
        await withConnection(async (connection) => {
            await ensureChatTables(connection);
            await connection.execute('UPDATE game_chat_messages SET hidden = ? WHERE id = ?', [hidden, id]);
        });
        res.json({ success: true });
    } catch (err) {
        console.error('[game-chat] hide error:', err);
        res.status(500).json({ error: 'Failed to update message.' });
    }
});

// POST /admin/game-chat/enabled -- { enabled }
router.post('/admin/game-chat/enabled', requireStaff, async (req, res) => {
    const enabled = req.body && req.body.enabled ? 1 : 0;
    try {
        await withConnection(async (connection) => {
            await ensureChatTables(connection);
            await connection.execute(
                'INSERT INTO game_chat_settings (id, enabled) VALUES (1, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)',
                [enabled]);
        });
        res.json({ success: true, enabled: !!enabled });
    } catch (err) {
        console.error('[game-chat] toggle error:', err);
        res.status(500).json({ error: 'Failed to change chat setting.' });
    }
});

module.exports = router;
module.exports.isBlocked = isBlocked;
