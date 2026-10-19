const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { requireLogin } = require('../helpers');

// Backs js/games/firestore-shim.js -- a drop-in replacement for the small
// slice of the Firestore v9 modular SDK (doc/getDoc/setDoc/updateDoc/
// onSnapshot) the four multiplayer review-game engines (jeopardy/hollywood/
// millionaire/smarter) already call. Those engines were built against real
// Firebase and were never rewired after the site moved off it onto its own
// server + MariaDB -- window.doc/getDoc/setDoc/updateDoc/onSnapshot were
// simply undefined globals, and the one guard that gated every multiplayer
// code path (`dbRef`, always passed in as `null`) meant "join room" never
// even attempted to run, let alone error visibly.
//
// One JSON blob per room, keyed by the same slash-joined path string the
// engines already build (e.g. "artifacts/chs-review-games/public/data/
// jeopardyRooms/GeneralChapterTitle_room123") -- this route doesn't care
// what the path means, it's just an opaque key.
const GAME_ROOMS_DDL = `CREATE TABLE IF NOT EXISTS game_rooms (
    room_path VARCHAR(300) PRIMARY KEY,
    state_json LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

// Firestore's updateDoc merges shallowly at the top level, but ALSO treats
// a dotted key ("activeModal.revealed") as a nested-field path rather than
// a literal key -- jeopardy.js relies on exactly this to flip one field
// inside activeModal without clobbering its siblings. Mirrors that.
function applyDotNotationMerge(state, updates) {
    Object.entries(updates).forEach(([key, value]) => {
        if (key.includes('.')) {
            const parts = key.split('.');
            let obj = state;
            for (let i = 0; i < parts.length - 1; i++) {
                if (typeof obj[parts[i]] !== 'object' || obj[parts[i]] === null) obj[parts[i]] = {};
                obj = obj[parts[i]];
            }
            obj[parts[parts.length - 1]] = value;
        } else {
            state[key] = value;
        }
    });
    return state;
}

router.get('/game-room', requireLogin, async (req, res) => {
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'path is required' });
    try {
        const result = await withConnection(async (connection) => {
            await connection.execute(GAME_ROOMS_DDL);
            const [rows] = await connection.execute('SELECT state_json FROM game_rooms WHERE room_path = ?', [path]);
            if (rows.length === 0) return { exists: false, data: null };
            return { exists: true, data: JSON.parse(rows[0].state_json) };
        });
        res.json(result);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to read game room' }); }
});

// Full replace -- mirrors Firestore's setDoc (no merge option is ever
// passed by any of the four engines, so this always overwrites).
router.post('/game-room', requireLogin, async (req, res) => {
    const { path, data } = req.body;
    if (!path || !data) return res.status(400).json({ error: 'path and data are required' });
    try {
        await withConnection(async (connection) => {
            await connection.execute(GAME_ROOMS_DDL);
            await connection.execute(
                'INSERT INTO game_rooms (room_path, state_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = NOW()',
                [path, JSON.stringify(data)]
            );
        });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to write game room' }); }
});

// Dotted-path read, the counterpart of applyDotNotationMerge's write.
function getDotPath(state, key) {
    return key.split('.').reduce((obj, part) => (obj == null ? undefined : obj[part]), state);
}

// Two optional extras on PATCH, used by the co-op games (js/games/coop-games.js)
// where several students change the same numbers at nearly the same moment:
//   increments: { "bossHp": -1, "hits.8001786": 1 }  -- added to the current
//       value inside the row lock, so simultaneous hits all count instead of
//       each client writing back its own stale total.
//   ifMatch: { "active.id": "q12", "active.resolved": false } -- the whole
//       update applies only if every listed path currently equals its value
//       (compare-and-set), so when several clients race to resolve the same
//       question, exactly one wins. Responds { applied: false } otherwise.
// Requests without either field behave exactly as before (Firestore updateDoc).
router.patch('/game-room', requireLogin, async (req, res) => {
    const { path, ifMatch, increments } = req.body;
    const updates = req.body.updates || (increments ? {} : null);
    if (!path || !updates) return res.status(400).json({ error: 'path and updates are required' });
    try {
        const applied = await withConnection(async (connection) => {
            await connection.execute(GAME_ROOMS_DDL);
            // Locks the row for the duration of this read-modify-write so two
            // near-simultaneous updates (two students buzzing in within the
            // same poll interval, say) apply in sequence instead of one
            // silently clobbering the other.
            await connection.beginTransaction();
            try {
                const [rows] = await connection.execute('SELECT state_json FROM game_rooms WHERE room_path = ? FOR UPDATE', [path]);
                const state = rows.length ? JSON.parse(rows[0].state_json) : {};
                if (ifMatch && typeof ifMatch === 'object' &&
                    !Object.entries(ifMatch).every(([k, v]) => (getDotPath(state, k) ?? null) === v)) {
                    await connection.commit();
                    return false;
                }
                applyDotNotationMerge(state, updates);
                if (increments && typeof increments === 'object') {
                    const adds = {};
                    Object.entries(increments).forEach(([k, n]) => {
                        adds[k] = (Number(getDotPath(state, k)) || 0) + (Number(n) || 0);
                    });
                    applyDotNotationMerge(state, adds);
                }
                await connection.execute(
                    'INSERT INTO game_rooms (room_path, state_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = NOW()',
                    [path, JSON.stringify(state)]
                );
                await connection.commit();
                return true;
            } catch (txErr) {
                await connection.rollback();
                throw txErr;
            }
        });
        res.json({ success: true, applied });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update game room' });
    }
});

// Team-roster-shaped rooms only (currently just Jeopardy's {teams, scores,
// cpuTeams, boardControl, activeBuzzer} shape) -- removes one player, and
// if that was the last real human (everyone left in `teams` is also in
// `cpuTeams`), deletes the room outright instead of leaving an empty shell
// behind. A deleted room's next getDoc comes back exists:false, which each
// engine's own join logic already treats as "brand new room" and
// initializes fresh -- so this is also how the CPU teams actually leave,
// not just how the room closes.
//
// This exists because jeopardy.js's own leaveGame() already does this
// exact cleanup correctly, but only when a player clicks an explicit
// "Leave Game" button -- someone who just closes the tab (the ordinary
// way a class period ends) never ran that code at all, so the room and
// its AI teams sat there forever. jeopardy.js calls this via
// navigator.sendBeacon on pagehide, which is why it's a single flat POST
// instead of the read-then-decide flow the client already does when a
// user is still present to wait on it.
router.post('/game-room/leave-team', requireLogin, async (req, res) => {
    const { path, playerName } = req.body;
    if (!path || !playerName) return res.status(400).json({ error: 'path and playerName are required' });
    try {
        const roomClosed = await withConnection(async (connection) => {
            await connection.execute(GAME_ROOMS_DDL);
            await connection.beginTransaction();
            try {
                const [rows] = await connection.execute('SELECT state_json FROM game_rooms WHERE room_path = ? FOR UPDATE', [path]);
                if (rows.length === 0) {
                    await connection.commit();
                    return null; // no room to touch, not "closed" -- caller treats this as roomClosed:false
                }
                const state = JSON.parse(rows[0].state_json);
                const teams = (state.teams || []).filter(t => t !== playerName);
                const scores = { ...(state.scores || {}) };
                delete scores[playerName];
                const cpuTeams = state.cpuTeams || [];
                const remainingHumans = teams.filter(t => !cpuTeams.includes(t));

                if (remainingHumans.length === 0) {
                    await connection.execute('DELETE FROM game_rooms WHERE room_path = ?', [path]);
                    await connection.commit();
                    return true;
                }

                state.teams = teams;
                state.scores = scores;
                if (state.boardControl === playerName) state.boardControl = teams[0];
                if (state.activeBuzzer === playerName) state.activeBuzzer = null;
                await connection.execute(
                    'INSERT INTO game_rooms (room_path, state_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = NOW()',
                    [path, JSON.stringify(state)]
                );
                await connection.commit();
                return false;
            } catch (txErr) {
                await connection.rollback();
                throw txErr;
            }
        });
        res.json({ success: true, roomClosed: !!roomClosed });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to leave game room' });
    }
});

module.exports = router;
