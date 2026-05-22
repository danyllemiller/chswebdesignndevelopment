// js/admin/payroll.js
/**
 * Master Payroll & Timeclock Dashboard
 * - FIX: Removed broken JavaScript menu injection (duplicate button bug resolved).
 * - UPGRADE: Mon-Sun Routine Calendar System with Term Dates and explicit Block names.
 * - FIX: Added smart UID fallback lookup to perfectly sync Timeclock Auth UIDs with Student IDs.
 */

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, doc, setDoc, getDoc, writeBatch, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, appId } from "/js/firebase-init.js";

const PAY_SCALES = {
    "Intern": 15.00,
    "Junior Developer": 20.00,
    "Web Developer": 35.00, 
    "Senior Developer": 45.00,
    "Project Manager": 50.00
};
const DEFAULT_ROLE = "Web Developer";
const ON_TIME_BONUS = 5.00; 

// ==============================================================================
// ⏰ DYNAMIC FIREBASE CALENDAR (Mon-Sun Routine + Overrides)
// ==============================================================================
let calendarConfig = null;

const defaultCalendarConfig = {
    termStart: "2025-08-01",
    termEnd: "2026-06-15",
    weeklyRoutine: {
        "1": "A", "2": "B", "3": "A", "4": "B", "5": "A" // 1=Mon, 5=Fri
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
        const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'calendarConfig', 'settings');
        const snap = await getDoc(configRef);
        if (snap.exists()) {
            calendarConfig = migrateCalendarConfig(snap.data());
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

function getExpectedDuration(dateStr, periodStr) {
    if (!periodStr || !calendarConfig) return 90;
    
    // Check if outside term
    if (dateStr < calendarConfig.termStart || dateStr > calendarConfig.termEnd) return 90;

    const block = periodStr.includes('-') ? periodStr.split('-').pop() : periodStr;
    const blockNum = block.replace(/\D/g, ''); 
    
    let blockKey = "1_2";
    if (blockNum === "3" || blockNum === "4") blockKey = "3_4";
    else if (blockNum === "5" || blockNum === "6") blockKey = "5_6";
    else if (blockNum === "7" || blockNum === "8") blockKey = "7_8";
    
    // Determine Day Type
    let dayType = null;
    const dateObj = new Date(dateStr + "T12:00:00");
    const dayOfWeek = dateObj.getDay().toString(); // 0=Sun, 1=Mon...

    if (calendarConfig.exceptions.OFF.includes(dateStr)) return 90; // Holiday
    
    if (calendarConfig.exceptions.A.includes(dateStr)) dayType = "A";
    else if (calendarConfig.exceptions.B.includes(dateStr)) dayType = "B";
    else if (calendarConfig.exceptions.MIN.includes(dateStr)) {
        // If forced minimum, we need to know if it's A or B. We check the routine.
        const routineType = calendarConfig.weeklyRoutine[dayOfWeek];
        dayType = (routineType === "A" || routineType === "A_MIN") ? "A_MIN" : "B_MIN";
    } 
    else {
        // Normal weekly routine
        dayType = calendarConfig.weeklyRoutine[dayOfWeek];
        if (!dayType || dayType === "OFF") return 90;
    }
    
    const isADay = dayType === "A" || dayType === "A_MIN";
    const isBDay = dayType === "B" || dayType === "B_MIN";
    
    if ((isADay && block.startsWith("B")) || (isBDay && block.startsWith("A"))) return 90; 
    
    const schedType = (dayType === "A_MIN" || dayType === "B_MIN") ? "MINIMUM" : "REGULAR";
    
    if (calendarConfig.bellTimes[schedType] && calendarConfig.bellTimes[schedType][blockKey]) {
        const sched = calendarConfig.bellTimes[schedType][blockKey];
        const [sH, sM] = sched.start.split(':').map(Number);
        const [eH, eM] = sched.end.split(':').map(Number);
        return (eH * 60 + eM) - (sH * 60 + sM);
    }
    return 90; 
}

// Global Tracking
const _today = new Date();
const _pad = (n) => n < 10 ? '0'+n : n;
let currentDate = `${_today.getFullYear()}-${_pad(_today.getMonth()+1)}-${_pad(_today.getDate())}`;

let roster = [];
let viewMode = 'daily'; 
const ANCHOR_DATE = new Date("2026-08-02T00:00:00");

// Privacy Tracking
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
    
    const startStr = `${ppStart.getFullYear()}-${_pad(ppStart.getMonth()+1)}-${_pad(ppStart.getDate())}`;
    const endStr = `${ppEnd.getFullYear()}-${_pad(ppEnd.getMonth()+1)}-${_pad(ppEnd.getDate())}`;

    return {
        startStr, endStr,
        friendly: `${ppStart.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${ppEnd.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`
    };
}

document.getElementById('dateFilter').value = currentDate;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("/login.html");
        return;
    }
    
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
            const studentsInPeriod = getFilteredStudents(e.target.value, 'All');
            updateStudentDropdown(studentsInPeriod);
            applyFiltersAndRender();
        });
    }

    const studentFilter = document.getElementById('studentFilter');
    if (studentFilter) studentFilter.addEventListener('change', () => applyFiltersAndRender());

    // Bind Hardcoded Modals and Toggles
    const vbtnDaily = document.getElementById('vbtn-daily');
    if (vbtnDaily) vbtnDaily.addEventListener('change', () => { viewMode = 'daily'; applyFiltersAndRender(); });
    
    const vbtnPeriod = document.getElementById('vbtn-period');
    if (vbtnPeriod) vbtnPeriod.addEventListener('change', () => { viewMode = 'period'; applyFiltersAndRender(); });
    
    const btnGenW2 = document.getElementById('btnGenerateW2');
    if (btnGenW2) btnGenW2.addEventListener('click', generateW2Forms);
    
    const btnInject = document.getElementById('btnInjectFakeData');
    if (btnInject) btnInject.addEventListener('click', injectFakeData);

    document.getElementById('btnSaveQuestions').addEventListener('click', saveDailyQuestions);
    document.getElementById('btnSaveCalendar').addEventListener('click', saveCalendarConfig);

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
});

// ==============================================================================
// UPGRADED FILTERING LOGIC
// ==============================================================================
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
    
    const sorted = [...filteredStudents].sort((a,b) => a.lastName.localeCompare(b.lastName));
    sorted.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.lastName}, ${s.firstName} (${s.period})`;
        studentSelect.appendChild(opt);
    });
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

async function loadRoster() {
    try {
        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'roster'));
        roster = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.period !== "Teacher") {
                roster.push({ ...data, docId: doc.id, id: data.studentId || doc.id });
            }
        });
        roster.sort((a, b) => a.lastName.localeCompare(b.lastName));
        updateStudentDropdown(roster);
        applyFiltersAndRender();
    } catch (e) {
        console.error("Error loading roster:", e);
    }
}

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

    // ==========================================================
    // PAY PERIOD VIEW
    // ==========================================================
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
            const promises = filteredStudents.map(student => {
                // THE FIX: Smart UID Fallback. Check their Auth UID (docId) first, fallback to their School ID number (id)
                const targetUid = student.uid || student.docId || student.id;
                
                return getDocs(collection(db, 'artifacts', appId, 'users', targetUid, 'timesheets'))
                    .then(async (snap) => {
                        let shifts = [];
                        snap.forEach(docSnap => {
                            const d = docSnap.data();
                            if (d.date && d.date >= period.startStr && d.date <= period.endStr) {
                                shifts.push(d);
                            }
                        });
                        
                        // Fallback: If no shifts found under Auth UID, check their School ID folder just in case
                        if (shifts.length === 0 && targetUid !== student.id) {
                            const fallbackSnap = await getDocs(collection(db, 'artifacts', appId, 'users', student.id, 'timesheets'));
                            fallbackSnap.forEach(docSnap => {
                                const d = docSnap.data();
                                if (d.date && d.date >= period.startStr && d.date <= period.endStr) {
                                    shifts.push(d);
                                }
                            });
                        }
                        
                        return { student, shifts };
                    });
            });

            const results = await Promise.all(promises);
            let html = '';
            
            results.forEach(({ student, shifts }) => {
                let displayName = `${student.lastName.toUpperCase()}, ${student.firstName}`;
                let displayId = student.id;

                if (privacyMode) {
                    if (!mappedNames[student.id]) mappedNames[student.id] = `Student ${Object.keys(mappedNames).length + 1}`;
                    displayName = mappedNames[student.id];
                    displayId = "HIDDEN";
                }

                const studentRole = student.role || DEFAULT_ROLE;
                const hourlyRate = PAY_SCALES[studentRole] || PAY_SCALES[DEFAULT_ROLE];
                
                let totalMins = 0;
                let totalGross = 0;
                let totalBonuses = 0;

                shifts.forEach(data => {
                    let shiftMins = 0;
                    let shiftBonusCount = 0;

                    if (data.statusIn === "On Time" || data.statusIn === "Overtime") shiftBonusCount++;
                    if (data.statusOut === "On Time" || data.statusOut === "Overtime") shiftBonusCount++;

                    if (data.clockInTime) {
                        if (data.clockOutTime) {
                            shiftMins = Math.round((data.clockOutTime - data.clockInTime) / 60000);
                        } else {
                            shiftMins = getExpectedDuration(data.date, student.period);
                        }
                    }

                    totalMins += shiftMins;
                    totalBonuses += shiftBonusCount;
                    
                    const hours = shiftMins / 60;
                    const dailyPay = (hours * hourlyRate) + (shiftBonusCount * ON_TIME_BONUS);
                    totalGross += dailyPay;
                });

                const overallHours = Math.floor(totalMins / 60);
                const overallRemainingMins = totalMins % 60;
                let durationText = totalMins > 0 ? `${overallHours}h ${overallRemainingMins}m` : '-';

                html += `
                    <tr>
                        <td class="sticky-col px-3">
                            <a href="#" class="text-decoration-none view-student-history" data-student-id="${student.id}" title="Audit Employee History">
                                <div class="fw-bold text-primary" style="cursor: pointer;">
                                    <i class="fas fa-search-dollar me-1 opacity-50"></i> ${displayName}
                                </div>
                            </a>
                            <div class="id-cell">${displayId} | ${studentRole}</div>
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

            if(results.length === 0) html = `<tr><td colspan="6" class="text-center p-5 text-muted fw-bold">No students match this filter.</td></tr>`;
            tbody.innerHTML = html;
        } catch (e) {
            console.error("Error loading period timesheets:", e);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">Failed to load data.</td></tr>`;
        }
        return;
    }

    // ==========================================================
    // DAILY VIEW
    // ==========================================================
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
        const promises = filteredStudents.map(student => {
            // THE FIX: Smart UID Fallback. Check their Auth UID (docId) first, fallback to their School ID number (id)
            const targetUid = student.uid || student.docId || student.id;
            
            return getDoc(doc(db, 'artifacts', appId, 'users', targetUid, 'timesheets', currentDate))
                .then(snap => {
                    if (snap.exists()) return { student, data: snap.data() };
                    
                    // Fallback: If not found under Auth UID, check their School ID folder
                    if (targetUid !== student.id) {
                        return getDoc(doc(db, 'artifacts', appId, 'users', student.id, 'timesheets', currentDate))
                            .then(fallbackSnap => ({ student, data: fallbackSnap.exists() ? fallbackSnap.data() : null }));
                    }
                    return { student, data: null };
                });
        });

        const results = await Promise.all(promises);
        
        let html = '';
        results.forEach(({ student, data }) => {
            let displayName = `${student.lastName.toUpperCase()}, ${student.firstName}`;
            let displayId = student.id;

            if (privacyMode) {
                if (!mappedNames[student.id]) mappedNames[student.id] = `Student ${Object.keys(mappedNames).length + 1}`;
                displayName = mappedNames[student.id];
                displayId = "HIDDEN";
            }

            let dailyPay = 0;
            let durationMins = 0;

            const studentRole = student.role || DEFAULT_ROLE;
            const hourlyRate = PAY_SCALES[studentRole] || PAY_SCALES[DEFAULT_ROLE];

            if (data) {
                let shiftBonusCount = 0;
                if (data.statusIn === "On Time" || data.statusIn === "Overtime") shiftBonusCount++;
                if (data.statusOut === "On Time" || data.statusOut === "Overtime") shiftBonusCount++;

                if (data.clockInTime) {
                    if (data.clockOutTime) {
                        durationMins = Math.round((data.clockOutTime - data.clockInTime) / 60000);
                    } else {
                        durationMins = getExpectedDuration(currentDate, student.period);
                    }
                }

                const hours = durationMins / 60;
                dailyPay = (hours * hourlyRate) + (shiftBonusCount * ON_TIME_BONUS);
            }

            let durationText = durationMins > 0 ? `${Math.floor(durationMins/60)}h ${durationMins%60}m` : '-';
            if (durationMins > 0 && durationMins < 60) durationText = `${durationMins}m`;
            const durationStatus = data && data.clockInTime && !data.clockOutTime ? `<div class="x-small text-muted fst-italic mt-1">(Assumed)</div>` : '';

            const inTime = data?.clockInTime ? new Date(data.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '<span class="text-danger small">No Punch</span>';
            const inStatus = data?.statusIn === "Late" ? `<span class="badge bg-danger">LATE</span>` : (data?.statusIn ? `<span class="badge bg-success text-uppercase">${data.statusIn}</span>` : '');
            
            const outTime = data?.clockOutTime ? new Date(data.clockOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '<span class="text-danger small">No Punch</span>';
            const outStatus = data?.statusOut === "Early Departure" ? `<span class="badge bg-danger">EARLY</span>` : (data?.statusOut ? `<span class="badge bg-success text-uppercase">${data.statusOut}</span>` : '');

            const inQ = escapeHtml(data?.notebookIn?.question || "No data");
            const inA = escapeHtml(data?.notebookIn?.answerGiven || "");
            const inScore = data?.notebookIn?.isCorrect ? '<i class="fas fa-check-circle text-success ms-1"></i>' : '<i class="fas fa-times-circle text-danger ms-1"></i>';

            const outQ = escapeHtml(data?.notebookOut?.question || "No data");
            const outA = escapeHtml(data?.notebookOut?.answerGiven || "");

            html += `
                <tr>
                    <td class="sticky-col px-3">
                        <a href="#" class="text-decoration-none view-student-history" data-student-id="${student.id}" title="Audit Employee History">
                            <div class="fw-bold text-primary" style="cursor: pointer;">
                                <i class="fas fa-search-dollar me-1 opacity-50"></i> ${displayName}
                            </div>
                        </a>
                        <div class="id-cell">${displayId} | ${studentRole}</div>
                    </td>
                    <td class="text-center align-middle bg-light border-start border-end">
                        <div class="fw-bold">${inTime}</div>
                        <div class="mt-1">${inStatus}</div>
                    </td>
                    <td class="small align-middle border-end">
                        ${data?.clockInTime ? `<div class="text-muted fst-italic mb-1" style="font-size:0.75rem;">Q: ${inQ}</div><div class="fw-bold text-dark">A: ${inA} ${inScore}</div>` : '-'}
                    </td>
                    <td class="text-center align-middle bg-light border-end">
                        <div class="fw-bold">${outTime}</div>
                        <div class="mt-1">${outStatus}</div>
                    </td>
                    <td class="small align-middle border-end">
                        ${data?.clockOutTime ? `<div class="text-muted fst-italic mb-1" style="font-size:0.75rem;">Q: ${outQ}</div><div class="fw-bold text-dark">A: ${outA}</div>` : '-'}
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

        if(results.length === 0) html = `<tr><td colspan="7" class="text-center p-5 text-muted fw-bold">No students match this filter.</td></tr>`;
        tbody.innerHTML = html;

    } catch (e) {
        console.error("Error loading timesheets:", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-4">Failed to load data.</td></tr>`;
    }
}

// ==============================================================================
// CALENDAR CONFIG SAVE/LOAD MODAL POPULATION
// ==============================================================================
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
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'calendarConfig', 'settings'), newConfig);
        calendarConfig = newConfig; 
        
        btn.innerHTML = '<i class="fas fa-check me-2"></i>Saved!';
        btn.classList.replace('btn-primary', 'btn-success');
        
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
            btn.innerHTML = 'Save Global Configuration';
            btn.classList.replace('btn-success', 'btn-primary');
            btn.disabled = false;
            loadTimesheets(); 
        }, 1500);
    } catch (e) {
        console.error("Error saving calendar config:", e);
        alert("Failed to save configuration.");
        btn.innerHTML = 'Save Global Configuration';
        btn.disabled = false;
    }
}

// ==============================================================================
// AUDIT MODAL: VIEW INDIVIDUAL STUDENT HISTORY
// ==============================================================================
async function viewStudentHistory(studentId) {
    const student = roster.find(s => s.id === studentId);
    if (!student) return;

    const modalNameDisplay = privacyMode ? (mappedNames[studentId] || "Hidden Student") : `${student.firstName} ${student.lastName}`;

    const modal = new bootstrap.Modal(document.getElementById('studentHistoryModal'));
    document.getElementById('studentHistoryTitle').innerHTML = `<i class="fas fa-history me-2"></i>Payroll History: ${modalNameDisplay}`;
    
    const body = document.getElementById('studentHistoryBody');
    body.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary mb-3"></div><h5 class="text-muted fw-bold">Retrieving historical records...</h5></div>`;
    modal.show();

    try {
        const studentRole = student.role || DEFAULT_ROLE;
        const hourlyRate = PAY_SCALES[studentRole] || PAY_SCALES[DEFAULT_ROLE];
        
        // THE FIX: Smart UID Fallback for History Modal
        const targetUid = student.uid || student.docId || student.id;
        
        let snap = await getDocs(query(collection(db, 'artifacts', appId, 'users', targetUid, 'timesheets'), orderBy('date', 'desc')));
        
        // Fallback Check
        if (snap.empty && targetUid !== student.id) {
            snap = await getDocs(query(collection(db, 'artifacts', appId, 'users', student.id, 'timesheets'), orderBy('date', 'desc')));
        }

        let totalMins = 0;
        let totalGross = 0;
        let tableHtml = '';

        if (snap.empty) {
            tableHtml = `<tr><td colspan="5" class="text-center p-4 text-muted fw-bold">No timesheets recorded for this employee.</td></tr>`;
        } else {
            snap.forEach(docSnap => {
                const data = docSnap.data();
                
                let dailyPay = 0;
                let durationMins = 0;
                let shiftBonusCount = 0;

                if (data.statusIn === "On Time" || data.statusIn === "Overtime") shiftBonusCount++;
                if (data.statusOut === "On Time" || data.statusOut === "Overtime") shiftBonusCount++;

                if (data.clockInTime) {
                    if (data.clockOutTime) {
                        durationMins = Math.round((data.clockOutTime - data.clockInTime) / 60000);
                    } else {
                        durationMins = getExpectedDuration(data.date, student.period);
                    }
                    totalMins += durationMins;
                }

                const hours = durationMins / 60;
                dailyPay = (hours * hourlyRate) + (shiftBonusCount * ON_TIME_BONUS);
                totalGross += dailyPay;

                const friendlyDate = new Date(data.date + "T12:00:00").toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const inTime = data.clockInTime ? new Date(data.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--';
                const outTime = data.clockOutTime ? new Date(data.clockOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '<span class="text-danger">Missed Punch</span>';
                
                let durationText = durationMins > 0 ? `${Math.floor(durationMins/60)}h ${durationMins%60}m` : '-';
                if (durationMins > 0 && durationMins < 60) durationText = `${durationMins}m`;
                const durationStatus = data.clockInTime && !data.clockOutTime ? `<br><span class="text-muted" style="font-size: 0.7rem;">(Assumed)</span>` : '';

                tableHtml += `
                    <tr class="text-center">
                        <td class="fw-bold text-start">${friendlyDate}</td>
                        <td class="${data.statusIn === 'Late' ? 'text-danger fw-bold' : ''}">${inTime}</td>
                        <td class="${data.statusOut === 'Early Departure' ? 'text-danger fw-bold' : ''}">${outTime}</td>
                        <td class="fw-bold text-dark">${durationText}${durationStatus}</td>
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
                    <tbody>
                        ${tableHtml}
                    </tbody>
                </table>
            </div>
        `;

    } catch (err) {
        console.error("Error loading student history:", err);
        body.innerHTML = `<div class="alert alert-danger fw-bold text-center"><i class="fas fa-exclamation-triangle me-2"></i>Failed to retrieve HR data from the server.</div>`;
    }
}

async function loadDailyQuestions() {
    try {
        const qRef = doc(db, 'artifacts', appId, 'public', 'data', 'dailyQuestions', currentDate);
        const snap = await getDoc(qRef);
        if (snap.exists()) {
            document.getElementById('wdQuestionInput').value = snap.data().wdQuestion || "";
            document.getElementById('csQuestionInput').value = snap.data().csQuestion || "";
        } else {
            document.getElementById('wdQuestionInput').value = "";
            document.getElementById('csQuestionInput').value = "";
        }
    } catch (e) {
        console.error("Error loading questions", e);
    }
}

async function saveDailyQuestions() {
    const btn = document.getElementById('btnSaveQuestions');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    btn.disabled = true;

    const wdQ = document.getElementById('wdQuestionInput').value.trim();
    const csQ = document.getElementById('csQuestionInput').value.trim();

    try {
        const qRef = doc(db, 'artifacts', appId, 'public', 'data', 'dailyQuestions', currentDate);
        await setDoc(qRef, { wdQuestion: wdQ, csQuestion: csQ }, { merge: true });
        
        btn.innerHTML = '<i class="fas fa-check me-2"></i>Saved!';
        btn.classList.replace('btn-warning', 'btn-success');
        
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('questionModal')).hide();
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

// ==============================================================================
// ADMIN TOOL: INJECT FAKE DATA FOR TESTING
// ==============================================================================
async function injectFakeData() {
    const targetEmail = prompt("Enter the username/email prefix of the student to inject data for (e.g., 'teststudent'):", "teststudent");
    if (!targetEmail) return;

    const targetStudent = roster.find(s => s.username === targetEmail.toLowerCase());
    if (!targetStudent) {
        alert("Student not found in roster.");
        return;
    }

    // THE FIX: Try to pre-fill the prompt with the exact Auth UID to make it easier for the teacher
    let targetUid = targetStudent.uid || targetStudent.docId || targetStudent.id;
    
    const overrideUid = prompt(
        `Found ${targetStudent.firstName}! \n\nCRITICAL: If this is a manual test account, the system needs their actual Firebase Authentication UID to make the data visible on their Student Portal.\n\nIf you have their Auth UID from the Firebase Console, paste it here. Otherwise, leave it as is and click OK:`, 
        targetUid
    );
    
    if (overrideUid !== null) {
        targetUid = overrideUid.trim();
    } else {
        return; 
    }

    const btn = document.getElementById('btnInjectFakeData');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Injecting...';

    try {
        const batch = writeBatch(db);
        let count = 0;
        const now = new Date();

        for (let i = 0; i <= 45; i++) {
            const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const dateStr = `${d.getFullYear()}-${_pad(d.getMonth()+1)}-${_pad(d.getDate())}`;
            
            if (dateStr < calendarConfig.termStart || dateStr > calendarConfig.termEnd) continue;
            
            const dayOfWeek = d.getDay().toString();
            if (calendarConfig.exceptions.OFF.includes(dateStr)) continue;
            
            let dayType = null;
            if (calendarConfig.exceptions.A.includes(dateStr)) dayType = "A";
            else if (calendarConfig.exceptions.B.includes(dateStr)) dayType = "B";
            else if (calendarConfig.exceptions.A_MIN.includes(dateStr)) dayType = "A_MIN";
            else if (calendarConfig.exceptions.B_MIN.includes(dateStr)) dayType = "B_MIN";
            else {
                dayType = calendarConfig.weeklyRoutine[dayOfWeek];
                if (!dayType || dayType === "OFF") continue;
            }
            
            const block = (targetStudent.period && targetStudent.period.includes('-')) ? targetStudent.period.split('-').pop() : targetStudent.period;
            const blockNum = block.replace(/\D/g, ''); 
            
            let blockKey = "1_2"; 
            if (blockNum === "3" || blockNum === "4") blockKey = "3_4";
            else if (blockNum === "5" || blockNum === "6") blockKey = "5_6";
            else if (blockNum === "7" || blockNum === "8") blockKey = "7_8";

            const isADay = dayType === "A" || dayType === "A_MIN";
            const isBDay = dayType === "B" || dayType === "B_MIN";
            
            if (isADay && block.startsWith("B")) continue;
            if (isBDay && block.startsWith("A")) continue;
            
            let sH = 8, sM = 0, eH = 9, eM = 30;
            const schedType = (dayType === "A_MIN" || dayType === "B_MIN") ? "MINIMUM" : "REGULAR";
            
            if (calendarConfig.bellTimes[schedType] && calendarConfig.bellTimes[schedType][blockKey]) {
                const sched = calendarConfig.bellTimes[schedType][blockKey];
                [sH, sM] = sched.start.split(':').map(Number);
                [eH, eM] = sched.end.split(':').map(Number);
            }

            const clockIn = new Date(d);
            clockIn.setHours(sH, sM + Math.floor(Math.random() * 4), 0); 
            
            const clockOut = new Date(d);
            clockOut.setHours(eH, eM - Math.floor(Math.random() * 4), 0); 

            const tcRef = doc(db, 'artifacts', appId, 'users', targetUid, 'timesheets', dateStr);
            
            batch.set(tcRef, {
                date: dateStr,
                period: targetStudent.period,
                firstName: targetStudent.firstName,
                lastName: targetStudent.lastName,
                clockInTime: clockIn.getTime(),
                statusIn: "On Time",
                clockOutTime: clockOut.getTime(),
                statusOut: "On Time",
                notebookIn: { question: "Simulated Clock In Question?", answerGiven: "Simulated Answer", isCorrect: true, score: 3 },
                notebookOut: { question: "Simulated Exit Ticket?", answerGiven: "This is a simulated reflection response for testing purposes.", isCorrect: true, score: 3 }
            });
            count++;
        }

        await batch.commit();
        alert(`Successfully injected ${count} fake shifts for ${targetStudent.firstName}! \n\nNote: Check their Student Portal to verify the sync!`);
        applyFiltersAndRender();
    } catch (e) {
        console.error("Injection error", e);
        alert("Failed to inject data.");
    } finally {
        btn.innerHTML = '<i class="fas fa-database me-2"></i>Inject Test Data';
    }
}

// ==============================================================================
// ADMIN TOOL: ISSUE END OF YEAR W-2 FORMS
// ==============================================================================
async function generateW2Forms() {
    const year = prompt("Enter the tax year to generate W-2s for:", new Date().getFullYear());
    if (!year) return;

    if (!confirm(`Are you sure you want to lock in and generate W-2 forms for the year ${year} for ALL students?`)) return;

    const btn = document.getElementById('btnGenerateW2');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';

    try {
        let processed = 0;
        
        for (const student of roster) {
            // THE FIX: Smart UID Fallback for W-2 generation
            const targetUid = student.uid || student.docId || student.id;
            
            let snap = await getDocs(collection(db, 'artifacts', appId, 'users', targetUid, 'timesheets')); 
            
            // Fallback Check
            if (snap.empty && targetUid !== student.id) {
                snap = await getDocs(collection(db, 'artifacts', appId, 'users', student.id, 'timesheets'));
            }
            
            let totalGross = 0;
            const studentRole = student.role || DEFAULT_ROLE;
            const hourlyRate = PAY_SCALES[studentRole] || PAY_SCALES[DEFAULT_ROLE];

            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.date && data.date.startsWith(year)) {
                    let dailyPay = 0;
                    let durationMins = 0;
                    let shiftBonusCount = 0;

                    if (data.statusIn === "On Time" || data.statusIn === "Overtime") shiftBonusCount++;
                    if (data.statusOut === "On Time" || data.statusOut === "Overtime") shiftBonusCount++;

                    if (data.clockInTime) {
                        if (data.clockOutTime) {
                            durationMins = Math.round((data.clockOutTime - data.clockInTime) / 60000);
                        } else {
                            durationMins = getExpectedDuration(data.date, student.period);
                        }
                    }

                    const hours = durationMins / 60;
                    dailyPay = (hours * hourlyRate) + (shiftBonusCount * ON_TIME_BONUS);
                    totalGross += dailyPay;
                }
            });

            if (totalGross > 0) {
                const fedTax = totalGross * 0.10;
                const ssTax = totalGross * 0.062;
                const medTax = totalGross * 0.0145;

                const w2Ref = doc(db, 'artifacts', appId, 'users', targetUid, 'taxes', `W2_${year}`);
                await setDoc(w2Ref, {
                    year: year,
                    employer: "CHS Web Design Studio",
                    firstName: student.firstName,
                    lastName: student.lastName,
                    wages: totalGross,
                    fedTaxWithheld: fedTax,
                    ssTaxWithheld: ssTax,
                    medTaxWithheld: medTax,
                    generatedOn: new Date().toISOString()
                });
                processed++;
            }
        }

        alert(`Success! Generated W-2 forms for ${processed} active employees for the year ${year}.`);
    } catch (e) {
        console.error("W2 generation error", e);
        alert("Failed to generate W-2s. Check console for details.");
    } finally {
        btn.innerHTML = '<i class="fas fa-file-signature me-2"></i>Issue W-2 Forms';
    }
}