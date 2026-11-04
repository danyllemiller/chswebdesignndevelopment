// scripts/learning-notebook/csDocx.js
// Reads the CS Guided Notebook (curriculum/CS Guided Notebook (2026-2027).docx, kept out of
// this public repo by .gitignore) into lessons for build.js. CS students already work in
// that notebook on paper, one page per lesson day, so the Learning Notebook keeps each
// day's page as its guided (right-hand) page: Do Now, the activity (fill in the blank,
// think-pair-share, lab worksheet, discussion, checkpoint, project brief), and writing
// space. The day's exit ticket moves to the exit strip on the facing thinking page.
//
// The document has no heading styles, so days are found by their header line
// ("UNIT 1 · DAY 3 OF 6 · DISCUSSION") and the parts by their labels. Every empty table in
// it is writing space (boxes like Think and Share hold theirs inside); its row count sets
// how much of the page that space gets.
const { execFileSync } = require('child_process');

const unxml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// Just enough of an XML tree: element names, children and text, for w:body and below
function tree(xml) {
    const root = { name: '#root', kids: [] }, stack = [root];
    const re = /<(\/?)([\w:]+)([^>]*?)(\/?)>|([^<]+)/g;
    for (let m; (m = re.exec(xml));) {
        const top = stack[stack.length - 1];
        if (m[5] !== undefined) { if (top.name === 'w:t') top.kids.push(unxml(m[5])); continue; }
        if (m[2].startsWith('?') || m[2].startsWith('!')) continue;
        if (m[1]) { stack.pop(); continue; }
        const el = { name: m[2], kids: [] };
        top.kids.push(el);
        if (!m[4]) stack.push(el);
    }
    return root;
}
const kids = (el, name) => el.kids.filter(k => typeof k !== 'string' && k.name === name);
const find = (el, name) => { if (el.name === name) return el; for (const k of el.kids) if (typeof k !== 'string') { const f = find(k, name); if (f) return f; } return null; };
// A paragraph's text, tabs included (the fill-in blanks use them)
function paraText(p) {
    let out = '';
    const walk = el => el.kids.forEach(k => {
        if (typeof k === 'string') return;
        if (k.name === 'w:t') out += k.kids.join('');
        else if (k.name === 'w:tab') out += '\t';
        else if (k.name === 'w:br') out += '\n';
        else if (k.name !== 'w:pPr' && k.name !== 'w:rPr') walk(k);
    });
    walk(p);
    return out;
}
const allText = el => { let s = ''; const w = e => e.kids.forEach(k => { if (typeof k !== 'string') { if (k.name === 'w:t') s += k.kids.join(''); else w(k); } }); w(el); return s.trim(); };
// A table cell's contents in order: its paragraphs' text, and its own tables as writing lines
function cellItems(tc) {
    const items = [];
    for (const k of tc.kids) {
        if (typeof k === 'string') continue;
        if (k.name === 'w:p') { const t = paraText(k).trim(); if (t) items.push({ text: t }); }
        else if (k.name === 'w:tbl') {
            if (!allText(k)) {
                const n = kids(k, 'w:tr').length, prev = items[items.length - 1];
                if (prev && prev.lines) prev.lines += n; else items.push({ lines: n });
            } else kids(k, 'w:tr').forEach(tr => kids(tr, 'w:tc').forEach(c => items.push(...cellItems(c))));
        }
    }
    return items;
}

const HEADER = /^UNIT (\d+)\s*·\s*DAY (\d+) OF (\d+)\s*·\s*([^\t]+)/;

function readCsDocx(file) {
    const xml = execFileSync('unzip', ['-p', file, 'word/document.xml'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
    const body = find(tree(xml), 'w:body');
    const units = new Map();
    let day = null;
    for (const el of body.kids) {
        if (typeof el === 'string' || (el.name !== 'w:p' && el.name !== 'w:tbl')) continue;
        if (el.name === 'w:p') {
            const m = HEADER.exec(paraText(el).trim());
            if (m) {
                day = { unit: +m[1], day: +m[2], of: +m[3], kind: m[4].trim(), title: '', standards: '', objectives: [], doNow: null, exit: '', parts: [], project: '' };
                if (!units.has(day.unit)) units.set(day.unit, []);
                units.get(day.unit).push(day);
                continue;
            }
        }
        if (!day) continue;
        const parts = day.parts, last = parts[parts.length - 1];
        if (el.name === 'w:tbl') {
            const rows = kids(el, 'w:tr');
            if (!allText(el)) {
                if (day._doNowLines) { day._doNowLines = false; day.doNow.lines = rows.length; continue; }
                if (last && last.type === 'lines') last.n += rows.length; else parts.push({ type: 'lines', n: rows.length });
                continue;
            }
            const rowItems = rows.map(tr => kids(tr, 'w:tc').map(cellItems));
            const first = rowItems[0].flat().map(i => i.text).filter(Boolean);
            if (/^Exit Ticket/.test(first[0])) { day.exit = (first[1] || '').trim(); continue; }
            if (/^Word Bank:/.test(first[0])) { parts.push({ type: 'bank', words: first[0].replace(/^Word Bank:\s*/, '').split(/\s*·\s*/).map(s => s.trim()).filter(Boolean) }); continue; }
            if (/^Self-check/.test(first[0])) { parts.push({ type: 'selfcheck', rows: rowItems.slice(1).map(r => (r[0][0] || {}).text).filter(Boolean) }); continue; }
            // A box: its first cell starts with a title (Think, Share, Objective, Standards...),
            // then prompts and writing space in order, row by row
            const items = [];
            const add = i => { const prev = items[items.length - 1]; if (i.lines && prev && prev.lines) prev.lines += i.lines; else items.push(i); };
            // an empty row of the box itself is a line to write on
            rows.forEach((tr, ri) => (!allText(tr) && !find(tr, 'w:tbl') ? add({ lines: 1 }) : rowItems[ri].forEach(cell => cell.forEach(add))));
            const [titleItem, ...rest] = items;
            parts.push({ type: 'box', title: titleItem && titleItem.text || '', items: rest });
            continue;
        }
        const t = paraText(el).replace(/\s+$/, ''), s = t.trim();
        if (!s) continue;
        if (!day.title) { day.title = s; continue; }
        if (/^Standards:/.test(s) || /^Practice & application day/.test(s)) { day.standards = s; continue; }
        if (/^Today I will be able to/.test(s)) continue;
        if (/^▸/.test(s) && !day.doNow) { day.objectives.push(s.replace(/^▸\s*/, '')); continue; }
        const dn = /^Do Now\s*·\s*(.+)$/.exec(s);
        if (dn) { day.doNow = { label: dn[1], prompt: '', lines: 2 }; continue; }
        if (day.doNow && !day.doNow.prompt) { day.doNow.prompt = s; day._doNowLines = true; continue; }
        const blank = /^(\d+)\.\t_+\t(.+)$/.exec(t);
        if (blank) { parts.push({ type: 'blank', n: +blank[1], text: blank[2].trim() }); continue; }
        const q = /^(\d+)\.\t(.+)$/.exec(t);
        if (q) { parts.push({ type: 'question', n: +q[1], text: q[2].trim() }); continue; }
        if (/^☐/.test(s)) { parts.push({ type: 'check', items: s.replace(/^☐\s*/, '').split(/\s{2,}☐\s*/) }); continue; }
        if (/^Unit \d+ Project Brief$/.test(s)) { parts.push({ type: 'heading', text: s }); day._projectNext = true; continue; }
        if (day._projectNext) { day._projectNext = false; day.project = s.split(/\s{2,}/)[0].trim(); parts.push({ type: 'text', text: s.replace(/\s{2,}/g, ' · '), strong: true }); continue; }
        if (s.length < 60 && !/[.?!:]$/.test(s.replace(/[)”"]$/, '')) && !/_{3,}/.test(s)) { parts.push({ type: 'heading', text: s }); continue; }
        parts.push({ type: 'text', text: s });
    }
    for (const days of units.values()) days.forEach(d => { delete d._doNowLines; delete d._projectNext; });
    return units;
}

module.exports = { readCsDocx };
