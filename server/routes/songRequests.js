const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

// ==============================================================================
// Song requests, backed by Apple's free iTunes Search API -- no auth, no keys,
// nothing to connect. Replaces the earlier Spotify-based version: Spotify
// itself is blocked by the district network, and automated playlist writes
// were blocked by Spotify's API besides (Development Mode restriction with no
// fix available short of a registered business entity). Apple has the same
// "can't auto-add to a playlist without a paid developer account + MusicKit"
// limitation, so the workflow stays exactly what it already was on approve:
// hand back a search link and add the track manually, one click, in Apple
// Music -- this file just also uses Apple for the search step, so nothing
// in the whole feature depends on Spotify (or its network access) at all.
// ==============================================================================

router.get('/song-search', async (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ tracks: [] });
    try {
        const searchRes = await fetch(`https://itunes.apple.com/search?${new URLSearchParams({
            term: q, media: 'music', entity: 'song', limit: 10
        })}`);
        const data = await searchRes.json();
        if (!searchRes.ok) throw new Error('Search failed');

        // Apple Music has no free API for reading a public playlist's real
        // track list (it loads client-side, not in the page's HTML) -- so
        // rather than trying to check the actual playlist, this checks
        // against song_requests instead, since every song that's ever made
        // it onto the real playlist got there by being approved here.
        // 'pending' counts too, so a student doesn't submit a duplicate of
        // someone else's request that just hasn't been decided yet.
        //
        // Matches on name+artist as well as track_id: this table has
        // requests from an earlier Spotify-based version of this feature
        // (Spotify's alphanumeric ids, not Apple's numeric ones), so
        // id-only matching would silently miss most of the existing
        // catalog -- confirmed live, 63 of 76 pending/approved rows still
        // carry a Spotify id.
        const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
        let statusByTrackId = {};
        let statusByNameArtist = {};
        const connection = await getDbConnection();
        const [existing] = await connection.execute(
            `SELECT track_id, track_name, artist_name, status FROM song_requests WHERE status IN ('pending','approved')`
        );
        await connection.release();
        existing.forEach(r => {
            // approved takes priority if a track somehow matches both an
            // approved row and a separate still-pending one
            const better = (prev) => !prev || r.status === 'approved';
            if (better(statusByTrackId[r.track_id])) statusByTrackId[r.track_id] = r.status;
            const key = `${norm(r.track_name)}|${norm(r.artist_name)}`;
            if (better(statusByNameArtist[key])) statusByNameArtist[key] = r.status;
        });

        const tracks = (data.results || []).map(t => {
            const key = `${norm(t.trackName)}|${norm(t.artistName)}`;
            const existingStatus = statusByTrackId[String(t.trackId)] || statusByNameArtist[key] || null;
            return {
                id: String(t.trackId),
                name: t.trackName,
                artist: t.artistName,
                // 100x100 is what the API returns by default; swap in a larger size for a sharper thumbnail.
                album_art: t.artworkUrl100 ? t.artworkUrl100.replace('100x100', '200x200') : null,
                explicit: t.trackExplicitness === 'explicit',
                existing_status: existingStatus
            };
        });
        res.json({ tracks });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/song-requests', async (req, res) => {
    const { student_id, track_id, track_name, artist_name, album_art_url } = req.body;
    if (!student_id || !track_id || !track_name) return res.status(400).json({ error: 'student_id, track_id, and track_name are required' });
    try {
        const connection = await getDbConnection();

        // Re-check the explicit flag against Apple directly rather than trusting
        // whatever the client sent -- this is what the teacher relies on to screen
        // requests, so it shouldn't be something a request body could misreport.
        let explicit = 0;
        try {
            const lookupRes = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(track_id)}`);
            if (lookupRes.ok) {
                const lookupData = await lookupRes.json();
                explicit = lookupData.results?.[0]?.trackExplicitness === 'explicit' ? 1 : 0;
            }
        } catch (e) { console.error('[song-search] explicit lookup failed:', e); }

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

// Apple Music has no free automated "add to playlist" API (MusicKit playlist
// writes need a paid developer account + per-user auth), so approving a
// request just marks it approved and hands back an Apple Music search link
// for the same track -- one click to find it and add it to the playlist
// manually there.
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
