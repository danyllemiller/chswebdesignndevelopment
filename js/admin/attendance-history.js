// /js/admin/attendance-history.js
// Attendance by Period (admin/attendance-history.html): every class day for
// one period as a grid, or every period's totals at once. Data comes from
// /api/admin/attendance/history; a day or cell links to the one-day report
// (attendance-report.html?period=&date=), where marks can be fixed.
import { apiFetch } from '../modules/api-client.js';

const periodSelect = document.getElementById('periodSelect');
const fromInput = document.getElementById('fromInput');
const toInput = document.getElementById('toInput');
const content = document.getElementById('content');
const summaryRow = document.getElementById('summaryRow');
const ALL = 'ALL';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LETTER = { present: 'P', tardy: 'T', absent: 'A' };
let lastData = null;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dateParts = (iso) => { const d = new Date(`${iso}T12:00:00`); return { md: `${d.getMonth() + 1}/${d.getDate()}`, dow: DAYS[d.getDay()] }; };
const herePct = (s) => { const n = s.present + s.tardy + s.absent; return n ? Math.round(((s.present + s.tardy) / n) * 100) : null; };
const pctHtml = (p) => p === null ? '<span class="c-none">–</span>' : `<span class="${p < 90 ? 'low-pct' : ''}">${p}%</span>`;
const dayLink = (period, date) => `/admin/attendance-report.html?period=${encodeURIComponent(period)}&date=${encodeURIComponent(date)}`;
const nameOf = (s) => `${s.last_name}${s.first_name ? ', ' + s.first_name : ''}`;

function periodTotals(p) {
    const t = { present: 0, tardy: 0, absent: 0 };
    p.students.forEach(s => { t.present += s.present; t.tardy += s.tardy; t.absent += s.absent; });
    return { ...t, pct: herePct(t), days: p.dates.length };
}

function pill(cls, value, label) { return `<div class="summary-pill ${cls}">${value} <span class="fw-normal">${label}</span></div>`; }

function renderGrid(p) {
    const t = periodTotals(p);
    summaryRow.innerHTML = pill('text-primary', t.days, 'class days') + pill('text-success', t.pct === null ? '–' : `${t.pct}%`, 'here')
        + pill('text-warning', t.tardy, 'tardies') + pill('text-danger', t.absent, 'absences') + pill('text-secondary', p.students.filter(s => s.enrolled).length, 'students');
    if (!p.dates.length) { content.innerHTML = '<div class="text-center p-4 text-muted">No attendance recorded for this period in these dates.</div>'; return; }
    const head = p.dates.map(d => { const { md, dow } = dateParts(d);
        return `<th class="day-head"><a href="${dayLink(p.section_id, d)}" target="_blank" rel="noopener" title="Open ${dow} ${md} to fix it"><small>${dow}</small>${md}</a></th>`; }).join('');
    const body = p.students.map(s => {
        const cells = p.dates.map(d => {
            const st = s.marks[d];
            const cls = st ? `c-${st}` : 'c-none';
            return `<td class="cell ${cls}"><a href="${dayLink(p.section_id, d)}" target="_blank" rel="noopener" title="${esc(nameOf(s))}: ${st || 'not marked'} on ${dateParts(d).md}">${st ? LETTER[st] : '–'}</a></td>`;
        }).join('');
        return `<tr class="${s.enrolled ? '' : 'left-row'}"><td class="name-col">${esc(nameOf(s))}${s.enrolled ? '' : ' <small>(left)</small>'}</td>${cells}
            <td class="tot tot-p">${s.present}</td><td class="tot tot-t">${s.tardy}</td><td class="tot tot-a">${s.absent}</td><td class="tot">${pctHtml(herePct(s))}</td></tr>`;
    }).join('');
    content.innerHTML = `<div class="grid-wrap"><table class="att-grid">
        <thead><tr><th class="name-col">Student</th>${head}<th>P</th><th>T</th><th>A</th><th>Here %</th></tr></thead>
        <tbody>${body}</tbody></table></div>`;
}

function renderAll(data) {
    const grand = { present: 0, tardy: 0, absent: 0 };
    data.periods.forEach(p => { const t = periodTotals(p); grand.present += t.present; grand.tardy += t.tardy; grand.absent += t.absent; });
    const gp = herePct(grand);
    summaryRow.innerHTML = pill('text-primary', data.periods.length, 'periods') + pill('text-success', gp === null ? '–' : `${gp}%`, 'here overall')
        + pill('text-warning', grand.tardy, 'tardies') + pill('text-danger', grand.absent, 'absences');
    if (!data.periods.length) { content.innerHTML = '<div class="text-center p-4 text-muted">No attendance recorded in these dates.</div>'; return; }
    content.innerHTML = `<div class="row g-3">${data.periods.map(p => {
        const t = periodTotals(p);
        const rows = p.students.map(s => `<tr class="${s.enrolled ? '' : 'text-muted fst-italic'}"><td class="fw-bold">${esc(nameOf(s))}${s.enrolled ? '' : ' <small>(left)</small>'}</td>
            <td class="tot-p fw-bold">${s.present}</td><td class="tot-t fw-bold">${s.tardy}</td><td class="tot-a fw-bold">${s.absent}</td><td>${pctHtml(herePct(s))}</td></tr>`).join('');
        return `<div class="col-xl-4 col-lg-6"><div class="card period-card shadow-sm h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <div><span class="fw-bold fs-5 period-name">${esc(p.section_id)}</span>
                <span class="small hdr-stats ms-2">${t.days} days · ${t.pct === null ? '–' : t.pct + '% here'} · ${t.tardy} tardy · ${t.absent} absent</span></div>
              <button type="button" class="btn btn-sm btn-light fw-bold text-nowrap open-grid" data-period="${esc(p.section_id)}">Open grid</button>
            </div>
            <div class="card-body p-0" style="max-height: 420px; overflow-y: auto;">
              <table class="table table-sm table-hover totals-table mb-0"><thead class="table-light" style="position: sticky; top: 0;"><tr><th>Student</th><th>P</th><th>T</th><th>A</th><th>Here %</th></tr></thead><tbody>${rows}</tbody></table>
            </div></div></div>`;
    }).join('')}</div>`;
    content.querySelectorAll('.open-grid').forEach(b => b.addEventListener('click', () => { periodSelect.value = b.dataset.period; load(); }));
}

function syncUrl() {
    const q = new URLSearchParams({ period: periodSelect.value, from: fromInput.value, to: toInput.value });
    history.replaceState(null, '', `${location.pathname}?${q}`);
}

async function load() {
    const period = periodSelect.value;
    if (!period) return;
    content.innerHTML = '<div class="text-center p-5 text-muted"><div class="spinner-border text-primary mb-3"></div><br>Loading…</div>';
    summaryRow.innerHTML = '';
    const q = new URLSearchParams({ section_id: period, to: toInput.value || todayStr() });
    if (fromInput.value) q.set('from', fromInput.value);
    try {
        const data = await apiFetch(`/api/admin/attendance/history?${q}`);
        lastData = { ...data, period };
        if (!fromInput.value) fromInput.value = data.from;
        if (!toInput.value) toInput.value = data.to;
        syncUrl();
        if (period === ALL) renderAll(data); else renderGrid(data.periods[0] || { section_id: period, dates: [], students: [] });
    } catch (e) {
        content.innerHTML = `<div class="text-center p-4 text-danger">Failed to load: ${esc(e.message)}</div>`;
    }
}

function downloadCsv() {
    if (!lastData) return;
    const cell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [];
    if (lastData.period === ALL) {
        lines.push(['Period', 'Last name', 'First name', 'Student ID', 'In class', 'Present', 'Tardy', 'Absent', 'Here %']);
        lastData.periods.forEach(p => p.students.forEach(s => lines.push([p.section_id, s.last_name, s.first_name, s.student_id, s.enrolled ? 'yes' : 'left', s.present, s.tardy, s.absent, herePct(s) ?? ''])));
    } else {
        const p = lastData.periods[0];
        if (!p) return;
        lines.push(['Last name', 'First name', 'Student ID', 'In class', ...p.dates, 'Present', 'Tardy', 'Absent', 'Here %']);
        p.students.forEach(s => lines.push([s.last_name, s.first_name, s.student_id, s.enrolled ? 'yes' : 'left',
            ...p.dates.map(d => LETTER[s.marks[d]] || ''), s.present, s.tardy, s.absent, herePct(s) ?? '']));
    }
    const blob = new Blob([lines.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${lastData.period === ALL ? 'all-periods' : lastData.period}-${lastData.from}-to-${lastData.to}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function init() {
    let periods = [];
    try { periods = (await apiFetch('/api/admin/attendance/periods')).periods || []; } catch (e) { /* All periods still works */ }
    periodSelect.innerHTML = `<option value="${ALL}">All periods</option>` + periods.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
    const params = new URLSearchParams(location.search);
    const want = params.get('period');
    if (want && [...periodSelect.options].some(o => o.value === want)) periodSelect.value = want;
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('from') || '')) fromInput.value = params.get('from');
    toInput.value = /^\d{4}-\d{2}-\d{2}$/.test(params.get('to') || '') ? params.get('to') : todayStr();

    periodSelect.addEventListener('change', load);
    fromInput.addEventListener('change', load);
    toInput.addEventListener('change', load);
    document.getElementById('allDatesBtn').addEventListener('click', () => { fromInput.value = ''; toInput.value = todayStr(); load(); });
    document.getElementById('csvBtn').addEventListener('click', downloadCsv);
    load();
}

document.addEventListener('DOMContentLoaded', init);
