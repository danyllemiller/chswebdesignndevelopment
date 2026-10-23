// server/routes/siteVersion.js
// GET /api/site-version: a fingerprint of the site's own JavaScript and CSS
// (the newest modification time under js/ and css/). js/update-notice.js
// polls it so a page opened before a deploy can tell the student "the site
// was just updated, refresh." Static files change on every `git pull`, with
// or without a server restart, so this reads the files rather than anything
// cached at startup. Public on purpose: it reveals nothing but a number.
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const ROOT = path.join(__dirname, '..', '..');
const DIRS = ['js', 'css'];
let cache = { at: 0, v: null };

function newestMtime(dir, depth = 0) {
    let newest = 0;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return 0; }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (depth < 4) newest = Math.max(newest, newestMtime(full, depth + 1)); }
        else if (/\.(js|css)$/.test(e.name)) {
            try { newest = Math.max(newest, fs.statSync(full).mtimeMs); } catch (err) { /* vanished mid-scan */ }
        }
    }
    return newest;
}

router.get('/site-version', (req, res) => {
    if (Date.now() - cache.at > 60 * 1000) {
        cache = { at: Date.now(), v: String(Math.round(Math.max(...DIRS.map(d => newestMtime(path.join(ROOT, d)))))) };
    }
    res.set('Cache-Control', 'no-store');
    res.json({ v: cache.v });
});

module.exports = router;
