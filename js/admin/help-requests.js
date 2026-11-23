// /js/admin/help-requests.js
// "I'm Stuck" Requests (admin/help-requests.html): every open request from
// /api/admin/stuck (server/routes/helpRequests.js), with a Done button.
// Refreshes every 15 seconds.
import { apiFetch } from '../modules/api-client.js';

const content = document.getElementById('content');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = (m) => m < 1 ? 'just now' : m === 1 ? '1 min ago' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} hr ${m % 60} min ago`;

async function load() {
    try {
        const { requests = [] } = await apiFetch('/api/admin/stuck');
        if (!requests.length) { content.innerHTML = '<div class="text-center p-5 text-muted"><i class="fas fa-check-circle text-success fa-2x mb-2"></i><br>Nobody is stuck right now.</div>'; return; }
        content.innerHTML = `<div class="table-responsive"><table class="table table-hover align-middle mb-0">
          <thead><tr><th>Student</th><th>Period</th><th>Page</th><th>Note</th><th>Waiting</th><th></th></tr></thead>
          <tbody>${requests.map(r => `<tr>
            <td class="fw-bold">${esc(r.first_name || '')} ${esc(r.last_name || r.student_id)}</td>
            <td>${esc(r.section_id || '')}</td>
            <td><a href="${esc(r.page_path)}" target="_blank" rel="noopener">${esc(r.page_title || r.page_path)}</a></td>
            <td class="fst-italic">${esc(r.note || '')}</td>
            <td class="text-nowrap">${ago(Number(r.minutes) || 0)}</td>
            <td class="text-end"><button type="button" class="btn btn-sm btn-outline-success fw-bold" data-done="${r.id}"><i class="fas fa-check me-1"></i>Done</button></td>
          </tr>`).join('')}</tbody></table></div>`;
    } catch (e) {
        content.innerHTML = `<div class="alert alert-danger">Couldn't load requests: ${esc(e.message || e)}</div>`;
    }
}

content.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-done]');
    if (!b) return;
    b.disabled = true;
    try { await apiFetch(`/api/admin/stuck/${b.dataset.done}/resolve`, { method: 'POST', body: '{}' }); load(); }
    catch (err) { b.disabled = false; alert(err.message || err); }
});

load();
setInterval(() => { if (!document.hidden) load(); }, 15000);
