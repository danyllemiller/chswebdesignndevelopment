// /js/admin/survey-results.js
// Admin dashboard for the anonymous student feedback surveys. Real
// protection for this data is server-side now (server/api.js's /admin/*
// session gate) -- this client-side check is only for the UI
// redirect/UX, matching every other admin page's convention.
import { apiFetch } from '../modules/api-client.js';

const PART_TITLES = {
    agency360: { A: 'Helps them learn', B: 'Safe and supportive', C: 'Cares as individuals', D: 'Classroom systems', E: 'Program health', F: 'In their own words' },
    cs_course_review: { A: 'Helps them learn', B: 'Safe and supportive', C: 'Cares as individuals', D: 'Course systems', E: 'Course health', F: 'In their own words' }
};

const FORM_TERMS = { agency360: ['Fall', 'Spring'], cs_course_review: ['Midpoint', 'End of term'] };

function csvEscape(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }

function downloadCsv(filename, rows) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

async function loadSurveyResults() {
    const formKey = document.getElementById('survey-form-select').value;
    const term = document.getElementById('survey-term-select').value;
    const root = document.getElementById('survey-results-root');
    root.innerHTML = '<p class="text-muted">Loading…</p>';
    try {
        const data = await apiFetch(`/api/admin/survey/results?form_key=${encodeURIComponent(formKey)}&term=${encodeURIComponent(term)}`);
        if (!data.ready) {
            root.innerHTML = `<div class="alert alert-warning">Not enough responses yet — ${data.count} of ${data.threshold} needed before results can be shown for ${term}.</div>`;
            return;
        }
        const partTitles = PART_TITLES[formKey];
        let html = `<p class="text-muted mb-3">${data.count} responses.</p>`;
        html += '<div class="row g-3 mb-4">';
        Object.entries(data.partAverages).forEach(([part, avg]) => {
            html += `<div class="col-6 col-md-4 col-lg-2"><div class="card text-center p-3 h-100">
                <div class="small text-muted fw-bold">Part ${part}</div>
                <div class="small text-muted mb-1">${partTitles[part] || ''}</div>
                <div class="fs-4 fw-bold text-primary">${avg !== null ? avg.toFixed(2) : '—'}</div>
            </div></div>`;
        });
        html += '</div>';

        html += '<table class="table table-sm table-bordered align-middle"><thead><tr><th>#</th><th>Type</th><th>Result</th></tr></thead><tbody>';
        Object.entries(data.perItem).forEach(([q, entry]) => {
            let resultHtml = '';
            if (entry.type === 'scale') {
                resultHtml = entry.avg !== null
                    ? `avg <strong>${entry.avg.toFixed(2)}</strong> (n=${entry.n}, NA=${entry.naCount})`
                    : `no scored responses (NA=${entry.naCount})`;
            } else if (entry.type === 'choice') {
                resultHtml = Object.entries(entry.dist).map(([opt, n]) => `${opt}: <strong>${n}</strong>`).join(' &nbsp;·&nbsp; ');
            } else {
                resultHtml = entry.responses.length
                    ? `<ul class="mb-0">${entry.responses.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`
                    : '<span class="text-muted">No responses.</span>';
            }
            html += `<tr><td>${q}</td><td class="text-capitalize">${entry.type}</td><td>${resultHtml}</td></tr>`;
        });
        html += '</tbody></table>';
        root.innerHTML = html;
    } catch (err) {
        root.innerHTML = `<div class="alert alert-danger">${err.message || 'Failed to load results.'}</div>`;
    }
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function exportSurveyCsv() {
    const formKey = document.getElementById('survey-form-select').value;
    const term = document.getElementById('survey-term-select').value;
    try {
        const data = await apiFetch(`/api/admin/survey/export?form_key=${encodeURIComponent(formKey)}&term=${encodeURIComponent(term)}`);
        if (!data.ready) { alert(`Not enough responses yet — ${data.count} of ${data.threshold} needed.`); return; }
        downloadCsv(`${formKey}-${term.replace(/\s+/g, '-')}-${data.count}responses.csv`, data.responses);
    } catch (err) { alert(err.message || 'Failed to export.'); }
}

async function clearSurveyData() {
    const formKey = document.getElementById('survey-form-select').value;
    const term = document.getElementById('survey-term-select').value;
    if (!confirm(`Permanently delete all ${term} responses for this form? This cannot be undone -- export a CSV first if you want a backup.`)) return;
    try {
        await apiFetch(`/api/admin/survey/clear?form_key=${encodeURIComponent(formKey)}&term=${encodeURIComponent(term)}`, { method: 'DELETE' });
        loadSurveyResults();
    } catch (err) { alert(err.message || 'Failed to clear data.'); }
}

function updateTermOptions() {
    const formKey = document.getElementById('survey-form-select').value;
    const termSelect = document.getElementById('survey-term-select');
    termSelect.innerHTML = FORM_TERMS[formKey].map(t => `<option value="${t}">${t}</option>`).join('');
}

// --- Weekly Pulse ---

async function loadPulseWeeks() {
    const sel = document.getElementById('pulse-week-select');
    try {
        const data = await apiFetch('/api/admin/survey/pulse-weeks');
        sel.innerHTML = data.weeks.length
            ? data.weeks.map(w => `<option value="${w}">Week of ${w}</option>`).join('')
            : '<option value="">No pulse responses yet</option>';
        if (data.weeks.length) loadPulseResults();
    } catch (err) { sel.innerHTML = '<option value="">Failed to load weeks</option>'; }
}

async function loadPulseResults() {
    const week = document.getElementById('pulse-week-select').value;
    const root = document.getElementById('pulse-results-root');
    if (!week) { root.innerHTML = ''; return; }
    root.innerHTML = '<p class="text-muted">Loading…</p>';
    try {
        const data = await apiFetch(`/api/admin/survey/pulse-results?week=${encodeURIComponent(week)}`);
        let html = '';
        if (!data.ready) {
            html += `<div class="alert alert-warning">Not enough responses yet — ${data.count} of ${data.threshold} needed for this week.</div>`;
        } else {
            html += `<p class="text-muted mb-2">${data.count} responses this week.</p>`;
            html += '<div class="row g-3 mb-4">';
            ['Lost', 'Behind', 'Steady', 'Ahead'].forEach(f => {
                html += `<div class="col-6 col-md-3"><div class="card text-center p-3">
                    <div class="small text-muted fw-bold">${f}</div>
                    <div class="fs-3 fw-bold text-primary">${data.counts[f]}</div>
                </div></div>`;
            });
            html += '</div>';
            html += '<h6 class="fw-bold">What they need / are unsure about</h6>';
            html += data.textResponses.length
                ? `<ul>${data.textResponses.map(t => `<li><span class="badge bg-secondary me-2">${t.field.replace('_text', '')}</span>${escapeHtml(t.text)}</li>`).join('')}</ul>`
                : '<p class="text-muted">No text responses.</p>';
        }
        if (data.trend && data.trend.length) {
            html += '<h6 class="fw-bold mt-4">Trend across weeks</h6>';
            html += '<table class="table table-sm table-bordered"><thead><tr><th>Week</th><th>Lost</th><th>Behind</th><th>Steady</th><th>Ahead</th><th>Total</th></tr></thead><tbody>';
            data.trend.forEach(t => {
                html += `<tr><td>${t.week}</td><td>${t.Lost}</td><td>${t.Behind}</td><td>${t.Steady}</td><td>${t.Ahead}</td><td>${t.total}</td></tr>`;
            });
            html += '</tbody></table>';
        }
        root.innerHTML = html;
    } catch (err) {
        root.innerHTML = `<div class="alert alert-danger">${err.message || 'Failed to load pulse results.'}</div>`;
    }
}

async function exportPulseCsv() {
    const week = document.getElementById('pulse-week-select').value;
    if (!week) return;
    try {
        const data = await apiFetch(`/api/admin/survey/pulse-results?week=${encodeURIComponent(week)}`);
        if (!data.ready) { alert(`Not enough responses yet — ${data.count} of ${data.threshold} needed.`); return; }
        downloadCsv(`pulse-week-of-${week}-${data.count}responses.csv`, data.textResponses.map(t => ({ field: t.field, text: t.text })));
    } catch (err) { alert(err.message || 'Failed to export.'); }
}

async function clearPulseData() {
    const week = document.getElementById('pulse-week-select').value;
    if (!week) return;
    if (!confirm(`Permanently delete all pulse responses for the week of ${week}? Export a CSV first if you want a backup.`)) return;
    try {
        await apiFetch(`/api/admin/survey/pulse-clear?week=${encodeURIComponent(week)}`, { method: 'DELETE' });
        loadPulseWeeks();
    } catch (err) { alert(err.message || 'Failed to clear data.'); }
}

window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || (user.role !== 'admin' && user.section_id !== 'Teacher' && !user.username?.includes('damiller'))) {
        window.location.replace('/login-test.html');
        return;
    }

    document.getElementById('survey-form-select').addEventListener('change', () => { updateTermOptions(); loadSurveyResults(); });
    document.getElementById('survey-term-select').addEventListener('change', loadSurveyResults);
    document.getElementById('survey-export-btn').addEventListener('click', exportSurveyCsv);
    document.getElementById('survey-clear-btn').addEventListener('click', clearSurveyData);
    document.getElementById('pulse-week-select').addEventListener('change', loadPulseResults);
    document.getElementById('pulse-export-btn').addEventListener('click', exportPulseCsv);
    document.getElementById('pulse-clear-btn').addEventListener('click', clearPulseData);

    updateTermOptions();
    loadSurveyResults();
    loadPulseWeeks();
});
