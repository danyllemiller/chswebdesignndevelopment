const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

let applications = [];

async function loadApplications() {
    const body = document.getElementById('appsBody');
    try {
        const res = await fetch('/api/admin/job-applications');
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        applications = data.applications || [];

        if (applications.length === 0) {
            body.innerHTML = '<tr><td colspan="4" class="text-center py-4 no-apps">No applications submitted yet.</td></tr>';
            return;
        }

        body.innerHTML = applications.map((app, i) => {
            const name = app.first_name && app.last_name ? `${app.last_name}, ${app.first_name}` : (app.full_name || app.student_id);
            const submitted = app.submitted_at ? new Date(app.submitted_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';
            return `<tr class="app-row" data-idx="${i}">
                <td class="fw-bold">${escapeHtml(name)}</td>
                <td>${escapeHtml(app.section_id || app.class_period || '')}</td>
                <td><span class="badge bg-primary role-badge">${escapeHtml(app.role_label || app.role || '')}</span></td>
                <td class="text-muted small">${escapeHtml(submitted)}</td>
            </tr>`;
        }).join('');

        document.querySelectorAll('.app-row').forEach(row => {
            row.addEventListener('click', () => showDetail(applications[Number(row.dataset.idx)]));
        });
    } catch (err) {
        console.error('Failed to load applications:', err);
        body.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Failed to load applications. Try refreshing.</td></tr>';
    }
}

function showDetail(app) {
    const name = app.first_name && app.last_name ? `${app.last_name}, ${app.first_name}` : (app.full_name || app.student_id);
    document.getElementById('appDetailTitle').textContent = `${name} — ${app.role_label || app.role || ''}`;

    let answers = {};
    try { answers = typeof app.answers === 'string' ? JSON.parse(app.answers) : (app.answers || {}); } catch (e) {}

    const infoRows = [
        ['Full Name (as typed)', app.full_name],
        ['Class Period', app.class_period],
        ['Year in Program', app.year_track],
        ['Prior Experience', app.prev_experience],
        ['Signed', app.sig_name ? `${app.sig_name} (${app.sig_date || ''})` : '']
    ].filter(([, v]) => v);

    let html = '<div class="mb-4">' + infoRows.map(([label, val]) =>
        `<div class="mb-1"><span class="fw-bold small text-muted">${escapeHtml(label)}:</span> ${escapeHtml(val)}</div>`
    ).join('') + '</div>';

    html += Object.values(answers).map(qa => `
        <div class="answer-block">
            <div class="answer-q">${escapeHtml(qa.question)}</div>
            <div class="answer-a">${escapeHtml(qa.answer)}</div>
        </div>
    `).join('');

    document.getElementById('appDetailBody').innerHTML = html || '<p class="text-muted">No answers recorded.</p>';
    new bootstrap.Modal(document.getElementById('appDetailModal')).show();
}

window.addEventListener('DOMContentLoaded', loadApplications);
