// server/routes/wprCfa.js
// The PLC team's review of the draft baseline CFA (wpr-practice/cfa-review.html): 50 questions, 2 per Nevada
// employability indicator plus extras, each with alternates. Teachers with the WPR teacher passcode mark each
// question Keep or Swap (and which alternate), with an optional note; everyone sees everyone's votes.
// The draft holds an answer key, so it lives on the server only (WPR_CFA_DRAFT), never in this public repo.
// Votes hold a teacher's typed name and their choices, nothing about students.
const express = require('express');
const router = express.Router();
const fs = require('fs');
const { withConnection } = require('../db');
const { passcodeOk } = require('./wprBanks');

const DRAFT = process.env.WPR_CFA_DRAFT || '/var/lib/chs-site/wpr-cfa-draft.json';

async function ensureTable(c) {
    await c.execute(`
        CREATE TABLE IF NOT EXISTS wpr_cfa_votes (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            item_key   VARCHAR(20) NOT NULL,
            reviewer   VARCHAR(60) NOT NULL,
            vote       VARCHAR(8) NOT NULL,
            swap_to    VARCHAR(20) NULL,
            note       VARCHAR(500) NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_item_reviewer (item_key, reviewer)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
function readDraft() {
    try { return JSON.parse(fs.readFileSync(DRAFT, 'utf8')); } catch (e) { return null; }
}

// GET /wpr/cfa/review -> the draft and every reviewer's votes
router.get('/wpr/cfa/review', async (req, res) => {
    if (!passcodeOk(req)) return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    const draft = readDraft();
    if (!draft) return res.status(404).json({ error: 'There is no CFA draft to review yet.' });
    try {
        const votes = await withConnection(async (c) => {
            await ensureTable(c);
            const [rows] = await c.execute('SELECT item_key, reviewer, vote, swap_to, note, updated_at FROM wpr_cfa_votes ORDER BY updated_at');
            return rows;
        });
        res.set('Cache-Control', 'no-store');
        res.json({ title: draft.title, items: draft.items, votes });
    } catch (e) { console.error('[wpr-cfa] review', e); res.status(500).json({ error: 'Could not load the review.' }); }
});

// POST /wpr/cfa/review/vote -- { key, reviewer, vote: 'keep' | 'swap' | 'clear', swapTo, note }
router.post('/wpr/cfa/review/vote', async (req, res) => {
    if (!passcodeOk(req)) return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    const draft = readDraft();
    const b = req.body || {};
    const item = draft && draft.items.find(i => i.key === b.key);
    if (!item) return res.status(404).json({ error: 'That question isn\'t in the draft.' });
    const reviewer = clean(b.reviewer, 60);
    if (reviewer.length < 2) return res.status(400).json({ error: 'Type your name first, so the team knows whose vote it is.' });
    const vote = ['keep', 'swap', 'clear'].includes(b.vote) ? b.vote : null;
    if (!vote) return res.status(400).json({ error: 'Pick Keep or Swap.' });
    const swapTo = vote === 'swap' && item.alternates.some(a => a.key === b.swapTo) ? b.swapTo : null;
    try {
        await withConnection(async (c) => {
            await ensureTable(c);
            if (vote === 'clear') await c.execute('DELETE FROM wpr_cfa_votes WHERE item_key = ? AND reviewer = ?', [item.key, reviewer]);
            else await c.execute(`INSERT INTO wpr_cfa_votes (item_key, reviewer, vote, swap_to, note) VALUES (?, ?, ?, ?, ?)
                                  ON DUPLICATE KEY UPDATE vote = VALUES(vote), swap_to = VALUES(swap_to), note = VALUES(note)`,
                [item.key, reviewer, vote, swapTo, clean(b.note, 500) || null]);
        });
        res.json({ success: true });
    } catch (e) { console.error('[wpr-cfa] vote', e); res.status(500).json({ error: 'Could not save your vote.' }); }
});

module.exports = router;
