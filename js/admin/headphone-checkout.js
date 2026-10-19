// /js/admin/headphone-checkout.js
// Kiosk for a USB barcode scanner (it types the student ID, then Enter).
// Same toggle for every scan: no pair out -> check one out; already has one
// -> return it. The input stays focused so every scan lands, and results
// clear themselves so the station is ready for the next student.
import { apiFetch } from '../modules/api-client.js';

const input = document.getElementById('scanInput');
const panel = document.getElementById('feedbackPanel');
const iconEl = document.getElementById('feedbackIcon');
const nameEl = document.getElementById('feedbackName');
const subEl = document.getElementById('feedbackSub');
const outBody = document.getElementById('outBody');
const outCount = document.getElementById('outCount');
const noIdToggle = document.getElementById('noIdToggle');
const noIdPanel = document.getElementById('noIdPanel');
const nameSearch = document.getElementById('nameSearch');
const nameList = document.getElementById('nameList');
let feedbackTimer = null;
let roster = [];
let busy = false;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const timeStr = ts => new Date(ts).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });

function focusInput() {
    if (!noIdPanel.classList.contains('d-none') && document.activeElement === nameSearch) return;
    input.value = '';
    input.focus();
}

function beep(freq, ms) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.frequency.value = freq; osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start(); osc.stop(ctx.currentTime + ms / 1000);
        setTimeout(() => ctx.close(), ms + 50);
    } catch (e) { /* audio isn't essential */ }
}

function showFeedback(kind, iconClass, name, sub) {
    clearTimeout(feedbackTimer);
    panel.className = `feedback-panel mx-auto ${kind}`;
    panel.style.display = 'block';
    iconEl.innerHTML = `<i class="${iconClass}"></i>`;
    nameEl.textContent = name || '';
    subEl.textContent = sub || '';
    feedbackTimer = setTimeout(() => { panel.style.display = 'none'; }, 4000);
}

async function loadOut() {
    try {
        const data = await apiFetch('/api/admin/headphones/out');
        const rows = data.out || [];
        outCount.textContent = rows.length;
        outBody.innerHTML = rows.length === 0
            ? '<tr><td colspan="4" class="text-center text-muted py-3">All headphones are in.</td></tr>'
            : rows.map(r => `
                <tr class="out-row${r.overdue ? ' overdue' : ''}">
                  <td class="ps-3 fw-bold">${esc(r.last_name)}, ${esc(r.first_name)}</td>
                  <td>${esc(r.section_id)}</td>
                  <td>${esc(timeStr(r.checked_out_at))}</td>
                  <td class="text-end pe-3"><button class="btn btn-sm btn-outline-primary fw-bold" data-return="${r.id}">Mark returned</button></td>
                </tr>`).join('');
    } catch (e) {
        outBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-3">Couldn\'t load the list.</td></tr>';
    }
}

async function scan(studentId) {
    if (busy || !studentId) return;
    busy = true;
    try {
        const data = await apiFetch('/api/admin/headphones/scan', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId })
        });
        const who = `${data.student.first_name} ${data.student.last_name}`;
        if (data.action === 'checked_out') {
            beep(880, 150);
            showFeedback('out', 'fas fa-headphones text-success', who, 'Headphones checked out. Scan again when you return them.');
        } else {
            beep(660, 120); setTimeout(() => beep(990, 120), 140);
            showFeedback('back', 'fas fa-circle-check text-primary', who, 'Headphones returned. Thank you!');
        }
        await loadOut();
    } catch (e) {
        beep(220, 350);
        showFeedback('error', 'fas fa-circle-xmark text-danger', 'Scan didn\'t work', e.message || 'Try scanning again, or click your name below.');
    } finally {
        busy = false;
        focusInput();
    }
}

input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    scan(input.value.trim());
});
document.addEventListener('click', (e) => {
    if (!e.target.closest('#noIdPanel, #noIdToggle, button, a')) focusInput();
});

outBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-return]');
    if (!btn) return;
    btn.disabled = true;
    try {
        await apiFetch('/api/admin/headphones/return', { method: 'POST', body: JSON.stringify({ id: Number(btn.dataset.return) }) });
        await loadOut();
    } catch (err) { btn.disabled = false; }
    focusInput();
});

// "No ID?" name picker
noIdToggle.addEventListener('click', async () => {
    noIdPanel.classList.toggle('d-none');
    if (!noIdPanel.classList.contains('d-none')) {
        if (!roster.length) {
            try {
                const rows = await apiFetch('/api/admin/roster');
                roster = (Array.isArray(rows) ? rows : []).filter(s => s.role !== 'teacher' && s.section_id !== 'Teacher')
                    .sort((a, b) => String(a.last_name).localeCompare(String(b.last_name)));
            } catch (e) { roster = []; }
        }
        nameSearch.value = '';
        renderNames('');
        nameSearch.focus();
    } else {
        focusInput();
    }
});
nameSearch.addEventListener('input', () => renderNames(nameSearch.value));
function renderNames(q) {
    const term = q.trim().toLowerCase();
    if (term.length < 2) { nameList.innerHTML = '<div class="list-group-item text-muted small">Type at least 2 letters of your name…</div>'; return; }
    const hits = roster.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(term)).slice(0, 12);
    nameList.innerHTML = hits.length === 0
        ? '<div class="list-group-item text-muted small">No matching students.</div>'
        : hits.map(s => `<button type="button" class="list-group-item list-group-item-action fw-bold" data-id="${esc(s.student_id)}">${esc(s.last_name)}, ${esc(s.first_name)} <span class="text-muted small">(${esc(s.section_id)})</span></button>`).join('');
}
nameList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    noIdPanel.classList.add('d-none');
    scan(b.dataset.id);
});

loadOut();
setInterval(loadOut, 60 * 1000);
focusInput();
