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

function criterionRow(name, crit, selectedVal) {
    const buttons = [0, 1, 2, 3, 4].map(v => `
        <button type="button" class="btn btn-sm ${Number(selectedVal) === v ? 'btn-primary' : 'btn-outline-primary'} rubric-score-btn"
                data-key="${crit.key}" data-value="${v}" title="${escapeHtml(scoreLabel(v))}">${v}</button>
    `).join('');
    return `
        <div class="mb-3 pb-2 border-bottom" data-criterion-row="${crit.key}">
            <p class="mb-1 fw-bold small">${escapeHtml(crit.label)}</p>
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

function averageToScore100(values, rubric) {
    const scores = rubric.map(c => values[c.key]).filter(v => v !== undefined);
    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length; // 0-4
    return Math.round((avg / 4) * 100);
}

async function initProjectGrading(container) {
    const chapterProjectId = container.dataset.chapterProjectId;
    const examId = container.dataset.examId;
    let rubric;
    try { rubric = JSON.parse(container.dataset.rubric); } catch (e) { console.error('[project-grading] Bad rubric JSON', e); return; }

    const user = getLoggedInUser();
    if (!user || !user.student_id) {
        container.innerHTML = `<div class="card-body small p-4 text-muted">Log in to grade this project.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="card-header bg-info text-white fw-bold"><i class="fas fa-clipboard-check me-2"></i>Grade the Project: Self, Peer, and Auto-Check</div>
        <div class="card-body small p-4">
            <ul class="nav nav-tabs mb-3" role="tablist">
                <li class="nav-item"><button class="nav-link active" data-tab="self" type="button">My Self-Assessment</button></li>
                <li class="nav-item"><button class="nav-link" data-tab="peer" type="button">Grade a Classmate</button></li>
                <li class="nav-item"><button class="nav-link" data-tab="auto" type="button">Auto-Check My Code</button></li>
                <li class="nav-item"><button class="nav-link" data-tab="results" type="button">My Results</button></li>
            </ul>
            <div data-pane="self"></div>
            <div data-pane="peer" class="d-none"></div>
            <div data-pane="auto" class="d-none"></div>
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
        <button type="button" class="btn btn-primary fw-bold" id="btn-submit-self">Submit Self-Assessment</button>
        <div class="mt-2" id="self-status"></div>
    `;
    wireRubricButtons(selfPane);
    selfPane.querySelector('#btn-submit-self').addEventListener('click', async () => {
        const values = readRubricValues(selfPane, 'self');
        const score = averageToScore100(values, rubric);
        const statusEl = selfPane.querySelector('#self-status');
        if (score === null) { statusEl.innerHTML = `<span class="text-danger">Rate every criterion before submitting.</span>`; return; }
        try {
            const res = await fetch('/api/student/project-evaluation', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chapter_project_id: chapterProjectId, exam_id: examId, student_id: user.student_id, evaluator_type: 'self', score, max_score: 100, rubric_json: values })
            });
            if (!res.ok) throw new Error('Request failed');
            statusEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i>Self-assessment submitted (${score}/100).</span>`;
        } catch (e) { statusEl.innerHTML = `<span class="text-danger">Couldn't save your self-assessment. Try again.</span>`; }
    });

    // --- PEER pane ---
    const peerPane = container.querySelector('[data-pane="peer"]');
    peerPane.innerHTML = `<p class="text-muted"><i class="fas fa-spinner fa-spin me-1"></i>Loading classmates…</p>`;
    try {
        const res = await fetch(`/api/student/section-classmates?section_id=${encodeURIComponent(user.section_id || '')}&exclude_student_id=${encodeURIComponent(user.student_id)}`);
        const classmates = res.ok ? await res.json() : [];
        peerPane.innerHTML = `
            <p class="text-muted mb-3">Pick a classmate whose project you've actually looked at, and grade their work honestly. This helps them the same way you'll be helped by a classmate's review of yours.</p>
            <div class="mb-3">
                <label class="form-label small fw-bold">Classmate</label>
                <select class="form-select form-select-sm" id="peer-select">
                    <option value="">Select a classmate…</option>
                    ${classmates.map(c => `<option value="${escapeHtml(c.student_id)}">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</option>`).join('')}
                </select>
            </div>
            ${rubric.map(c => criterionRow('peer', c)).join('')}
            <button type="button" class="btn btn-primary fw-bold" id="btn-submit-peer">Submit Peer Review</button>
            <div class="mt-2" id="peer-status"></div>
        `;
        wireRubricButtons(peerPane);
        peerPane.querySelector('#btn-submit-peer').addEventListener('click', async () => {
            const partnerId = peerPane.querySelector('#peer-select').value;
            const statusEl = peerPane.querySelector('#peer-status');
            if (!partnerId) { statusEl.innerHTML = `<span class="text-danger">Pick a classmate first.</span>`; return; }
            const values = readRubricValues(peerPane, 'peer');
            const score = averageToScore100(values, rubric);
            if (score === null) { statusEl.innerHTML = `<span class="text-danger">Rate every criterion before submitting.</span>`; return; }
            try {
                const res2 = await fetch('/api/student/project-evaluation', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chapter_project_id: chapterProjectId, exam_id: examId, student_id: partnerId, evaluator_student_id: user.student_id, evaluator_type: 'peer', score, max_score: 100, rubric_json: values })
                });
                if (!res2.ok) throw new Error('Request failed');
                statusEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i>Peer review submitted.</span>`;
            } catch (e) { statusEl.innerHTML = `<span class="text-danger">Couldn't save the peer review. Try again.</span>`; }
        });
    } catch (e) {
        peerPane.innerHTML = `<p class="text-danger">Couldn't load your classmates. Try again later.</p>`;
    }

    // --- AUTO pane ---
    const autoPane = container.querySelector('[data-pane="auto"]');
    autoPane.innerHTML = `
        <p class="text-muted mb-3">This scans the files you already uploaded to the Dropbox below and checks for the specific code patterns this project requires. It's a quick sanity check, not a substitute for actually testing your app.</p>
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

    // --- RESULTS pane ---
    const resultsPane = container.querySelector('[data-pane="results"]');
    async function loadResults() {
        resultsPane.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>Loading…`;
        try {
            const res = await fetch(`/api/student/project-aggregate?chapter_project_id=${encodeURIComponent(chapterProjectId)}&exam_id=${encodeURIComponent(examId)}&student_id=${encodeURIComponent(user.student_id)}`);
            const data = await res.json();
            const agg = data.aggregate;
            if (!agg) { resultsPane.innerHTML = `<p class="text-muted">No self-assessment, peer review, or auto-check has been submitted for you yet.</p>`; return; }
            const fmt = v => (v === null || v === undefined) ? '<span class="text-muted">not yet submitted</span>' : `${Number(v).toFixed(0)}/100`;
            resultsPane.innerHTML = `
                <table class="table table-sm">
                    <tbody>
                        <tr><th>Self-assessment</th><td>${fmt(agg.self_score)}</td></tr>
                        <tr><th>Peer review (avg)</th><td>${fmt(agg.peer_score)}</td></tr>
                        <tr><th>Auto-check</th><td>${fmt(agg.auto_score)}</td></tr>
                        <tr class="table-primary"><th>Current grade average</th><td class="fw-bold">${Number(agg.aggregate_score).toFixed(0)}/100</td></tr>
                    </tbody>
                </table>
                <p class="text-muted mb-0" style="font-size:.8rem;">${agg.status === 'complete' ? 'All three components are in.' : 'Still averaging in whatever\'s submitted so far -- your grade updates automatically as more comes in.'} Your teacher can still adjust this grade manually at any time.</p>
            `;
        } catch (e) { resultsPane.innerHTML = `<p class="text-danger">Couldn't load your results.</p>`; }
    }
}

document.querySelectorAll('[data-chapter-project-id]').forEach(initProjectGrading);
