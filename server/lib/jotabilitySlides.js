// server/lib/jotabilitySlides.js
// Jotability lesson plans -> agenda slides (agenda_content.content).
//
// Jotability is the master copy of the Web Design lesson plans (teacher,
// 2026-10-29). When a lesson changes there -- in the app, or by Claude through
// the Jotability connector -- the Jotability server sends that course's whole
// lesson list here (POST /api/agenda/sync/lessons in routes/agenda.js), in
// teaching order, and every slide is rebuilt from its lesson:
//   - a lesson keeps its slide (its ref.block); a new lesson gets a new block
//     number, which goes back to Jotability as the lesson's ref;
//   - seq is the lesson's place in Jotability, so the chapter outline (and
//     with it which day each lesson lands on) follows Jotability's order;
//   - a slide whose lesson was deleted is retired: left out of the outline,
//     kept in the table (past days still show it).
// The lessons were made from these slides on 2026-10-26, so lessonView() is
// that import's mapping. A field whose lesson text still matches it keeps the
// slide's own version (standards notes, Do Now types, milestone points,
// bullet levels), so sending an unchanged lesson changes nothing.

const TEMPLATE = {
    chapterLabel: '', minimumDay: false, objective: [], standards: [], standardsNote: '',
    doNowType: '', doNowPrompt: '', tasksTitle: '', tasksList: [], exitTicket: '', milestone: null
};

// A bullet is a string, or { text, level } on slides made in the slide editor
const text = t => (t && typeof t === 'object' ? String(t.text ?? '') : String(t ?? '')).trim();
const items = v => (Array.isArray(v) ? v : v ? [v] : []).map(text).filter(Boolean);
const chapterOf = label => String(label || '').split(' · ')[0].trim();
const dayPartOf = label => String(label || '').split(' · ').slice(1).join(' · ').trim();
const norm = v => Array.isArray(v) ? v.map(norm) : typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v;
const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
// Keys sorted, so two slides compare by what they say, not key order
const stable = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x);
// What the 10-26 import wrote for a { text, level } bullet. A lesson field
// with it is left alone rather than copied over the slide.
const garbled = v => (Array.isArray(v) ? v : [v]).some(x => /\[object Object\]/.test(String(x)));
// "NV 4.3.3 ..." and "9-12.DA.S.2 ..." are standards; "Practice & application day ..." is a note
const STANDARD = /^(NV|CCSS|ISTE|CSTA|NGSS|CTE)\b|^[A-Z]{1,6}[ -]?\d+(\.\d+)+|^\d+-\d+\.[A-Z]/;

// A slide as its Jotability lesson shows it
function lessonView(slide) {
    const c = { ...TEMPLATE, ...(slide || {}) }, dayPart = dayPartOf(c.chapterLabel);
    return {
        title: String(c.tasksTitle || dayPart || c.chapterLabel || ''),
        label: [dayPart, c.minimumDay ? 'short day' : ''].filter(Boolean).join(' · '),
        short: !!c.minimumDay,
        objectives: items(c.objective),
        standards: [items(c.standards).join('; '), c.standardsNote || ''].filter(Boolean).join(' · '),
        doNow: c.doNowPrompt ? `${c.doNowType ? c.doNowType + ': ' : ''}${c.doNowPrompt}` : '',
        activities: items(c.tasksList),
        exitTicket: String(c.exitTicket || ''),
        due: c.milestone && typeof c.milestone === 'object' && c.milestone.title
            ? `${c.milestone.title}${c.milestone.pts ? ` (${c.milestone.pts} pts)` : ''}` : ''
    };
}

// The slide for a lesson: `prev` (the slide now, or null) with the lesson's changes
function slideFromLesson(prev, lesson, chapter) {
    const c = { ...TEMPLATE, ...(prev || {}) }, was = lessonView(c), l = lesson || {};
    const dayPart = String(l.label || '').split(' · ').map(s => s.trim()).filter(s => s && !/^short day$/i.test(s)).join(' · ');
    const ch = chapter || chapterOf(c.chapterLabel);
    if (!same(chapterOf(c.chapterLabel), ch) || !same(dayPartOf(c.chapterLabel), dayPart)) c.chapterLabel = [ch, dayPart].filter(Boolean).join(' · ');
    if (!!c.minimumDay !== !!l.short) c.minimumDay = !!l.short;

    const title = String(l.title || '').trim();
    if (!same(was.title, title)) c.tasksTitle = title;
    const objectives = items(l.objectives);
    if (!garbled(objectives) && !same(was.objectives, objectives)) c.objective = objectives;
    const standards = String(l.standards || '').trim();
    if (!garbled(standards) && !same(was.standards, standards)) {
        const parts = standards.split(/\s+·\s+|;\s+/).map(s => s.trim()).filter(Boolean);
        c.standards = parts.filter(p => STANDARD.test(p));
        c.standardsNote = parts.filter(p => !STANDARD.test(p)).join(' · ');
    }
    const doNow = String(l.doNow || '').trim();
    if (!same(was.doNow, doNow)) {
        // "Check: Sketch a ..." -> type Check (the slide's label), prompt "Sketch a ..."
        const m = /^([A-Za-z][A-Za-z' -]{0,18}):\s+([\s\S]+)$/.exec(doNow);
        c.doNowType = m ? m[1].trim() : '';
        c.doNowPrompt = m ? m[2].trim() : doNow;
    }
    const activities = items(l.activities);
    if (!garbled(activities) && !same(was.activities, activities)) c.tasksList = activities;
    const exitTicket = String(l.exitTicket || '').trim();
    if (!same(was.exitTicket, exitTicket)) c.exitTicket = exitTicket;
    const due = String(l.due || '').trim();
    if (!same(was.due, due)) {
        const m = /^([\s\S]*?)\s*\((\d+)\s*(?:pts?|points?)\)\s*$/i.exec(due);
        c.milestone = !due ? null : m ? { title: m[1].trim(), pts: Number(m[2]) } : { title: due };
    }
    return c;
}

// What one send changes. existing: [{ block, raw, content, seq, retired, jot }]
// (the course's agenda_content rows); lessons: [{ id, block, unitId, unit,
// ...fields }] in teaching order. Nothing here touches the database.
function planLessonSync(existing, lessons) {
    const byBlock = new Map(existing.map(r => [r.block, r]));
    const ids = new Set(lessons.map(l => l.id));
    const at = new Map(), claimed = new Map();   // lesson id -> block; block -> lesson id
    const valid = b => Number.isInteger(b) && b > 0 && b <= 100000;
    // 1. Each lesson keeps its slide -- unless another lesson in the list owns
    //    it (a copied lesson carries its original's ref).
    for (const l of lessons) {
        const row = valid(l.block) ? byBlock.get(l.block) : null;
        if (!row || claimed.has(l.block)) continue;
        if (row.jot != null && row.jot !== l.id && ids.has(row.jot)) continue;
        claimed.set(l.block, l.id); at.set(l.id, l.block);
    }
    // 2. The rest: a free block number they already name, else the next new one
    for (const l of lessons) {
        if (at.has(l.id) || !valid(l.block) || byBlock.has(l.block) || claimed.has(l.block)) continue;
        claimed.set(l.block, l.id); at.set(l.id, l.block);
    }
    let next = Math.max(0, ...existing.map(r => r.block)) + 1;
    for (const l of lessons) {
        if (at.has(l.id)) continue;
        while (claimed.has(next) || byBlock.has(next)) next++;
        claimed.set(next, l.id); at.set(l.id, next++);
    }
    // 3. A unit's chapter is the chapter its lessons' slides already have, so
    //    renaming a unit in Jotability never splits a chapter on the website
    //    (Jotability's pacing finds chapters by name); a new unit uses its title.
    const counts = new Map();
    for (const l of lessons) {
        const row = byBlock.get(at.get(l.id)), p = row && row.content ? chapterOf(row.content.chapterLabel) : '';
        if (!p) continue;
        const m = counts.get(l.unitId) || new Map();
        m.set(p, (m.get(p) || 0) + 1); counts.set(l.unitId, m);
    }
    const chapterFor = l => {
        const m = counts.get(l.unitId);
        return m ? [...m].sort((a, b) => b[1] - a[1])[0][0] : (String(l.unit || '').trim().split(' · ')[0] || 'Lessons');
    };

    const writes = lessons.map((l, i) => {
        const block = at.get(l.id), row = byBlock.get(block), prev = row ? row.content : null;
        const content = slideFromLesson(prev, l, chapterFor(l));
        const before = prev ? { ...TEMPLATE, ...prev } : null;
        const fields = before ? Object.keys(content).filter(k => stable(content[k]) !== stable(before[k])) : Object.keys(content);
        return {
            block, lessonId: l.id, seq: i + 1, content, isNew: !row, changed: fields.length > 0, fields,
            raw: row ? row.raw : null,
            meta: !row || row.seq !== i + 1 || !!row.retired || row.jot !== l.id
        };
    });
    return {
        writes,
        assigned: lessons.filter(l => at.get(l.id) !== l.block).map(l => ({ id: l.id, block: at.get(l.id) })),
        retire: existing.filter(r => !r.retired && !claimed.has(r.block)).map(r => r.block)
    };
}

module.exports = { lessonView, slideFromLesson, planLessonSync, TEMPLATE };
