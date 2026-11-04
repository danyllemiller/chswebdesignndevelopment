// server/routes/search.js
// Site search (student/search.html and the search box in the menu; students asked 2026-10-29): every chapter
// page, section by section, and a student's own notes -- the CS workspace notes (turnins), the Digital
// Notebook (notebook_entries) and guided-notebook answers -- so nobody has to open notes one at a time.
// Chapter pages are read from disk into an in-memory index on the first search and re-read when a page
// changes. Notes are read per search, only the student's own (staff can look up any student's).
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { withConnection } = require('../db');
const { requireLogin, requireSelfOrStaff } = require('../helpers');
const { sanitizeNotebookHtml } = require('../sanitizeNotebookHtml');

const ROOT = path.join(__dirname, '..', '..');
const COURSE_DIRS = [['WD1', 'year1'], ['WD2', 'year2'], ['CS', 'compsci']];

// ---- Text helpers --------------------------------------------------------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rarr: '→', larr: '←', harr: '↔', mdash: '—', ndash: '–',
    hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', times: '×', divide: '÷', copy: '©', bull: '•', middot: '·', deg: '°', trade: '™', reg: '®' };
function decode(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
        if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m;
        const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
    });
}
// A note's HTML as plain text (pictures pasted into notes can be megabytes of base64: drop them first)
const noteText = html => decode(String(html || '').replace(/data:[^"')\s]+/g, ' ').replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|p|div|li|tr|h[1-6])\b[^>]*>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 100000);

const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'and', 'or', 'is', 'are', 'for', 'on', 'with', 'how', 'what', 'why', 'do', 'does', 'it', 'my', 'i']);
// Search words: up to 8, common little words dropped unless that's all there is. A plural loses its s
// ("arrays" also finds "array"); every word already finds longer words that start with it.
function terms(q) {
    const all = (String(q || '').toLowerCase().match(/[a-z0-9]+/g) || []).slice(0, 8);
    const kept = all.filter(t => !STOP.has(t));
    return (kept.length ? kept : all).map(t => (t.length >= 5 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}
// A word that starts with the term ("databa" finds "database")
const termRe = t => new RegExp(`(?<![a-z0-9])${t}`, 'g');
const count = (s, t) => (s.match(termRe(t)) || []).length;

// A short piece of text around the first match, as parts with the matching words marked
function snippet(text, ts) {
    const lower = text.toLowerCase();
    let first = -1;
    for (const t of ts) { const m = termRe(t).exec(lower); if (m && (first < 0 || m.index < first)) first = m.index; }
    if (first < 0) first = 0;
    let start = Math.max(0, first - 70), end = Math.min(text.length, first + 170);
    if (start > 0) { const sp = text.indexOf(' ', start); if (sp > -1 && sp < first) start = sp + 1; }
    if (end < text.length) { const sp = text.lastIndexOf(' ', end); if (sp > first) end = sp; }
    const win = text.slice(start, end), wl = lower.slice(start, end), hits = [];
    for (const t of ts) {
        const re = termRe(t); let m;
        while ((m = re.exec(wl))) { let e = m.index + t.length; while (e < wl.length && /[a-z0-9]/.test(wl[e])) e++; hits.push([m.index, e]); }
    }
    hits.sort((a, b) => a[0] - b[0]);
    const parts = []; let at = 0;
    for (const [a, b] of hits) { if (a < at) continue; if (a > at) parts.push({ t: win.slice(at, a) }); parts.push({ t: win.slice(a, b), hit: true }); at = b; }
    if (at < win.length) parts.push({ t: win.slice(at) });
    return { before: start > 0, after: end < text.length, parts };
}

// ---- The chapter index ---------------------------------------------------
// The CS chapters open inside the CS workspace (cs-interactive.html), which can jump straight to a chapter
// and a section; everything else opens as its own page at the section.
function csChapters() {
    try {
        const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'cs-course-map.json'), 'utf8')).courseMap || [];
        const byFile = {};
        map.forEach(u => (u.chapters || []).forEach(c => { byFile[c.file] = { unit: u.unitNum, ch: c.ch, title: c.title }; }));
        return byFile;
    } catch (e) { return {}; }
}

// One page as its sections: a new section starts at each h2/h3, anchored at the heading's id or else the
// nearest id before it (WD chapters wrap sections in <section id>, CS chapters put ids on the headings).
function pageSections(html) {
    html = html.replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(script|style|noscript|svg|template|nav|footer|select|textarea|button)\b[\s\S]*?<\/\1>/gi, ' ');
    const h1 = (/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || [])[1];
    const titleTag = (/<title>([\s\S]*?)<\/title>/i.exec(html) || [])[1];
    const clean = s => decode(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const title = clean(h1) || clean(titleTag).split(' | ')[0];
    const body = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html) || [null, html])[1];
    const sections = [];
    let lastId = '', cur = { id: '', heading: '', parts: [] }, inHeading = null, headParts = [];
    const push = () => {
        const text = cur.parts.join('').replace(/\s+/g, ' ').trim();
        if (text.length > 15 || cur.heading) sections.push({ id: cur.id, heading: cur.heading, text, lower: text.toLowerCase(), headLower: cur.heading.toLowerCase() });
    };
    const re = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>|([^<]+)/gi; let m;
    while ((m = re.exec(body))) {
        if (m[4] !== undefined) { (inHeading ? headParts : cur.parts).push(decode(m[4])); continue; }
        const closing = m[1] === '/', tag = m[2].toLowerCase();
        const id = closing ? null : (/\bid\s*=\s*["']([^"']+)["']/i.exec(m[3] || '') || [])[1];
        if (id && /^(section|article|div|h[1-4])$/.test(tag) && !/placeholder|shield|^nav|^footer/i.test(id)) lastId = id;
        if (!closing && (tag === 'h2' || tag === 'h3')) { push(); cur = { id: id || lastId, heading: '', parts: [] }; inHeading = tag; headParts = []; continue; }
        if (closing && tag === inHeading) { cur.heading = headParts.join('').replace(/\s+/g, ' ').trim(); inHeading = null; continue; }
        if (/^(p|div|li|br|tr|td|th|h[1-6]|section|article|ul|ol|table|blockquote)$/.test(tag)) (inHeading ? headParts : cur.parts).push(' ');
    }
    push();
    return { title, sections };
}

let index = null, checkedAt = 0, signature = '';
function chapterIndex() {
    const now = Date.now();
    if (index && now - checkedAt < 60000) return index;
    checkedAt = now;
    const files = [];
    for (const [course, dir] of COURSE_DIRS) {
        let names = [];
        try { names = fs.readdirSync(path.join(ROOT, dir)).filter(n => n.endsWith('.html')); } catch (e) { continue; }
        for (const name of names) {
            try { const st = fs.statSync(path.join(ROOT, dir, name)); files.push({ course, dir, name, mtime: st.mtimeMs }); } catch (e) { /* gone */ }
        }
    }
    const sig = files.map(f => `${f.dir}/${f.name}:${f.mtime}`).join('|');
    if (index && sig === signature) return index;
    const cs = csChapters();
    index = files.map(f => {
        let parsed;
        try { parsed = pageSections(fs.readFileSync(path.join(ROOT, f.dir, f.name), 'utf8')); } catch (e) { return null; }
        const chapter = f.course === 'CS' ? cs[f.name] : null;
        const title = chapter ? `Chapter ${chapter.ch}: ${String(chapter.title).replace(/^Ch(apter)?\s*\d+:\s*/i, '')}` : parsed.title || f.name;
        const link = id => chapter
            ? `/cs-interactive.html?goto=chapter&unit=${chapter.unit}&ch=${chapter.ch}${id ? `&sec=${encodeURIComponent(id)}` : ''}`
            : `/${f.dir}/${f.name}${id ? `#${encodeURIComponent(id)}` : ''}`;
        return { course: f.course, title, titleLower: title.toLowerCase(), unit: chapter ? chapter.unit : null, link, sections: parsed.sections };
    }).filter(Boolean);
    signature = sig;
    return index;
}

// GET /search/chapters?q=&courses=WD1,WD2,CS -> chapters with their best-matching sections
router.get('/search/chapters', requireLogin, (req, res) => {
    const ts = terms(req.query.q);
    if (!ts.length) return res.json({ results: [] });
    const want = new Set(String(req.query.courses || '').split(',').filter(c => ['WD1', 'WD2', 'CS'].includes(c)));
    const phrase = ts.length > 1 ? ts.join(' ') : '';
    const pages = [];
    for (const page of chapterIndex()) {
        if (want.size && !want.has(page.course)) continue;
        const titleBonus = ts.reduce((s, t) => s + (count(page.titleLower, t) ? 3 : 0), 0);
        const secs = [];
        for (const sec of page.sections) {
            let score = 0, all = true;
            for (const t of ts) {
                const inText = count(sec.lower, t), inHead = count(sec.headLower, t);
                if (!inText && !inHead) { all = false; break; }
                score += Math.min(inText, 8) + (inHead ? 6 : 0);
            }
            if (!all) continue;
            if (phrase && sec.lower.replace(/[^a-z0-9]+/g, ' ').includes(phrase)) score += 10;
            secs.push({ sec, score: score + titleBonus });
        }
        if (!secs.length) continue;
        secs.sort((a, b) => b.score - a.score);
        pages.push({
            course: page.course, title: page.title, unit: page.unit, url: page.link(''), score: secs[0].score, matches: secs.length,
            sections: secs.slice(0, 3).map(({ sec }) => ({ heading: sec.heading, url: page.link(sec.id), snippet: snippet(sec.text, ts) }))
        });
    }
    pages.sort((a, b) => b.score - a.score);
    res.set('Cache-Control', 'no-store');
    res.json({ terms: ts, results: pages.slice(0, 20), pages: pages.length });
});

// ---- A student's notes ---------------------------------------------------
// Where a CS note's chapter is in the workspace: notes are labeled like "Unit 6 - Ch 14: Advanced Data
// Structures", and chapter numbers have moved over the year, so it's found by its name.
function csNoteLink(label) {
    const name = String(label || '').split(':').slice(1).join(':').trim().toLowerCase();
    if (name) for (const [, c] of Object.entries(csChapters())) {
        if (String(c.title || '').replace(/^Ch(apter)?\s*\d+:\s*/i, '').toLowerCase() === name) return `/cs-interactive.html?goto=chapter&unit=${c.unit}&ch=${c.ch}`;
    }
    return '/cs-interactive.html';
}
// Guided-notebook answers are saved per block; the student's words are the strings inside
function guidedText(json) {
    const out = [];
    (function walk(v) { if (typeof v === 'string') { if (v.trim() && !/^\d{4}-\d\d-\d\d/.test(v)) out.push(v.trim()); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); })(json?.blocks || json);
    return out.join(' · ');
}
const dateOf = d => (d ? new Date(d).toISOString() : null);

// GET /student/search-notes?student_id=&q= -> the student's notes that have every search word
router.get('/student/search-notes', requireSelfOrStaff('student_id'), async (req, res) => {
    const ts = terms(req.query.q);
    if (!ts.length) return res.json({ results: [] });
    const sid = String(req.query.student_id);
    // The longest word narrows it down in the database first, so a student with hundreds of notes doesn't
    // load them all; the exact check happens on the note's text below.
    const like = `%${ts.slice().sort((a, b) => b.length - a.length)[0]}%`;
    try {
        const notes = await withConnection(async (c) => {
            const [cs] = await c.execute(
                `SELECT id, chapter, title, category, content, timestamp FROM turnins
                 WHERE student_id = ? AND (title LIKE ? OR chapter LIKE ? OR content LIKE ?) ORDER BY timestamp DESC LIMIT 400`, [sid, like, like, like]);
            let nb = [], gd = [];
            try {
                [nb] = await c.execute(`SELECT id, chapter_id, title, category, content, updated_at FROM notebook_entries
                    WHERE student_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC LIMIT 200`, [sid, like, like]);
            } catch (e) { /* no notebook table yet */ }
            try {
                [gd] = await c.execute(`SELECT chapter_id, day, data_json, updated_at FROM guided_notebook_responses
                    WHERE student_id = ? AND data_json LIKE ? ORDER BY updated_at DESC LIMIT 100`, [sid, like]);
            } catch (e) { /* no guided notebook table yet */ }
            return [
                ...cs.map(r => ({ source: 'cs', id: r.id, title: r.title || 'Untitled', where: r.chapter || '', category: r.category || 'Notes', date: dateOf(r.timestamp), text: noteText(r.content), open: csNoteLink(r.chapter) })),
                ...nb.map(r => ({ source: 'notebook', id: r.id, title: r.title || 'Untitled Note', where: `Chapter ${r.chapter_id}`, category: r.category || 'Notes', date: dateOf(r.updated_at), text: noteText(r.content), open: '/student/notes.html' })),
                ...gd.map(r => {
                    let json = null; try { json = JSON.parse(r.data_json); } catch (e) { /* skip */ }
                    return { source: 'guided', id: `${r.chapter_id}-${r.day}`, title: `Guided notebook, Day ${r.day}`, where: `Chapter ${r.chapter_id}`, category: 'Guided notebook', date: dateOf(r.updated_at), text: json ? guidedText(json) : '', open: null };
                })
            ];
        });
        const results = [];
        for (const n of notes) {
            const hay = `${n.title} ${n.where} ${n.text}`.toLowerCase();
            let score = 0, all = true;
            for (const t of ts) { const k = count(hay, t); if (!k) { all = false; break; } score += Math.min(k, 8) + (count(n.title.toLowerCase(), t) ? 6 : 0); }
            if (!all) continue;
            const { text, ...rest } = n;
            results.push({ ...rest, score, snippet: snippet(text || n.title, ts), length: text.length });
        }
        results.sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));
        res.set('Cache-Control', 'no-store');
        res.json({ terms: ts, results: results.slice(0, 60), total: results.length });
    } catch (e) {
        console.error('[search] notes', e);
        res.status(500).json({ error: 'Could not search your notes. Try again.' });
    }
});

// GET /student/search-note?student_id=&source=cs|notebook|guided&id= -> one whole note, safe to show
router.get('/student/search-note', requireSelfOrStaff('student_id'), async (req, res) => {
    const sid = String(req.query.student_id), source = String(req.query.source || ''), id = String(req.query.id || '');
    try {
        const note = await withConnection(async (c) => {
            if (source === 'cs') {
                const [[r]] = await c.execute('SELECT title, chapter, category, content, timestamp FROM turnins WHERE id = ? AND student_id = ?', [Number(id), sid]);
                return r && { title: r.title, where: r.chapter, html: sanitizeNotebookHtml(r.content) };
            }
            if (source === 'notebook') {
                const [[r]] = await c.execute('SELECT title, chapter_id, content FROM notebook_entries WHERE id = ? AND student_id = ?', [Number(id), sid]);
                return r && { title: r.title, where: `Chapter ${r.chapter_id}`, html: sanitizeNotebookHtml(r.content) };
            }
            if (source === 'guided') {
                const [ch, day] = id.split('-').map(Number);
                const [[r]] = await c.execute('SELECT data_json FROM guided_notebook_responses WHERE student_id = ? AND chapter_id = ? AND day = ?', [sid, ch, day]);
                let json = null; try { json = r && JSON.parse(r.data_json); } catch (e) { /* skip */ }
                return r && { title: `Guided notebook, Day ${day}`, where: `Chapter ${ch}`, text: json ? guidedText(json) : '' };
            }
            return null;
        });
        if (!note) return res.status(404).json({ error: 'That note isn\'t there anymore.' });
        res.set('Cache-Control', 'no-store');
        res.json(note);
    } catch (e) {
        console.error('[search] note', e);
        res.status(500).json({ error: 'Could not open that note. Try again.' });
    }
});

module.exports = router;
module.exports.pageSections = pageSections;   // for the tests
