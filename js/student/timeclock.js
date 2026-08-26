// /js/student/timeclock.js
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';
import { periodToCourseKey } from '../modules/grade-weights.js?v=3';

let studentData = null;
let currentQuestion = null;
let bellWindow = null; // { startMs, endMs } for whichever of the student's periods is currently active today, or null
let currentPeriod = null; // which of the student's (possibly multiple) periods bellWindow/getCourseKey resolved to

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

// A student can be enrolled in more than one of the teacher's periods (e.g.
// dual-enrolled in a WD period and a CS period, or Intervention plus a real
// class) via student_additional_sections. Returns every period code they
// should be checked against, primary first.
async function getAllStudentPeriods() {
    const primary = String(studentData.section_id || '').trim().toUpperCase();
    const periods = primary ? [primary] : [];
    try {
        const res = await fetch(`/api/admin/student-sections?student_id=${encodeURIComponent(studentData.student_id)}`);
        if (res.ok) {
            const extra = await res.json();
            (extra || []).forEach(s => {
                const p = String(s.section_id || '').trim().toUpperCase();
                if (p && !periods.includes(p)) periods.push(p);
            });
        }
    } catch (e) { /* fall back to just the primary period */ }
    return periods;
}

// Resolves today's start/end time (as ms-since-epoch) for whichever of the
// student's periods is actually happening right now -- not just their
// primary section, since a dual-enrolled student's other class may be the
// one currently in session. Also records which period that was in
// currentPeriod, so the clock-in question matches the RIGHT course. Falls
// back to the earliest period that meets today if none is active right
// this moment (keeps things stable for the manual widget/status check).
async function resolveTodaysBellWindow() {
    const periods = await getAllStudentPeriods();
    if (periods.length === 0) return null;

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

        // Most students have a bare period code ("A1", "B4"), but a legacy
        // subset (mostly WD1/WD2) still carry a compound section_id like
        // "WD1-B4" -- an exact match against bell_schedule.period_label (which
        // only ever has bare codes) silently finds nothing for them. Fall back
        // to a substring match on the same period code, same convention
        // periodToCourseKey() already uses for course resolution.
        const schedule = bellData.schedule || [];
        const now = new Date();
        const nowMs = now.getTime();

        const windows = periods.map(period => {
            const row = schedule.find(r => r.schedule_type === scheduleKey && r.period_label === period)
                || schedule.find(r => r.schedule_type === scheduleKey && period.includes(r.period_label));
            if (!row) return null;
            const [startH, startM] = row.start_time.split(':').map(Number);
            const [endH, endM] = row.end_time.split(':').map(Number);
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0);
            return { period, startMs: start.getTime(), endMs: end.getTime() };
        }).filter(Boolean);

        if (windows.length === 0) return null; // none of this student's periods meet on today's day type

        const active = windows.find(w => nowMs >= w.startMs && nowMs <= w.endMs);
        const chosen = active || windows.sort((a, b) => a.startMs - b.startMs)[0];

        currentPeriod = chosen.period;
        return { startMs: chosen.startMs, endMs: chosen.endMs };
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
//
// Flags are scoped by student_id, not just date: sessionStorage is shared by
// every login that happens in the same browser tab, and school computers get
// reused across periods without the tab ever closing. A date-only flag meant
// whichever student's popup fired first that day silently suppressed it for
// every student after them on the same machine — hitting later periods
// (B6, B8...) far more than earlier ones simply by being later in the day.
// Flags are scoped by period too, not just student+date: a dual-enrolled
// student attends two genuinely separate class periods today, each with
// its own clock-in/out event, so each period's popup needs to be able to
// fire independently instead of one suppressing the other.
//
// Both windows are open-ended on the far side (no "now <= endMs" upper
// bound) rather than snapping shut exactly at the period boundary. The
// 60s interval only fires reliably while the tab is in the foreground --
// browsers throttle timers in background tabs, which is exactly the kind
// of thing a student with several tabs open runs into constantly. A
// narrow window meant that if their tab wasn't focused at the precise
// moment, the check ran late, the window had already closed, and the
// popup silently never fired for the rest of the day. Better to prompt
// late (still accurate -- the recorded clock time reflects when they
// actually responded) than not at all. The once-per-day flag still
// prevents it from repeating once shown.
function checkAutoPopup() {
    if (!bellWindow || !window.timeclock || !studentData) return;
    const now = Date.now();
    const mode = window.timeclock.currentMode;
    const todayStr = getLocalTodayStr();
    const who = studentData.student_id;
    const wherePeriod = currentPeriod || 'na';

    if (mode === 'in' && now >= bellWindow.startMs) {
        const flag = `tc_auto_shown_in_${who}_${wherePeriod}_${todayStr}`;
        if (!sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, '1');
            openTimeclockModal();
        }
    } else if (mode === 'out' && now >= (bellWindow.endMs - 5 * 60 * 1000)) {
        const flag = `tc_auto_shown_out_${who}_${wherePeriod}_${todayStr}`;
        if (!sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, '1');
            openTimeclockModal();
        }
    }
}

// Resolves 'CS', 'WD1', or 'WD2' for whichever of the student's periods is
// currently active (set by resolveTodaysBellWindow) -- not just their
// primary section, so a dual-enrolled student sees the question for the
// class actually happening right now, not always their primary one.
function getCourseKey() {
    return periodToCourseKey(currentPeriod || studentData.section_id) || 'CS';
}

// ==============================================================================
// 2. CORE LOGIC
// ==============================================================================

async function initTimeclock() {
    // Get student data from our shared session module
    studentData = getLoggedInUser();
    if (!studentData) return;

    // Teachers browse student pages too (loader.js shows them every student
    // nav menu so they can demo tools live) -- don't pop the timeclock for them.
    const isTeacher = studentData.role === 'admin' || studentData.section_id === 'Teacher'
        || String(studentData.username || '').includes('damiller');
    if (isTeacher) return;

    injectTimeclockUI();

    // Resolve which period is currently active BEFORE the first status
    // check, so a dual-enrolled student's clock-in question is scoped to
    // the right course from the very first render, not just after the
    // first 60s refresh tick.
    //
    // A whole class logging in within the same few seconds (start of
    // period) is exactly when a fetch inside resolveTodaysBellWindow() is
    // most likely to hiccup from network congestion -- each individual
    // fetch already falls back gracefully on its own, but if enough of
    // them fail at once the window resolves to null with no popup and no
    // visible error, recovering only on the next 60s tick. Retry a few
    // times, a few seconds apart, right at load so this recovers in
    // seconds instead of possibly up to a minute.
    bellWindow = await resolveTodaysBellWindow();
    for (let attempt = 0; !bellWindow && attempt < 4; attempt++) {
        await new Promise(r => setTimeout(r, 4000));
        bellWindow = await resolveTodaysBellWindow();
    }
    await checkStatus();
    checkAutoPopup();

    const recheck = async () => {
        const modalEl = document.getElementById('timeclock-modal');
        if (modalEl && modalEl.classList.contains('show')) return; // don't disrupt an in-progress submission
        bellWindow = await resolveTodaysBellWindow(); // re-resolve each tick: which period is "current" changes across the day
        await checkStatus();
        checkAutoPopup();
    };

    setInterval(recheck, 60 * 1000);

    // Browsers throttle setInterval in background tabs, so a student who
    // switches back to this tab could otherwise wait a while for the next
    // (possibly delayed) tick before getting a check that's actually due
    // right now. Re-check immediately the moment the tab becomes visible
    // again instead of waiting on the interval to catch up.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') recheck();
    });
}

async function checkStatus() {
    if (!studentData) return;

    try {
        // Using our shared apiFetch module
        const periodParam = currentPeriod ? `&period=${encodeURIComponent(currentPeriod)}` : '';
        const statusData = await apiFetch(`/api/timeclock/status?student_id=${studentData.student_id}${periodParam}`);

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
            const category = `${getCourseKey()}_IN`;

            // Clock-in is always a real question pulled from that course's
            // actual chapter test bank -- never a manually-typed question.
            currentQuestion = await apiFetch(`/api/timeclock/question?type=${category}`);

            label.innerHTML = `<span class="d-block small text-muted fw-normal mb-1">${currentQuestion.chapterLabel || ''}</span>${currentQuestion.question_text}`;

            if (currentQuestion.unavailable) {
                optsContainer.innerHTML = `<input type="hidden" id="tc-in-fallback" value="N/A - no question bank available">`;
            } else {
                optsContainer.innerHTML = (currentQuestion.options || []).map((opt, i) => `
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="radio" name="tc-radio" value="${(opt || '').replace(/"/g, '&quot;')}" id="opt${i}" required>
                        <label class="form-check-label" for="opt${i}">${opt}</label>
                    </div>
                `).join('');
            }
            btn.innerText = "Submit & Clock In";
        }
        else if (mode === 'out') {
            const category = getCourseKey();
            const promptData = await apiFetch(`/api/timeclock/reflection-prompt?type=${category}`);
            label.innerText = promptData.prompt_text;
            optsContainer.innerHTML = `<textarea id="tc-out-answer" class="form-control" rows="3" required></textarea>`;
            btn.innerText = "Submit & Clock Out";
            btn.disabled = false;
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
        const fallback = document.getElementById('tc-in-fallback');
        if (fallback) {
            answer = fallback.value;
        } else {
            const checked = document.querySelector('input[name="tc-radio"]:checked');
            if (!checked) return;
            answer = checked.value;

            if (currentQuestion?.correct_answer) {
                const isCorrect = checked.value === currentQuestion.correct_answer;
                answer += ` | ${currentQuestion.chapterLabel || 'Review'}: ${isCorrect ? 'Correct' : `Incorrect (chose "${checked.value}", correct was "${currentQuestion.correct_answer}")`}`;
            }
        }
    } else {
        answer = document.getElementById('tc-out-answer').value;
    }

    try {
        await apiFetch('/api/timeclock/save', {
            method: 'POST',
            body: JSON.stringify({
                student_id: studentData.student_id,
                section_id: currentPeriod || studentData.section_id,
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
    <div class="modal fade" id="timeclock-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">Employee Timecard</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body bg-light p-4">
                    <div id="tc-status-badge" class="badge bg-secondary mb-3 w-100 py-2">STATUS: IDLE</div>
                    <form id="tc-form">
                        <h6 id="tc-question-label" class="fw-bold text-dark mb-3"></h6>
                        <div id="tc-options-container" class="mb-4"></div>
                        <button type="submit" id="tc-submit-btn" class="btn btn-primary w-100 fw-bold py-3">Submit</button>
                        <button type="button" class="btn btn-link w-100 mt-2 text-muted" data-bs-dismiss="modal">Not right now</button>
                    </form>
                    <div id="tc-success-msg" class="alert alert-success mt-3 d-none text-center fw-bold">Success!</div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', uiHtml);
    document.getElementById('tc-form').addEventListener('submit', handleTimeclockSubmit);
    document.getElementById('tc-widget-btn').addEventListener('click', async () => {
        // Refresh status right before showing -- otherwise a click soon after
        // page load (before the initial status check finishes) opens a modal
        // with stale or still-empty content that looks broken.
        await checkStatus();
        openTimeclockModal();
    });
}

// Preserve the global namespace for other scripts
window.timeclock = { currentMode: "idle" };

// This file is injected dynamically by loader.js (document.createElement +
// appendChild), not declared in the page's own markup -- a dynamically
// inserted script doesn't block DOMContentLoaded, so by the time this file
// finishes downloading and running, that event may have ALREADY fired
// (timing depends on the page's own size/complexity and network speed,
// which is exactly why this looked "random": it worked on slower/heavier
// pages that hadn't finished parsing yet, and silently never ran at all on
// faster/simpler ones). A DOMContentLoaded listener registered after the
// event already happened never fires, so BOTH the auto-popup and the
// manual widget button silently never appeared for those students. Same
// readyState check loader.js itself already uses for this exact reason.
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initTimeclock);
} else {
    initTimeclock();
}