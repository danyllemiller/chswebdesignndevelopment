// /js/student/timeclock.js
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';
import { periodToCourseKey } from '../modules/grade-weights.js?v=3';

let studentData = null;
let currentQuestion = null;
let bellWindow = null; // { startMs, endMs } for the student's period today, or null if no class today

// ==============================================================================
// 1. HELPERS & CONFIGURATION
// ==============================================================================

function getLocalTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// ==============================================================================
// AUTO-POPUP: clock-in as soon as the student's period starts, clock-out
// reminder 5 minutes before it ends. Mirrors the day-type resolution already
// used by calendar.js / admin/daily-agenda.html (special-dates.csv + DB
// events, higher-priority event wins on a given date) so this never disagrees
// with what the calendar shows for today.
// ==============================================================================

function parseSpecialDatesCSV(text) {
    const dayTypes = new Map();
    const lines = text.split(/\r?\n/);
    const firstLine = lines.find(l => l.trim());
    const delim = firstLine && firstLine.includes('\t') ? '\t' : ',';
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].trim();
        if (!raw) continue;
        if (i === 0 && /^date/i.test(raw.split(delim)[0].trim())) continue;
        const cols = raw.split(delim);
        const date = cols[0]?.trim();
        const type = cols[1]?.trim();
        const description = delim === '\t' ? (cols[2]?.trim() || '') : cols.slice(2).join(',').trim();
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && type) dayTypes.set(date, { type, description });
    }
    return dayTypes;
}

const EVENT_TYPE_PRI = { A: 6, B: 5, C: 4, A_MIN: 3, B_MIN: 2, S: 2, OFF: 1, none: 0 };

function mergeEventIntoDayTypes(dayTypes, ev) {
    const existing = dayTypes.get(ev.event_date);
    if (existing) {
        if ((EVENT_TYPE_PRI[ev.type] ?? 0) > (EVENT_TYPE_PRI[existing.type] ?? 0)) existing.type = ev.type;
    } else {
        dayTypes.set(ev.event_date, { type: ev.type, description: ev.description || '' });
    }
}

// The calendar event type IS the bell_schedule.schedule_type key (S -> 'summer').
function getBellScheduleKey(dayTypes, dateStr) {
    const info = dayTypes.get(dateStr);
    if (!info || info.type === 'OFF' || info.type === 'none') return null;
    const jsDay = new Date(dateStr + 'T00:00:00').getDay();
    if (jsDay === 0 || jsDay === 6) return null;
    return info.type === 'S' ? 'summer' : info.type;
}

// Resolves today's start/end time (as ms-since-epoch) for the logged-in
// student's own period, or null if their period doesn't meet today at all.
async function resolveTodaysBellWindow() {
    const period = String(studentData.section_id || '').trim().toUpperCase();
    if (!period) return null;

    try {
        const [csvText, eventsData, bellData] = await Promise.all([
            fetch('/special-dates.csv').then(r => r.ok ? r.text() : '').catch(() => ''),
            fetch('/api/events.php').then(r => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
            fetch('/api/bell-schedule.php').then(r => r.ok ? r.json() : { schedule: [] }).catch(() => ({ schedule: [] })),
        ]);

        const dayTypes = parseSpecialDatesCSV(csvText);
        (eventsData.events || []).forEach(ev => mergeEventIntoDayTypes(dayTypes, ev));

        const todayStr = getLocalTodayStr();
        const scheduleKey = getBellScheduleKey(dayTypes, todayStr);
        if (!scheduleKey) return null; // no school today (weekend/off/unscheduled)

        const row = (bellData.schedule || []).find(r => r.schedule_type === scheduleKey && r.period_label === period);
        if (!row) return null; // this student's period doesn't meet on today's day type

        const [startH, startM] = row.start_time.split(':').map(Number);
        const [endH, endM] = row.end_time.split(':').map(Number);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0);
        return { startMs: start.getTime(), endMs: end.getTime() };
    } catch (e) {
        console.error('[timeclock] Could not resolve today\'s bell window:', e);
        return null;
    }
}

function openTimeclockModal() {
    const modalEl = document.getElementById('timeclock-modal');
    if (!modalEl) return;
    const existing = bootstrap.Modal.getInstance(modalEl);
    if (existing && modalEl.classList.contains('show')) return; // already open
    (existing || new bootstrap.Modal(modalEl)).show();
}

// Runs on load and on a 60s interval. Auto-opens the timeclock modal exactly
// once per mode per day — once dismissed, the floating widget button is still
// there for the student to finish it manually, but we don't keep yanking it
// back open every minute.
function checkAutoPopup() {
    if (!bellWindow || !window.timeclock) return;
    const now = Date.now();
    const mode = window.timeclock.currentMode;
    const todayStr = getLocalTodayStr();

    if (mode === 'in' && now >= bellWindow.startMs && now <= bellWindow.endMs) {
        const flag = `tc_auto_shown_in_${todayStr}`;
        if (!sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, '1');
            openTimeclockModal();
        }
    } else if (mode === 'out' && now >= (bellWindow.endMs - 5 * 60 * 1000) && now <= bellWindow.endMs) {
        const flag = `tc_auto_shown_out_${todayStr}`;
        if (!sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, '1');
            openTimeclockModal();
        }
    }
}

// 2-day rotation engine
function getTwoDayIndex() {
    const now = new Date();
    let startYear = now.getFullYear();
    if (now.getMonth() < 7) startYear--; 
    let current = new Date(startYear, 7, 1);
    let days = 0;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    while (current <= today) {
        if (current.getDay() !== 0 && current.getDay() !== 6) days++;
        current.setDate(current.getDate() + 1);
    }
    return Math.floor((days - 1) / 2);
}

// ==============================================================================
// 2. CORE LOGIC
// ==============================================================================

async function initTimeclock() {
    // Get student data from our shared session module
    studentData = getLoggedInUser();
    if (!studentData) return;

    injectTimeclockUI();
    await checkStatus();

    bellWindow = await resolveTodaysBellWindow();
    checkAutoPopup();
    setInterval(async () => {
        const modalEl = document.getElementById('timeclock-modal');
        if (modalEl && modalEl.classList.contains('show')) return; // don't disrupt an in-progress submission
        await checkStatus();
        checkAutoPopup();
    }, 60 * 1000);
}

async function checkStatus() {
    if (!studentData) return;

    try {
        // Using our shared apiFetch module
        const statusData = await apiFetch(`/api/timeclock/status?student_id=${studentData.student_id}`);

        const label = document.getElementById('tc-question-label');
        const optsContainer = document.getElementById('tc-options-container');
        const btn = document.getElementById('tc-submit-btn');

        // Normalize mode: API returns raw 'type' field ('in'/'out') or {mode} if already normalized
        const mode = statusData.mode || (statusData.type === 'out' ? 'done' : statusData.type === 'in' ? 'out' : 'in');
        window.timeclock.currentMode = mode;

        if (mode === 'done') {
            document.getElementById('tc-form').style.display = 'none';
            document.getElementById('tc-success-msg').classList.remove('d-none');
            return;
        }

        if (mode === 'in') {
            // DETECT TRACK: CS vs WD — bare period codes (A3, B4...) don't carry
            // a "CS"/"WD" prefix, so this has to go through the shared course map.
            const isCS = periodToCourseKey(studentData.section_id) === 'CS';
            const category = isCS ? 'CS_IN' : 'WD_IN';
            const dayGroup = getTwoDayIndex();

            // Fetch Question from DB via apiFetch
            currentQuestion = await apiFetch(`/api/timeclock/question?type=${category}&group=${dayGroup}`);

            label.innerText = currentQuestion.question_text;
            const options = JSON.parse(currentQuestion.options);

            let html = options.map((opt, i) => `
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="tc-radio" value="${opt}" id="opt${i}" required>
                    <label class="form-check-label" for="opt${i}">${opt}</label>
                </div>
            `).join('');

            const rq = currentQuestion.reviewQuestion;
            if (rq) {
                html += `
                    <hr class="my-3">
                    <h6 class="fw-bold text-dark mb-1">Quick Unit ${rq.unit} Review${rq.isFallback ? '' : ''}</h6>
                    <p class="small mb-2">${rq.question}</p>
                    ${rq.options.map((opt, i) => `
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="radio" name="tc-review-radio" value="${(opt || '').replace(/"/g, '&quot;')}" id="rq-opt${i}" required>
                            <label class="form-check-label" for="rq-opt${i}">${opt}</label>
                        </div>
                    `).join('')}`;
            }
            optsContainer.innerHTML = html;
            btn.innerText = "Submit & Clock In";
        }
        else if (mode === 'out') {
            label.innerText = "Daily Reflection";
            optsContainer.innerHTML = `<textarea id="tc-out-answer" class="form-control" rows="3" required></textarea>`;
            btn.innerText = "Submit & Clock Out";
        }
    } catch (e) {
        console.error("Timeclock check status error:", e);
    }
}

async function handleTimeclockSubmit(e) {
    e.preventDefault();
    const mode = window.timeclock.currentMode;
    let answer = "";
    
    if (mode === 'in') {
        const checked = document.querySelector('input[name="tc-radio"]:checked');
        if (!checked) return;
        answer = checked.value;

        const rq = currentQuestion?.reviewQuestion;
        if (rq) {
            const reviewChecked = document.querySelector('input[name="tc-review-radio"]:checked');
            if (!reviewChecked) return;
            const isCorrect = reviewChecked.value === rq.answer;
            answer += ` | Unit ${rq.unit} Review: ${isCorrect ? 'Correct' : `Incorrect (chose "${reviewChecked.value}", correct was "${rq.answer}")`}`;
        }
    } else {
        answer = document.getElementById('tc-out-answer').value;
    }

    try {
        await apiFetch('/api/timeclock/save', {
            method: 'POST',
            body: JSON.stringify({
                student_id: studentData.student_id,
                section_id: studentData.section_id,
                mode: mode,
                answer: answer
            })
        });
        location.reload();
    } catch (e) { console.error("Timeclock submit error:", e); }
}

function injectTimeclockUI() {
    if (document.getElementById('tc-widget')) return;
    const uiHtml = `
    <div id="tc-widget" class="position-fixed bottom-0 end-0 m-4 z-3">
        <button class="btn btn-dark shadow-lg rounded-pill px-4 py-3" id="tc-widget-btn">Timeclock</button>
    </div>
    <div class="modal fade" id="timeclock-modal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">Employee Timecard</h5>
                </div>
                <div class="modal-body bg-light p-4">
                    <div id="tc-status-badge" class="badge bg-secondary mb-3 w-100 py-2">STATUS: IDLE</div>
                    <form id="tc-form">
                        <h6 id="tc-question-label" class="fw-bold text-dark mb-3"></h6>
                        <div id="tc-options-container" class="mb-4"></div>
                        <button type="submit" id="tc-submit-btn" class="btn btn-primary w-100 fw-bold py-3">Submit</button>
                    </form>
                    <div id="tc-success-msg" class="alert alert-success mt-3 d-none text-center fw-bold">Success!</div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', uiHtml);
    document.getElementById('tc-form').addEventListener('submit', handleTimeclockSubmit);
    document.getElementById('tc-widget-btn').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('timeclock-modal')).show();
    });
}

// Preserve the global namespace for other scripts
window.timeclock = { currentMode: "idle" };
document.addEventListener("DOMContentLoaded", initTimeclock);