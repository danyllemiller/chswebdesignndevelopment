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

const WD_DOC_DATA = [
  { ch: 1, title: "The Developer's World", slug: 'join-the-developers-guild',
    standards: ['1.1.1','1.1.2','1.1.3','1.2.1','1.2.2','1.2.3','1.2.6','1.3.1','1.3.3','1.4.2','1.4.4','1.5.1','1.5.2','1.5.3','2.1.1','2.1.2','2.1.3','2.3.1','2.3.2','2.3.3','2.5.1','2.5.3','2.5.4','4.2.1','4.2.2','6.1.3'],
    work: [
      ['Agency Job Application', 25], ['Quick Check: Internet vs. Web', 10], ['Quick Check: DNS & Domains', 10],
      ['Quick Check: URLs & HTTPS', 10], ['Quick Check: File Naming Rules', 10], ['The Executive Summary', 25],
      ['Quick Check: The Project Triangle', 10], ['The Code of Conduct', 25],
      ['Milestone: Professional Setup', 100], ['Project M1: The Job Application', 20], ['Project M2: The Business Plan', 20],
      ['Milestone: Digital Real Estate', 20], ['Project M4: Client Expectations', 20], ['Project M5: The Code of Conduct', 20]
    ] },
  { ch: 2, title: 'The Rules (How Not to Get Sued)', slug: 'the-rules-how-not-to-get-sued',
    standards: ['3.1.1','3.1.2','3.1.3','3.1.4','3.2.1','3.2.2','3.2.3','3.2.4','3.2.5','3.2.6','3.2.7','3.2.8','3.3.1','3.3.2','3.3.3','4.6.1','4.6.2','4.6.5'],
    work: [ ['Lab 1: Asset Integrity', 25], ['Lab 2: Inclusive Design Proposal', 25], ['Milestone: The Ethics & A11y Audit', 100] ] },
  { ch: 3, title: 'The Blueprint', slug: 'the-blueprint',
    standards: ['2.4.1','2.4.2','2.4.3','2.4.4','2.4.5','4.1.1','4.1.2','4.3.2','4.3.3','4.4.1','4.4.2','4.4.3','4.4.4','4.4.5','4.4.8'],
    work: [ ['Lab 1: The Pain Point Audit', 25], ['Lab 2: Meet Your Persona', 25], ['Lab 3: The Blue Ocean Map', 25],
      ['Lab 4: The MVP Scope List', 25], ['Lab 5: The File Tree Map', 25], ['Milestone: Project Blueprint', 100] ] },
  { ch: 4, title: 'The Why (Intro to UI/UX)', slug: 'the-why-intro-to-uiux',
    standards: ['2.2.1','2.2.2','2.2.3','2.2.4','2.2.5','4.3.1','4.4.7','4.6.4'],
    work: [ ['Lab 1: The Hierarchy Audit', 25], ['Lab 2: Brand UI Kit', 25], ['Lab 3: The Component Lab', 25],
      ['Lab 4: The Linked Flow Lab', 25], ['Milestone: Phase 2 High-Fi Mockup', 100] ] },
  { ch: 5, title: 'The Bones (Intro to HTML)', slug: 'the-bones-intro-to-html',
    standards: ['4.2.3','4.6.3','5.1.1','5.1.2','5.1.3','5.1.4','5.1.5'],
    work: [ ['Milestone 1: Capstone Setup', 25], ['Lab 2: Typography Translation', 25], ['Lab 3: Nav List Structure', 25],
      ['Lab 4: The Network Link Lab', 25], ['Lab 5: The Global Skeleton', 25], ['Lab 6: Content Blocks', 25],
      ['Lab 7: Image Placeholders', 25], ['Lab 8: Full Contact Form', 25], ['Milestone: Zero Error Audit', 50] ] },
  { ch: 6, title: 'The Clothes (Intro to CSS)', slug: 'the-clothes-intro-to-css',
    standards: ['4.3.5','5.2.1','5.2.2','5.2.3','5.2.4','5.2.5','5.2.7'],
    work: [ ['Lab 1: The External Sheet', 25], ['Lab 2: Structural Targeting', 25], ['Lab 3: Specificity Audit', 25],
      ['Lab 4: CSS Variables', 25], ['Lab 5: Brand Typography', 25], ['Lab 6: Spacing & Breathing', 25],
      ['Lab 7: Visual Accents', 25], ['Lab 8: Browser Reset', 25], ['Milestone: Base CSS Integration', 100] ] },
  { ch: 7, title: 'The Style (Advanced CSS Layout)', slug: 'the-style-advanced-css-layout',
    standards: ['4.3.4','5.2.6','5.2.8'],
    work: [ ['Lab 1: Display Fixes', 25], ['Labs 2 & 3: Flexbox & Centering', 50], ['Labs 4 & 5: Grid Skeleton & Gallery', 50],
      ['Lab 6: The Sticky Header', 25], ['Labs 7-9: Breakpoints & Refactoring', 75], ['Milestone: Project Architecture', 100] ] },
  { ch: 8, title: 'Sights & Sounds (Media & Tables)', slug: 'sights-sounds-making-it-pop-html-media',
    standards: ['1.3.2','4.4.6','4.5.1','4.5.2','4.5.3','4.5.4','4.5.5','4.5.6'],
    work: [ ['Lab: Raster Compression', 25], ['Lab: Responsive Imagery', 25], ['Lab: The SVG Logo & Favicons', 25],
      ['Lab: Code Correction (Video)', 25], ['Lab: Code Correction (Audio)', 25], ['Lab: Map & Video Embeds', 25],
      ['Lab: Semantic Data Tables', 25], ['Lab: Proportions & Hover Effects', 50], ['Milestone: Media Integration', 100] ] },
  { ch: 9, title: 'The Brains (Intro to JavaScript)', slug: 'the-brains-intro-to-javascript',
    standards: ['5.3.1','5.3.2','5.3.3','5.3.5'],
    work: [ ['Lab 1: The Data Vault Lab', 25], ['Lab 2: Reusable UI Functions', 25], ['Lab 3: Decision Engine Lab', 25],
      ['Lab 4: The Interactive Wire Lab', 25], ['Milestone: Profile App Assembly', 100] ] },
  { ch: 10, title: 'The Game Dev (Advanced JS Game Logic)', slug: 'the-game-dev-advanced-js-game-logic',
    standards: ['1.2.4','1.2.5','1.4.5','5.3.4','5.3.6'],
    work: [ ['Lab 1: Canvas Coordinate Art Lab', 25], ['Lab 2: The Bouncing Box Lab', 25], ['Lab 3: The Entity Factory', 25],
      ['Lab 4: The Hitbox Detector', 25], ['Milestone: Game Assembly & QA', 100] ] },
  { ch: 11, title: 'The Cloud (Collaboration & Hosting)', slug: 'the-cloud-collaboration-hosting',
    standards: ['4.2.4','4.2.5','5.6.1','5.6.2','5.6.3','6.1.1','6.1.2','6.1.4','6.1.5'],
    work: [ ['Lab 1: Agency File Architecture Setup', 25], ['Lab 2: Local Agency Backup', 25], ['Lab 3: Syncing with the Agency Hub', 25],
      ['Lab 4: Client Infrastructure Proposal', 25], ['Milestone: Open Source Repo', 100] ] },
  { ch: 12, title: 'The Manager (CMS Platforms)', slug: 'the-manager-cms-platforms',
    standards: ['2.5.2','5.5.1','5.5.2','5.5.3'],
    work: [ ['Lab 1: The Platform Pitch Matrix', 25], ['Lab 2: Information Architecture Lab', 25], ['Lab 3: The Design Skin', 25],
      ['Lab 4: Forms & SEO Security', 25], ['Milestone: Client Site Assembly', 100] ] },
  { ch: 13, title: 'The Network (Intro to APIs)', slug: 'the-network-intro-to-apis',
    standards: ['7.1.1','7.1.2','7.1.3'],
    work: [ ['Lab 1: The JSON Blueprint Lab', 25], ['Lab 2: The Fetch Connection', 25], ['Lab 3: Dynamic Search Lab', 25],
      ['Lab 4: UX States Lab', 25], ['Milestone: Real-Time Data App', 100] ] },
  { ch: 14, title: 'The Brain (Databases)', slug: 'the-brain-databases',
    standards: ['5.4.1','5.4.2','5.4.3','5.4.4'],
    work: [ ['Lab 1: The CRUD App Audit', 25], ['Lab 2: The Schema Architect Lab', 25], ['Lab 3: The Data Detective Lab', 25],
      ['Lab 4: Secure Data Entry Lab', 25], ['Milestone: The Library Database', 100] ] },
  { ch: 15, title: 'The Future (The Game Never Ends)', slug: 'the-game-never-ends',
    standards: ['7.2.1','7.2.2','7.2.3','7.2.4','7.3.1','7.3.2','7.4.1','7.4.2'],
    work: [ ['Lab 1: Prompt Engineering Lab', 25], ['Lab 2: Ethics Case Study', 25], ['Lab 3: AR Integration Plan', 25],
      ['Lab 4: IoT Security Audit', 25], ['Milestone: Capstone Future-Cast Expo', 100] ] },
  { ch: 16, title: 'The Final Boss (Going Live)', slug: 'the-final-boss-going-live',
    standards: ['1.4.1','1.4.3','6.2.1','6.2.2','6.2.3','6.2.4','6.2.5','6.3.1','6.3.2','6.3.3','6.3.4','6.3.5'],
    work: [ ['Lab 1: Manual FTP Upload', 25], ['Lab 2: Automated Cloud Launch', 25], ['Lab 3: The QA Audit', 25],
      ['Lab 4: Lighthouse Polish', 25], ['Milestone: Live Portfolio Launch', 100] ] }
];

const CS_DOC_DATA = [
  { unit: 1, title: 'Unit 1: Digital Citizenship', slug: 'cs-unit-1',
    work: [ ['Ch1: The Footprint Audit', 25], ['Ch1: The Conduct Case Studies', 25], ['Ch1: The Threat Recognition Lab', 25],
      ['Ch2: The Data Trail', 25], ['Ch2: The Attribution Lab', 25], ['Ch2: The Privacy Position', 25] ] },
  { unit: 2, title: 'Unit 2: Computing Systems', slug: 'cs-unit-2',
    work: [ ['Ch3: The Abstraction Teardown', 25], ['Ch3: The Layer Interaction Map + File System Audit', 25], ['Ch3: The Troubleshooting Guide', 25],
      ['Ch4: The Audience Rebuild', 25], ['Ch4: The Distributed Build', 25] ] },
  { unit: 3, title: 'Unit 3: Data & Analysis', slug: 'cs-unit-3',
    work: [ ['Ch5: The Binary Translator', 25], ['Ch5: The Encoding Lab', 25], ['Ch6: The Organization Audit', 25],
      ['Ch6: The Storage Tradeoff Matrix', 25], ['Ch7: The Function Toolkit', 25], ['Ch7: The Chart Rebuild + Dashboard Build', 25],
      ['Ch8: The Model Build', 25], ['Ch8: The Reality Check', 25] ] },
  { unit: 4, title: 'Unit 4: Beg. Algorithm & Programming', slug: 'cs-unit-4',
    work: [ ['Ch9: The Decomposition Tree', 25], ['Ch9: The Pseudocode Spec', 25], ['Ch9: The First Prototype', 25],
      ['Ch10: The Decision Logic', 25], ['Ch10: The Iteration Build', 25], ['Ch10: The Event-Driven Artifact', 25] ] },
  { unit: 5, title: 'Unit 5: Impacts of Computing', slug: 'cs-unit-5',
    work: [ ['Ch11: The Bias Test', 25], ['Ch12: The Cross-Discipline Brief', 25], ['Ch12: The Privacy Audit', 25] ] },
  { unit: 6, title: 'Unit 6: Intermediate A&P', slug: 'cs-unit-6',
    work: [ ['Ch14: The Array Refactor', 25], ['Ch14: The Structure Comparison', 25], ['Ch15: The Procedure Library', 25],
      ['Ch15: The Integrated Tool', 25], ['Ch16: The Feedback Cycle', 25], ['Ch16: The License Audit', 25], ['Ch16: The Accessibility Pass', 25] ] },
  { unit: 7, title: 'Unit 7: Networks and the Internet', slug: 'cs-unit-7',
    work: [ ['Ch17: The Network Map', 25], ['Ch18: The Threat Log', 25], ['Ch19: The Tradeoff Matrix', 25],
      ['Ch19: The Security Brief', 25], ['Project: The Network Audit', 100] ] }
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

function metacognitionHtml(unitData) {
  if (!unitData) return '<div class="fill-box" aria-hidden="true"></div>';
  const m = unitData.metacognition;
  if (!m || m.reflectedCount === 0) {
    return `<span class="no-data">No reflections submitted yet</span><div class="fill-box mt-2" aria-hidden="true"></div>`;
  }
  const pct = m.rosterCount > 0 ? Math.round((m.reflectedCount / m.rosterCount) * 100) : null;
  const coverage = `${m.reflectedCount}${m.rosterCount ? `/${m.rosterCount}` : ''} students completed a reflective self-assessment${pct !== null ? ` (${pct}%)` : ''}`;
  const avgLine = m.avgSelfLevel !== null
    ? `<div class="text-muted small mt-1">Avg self-rated level: ${m.avgSelfLevel} / 4.0</div>`
    : (m.reflectedCount > 0 ? `<div class="text-muted small mt-1">Avg self-rated level not shown — fewer than 5 students</div>` : '');
  return `<div>${coverage}</div>${avgLine}`;
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
    const standardsHtml = r.standards
      ? `<div class="std-codes"><span class="text-muted small">Nevada CTE PIs (${r.standards.length}):</span> ${r.standards.map(c => `NV ${c}`).join(', ')}</div>`
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
