// /js/admin/attendance-report.js
import { apiFetch } from '../modules/api-client.js';

const dateInput = document.getElementById('dateInput');
const periodSelect = document.getElementById('periodSelect');
const reportBody = document.getElementById('reportBody');
let currentRows = [];

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

function fixButtonsHtml(studentId, currentStatus) {
    return ['present', 'tardy', 'absent'].map(s => {
        const isActive = currentStatus === s;
        return `<button type="button" class="btn btn-sm btn-outline-secondary fix-btn ${isActive ? `active-${s}` : ''}" data-student-id="${studentId}" data-status="${s}" ${isActive ? 'disabled' : ''}>${s[0].toUpperCase() + s.slice(1)}</button>`;
    }).join(' ');
}

async function correctStatus(studentId, status) {
    const section_id = periodSelect.value;
    const date = dateInput.value;
    let reason = '';
    if (status === 'tardy') {
        reason = window.prompt('Reason for tardy (shown on the Tardy Tracker):', '') || '';
        if (reason === null) return;
    }
    try {
        await apiFetch('/api/admin/attendance/correct', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId, section_id, date, status, reason })
        });
        loadReport();
    } catch (e) {
        alert('Failed to update: ' + e.message);
    }
}

function showFormModal(studentId) {
    const row = currentRows.find(r => r.student_id === studentId);
    const form = row?.tardy_form;
    const body = document.getElementById('formModalBody');
    document.getElementById('formModalTitle').textContent = `Tardy Form -- ${row.last_name}, ${row.first_name}`;
    if (!form) {
        body.innerHTML = '<p class="text-muted mb-0">No form on file for this date.</p>';
    } else {
        const reflectionHtml = (form.reflection_1 || form.reflection_2 || form.reflection_3 || form.reflection_4) ? `
            <div class="form-q">1. What got in the way of arriving on time?</div>
            <div class="form-a">${form.reflection_1 || '<em class="text-muted">(blank)</em>'}</div>
            <div class="form-q">2. One-time thing, or becoming a pattern?</div>
            <div class="form-a">${form.reflection_2 || '<em class="text-muted">(blank)</em>'}</div>
            <div class="form-q">3. One thing they'll change before next class</div>
            <div class="form-a">${form.reflection_3 || '<em class="text-muted">(blank)</em>'}</div>
            <div class="form-q">4. Anything staff could do to help?</div>
            <div class="form-a mb-0">${form.reflection_4 || '<em class="text-muted">(blank)</em>'}</div>
        ` : '';
        body.innerHTML = `
            <div class="form-q">Reason for being late</div>
            <div class="form-a">${form.reason || '<em class="text-muted">(blank)</em>'}</div>
            <div class="form-q">Signed pass?</div>
            <div class="form-a">${form.had_pass === 'yes' ? 'Yes' : form.had_pass === 'no' ? 'No' : '<em class="text-muted">(not answered)</em>'}</div>
            <div class="form-q">Anything I should know</div>
            <div class="form-a">${form.notes || '<em class="text-muted">(blank)</em>'}</div>
            ${reflectionHtml}
        `;
    }
    new bootstrap.Modal(document.getElementById('formModal')).show();
}

async function loadReport() {
    const section_id = periodSelect.value;
    const date = dateInput.value;
    if (!section_id || !date) return;
    reportBody.innerHTML = `<tr><td colspan="5" class="text-center p-5 text-muted"><div class="spinner-border text-primary mb-3"></div><br>Loading…</td></tr>`;
    try {
        const data = await apiFetch(`/api/admin/attendance/summary?section_id=${encodeURIComponent(section_id)}&date=${encodeURIComponent(date)}`);
        const rows = data.rows || [];
        currentRows = rows;
        document.getElementById('sumPresent').textContent = rows.filter(r => r.status === 'present').length;
        document.getElementById('sumTardy').textContent = rows.filter(r => r.status === 'tardy').length;
        document.getElementById('sumAbsent').textContent = rows.filter(r => r.status === 'absent').length;
        document.getElementById('sumNone').textContent = rows.filter(r => !r.status).length;

        if (rows.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-muted">No students found for this period.</td></tr>';
            return;
        }
        reportBody.innerHTML = rows.map(r => {
            const statusClass = r.status ? `status-${r.status}` : 'status-none';
            const statusText = r.status ? r.status[0].toUpperCase() + r.status.slice(1) : 'Not marked';
            const time = r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
            const formBtn = r.tardy_form
                ? `<button type="button" class="btn btn-sm btn-outline-primary view-form-btn" data-student-id="${r.student_id}"><i class="fas fa-file-lines"></i></button>`
                : '<span class="text-muted">—</span>';
            return `<tr>
                <td class="fw-bold">${r.last_name}, ${r.first_name}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${time}</td>
                <td>${formBtn}</td>
                <td>${fixButtonsHtml(r.student_id, r.status)}</td>
            </tr>`;
        }).join('');
        reportBody.querySelectorAll('.fix-btn').forEach(btn => {
            btn.addEventListener('click', () => correctStatus(btn.dataset.studentId, btn.dataset.status));
        });
        reportBody.querySelectorAll('.view-form-btn').forEach(btn => {
            btn.addEventListener('click', () => showFormModal(btn.dataset.studentId));
        });
    } catch (e) {
        reportBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-danger">Failed to load: ${e.message}</td></tr>`;
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
