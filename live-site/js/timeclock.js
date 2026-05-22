// js/timeclock.js
/**
 * CHS Web Design & Computer Science - Professional Timeclock
 * - Fetches daily multiple choice questions from /js/data/ for Clock In
 * - Fetches daily open-ended questions (or 3-2-1 fallback) for Clock Out
 * - Grades automatically (1pt attempt, 1pt on-time, 1pt correct/effort)
 * - Pushes grades directly to Gradebook!
 * - FIX: Corrected Thursday (Day 4) Bell Schedule so A3 starts at 9:10 AM.
 * - FIX: Enhanced Answer Resolution & 3-Point Grading Logic breakdown.
 * - UPGRADE: Deterministic Randomization - Guarantees the same question & option order for all students per day, with zero repeats in a school year!
 * - FIX: Added data sanitization to prevent Firestore "undefined" write errors.
 */

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, doc, setDoc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, appId } from "/js/firebase-init.js";

// ==============================================================================
// 📦 STATIC DATA IMPORTS
// Forces the browser to load the question pools natively, completely 
// bypassing the strict MIME-type server crashes caused by dynamic imports.
// ==============================================================================
import { wdClockIn } from "/js/data/wd-clock-in.js";
import { csClockIn } from "/js/data/cs-clock-in.js";
import { csClockOut } from "/js/data/cs-clock-out.js";

// ==============================================================================
// ⏰ DYNAMIC FIREBASE CALENDAR CONFIGURATION
// Loads from Teacher Dashboard settings instead of hardcoded logic.
// ==============================================================================
let calendarConfig = null;

const defaultCalendarConfig = {
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
    },
    dates: {
        A: ["2026-04-30"], // Ensuring today works as an A Day fallback
        B: [],
        A_MIN: [],
        B_MIN: ["2026-05-13", "2026-05-27"]
    }
};

function getCalendarDayType(dateStr) {
    if (!dateStr || !calendarConfig) return null;

    // New calendar config shape: daily date arrays
    if (calendarConfig.dates && typeof calendarConfig.dates === 'object') {
        if (Array.isArray(calendarConfig.dates.A) && calendarConfig.dates.A.includes(dateStr)) return 'A';
        if (Array.isArray(calendarConfig.dates.B) && calendarConfig.dates.B.includes(dateStr)) return 'B';
        if (Array.isArray(calendarConfig.dates.A_MIN) && calendarConfig.dates.A_MIN.includes(dateStr)) return 'A_MIN';
        if (Array.isArray(calendarConfig.dates.B_MIN) && calendarConfig.dates.B_MIN.includes(dateStr)) return 'B_MIN';
        return null;
    }

    // Legacy calendar config shape: weekly routine + exceptions
    const dateObj = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = dateObj.getDay().toString();

    if (calendarConfig.exceptions && Array.isArray(calendarConfig.exceptions.OFF) && calendarConfig.exceptions.OFF.includes(dateStr)) return 'OFF';
    if (calendarConfig.exceptions && Array.isArray(calendarConfig.exceptions.A) && calendarConfig.exceptions.A.includes(dateStr)) return 'A';
    if (calendarConfig.exceptions && Array.isArray(calendarConfig.exceptions.B) && calendarConfig.exceptions.B.includes(dateStr)) return 'B';
    if (calendarConfig.exceptions && Array.isArray(calendarConfig.exceptions.A_MIN) && calendarConfig.exceptions.A_MIN.includes(dateStr)) return 'A_MIN';
    if (calendarConfig.exceptions && Array.isArray(calendarConfig.exceptions.B_MIN) && calendarConfig.exceptions.B_MIN.includes(dateStr)) return 'B_MIN';

    if (calendarConfig.termStart && calendarConfig.termEnd) {
        const termStart = new Date(calendarConfig.termStart + 'T00:00:00');
        const termEnd = new Date(calendarConfig.termEnd + 'T23:59:59');
        if (dateObj < termStart || dateObj > termEnd) return null;
    }

    if (dayOfWeek === '0' || dayOfWeek === '6') return null;

    const dayType = calendarConfig.weeklyRoutine && calendarConfig.weeklyRoutine[dayOfWeek];
    return dayType || null;
}

function getTodaySchedule(periodStr) {
    if (!periodStr || !calendarConfig) return null;
    const block = periodStr.includes('-') ? periodStr.split('-').pop() : periodStr;
    const blockNum = block.replace(/\D/g, ''); 
    
    let blockKey = "";
    if (blockNum === "1" || blockNum === "2") blockKey = "1_2";
    else if (blockNum === "3" || blockNum === "4") blockKey = "3_4";
    else if (blockNum === "5" || blockNum === "6") blockKey = "5_6";
    else if (blockNum === "7" || blockNum === "8") blockKey = "7_8";

    const todayStr = getLocalTodayStr();
    const dayType = getCalendarDayType(todayStr);
    if (!dayType || dayType === 'OFF') return null; // Unmapped day (Weekend, Holiday, Teacher Work Day, or out of term)

    const isADay = dayType === "A" || dayType === "A_MIN";
    const isBDay = dayType === "B" || dayType === "B_MIN";
    
    if ((isADay && block.startsWith("B")) || (isBDay && block.startsWith("A"))) {
        return null; 
    }
    
    const schedType = (dayType === "A_MIN" || dayType === "B_MIN") ? "MINIMUM" : "REGULAR";
    
    if (calendarConfig.bellTimes[schedType] && calendarConfig.bellTimes[schedType][blockKey]) {
        const sched = calendarConfig.bellTimes[schedType][blockKey];
        const now = new Date();
        const start = new Date(now);
        const [sH, sM] = sched.start.split(':').map(Number);
        start.setHours(sH, sM, 0, 0);

        const end = new Date(now);
        const [eH, eM] = sched.end.split(':').map(Number);
        end.setHours(eH, eM, 0, 0);

        return { start, end };
    }
    return null;
}

// --- REPAIRED: UI Injection and Auto-Monitor ---
function startAutoClockInMonitor() {
    if (window.autoClockInInterval) clearInterval(window.autoClockInInterval);
    
    window.autoClockInInterval = setInterval(async () => {
        if (window.timeclock && window.timeclock.currentMode !== "in") return; // Only monitor if need to clock in

        if(!studentData || !studentData.period) return;
        
        // Only auto-pop if we're in the correct time window
        if (!isInAutoPopWindow("in")) {
            window.timeclock.hasAutoClockInFired = false;
            return;
        }

        // We're in the window - check if we've already fired this session
        if (!window.timeclock.hasAutoClockInFired) {
            window.timeclock.hasAutoClockInFired = true;
            const modalEl = document.getElementById('timeclock-modal');
            if (modalEl) {
                bootstrap.Modal.getOrCreateInstance(modalEl).show();
            }
        }
    }, 30000); // Check every 30 seconds
}

function startAutoClockOutMonitor() {
    if (window.autoClockOutInterval) clearInterval(window.autoClockOutInterval);
    
    window.autoClockOutInterval = setInterval(() => {
        if (window.timeclock && window.timeclock.currentMode !== "out") return; // Only monitor once the student has clocked in

        if(!studentData || !studentData.period) return;

        // Only auto-pop if we're in the correct time window
        if (!isInAutoPopWindow("out")) {
            window.timeclock.hasAutoClockOutFired = false;
            return;
        }

        // We're in the window - check if we've already fired this session
        if (!window.timeclock.hasAutoClockOutFired) {
            window.timeclock.hasAutoClockOutFired = true;
            const modalEl = document.getElementById('timeclock-modal');
            if (modalEl) {
                bootstrap.Modal.getOrCreateInstance(modalEl).show();
            }
        }
    }, 30000); // Check every 30 seconds
}

function injectTimeclockUI() {
    if (document.getElementById('tc-widget')) return;

    const uiHtml = `
    <div id="tc-widget" class="position-fixed bottom-0 end-0 m-4 z-3" style="display: none; z-index: 1050 !important;">
        <button class="btn btn-dark shadow-lg rounded-pill px-4 py-3 d-flex align-items-center" id="tc-widget-btn" style="border: 2px solid #ffffff;">
            <i class="fas fa-user-clock fs-4 me-3 text-white"></i>
            <div class="text-start">
                <div id="tc-time-display" class="fw-bold fs-5 lh-1 text-white">--:--</div>
                <div id="tc-widget-text" class="x-small text-uppercase fw-bold text-white-50 mt-1" style="letter-spacing: 1px;">Timeclock</div>
            </div>
        </button>
    </div>

    <div class="modal fade" id="timeclock-modal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0" style="border-radius: 15px;">
                <div class="modal-header bg-primary text-white border-0 py-3" style="border-radius: 15px 15px 0 0;">
                    <h5 class="modal-title fw-bold text-white"><i class="fas fa-clock me-2"></i> Employee Timecard</h5>
                    <button type="button" class="btn-close btn-close-white" aria-label="Close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body bg-light p-4">
                    <div id="tc-status-badge" class="badge bg-secondary mb-3 w-100 py-2 fs-6 shadow-sm">STATUS: IDLE</div>
                    
                    <form id="tc-form">
                        <h6 id="tc-question-label" class="fw-bold text-dark mb-3 lh-base">Loading...</h6>
                        <div id="tc-options-container" class="mb-4"></div>
                        
                        <button type="submit" id="tc-submit-btn" class="btn btn-primary w-100 fw-bold py-3 shadow-sm fs-5">
                            Submit & Clock In
                        </button>
                    </form>
                    
                    <div id="tc-success-msg" class="alert alert-success mt-3 d-none text-center fw-bold shadow-sm py-4">
                        <i class="fas fa-check-circle fs-1 mb-2 d-block text-success"></i>
                        <div id="tc-score-result" class="fs-5">Successfully Logged!</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', uiHtml);

    setInterval(() => {
        const timeDisplay = document.getElementById('tc-time-display');
        if (timeDisplay) timeDisplay.innerText = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }, 1000);

    document.getElementById('tc-form').addEventListener('submit', handleTimeclockSubmit);

    // Widget button click handler: Update form AND show modal (manual clock in/out)
    const widgetBtn = document.getElementById('tc-widget-btn');
    if (widgetBtn) {
        widgetBtn.addEventListener('click', async () => {
            await checkStatus(false); // Update form based on current status
            bootstrap.Modal.getOrCreateInstance(document.getElementById('timeclock-modal')).show(); // Show modal
        });
    }
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getLocalTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Helper to dynamically determine Shift Type exactly when an action occurs
// Returns whether current time is within a SCHEDULED class period (for question purposes)
function getShiftInfo() {
    if (!studentData || !studentData.period) return { isRegular: false };
    
    const sched = getTodaySchedule(studentData.period);
    if (!sched) return { isRegular: false }; // Weekend or Off-Day

    const now = new Date();
    
    // A shift is REGULAR if we're WITHIN scheduled class hours (including before it starts)
    // This determines if questions should be asked
    if (now >= sched.start && now <= sched.end) {
        return { isRegular: true, sched: sched };
    }

    // After class ends -> OVERTIME (no questions asked)
    return { isRegular: false };
}

// Helper to check if we're in an auto-pop window (separate from shift type)
function isInAutoPopWindow(mode) {
    if (!studentData || !studentData.period) return false;
    
    const sched = getTodaySchedule(studentData.period);
    if (!sched) return false;

    const now = new Date();
    const fiveMinsBeforeStart = new Date(sched.start.getTime() - (5 * 60000));
    const fiveMinsAfterStart = new Date(sched.start.getTime() + (5 * 60000));
    const fiveMinsBeforeEnd = new Date(sched.end.getTime() - (5 * 60000));

    if (mode === "in") {
        // Clock in auto-pop: 5 mins BEFORE to 5 mins AFTER shift start
        return now >= fiveMinsBeforeStart && now <= fiveMinsAfterStart;
    } else if (mode === "out") {
        // Clock out auto-pop: 5 mins BEFORE shift end to END of shift
        return now >= fiveMinsBeforeEnd && now <= sched.end;
    }

    return false;
}

// ==============================================================================
// 🧠 DETERMINISTIC RANDOMIZATION ENGINE
// Ensures all students get the same "random" question and same option order
// on any given day, and prevents questions from repeating within a school year.
// ==============================================================================

function seededRandom(seed) {
    let t = seed + 0x6D2B79F5;
    return function() {
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function getElapsedWeekdays() {
    const now = new Date();
    let startYear = now.getFullYear();
    // School year rolls over in August (Month index 7)
    if (now.getMonth() < 7) startYear--; 
    
    let current = new Date(startYear, 7, 1);
    let days = 0;
    
    // Strip time for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    while (current <= today) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            days++;
        }
        current.setDate(current.getDate() + 1);
    }
    return { days, startYear };
}

function getDailyQuestionIndex(poolLength, classPrefix) {
    if (poolLength === 0) return 0;
    
    const { days, startYear } = getElapsedWeekdays();
    
    // Create a unique seed for the school year and class type
    let seedHash = startYear;
    for (let i = 0; i < classPrefix.length; i++) {
        seedHash += classPrefix.charCodeAt(i) * Math.pow(10, i + 1);
    }
    
    const random = seededRandom(seedHash);
    
    // Create an array of all possible indices
    let indices = Array.from({length: poolLength}, (_, i) => i);
    
    // Fisher-Yates shuffle using our seeded random (Shuffles array perfectly once per year)
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    // Pick the index based on elapsed weekdays (Moves forward by 1 every day, never repeating)
    return indices[(Math.max(0, days - 1)) % poolLength];
}


// ==============================================================================
// 2. CORE LOGIC & IMPORTS
// ==============================================================================
let currentUser = null;
let studentData = null;
let currentQuestion = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const email = user.email ? user.email.split('@')[0].toLowerCase() : "";
        
        try {
            // Pre-load global calendar settings first
            const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'calendarConfig', 'settings');
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                calendarConfig = configSnap.data();
            } else {
                calendarConfig = { ...defaultCalendarConfig };
            }

            const rosterRef = collection(db, 'artifacts', appId, 'public', 'data', 'roster');
            const q = query(rosterRef, where("username", "==", email));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const rosterData = snap.docs[0].data();
                if (rosterData && typeof rosterData === 'object') {
                    studentData = rosterData;
                    studentData.id = studentData.studentId || snap.docs[0].id || user.uid; 
                } else {
                    console.warn("Roster data is malformed or undefined.");
                    studentData = { id: user.uid, period: "WD1-A1" };
                }
                
                if (studentData.period !== "Teacher") {
                    // ALWAYS inject the UI and start BOTH auto-monitors!
                    injectTimeclockUI();
                    startAutoClockInMonitor();
                    startAutoClockOutMonitor();
                    document.getElementById('tc-widget').style.display = 'block';
                    checkStatus(true); 
                }
            }
        } catch (e) {
            console.error("Timeclock Init Error:", e);
        }
    }
});

async function checkStatus(isAutoCheck = false) {
    if (!studentData || !studentData.period) return;

    const now = new Date();
    const todayStr = getLocalTodayStr();
    const shiftInfo = getShiftInfo();
    const isRegular = shiftInfo.isRegular;
    
    const tcRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'timesheets', todayStr);
    const tcSnap = await getDoc(tcRef);
    const tcData = tcSnap.exists() ? tcSnap.data() : null;

    let mode = "idle"; 
    let isLate = false;

    if (!tcData || !tcData.clockInTime) {
        mode = "in";
        // Clock In Late logic only applies if they are within a normal scheduled block
        if (isRegular && shiftInfo.sched) {
            const diffMinutes = (now - shiftInfo.sched.start) / 1000 / 60;
            if (diffMinutes > 5) isLate = true;
        }
    } else if (!tcData.clockOutTime) {
        mode = "out";
        // Early Departure logic only applies if they are within a normal scheduled block
        if (isRegular && shiftInfo.sched) {
            const diffEndMins = (shiftInfo.sched.end - now) / 1000 / 60;
            if (diffEndMins > 15) isLate = true; 
        }
    } else {
        mode = "done";
    }

    const widgetText = document.getElementById('tc-widget-text');
    const badge = document.getElementById('tc-status-badge');
    const label = document.getElementById('tc-question-label');
    const btn = document.getElementById('tc-submit-btn');
    const optsContainer = document.getElementById('tc-options-container');

    document.getElementById('tc-form').style.display = mode === "done" ? 'none' : 'block';
    document.getElementById('tc-success-msg').classList.add('d-none');

    window.timeclock.currentMode = mode;
    window.timeclock.isLate = isLate;
    window.timeclock.isRegular = isRegular;

    // --- Clean up widget styling classes before re-applying ---
    const widgetBtn = widgetText.parentElement;
    widgetBtn.classList.remove('btn-dark', 'btn-danger', 'btn-warning', 'btn-success', 'btn-secondary', 'text-dark', 'text-white');

    if (mode === "in" || mode === "out") {
        const isCS = studentData.period.startsWith('CS');
        
        try {
            if (mode === "in") {
                // ========================================================
                // CLOCK IN LOGIC
                // ========================================================
                if (!isRegular) {
                    // OVERTIME: NO QUESTION ASKED
                    currentQuestion = { question: "Off-Hours Shift (Overtime)", type: "overtime", resolvedAnswerText: "Overtime Auto-Pass" };
                    label.innerText = currentQuestion.question;
                    optsContainer.innerHTML = `
                        <div class="alert alert-info text-dark shadow-sm border-info mb-3 small fw-bold">
                            <i class="fas fa-info-circle me-2 fs-5"></i> You are clocking in outside of your regularly scheduled class block. No knowledge check is required for off-hours work!
                        </div>
                    `;
                } else {
                    // REGULAR: MULTIPLE CHOICE
                    let questionsPool = isCS ? csClockIn : wdClockIn;
                    
                    if (!questionsPool || !Array.isArray(questionsPool) || questionsPool.length === 0) {
                        throw new Error("Question pool is empty or invalid. Please check your data files.");
                    }

                    // UPGRADED: Pull a DETERMINISTIC random question so the whole class gets the same one!
                    const randomIndex = getDailyQuestionIndex(questionsPool.length, isCS ? 'CS_IN' : 'WD_IN');
                    
                    // Clone to prevent mutating global arrays
                    currentQuestion = { ...questionsPool[randomIndex] };
                    
                    // Safely resolve the string value of the answer even if the data file uses integer indexes
                    if (typeof currentQuestion.answer === 'number' && currentQuestion.options) {
                        currentQuestion.resolvedAnswerText = currentQuestion.options[currentQuestion.answer];
                    } else {
                        currentQuestion.resolvedAnswerText = String(currentQuestion.answer || "");
                    }
                    
                    // UPGRADED: Deterministically shuffle the options so A, B, C, D are the same for the whole class today!
                    const dateNum = parseInt(todayStr.replace(/-/g, ''));
                    const optRandom = seededRandom(dateNum + (isCS ? 1 : 0));
                    
                    let mixedOptions = [...currentQuestion.options];
                    for (let i = mixedOptions.length - 1; i > 0; i--) {
                        const j = Math.floor(optRandom() * (i + 1));
                        [mixedOptions[i], mixedOptions[j]] = [mixedOptions[j], mixedOptions[i]];
                    }

                    label.innerText = currentQuestion.question;
                    optsContainer.innerHTML = mixedOptions.map((opt, i) => `
                        <div class="form-check mb-3 bg-white p-3 border rounded shadow-sm hover-bg-light" style="cursor: pointer;">
                            <input class="form-check-input ms-1 border-primary" style="transform: scale(1.3);" type="radio" name="tc-radio" id="tc-opt-${i}" value="${escapeHtml(opt)}" required>
                            <label class="form-check-label ms-2 fw-bold text-dark w-100" style="cursor: pointer;" for="tc-opt-${i}">
                                ${escapeHtml(opt)}
                            </label>
                        </div>
                    `).join('');
                }

            } else {
                // ========================================================
                // CLOCK OUT LOGIC
                // ========================================================
                if (!isRegular) {
                    // OVERTIME: NO REFLECTION ASKED
                    currentQuestion = { question: "Off-Hours Shift Complete", type: "overtime", resolvedAnswerText: "Overtime Auto-Pass" };
                    label.innerText = currentQuestion.question;
                    optsContainer.innerHTML = `
                        <div class="alert alert-info text-dark shadow-sm border-info mb-3 small fw-bold">
                            <i class="fas fa-info-circle me-2 fs-5"></i> You are clocking out outside of your regularly scheduled class block. No reflection is required for off-hours work!
                        </div>
                    `;
                } else {
                    // REGULAR: OPEN-ENDED REFLECTION
                    let promptStr = null;
                    
                    try {
                        if (isCS) {
                            let questionsPool = csClockOut;
                            
                            if (questionsPool && Array.isArray(questionsPool) && questionsPool.length > 0) {
                                // UPGRADED: Pull a DETERMINISTIC random reflection prompt for CS students
                                const randomIndex = getDailyQuestionIndex(questionsPool.length, 'CS_OUT');
                                promptStr = questionsPool[randomIndex];
                            }
                        } else {
                            // Web Design pulls from the Teacher Payroll Dashboard
                            const questionRef = doc(db, 'artifacts', appId, 'public', 'data', 'dailyQuestions', todayStr);
                            const qSnap = await getDoc(questionRef);
                            
                            if (qSnap.exists() && qSnap.data().wdQuestion && qSnap.data().wdQuestion.trim() !== "") {
                                promptStr = qSnap.data().wdQuestion.trim();
                            }
                        }
                    } catch (err) {
                        console.warn("Server Error: Failed to fetch reflection prompt.", err);
                    }
                    
                    if (!promptStr) {
                        promptStr = "3-2-1 Learning Reflection:\n1. List 3 things you learned today.\n2. List 2 interesting facts.\n3. Write 1 question you still have.";
                    }
                    
                    currentQuestion = { question: promptStr, type: "open-ended", resolvedAnswerText: "Open Reflection" };
                    
                    label.innerText = "Daily Shift Reflection";
                    
                    const promptLines = currentQuestion.question.split('\n');
                    const promptHtml = promptLines.map(line => `<div>${escapeHtml(line)}</div>`).join('');
                    
                    optsContainer.innerHTML = `
                        <div class="alert alert-info text-dark shadow-sm border-info mb-3 small fw-bold">
                            ${promptHtml}
                        </div>
                        <textarea id="tc-out-answer" class="form-control border-primary shadow-sm fw-bold" rows="5" placeholder="Type your reflection here... (Minimum 30 characters required for full credit)" required></textarea>
                    `;
                }
            }

        } catch (err) {
            console.error("Failed to load question data", err);
            optsContainer.innerHTML = `<div class="alert alert-danger">Failed to load today's question logic. Please check the console or ensure question files exist.</div>`;
        }
    }

    if (mode === "in") {
        widgetText.innerText = "Clock In Required";
        widgetBtn.classList.add('btn-danger', 'text-white');
        document.getElementById('tc-widget').style.display = 'block';
        
        if (!isRegular) {
            badge.innerText = "STATUS: OFF-HOURS (Overtime)";
            badge.className = "badge bg-info text-dark mb-3";
            btn.innerText = "Submit & Clock In";
            btn.className = "btn btn-primary w-100 fw-bold py-3 shadow-sm fs-5";
            btn.disabled = false;
        } else {
            badge.innerText = isLate ? "STATUS: LATE (Past 5 mins)" : "STATUS: ON TIME";
            badge.className = isLate ? "badge bg-danger mb-3" : "badge bg-success mb-3";
            btn.innerText = "Submit & Clock In";
            btn.className = "btn btn-primary w-100 fw-bold py-3 shadow-sm fs-5";
            btn.disabled = false;
        }
        
    } else if (mode === "out") {
        widgetText.innerText = "Clock Out";
        widgetBtn.classList.add('btn-warning', 'text-dark');
        document.getElementById('tc-widget').style.display = 'block';
        
        if (!isRegular) {
            badge.innerText = "STATUS: OFF-HOURS SHIFT ACTIVE";
            badge.className = "badge bg-info text-dark mb-3";
        } else {
            badge.innerText = isLate ? "STATUS: DEPARTING EARLY" : "STATUS: SHIFT ACTIVE";
            badge.className = isLate ? "badge bg-danger mb-3" : "badge bg-warning text-dark mb-3";
        }
        
        btn.innerText = "Submit & Clock Out";
        btn.className = "btn btn-dark w-100 fw-bold py-3 shadow-sm fs-5";
        btn.disabled = false;
        
    } else {
        widgetText.innerText = "Shift Complete";
        widgetBtn.classList.add('btn-success', 'text-white');
        badge.innerText = "STATUS: SHIFT COMPLETE";
        badge.className = "badge bg-success mb-3";
        
        document.getElementById('tc-success-msg').classList.remove('d-none');
        document.getElementById('tc-score-result').innerHTML = "You have completed your timecard for today.";
    }

    // ONLY auto-pop if:
    // 1. This is an auto-check (from monitor or page load), AND
    // 2. We're in a time window that allows auto-pop
    if (isAutoCheck && mode !== "idle" && mode !== "done") {
        if (isInAutoPopWindow(mode)) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('timeclock-modal')).show();
        }
    }
}


async function handleTimeclockSubmit(e) {
    e.preventDefault();

    // GUARD: Ensure studentData is loaded
    if (!studentData) {
        alert("System error: Student profile not loaded. Please refresh the page.");
        return;
    }

    const btn = document.getElementById('tc-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

    const mode = window.timeclock.currentMode;
    const isLate = window.timeclock.isLate;
    const isRegular = window.timeclock.isRegular;
    const timestamp = new Date().getTime();
    const todayStr = getLocalTodayStr();
    
    let answer = "";
    let correctPt = 0;

    // Validate Input based on Mode & Schedule
    if (mode === "in") {
        if (!isRegular) {
            answer = "Overtime Auto-Pass";
            correctPt = 0; // Overtime is not graded
        } else {
            const selectedRadio = document.querySelector('input[name="tc-radio"]:checked');
            if (!selectedRadio || !currentQuestion) {
                alert("Please select an answer.");
                btn.disabled = false;
                btn.innerHTML = "Submit & Clock In";
                return;
            }
            answer = selectedRadio.value;
            
            // Safely compare strings, trimming whitespace and ignoring case to prevent mismatch errors
            const submittedAns = answer.trim().toLowerCase();
            const correctAns = currentQuestion.resolvedAnswerText ? currentQuestion.resolvedAnswerText.trim().toLowerCase() : "";
            correctPt = (submittedAns === correctAns) ? 1 : 0;
        }
    } else {
        if (!isRegular) {
            answer = "Overtime Auto-Pass";
            correctPt = 0; // Overtime is not graded
        } else {
            const txtArea = document.getElementById('tc-out-answer');
            if (!txtArea || txtArea.value.trim().length === 0) {
                alert("Please write a reflection.");
                btn.disabled = false;
                btn.innerHTML = "Submit & Clock Out";
                return;
            }
            answer = txtArea.value.trim();
            // Effort Grading: Full point if response is over 30 characters
            correctPt = (answer.length >= 30) ? 1 : 0; 
        }
    }

    // 3-Point Grading Logic (ONLY applies to regular shifts)
    let totalScore = 0;
    let timePt = 0;
    let attemptPt = 0;
    
    if (isRegular) {
        attemptPt = 1;
        timePt = isLate ? 0 : 1; 
        totalScore = attemptPt + timePt + correctPt;
    }

    try {
        // 1. Save to Timesheets (For Notebook Access & Payroll)
        const tcRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'timesheets', todayStr);
        
        // Sanitize data: Use fallbacks for potentially undefined fields
        let updateData = {
            date: todayStr,
            period: studentData.period || "Unknown",
            firstName: studentData.firstName || "Unknown",
            lastName: studentData.lastName || "Unknown"
        };

        const notebookData = {
            question: currentQuestion ? (currentQuestion.question || "N/A") : "Off-Hours Shift",
            answerGiven: answer || "N/A",
            correctAnswer: currentQuestion ? (currentQuestion.resolvedAnswerText || "Open Reflection") : "N/A",
            score: totalScore,
            isCorrect: !isRegular ? true : (correctPt === 1)
        };

        if (mode === "in") {
            updateData.clockInTime = timestamp;
            updateData.statusIn = !isRegular ? "Overtime" : (isLate ? "Late" : "On Time");
            updateData.notebookIn = notebookData;
        } else if (mode === "out") {
            updateData.clockOutTime = timestamp;
            updateData.statusOut = !isRegular ? "Overtime" : (isLate ? "Early Departure" : "On Time");
            updateData.notebookOut = notebookData;
        }

        await setDoc(tcRef, updateData, { merge: true });

        // 2. Push directly to the Master Gradebook! (ONLY FOR REGULAR SHIFTS)
        if (isRegular) {
            const monthDay = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
            const gradeKey = mode === "in" ? `TC-In ${monthDay} [3 pts]` : `TC-Out ${monthDay} [3 pts]`;
            
            const gradeRef = doc(db, 'artifacts', appId, 'public', 'data', 'grades', String(studentData.id));
            await setDoc(gradeRef, {
                [gradeKey]: { score: totalScore, max: 3, timestamp: new Date().toLocaleString() },
                lastSubmitDate: new Date().toLocaleString()
            }, { merge: true });
        }

        // 3. Display results to student
        document.getElementById('tc-form').style.display = 'none';
        document.getElementById('tc-success-msg').classList.remove('d-none');
        
        if (!isRegular) {
            // Overtime Feedback
            document.getElementById('tc-score-result').innerHTML = `
                <strong>Shift Successfully Logged!</strong>
                <br><span class="text-info small mt-2 d-block"><i class="fas fa-star me-1"></i> Off-hours shift applied to payroll. No gradebook points are awarded for overtime.</span>
            `;
        } else {
            // Regular Shift Feedback - 3 Point Visual Breakdown
            const timePenaltyText = mode === "in" ? "Late Penalty" : "Early Departure Penalty";
            
            let answerFeedbackText = "";
            let answerSubtext = "";
            
            if (mode === "in") {
                answerFeedbackText = correctPt === 1 ? "Correct Answer: +1 pt" : "Incorrect Answer: 0 pts";
                if (correctPt === 0) {
                    answerSubtext = `<div class="alert alert-danger mt-3 py-2 small border-danger"><strong>Correct Answer:</strong> ${escapeHtml(currentQuestion.resolvedAnswerText)}</div>`;
                }
            } else {
                answerFeedbackText = correctPt === 1 ? "Thoughtful Reflection: +1 pt" : "Reflection too brief: 0 pts";
            }

            document.getElementById('tc-score-result').innerHTML = `
                <div class="mb-2"><strong>Total Score: ${totalScore}/3 Points Earned</strong></div>
                <div class="mt-2 text-start d-inline-block text-dark">
                    <div class="text-success small fw-bold mb-1"><i class="fas fa-check-circle me-1"></i> Attempt Logged: +1 pt</div>
                    <div class="${timePt === 1 ? 'text-success' : 'text-danger'} small fw-bold mb-1"><i class="${timePt === 1 ? 'fas fa-check-circle' : 'fas fa-times-circle'} me-1"></i> ${timePt === 1 ? 'Time Requirement Met: +1 pt' : timePenaltyText + ': 0 pts'}</div>
                    <div class="${correctPt === 1 ? 'text-success' : 'text-danger'} small fw-bold"><i class="${correctPt === 1 ? 'fas fa-check-circle' : 'fas fa-times-circle'} me-1"></i> ${answerFeedbackText}</div>
                </div>
                ${answerSubtext}
            `;
        }

        if (studentData && typeof studentData.period === 'string' && studentData.period.startsWith('CS')) {
            const notebookLink = document.createElement('a');
            notebookLink.href = '/cs-interactive.html';
            notebookLink.className = 'btn btn-outline-primary btn-sm mt-3 fw-bold';
            notebookLink.innerText = 'Go to CS Interactive Notebook';
            const successMsg = document.getElementById('tc-success-msg');
            if (successMsg && !successMsg.querySelector('.btn-outline-primary')) {
                successMsg.appendChild(notebookLink);
            }
        }
        
        setTimeout(() => {
            // HIDE the modal completely after successful submission
            const modal = bootstrap.Modal.getInstance(document.getElementById('timeclock-modal'));
            if (modal) modal.hide();
            
            // Reset autoFired flags so modals can appear on any page during their time windows
            if (mode === "in") {
                window.timeclock.hasAutoClockInFired = false;
            } else if (mode === "out") {
                window.timeclock.hasAutoClockOutFired = false;
            }
            
            checkStatus(false);
        }, 3000); // Extended timeout to let students read the score breakdown

    } catch (err) {
        console.error("Timeclock Error (Firestore Write Failed):", err);
        alert("Failed to save. This may be due to missing profile information. Please check your console for details.");
        btn.disabled = false;
        btn.innerText = mode === "in" ? "Submit & Clock In" : "Submit & Clock Out";
    }
}

window.timeclock = { checkStatus, currentMode: "idle", isLate: false, isRegular: false, hasAutoClockInFired: false, hasAutoClockOutFired: false };