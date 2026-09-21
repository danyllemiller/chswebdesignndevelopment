// Self / peer / auto grading widget for a chapter-end project. Reads its
// config (chapter_project_id, exam_id, rubric criteria) from data
// attributes on its container so the same script can serve other
// milestones later without rewriting -- built and tested against Ch9's
// "Profile App Assembly" first.
import { getLoggedInUser } from '../modules/user-session.js';

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function scoreLabel(v) {
    return ['0 - No attempt', '1 - Novice', '2 - Apprentice', '3 - Practitioner', '4 - Exemplary'][v] || v;
}

// Ch1 teaches feedback as a "Critique Sandwich": a genuine positive, then
// specific constructive criticism, then another genuine positive. Three
// separate fields (instead of one open textarea) keep reviewers honoring
// that structure instead of skipping straight to just the criticism.
function critiqueSandwichFields(prefix) {
    return `
        <div class="mb-3">
            <label class="form-label small fw-bold">Feedback: The Critique Sandwich</label>
            <p class="text-muted mb-2" style="font-size:.8rem;">From Chapter 1: open with a genuine positive, give specific and actionable criticism, then close with another genuine positive.</p>
            <label class="form-label small">👍 Positive</label>
            <textarea class="form-control form-control-sm mb-2" id="${prefix}-fb-positive1" rows="2" placeholder="What's genuinely working well?"></textarea>
            <label class="form-label small">🔧 Constructive criticism</label>
            <textarea class="form-control form-control-sm mb-2" id="${prefix}-fb-criticism" rows="2" placeholder="What's one specific, actionable thing to improve?"></textarea>
            <label class="form-label small">👍 Positive</label>
            <textarea class="form-control form-control-sm" id="${prefix}-fb-positive2" rows="2" placeholder="Close with another genuine positive."></textarea>
        </div>
    `;
}

function readCritiqueSandwich(pane, prefix) {
    const get = id => (pane.querySelector(`#${prefix}-${id}`)?.value || '').trim();
    const positive1 = get('fb-positive1');
    const criticism = get('fb-criticism');
    const positive2 = get('fb-positive2');
    if (!positive1 || !criticism || !positive2) return null;
    return `Positive: ${positive1}\n\nConstructive criticism: ${criticism}\n\nPositive: ${positive2}`;
}

// The Critique Sandwich (above) is feedback on someone ELSE's work -- it
// doesn't fit self-assessment, where the actual skill being built is
// metacognition: naming your own process and what you'd change about it,
// not just handing yourself a compliment/criticism/compliment. These two
// prompts are what the Metacognition column on the Curriculum
// Documentation page reads coverage from (see /api/public/curriculum-analytics),
// so they're required, not optional, before a self-assessment can submit.
function metacognitionFields(prefix) {
    return `
        <div class="mb-3">
            <label class="form-label small fw-bold">Reflect on your own process</label>
            <label class="form-label small">🧩 What was the hardest part of this project, and what specific strategy did you use to work through it?</label>
            <textarea class="form-control form-control-sm mb-2" id="${prefix}-meta-strategy" rows="2" placeholder="Name the actual sticking point and what you did about it -- not just 'it was hard.'"></textarea>
            <label class="form-label small">🔁 Looking back, what's one thing you'd do differently next time, and why?</label>
            <textarea class="form-control form-control-sm" id="${prefix}-meta-nextTime" rows="2" placeholder="Be specific enough that future-you could actually act on this."></textarea>
        </div>
    `;
}

function readMetacognition(pane, prefix) {
    const get = id => (pane.querySelector(`#${prefix}-${id}`)?.value || '').trim();
    const strategy = get('meta-strategy');
    const nextTime = get('meta-nextTime');
    if (!strategy || !nextTime) return null;
    return `What was hardest & how I worked through it: ${strategy}\n\nWhat I'd do differently next time: ${nextTime}`;
}

function criterionRow(name, crit, selectedVal) {
    const buttons = [0, 1, 2, 3, 4].map(v => `
        <button type="button" class="btn btn-sm ${Number(selectedVal) === v ? 'btn-primary' : 'btn-outline-primary'} rubric-score-btn"
                data-key="${crit.key}" data-value="${v}" title="${escapeHtml(scoreLabel(v))}">${v}</button>
    `).join('');
    const bonusBadge = crit.bonus ? `<span class="badge bg-warning text-dark ms-2">Bonus - not required</span>` : '';
    return `
        <div class="mb-3 pb-2 border-bottom" data-criterion-row="${crit.key}" data-bonus="${crit.bonus ? '1' : '0'}">
            <p class="mb-1 fw-bold small">${escapeHtml(crit.label)}${bonusBadge}</p>
            <p class="mb-2 text-muted" style="font-size:.8rem;">${escapeHtml(crit.description)}</p>
            <div class="btn-group" role="group" data-name="${name}">${buttons}</div>
        </div>
    `;
}

function readRubricValues(container, name) {
    const rows = container.querySelectorAll(`[data-criterion-row]`);
    const values = {};
    rows.forEach(row => {
        const active = row.querySelector(`.btn-primary[data-key]`);
        if (active) values[active.dataset.key] = Number(active.dataset.value);
    });
    return values;
}

function wireRubricButtons(container) {
    container.querySelectorAll('.rubric-score-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('[data-criterion-row]');
            row.querySelectorAll('.rubric-score-btn').forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary');
        });
    });
}

// Bonus criteria (e.g. an optional "challenge" step) are graded on top of
// the core score, not folded into the same 0-4 average -- so skipping an
// optional stretch goal can't cap a student who fully met the actual
// requirements below 100%.
const BONUS_MAX_POINTS = 10;

function averageToScore100(values, rubric) {
    const coreCriteria = rubric.filter(c => !c.bonus);
    const coreScores = coreCriteria.map(c => values[c.key]).filter(v => v !== undefined);
    if (coreScores.length === 0) return null;
    const avg = coreScores.reduce((a, b) => a + b, 0) / coreScores.length; // 0-4
    const base = Math.round((avg / 4) * 100);

    const bonusCriteria = rubric.filter(c => c.bonus);
    let bonusPoints = 0;
    bonusCriteria.forEach(c => {
        const v = values[c.key];
        if (v !== undefined) bonusPoints += (v / 4) * (BONUS_MAX_POINTS / bonusCriteria.length);
    });
    return Math.min(100, Math.round(base + bonusPoints));
}

async function initProjectGrading(container) {
    const chapterProjectId = container.dataset.chapterProjectId;
    const examId = container.dataset.examId;
    // CS's unit projects are self+peer only by design (Slides/Sheets
    // deliverables, no source code to scan) -- the Auto-Check tab is WD-only
    // now, not just quietly unconfigured for CS like it used to be.
    const hasAutoCheck = container.dataset.course !== 'CS';
    let rubric;
    try { rubric = JSON.parse(container.dataset.rubric); } catch (e) { console.error('[project-grading] Bad rubric JSON', e); return; }

    const user = getLoggedInUser();
    if (!user || !user.student_id) {
        container.innerHTML = `<div class="card-body small p-4 text-muted">Log in to grade this project.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="card-header bg-info text-white fw-bold"><i class="fas fa-clipboard-check me-2"></i>Grade the Project: Self${hasAutoCheck ? ', Peer, and Auto-Check' : ' and Peer'}</div>
        <div class="card-body small p-4">
            <ul class="nav nav-tabs mb-3" role="tablist">
                <li class="nav-item"><button class="nav-link active" data-tab="self" type="button">My Self-Assessment</button></li>
                <li class="nav-item"><button class="nav-link" data-tab="peer" type="button">Peer Review (In Person)</button></li>
                ${hasAutoCheck ? '<li class="nav-item"><button class="nav-link" data-tab="auto" type="button">Auto-Check My Code</button></li>' : ''}
                <li class="nav-item"><button class="nav-link" data-tab="results" type="button">My Results</button></li>
            </ul>
            <div data-pane="self"></div>
            <div data-pane="peer" class="d-none"></div>
            ${hasAutoCheck ? '<div data-pane="auto" class="d-none"></div>' : ''}
            <div data-pane="results" class="d-none"></div>
        </div>
    `;

    container.querySelectorAll('[data-tab]').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            container.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
            tabBtn.classList.add('active');
            container.querySelectorAll('[data-pane]').forEach(p => p.classList.add('d-none'));
            const pane = container.querySelector(`[data-pane="${tabBtn.dataset.tab}"]`);
            pane.classList.remove('d-none');
            if (tabBtn.dataset.tab === 'results') loadResults();
        });
    });

    // --- SELF pane ---
    const selfPane = container.querySelector('[data-pane="self"]');
    selfPane.innerHTML = `
        <p class="text-muted mb-3">Rate your own work honestly against each part of the assignment. This becomes one-third of your project grade (averaged with a classmate's review and an automatic code check).</p>
        ${rubric.map(c => criterionRow('self', c)).join('')}
        ${metacognitionFields('self')}
        <button type="button" class="btn btn-primary fw-bold" id="btn-submit-self">Submit Self-Assessment</button>
        <div class="mt-2" id="self-status"></div>
    `;
    wireRubricButtons(selfPane);
    selfPane.querySelector('#btn-submit-self').addEventListener('click', async () => {
        const values = readRubricValues(selfPane, 'self');
        const score = averageToScore100(values, rubric);
        const feedback = readMetacognition(selfPane, 'self');
        const statusEl = selfPane.querySelector('#self-status');
        if (score === null) { statusEl.innerHTML = `<span class="text-danger">Rate every criterion before submitting.</span>`; return; }
        if (!feedback) { statusEl.innerHTML = `<span class="text-danger">Answer both reflection questions before submitting.</span>`; return; }
        try {
            const res = await fetch('/api/student/project-evaluation', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chapter_project_id: chapterProjectId, exam_id: examId, student_id: user.student_id, evaluator_type: 'self', score, max_score: 100, rubric_json: values, feedback })
            });
            if (!res.ok) throw new Error('Request failed');
            statusEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i>Self-assessment submitted (${score}/100).</span>`;
        } catch (e) { statusEl.innerHTML = `<span class="text-danger">Couldn't save your self-assessment. Try again.</span>`; }
    });

    // --- PEER pane ---
    // In-person flow: the reviewed student stays logged in on their own
    // computer, and the reviewer (a classmate or an AS aide) sits down next
    // to them, looks at their code and live site, then identifies themselves
    // here and fills this out. So the target being graded is always the
    // logged-in student (user.student_id) -- the dropdown picks the reviewer,
    // not who to review.
    const peerPane = container.querySelector('[data-pane="peer"]');
    peerPane.innerHTML = `<p class="text-muted"><i class="fas fa-spinner fa-spin me-1"></i>Loading reviewers…</p>`;
    try {
        const res = await fetch(`/api/student/section-classmates?section_id=${encodeURIComponent(user.section_id || '')}&exclude_student_id=${encodeURIComponent(user.student_id)}`);
        const reviewers = res.ok ? await res.json() : [];
        peerPane.innerHTML = `
            <p class="text-muted mb-3">Stay logged in on your own computer. Have your reviewer sit with you, look at your code and live site, and give you feedback out loud -- then they select their own name below and fill this out together with you.</p>
            <div class="mb-3">
                <label class="form-label small fw-bold">Who is reviewing this project?</label>
                <select class="form-select form-select-sm" id="peer-select">
                    <option value="">Select the reviewer's name…</option>
                    ${reviewers.map(c => `<option value="${escapeHtml(c.student_id)}">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</option>`).join('')}
                </select>
            </div>
            ${rubric.map(c => criterionRow('peer', c)).join('')}
            ${critiqueSandwichFields('peer')}
            <button type="button" class="btn btn-primary fw-bold" id="btn-submit-peer">Submit Peer Review</button>
            <div class="mt-2" id="peer-status"></div>
        `;
        wireRubricButtons(peerPane);
        peerPane.querySelector('#btn-submit-peer').addEventListener('click', async () => {
            const reviewerId = peerPane.querySelector('#peer-select').value;
            const statusEl = peerPane.querySelector('#peer-status');
            if (!reviewerId) { statusEl.innerHTML = `<span class="text-danger">Select the reviewer's name first.</span>`; return; }
            const values = readRubricValues(peerPane, 'peer');
            const score = averageToScore100(values, rubric);
            const feedback = readCritiqueSandwich(peerPane, 'peer');
            if (score === null) { statusEl.innerHTML = `<span class="text-danger">Rate every criterion before submitting.</span>`; return; }
            if (!feedback) { statusEl.innerHTML = `<span class="text-danger">Fill in all three parts of the Critique Sandwich before submitting.</span>`; return; }
            try {
                const res2 = await fetch('/api/student/project-evaluation', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chapter_project_id: chapterProjectId, exam_id: examId, student_id: user.student_id, evaluator_student_id: reviewerId, evaluator_type: 'peer', score, max_score: 100, rubric_json: values, feedback })
                });
                if (!res2.ok) throw new Error('Request failed');
                statusEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i>Peer review submitted.</span>`;
            } catch (e) { statusEl.innerHTML = `<span class="text-danger">Couldn't save the peer review. Try again.</span>`; }
        });
    } catch (e) {
        peerPane.innerHTML = `<p class="text-danger">Couldn't load the reviewer list. Try again later.</p>`;
    }

    // --- AUTO pane (WD only -- see hasAutoCheck above) ---
    if (hasAutoCheck) {
        const autoPane = container.querySelector('[data-pane="auto"]');
        autoPane.innerHTML = `
            <p class="text-muted mb-3">This scans the files you already uploaded to the Dropbox below and checks for the specific things this project requires. It's a quick sanity check, not a substitute for your teacher (or a classmate) actually reading/testing your work.</p>
            <button type="button" class="btn btn-primary fw-bold" id="btn-run-auto">Run Auto-Check</button>
            <div class="mt-3" id="auto-result"></div>
        `;
        autoPane.querySelector('#btn-run-auto').addEventListener('click', async () => {
            const resultEl = autoPane.querySelector('#auto-result');
            resultEl.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>Scanning your uploaded files…`;
            try {
                const res = await fetch('/api/student/project-auto-grade', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chapter_project_id: chapterProjectId, exam_id: examId, student_id: user.student_id })
                });
                const data = await res.json();
                if (!res.ok) { resultEl.innerHTML = `<span class="text-danger">${escapeHtml(data.error || 'Auto-check failed.')}</span>`; return; }
                resultEl.innerHTML = `
                    <p class="fw-bold">Auto-check score: ${data.score}/100</p>
                    <ul class="mb-0">
                        ${data.rubric.map(c => `<li>${escapeHtml(c.label)}: ${c.checksFound.length}/${c.checksLookedFor.length} found${c.checksFound.length ? ' (' + escapeHtml(c.checksFound.join(', ')) + ')' : ''}</li>`).join('')}
                    </ul>
                `;
            } catch (e) { resultEl.innerHTML = `<span class="text-danger">Couldn't run the auto-check. Try again.</span>`; }
        });
    }

    // --- RESULTS pane ---
    const resultsPane = container.querySelector('[data-pane="results"]');
    async function loadResults() {
        resultsPane.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>Loading…`;
        try {
            const res = await fetch(`/api/student/project-aggregate?chapter_project_id=${encodeURIComponent(chapterProjectId)}&exam_id=${encodeURIComponent(examId)}&student_id=${encodeURIComponent(user.student_id)}`);
            const data = await res.json();
            const agg = data.aggregate;
            const evaluations = data.evaluations || [];
            if (!agg) { resultsPane.innerHTML = `<p class="text-muted">No self-assessment, peer review, or auto-check has been submitted for you yet.</p>`; return; }
            const fmt = v => (v === null || v === undefined) ? '<span class="text-muted">not yet submitted</span>' : `${Number(v).toFixed(0)}/100`;
            const peerReviews = evaluations.filter(e => e.evaluator_type === 'peer');
            const peerReviewsHtml = peerReviews.length ? `
                <p class="fw-bold mb-2 mt-3">Who reviewed your project</p>
                ${peerReviews.map(e => `
                    <div class="mb-2 pb-2 border-bottom">
                        <p class="mb-1"><strong>${escapeHtml(e.evaluator_first_name || '')} ${escapeHtml(e.evaluator_last_name || '')}</strong> &mdash; ${Number(e.score).toFixed(0)}/100</p>
                        ${e.feedback ? `<p class="text-muted mb-0" style="font-size:.8rem; white-space:pre-wrap;">${escapeHtml(e.feedback)}</p>` : ''}
                    </div>
                `).join('')}
            ` : '';
            resultsPane.innerHTML = `
                <table class="table table-sm">
                    <tbody>
                        <tr><th>Self-assessment</th><td>${fmt(agg.self_score)}</td></tr>
                        <tr><th>Peer review (avg)</th><td>${fmt(agg.peer_score)}</td></tr>
                        ${hasAutoCheck ? `<tr><th>Auto-check</th><td>${fmt(agg.auto_score)}</td></tr>` : ''}
                        <tr class="table-primary"><th>Current grade average</th><td class="fw-bold">${Number(agg.aggregate_score).toFixed(0)}/100</td></tr>
                    </tbody>
                </table>
                <p class="text-muted mb-0" style="font-size:.8rem;">${agg.status === 'complete' ? `All ${hasAutoCheck ? 'three' : 'two'} components are in.` : 'Still averaging in whatever\'s submitted so far -- your grade updates automatically as more comes in.'} Your teacher can still adjust this grade manually at any time.</p>
                ${peerReviewsHtml}
            `;
        } catch (e) { resultsPane.innerHTML = `<p class="text-danger">Couldn't load your results.</p>`; }
    }
}

document.querySelectorAll('[data-chapter-project-id]').forEach(initProjectGrading);
