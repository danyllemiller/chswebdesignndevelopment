// server/lib/planParser.js
// Reads a student's "IEP At A Glance" or "Section 504 Student Accommodations At-A-Glance" PDF (Carson City
// School District) for the teacher's Accommodations page (admin/accommodations.html): who it's for, the plan
// dates, and the accommodations, each tagged with what the class site can do about it. Nothing is stored
// here; the teacher checks everything before saving, and the PDF itself is never kept. Goals and the
// disability category are deliberately not read.
//
// Text comes out of the PDF with positions (pdf-parse's page hook), so the IEP's three-column table
// (accommodation | frequency | location) splits by where its header's columns start, even when cells wrap.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// Each page as rows of { x, s } pieces, top to bottom
async function readRows(buffer) {
    const pages = [];
    await pdfParse(buffer, {
        pagerender: pd => pd.getTextContent({ normalizeWhitespace: true }).then(tc => {
            const rows = new Map();
            for (const it of tc.items) {
                if (!it.str || !it.str.trim()) continue;
                const y = Math.round(it.transform[5] / 2) * 2;   // pieces of one line can sit a point apart
                const row = rows.get(y) || [];
                row.push({ x: it.transform[4], w: it.width || 0, s: it.str });
                rows.set(y, row);
            }
            pages.push([...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, r]) => r.sort((a, b) => a.x - b.x)));
            return '';
        })
    });
    return pages;
}
// One row's pieces as text: a gap between pieces becomes a space, touching pieces join
function rowText(row) {
    let out = '', end = null;
    for (const p of row) { if (end !== null && p.x - end > 1.5 && !/\s$/.test(out)) out += ' '; out += p.s; end = p.x + p.w; }
    return out.replace(/\s+/g, ' ').trim();
}
const clean = s => String(s || '').replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const isoDate = s => { const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s || ''); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null; };
const after = (text, label) => { const m = new RegExp(`${label}\\s*:?\\s*(.+)`, 'i').exec(text); return m ? m[1].trim() : ''; };

// The repeated header block at the top of every IEP page, which isn't part of any list
const IEP_HEADER = /^(IEP At A Glance|Carson City School District|Date:|Student:|Student ID:|Assigned School:|Case Manager:|Disabilities:|Anticipated Diploma|School Year:|IEP Dates:|Current Grade:)/i;

function parseIep(pages) {
    const plan = { kind: 'IEP', student: {}, dates: {}, items: [] };
    const lines = pages.flat().map(r => ({ row: r, text: rowText(r) }));
    for (const { row, text } of lines) {
        // The header block has two columns: split the row where the right one starts
        const right = row.findIndex((p, i) => i > 0 && /^(School Year|IEP Dates|Current Grade)/i.test(p.s.trim()));
        const left = right > 0 ? rowText(row.slice(0, right)) : text, rest = right > 0 ? rowText(row.slice(right)) : '';
        for (const part of [left, rest]) {
            if (/^Student ID\s*:/i.test(part) && !plan.student.id) plan.student.id = (after(part, 'Student ID').match(/\d{5,}/) || [''])[0];
            else if (/^Student\s*:/i.test(part) && !plan.student.name) plan.student.name = after(part, 'Student');
            else if (/^IEP Dates\s*:/i.test(part) && !plan.dates.start) {
                const ds = (part.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || []).map(isoDate);
                plan.dates = { start: ds[0] || null, end: ds[1] || null };
            } else if (/^Current Grade\s*:/i.test(part) && !plan.student.grade) plan.student.grade = after(part, 'Current Grade');
        }
    }
    // "Testing Accommodations:" -- dash items, wrapped lines continue the item before
    let mode = null, cur = null;
    const push = () => { if (cur && cur.text) plan.items.push(cur); cur = null; };
    for (const { text } of lines) {
        if (/^Testing Accommodations/i.test(text)) { push(); mode = 'testing'; continue; }
        if (mode === 'testing') {
            if (/^(Supplementary Aids|Modification, Accommodation|Special Education Services|Related Services)/i.test(text) || IEP_HEADER.test(text)) { push(); mode = null; continue; }
            if (/^[-•]\s*/.test(text)) { push(); cur = { group: 'On tests (state and district testing)', text: clean(text.replace(/^[-•]\s*/, '')) }; }
            else if (cur) cur.text = clean(`${cur.text} ${text}`);
        }
    }
    push();
    // The supports table, wherever its header row is
    let cols = null;
    for (const { row, text } of lines) {
        if (/^Modification, Accommodation, or Support/i.test(text)) {
            const f = row.find(p => /^Frequency/i.test(p.s.trim())), l = row.find(p => /^Location/i.test(p.s.trim()));
            cols = { freq: f ? f.x - 2 : Infinity, loc: l ? l.x - 2 : Infinity };
            continue;
        }
        if (!cols) continue;
        if (/^(Special Education Services|Related Services)/i.test(text)) { push(); cols = null; continue; }
        if (IEP_HEADER.test(text) || /^Service$/i.test(text)) continue;
        const acc = rowText(row.filter(p => p.x < cols.freq)), freq = rowText(row.filter(p => p.x >= cols.freq && p.x < cols.loc)), loc = rowText(row.filter(p => p.x >= cols.loc));
        if (loc) { push(); cur = { group: 'In class', text: clean(acc), when: clean(freq), where: clean(loc) }; }
        else if (cur) { cur.text = clean(`${cur.text} ${acc}`); cur.when = clean(`${cur.when} ${freq}`); }
    }
    push();
    return plan;
}

function parse504(pages) {
    const plan = { kind: '504', student: {}, dates: {}, items: [] };
    const lines = pages.flat().map(r => ({ x: r[0].x, text: rowText(r) }));
    for (const { text } of lines) {
        if (/^Student Name\s*:/i.test(text) && !plan.student.name) plan.student.name = after(text, 'Student Name');
        const g = /Grade\s*:\s*([^\s].*)$/i.exec(text); if (g && !plan.student.grade) plan.student.grade = g[1].trim();
    }
    // Between "Section 504 Accommodations" and the signature page: box headings ("Physical Environment"),
    // items, and their details. The district's PDFs mark items • and details ○, and a wrapped line can start
    // anywhere; without the marks, items share one indent and details sit further in.
    const body = [];
    let on = false;
    for (const l of lines) {
        if (/^Section 504 Accommodations$/i.test(l.text)) { on = true; continue; }
        if (!on) continue;
        if (/^Documentation of Section 504 Review|^Signature\b/i.test(l.text)) break;
        if (/^(Carson City School District|Carson .* School|Section 504 Student Accommodations|Student Name:|Current School:|Phone:|\d+ .* St$)/i.test(l.text)) continue;
        body.push(l);
    }
    const marked = body.some(l => /^[•●▪]/.test(l.text));
    // A box heading: a short Title Case line with no numbers or sentence ending
    const heading = t => t.length <= 40 && !/[\d.:]/.test(t) && t.split(/\s+/).every(w => !/[a-z]/i.test(w) || /^[A-Z]/.test(w) || /^(of|and|or|the|for|to|in|&)$/.test(w));
    let group = '', cur = null, itemX = null, detailX = null, inDetail = false;
    const push = () => { if (cur && cur.text) plan.items.push(cur); cur = null; inDetail = false; };
    const addItem = t => { push(); cur = { group, text: clean(t), detail: '' }; };
    const addDetail = t => { if (!cur) return addItem(t); cur.detail = clean(`${cur.detail} ${t}`); inDetail = true; };
    for (const { x, text } of body) {
        if (marked) {
            if (/^[•●▪]/.test(text)) addItem(text.replace(/^[•●▪]\s*/, ''));
            else if (/^[○◦]/.test(text)) addDetail(text.replace(/^[○◦]\s*/, ''));
            else if (heading(text)) { push(); group = clean(text); }
            else if (cur) inDetail ? addDetail(text) : (cur.text = clean(`${cur.text} ${text}`));
            continue;
        }
        if (itemX !== null && Math.abs(x - itemX) < 4) addItem(text);
        else if (cur && (detailX !== null ? Math.abs(x - detailX) < 4 : x > itemX + 4 && x < itemX + 60)) { detailX = detailX ?? x; addDetail(text); }
        else if (heading(text)) { push(); group = clean(text); }
        else { itemX = itemX ?? x; addItem(text); }
    }
    push();
    return plan;
}

// What the class site can do on its own for each accommodation; everything else is a reminder for the teacher
function suggest(items) {
    const out = { extraDays: 0, testTimeX: 1, readAloud: false, flags: [] };
    for (const it of items) {
        const t = `${it.text} ${it.detail || ''} ${it.when || ''}`;
        it.site = '';
        if (/text[- ]to[- ]speech|read[- ]?aloud|read to (the )?student|oral(ly)? (read|administ)/i.test(t)) { out.readAloud = true; it.site = 'read-aloud'; }
        if (/extended time|extra time|additional time|time and a half|double time/i.test(t)) {
            const days = /(\d+)\s*(?:additional|extra)?\s*(?:school\s*)?days?/i.exec(t);
            if (/assignment|homework|classwork|class work|project/i.test(t)) {
                out.extraDays = Math.max(out.extraDays, days ? Math.min(10, Number(days[1])) : 2);
                if (!days) out.flags.push('Extended time on assignments has no number of days in the plan, so 2 school days is filled in. Change it if the plan says otherwise.');
                it.site = 'extra-days';
            }
            if (/test|assessment|exam|quiz/i.test(t)) {
                out.testTimeX = Math.max(out.testTimeX, /double|2x|200\s*%/i.test(t) ? 2 : 1.5);
                it.site = it.site ? 'extra-time' : 'test-time';
            }
        }
    }
    return out;
}

async function readPlan(buffer) {
    const pages = await readRows(buffer);
    const all = pages.flat().map(rowText).join('\n');
    const plan = /Section 504/i.test(all) && !/IEP At A Glance/i.test(all) ? parse504(pages)
        : /IEP At A Glance|Modification, Accommodation/i.test(all) ? parseIep(pages)
        : { kind: 'unknown', student: {}, dates: {}, items: [] };
    if (plan.kind === 'unknown' || !plan.items.length) {
        // Not a layout we know: offer every line, and the teacher keeps the ones that are accommodations
        plan.items = all.split('\n').map(clean).filter(l => l.length > 12).slice(0, 80).map(text => ({ group: 'From the PDF', text, unsure: true }));
    }
    return { ...plan, suggestions: suggest(plan.items) };
}

module.exports = { readPlan, suggest };
