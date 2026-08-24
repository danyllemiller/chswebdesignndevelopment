require('dotenv').config();
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
        scope
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

// App-only token for catalog search -- doesn't need the teacher's own
// authorization, so this is independent of whether /spotify/connect has run.
let clientCredsCache = { token: null, expiresAt: 0 };
async function getClientCredentialsToken() {
    if (clientCredsCache.token && clientCredsCache.expiresAt > Date.now() + 60000) {
        return clientCredsCache.token;
    }
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' })
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(data.error_description || 'Failed to get Spotify search token');
    clientCredsCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
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
        const token = await getClientCredentialsToken();
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
            uri: t.uri
        }));
        res.json({ tracks });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/song-requests', async (req, res) => {
    const { student_id, track_id, track_name, artist_name, album_art_url } = req.body;
    if (!student_id || !track_id || !track_name) return res.status(400).json({ error: 'student_id, track_id, and track_name are required' });
    try {
        const connection = await getDbConnection();
        const [result] = await connection.execute(
            'INSERT INTO song_requests (student_id, track_id, track_name, artist_name, album_art_url) VALUES (?, ?, ?, ?, ?)',
            [student_id, track_id, track_name, artist_name || '', album_art_url || null]
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

router.post('/song-requests/:id/approve', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT * FROM song_requests WHERE id = ?', [id]);
        if (rows.length === 0) { await connection.release(); return res.status(404).json({ error: 'Request not found' }); }
        const request = rows[0];

        const [authRows] = await connection.execute('SELECT playlist_id FROM spotify_auth WHERE id = 1');
        const playlistId = authRows[0]?.playlist_id;
        if (!playlistId) { await connection.release(); return res.status(400).json({ error: 'No playlist has been set yet.' }); }

        const accessToken = await getValidAccessToken(connection);
        const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: [`spotify:track:${request.track_id}`] })
        });
        const addData = await addRes.json();
        if (!addRes.ok) throw new Error(addData.error?.message || 'Failed to add track to playlist');

        await connection.execute('UPDATE song_requests SET status = "approved", decided_at = NOW() WHERE id = ?', [id]);
        await connection.release();
        res.json({ success: true });
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
