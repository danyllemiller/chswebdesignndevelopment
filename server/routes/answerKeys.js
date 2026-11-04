// server/routes/answerKeys.js
// Teacher answer keys for the activities inside each chapter page (CS "Activity:
// The Array Refactor", WD "Milestone 2: The Schema Architect Lab", ...), shown on
// admin/answer-keys.html.
//
// The keys are NOT in the repo, because the repo is public: one JSON file per
// class and chapter (cs-ch14.json, wd-ch14.json, ...) in ANSWER_KEYS_DIR on the
// server, copied by scp. Everything here is under /admin/, so server/api.js
// already turns away anyone but the teacher's account; requireStaff is a second
// lock in case that gate's exemptions ever change.
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { requireStaff } = require('../helpers');

const CONTENT_DIR = process.env.ANSWER_KEYS_DIR || '/var/lib/chs-answer-keys';
const FILE_RE = /^(cs|wd)-ch(\d{1,2})\.json$/;

const cache = new Map(); // file -> { mtimeMs, data }
function loadKey(file) {
    const full = path.join(CONTENT_DIR, file);
    let stat;
    try { stat = fs.statSync(full); } catch (e) { return null; }
    const hit = cache.get(file);
    if (hit && hit.mtimeMs === stat.mtimeMs) return hit.data;
    try {
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        cache.set(file, { mtimeMs: stat.mtimeMs, data });
        return data;
    } catch (e) { console.error(`answer key ${file}:`, e.message); return null; }
}

// Which chapters have a key yet, so the page can show the rest as "not written yet".
router.get('/admin/answer-keys', requireStaff, (req, res) => {
    let files = [];
    try { files = fs.readdirSync(CONTENT_DIR).filter(f => FILE_RE.test(f)); } catch (e) { /* no keys yet */ }
    const keys = files.map(f => {
        const [, course, ch] = FILE_RE.exec(f);
        const k = loadKey(f);
        return k ? { course, chapter: Number(ch), title: k.title, activities: (k.activities || []).length } : null;
    }).filter(Boolean);
    res.json({ keys });
});

router.get('/admin/answer-keys/:course/:chapter', requireStaff, (req, res) => {
    const file = `${req.params.course}-ch${Number(req.params.chapter)}.json`;
    if (!FILE_RE.test(file)) return res.status(400).json({ error: 'Unknown class or chapter.' });
    const key = loadKey(file);
    if (!key) return res.status(404).json({ error: 'There is no key for this chapter yet.' });
    res.json(key);
});

module.exports = router;
