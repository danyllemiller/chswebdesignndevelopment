// Curriculum documentation grid -- mirrors the "Highly Effective Teaching"
// documentation format (Essential Learning / Prof Scale & Standards /
// Metacognition / Student Work-Rigor / Beginning Essential Learning /
// Pre-Assessment / Post Assessment / Retake) for WD1, WD2, and CS.
//
// Every column pulls from data this app already has, rather than being
// re-typed by hand:
//   - Essential Learning, labs/milestones (rigor evidence): the same
//     chapter/unit maps used by admin/due-dates.html (WD_MAP/CS_MAP),
//     copied here rather than imported since those live as page-local
//     consts, not a shared module.
//   - Standards codes: the Nevada CTE Performance Indicators assigned to
//     each WD chapter in curriculum/Web-Design-and-Development-STDS-2023's
//     companion Two-Year Curriculum Map (Section 3, "Standards Coverage").
//     CS has no equivalent indicator-mapping document yet, so its
//     Standards column is left blank rather than guessed.
//   - Prof. Scale link: the real per-chapter page under /proficiencyScales/.
//   - Beginning Essential Learning link: the real per-chapter 5E/AVID
//     lesson plan already built at /admin/lesson-plan-binder.html#chN
//     (WD only -- CS has no lesson-plan binder yet).
//   - Pre-Assessment / Post Assessment / Retake: live, from the same
//     /api/admin/attempt-analytics endpoint admin/tools/attempt-analytics.html
//     already uses -- not a snapshot, so it stays accurate as the year goes on.
//
// Metacognition has no tracked source anywhere in the app (confirmed by
// search before building this) -- it stays a blank, printable fill-in box,
// same as it's blank for most rows in the reference document this was
// modeled on.

// `work` lists only the milestones/projects that feed the chapter's real
// deliverable -- not every lab or quick-check along the way (per-chapter
// labs stay in admin/due-dates.html's WD_MAP if that level of detail is
// ever needed elsewhere; this column is meant to show rigor evidence at a
// glance, not the full assignment list).
const WD_DOC_DATA = [
  { ch: 1, title: "The Developer's World", slug: 'join-the-developers-guild',
    standards: ['1.1.1','1.1.2','1.1.3','1.2.1','1.2.2','1.2.3','1.2.6','1.3.1','1.3.3','1.4.2','1.4.4','1.5.1','1.5.2','1.5.3','2.1.1','2.1.2','2.1.3','2.3.1','2.3.2','2.3.3','2.5.1','2.5.3','2.5.4','4.2.1','4.2.2','6.1.3'],
    work: [
      ['Milestone: Professional Setup', 100], ['Project M1: The Job Application', 20], ['Project M2: The Business Plan', 20],
      ['Milestone: Digital Real Estate', 20], ['Project M4: Client Expectations', 20], ['Project M5: The Code of Conduct', 20]
    ] },
  { ch: 2, title: 'The Rules (How Not to Get Sued)', slug: 'the-rules-how-not-to-get-sued',
    standards: ['3.1.1','3.1.2','3.1.3','3.1.4','3.2.1','3.2.2','3.2.3','3.2.4','3.2.5','3.2.6','3.2.7','3.2.8','3.3.1','3.3.2','3.3.3','4.6.1','4.6.2','4.6.5'],
    work: [ ['Milestone: The Ethics & A11y Audit', 100] ] },
  { ch: 3, title: 'The Blueprint', slug: 'the-blueprint',
    standards: ['2.4.1','2.4.2','2.4.3','2.4.4','2.4.5','4.1.1','4.1.2','4.3.2','4.3.3','4.4.1','4.4.2','4.4.3','4.4.4','4.4.5','4.4.8'],
    work: [ ['Milestone: Project Blueprint', 100] ] },
  { ch: 4, title: 'The Why (Intro to UI/UX)', slug: 'the-why-intro-to-uiux',
    standards: ['2.2.1','2.2.2','2.2.3','2.2.4','2.2.5','4.3.1','4.4.7','4.6.4'],
    work: [ ['Milestone: Phase 2 High-Fi Mockup', 100] ] },
  { ch: 5, title: 'The Bones (Intro to HTML)', slug: 'the-bones-intro-to-html',
    standards: ['4.2.3','4.6.3','5.1.1','5.1.2','5.1.3','5.1.4','5.1.5'],
    work: [ ['Milestone 1: Capstone Setup', 25], ['Milestone: Zero Error Audit', 50] ] },
  { ch: 6, title: 'The Clothes (Intro to CSS)', slug: 'the-clothes-intro-to-css',
    standards: ['4.3.5','5.2.1','5.2.2','5.2.3','5.2.4','5.2.5','5.2.7'],
    work: [ ['Milestone: Base CSS Integration', 100] ] },
  { ch: 7, title: 'The Style (Advanced CSS Layout)', slug: 'the-style-advanced-css-layout',
    standards: ['4.3.4','5.2.6','5.2.8'],
    work: [ ['Milestone: Project Architecture', 100] ] },
  { ch: 8, title: 'Sights & Sounds (Media & Tables)', slug: 'sights-sounds-making-it-pop-html-media',
    standards: ['1.3.2','4.4.6','4.5.1','4.5.2','4.5.3','4.5.4','4.5.5','4.5.6'],
    work: [ ['Milestone: Media Integration', 100] ] },
  { ch: 9, title: 'The Brains (Intro to JavaScript)', slug: 'the-brains-intro-to-javascript',
    standards: ['5.3.1','5.3.2','5.3.3','5.3.5'],
    work: [ ['Milestone: Profile App Assembly', 100] ] },
  { ch: 10, title: 'The Game Dev (Advanced JS Game Logic)', slug: 'the-game-dev-advanced-js-game-logic',
    standards: ['1.2.4','1.2.5','1.4.5','5.3.4','5.3.6'],
    work: [ ['Milestone: Game Assembly & QA', 100] ] },
  { ch: 11, title: 'The Cloud (Collaboration & Hosting)', slug: 'the-cloud-collaboration-hosting',
    standards: ['4.2.4','4.2.5','5.6.1','5.6.2','5.6.3','6.1.1','6.1.2','6.1.4','6.1.5'],
    work: [ ['Milestone: Open Source Repo', 100] ] },
  { ch: 12, title: 'The Manager (CMS Platforms)', slug: 'the-manager-cms-platforms',
    standards: ['2.5.2','5.5.1','5.5.2','5.5.3'],
    work: [ ['Milestone: Client Site Assembly', 100] ] },
  { ch: 13, title: 'The Network (Intro to APIs)', slug: 'the-network-intro-to-apis',
    standards: ['7.1.1','7.1.2','7.1.3'],
    work: [ ['Milestone: Real-Time Data App', 100] ] },
  { ch: 14, title: 'The Brain (Databases)', slug: 'the-brain-databases',
    standards: ['5.4.1','5.4.2','5.4.3','5.4.4'],
    work: [ ['Milestone: The Library Database', 100] ] },
  { ch: 15, title: 'The Future (The Game Never Ends)', slug: 'the-game-never-ends',
    standards: ['7.2.1','7.2.2','7.2.3','7.2.4','7.3.1','7.3.2','7.4.1','7.4.2'],
    work: [ ['Milestone: Capstone Future-Cast Expo', 100] ] },
  { ch: 16, title: 'The Final Boss (Going Live)', slug: 'the-final-boss-going-live',
    standards: ['1.4.1','1.4.3','6.2.1','6.2.2','6.2.3','6.2.4','6.2.5','6.3.1','6.3.2','6.3.3','6.3.4','6.3.5'],
    work: [ ['Milestone: Live Portfolio Launch', 100] ] }
];

// Standards codes come from compsci/scope&sequence.txt (the real Nevada
// Academic Content Standards for Computer Science & Integrated Technology
// excerpt already in the repo), matched to each unit's actual chapters by
// filename rather than that file's own stale "Unit N" column, which
// predates the live 7-unit grouping in CS_MAP (admin/due-dates.html).
const CS_DOC_DATA = [
  { unit: 1, title: 'Unit 1: Digital Citizenship', slug: 'cs-unit-1',
    standards: ['DC.B.1','DC.B.2','DC.A.1','DC.D.1'],
    work: [ ['Project: The Digital Citizenship Case File', 100] ] },
  { unit: 2, title: 'Unit 2: Computing Systems', slug: 'cs-unit-2',
    standards: ['CS.D.1','CS.HS.1','AP.PD.4'],
    work: [ ['Project: The System & Support Deck', 100] ] },
  { unit: 3, title: 'Unit 3: Data & Analysis', slug: 'cs-unit-3',
    standards: ['DA.S.1','DA.S.2','DA.CVT.1','DA.IM.1'],
    work: [ ['Project: The Data Story Dashboard', 100] ] },
  { unit: 4, title: 'Unit 4: Beg. Algorithm & Programming', slug: 'cs-unit-4',
    standards: ['AP.A.1','AP.C.1','AP.C.2'],
    work: [ ['Project: The Algorithm Design Blueprint', 100] ] },
  { unit: 5, title: 'Unit 5: Impacts of Computing', slug: 'cs-unit-5',
    standards: ['IC.C.1','IC.C.2','IC.C.3','IC.C.4','IC.SLE.1','IC.SLE.2','IC.SLE.3'],
    work: [ ['Project: The Tech Impact Briefing', 100] ] },
  { unit: 6, title: 'Unit 6: Intermediate A&P', slug: 'cs-unit-6',
    standards: ['AP.V.1','AP.M.1','AP.M.2','AP.PD.1','AP.PD.4','AP.PD.5'],
    work: [ ['Project: The App Blueprint & Build Plan', 100] ] },
  { unit: 7, title: 'Unit 7: Networks and the Internet', slug: 'cs-unit-7',
    standards: ['NI.NCO.1','NI.C.1','NI.C.2','NI.C.3','NI.C.4'],
    work: [ ['Project: The Network Audit', 100] ] }
];

const COURSES = {
  WD1: { label: 'Web Design 1', levelLabel: 'Level 1 — Web Design I (Chapters 1–8)', rows: WD_DOC_DATA.filter(r => r.ch <= 8), kind: 'wd' },
  WD2: { label: 'Web Design 2', levelLabel: 'Level 2 — Web Design II (Chapters 9–16)', rows: WD_DOC_DATA.filter(r => r.ch >= 9), kind: 'wd' },
  CS:  { label: 'Computer Science', levelLabel: 'Computer Science & Integrated Technology (Units 1–7)', rows: CS_DOC_DATA, kind: 'cs' }
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function fmtPct(v) {
  return (v === null || v === undefined) ? '<span class="no-data">No data yet</span>' : `${v}%`;
}

// A suppressed cell (count > 0 but below MIN_PUBLIC_N server-side) reads
// differently from a genuinely empty one -- worth saying why the number
// isn't there instead of implying nothing happened yet.
function fmtSuppressable(stat, formatShown) {
  if (!stat || stat.count === 0) return '<span class="no-data">No data yet</span>';
  if (stat.avgPercent === null) return '<span class="no-data">Not shown — fewer than 5 students</span>';
  return formatShown(stat);
}

function workListHtml(work) {
  const total = work.reduce((sum, [, pts]) => sum + pts, 0);
  const items = work.map(([title, pts]) => `<li>${esc(title)} <span class="text-muted">— ${pts} pts</span></li>`).join('');
  return `<ul class="rigor-list">${items}</ul><div class="rigor-total">${work.length} items · ${total} pts total</div>`;
}

// Real metacognition tracking = completion of the end-of-chapter project's
// required self-assessment (two open-ended reflection prompts) and peer
// review (the required Critique Sandwich) -- see js/student/project-grading.js.
// Only Ch1 and Ch9 have that system turned on today (chapter_projects rows);
// every other chapter says so honestly instead of showing a fabricated 0.
// Quotes come from the server with ONLY first_name attached (never
// student_id or last_name -- stripped server-side in the API response
// itself, not just hidden here) so this can render exactly what was
// turned in without exposing who-beyond-a-first-name wrote it.
function metacognitionQuotesHtml(quotes) {
  if (!quotes || quotes.length === 0) return '';
  const items = quotes.map(q => `
    <div class="quote-card">
      <div class="quote-name">${esc(q.firstName)}</div>
      <div class="quote-text">${esc(q.feedback)}</div>
    </div>`).join('');
  return `<details class="mt-2"><summary>View ${quotes.length} submitted reflection${quotes.length === 1 ? '' : 's'}</summary>${items}</details>`;
}

function metacognitionHtml(unitData) {
  if (!unitData) return '<div class="fill-box" aria-hidden="true"></div>';
  const m = unitData.metacognition;
  if (!m) {
    return `<span class="no-data">Self/peer project grading not yet built for this chapter</span>`;
  }
  const pct = (count) => (m.rosterCount > 0 ? ` (${Math.round((count / m.rosterCount) * 100)}%)` : '');
  return `
    <div class="text-muted small mb-1">${esc(m.projectTitle)}</div>
    <div>${m.selfReflectedCount}${m.rosterCount ? `/${m.rosterCount}` : ''} completed self-reflection${pct(m.selfReflectedCount)}</div>
    <div>${m.peerReviewedCount}${m.rosterCount ? `/${m.rosterCount}` : ''} completed a peer review${pct(m.peerReviewedCount)}</div>
    ${metacognitionQuotesHtml(m.quotes)}
  `;
}

function analyticsCellsHtml(unitData) {
  if (!unitData) {
    return {
      pre: '<span class="no-data">No data yet</span>',
      post: '<span class="no-data">No data yet</span>',
      retake: '<span class="no-data">No data yet</span>'
    };
  }

  const pre = fmtSuppressable(unitData.pretest, s => `${fmtPct(s.avgPercent)} <span class="text-muted small">(n=${s.count})</span>`);

  const post = fmtSuppressable(unitData.exam1, s =>
    `${fmtPct(s.avgPercent)} avg <span class="${s.masteryPercent >= 80 ? 'mastery-good' : 'mastery-bad'}">· ${s.masteryPercent}% mastery</span> <span class="text-muted small">(n=${s.count})</span>`);

  const r2 = unitData.retake2, r3 = unitData.retake3;
  let retake;
  if (!r2.count && !r3.count) {
    retake = '<span class="mastery-good">No retakes needed</span>';
  } else {
    const parts = [];
    if (r2.count) parts.push(`${r2.count} retook once → ${fmtSuppressable(r2, s => `${fmtPct(s.avgPercent)} cumulative avg`)}`);
    if (r3.count) parts.push(`${r3.count} retook 2+ times → ${fmtSuppressable(r3, s => `${fmtPct(s.avgPercent)} cumulative avg`)}`);
    retake = parts.join('<br>');
  }
  return { pre, post, retake };
}

function renderRows(courseKey, analyticsByUnit) {
  const course = COURSES[courseKey];
  return course.rows.map(r => {
    const n = course.kind === 'wd' ? r.ch : r.unit;
    const unitData = analyticsByUnit[n];
    const cells = analyticsCellsHtml(unitData);

    const profScaleLink = `/proficiencyScales/${r.slug}.html`;
    const stdLabel = course.kind === 'wd' ? 'Nevada CTE PIs' : 'Nevada CS Standards';
    const stdPrefix = course.kind === 'wd' ? 'NV ' : '9-12.';
    const standardsHtml = r.standards
      ? `<div class="std-codes"><span class="text-muted small">${stdLabel} (${r.standards.length}):</span> ${r.standards.map(c => `${stdPrefix}${c}`).join(', ')}</div>`
      : `<div class="std-codes text-muted small">Standards mapping not yet built for this course.</div>`;

    const singletonHtml = course.kind === 'wd'
      ? `<a class="doc-link" href="/admin/lesson-plan-binder.html#ch${r.ch}" target="_blank" rel="noopener"><i class="fas fa-book me-1"></i>5E / AVID Lesson Plan</a>`
      : `<span class="text-muted small">Lesson-plan binder not yet built for CS.</span>`;

    const label = course.kind === 'wd' ? `Ch ${r.ch}: ${esc(r.title)}` : esc(r.title);

    return `
      <tr>
        <td class="col-essential"><strong>${label}</strong></td>
        <td class="col-standards">
          <a class="doc-link" href="${profScaleLink}" target="_blank" rel="noopener"><i class="fas fa-chart-bar me-1"></i>Proficiency Scale</a>
          ${standardsHtml}
        </td>
        <td class="col-meta">${metacognitionHtml(unitData)}</td>
        <td class="col-work">${workListHtml(r.work)}</td>
        <td class="col-singleton">${singletonHtml}</td>
        <td class="col-pre">${cells.pre}</td>
        <td class="col-post">${cells.post}</td>
        <td class="col-retake">${cells.retake}</td>
      </tr>`;
  }).join('');
}

async function loadCourse(courseKey) {
  const tbody = document.getElementById('docBody');
  const banner = document.getElementById('levelBanner');
  const course = COURSES[courseKey];
  banner.textContent = course.levelLabel;
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> Loading live assessment data...</td></tr>`;

  // Uses the public, no-login aggregate (not /api/admin/attempt-analytics)
  // so this page renders the same numbers for the teacher and for anyone
  // she shares the link with -- and so it works at all for a visitor with
  // no session, since the admin endpoint is staff-gated server-side.
  let analyticsByUnit = {};
  try {
    const res = await fetch(`/api/public/curriculum-analytics?course=${courseKey}`);
    if (res.ok) {
      const data = await res.json();
      (data.units || []).forEach(u => { analyticsByUnit[u.unit] = u; });
    }
  } catch (e) { /* render without live data rather than failing the whole page */ }

  tbody.innerHTML = renderRows(courseKey, analyticsByUnit);
}

document.querySelectorAll('#courseTabs [data-course]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#courseTabs [data-course]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadCourse(btn.dataset.course);
  });
});

document.getElementById('printBtn')?.addEventListener('click', () => window.print());

loadCourse('WD1');
