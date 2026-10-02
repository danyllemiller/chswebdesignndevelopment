// /js/admin/ic-sync-reminder.js
import { apiFetch } from '../modules/api-client.js';

const pendingBody = document.getElementById('pendingBody');
const markAllBtn = document.getElementById('markAllBtn');
const markSelectedBtn = document.getElementById('markSelectedBtn');

function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

async function load() {
    pendingBody.innerHTML = `<tr><td colspan="5" class="text-center p-5 text-muted"><div class="spinner-border text-primary mb-3"></div><br>Loading…</td></tr>`;
    try {
        const data = await apiFetch('/api/admin/attendance/ic-pending');
        const rows = data.rows || [];
        if (rows.length === 0) {
            pendingBody.innerHTML = '<tr><td colspan="5" class="text-center p-5 text-muted"><i class="fas fa-circle-check fa-2x text-success mb-2"></i><br>All caught up -- nothing pending.</td></tr>';
            markSelectedBtn.classList.add('d-none');
            return;
        }
        pendingBody.innerHTML = rows.map(r => `
            <tr>
                <td><input type="checkbox" class="form-check-input row-check" value="${r.id}"></td>
                <td class="fw-bold">${r.first_name} ${r.last_name}</td>
                <td>${r.section_id}</td>
                <td>${fmtDate(r.date)}</td>
                <td><span class="status-badge status-${r.status}">${r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
            </tr>`).join('');
        markSelectedBtn.classList.remove('d-none');
    } catch (e) {
        pendingBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-danger">Failed to load: ${e.message}</td></tr>`;
    }
}

markAllBtn.addEventListener('click', async () => {
    if (!confirm('Mark every pending row as done in Infinite Campus?')) return;
    try {
        await apiFetch('/api/admin/attendance/ic-sync', { method: 'POST', body: JSON.stringify({ all: true }) });
        load();
    } catch (e) { alert('Failed: ' + e.message); }
});

markSelectedBtn.addEventListener('click', async () => {
    const ids = [...document.querySelectorAll('.row-check:checked')].map(c => Number(c.value));
    if (ids.length === 0) { alert('Select at least one row first.'); return; }
    try {
        await apiFetch('/api/admin/attendance/ic-sync', { method: 'POST', body: JSON.stringify({ ids }) });
        load();
    } catch (e) { alert('Failed: ' + e.message); }
});

document.addEventListener('DOMContentLoaded', load);
