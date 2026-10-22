// server/routes/guidedNotebook.js
// Interactive Guided Notebook inside My Notebook (student/notes.html): the
// printed WD1/WD2 Guided Notebook day pages (Do Now, discussion, DOK checks,
// elbow-partner Think/Share, 4-Square, project team, exit ticket) plus
// drag-and-drop word banks, sorts and ordering. Practice only -- never
// graded, nothing goes to the gradebook.
//
// The page content (with the Teacher Edition KEYs and the fill-in answers)
// is NOT in the repo, because the repo is public: one JSON file per chapter
// (ch3.json, ...) in GUIDED_NOTEBOOK_DIR on the server. Students only ever
// get prompts; answers are checked here and KEYs only go to staff.
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { withConnection } = require('../db');
const { requireSelfOrStaff } = require('../helpers');

const CONTENT_DIR = process.env.GUIDED_NOTEBOOK_DIR || '/var/lib/chs-guided-notebook';
const MAX_DATA_BYTES = 100 * 1024;

const cache = new Map(); // chapter -> { mtimeMs, data }
function loadChapter(chapter) {
    const n = Number(chapter);
    if (!Number.isInteger(n) || n < 1 || n > 99) return null;
    const file = path.join(CONTENT_DIR, `ch${n}.json`);
    let stat;
    try { stat = fs.statSync(file); } catch (e) { return null; }
    const hit = cache.get(n);
    if (hit && hit.mtimeMs === stat.mtimeMs) return hit.data;
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        cache.set(n, { mtimeMs: stat.mtimeMs, data });
        return data;
    } catch (e) { console.error(`guided notebook ch${n}.json:`, e.message); return null; }
}

function listChapters() {
    try {
        return fs.readdirSync(CONTENT_DIR)
            .map(f => (/^ch(\d+)\.json$/.exec(f) || [])[1]).filter(Boolean).map(Number).sort((a, b) => a - b)
            .map(n => { const c = loadChapter(n); return c ? { chapter: n, course: c.course, title: c.title } : null; })
            .filter(Boolean);
    } catch (e) { return []; }
}

// "A [[target]] audience" -> segments ['A ', {blank: 0}, ' audience'] with
// answers[0] = ['target']. "[[a|b]]" accepts either; the first is the one
// that goes in the word bank.
function parseBlanks(items) {
    const answers = [];
    const lines = items.map(text => {
        const segs = [];
        let last = 0;
        text.replace(/\[\[([^\]]+)\]\]/g, (m, inner, at) => {
            if (at > last) segs.push(text.slice(last, at));
            segs.push({ blank: answers.length });
            answers.push(inner.split('|').map(s => s.trim()));
            last = at + m.length;
            return m;
        });
        if (last < text.length) segs.push(text.slice(last));
        return segs;
    });
    return { lines, answers };
}

const norm = s => String(s ?? '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Deterministic shuffle so a refresh doesn't reshuffle the page under a student.
function seededShuffle(arr, seedStr) {
    let h = 2166136261;
    for (const ch of seedStr) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
        h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
        const j = h % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// What a student's browser gets: no KEYs, no answers.
function studentBlock(b, seed) {
    const { key, ...rest } = b;
    if (b.type === 'discussion') return { ...rest, prompts: b.prompts.map(p => ({ q: p.q })) };
    if (b.type === 'fields') return { ...rest, fields: b.fields.map(f => ({ label: f.label })) };
    if (b.type === 'blanks') {
        const { lines, answers } = parseBlanks(b.items);
        const bank = seededShuffle([...answers.map(a => a[0]), ...(b.distractors || [])], seed);
        return { id: b.id, type: 'blanks', title: b.title, prompt: b.prompt, lines, bank };
    }
    if (b.type === 'sort') {
        const items = seededShuffle(b.items.map((it, i) => ({ i, text: it.text })), seed);
        return { id: b.id, type: 'sort', title: b.title, prompt: b.prompt, buckets: b.buckets, items };
    }
    if (b.type === 'order') {
        let items = seededShuffle(b.items.map((text, i) => ({ i, text })), seed);
        if (items.every((it, k) => it.i === k)) items = items.slice().reverse();
        return { id: b.id, type: 'order', title: b.title, prompt: b.prompt, items };
    }
    return rest;
}

function studentChapter(c) {
    return {
        chapter: c.chapter, course: c.course, title: c.title, project: c.project,
        days: c.days.map(d => ({
            day: d.day, label: d.label || null, title: d.title, short: !!d.short, due: d.due || null, objectives: d.objectives || [],
            blocks: d.blocks.map(b => studentBlock(b, `${c.chapter}-${d.day}-${b.id}`))
        }))
    };
}

async function ensureTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS guided_notebook_responses (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            student_id  VARCHAR(50) NOT NULL,
            chapter_id  INT NOT NULL,
            day         INT NOT NULL,
            data_json   MEDIUMTEXT NOT NULL,
            updated_at  DATETIME NOT NULL,
            UNIQUE KEY uniq_student_day (student_id, chapter_id, day)
        )`);
}

router.get('/student/guided-notebook', requireSelfOrStaff(), async (req, res) => {
    const c = loadChapter(req.query.chapter);
    if (!c) return res.json({ available: false });
    try {
        const rows = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [r] = await connection.execute(
                'SELECT day, data_json, updated_at FROM guided_notebook_responses WHERE student_id = ? AND chapter_id = ?',
                [String(req.query.student_id), c.chapter]);
            return r;
        });
        const responses = {};
        // Which guided day is being taught today, from the Daily Agenda's
        // schedule. Content "agenda": {course, blocks: [block for day 1, day 2, ...]}
        // or {course, firstBlock} (day N = block firstBlock+N-1).
        let todayDay = null;
        if (c.agenda && c.agenda.course && (c.agenda.firstBlock || Array.isArray(c.agenda.blocks))) {
            try {
                const [t] = await withConnection(connection => connection.execute(
                    "SELECT block_num FROM agenda_days WHERE course = ? AND track = 'main' AND event_date = CURDATE() LIMIT 1", [c.agenda.course]));
                const n = !t.length ? null
                    : Array.isArray(c.agenda.blocks) ? c.agenda.blocks.indexOf(t[0].block_num) + 1
                    : t[0].block_num - c.agenda.firstBlock + 1;
                if (n && c.days.some(d => d.day === n)) todayDay = n;
            } catch (e) { /* no agenda table -- just no "today" */ }
        }
        rows.forEach(r => { try { responses[r.day] = JSON.parse(r.data_json); } catch (e) { /* skip bad row */ } });
        return res.json({ available: true, ...studentChapter(c), responses, todayDay });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Could not load the guided notebook.' }); }
});

router.post('/student/guided-notebook/save', requireSelfOrStaff(), async (req, res) => {
    const { student_id, chapter, day, data } = req.body || {};
    const c = loadChapter(chapter);
    if (!c || !c.days.some(d => d.day === Number(day))) return res.status(400).json({ error: 'Unknown notebook page.' });
    if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'Nothing to save.' });
    const json = JSON.stringify(data);
    if (json.length > MAX_DATA_BYTES) return res.status(413).json({ error: 'This page is too long to save. Shorten an answer and try again.' });
    try {
        await withConnection(async (connection) => {
            await ensureTable(connection);
            await connection.execute(
                `INSERT INTO guided_notebook_responses (student_id, chapter_id, day, data_json, updated_at)
                 VALUES (?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = NOW()`,
                [String(student_id), c.chapter, Number(day), json]);
        });
        return res.json({ success: true });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Could not save.' }); }
});

// Practice check for one drag-and-drop block. `reveal` sends back the
// correct answers too (the "Show me" button) -- it's practice, not a test.
router.post('/student/guided-notebook/check', requireSelfOrStaff(), (req, res) => {
    const { chapter, day, block, values, reveal } = req.body || {};
    const c = loadChapter(chapter);
    const d = c && c.days.find(x => x.day === Number(day));
    const b = d && d.blocks.find(x => x.id === block);
    if (!b) return res.status(400).json({ error: 'Unknown activity.' });
    const v = values && typeof values === 'object' ? values : {};
    if (b.type === 'blanks') {
        const { answers } = parseBlanks(b.items);
        const correct = answers.map((alts, i) => alts.some(a => norm(a) === norm(v[i])));
        return res.json({ correct, answers: reveal ? answers.map(a => a[0]) : undefined });
    }
    if (b.type === 'sort') {
        const correct = b.items.map((it, i) => norm(v[i]) === norm(it.bucket));
        return res.json({ correct, answers: reveal ? b.items.map(it => it.bucket) : undefined });
    }
    if (b.type === 'order') {
        const order = Array.isArray(v.order) ? v.order.map(Number) : [];
        const correct = b.items.map((_, pos) => order[pos] === pos);
        return res.json({ correct, answers: reveal ? b.items : undefined });
    }
    return res.status(400).json({ error: 'That activity has no auto-check.' });
});

// ---- Teacher view (admin/tools/guided-notebook.html) -- /admin/* is staff-gated in api.js
router.get('/admin/guided-notebook/chapters', (req, res) => res.json({ chapters: listChapters() }));

router.get('/admin/guided-notebook', async (req, res) => {
    const c = loadChapter(req.query.chapter);
    const d = c && c.days.find(x => x.day === Number(req.query.day));
    if (!d) return res.status(404).json({ error: 'No guided notebook page for that chapter/day.' });
    try {
        const rows = await withConnection(async (connection) => {
            await ensureTable(connection);
            const [r] = await connection.execute(
                `SELECT g.student_id, g.data_json, g.updated_at, s.first_name, s.last_name, s.section_id
                 FROM guided_notebook_responses g LEFT JOIN students s ON s.student_id = g.student_id
                 WHERE g.chapter_id = ? AND g.day = ?
                 ORDER BY s.section_id, s.last_name, s.first_name`, [c.chapter, d.day]);
            return r;
        });
        // Teacher copy: KEYs plus the answers for the drag-and-drop blocks.
        const page = {
            ...d,
            blocks: d.blocks.map(b => {
                if (b.type === 'blanks') {
                    const { lines, answers } = parseBlanks(b.items);
                    return { ...b, lines, answers: answers.map(a => a[0]) };
                }
                return b;
            })
        };
        const responses = rows.map(r => {
            let data = {};
            try { data = JSON.parse(r.data_json); } catch (e) { /* ignore */ }
            return {
                student_id: r.student_id, name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.student_id,
                section: r.section_id || '', updated_at: r.updated_at, data
            };
        });
        return res.json({ chapter: c.chapter, course: c.course, title: c.title, days: c.days.map(x => ({ day: x.day, label: x.label || null, title: x.title })), page, responses });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Could not load responses.' }); }
});

module.exports = router;
