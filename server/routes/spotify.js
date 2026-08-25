require('dotenv').config({ quiet: true });
const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// ==============================================================================
// AUTH: one-time teacher connection. Students never authenticate with Spotify
// at all -- they only ever talk to our own /api endpoints. Only the teacher's
// single account needs to grant playlist-modify access, once, via the normal
// OAuth authorization-code flow. The resulting refresh token is stored in the
// DB and silently renewed forever after (Spotify refresh tokens don't expire
// on their own; only the short-lived access token needs periodic renewal).
// ==============================================================================

router.get('/spotify/connect', (req, res) => {
    const scope = 'playlist-modify-public playlist-modify-private';
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope,
        // Without this, Spotify silently skips the approval screen (and re-issues
        // whatever scope was already on file) for an account that's connected
        // before -- which defeats the point of reconnecting to pick up new scopes.
        show_dialog: 'true'
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

router.get('/spotify/callback', async (req, res) => {
    const { code, error } = req.query;
    if (error || !code) {
        return res.status(400).send(`Spotify authorization failed: ${error || 'no code returned'}`);
    }
    try {
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI
            })
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Token exchange failed');
        console.log('[spotify] connected -- granted scope:', tokenData.scope);

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        const connection = await getDbConnection();
        await connection.execute(
            `INSERT INTO spotify_auth (id, access_token, refresh_token, expires_at) VALUES (1, ?, ?, ?)
             ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), refresh_token = VALUES(refresh_token), expires_at = VALUES(expires_at)`,
            [tokenData.access_token, tokenData.refresh_token, expiresAt]
        );
        await connection.release();

        res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:4rem;">
            <h2>&#9989; Spotify connected!</h2>
            <p>You can close this tab and go back to the Song Requests page to set your playlist.</p>
        </body></html>`);
    } catch (err) {
        console.error('[spotify] callback error:', err);
        res.status(500).send('Failed to complete Spotify connection: ' + err.message);
    }
});

// Returns a valid access token, refreshing it first if it's expired or about
// to expire. Every route below that calls the Spotify API goes through this
// instead of touching the stored access_token directly.
async function getValidAccessToken(connection) {
    const [rows] = await connection.execute('SELECT access_token, refresh_token, expires_at FROM spotify_auth WHERE id = 1');
    if (rows.length === 0) throw new Error('Spotify is not connected yet.');
    const { access_token, refresh_token, expires_at } = rows[0];

    const bufferMs = 60 * 1000; // refresh a minute early rather than cutting it exactly at expiry
    if (new Date(expires_at).getTime() - Date.now() > bufferMs) {
        return access_token;
    }

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token })
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(data.error_description || 'Failed to refresh Spotify token');

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    // Spotify only sometimes rotates the refresh token itself on renewal; keep the old one if a new one wasn't issued.
    await connection.execute(
        'UPDATE spotify_auth SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = 1',
        [data.access_token, data.refresh_token || refresh_token, newExpiresAt]
    );
    return data.access_token;
}

router.get('/spotify/status', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT playlist_id, playlist_name FROM spotify_auth WHERE id = 1');
        await connection.release();
        res.json({
            connected: rows.length > 0,
            playlist_id: rows[0]?.playlist_id || null,
            playlist_name: rows[0]?.playlist_name || null
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to check Spotify status' }); }
});

// Accepts either a raw playlist ID or a full Spotify playlist URL/URI and
// records it as the approval target, after confirming it's a real playlist
// this account can actually add tracks to.
router.post('/spotify/set-playlist', async (req, res) => {
    const { playlist } = req.body;
    if (!playlist) return res.status(400).json({ error: 'playlist is required' });
    const idMatch = String(playlist).match(/playlist[\/:]([a-zA-Z0-9]+)/) || String(playlist).match(/^([a-zA-Z0-9]{22})$/);
    const playlistId = idMatch ? idMatch[1] : null;
    if (!playlistId) return res.status(400).json({ error: 'Could not find a playlist ID in that link.' });

    try {
        const connection = await getDbConnection();
        const accessToken = await getValidAccessToken(connection);
        const plRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const plData = await plRes.json();
        if (!plRes.ok) {
            await connection.release();
            return res.status(400).json({ error: plData.error?.message || 'Could not find that playlist.' });
        }
        await connection.execute('UPDATE spotify_auth SET playlist_id = ?, playlist_name = ? WHERE id = 1', [plData.id, plData.name]);
        await connection.release();
        res.json({ success: true, playlist_id: plData.id, playlist_name: plData.name });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ==============================================================================
// SEARCH + REQUEST + APPROVAL
// ==============================================================================

router.get('/spotify/search', async (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ tracks: [] });
    try {
        const connection = await getDbConnection();
        let token;
        try {
            // Spotify requires the app owner's account to have an active
            // Premium subscription for search calls made with an app-only
            // (client-credentials) token -- a policy change, not something
            // fixable in code. Routing through the teacher's own authorized
            // connection avoids that restriction entirely.
            token = await getValidAccessToken(connection);
        } finally {
            await connection.release();
        }
        const searchRes = await fetch(`https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: 'track', limit: 10 })}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await searchRes.json();
        if (!searchRes.ok) throw new Error(data.error?.message || 'Search failed');
        const tracks = (data.tracks?.items || []).map(t => ({
            id: t.id,
            name: t.name,
            artist: (t.artists || []).map(a => a.name).join(', '),
            album_art: t.album?.images?.[2]?.url || t.album?.images?.[0]?.url || null,
            uri: t.uri,
            explicit: !!t.explicit
        }));
        res.json({ tracks });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/song-requests', async (req, res) => {
    const { student_id, track_id, track_name, artist_name, album_art_url } = req.body;
    if (!student_id || !track_id || !track_name) return res.status(400).json({ error: 'student_id, track_id, and track_name are required' });
    try {
        const connection = await getDbConnection();

        // Re-check the explicit flag against Spotify directly rather than trusting
        // whatever the client sent -- this is what the teacher relies on to screen
        // requests, so it shouldn't be something a request body could misreport.
        let explicit = 0;
        try {
            const accessToken = await getValidAccessToken(connection);
            const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(track_id)}?fields=explicit`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (trackRes.ok) {
                const trackData = await trackRes.json();
                explicit = trackData.explicit ? 1 : 0;
            }
        } catch (e) { console.error('[spotify] explicit lookup failed:', e); }

        const [result] = await connection.execute(
            'INSERT INTO song_requests (student_id, track_id, track_name, artist_name, album_art_url, explicit) VALUES (?, ?, ?, ?, ?, ?)',
            [student_id, track_id, track_name, artist_name || '', album_art_url || null, explicit]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to submit request' }); }
});

router.get('/song-requests', async (req, res) => {
    const { student_id, status } = req.query;
    try {
        const connection = await getDbConnection();
        const where = [];
        const params = [];
        if (student_id) { where.push('r.student_id = ?'); params.push(student_id); }
        if (status) { where.push('r.status = ?'); params.push(status); }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [rows] = await connection.execute(
            `SELECT r.*, s.first_name, s.last_name
             FROM song_requests r
             LEFT JOIN students s ON s.student_id = r.student_id
             ${whereSql} ORDER BY r.requested_at DESC`, params
        );
        await connection.release();
        res.json({ requests: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch requests' }); }
});

// Spotify's Web API blocks every playlist-write call (add track, even
// creating a brand-new playlist) for apps in Development Mode -- verified
// this isn't a scope/config problem on our end (fresh token, correct scope,
// account on the User Management allowlist, Web API enabled, ownership all
// confirmed). Extended Quota Mode, which lifts that, has required a
// registered business entity (not an individual) since May 2025, so there's
// no path to fix this in code. On top of that, Spotify itself is blocked by
// the district network, so a spotify.com link wouldn't even load at school.
// Approving now just marks the request approved and hands back an Apple
// Music search link for the same track -- one click to find it and add it
// to the playlist manually there instead.
router.post('/song-requests/:id/approve', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT * FROM song_requests WHERE id = ?', [id]);
        if (rows.length === 0) { await connection.release(); return res.status(404).json({ error: 'Request not found' }); }
        const request = rows[0];

        await connection.execute('UPDATE song_requests SET status = "approved", decided_at = NOW() WHERE id = ?', [id]);
        await connection.release();
        const searchTerm = `${request.track_name} ${request.artist_name}`.trim();
        const appleMusicUrl = `https://music.apple.com/us/search?term=${encodeURIComponent(searchTerm)}`;
        res.json({ success: true, track_id: request.track_id, apple_music_url: appleMusicUrl });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/song-requests/:id/reject', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await getDbConnection();
        const [result] = await connection.execute('UPDATE song_requests SET status = "rejected", decided_at = NOW() WHERE id = ?', [id]);
        await connection.release();
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Request not found' });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to reject request' }); }
});

module.exports = router;
