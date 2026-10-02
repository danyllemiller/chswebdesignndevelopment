// /js/admin/attendance-scan.js
// Kiosk page for a USB barcode scanner (keyboard-emulation: it types the
// student ID then sends Enter, exactly like a keyboard would). The input
// is kept focused at all times so a scan always lands somewhere, and every
// result clears itself after a few seconds so the station is ready for the
// next student without anyone touching the screen.
import { apiFetch } from '../modules/api-client.js';

const TARDY_FORM_URL = `${location.origin}/student/tardy-form.html`;
let currentPeriod = null;
let feedbackTimer = null;
let currentRoster = [];
let noIdPanelOpen = false;

const input = document.getElementById('scanInput');
const periodLabel = document.getElementById('periodLabel');
const periodSelect = document.getElementById('periodSelect');
const panel = document.getElementById('feedbackPanel');
const icon = document.getElementById('feedbackIcon');
const nameEl = document.getElementById('feedbackName');
const subEl = document.getElementById('feedbackSub');
const tardyLinkBox = document.getElementById('tardyLinkBox');
const noIdToggle = document.getElementById('noIdToggle');
const noIdPanel = document.getElementById('noIdPanel');
const nameSearch = document.getElementById('nameSearch');
const nameList = document.getElementById('nameList');
const rosterToggle = document.getElementById('rosterToggle');
const rosterPanel = document.getElementById('rosterPanel');
const rosterBody = document.getElementById('rosterBody');
let rosterPanelOpen = false;

function focusInput() {
    input.value = '';
    input.focus();
}

// Short synthesized tones via Web Audio -- no audio asset files needed, and
// it means the teacher doesn't have to watch the screen to know a scan
// landed (and landed as what).
function beep(freq, durationMs) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + durationMs / 1000);
        setTimeout(() => ctx.close(), durationMs + 50);
    } catch (e) { /* audio isn't essential */ }
}

function showFeedback(kind, { iconClass, name, sub, tardyLink }) {
    clearTimeout(feedbackTimer);
    panel.className = `feedback-panel mx-auto ${kind}`;
    panel.style.display = 'block';
    icon.innerHTML = `<i class="${iconClass}"></i>`;
    nameEl.textContent = name || '';
    subEl.textContent = sub || '';
    if (tardyLink) {
        tardyLinkBox.textContent = TARDY_FORM_URL;
        tardyLinkBox.classList.remove('d-none');
    } else {
        tardyLinkBox.classList.add('d-none');
    }
    feedbackTimer = setTimeout(() => { panel.style.display = 'none'; refreshTally(); }, kind === 'error' ? 6000 : 3500);
}

async function loadCurrentPeriod() {
    try {
        const data = await apiFetch('/api/admin/attendance/current-period');
        const options = (data.periods || []).map(p =>
            `<option value="${p.label}" ${p.label === data.current ? 'selected' : ''}>${p.label}</option>`
        ).join('');
        periodSelect.innerHTML = options || '<option value="">No periods today</option>';
        currentPeriod = data.current || (data.periods[0] && data.periods[0].label) || null;
        if (currentPeriod) periodSelect.value = currentPeriod;
        periodLabel.textContent = currentPeriod ? `Period ${currentPeriod}` : 'No period in session';
        refreshTally();
    } catch (e) {
        periodLabel.textContent = 'Failed to load period';
    }
}

async function refreshTally() {
    if (!currentPeriod) return;
    try {
        const data = await apiFetch(`/api/admin/attendance/summary?section_id=${encodeURIComponent(currentPeriod)}`);
        const rows = data.rows || [];
        currentRoster = rows;
        document.getElementById('tallyPresent').textContent = rows.filter(r => r.status === 'present').length;
        document.getElementById('tallyTardy').textContent = rows.filter(r => r.status === 'tardy').length;
        document.getElementById('tallyAbsent').textContent = rows.filter(r => !r.status).length;
        renderNameList();
        renderRosterTable();
    } catch (e) { /* tally is a convenience, not critical */ }
}

function renderRosterTable() {
    if (currentRoster.length === 0) {
        rosterBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No students found for this period.</td></tr>';
        return;
    }
    rosterBody.innerHTML = currentRoster.map(r => {
        const statusClass = r.status === 'present' ? 'status-present' : r.status === 'tardy' ? 'status-tardy' : 'status-none';
        const statusText = r.status ? r.status[0].toUpperCase() + r.status.slice(1) : 'Not yet';
        const time = r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
        return `<tr>
            <td class="fw-bold">${r.first_name} ${r.last_name}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${time}</td>
        </tr>`;
    }).join('');
}

function renderNameList() {
    const q = nameSearch.value.trim().toLowerCase();
    const filtered = q
        ? currentRoster.filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(q))
        : currentRoster;
    if (filtered.length === 0) {
        nameList.innerHTML = '<div class="text-muted small">No matching students.</div>';
        return;
    }
    nameList.innerHTML = filtered.map(r => {
        const statusClass = r.status === 'present' ? 'marked-present' : r.status === 'tardy' ? 'marked-tardy' : '';
        const statusTag = r.status ? ` <i class="fas ${r.status === 'present' ? 'fa-check' : 'fa-triangle-exclamation'}"></i>` : '';
        return `<button type="button" class="name-btn ${statusClass}" data-student-id="${r.student_id}">${r.first_name} ${r.last_name}${statusTag}</button>`;
    }).join('');
}

async function handleScan(studentId) {
    if (!currentPeriod) { showFeedback('error', { iconClass: 'fas fa-exclamation-triangle text-danger', name: 'No period selected', sub: 'Pick a period above first.' }); return; }
    try {
        const res = await fetch('/api/admin/attendance/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, section_id: currentPeriod })
        });
        const data = await res.json();

        if (!res.ok) {
            if (data.needsForm) {
                beep(220, 400);
                showFeedback('error', {
                    iconClass: 'fas fa-clipboard-list text-danger',
                    name: data.student ? `${data.student.first_name} ${data.student.last_name}` : 'Tardy form needed',
                    sub: data.error,
                    tardyLink: true
                });
            } else {
                beep(220, 400);
                showFeedback('error', { iconClass: 'fas fa-circle-xmark text-danger', name: 'Not Recorded', sub: data.error || 'Scan failed.' });
            }
            return;
        }

        if (data.already) {
            beep(440, 150);
            showFeedback('already', {
                iconClass: 'fas fa-circle-check text-secondary',
                name: `${data.student.first_name} ${data.student.last_name}`,
                sub: `Already marked ${data.status} today.`
            });
            return;
        }

        if (data.status === 'present') {
            beep(880, 150);
            showFeedback('present', { iconClass: 'fas fa-circle-check text-success', name: `${data.student.first_name} ${data.student.last_name}`, sub: 'Present' });
        } else {
            beep(660, 250);
            showFeedback('tardy', { iconClass: 'fas fa-triangle-exclamation text-warning', name: `${data.student.first_name} ${data.student.last_name}`, sub: `Tardy — ${data.reason || 'no reason given'}` });
        }
    } catch (e) {
        showFeedback('error', { iconClass: 'fas fa-circle-xmark text-danger', name: 'Error', sub: 'Could not reach the server.' });
    }
}

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
        const id = input.value.trim();
        input.value = '';
        handleScan(id);
    }
});

document.addEventListener('click', (e) => {
    if (noIdPanelOpen || noIdPanel.contains(e.target) || e.target === noIdToggle) return;
    if (rosterPanel.contains(e.target) || e.target === rosterToggle) return;
    if (document.activeElement !== input) focusInput();
});
setInterval(() => {
    if (noIdPanelOpen) return;
    if (document.activeElement !== input) focusInput();
}, 2000);

periodSelect.addEventListener('change', () => {
    currentPeriod = periodSelect.value || null;
    periodLabel.textContent = currentPeriod ? `Period ${currentPeriod}` : 'No period selected';
    refreshTally();
});

noIdToggle.addEventListener('click', () => {
    noIdPanelOpen = !noIdPanelOpen;
    noIdPanel.classList.toggle('d-none', !noIdPanelOpen);
    if (noIdPanelOpen) {
        refreshTally();
        nameSearch.focus();
    } else {
        focusInput();
    }
});

nameSearch.addEventListener('input', renderNameList);

nameList.addEventListener('click', (e) => {
    const btn = e.target.closest('.name-btn');
    if (!btn) return;
    handleScan(btn.dataset.studentId);
});

rosterToggle.addEventListener('click', () => {
    rosterPanelOpen = !rosterPanelOpen;
    rosterPanel.classList.toggle('d-none', !rosterPanelOpen);
    rosterToggle.innerHTML = rosterPanelOpen
        ? '<i class="fas fa-xmark me-1"></i>Hide List'
        : '<i class="fas fa-list me-1"></i>View List';
    if (rosterPanelOpen) refreshTally();
});

loadCurrentPeriod();
focusInput();
