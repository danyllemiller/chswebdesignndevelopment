// /js/admin/attendance-report.js
import { apiFetch } from '../modules/api-client.js';

const dateInput = document.getElementById('dateInput');
const periodSelect = document.getElementById('periodSelect');
const reportBody = document.getElementById('reportBody');

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadPeriods() {
    try {
        const data = await apiFetch('/api/admin/attendance/periods');
        periodSelect.innerHTML = (data.periods || []).map(p => `<option value="${p}">${p}</option>`).join('');
    } catch (e) {
        periodSelect.innerHTML = '<option value="">Failed to load</option>';
    }
}

async function loadReport() {
    const section_id = periodSelect.value;
    const date = dateInput.value;
    if (!section_id || !date) return;
    reportBody.innerHTML = `<tr><td colspan="3" class="text-center p-5 text-muted"><div class="spinner-border text-primary mb-3"></div><br>Loading…</td></tr>`;
    try {
        const data = await apiFetch(`/api/admin/attendance/summary?section_id=${encodeURIComponent(section_id)}&date=${encodeURIComponent(date)}`);
        const rows = data.rows || [];
        document.getElementById('sumPresent').textContent = rows.filter(r => r.status === 'present').length;
        document.getElementById('sumTardy').textContent = rows.filter(r => r.status === 'tardy').length;
        document.getElementById('sumAbsent').textContent = rows.filter(r => r.status === 'absent').length;
        document.getElementById('sumNone').textContent = rows.filter(r => !r.status).length;

        if (rows.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-muted">No students found for this period.</td></tr>';
            return;
        }
        reportBody.innerHTML = rows.map(r => {
            const statusClass = r.status ? `status-${r.status}` : 'status-none';
            const statusText = r.status ? r.status[0].toUpperCase() + r.status.slice(1) : 'Not marked';
            const time = r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
            return `<tr>
                <td class="fw-bold">${r.last_name}, ${r.first_name}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${time}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        reportBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-danger">Failed to load: ${e.message}</td></tr>`;
    }
}

async function init() {
    dateInput.value = todayStr();
    await loadPeriods();
    try {
        const cp = await apiFetch('/api/admin/attendance/current-period');
        if (cp.current) periodSelect.value = cp.current;
    } catch (e) { /* default to whatever the dropdown's first option is */ }
    loadReport();

    dateInput.addEventListener('change', loadReport);
    periodSelect.addEventListener('change', loadReport);
}

document.addEventListener('DOMContentLoaded', init);
