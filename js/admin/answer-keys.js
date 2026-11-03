// /js/admin/answer-keys.js
// Teacher answer keys for the activities inside each chapter page. The keys
// themselves come from /api/admin/answer-keys (server-only files, teacher
// account only -- see server/routes/answerKeys.js); this page only knows the
// chapter list. Open straight to a chapter with ?course=cs&ch=14 (the
// "Answer Key" button on each chapter page does this).
import { apiFetch } from '../modules/api-client.js';

// Web Design chapters 1-8 are Web Design I, 9-16 are Web Design II & AS.
const WD_CHAPTERS = [
    [1, "The Developer's World", '/year1/join-the-developers-guild.html'],
    [2, 'The "Rules"', '/year1/the-rules-how-not-to-get-sued.html'],
    [3, 'The Blueprint', '/year1/the-blueprint.html'],
    [4, 'Intro to UI/UX', '/year1/the-why-intro-to-uiux.html'],
    [5, 'The "Bones" (HTML)', '/year1/the-bones-intro-to-html.html'],
    [6, 'The "Clothes" (CSS)', '/year1/the-clothes-intro-to-css.html'],
    [7, 'The "Style" (Advanced CSS Layout)', '/year1/the-style-advanced-css-layout.html'],
    [8, 'Sights & Sounds', '/year1/sights-sounds-making-it-pop-html-media.html'],
    [9, 'The "Brains" (Intro to JS)', '/year2/the-brains-intro-to-javascript.html'],
    [10, 'The Game Developer', '/year2/the-game-dev-advanced-js-game-logic.html'],
    [11, 'The Cloud', '/year2/the-cloud-collaboration-hosting.html'],
    [12, 'The Manager (CMS)', '/year2/the-manager-cms-platforms.html'],
    [13, 'The Network (APIs)', '/year2/the-network-intro-to-apis.html'],
    [14, 'The "Brain" (Databases)', '/year2/the-brain-databases.html'],
    [15, 'The Future (Emerging Tech)', '/year2/the-game-never-ends.html'],
    [16, 'The "Launch" (Deployment)', '/year2/the-final-boss-going-live.html']
];

const classSelect = document.getElementById('classSelect');
const chapterSelect = document.getElementById('chapterSelect');
const keyBody = document.getElementById('keyBody');
const pageLink = document.getElementById('pageLink');
let csUnits = [];          // [{ name, chapters: [{ ch, title, page }] }]
let written = new Set();   // "cs-14", "wd-14", ...

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Plain text from the key files: `code` becomes inline code, line breaks are kept.
const fmt = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');

function courseKey(cls) { return cls === 'cs' ? 'cs' : 'wd'; }

function chaptersFor(cls) {
    if (cls === 'cs') return csUnits.flatMap(u => u.chapters.map(c => ({ ...c, group: u.name })));
    const [lo, hi] = cls === 'wd1' ? [1, 8] : [9, 16];
    return WD_CHAPTERS.filter(([n]) => n >= lo && n <= hi).map(([ch, title, page]) => ({ ch, title, page, group: null }));
}

function fillChapters(selected) {
    const cls = classSelect.value, list = chaptersFor(cls);
    let html = '', group = null;
    for (const c of list) {
        if (c.group !== group) {
            if (group !== null) html += '</optgroup>';
            if (c.group) html += `<optgroup label="${esc(c.group)}">`;
            group = c.group;
        }
        const has = written.has(`${courseKey(cls)}-${c.ch}`);
        html += `<option value="${c.ch}">Ch ${c.ch}: ${esc(c.title)}${has ? '' : ' (no key yet)'}</option>`;
    }
    if (group) html += '</optgroup>';
    chapterSelect.innerHTML = html;
    if (selected && list.some(c => c.ch === selected)) chapterSelect.value = String(selected);
}

function renderTable(t) {
    return `<div class="table-responsive"><table class="table table-sm table-bordered key-table">
        <thead class="table-light"><tr>${t.head.map(h => `<th>${fmt(h)}</th>`).join('')}</tr></thead>
        <tbody>${t.rows.map(r => `<tr>${r.map(c => `<td>${fmt(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderStep(s) {
    return `<div class="step">
        ${s.ask ? `<div class="step-ask">${fmt(s.ask)}</div>` : ''}
        <div class="key-label">Key</div>
        ${s.answer ? `<div class="step-answer">${fmt(s.answer)}</div>` : ''}
        ${s.table ? renderTable(s.table) : ''}
        ${s.code ? `<pre class="key-code">${esc(s.code)}</pre>` : ''}
        ${s.output ? `<div class="key-output"><strong>Output:</strong>\n${esc(s.output)}</div>` : ''}
    </div>`;
}

function renderList(cls, icon, title, items) {
    if (!items || !items.length) return '';
    return `<div class="list-box ${cls} mt-2"><strong><i class="fas ${icon} me-1"></i>${title}</strong>
        <ul>${items.map(i => `<li>${fmt(i)}</li>`).join('')}</ul></div>`;
}

function renderKey(k) {
    const acts = (k.activities || []).map(a => `
        <div class="card shadow-sm act-card mb-4">
          <div class="card-body p-4">
            <div class="act-head">
              <h4 class="fw-bold mb-1">${a.section ? `<span class="text-muted me-2">${esc(a.section)}</span>` : ''}${esc(a.title)}</h4>
              ${a.points ? `<span class="act-pts">${esc(a.points)} pts</span>` : ''}
            </div>
            ${a.turnIn ? `<div class="turn-in my-2"><strong>Turn In:</strong> ${fmt(a.turnIn)}</div>` : ''}
            ${a.note ? `<p class="small text-muted mb-2">${fmt(a.note)}</p>` : ''}
            ${(a.steps || []).map(renderStep).join('')}
            ${renderList('look-for', 'fa-check', 'What to look for when grading', a.lookFor)}
            ${renderList('mistakes', 'fa-triangle-exclamation', 'Common mistakes', a.mistakes)}
          </div>
        </div>`).join('');
    const disc = k.discussion && k.discussion.items && k.discussion.items.length ? `
        <div class="card shadow-sm border-0 mb-4">
          <div class="card-body p-4">
            <h4 class="fw-bold mb-2">${esc(k.discussion.title || 'Discussion Questions')}</h4>
            ${k.discussion.items.map(d => `<div class="disc-item"><div class="step-ask">${fmt(d.q)}</div><div class="step-answer">${fmt(d.a)}</div></div>`).join('')}
          </div>
        </div>` : '';
    keyBody.innerHTML = `
        <h3 class="fw-bold mb-1">${esc(k.className || '')} · Chapter ${esc(k.chapter)}: ${esc(k.title)}</h3>
        ${k.unit ? `<p class="text-muted fw-bold mb-3">${esc(k.unit)}</p>` : '<div class="mb-3"></div>'}
        ${acts}${disc}`;
}

async function show() {
    const cls = classSelect.value, ch = Number(chapterSelect.value);
    const info = chaptersFor(cls).find(c => c.ch === ch);
    pageLink.href = info ? info.page : '#';
    history.replaceState(null, '', `?course=${cls}&ch=${ch}`);
    if (!written.has(`${courseKey(cls)}-${ch}`)) {
        keyBody.innerHTML = `<div class="card shadow-sm border-0"><div class="card-body p-4 empty-note">The key for Chapter ${ch} isn't written yet.</div></div>`;
        return;
    }
    keyBody.innerHTML = '<p class="text-muted">Loading the key…</p>';
    try {
        renderKey(await apiFetch(`/api/admin/answer-keys/${courseKey(cls)}/${ch}`));
    } catch (e) {
        keyBody.innerHTML = `<div class="alert alert-danger">Couldn't load this key: ${esc(e.message)}</div>`;
    }
}

async function init() {
    try {
        const map = await fetch('/data/cs-course-map.json').then(r => r.json());
        csUnits = map.courseMap.map(u => ({
            name: u.name,
            chapters: u.chapters.map(c => ({ ch: c.ch, title: c.title.replace(/^Ch \d+:\s*/, ''), page: `/compsci/${c.file}` }))
        }));
    } catch (e) { csUnits = []; }
    try {
        const data = await apiFetch('/api/admin/answer-keys');
        written = new Set(data.keys.map(k => `${k.course}-${k.chapter}`));
    } catch (e) {
        keyBody.innerHTML = `<div class="alert alert-danger">Couldn't load the answer keys: ${esc(e.message)}</div>`;
    }

    // ?course=cs|wd1|wd2&ch=14 (also accepts course=wd and works out WD I vs II from the chapter)
    const q = new URLSearchParams(location.search);
    let cls = q.get('course'), ch = Number(q.get('ch')) || null;
    if (cls === 'wd') cls = ch && ch >= 9 ? 'wd2' : 'wd1';
    if (['cs', 'wd1', 'wd2'].includes(cls)) classSelect.value = cls;
    fillChapters(ch);
    show();
}

classSelect.addEventListener('change', () => { fillChapters(null); show(); });
chapterSelect.addEventListener('change', show);
document.getElementById('printBtn').addEventListener('click', () => window.print());

init();
