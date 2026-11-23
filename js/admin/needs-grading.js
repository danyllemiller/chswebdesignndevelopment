// /js/admin/needs-grading.js
// Needs Grading (admin/needs-grading.html): turned-in work with no real grade
// yet, from /api/admin/needs-grading (server/routes/needsGrading.js), grouped
// by period. "Open files" jumps to that student's folder on the Files page.
import { apiFetch } from '../modules/api-client.js';

const periodSelect = document.getElementById('periodSelect');
const kindSelect = document.getElementById('kindSelect');
const content = document.getElementById('content');
const summaryRow = document.getElementById('summaryRow');
let items = [];

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WEEK = 7 * 24 * 3600 * 1000;
const when = (iso) => {
    if (!iso) return '<span class="text-muted">–</span>';
    const d = new Date(iso);
    if (isNaN(d)) return '<span class="text-muted">–</span>';
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    return Date.now() - d.getTime() > WEEK ? `<span class="old">${label}</span>` : label;
};
const MISS = { file: 'miss-file', 'self-assessment': 'miss-self', 'peer review': 'miss-peer' };

function status(it) {
    if (it.kind === 'placeholder') return '<span class="miss needs-you">Needs your grade</span>';
    const tags = it.missing.map(m => `<span class="miss ${MISS[m] || ''}">${esc(m)}</span>`).join('');
    const self = it.self_score != null && it.max_score ? `<div class="small text-muted">Self: ${esc(it.self_score)}/${esc(it.max_score)}</div>` : '';
    return (tags || '<span class="text-muted small">Waiting to post</span>') + self;
}

function render() {
    const p = periodSelect.value, k = kindSelect.value;
    const shown = items.filter(it => (p === 'ALL' || it.period === p) && (k === 'ALL' || it.kind === k));
    const yours = shown.filter(it => it.kind === 'placeholder').length;
    const waiting = shown.length - yours;
    summaryRow.innerHTML = `<div class="summary-pill text-success">${yours} <span class="fw-normal">need your grade</span></div>`
        + `<div class="summary-pill text-primary">${waiting} <span class="fw-normal">projects waiting on a review</span></div>`;
    if (!shown.length) { content.innerHTML = '<div class="text-center p-5 text-muted"><i class="fas fa-check-circle text-success fa-2x mb-2"></i><br>Nothing waiting. Everything turned in has a grade.</div>'; return; }
    const byPeriod = new Map();
    shown.forEach(it => { const key = it.period || 'No period'; if (!byPeriod.has(key)) byPeriod.set(key, []); byPeriod.get(key).push(it); });
    content.innerHTML = [...byPeriod.entries()].map(([period, list]) => `
      <div class="card period-card shadow-sm mb-4">
        <div class="card-header bg-primary d-flex justify-content-between align-items-center">
          <span class="period-name fw-bold">${esc(period)}</span><span class="hdr-stats small">${list.length} item${list.length === 1 ? '' : 's'}</span>
        </div>
        <div class="table-responsive">
          <table class="table table-hover ng-table mb-0">
            <thead><tr><th>Student</th><th>Assignment</th><th>Turned in</th><th>What's left</th><th></th></tr></thead>
            <tbody>${list.map(it => `<tr>
              <td class="fw-bold">${esc(it.name)}</td>
              <td>${esc(it.title)}${it.total_points ? ` <span class="text-muted small">(${esc(it.total_points)} pts)</span>` : ''}</td>
              <td>${when(it.since)}</td>
              <td>${status(it)}</td>
              <td class="text-end text-nowrap"><a class="btn btn-sm btn-outline-primary" href="/admin/files.html?student=${encodeURIComponent(it.student_id)}" target="_blank" rel="noopener"><i class="fas fa-folder-open me-1"></i>Open files</a></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`).join('');
}

async function load() {
    try {
        const data = await apiFetch('/api/admin/needs-grading');
        items = data.items || [];
        const periods = [...new Set(items.map(it => it.period).filter(Boolean))].sort();
        periodSelect.innerHTML = '<option value="ALL">All periods</option>' + periods.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
        render();
    } catch (e) {
        content.innerHTML = `<div class="alert alert-danger">Couldn't load the list: ${esc(e.message || e)}</div>`;
    }
}

periodSelect.addEventListener('change', render);
kindSelect.addEventListener('change', render);
load();
