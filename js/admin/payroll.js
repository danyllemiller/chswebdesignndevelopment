// js/admin/payroll.js
/**
 * Master Payroll & Timeclock Dashboard
 * MIGRATED: Firebase removed. Uses MariaDB API + auth-guard.js for authentication.
 */

// ============================================================================
// CONSTANTS
// ============================================================================
const PAY_SCALES = {
    "Intern": 15.00,
    "Junior Developer": 20.00,
    "Web Developer": 35.00,
    "Senior Developer": 45.00,
    "Project Manager": 50.00
};
const DEFAULT_ROLE = "Web Developer";
const ON_TIME_BONUS = 5.00;

// ============================================================================
// AUTH GUARD (MariaDB / auth-guard.js)
// ============================================================================
function waitForAuth(timeout = 8000) {
    return new Promise((resolve) => {
        if (window.dacAuthData) { resolve(window.dacAuthData); return; }
        const handler = () => { resolve(window.dacAuthData); };
        document.addEventListener('authComplete', handler, { once: true });
        setTimeout(() => {
            document.removeEventListener('authComplete', handler);
            resolve({ isAuthenticated: false, isTeacher: false });
        }, timeout);
    });
}

// ============================================================================
// CALENDAR CONFIG (MariaDB API)
// ============================================================================
let calendarConfig = null;

const defaultCalendarConfig = {
    termStart: "2025-08-01",
    termEnd: "2026-06-15",
    weeklyRoutine: {
        "1": "A", "2": "B", "3": "A", "4": "B", "5": "A"
    },
    exceptions: {
        A: [], B: [], A_MIN: [], B_MIN: [], OFF: []
    },
    bellTimes: {
        REGULAR: {
            "1_2": { start: "07:35", end: "09:00" },
            "3_4": { start: "09:10", end: "10:35" },
            "5_6": { start: "11:10", end: "12:35" },
            "7_8": { start: "12:42", end: "14:07" }
        },
        MINIMUM: {
            "1_2": { start: "07:35", end: "08:27" },
            "3_4": { start: "08:33", end: "09:25" },
            "5_6": { start: "09:50", end: "10:42" },
            "7_8": { start: "10:48", end: "11:40" }
        }
    }
};

async function loadCalendarConfig() {
    try {
        const res = await fetch('/api/admin/calendar-settings');
        if (res.ok) {
            calendarConfig = migrateCalendarConfig(await res.json());
        } else {
            calendarConfig = { ...defaultCalendarConfig };
        }
        if (typeof populateCalendarModal === "function") populateCalendarModal();
    } catch (e) {
        console.error("Error loading calendar config:", e);
        calendarConfig = { ...defaultCalendarConfig };
    }
}

function migrateCalendarConfig(config) {
    if (!config || !config.exceptions) return { ...defaultCalendarConfig };
    const exceptions = {
        A: config.exceptions.A || [],
        B: config.exceptions.B || [],
        A_MIN: config.exceptions.A_MIN || [],
        B_MIN: config.exceptions.B_MIN || [],
        OFF: config.exceptions.OFF || []
    };
    // Legacy migration: old config had a single "MIN" list
    if (config.exceptions.MIN && Array.isArray(config.exceptions.MIN)) {
        exceptions.A_MIN = [...exceptions.A_MIN, ...config.exceptions.MIN];
        exceptions.B_MIN = [...exceptions.B_MIN, ...config.exceptions.MIN];
    }
    return {
        ...defaultCalendarConfig,
        ...config,
        exceptions
    };
}

async function saveCalendarConfig() {
    const btn = document.getElementById('btnSaveCalendar');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
    btn.disabled = true;

    const cleanList = (str) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const newConfig = {
        termStart: document.getElementById('termStart').value,
        termEnd: document.getElementById('termEnd').value,
        weeklyRoutine: {
            "1": document.getElementById('dayMon').value,
            "2": document.getElementById('dayTue').value,
            "3": document.getElementById('dayWed').value,
            "4": document.getElementById('dayThu').value,
            "5": document.getElementById('dayFri').value
        },
        bellTimes: {
            REGULAR: {
                "1_2": { start: document.getElementById('regStart1').value, end: document.getElementById('regEnd1').value },
                "3_4": { start: document.getElementById('regStart3').value, end: document.getElementById('regEnd3').value },
                "5_6": { start: document.getElementById('regStart5').value, end: document.getElementById('regEnd5').value },
                "7_8": { start: document.getElementById('regStart7').value, end: document.getElementById('regEnd7').value }
            },
            MINIMUM: {
                "1_2": { start: document.getElementById('minStart1').value, end: document.getElementById('minEnd1').value },
                "3_4": { start: document.getElementById('minStart3').value, end: document.getElementById('minEnd3').value },
                "5_6": { start: document.getElementById('minStart5').value, end: document.getElementById('minEnd5').value },
                "7_8": { start: document.getElementById('minStart7').value, end: document.getElementById('minEnd7').value }
            }
        },
        exceptions: {
            A: cleanList(document.getElementById('excA').value),
            B: cleanList(document.getElementById('excB').value),
            A_MIN: cleanList(document.getElementById('excAMin').value),
            B_MIN: cleanList(document.getElementById('excBMin').value),
            OFF: cleanList(document.getElementById('excOff').value)
        }
    };

    try {
        const res = await fetch('/api/admin/calendar-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });
        if (!res.ok) throw new Error('Server error');
        calendarConfig = newConfig;

        btn.innerHTML = '<i class="fas fa-check me-2"></i>Saved!';
        btn.classList.replace('btn-primary', 'btn-success');

        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('calendarModal'));
            if (modal) modal.hide();
            btn.innerHTML = 'Save Global Configuration';
            btn.classList.replace('btn-success', 'btn-primary');
            btn.disabled = false;
            applyFiltersAndRender();
        }, 1500);
    } catch (e) {
        console.error("Error saving calendar config:", e);
        alert("Failed to save configuration.");
        btn.innerHTML = 'Save Global Configuration';
        btn.disabled = false;
    }
}

// ============================================================================
// BELL SCHEDULE HELPERS
// ============================================================================
function getBlockKey(periodStr) {
    if (!periodStr) return "1_2";
    const block = periodStr.includes('-') ? periodStr.split('-').pop() : periodStr;
    const blockNum = block.replace(/\D/g, '');
    if (blockNum === "3" || blockNum === "4") return "3_4";
    if (blockNum === "5" || blockNum === "6") return "5_6";
    if (blockNum === "7" || blockNum === "8") return "7_8";
    return "1_2";
}

function getDayType(dateStr) {
    if (!calendarConfig) return null;
    if (dateStr < calendarConfig.termStart || dateStr > calendarConfig.termEnd) return null;
    const exc = calendarConfig.exceptions;
    if (exc.OFF && exc.OFF.includes(dateStr)) return "OFF";
    if (exc.A && exc.A.includes(dateStr)) return "A";
    if (exc.B && exc.B.includes(dateStr)) return "B";
    if (exc.A_MIN && exc.A_MIN.includes(dateStr)) return "A_MIN";
    if (exc.B_MIN && exc.B_MIN.includes(dateStr)) return "B_MIN";
    const dayOfWeek = new Date(dateStr + "T12:00:00").getDay().toString();
    return calendarConfig.weeklyRoutine[dayOfWeek] || null;
}

function getBellStartMinutes(dateStr, periodStr) {
    const dayType = getDayType(dateStr);
    if (!dayType || dayType === "OFF") return null;
    const blockKey = getBlockKey(periodStr);
    const schedType = (dayType === "A_MIN" || dayType === "B_MIN") ? "MINIMUM" : "REGULAR";
    const sched = calendarConfig?.bellTimes?.[schedType]?.[blockKey];
    if (!sched) return null;
    const [h, m] = sched.start.split(':').map(Number);
    return h * 60 + m;
}

function getBellEndMinutes(dateStr, periodStr) {
    const dayType = getDayType(dateStr);
    if (!dayType || dayType === "OFF") return null;
    const blockKey = getBlockKey(periodStr);
    const schedType = (dayType === "A_MIN" || dayType === "B_MIN") ? "MINIMUM" : "REGULAR";
    const sched = calendarConfig?.bellTimes?.[schedType]?.[blockKey];
    if (!sched) return null;
    const [h, m] = sched.end.split(':').map(Number);
    return h * 60 + m;
}

function calcClockInStatus(clockInMs, dateStr, periodStr) {
    const startMin = getBellStartMinutes(dateStr, periodStr);
    if (startMin === null) return "On Time";
    const d = new Date(clockInMs);
    const actualMin = d.getHours() * 60 + d.getMinutes();
    if (actualMin < startMin) return "Overtime";
    if (actualMin <= startMin + 5) return "On Time";
    return "Late";
}

function calcClockOutStatus(clockOutMs, dateStr, periodStr) {
    const endMin = getBellEndMinutes(dateStr, periodStr);
    if (endMin === null) return "On Time";
    const d = new Date(clockOutMs);
    const actualMin = d.getHours() * 60 + d.getMinutes();
    if (actualMin < endMin - 5) return "Early Departure";
    if (actualMin >= endMin) return "Overtime";
    return "On Time";
}

function getExpectedDuration(dateStr, periodStr) {
    if (!periodStr || !calendarConfig) return 90;
    if (dateStr < calendarConfig.termStart || dateStr > calendarConfig.termEnd) return 90;

    const dayType = getDayType(dateStr);
    if (!dayType || dayType === "OFF") return 90;

    const block = periodStr.includes('-') ? periodStr.split('-').pop() : periodStr;
    const isADay = dayType === "A" || dayType === "A_MIN";
    const isBDay = dayType === "B" || dayType === "B_MIN";
    if ((isADay && block.startsWith("B")) || (isBDay && block.startsWith("A"))) return 90;

    const blockKey = getBlockKey(periodStr);
    const schedType = (dayType === "A_MIN" || dayType === "B_MIN") ? "MINIMUM" : "REGULAR";
    const sched = calendarConfig?.bellTimes?.[schedType]?.[blockKey];
    if (!sched) return 90;

    const [sH, sM] = sched.start.split(':').map(Number);
    const [eH, eM] = sched.end.split(':').map(Number);
    return (eH * 60 + eM) - (sH * 60 + sM);
}

// ============================================================================
// TIMESHEET ADAPTER: MariaDB row → Firebase-compatible shape
// ============================================================================
function adaptTimesheetRow(row, periodStr) {
    // date: MariaDB DATE serialized as ISO string or Date object
    const rawDate = row.date;
    let dateStr;
    if (rawDate instanceof Date) {
        dateStr = rawDate.toISOString().slice(0, 10);
    } else if (typeof rawDate === 'string') {
        dateStr = rawDate.slice(0, 10); // handle "2025-09-01" or "2025-09-01T..."
    } else {
        dateStr = String(rawDate).slice(0, 10);
    }

    const clockInTime = row.clock_in ? new Date(row.clock_in).getTime() : null;
    const clockOutTime = row.clock_out ? new Date(row.clock_out).getTime() : null;

    return {
        date: dateStr,
        clockInTime,
        clockOutTime,
        statusIn: clockInTime ? calcClockInStatus(clockInTime, dateStr, periodStr) : null,
        statusOut: clockOutTime ? calcClockOutStatus(clockOutTime, dateStr, periodStr) : null,
        notebookIn: {
            question: "Clock-in knowledge check",
            answerGiven: row.in_answer || "",
            isCorrect: (row.score || 0) > 0
        },
        notebookOut: {
            question: "Clock-out reflection",
            answerGiven: row.out_answer || ""
        }
    };
}

// ============================================================================
// GLOBAL STATE
// ============================================================================
const _today = new Date();
const _pad = (n) => n < 10 ? '0' + n : n;
let currentDate = `${_today.getFullYear()}-${_pad(_today.getMonth() + 1)}-${_pad(_today.getDate())}`;

let roster = [];
let viewMode = 'daily';
const ANCHOR_DATE = new Date("2026-08-02T00:00:00");

let privacyMode = false;
let mappedNames = {};

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getPayPeriodForDate(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    const diffTime = d.getTime() - ANCHOR_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const periodsPassed = Math.floor(diffDays / 14);

    const ppStart = new Date(ANCHOR_DATE.getTime() + (periodsPassed * 14 * 24 * 60 * 60 * 1000));
    const ppEnd = new Date(ppStart.getTime() + (13 * 24 * 60 * 60 * 1000));

    const startStr = `${ppStart.getFullYear()}-${_pad(ppStart.getMonth() + 1)}-${_pad(ppStart.getDate())}`;
    const endStr = `${ppEnd.getFullYear()}-${_pad(ppEnd.getMonth() + 1)}-${_pad(ppEnd.getDate())}`;

    return {
        startStr, endStr,
        friendly: `${ppStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${ppEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
}

// ============================================================================
// INIT
// ============================================================================
async function init() {
    const authData = await waitForAuth();

    if (!authData.isAuthenticated) {
        window.location.replace("/login.html?redirect=" + encodeURIComponent(window.location.pathname));
        return;
    }
    if (!authData.isTeacher) {
        alert("Security Alert: Teacher access required.");
        window.location.replace("/index.html");
        return;
    }

    document.getElementById('dateFilter').value = currentDate;

    await loadCalendarConfig();
    await loadRoster();
    loadDailyQuestions();

    document.getElementById('dateFilter').addEventListener('change', (e) => {
        currentDate = e.target.value;
        applyFiltersAndRender();
        loadDailyQuestions();
    });

    const periodFilter = document.getElementById('periodFilter');
    if (periodFilter) {
        periodFilter.addEventListener('change', (e) => {
            const studentFilter = document.getElementById('studentFilter');
            if (studentFilter) studentFilter.value = 'All';
            updateStudentDropdown(getFilteredStudents(e.target.value, 'All'));
            applyFiltersAndRender();
        });
    }

    const studentFilter = document.getElementById('studentFilter');
    if (studentFilter) studentFilter.addEventListener('change', () => applyFiltersAndRender());

    const vbtnDaily = document.getElementById('vbtn-daily');
    if (vbtnDaily) vbtnDaily.addEventListener('change', () => { viewMode = 'daily'; applyFiltersAndRender(); });

    const vbtnPeriod = document.getElementById('vbtn-period');
    if (vbtnPeriod) vbtnPeriod.addEventListener('change', () => { viewMode = 'period'; applyFiltersAndRender(); });

    const btnGenW2 = document.getElementById('btnGenerateW2');
    if (btnGenW2) btnGenW2.addEventListener('click', generateW2Forms);

    const btnInject = document.getElementById('btnInjectFakeData');
    if (btnInject) btnInject.addEventListener('click', injectFakeData);

    const btnSaveQ = document.getElementById('btnSaveQuestions');
    if (btnSaveQ) btnSaveQ.addEventListener('click', saveDailyQuestions);

    const btnSaveCal = document.getElementById('btnSaveCalendar');
    if (btnSaveCal) btnSaveCal.addEventListener('click', saveCalendarConfig);

    document.addEventListener('click', (e) => {
        const historyLink = e.target.closest('.view-student-history');
        if (historyLink) {
            e.preventDefault();
            viewStudentHistory(historyLink.dataset.studentId);
        }
        const privacyBtn = e.target.closest('#btnTogglePrivacy');
        if (privacyBtn) {
            privacyMode = !privacyMode;
            applyFiltersAndRender();
        }
    });
}

init();

// ============================================================================
// ROSTER (MariaDB API)
// ============================================================================
async function loadRoster() {
    try {
        const res = await fetch('/api/admin/payroll/roster');
        const data = await res.json();

        roster = (data.roster || []).map(s => ({
            id: s.student_id,
            firstName: s.first_name || '',
            lastName: s.last_name || '',
            period: s.section_id || '',
            username: s.username || '',
            role: s.pay_role_title || DEFAULT_ROLE,
            hourlyRate: parseFloat(s.hourly_rate) || PAY_SCALES[DEFAULT_ROLE]
        }));

        roster.sort((a, b) => a.lastName.localeCompare(b.lastName));
        updatePeriodDropdown();
        const periodSelect = document.getElementById('periodFilter');
        const initialPeriod = periodSelect ? periodSelect.value : 'All';
        updateStudentDropdown(getFilteredStudents(initialPeriod, 'All'));
        applyFiltersAndRender();
    } catch (e) {
        console.error("Error loading roster:", e);
    }
}

// ============================================================================
// FILTERING LOGIC
// ============================================================================
function getFilteredStudents(periodVal, studentVal) {
    let filtered = roster;

    if (periodVal !== 'All') {
        if (periodVal === 'All-WD1') filtered = filtered.filter(s => s.period && s.period.startsWith('WD1'));
        else if (periodVal === 'All-WD2') filtered = filtered.filter(s => s.period && s.period.startsWith('WD2'));
        else if (periodVal === 'All-CS') filtered = filtered.filter(s => s.period && s.period.startsWith('CS'));
        else filtered = filtered.filter(s => s.period === periodVal);
    }

    if (studentVal && studentVal !== 'All') {
        filtered = filtered.filter(s => s.id === studentVal);
    }

    return filtered;
}

function updateStudentDropdown(filteredStudents) {
    const studentSelect = document.getElementById('studentFilter');
    if (!studentSelect) return;

    studentSelect.innerHTML = '<option value="All">All Students in View</option>';

    const sorted = [...filteredStudents].sort((a, b) => a.lastName.localeCompare(b.lastName));
    sorted.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.lastName}, ${s.firstName} (${s.period})`;
        studentSelect.appendChild(opt);
    });
}

function updatePeriodDropdown() {
    const periodSelect = document.getElementById('periodFilter');
    if (!periodSelect) return;

    const currentVal = periodSelect.value || 'All';
    const periods = [...new Set(
        roster.map(s => s.period).filter(p => p && p !== 'Teacher' && p !== 'Unassigned')
    )].sort();

    let html = '<option value="All">All Classes</option>';

    if (periods.length === 0) {
        periodSelect.innerHTML = html;
        periodSelect.value = 'All';
        return;
    }

    const groupedPeriods = {};
    periods.forEach(p => {
        const prefix = p.split('-')[0];
        if (!groupedPeriods[prefix]) groupedPeriods[prefix] = [];
        groupedPeriods[prefix].push(p);
    });

    const courseNames = {
        WD1: 'Web Design 1',
        WD2: 'Advanced Web Design',
        CS: 'Computer Science',
        AS: 'Advanced Studies'
    };

    Object.keys(groupedPeriods).sort().forEach(prefix => {
        const name = courseNames[prefix] || prefix;
        html += `<option value="All-${prefix}">All ${name}</option>`;
    });

    Object.keys(groupedPeriods).sort().forEach(prefix => {
        const name = courseNames[prefix] || prefix;
        html += `<optgroup label="${name}">`;
        groupedPeriods[prefix].forEach(p => { html += `<option value="${p}">${p}</option>`; });
        html += `</optgroup>`;
    });

    periodSelect.innerHTML = html;
    if ([...periodSelect.options].some(opt => opt.value === currentVal)) {
        periodSelect.value = currentVal;
    } else {
        periodSelect.value = 'All';
    }
}

function applyFiltersAndRender() {
    const periodFilter = document.getElementById('periodFilter');
    const periodVal = periodFilter ? periodFilter.value : 'All';
    const studentFilter = document.getElementById('studentFilter');
    const studentVal = studentFilter ? studentFilter.value : 'All';

    if (periodVal === 'All' || periodVal === '' || periodVal.includes('Select')) {
        const theadRow = document.querySelector('thead tr');
        const tbody = document.getElementById('timesheetBody');
        if (theadRow) {
            theadRow.innerHTML = `
                <th class="py-3 px-3">Employee (Student)</th>
                <th class="py-3 text-center">Clock In</th>
                <th class="py-3 w-25">In: Knowledge Check</th>
                <th class="py-3 text-center">Clock Out</th>
                <th class="py-3 w-25">Out: Reflection</th>
                <th class="py-3 text-center">Time Logged</th>
                <th class="py-3 text-center border-end">Est. Daily Pay</th>
            `;
        }
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="100%" class="text-center p-5 text-muted">
                <i class="fas fa-users-cog fa-3x mb-3 text-secondary"></i>
                <h4 class="fw-bold">No Class Selected</h4>
                <p>Please select a specific class period from the dropdown above to view employee timesheets.</p>
            </td></tr>`;
        }
        return;
    }

    const filteredStudents = getFilteredStudents(periodVal, studentVal);
    loadTimesheets(filteredStudents);
}

// ============================================================================
// LOAD TIMESHEETS (MariaDB API - bulk endpoints)
// ============================================================================
async function loadTimesheets(filteredStudents) {
    const tbody = document.getElementById('timesheetBody');
    const theadRow = document.querySelector('thead tr');

    const btnClass = privacyMode ? "btn-warning text-dark" : "btn-outline-light text-white";
    const btnIcon = privacyMode ? "fa-user-secret" : "fa-eye";
    const privacyToggleHtml = `
        <div class="d-flex justify-content-between align-items-center mb-1">
            <div class="fw-bold fs-6">Employee Info</div>
            <button id="btnTogglePrivacy" class="btn btn-sm ${btnClass} py-0 px-2 shadow-sm" style="border-radius: 4px; border: 1px solid rgba(255,255,255,0.5);" title="Toggle Privacy Mode">
                <i class="fas ${btnIcon}"></i>
            </button>
        </div>
    `;

    // Build a period lookup map from roster (needed for timesheet adaptation)
    const periodByStudentId = {};
    roster.forEach(s => { periodByStudentId[s.id] = s.period; });

    // ====================================================
    // PAY PERIOD VIEW
    // ====================================================
    if (viewMode === 'period') {
        const period = getPayPeriodForDate(currentDate);

        if (theadRow) {
            theadRow.innerHTML = `
                <th class="sticky-corner py-3 px-3">${privacyToggleHtml}</th>
                <th class="py-3 text-center">Pay Period</th>
                <th class="py-3 text-center">Shifts Logged</th>
                <th class="py-3 text-center">Total Time</th>
                <th class="py-3 text-center">Perf. Bonuses</th>
                <th class="py-3 text-center border-end">Period Gross Pay</th>
            `;
        }

        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-5 text-muted"><div class="spinner-border text-primary mb-3"></div><br>Calculating Pay Period (${period.friendly})...</td></tr>`;

        try {
            const res = await fetch(`/api/admin/payroll/timesheets-period?from=${period.startStr}&to=${period.endStr}`);
            const data = await res.json();
            const rawTimesheets = data.timesheets || [];

            // Group timesheets by student_id
            const tsMap = {};
            rawTimesheets.forEach(row => {
                const pid = periodByStudentId[row.student_id] || '';
                const adapted = adaptTimesheetRow(row, pid);
                if (!tsMap[row.student_id]) tsMap[row.student_id] = [];
                tsMap[row.student_id].push(adapted);
            });

            let html = '';
            filteredStudents.forEach(student => {
                let displayName = `${student.lastName.toUpperCase()}, ${student.firstName}`;
                let displayId = student.id;

                if (privacyMode) {
                    if (!mappedNames[student.id]) mappedNames[student.id] = `Student ${Object.keys(mappedNames).length + 1}`;
                    displayName = mappedNames[student.id];
                    displayId = "HIDDEN";
                }

                const shifts = tsMap[student.id] || [];
                const hourlyRate = student.hourlyRate || PAY_SCALES[student.role] || PAY_SCALES[DEFAULT_ROLE];

                let totalMins = 0;
                let totalGross = 0;
                let totalBonuses = 0;

                shifts.forEach(ts => {
                    let shiftMins = 0;
                    let shiftBonusCount = 0;

                    if (ts.statusIn === "On Time" || ts.statusIn === "Overtime") shiftBonusCount++;
                    if (ts.statusOut === "On Time" || ts.statusOut === "Overtime") shiftBonusCount++;

                    if (ts.clockInTime) {
                        shiftMins = ts.clockOutTime
                            ? Math.round((ts.clockOutTime - ts.clockInTime) / 60000)
                            : getExpectedDuration(ts.date, student.period);
                    }

                    totalMins += shiftMins;
                    totalBonuses += shiftBonusCount;
                    const hours = shiftMins / 60;
                    totalGross += (hours * hourlyRate) + (shiftBonusCount * ON_TIME_BONUS);
                });

                const overallHours = Math.floor(totalMins / 60);
                const overallRemainingMins = totalMins % 60;
                const durationText = totalMins > 0 ? `${overallHours}h ${overallRemainingMins}m` : '-';

                html += `
                    <tr>
                        <td class="sticky-col px-3">
                            <a href="#" class="text-decoration-none view-student-history" data-student-id="${student.id}" title="Audit Employee History">
                                <div class="fw-bold text-primary" style="cursor: pointer;">
                                    <i class="fas fa-search-dollar me-1 opacity-50"></i> ${displayName}
                                </div>
                            </a>
                            <div class="id-cell">${displayId} | ${student.role}</div>
                        </td>
                        <td class="text-center align-middle bg-light border-start border-end">
                            <div class="fw-bold text-dark small">${period.friendly}</div>
                        </td>
                        <td class="text-center align-middle border-end">
                            <span class="badge bg-secondary fs-6">${shifts.length}</span>
                        </td>
                        <td class="text-center align-middle bg-light border-end">
                            <div class="fw-bold text-dark fs-6">${durationText}</div>
                        </td>
                        <td class="text-center align-middle border-end">
                            <span class="fw-bold text-success">+$${(totalBonuses * ON_TIME_BONUS).toFixed(2)}</span>
                            <div class="x-small text-muted">(${totalBonuses}x Bonuses)</div>
                        </td>
                        <td class="text-center align-middle fw-bold text-success fs-5 bg-light border-end">
                            $${totalGross.toFixed(2)}
                        </td>
                    </tr>
                `;
            });

            if (filteredStudents.length === 0) html = `<tr><td colspan="6" class="text-center p-5 text-muted fw-bold">No students match this filter.</td></tr>`;
            tbody.innerHTML = html;
        } catch (e) {
            console.error("Error loading period timesheets:", e);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">Failed to load data.</td></tr>`;
        }
        return;
    }

    // ====================================================
    // DAILY VIEW
    // ====================================================
    if (theadRow) {
        theadRow.innerHTML = `
            <th class="sticky-corner py-3 px-3">${privacyToggleHtml}</th>
            <th class="py-3 text-center">Clock In</th>
            <th class="py-3 w-25">In: Knowledge Check</th>
            <th class="py-3 text-center">Clock Out</th>
            <th class="py-3 w-25">Out: Reflection</th>
            <th class="py-3 text-center">Time Logged</th>
            <th class="py-3 text-center border-end">Est. Daily Pay</th>
        `;
    }

    tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5 text-muted"><div class="spinner-border text-primary mb-3"></div><br>Loading Timesheets for ${currentDate}...</td></tr>`;

    try {
        const res = await fetch(`/api/admin/payroll/timesheets-daily?date=${currentDate}`);
        const data = await res.json();
        const rawTimesheets = data.timesheets || [];

        // Build map: student_id → adapted timesheet
        const tsMap = {};
        rawTimesheets.forEach(row => {
            const pid = periodByStudentId[row.student_id] || '';
            tsMap[row.student_id] = adaptTimesheetRow(row, pid);
        });

        let html = '';
        filteredStudents.forEach(student => {
            let displayName = `${student.lastName.toUpperCase()}, ${student.firstName}`;
            let displayId = student.id;

            if (privacyMode) {
                if (!mappedNames[student.id]) mappedNames[student.id] = `Student ${Object.keys(mappedNames).length + 1}`;
                displayName = mappedNames[student.id];
                displayId = "HIDDEN";
            }

            const ts = tsMap[student.id] || null;
            const hourlyRate = student.hourlyRate || PAY_SCALES[student.role] || PAY_SCALES[DEFAULT_ROLE];

            let dailyPay = 0;
            let durationMins = 0;

            if (ts) {
                let shiftBonusCount = 0;
                if (ts.statusIn === "On Time" || ts.statusIn === "Overtime") shiftBonusCount++;
                if (ts.statusOut === "On Time" || ts.statusOut === "Overtime") shiftBonusCount++;

                if (ts.clockInTime) {
                    durationMins = ts.clockOutTime
                        ? Math.round((ts.clockOutTime - ts.clockInTime) / 60000)
                        : getExpectedDuration(currentDate, student.period);
                }

                dailyPay = (durationMins / 60 * hourlyRate) + (shiftBonusCount * ON_TIME_BONUS);
            }

            let durationText = durationMins > 0 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : '-';
            if (durationMins > 0 && durationMins < 60) durationText = `${durationMins}m`;
            const durationStatus = ts && ts.clockInTime && !ts.clockOutTime ? `<div class="x-small text-muted fst-italic mt-1">(Assumed)</div>` : '';

            const inTime = ts?.clockInTime
                ? new Date(ts.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '<span class="text-danger small">No Punch</span>';
            const inStatus = ts?.statusIn === "Late"
                ? `<span class="badge bg-danger">LATE</span>`
                : (ts?.statusIn ? `<span class="badge bg-success text-uppercase">${ts.statusIn}</span>` : '');

            const outTime = ts?.clockOutTime
                ? new Date(ts.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '<span class="text-danger small">No Punch</span>';
            const outStatus = ts?.statusOut === "Early Departure"
                ? `<span class="badge bg-danger">EARLY</span>`
                : (ts?.statusOut ? `<span class="badge bg-success text-uppercase">${ts.statusOut}</span>` : '');

            const inQ = escapeHtml(ts?.notebookIn?.question || "No data");
            const inA = escapeHtml(ts?.notebookIn?.answerGiven || "");
            const inScore = ts?.notebookIn?.isCorrect
                ? '<i class="fas fa-check-circle text-success ms-1"></i>'
                : '<i class="fas fa-times-circle text-danger ms-1"></i>';

            const outQ = escapeHtml(ts?.notebookOut?.question || "No data");
            const outA = escapeHtml(ts?.notebookOut?.answerGiven || "");

            html += `
                <tr>
                    <td class="sticky-col px-3">
                        <a href="#" class="text-decoration-none view-student-history" data-student-id="${student.id}" title="Audit Employee History">
                            <div class="fw-bold text-primary" style="cursor: pointer;">
                                <i class="fas fa-search-dollar me-1 opacity-50"></i> ${displayName}
                            </div>
                        </a>
                        <div class="id-cell">${displayId} | ${student.role}</div>
                    </td>
                    <td class="text-center align-middle bg-light border-start border-end">
                        <div class="fw-bold">${inTime}</div>
                        <div class="mt-1">${inStatus}</div>
                    </td>
                    <td class="small align-middle border-end">
                        ${ts?.clockInTime ? `<div class="text-muted fst-italic mb-1" style="font-size:0.75rem;">Q: ${inQ}</div><div class="fw-bold text-dark">A: ${inA} ${inScore}</div>` : '-'}
                    </td>
                    <td class="text-center align-middle bg-light border-end">
                        <div class="fw-bold">${outTime}</div>
                        <div class="mt-1">${outStatus}</div>
                    </td>
                    <td class="small align-middle border-end">
                        ${ts?.clockOutTime ? `<div class="text-muted fst-italic mb-1" style="font-size:0.75rem;">Q: ${outQ}</div><div class="fw-bold text-dark">A: ${outA}</div>` : '-'}
                    </td>
                    <td class="text-center align-middle border-end bg-light">
                        <div class="fw-bold text-dark fs-6">${durationText}</div>
                        ${durationStatus}
                    </td>
                    <td class="text-center align-middle fw-bold text-success fs-5 border-end">
                        $${dailyPay.toFixed(2)}
                    </td>
                </tr>
            `;
        });

        if (filteredStudents.length === 0) html = `<tr><td colspan="7" class="text-center p-5 text-muted fw-bold">No students match this filter.</td></tr>`;
        tbody.innerHTML = html;
    } catch (e) {
        console.error("Error loading timesheets:", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-4">Failed to load data.</td></tr>`;
    }
}

// ============================================================================
// CALENDAR MODAL POPULATION
// ============================================================================
function populateCalendarModal() {
    if (!calendarConfig) return;

    document.getElementById('termStart').value = calendarConfig.termStart;
    document.getElementById('termEnd').value = calendarConfig.termEnd;

    document.getElementById('dayMon').value = calendarConfig.weeklyRoutine["1"] || "OFF";
    document.getElementById('dayTue').value = calendarConfig.weeklyRoutine["2"] || "OFF";
    document.getElementById('dayWed').value = calendarConfig.weeklyRoutine["3"] || "OFF";
    document.getElementById('dayThu').value = calendarConfig.weeklyRoutine["4"] || "OFF";
    document.getElementById('dayFri').value = calendarConfig.weeklyRoutine["5"] || "OFF";

    document.getElementById('regStart1').value = calendarConfig.bellTimes.REGULAR["1_2"].start;
    document.getElementById('regEnd1').value = calendarConfig.bellTimes.REGULAR["1_2"].end;
    document.getElementById('minStart1').value = calendarConfig.bellTimes.MINIMUM["1_2"].start;
    document.getElementById('minEnd1').value = calendarConfig.bellTimes.MINIMUM["1_2"].end;

    document.getElementById('regStart3').value = calendarConfig.bellTimes.REGULAR["3_4"].start;
    document.getElementById('regEnd3').value = calendarConfig.bellTimes.REGULAR["3_4"].end;
    document.getElementById('minStart3').value = calendarConfig.bellTimes.MINIMUM["3_4"].start;
    document.getElementById('minEnd3').value = calendarConfig.bellTimes.MINIMUM["3_4"].end;

    document.getElementById('regStart5').value = calendarConfig.bellTimes.REGULAR["5_6"].start;
    document.getElementById('regEnd5').value = calendarConfig.bellTimes.REGULAR["5_6"].end;
    document.getElementById('minStart5').value = calendarConfig.bellTimes.MINIMUM["5_6"].start;
    document.getElementById('minEnd5').value = calendarConfig.bellTimes.MINIMUM["5_6"].end;

    document.getElementById('regStart7').value = calendarConfig.bellTimes.REGULAR["7_8"].start;
    document.getElementById('regEnd7').value = calendarConfig.bellTimes.REGULAR["7_8"].end;
    document.getElementById('minStart7').value = calendarConfig.bellTimes.MINIMUM["7_8"].start;
    document.getElementById('minEnd7').value = calendarConfig.bellTimes.MINIMUM["7_8"].end;

    document.getElementById('excA').value = calendarConfig.exceptions.A.join(", ");
    document.getElementById('excB').value = calendarConfig.exceptions.B.join(", ");
    document.getElementById('excAMin').value = calendarConfig.exceptions.A_MIN.join(", ");
    document.getElementById('excBMin').value = calendarConfig.exceptions.B_MIN.join(", ");
    document.getElementById('excOff').value = calendarConfig.exceptions.OFF.join(", ");
}

// ============================================================================
// AUDIT MODAL: VIEW INDIVIDUAL STUDENT HISTORY
// ============================================================================
async function viewStudentHistory(studentId) {
    const student = roster.find(s => s.id === studentId);
    if (!student) return;

    const modalNameDisplay = privacyMode
        ? (mappedNames[studentId] || "Hidden Student")
        : `${student.firstName} ${student.lastName}`;

    const modal = new bootstrap.Modal(document.getElementById('studentHistoryModal'));
    document.getElementById('studentHistoryTitle').innerHTML = `<i class="fas fa-history me-2"></i>Payroll History: ${modalNameDisplay}`;

    const body = document.getElementById('studentHistoryBody');
    body.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary mb-3"></div><h5 class="text-muted fw-bold">Retrieving historical records...</h5></div>`;
    modal.show();

    try {
        const hourlyRate = student.hourlyRate || PAY_SCALES[student.role] || PAY_SCALES[DEFAULT_ROLE];
        const studentRole = student.role || DEFAULT_ROLE;

        const res = await fetch(`/api/payroll/timesheets?student_id=${encodeURIComponent(student.id)}`);
        const data = await res.json();
        const rawTimesheets = (data.timesheets || []).sort((a, b) => {
            const da = String(a.date).slice(0, 10);
            const db2 = String(b.date).slice(0, 10);
            return db2.localeCompare(da); // desc
        });

        let totalMins = 0;
        let totalGross = 0;
        let tableHtml = '';

        if (rawTimesheets.length === 0) {
            tableHtml = `<tr><td colspan="5" class="text-center p-4 text-muted fw-bold">No timesheets recorded for this employee.</td></tr>`;
        } else {
            rawTimesheets.forEach(row => {
                const ts = adaptTimesheetRow(row, student.period);
                let durationMins = 0;
                let shiftBonusCount = 0;

                if (ts.statusIn === "On Time" || ts.statusIn === "Overtime") shiftBonusCount++;
                if (ts.statusOut === "On Time" || ts.statusOut === "Overtime") shiftBonusCount++;

                if (ts.clockInTime) {
                    durationMins = ts.clockOutTime
                        ? Math.round((ts.clockOutTime - ts.clockInTime) / 60000)
                        : getExpectedDuration(ts.date, student.period);
                    totalMins += durationMins;
                }

                const dailyPay = (durationMins / 60 * hourlyRate) + (shiftBonusCount * ON_TIME_BONUS);
                totalGross += dailyPay;

                const friendlyDate = new Date(ts.date + "T12:00:00").toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const inTime = ts.clockInTime ? new Date(ts.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                const outTime = ts.clockOutTime ? new Date(ts.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '<span class="text-danger">Missed Punch</span>';

                let durationText = durationMins > 0 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : '-';
                if (durationMins > 0 && durationMins < 60) durationText = `${durationMins}m`;
                const durationNote = ts.clockInTime && !ts.clockOutTime ? `<br><span class="text-muted" style="font-size: 0.7rem;">(Assumed)</span>` : '';

                tableHtml += `
                    <tr class="text-center">
                        <td class="fw-bold text-start">${friendlyDate}</td>
                        <td class="${ts.statusIn === 'Late' ? 'text-danger fw-bold' : ''}">${inTime}</td>
                        <td class="${ts.statusOut === 'Early Departure' ? 'text-danger fw-bold' : ''}">${outTime}</td>
                        <td class="fw-bold text-dark">${durationText}${durationNote}</td>
                        <td class="fw-bold text-success">$${dailyPay.toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        const overallHours = Math.floor(totalMins / 60);
        const overallRemainingMins = totalMins % 60;

        body.innerHTML = `
            <div class="row text-center mb-4 g-3">
                <div class="col-md-4">
                    <div class="p-3 bg-white border border-primary rounded shadow-sm h-100 d-flex flex-column justify-content-center">
                        <h6 class="text-muted fw-bold text-uppercase mb-1" style="letter-spacing: 1px;">Role / Rate</h6>
                        <h4 class="text-primary fw-bold mb-0">${studentRole}<br><span class="fs-6 text-dark">$${hourlyRate.toFixed(2)}/hr</span></h4>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="p-3 bg-white border border-success rounded shadow-sm h-100 d-flex flex-column justify-content-center">
                        <h6 class="text-muted fw-bold text-uppercase mb-1" style="letter-spacing: 1px;">YTD Hours Logged</h6>
                        <h3 class="text-success fw-bold mb-0">${overallHours}h ${overallRemainingMins}m</h3>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="p-3 bg-white border border-success rounded shadow-sm h-100 d-flex flex-column justify-content-center">
                        <h6 class="text-muted fw-bold text-uppercase mb-1" style="letter-spacing: 1px;">YTD Gross Pay</h6>
                        <h3 class="text-success fw-bold mb-0">$${totalGross.toFixed(2)}</h3>
                    </div>
                </div>
            </div>

            <h5 class="fw-bold text-dark border-bottom pb-2 mb-3">Itemized Shift Logs</h5>
            <div class="table-responsive" style="max-height: 400px;">
                <table class="table table-hover table-bordered bg-white shadow-sm align-middle small mb-0">
                    <thead class="bg-secondary text-white text-center sticky-top">
                        <tr>
                            <th>Date</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Time Logged</th>
                            <th>Shift Earnings</th>
                        </tr>
                    </thead>
                    <tbody>${tableHtml}</tbody>
                </table>
            </div>
        `;
    } catch (err) {
        console.error("Error loading student history:", err);
        body.innerHTML = `<div class="alert alert-danger fw-bold text-center"><i class="fas fa-exclamation-triangle me-2"></i>Failed to retrieve HR data from the server.</div>`;
    }
}

// ============================================================================
// DAILY QUESTIONS (MariaDB API)
// ============================================================================
async function loadDailyQuestions() {
    try {
        const res = await fetch(`/api/admin/daily-questions?date=${currentDate}`);
        if (res.ok) {
            const q = await res.json();
            const wdEl = document.getElementById('wdQuestionInput');
            const csEl = document.getElementById('csQuestionInput');
            if (wdEl) wdEl.value = q.wdQuestion || "";
            if (csEl) csEl.value = q.csQuestion || "";
        }
    } catch (e) {
        console.error("Error loading questions", e);
    }
}

async function saveDailyQuestions() {
    const btn = document.getElementById('btnSaveQuestions');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    btn.disabled = true;

    const wdQ = (document.getElementById('wdQuestionInput')?.value || '').trim();
    const csQ = (document.getElementById('csQuestionInput')?.value || '').trim();

    try {
        const res = await fetch('/api/admin/daily-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: currentDate, wdQuestion: wdQ, csQuestion: csQ })
        });
        if (!res.ok) throw new Error('Server error');

        btn.innerHTML = '<i class="fas fa-check me-2"></i>Saved!';
        btn.classList.replace('btn-warning', 'btn-success');

        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('questionModal'));
            if (modal) modal.hide();
            btn.innerHTML = 'Save Questions';
            btn.classList.replace('btn-success', 'btn-warning');
            btn.disabled = false;
        }, 1500);
    } catch (e) {
        console.error("Save error", e);
        alert("Failed to save questions.");
        btn.innerHTML = 'Save Questions';
        btn.disabled = false;
    }
}

// ============================================================================
// ADMIN TOOL: INJECT FAKE DATA FOR TESTING
// ============================================================================
async function injectFakeData() {
    const input = prompt("Enter the student ID or username to inject test data for:", "");
    if (!input) return;

    const key = input.toLowerCase().trim();
    const targetStudent = roster.find(s =>
        s.username === key || s.id === key || `${s.firstName} ${s.lastName}`.toLowerCase() === key
    );

    if (!targetStudent) {
        alert("Student not found in roster. Try using their exact username or student ID.");
        return;
    }

    if (!confirm(`Inject 45 days of fake timesheet data for ${targetStudent.firstName} ${targetStudent.lastName} (${targetStudent.id})?`)) return;

    const btn = document.getElementById('btnInjectFakeData');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Injecting...';

    try {
        const fakeSheetsToInject = [];
        const now = new Date();

        for (let i = 0; i <= 45; i++) {
            const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const dateStr = `${d.getFullYear()}-${_pad(d.getMonth() + 1)}-${_pad(d.getDate())}`;

            if (!calendarConfig || dateStr < calendarConfig.termStart || dateStr > calendarConfig.termEnd) continue;

            const dayType = getDayType(dateStr);
            if (!dayType || dayType === "OFF") continue;

            const block = (targetStudent.period && targetStudent.period.includes('-'))
                ? targetStudent.period.split('-').pop()
                : targetStudent.period;

            const isADay = dayType === "A" || dayType === "A_MIN";
            const isBDay = dayType === "B" || dayType === "B_MIN";
            if (block && isADay && block.startsWith("B")) continue;
            if (block && isBDay && block.startsWith("A")) continue;

            const blockKey = getBlockKey(targetStudent.period);
            const schedType = (dayType === "A_MIN" || dayType === "B_MIN") ? "MINIMUM" : "REGULAR";
            const sched = calendarConfig?.bellTimes?.[schedType]?.[blockKey];

            let sH = 8, sM = 0, eH = 9, eM = 30;
            if (sched) {
                [sH, sM] = sched.start.split(':').map(Number);
                [eH, eM] = sched.end.split(':').map(Number);
            }

            const clockInDate = new Date(d);
            clockInDate.setHours(sH, sM + Math.floor(Math.random() * 4), 0, 0);
            const clockOutDate = new Date(d);
            clockOutDate.setHours(eH, eM - Math.floor(Math.random() * 4), 0, 0);

            // Format as "YYYY-MM-DD HH:MM:SS" for MariaDB DATETIME
            const fmt = (dt) => `${dt.getFullYear()}-${_pad(dt.getMonth() + 1)}-${_pad(dt.getDate())} ${_pad(dt.getHours())}:${_pad(dt.getMinutes())}:00`;

            fakeSheetsToInject.push({
                date: dateStr,
                clock_in: fmt(clockInDate),
                clock_out: fmt(clockOutDate),
                in_answer: "Simulated clock-in answer",
                out_answer: "Simulated reflection response for testing purposes."
            });
        }

        const res = await fetch('/api/admin/inject-timesheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: targetStudent.id, timesheets: fakeSheetsToInject })
        });
        const result = await res.json();

        alert(`Successfully injected ${result.count || fakeSheetsToInject.length} fake shifts for ${targetStudent.firstName} ${targetStudent.lastName}!`);
        applyFiltersAndRender();
    } catch (e) {
        console.error("Injection error", e);
        alert("Failed to inject data. Check console for details.");
    } finally {
        btn.innerHTML = '<i class="fas fa-database me-2"></i>Inject Test Data';
    }
}

// ============================================================================
// ADMIN TOOL: GENERATE W-2 SUMMARY (display only — no DB write required)
// ============================================================================
async function generateW2Forms() {
    const year = prompt("Enter the tax year to calculate W-2 totals for:", new Date().getFullYear());
    if (!year) return;

    const btn = document.getElementById('btnGenerateW2');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';

    try {
        // Fetch ALL timesheets in the target year
        const res = await fetch(`/api/admin/payroll/timesheets-period?from=${year}-01-01&to=${year}-12-31`);
        const data = await res.json();
        const rawTimesheets = data.timesheets || [];

        const periodByStudentId = {};
        const rosterById = {};
        roster.forEach(s => {
            periodByStudentId[s.id] = s.period;
            rosterById[s.id] = s;
        });

        // Group and sum by student
        const summary = {};
        rawTimesheets.forEach(row => {
            const sid = row.student_id;
            const student = rosterById[sid];
            if (!student) return;
            const ts = adaptTimesheetRow(row, student.period);
            if (!summary[sid]) summary[sid] = { student, totalMins: 0, totalGross: 0, shifts: 0 };

            const hourlyRate = student.hourlyRate || PAY_SCALES[student.role] || PAY_SCALES[DEFAULT_ROLE];
            let shiftMins = 0;
            let bonuses = 0;
            if (ts.statusIn === "On Time" || ts.statusIn === "Overtime") bonuses++;
            if (ts.statusOut === "On Time" || ts.statusOut === "Overtime") bonuses++;
            if (ts.clockInTime) {
                shiftMins = ts.clockOutTime
                    ? Math.round((ts.clockOutTime - ts.clockInTime) / 60000)
                    : getExpectedDuration(ts.date, student.period);
            }
            summary[sid].totalMins += shiftMins;
            summary[sid].totalGross += (shiftMins / 60 * hourlyRate) + (bonuses * ON_TIME_BONUS);
            summary[sid].shifts++;
        });

        const activeEmployees = Object.values(summary).filter(e => e.totalGross > 0);
        if (activeEmployees.length === 0) {
            alert(`No timesheet records found for the year ${year}.`);
            return;
        }

        const lines = activeEmployees.map(e => {
            const fedTax = e.totalGross * 0.10;
            const ssTax = e.totalGross * 0.062;
            const medTax = e.totalGross * 0.0145;
            return `${e.student.lastName}, ${e.student.firstName} — Wages: $${e.totalGross.toFixed(2)} | Fed Tax: $${fedTax.toFixed(2)} | SS: $${ssTax.toFixed(2)} | Medicare: $${medTax.toFixed(2)} (${e.shifts} shifts)`;
        }).join('\n');

        alert(`W-2 Summary for ${year} — ${activeEmployees.length} Active Employees:\n\n${lines}\n\n(For official W-2 issuance, download this data to a spreadsheet.)`);
    } catch (e) {
        console.error("W2 generation error", e);
        alert("Failed to generate W-2 summary. Check console for details.");
    } finally {
        btn.innerHTML = '<i class="fas fa-file-signature me-2"></i>Issue W-2 Forms';
    }
}
