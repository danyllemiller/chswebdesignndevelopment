#!/usr/bin/env node
// scripts/learning-notebook/build.js
// Builds a student Learning Notebook -- a printed, bound guided + interactive hybrid whose
// point is thinking about learning more than note-taking (teacher, 2026-11-02) -- as
// print-ready HTML (print.sh turns it into a PDF):
//   - front pages: how it works, my plan for the semester, strategy menu, learning tracker
//     (Pre-Scale -> predicted -> actual test score), question parking lot, contents;
//   - each chapter: an opener spread (I used to think, the proficiency scale's targets rated
//     before and after), one spread per lesson, an extra-day spread, and two closer spreads
//     (Before the test; After the test + Now I think + the 10-point notebook check);
//   - each lesson spread: RIGHT page guided (Today I can, Do Now, key ideas with blanks,
//     today's work), LEFT page the student's own thinking: a strategy prompt that fades
//     over the semester (full, then a cue, then their choice), a dot grid, and an exit
//     strip (how sure am I 1-4, muddiest point, next step).
// Lessons come from the Guided Notebook JSON (server-only, /var/lib/chs-guided-notebook:
// it holds answer keys, so it never goes in this public repo) and targets from
// proficiencyScales/*.html. Only the student copy is printed: no answers or keys.
//
// node build.js --course wd1 --chapters 5,6,7,8 --gn <folder of chN.json> --term "Semester 2" --out wd1-s2.html
// node build.js --course cs --chapters 0,1,2,3,4,5,6,7 --docx "curriculum/CS Guided Notebook (2026-2027).docx" --out cs-s2.html
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : dflt; };
const COURSE = arg('course', 'wd1');
const CHAPTERS = String(arg('chapters', '')).split(',').filter(x => x.trim() !== '').map(Number).filter(Number.isInteger);
const GN = arg('gn');
// CS: the CS Guided Notebook .docx instead of the Guided Notebook JSON (csDocx.js), by unit
const DOCX = arg('docx');
const TERM = arg('term', 'Semester 2');
const OUT = arg('out', `learning-notebook-${COURSE}.html`);
const CHECK_POINTS = Number(arg('points', 10));
const COURSE_NAMES = { wd1: 'Web Design 1', wd2: 'Web Design 2', cs: 'Computer Science' };
if ((!GN && !DOCX) || !CHAPTERS.length) { console.error('Usage: node build.js --course wd1 --chapters 5,6 --gn <folder> | --course cs --chapters 0,1,2 --docx <CS notebook.docx>  [--term "Semester 2"] [--out file.html]'); process.exit(1); }
// What a section is called: WD chapters, CS units
const W = DOCX ? 'unit' : 'chapter', Wc = DOCX ? 'Unit' : 'Chapter', WS = DOCX ? 'Unit' : 'Ch';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const strip = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const iCan = s => { const t = String(s || '').trim().replace(/\.$/, ''); return /^i can\b/i.test(t) ? cap(t) : `I can ${t}`; };

// ---- Proficiency scales (proficiencyScales/*.html), by chapter number ----
function readScales() {
    const out = {};
    for (const f of fs.readdirSync(path.join(ROOT, 'proficiencyScales')).filter(f => f.endsWith('.html'))) {
        const s = fs.readFileSync(path.join(ROOT, 'proficiencyScales', f), 'utf8');
        const ch = /<title>\s*Chapter (\d+)\b/i.exec(s), unit = /<title>\s*Unit (\d+):\s*([^|<]+)/i.exec(s);
        if (!ch && !unit) continue;
        const cq = /class="compelling-question[^"]*"[^>]*>[\s\S]*?<\/h5>([\s\S]*?)<\/div>/.exec(s);
        const list = /<ul class="target-list[^"]*">([\s\S]*?)<\/ul>/.exec(s);
        const targets = list ? [...list[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => {
            const kind = strip((/<strong[^>]*>([\s\S]*?)<\/strong>/.exec(m[1]) || [])[1]).replace(/:$/, '');
            const code = strip((/<span class="badge[^>]*>([\s\S]*?)<\/span>/.exec(m[1]) || [])[1]);
            const text = strip(m[1].replace(/<strong[\s\S]*?<\/strong>/, '').replace(/<span class="badge[\s\S]*?<\/span>/, ''));
            return { kind, text, code };
        }) : [];
        const levels = [...s.matchAll(/<h4[^>]*>\s*(\d\.\d)\s*-\s*([^<]+?)\s*<small[^>]*>\(([^)]+)\)<\/small>/g)].map(m => ({ score: m[1], name: strip(m[2]), tier: m[3] }));
        out[ch ? ch[1] : `u${unit[1]}`] = { title: unit ? strip(unit[2]) : '', compelling: strip(cq ? cq[1] : '').replace(/^"|"$/g, ''), targets, levels };
    }
    return out;
}
const DEFAULT_LEVELS = [{ score: '4.0', name: 'I could teach it', tier: 'Advanced' }, { score: '3.0', name: 'I can do it on my own', tier: 'Mastery' },
    { score: '2.0', name: 'I can do it with help', tier: 'Foundational' }, { score: '1.0', name: 'Not yet', tier: 'Beginner' }];

// ---- Lessons (Guided Notebook JSON) ----
function readChapter(n, scales) {
    const d = JSON.parse(fs.readFileSync(path.join(GN, `ch${n}.json`), 'utf8'));
    const scale = scales[n] || null;
    const lessons = d.days.map(day => {
        const blocks = day.blocks || [];
        const doNow = blocks.find(b => b.type === 'doNow');
        const blanks = blocks.find(b => b.type === 'blanks' && (b.items || []).some(i => /\[\[/.test(i)));
        const turnins = blocks.filter(b => b.type === 'turnin').map(b => b.label);
        const labs = blocks.filter(b => b.type === 'lab').map(b => `Lab: ${b.title}`);
        const sheet = blocks.find(b => b.type === 'projectSheet');
        const exit = blocks.find(b => b.type === 'exit');
        return {
            day: day.day, title: day.title, short: !!day.short,
            objectives: (day.objectives || []).map(iCan),
            doNow: doNow ? { label: doNow.label || '', prompt: doNow.prompt } : null,
            blanks: blanks ? blanks.items.filter(i => /\[\[/.test(i)).slice(0, 6) : [],
            work: turnins.length ? turnins.map(t => `Turn in: ${t}`) : labs.length ? labs : sheet ? [`Project: ${sheet.title}`] : [],
            exit: exit ? iCan(exit.statement) : iCan((day.objectives || [])[0] || day.title),
        };
    });
    // A chapter with no proficiency scale gets its targets from the lessons' objectives
    const targets = scale && scale.targets.length ? scale.targets
        : [...new Set(lessons.flatMap(l => l.objectives))].slice(0, 6).map(text => ({ kind: '', text, code: '' }));
    return { n, title: d.title, project: d.project || '', compelling: scale ? scale.compelling : '', targets,
        levels: scale && scale.levels.length === 4 ? scale.levels : DEFAULT_LEVELS, lessons };
}

// ---- CS units (the CS Guided Notebook .docx) ----
function readUnit(n, scales, units) {
    const days = units.get(n);
    if (!days) throw new Error(`Unit ${n} isn't in ${DOCX}`);
    const scale = scales[`u${n}`] || null;
    const lessons = days.map(d => ({
        day: d.day, title: d.title, kind: d.kind, standards: d.standards, parts: d.parts,
        objectives: d.objectives.map(iCan), doNow: d.doNow, blanks: [], work: [],
        exit: iCan(d.exit || d.objectives[0] || d.title),
    }));
    const targets = scale && scale.targets.length ? scale.targets
        : [...new Set(lessons.flatMap(l => l.objectives))].slice(0, 6).map(text => ({ kind: '', text, code: '' }));
    return { n, title: (scale && scale.title) || `Unit ${n}`, project: (days.find(d => d.project) || {}).project || '',
        compelling: scale ? scale.compelling : '', targets, levels: scale && scale.levels.length === 4 ? scale.levels : DEFAULT_LEVELS, lessons };
}

// ---- Thinking-page prompts: full prompts, then a cue, then the student's choice ----
const STRATEGIES = [
    { name: 'Sketch it', cue: 'Draw it. Label every part.', full: l => `Draw today's big idea as a picture, diagram or wireframe. Label every part, then add one sentence saying what your drawing shows.` },
    { name: 'Explain it', cue: 'To someone who missed class.', full: l => `Explain this to a classmate who missed class, in your own words, with one example: "${l.exit}."` },
    { name: 'Connect it', cue: 'Today + your project.', full: (l, c) => `How does today connect to ${c.project ? `your project (${c.project})` : 'what you are building'}? What will you do differently because of it?` },
    { name: 'Compare it', cue: 'T-chart: alike / different.', full: () => `Make a T-chart: how is today's idea LIKE something you already knew, and how is it DIFFERENT?` },
    { name: 'Quiz yourself', cue: '3 questions, answer, check.', full: () => `Write 3 questions a test could ask about today. Answer them without looking, then check the right-hand page and fix anything you missed.` },
    { name: 'Map it', cue: 'Concept map or flowchart.', full: () => `Make a concept map or flowchart of today's ideas. Draw arrows between them and write on each arrow how they connect.` },
    { name: 'Teach it', cue: 'Steps someone could follow.', full: () => `Write step-by-step instructions that someone could follow to do what you learned today. Number the steps.` },
    { name: 'Analogy', cue: '___ is like ___ because ___.', full: l => `Finish this: "${l.title.split(/[:·]/)[0].trim()} is like ______ because ______." Then write where your comparison breaks down.` },
];
// How each strategy reads on the Strategy Menu page
const MENU = {
    'Sketch it': 'Draw the big idea as a picture, diagram or wireframe. Label every part.',
    'Explain it': 'Explain it to a classmate who missed class, in your own words, with one example.',
    'Connect it': 'How does it connect to your project? What will you do differently because of it?',
    'Compare it': 'T-chart: how is it like something you already knew, and how is it different?',
    'Quiz yourself': 'Write 3 questions a test could ask. Answer without looking, then check.',
    'Map it': 'Concept map or flowchart. Write on each arrow how the ideas connect.',
    'Teach it': 'Write numbered steps someone could follow to do what you learned.',
    'Analogy': '"___ is like ___ because ___." Then say where the comparison breaks down.',
    'Look back': 'From memory first: write everything you remember. Then check and fill gaps in a different color.'
};
const LOOK_BACK = { name: 'Look back', cue: 'From memory first, then check.', full: () => `Without looking, write everything you remember from the last few classes. Then flip back through your pages and add what you missed in a different color.` };

// ---- Page pieces ----
const dotGrid = (h, id) => `<svg class="dots" width="100%" height="${h}" aria-hidden="true"><defs><pattern id="d${id}" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="0.9" fill="#a9a9a9"/></pattern></defs><rect width="100%" height="100%" fill="url(#d${id})"/></svg>`;
const lines = n => `<div class="lines">${'<div class="ln"></div>'.repeat(n)}</div>`;
const circles = (n = 4) => `<span class="circles">${Array.from({ length: n }, (_, i) => `<span class="c">${i + 1}</span>`).join('')}</span>`;
// "[[a|b]]" accepts either answer online; the first is the one in the word bank (server/routes/guidedNotebook.js)
const answerOf = w => w.split('|')[0].trim();
const blankify = item => esc(item).replace(/\[\[(.+?)\]\]/g, (m, w) => `<span class="blank" style="min-width:${Math.min(2.6, Math.max(0.9, answerOf(w).length * 0.09)).toFixed(2)}in"></span>`);
const wordBank = items => [...new Set(items.flatMap(i => [...i.matchAll(/\[\[(.+?)\]\]/g)].map(m => answerOf(m[1]))))].sort((a, b) => a.localeCompare(b));

// A CS day's own notebook page. Writing space splits what's left of the page in proportion
// to the rows the notebook gives it.
const flexLines = n => `<div class="wl" style="flex:${Math.max(1, n)}">${lines(40)}</div>`;
function renderParts(parts) {
    const box = b => {
        const items = b.items || [];
        const weight = items.reduce((s, i) => s + (i.lines || 0), 0);
        const long = b.title.length > 70;
        return `<div class="pbox" style="${weight ? `flex:${weight}` : ''}">${long ? `<div class="tx">${esc(b.title)}</div>` : `<div class="lbl">${esc(b.title)}</div>`}${items.map(i => i.lines ? flexLines(i.lines) : `<div class="tx">${esc(i.text)}</div>`).join('')}</div>`;
    };
    return parts.map(p => {
        switch (p.type) {
            case 'heading': return `<div class="lbl">${esc(p.text)}</div>`;
            case 'text': return `<div class="tx${p.strong ? ' strong' : ''}">${esc(p.text)}</div>`;
            case 'check': return `<div class="chk">${p.items.map(i => `<span>☐ ${esc(i)}</span>`).join('')}</div>`;
            case 'bank': return `<div class="bank">${p.words.map(w => `<span>${esc(w)}</span>`).join('')}</div>`;
            case 'blank': return `<div class="blk"><span>${p.n}.</span><span class="blank" style="min-width:1.5in"></span><span>${esc(p.text)}</span></div>`;
            case 'question': return `<div class="tx"><b>${p.n}.</b> ${esc(p.text)}</div>`;
            case 'lines': return flexLines(p.n);
            case 'box': return box(p);
            case 'selfcheck': return `<table class="grid self"><thead><tr><th>Self-check</th><th>How sure am I?</th></tr></thead><tbody>${p.rows.map(r => `<tr><td>${esc(r)}</td><td>${circles()}</td></tr>`).join('')}</tbody></table>`;
            default: return '';
        }
    }).join('');
}
const partsText = parts => JSON.stringify(parts).length;

let pageNo = 0, dotId = 0;
const pages = [];
// side: page numbers are even on the left, odd on the right, as in the bound book
function page(body, { foot = '', kind = '' } = {}) {
    pageNo++;
    const side = pageNo % 2 ? 'right' : 'left';
    pages.push(`<section class="page ${side} ${kind}" id="p${pageNo}"><div class="inner">${body}</div><div class="foot"><span>${esc(foot)}</span><span class="num">${pageNo}</span></div></section>`);
    return pageNo;
}
const head = (eyebrow, title, extra = '') => `<header class="ph"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1></div>${extra}</header>`;

// ---- Build ----
const scales = readScales();
// Each chapter's (unit's) Hook, Line & Sinker, keyed like "wd1-3" or "cs-6" (data/chapter-hooks.json)
const HOOKS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'chapter-hooks.json'), 'utf8')).hooks || {}; } catch (e) { return {}; } })();
const units = DOCX ? require('./csDocx').readCsDocx(DOCX) : null;
const chapters = CHAPTERS.map(n => DOCX ? readUnit(n, scales, units) : readChapter(n, scales));
const total = chapters.reduce((s, c) => s + c.lessons.length, 0);
const courseName = COURSE_NAMES[COURSE] || COURSE.toUpperCase();
const contents = [];

// Cover (page 1, a right-hand page)
page(`<div class="cover"><img src="file://${path.join(ROOT, 'images', 'weblogo.png')}" alt="" class="logo">
  <div class="eyebrow">${esc(courseName)} · ${esc(TERM)}</div><h1 class="big">My Learning Notebook</h1>
  <p class="tag">Think about your thinking.</p>
  <div class="who"><div>Name <span class="fill"></span></div><div>Period <span class="fill short"></span></div></div>
  <div class="howto"><div><b>Right page</b><br>what we learned (fill it in during class)</div><div><b>Left page</b><br>what <i>I</i> think about it (blank on purpose)</div></div>
  <p class="chs">${Wc}s ${chapters.map(c => c.n).join(', ')}</p></div>`, { kind: 'coverpage' });

page(`${head('Start here', 'How this notebook works')}
  <ol class="howlist">
    <li><b>Every class gets one spread.</b> The <b>right page</b> is guided: today's target, the Do Now, and the key ideas with blanks to fill in. The <b>left page</b> is for your own thinking. It is blank on purpose.</li>
    <li><b>Start of class:</b> answer the Do Now on the right page.</li>
    <li><b>During class:</b> fill in the key ideas, then use the left page the way its top box asks.</li>
    <li><b>Last 3 minutes:</b> fill in the <b>exit strip</b> at the bottom of the left page: how sure you are, what is still fuzzy, and what you will do next class.</li>
    <li><b>The top box on the left page gets shorter during the semester.</b> First it tells you exactly what to do, then it just names a strategy, and by the end you choose your own from the Strategy Menu (page 4).</li>
    <li><b>Every ${W} starts</b> with "I used to think..." and rating yourself on the targets, and <b>ends</b> with Before the test, After the test, and "...Now I think."</li>
    <li><b>Your teacher checks it at the end of every ${W}</b> (${CHECK_POINTS} points). The checklist is on the last page of each ${W}.</li>
  </ol>
  <div class="box"><b>Why bother?</b> Students who plan, check, and look back at their own learning remember more and fix their mistakes sooner. This notebook is where you practice that.</div>`, { foot: 'Start here' });

page(`${head('Planning', 'My plan for this semester')}
  ${[['Why does this class matter to me? How could it help my future job or school plans?', 4], ['What do I want to be able to do by the end of the semester?', 4],
    ['How will I keep track of my own learning? (Look at the tracker on page 5.)', 3], ['What usually gets in the way of my learning, and what will I do about it?', 4],
    ['What kind of help works best for me?', 20]].map(([q, n], i, a) => `<div class="q${i === a.length - 1 ? ' grow' : ''}"><div class="qt">${esc(q)}</div>${lines(n)}</div>`).join('')}`, { foot: 'Planning' });

page(`${head('Use this all semester', 'Strategy Menu')}
  <p class="lede">Ways to think about what you learned. Use them on the left pages, and to study for tests.</p>
  <div class="menu">${[...STRATEGIES, LOOK_BACK].map(s => `<div class="mi"><b>${esc(s.name)}</b><span>${esc(MENU[s.name])}</span></div>`).join('')}</div>
  <div class="box small"><b>Not on the list:</b> highlighting and rereading <i>feel</i> like studying but help the least. Quizzing yourself and spreading practice out over several days help the most.</div>`, { foot: 'Strategy Menu' });

page(`${head('Tracking', 'My learning tracker')}
  <p class="lede">Fill in a row at the start and end of every ${W}. The goal is not just a high score: it's <b>knowing</b> how well you know it.</p>
  <table class="grid tracker"><thead><tr><th>${Wc}</th><th>Pre-Scale<br>(1–4)</th><th>I predict I'll<br>score (%)</th><th>My actual<br>score (%)</th><th>Was I close?<br>(within 10%)</th><th>End rating<br>(1–4)</th><th>Notebook<br>check</th></tr></thead>
  <tbody>${chapters.map(c => `<tr><td><b>${WS} ${c.n}</b> ${esc(c.title)}</td><td></td><td></td><td></td><td class="small">yes · over · under</td><td></td><td class="small">/ ${CHECK_POINTS}</td></tr>`).join('')}</tbody></table>
  <div class="q"><div class="qt">Looking at my rows, what do I notice about how well I predict my own learning?</div>${lines(4)}</div>`, { foot: 'Tracking' });

page(`${head('Questions', 'Question parking lot')}
  <p class="lede">Write a question here the moment you have it. Check the box when you get the answer, and write where you found it.</p>
  <table class="grid parking"><thead><tr><th style="width:62%">My question</th><th>Where I found the answer</th><th style="width:9%">Done</th></tr></thead>
  <tbody>${'<tr><td></td><td></td><td>☐</td></tr>'.repeat(16)}</tbody></table>`, { foot: 'Questions' });

const contentsPage = page('@@CONTENTS@@', { foot: 'Contents' });
if (DOCX) {
    const quarter = q => `<tr><td rowspan="4" class="qtr">Quarter ____</td><td></td><td></td></tr>${'<tr><td></td><td></td></tr>'.repeat(3)}`;
    page(`${head('Partners', 'My Elbow Partners')}
      <p class="lede">Your elbow partner sits next to you for Think-Pair-Share and daily check-ins. Record each new pairing.</p>
      <table class="grid partners"><thead><tr><th style="width:18%">Quarter</th><th>Partner's name</th><th style="width:28%">Date pairing started</th></tr></thead><tbody>${quarter()}${quarter()}</tbody></table>`, { foot: 'Partners' });
    const square = `<div class="sq"><div class="sqh">Quarter ____ · 4-Square</div><div class="sqgrid">${'<div>Name</div>'.repeat(4)}</div><div class="small">Date group formed ________ &nbsp; Changed (if any) ________</div></div>`;
    page(`${head('Partners', 'My 4-Square Group')}
      <p class="lede">Your 4-Square is the four-person group you work with on labs and group work. Write all four names in the square. If your group changes, use the second square.</p>
      ${square}${square}`, { foot: 'Partners' });
}

let lessonIdx = 0;
for (const c of chapters) {
    const tag = `${WS} ${c.n} · ${c.title}`;
    // Chapters (units) start on a left-hand page, so each lesson is a true spread
    if (pageNo % 2 === 0) page(`<div class="spacer">${dotGrid('100%', ++dotId)}</div>`, { foot: 'Extra page' });
    const start = pageNo + 1;
    contents.push({ c, start });

    const hk = HOOKS[`${COURSE}-${c.n}`];
    page(`${head(`${Wc} ${c.n} · Before we start`, c.title)}
      ${hk ? `<div class="hookbox"><div class="hk"><span class="tag">HOOK</span><span>${esc(hk.hook)}</span></div><div class="hk"><span class="tag">LINE</span><span>${esc(hk.line)}</span></div><div class="hk"><span class="tag">SINKER</span><span>${esc(hk.sinker)}</span></div><div class="qt sm">My answer:</div>${lines(2)}</div>` : ''}
      <div class="q big"><div class="qt">I used to think... <span class="hint">(What do I think about this ${W}'s topic right now? Guesses are fine.)</span></div>${lines(8)}</div>
      <div class="two"><div class="q"><div class="qt">What I already know</div>${lines(8)}</div><div class="q"><div class="qt">What I want to find out</div>${lines(8)}</div></div>
      <div class="q grow"><div class="qt">How could this ${W} help ${c.project ? `my project, <b>${esc(c.project)}</b>` : 'what I am building'}?</div>${lines(20)}</div>`, { foot: tag, kind: 'opener' });

    page(`${head(`${Wc} ${c.n} · Targets`, 'Where am I starting?')}
      ${c.compelling ? `<div class="box cq"><b>Big question:</b> ${esc(c.compelling)}</div>` : ''}
      <table class="grid targets"><thead><tr><th>Learning target</th><th>Before<br>(circle)</th><th>After<br>(circle)</th></tr></thead>
      <tbody>${c.targets.map(t => `<tr><td>${t.kind ? `<span class="kind">${esc(t.kind)}</span> ` : ''}${esc(t.text)}${t.code ? ` <span class="code">${esc(t.code)}</span>` : ''}</td><td>${circles()}</td><td>${circles()}</td></tr>`).join('')}</tbody></table>
      <div class="legend">${c.levels.map(l => `<span><b>${esc(l.score[0])}</b> ${esc(l.name)}</span>`).join('')}</div>
      <div class="q"><div class="qt">My goal for this ${W}: I want to reach ___ on the target(s) ___ because...</div>${lines(3)}</div>
      <div class="q grow"><div class="qt">How will I know I'm on track before the test?</div>${lines(20)}</div>`, { foot: tag, kind: 'opener' });

    c.lessons.forEach((l, i) => {
        const phase = lessonIdx < total / 3 ? 'full' : lessonIdx < (2 * total) / 3 ? 'cue' : 'choice';
        const s = i % 4 === 3 ? LOOK_BACK : STRATEGIES[lessonIdx % STRATEGIES.length];
        lessonIdx++;
        const prompt = phase === 'full' || s === LOOK_BACK ? `<b>${esc(s.name)}.</b> ${esc(s.full(l, c))}`
            : phase === 'cue' ? `<b>${esc(s.name)}.</b> ${esc(s.cue)}` : `<b>Your choice.</b> Pick a strategy from the Strategy Menu (page 4). Strategy: <span class="fill"></span>`;
        const dayTag = `${WS} ${c.n} · Day ${l.day} of ${c.lessons.length}`;
        // LEFT: my thinking
        page(`<div class="think-top"><div class="eyebrow">${esc(dayTag)} · My thinking</div><div class="prompt">${prompt}</div></div>
          <div class="think-area">${dotGrid('100%', ++dotId)}</div>
          <div class="exit"><div class="exit-h">Exit · last 3 minutes</div>
            <div class="exit-row"><span class="lbl">How sure am I?</span><span class="stmt">${esc(l.exit)}</span>${circles()}</div>
            <div class="scale-key">1 not yet · 2 with help · 3 on my own · 4 I could teach it</div>
            <div class="exit-row"><span class="lbl">Still fuzzy:</span><span class="ln flex"></span></div><div class="ln"></div>
            <div class="exit-row"><span class="lbl">Next class I will:</span><span class="ln flex"></span></div></div>`, { foot: dayTag, kind: 'think' });
        // RIGHT: guided. A CS day is its own page from the CS Guided Notebook.
        if (l.parts) {
            page(`${head(`${dayTag} · ${l.kind}`, l.title, '<div class="date">Date <span class="fill short"></span></div>')}
              ${l.standards ? `<div class="std">${esc(l.standards)}</div>` : ''}
              <div class="target"><span class="lbl">Today I can</span><ul>${l.objectives.map(o => `<li>${esc(o.replace(/^I can /, ''))}</li>`).join('')}</ul></div>
              ${l.doNow ? `<div class="donow"><div class="lbl">Do Now · ${esc(l.doNow.label)}</div><div class="dq">${esc(l.doNow.prompt)}</div>${lines(Math.min(3, l.doNow.lines || 2))}</div>` : ''}
              <div class="parts${partsText(l.parts) > 2600 ? ' dense' : ''}">${renderParts(l.parts)}</div>`, { foot: dayTag, kind: 'guided' });
            return;
        }
        const bank = wordBank(l.blanks);
        page(`${head(dayTag, l.title, '<div class="date">Date <span class="fill short"></span></div>')}
          <div class="target"><span class="lbl">Today I can</span><ul>${l.objectives.map(o => `<li>${esc(o.replace(/^I can /, ''))}</li>`).join('')}</ul></div>
          <div class="donow"><div class="lbl">Do Now${l.doNow && l.doNow.label ? ` · ${esc(l.doNow.label)}` : ''}</div>${l.doNow ? `<div class="dq">${esc(l.doNow.prompt)}</div>` : '<div class="dq muted">Answer the prompt on the board.</div>'}${lines(3)}</div>
          ${l.blanks.length ? `<div class="keys"><div class="lbl">Key ideas · fill in the blanks</div><div class="bank">${bank.map(w => `<span>${esc(w)}</span>`).join('')}</div><ol>${l.blanks.map(b => `<li>${blankify(b)}</li>`).join('')}</ol></div>` : ''}
          <div class="notes"><div class="lbl">${l.blanks.length ? 'More notes' : 'Key ideas · in my own words'}</div><div class="fillarea">${lines(30)}</div></div>
          ${l.work.length ? `<div class="work"><span class="lbl">Today's work (on the class website)</span> ${l.work.map(esc).join(' · ')}</div>` : ''}`, { foot: dayTag, kind: 'guided' });
    });

    // An extra day for re-teach days or lessons added after printing
    page(`<div class="think-top"><div class="eyebrow">${WS} ${c.n} · Extra day · My thinking</div><div class="prompt"><b>Your choice.</b> Pick a strategy from the Strategy Menu (page 4). Strategy: <span class="fill"></span></div></div>
      <div class="think-area">${dotGrid('100%', ++dotId)}</div>
      <div class="exit"><div class="exit-h">Exit · last 3 minutes</div><div class="exit-row"><span class="lbl">How sure am I about today's target?</span><span class="stmt"></span>${circles()}</div>
        <div class="exit-row"><span class="lbl">Still fuzzy:</span><span class="ln flex"></span></div><div class="ln"></div><div class="exit-row"><span class="lbl">Next class I will:</span><span class="ln flex"></span></div></div>`, { foot: `${WS} ${c.n} · Extra day`, kind: 'think' });
    page(`${head(`${WS} ${c.n} · Extra day`, 'What we did today:', '<div class="date">Date <span class="fill short"></span></div>')}
      <div class="target"><span class="lbl">Today I can</span>${lines(2)}</div>
      <div class="donow"><div class="lbl">Do Now</div>${lines(3)}</div>
      <div class="notes"><div class="lbl">Key ideas · in my own words</div><div class="fillarea">${lines(30)}</div></div>`, { foot: `${WS} ${c.n} · Extra day`, kind: 'guided' });

    // Closers
    page(`<div class="think-top"><div class="eyebrow">${Wc} ${c.n} · Before the test</div><div class="prompt"><b>Look back at the whole ${W}.</b> Without looking, write or sketch everything you remember from ${Wc} ${c.n}. Then flip back through your pages and add what you missed in a different color.</div></div>
      <div class="think-area">${dotGrid('100%', ++dotId)}</div>`, { foot: `${tag} · Before the test`, kind: 'think' });
    page(`${head(`${Wc} ${c.n} · Before the test`, 'Getting ready')}
      <table class="grid targets"><thead><tr><th>Learning target</th><th>How sure<br>am I now?</th><th>What I'll do to get ready</th></tr></thead>
      <tbody>${c.targets.map(t => `<tr><td>${esc(t.text)}</td><td>${circles()}</td><td></td></tr>`).join('')}</tbody></table>
      <div class="two"><div class="q"><div class="qt">I predict I'll score about ______ %</div><div class="qt sm">because...</div>${lines(2)}</div>
        <div class="q"><div class="qt">My study plan: when, and how? <span class="hint">(Quiz yourself; don't just reread.)</span></div>${lines(3)}</div></div>
      <div class="q grow"><div class="qt">Questions I still have before the test:</div>${lines(20)}</div>`, { foot: `${tag} · Before the test` });
    page(`${head(`${Wc} ${c.n} · After the test`, 'How did it go?')}
      <div class="two"><div class="q"><div class="qt">My score: ______ %</div><div class="qt sm">I predicted: ______ %</div></div>
        <div class="q"><div class="qt">Was I close?</div><div class="checks">☐ yes, within 10%<br>☐ no: I was overconfident (I knew less than I thought)<br>☐ no: I was underconfident (I knew more than I thought)</div></div></div>
      <table class="grid missed"><thead><tr><th style="width:9%">Q #</th><th style="width:44%">Why did I miss it?</th><th>What's the right idea?</th></tr></thead>
      <tbody>${'<tr><td></td><td class="small">☐ didn\'t know it ☐ misread it<br>☐ careless ☐ ran out of time</td><td></td></tr>'.repeat(8)}</tbody></table>
      <div class="two grow"><div class="q"><div class="qt">What worked in how I got ready</div>${lines(20)}</div><div class="q"><div class="qt">What I'll change next ${W}</div>${lines(20)}</div></div>`, { foot: `${tag} · After the test` });
    page(`${head(`${Wc} ${c.n} · Looking back`, '...Now I think')}
      <div class="q big"><div class="qt">I used to think... (copy it from the start of the ${W})</div>${lines(3)}</div>
      <div class="q big grow"><div class="qt">Now I think...</div>${lines(20)}</div>
      <div class="q"><div class="qt">Proof I learned it: my best work this ${W} was ______ because...</div>${lines(4)}</div>
      <div class="q"><div class="qt">Go back to the targets page and circle your <b>After</b> ratings. Add your scores to the tracker on page 5.</div></div>
      <div class="check"><div class="check-h">Notebook check · ${Wc} ${c.n}</div>
        <div class="check-grid"><span>☐ Opener: I used to think + targets rated</span><span>☐ An exit strip for every class</span><span>☐ Thinking on every left page</span><span>☐ Before the test</span><span>☐ After the test + Now I think</span></div>
        <div class="check-key">${CHECK_POINTS} = everything done · ${Math.round(CHECK_POINTS * 0.8)} = one or two classes missing · ${Math.round(CHECK_POINTS / 2)} = about half · 0 = not done</div>
        <div class="check-score">Score: ______ / ${CHECK_POINTS} &nbsp;&nbsp; Teacher: ______</div></div>`, { foot: `${tag} · Looking back` });
}

// Back pages: glossary, advice, extra dot pages, ending on a left (back) page
const glossaryStart = pageNo + 1;
for (let g = 0; g < 2; g++) {
    page(`${head('In my own words', 'My glossary')}
      <table class="grid gloss"><thead><tr><th style="width:24%">Word</th><th>What it means (my words)</th><th style="width:26%">Example or sketch</th></tr></thead>
      <tbody>${'<tr><td></td><td></td><td></td></tr>'.repeat(13)}</tbody></table>`, { foot: 'Glossary' });
}
page(`${head('End of the semester', 'Looking back on how I learn')}
  ${[['What will I still remember five years from now that I learned this semester?', 4], ['What did I learn about HOW I learn best?', 4],
    ['Which strategy from the menu helped me the most? Why?', 3], ['What advice would I give a friend taking this class next semester?', 20]].map(([q, n], i, a) => `<div class="q${i === a.length - 1 ? ' grow' : ''}"><div class="qt">${esc(q)}</div>${lines(n)}</div>`).join('')}`, { foot: 'Looking back' });
const extraStart = pageNo + 1;
while (pageNo % 2 === 1 || pageNo < extraStart + 1) page(`<div class="spacer">${dotGrid('100%', ++dotId)}</div>`, { foot: 'Extra page' });

// Contents, now that every chapter's page is known
const contentsHtml = `${head('Contents', `${courseName} · ${TERM}`)}
  <table class="grid contents"><tbody>
  <tr><td>How this notebook works</td><td>2</td></tr><tr><td>My plan for this semester</td><td>3</td></tr><tr><td>Strategy Menu</td><td>4</td></tr><tr><td>My learning tracker</td><td>5</td></tr><tr><td>Question parking lot</td><td>6</td></tr>
  ${DOCX ? '<tr><td>My elbow partners and 4-Square group</td><td>8</td></tr>' : ''}
  ${contents.map(({ c, start }) => `<tr class="ch"><td><b>${Wc} ${c.n}: ${esc(c.title)}</b> <span class="small">(${c.lessons.length} lessons)</span></td><td>${start}</td></tr>`).join('')}
  <tr><td>My glossary</td><td>${glossaryStart}</td></tr><tr><td>Extra pages</td><td>${extraStart}</td></tr></tbody></table>`;
pages[contentsPage - 1] = pages[contentsPage - 1].replace('@@CONTENTS@@', contentsHtml);

const font = `file://${path.join(ROOT, 'css', 'EduNSWACTFoundation-VariableFont_wght.woff2')}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(courseName)} Learning Notebook · ${esc(TERM)}</title>
<style>
@font-face { font-family: 'Edu NSW'; src: url('${font}') format('woff2'); font-weight: 400 700; }
@page { size: letter; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 8.5in; height: 11in; position: relative; overflow: hidden; page-break-after: always; break-after: page; }
.page .inner { position: absolute; top: 0.5in; bottom: 0.65in; display: flex; flex-direction: column; gap: 0.12in; }
.page.right .inner { left: 0.85in; right: 0.5in; }   /* spiral on the left of a right-hand page */
.page.left .inner { left: 0.5in; right: 0.85in; }
.foot { position: absolute; bottom: 0.3in; font-size: 8pt; color: #555; display: flex; gap: 0.15in; }
.page.right .foot { right: 0.5in; } .page.left .foot { left: 0.5in; flex-direction: row-reverse; }
.foot .num { font-weight: 700; color: #111; }
h1, .eyebrow, .lbl, .qt, .exit-h, .check-h, .big { font-family: 'Edu NSW', Arial, sans-serif; }
h1 { font-size: 20pt; margin: 0; line-height: 1.1; }
.eyebrow { font-size: 9pt; letter-spacing: .06em; text-transform: uppercase; color: #444; font-weight: 700; }
.ph { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 0.06in; gap: .2in; }
.date { white-space: nowrap; font-size: 10pt; }
.fill { display: inline-block; border-bottom: 1px solid #111; min-width: 2.4in; height: 1em; vertical-align: bottom; } .fill.short { min-width: 1in; }
.lbl { font-weight: 700; font-size: 11pt; }
.lines .ln, .ln { border-bottom: 1px solid #9a9a9a; height: 0.3in; }
.ln.flex { flex: 1; height: 0.22in; }
.q { display: flex; flex-direction: column; } .q.grow { flex: 1; min-height: 0; overflow: hidden; } .qt { font-weight: 700; font-size: 11.5pt; } .qt.sm { font-size: 10.5pt; font-weight: 400; } .hint { font-weight: 400; font-size: 9pt; color: #444; font-family: Arial, sans-serif; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25in; }
.box { border: 1.5px solid #111; border-radius: 8px; padding: 0.1in 0.14in; } .box.small, .small { font-size: 9pt; } .box.cq { background: #f1f1f1; }
.lede { margin: 0; color: #333; }
table.grid { width: 100%; border-collapse: collapse; } table.grid th, table.grid td { border: 1px solid #555; padding: 0.05in 0.07in; vertical-align: top; text-align: left; }
table.grid th { background: #ececec; font-size: 9pt; } .tracker td { height: 0.48in; } .parking td { height: 0.42in; } .gloss td { height: 0.62in; } .missed td { height: 0.55in; }
table.targets td:nth-child(n+2) { white-space: nowrap; } .targets td { font-size: 9.5pt; }
.kind { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; border: 1px solid #555; border-radius: 3px; padding: 0 3px; } .code { font-size: 8pt; color: #555; }
.circles { display: inline-flex; gap: 4px; } .circles .c { width: 0.22in; height: 0.22in; border: 1.2px solid #111; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 8.5pt; }
.legend { display: flex; flex-wrap: wrap; gap: 0.08in 0.2in; font-size: 9pt; }
.contents td:last-child { width: 0.6in; text-align: right; } .contents tr.ch td { padding-top: 0.1in; }
/* cover */
.cover { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.25in; padding-top: 0.6in; height: 100%; }
.cover .logo { width: 1.6in; filter: grayscale(1); } .cover .big { font-size: 40pt; } .cover .tag { font-size: 14pt; margin: 0; font-style: italic; }
.cover .who { width: 80%; display: flex; gap: 0.3in; justify-content: center; font-size: 13pt; margin-top: 0.4in; } .cover .who .fill { min-width: 3in; }
.cover .howto { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3in; margin-top: auto; width: 90%; } .cover .howto div { border: 1.5px solid #111; border-radius: 10px; padding: 0.15in; }
.cover .chs { color: #444; }
.howlist li { margin-bottom: 0.1in; } .howlist { padding-left: 0.25in; margin: 0; font-size: 11pt; }
.menu { display: grid; grid-template-columns: 1fr 1fr; gap: 0.1in; } .mi { border: 1px solid #555; border-radius: 8px; padding: 0.08in 0.1in; display: flex; flex-direction: column; font-size: 9.5pt; } .mi b { font-family: 'Edu NSW', Arial; font-size: 12pt; }
/* thinking page */
.think-top { border: 1.5px solid #111; border-radius: 8px; padding: 0.08in 0.12in; } .prompt { font-size: 10.5pt; margin-top: 2px; }
.think-area { flex: 1; min-height: 0; border: 1px dashed #bbb; border-radius: 6px; overflow: hidden; } .dots { display: block; height: 100%; }
.spacer { height: 100%; }
.exit { border: 2px solid #111; border-radius: 8px; padding: 0.07in 0.12in; display: flex; flex-direction: column; gap: 0.05in; }
.exit-h { font-weight: 700; font-size: 11pt; } .exit-row { display: flex; align-items: flex-end; gap: 0.1in; } .exit-row .lbl { font-size: 10pt; white-space: nowrap; }
.stmt { flex: 1; font-size: 9pt; } .scale-key { font-size: 7.5pt; color: #444; text-align: right; margin-top: -2px; }
/* guided page */
.target { display: flex; gap: 0.12in; align-items: baseline; } .target ul { margin: 0; padding-left: 0.2in; } .target .lines { flex: 1; }
.donow { border: 1.5px solid #111; border-radius: 8px; padding: 0.07in 0.12in; } .dq { font-size: 10.5pt; } .dq.muted { color: #555; font-style: italic; }
.keys ol { margin: 0.05in 0 0; padding-left: 0.25in; } .keys li { margin: 0.07in 0; line-height: 1.7; }
.blank { display: inline-block; border-bottom: 1.2px solid #111; height: 1.1em; vertical-align: bottom; }
.bank { display: flex; flex-wrap: wrap; gap: 0.06in; margin-top: 0.03in; } .bank span { border: 1px dashed #555; border-radius: 4px; padding: 1px 6px; font-size: 9pt; }
.notes { flex: 1; min-height: 0.8in; overflow: hidden; display: flex; flex-direction: column; } .fillarea { flex: 1; overflow: hidden; }
.work { font-size: 9.5pt; border-top: 1px solid #111; padding-top: 0.05in; }
/* notebook check */
.check { margin-top: auto; border: 2px solid #111; border-radius: 8px; padding: 0.08in 0.12in; } .check-h { font-weight: 700; font-size: 12pt; }
.check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.03in 0.2in; font-size: 9.5pt; margin: 0.04in 0; } .check-score { font-weight: 700; text-align: right; } .check-key { font-size: 8.5pt; color: #333; }
.two.grow { flex: 1; min-height: 0; overflow: hidden; } .two.grow .q { overflow: hidden; }
.checks { font-size: 10pt; }
.hookbox { border: 2px solid #111; border-radius: 8px; padding: 0.07in 0.12in; display: flex; flex-direction: column; gap: 0.04in; font-size: 9.5pt; }
.hookbox .hk { display: flex; gap: 0.1in; align-items: baseline; } .hookbox .tag { flex: none; width: 0.62in; text-align: center; font-weight: 700; font-size: 7.5pt; letter-spacing: .06em; border: 1.2px solid #111; border-radius: 4px; padding: 1px 0; }
/* CS day pages */
.std { font-size: 8.5pt; color: #444; margin-top: -0.06in; }
.parts { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 0.06in; overflow: hidden; }
.parts.dense { font-size: 9pt; gap: 0.04in; } .parts.dense .lbl { font-size: 10pt; }
.parts .tx { font-size: inherit; } .parts .tx.strong { font-weight: 700; }
.wl { min-height: 0.3in; overflow: hidden; }
.pbox { border: 1.5px solid #111; border-radius: 8px; padding: 0.06in 0.12in; display: flex; flex-direction: column; min-height: 0.5in; overflow: hidden; gap: 0.03in; }
.chk { display: flex; flex-wrap: wrap; gap: 0.02in 0.25in; }
.blk { display: flex; gap: 0.08in; align-items: flex-end; } .blk .blank { flex: none; } .blk span:last-child { flex: 1; font-size: 9.5pt; }
table.self td { font-size: 9pt; } table.self td:last-child { width: 1.3in; white-space: nowrap; }
.partners td { height: 0.5in; } .partners .qtr { vertical-align: middle; font-weight: 700; }
.sq { border: 1.5px solid #111; border-radius: 10px; padding: 0.12in; display: flex; flex-direction: column; gap: 0.1in; }
.sqh { font-family: 'Edu NSW', Arial; font-weight: 700; font-size: 12pt; }
.sqgrid { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1.55in; border: 1px solid #555; } .sqgrid div { border: 1px solid #555; padding: 0.06in; color: #777; font-size: 9pt; }
@media screen { body { background: #888; } .page { background: #fff; margin: 0.2in auto; box-shadow: 0 2px 8px rgba(0,0,0,.4); } }
</style></head><body>
${pages.join('\n')}
</body></html>`;
fs.writeFileSync(OUT, html);
console.log(`${OUT}: ${pageNo} pages (${chapters.map(c => `${WS} ${c.n}: ${c.lessons.length} lessons`).join(', ')})`);
