// exam-engine.js
/**
 * COMPUTER SCIENCE SUMMATIVE EXAM ENGINE (PROCTOR EDITION)
 * MIGRATED: Firebase removed. Uses MariaDB API + auth-guard.js.
 * - Dynamic 5-Question Per Chapter pooling logic (15 or 20 total questions).
 * - Interactive CS Notebook iframe integration.
 * - Grade keep-highest logic preserved.
 */

// ======================================================
// ⚡ EASY TOGGLE SETTINGS (Change true/false here)
// ======================================================
const ENABLE_ATTEMPT_LIMIT = true;   // true = limit to 3 attempts, false = unlimited
const ENABLE_COOLDOWN = true;        // true = 45-min block after submit, false = no block
const ENABLE_WORKSHEET = false;       // true = show side-by-side notebook, false = quiz only
const MAX_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 45;
// ======================================================

const libs = [
    { id: 'jspdf-lib', src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' },
    { id: 'pdf-lib', src: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js' }
];

libs.forEach(lib => {
    if (!document.getElementById(lib.id)) {
        const s = document.createElement('script');
        s.id = lib.id;
        s.src = lib.src;
        s.async = false;
        document.head.appendChild(s);
    }
});

const customStyle = document.createElement('style');
customStyle.innerHTML = `
    @media print {
        body * { visibility: hidden; }
        #exam-container, #exam-container * { visibility: visible; }
        #exam-container { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
        .review-section { max-height: none !important; overflow: visible !important; }
        .card { border: 1px solid #000 !important; shadow: none !important; }
    }

    .review-section { max-height: none !important; overflow: visible !important; height: auto !important; }

    #dac-modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: none; z-index: 10000;
        align-items: center; justify-content: center;
        backdrop-filter: blur(4px);
    }
    .dac-modal-content {
        background: white; padding: 30px; border-radius: 12px;
        max-width: 500px; width: 90%; text-align: center;
        box-shadow: 0 20px 50px rgba(0,0,0,0.4); border: 3px solid var(--primary-color);
    }

    .badge-platinum {
        background: linear-gradient(135deg, #e5e5e5 0%, #ffffff 50%, #e5e5e5 100%) !important;
        color: #495057 !important;
        border: 2px solid #ced4da !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .badge-gold {
        background: linear-gradient(135deg, #ffd700 0%, #ffeb73 50%, #daa520 100%) !important;
        color: #664d03 !important;
        border: 2px solid #ffc107 !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .badge-silver {
        background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #a9a9a9 100%) !important;
        color: #495057 !important;
        border: 2px solid #adb5bd !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
`;
document.head.appendChild(customStyle);

// Safe Modal Injection
function injectModals() {
    if (document.getElementById('dac-modal-overlay')) return;
    const modalHtml = `
        <div id="dac-modal-overlay">
            <div class="dac-modal-content">
                <h3 id="dac-modal-title" class="fw-bold text-primary mb-3"></h3>
                <p id="dac-modal-body" class="mb-4 text-muted" style="font-size: 1.1rem; line-height: 1.5;"></p>
                <div id="dac-modal-footer" class="d-flex justify-content-center gap-3">
                    <button id="dac-modal-cancel" class="btn btn-outline-secondary px-4">Cancel</button>
                    <button id="dac-modal-confirm" class="btn btn-primary px-4 fw-bold">Submit Assessment</button>
                </div>
            </div>
        </div>`;

    if (document.body) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.body.insertAdjacentHTML('beforeend', modalHtml));
    }
}
injectModals();

function showDacConfirm(title, body, onConfirm) {
    injectModals();
    const overlay = document.getElementById('dac-modal-overlay');
    const titleEl = document.getElementById('dac-modal-title');
    const bodyEl = document.getElementById('dac-modal-body');
    const confirmBtn = document.getElementById('dac-modal-confirm');
    const cancelBtn = document.getElementById('dac-modal-cancel');

    titleEl.innerText = title;
    bodyEl.innerText = body;
    cancelBtn.style.display = 'inline-block';
    confirmBtn.innerText = "Submit Assessment";
    overlay.style.display = 'flex';

    confirmBtn.onclick = () => { overlay.style.display = 'none'; onConfirm(); };
    cancelBtn.onclick = () => { overlay.style.display = 'none'; };
}

function showDacAlert(title, body) {
    injectModals();
    const overlay = document.getElementById('dac-modal-overlay');
    const titleEl = document.getElementById('dac-modal-title');
    const bodyEl = document.getElementById('dac-modal-body');
    const confirmBtn = document.getElementById('dac-modal-confirm');
    const cancelBtn = document.getElementById('dac-modal-cancel');

    titleEl.innerText = title;
    bodyEl.innerText = body;
    cancelBtn.style.display = 'none';
    confirmBtn.innerText = "OK";
    overlay.style.display = 'flex';

    confirmBtn.onclick = () => { overlay.style.display = 'none'; };
}

// ==========================================
// AUTH GUARD (MariaDB / auth-guard.js)
// ==========================================
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

// Global Variables
let examQuestions = [];
let userAnswers = {};
let currentIndex = 0;
let fName = "Unverified";
let lName = "";
let sClass = "N/A";
let studentId = "";
let webhookUrl = "";
let chapterTitle = "";
let examIsActive = false;
let examProgressId = "";
let currentUnit = 1;

const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
let attemptCount = 0;
let lastSubmissionTime = 0;

// ==========================================
// ATTEMPT TRACKING & COOLDOWN LOGIC
// ==========================================
function getAttemptKey() {
    return `examAttempts_${studentId}_${examProgressId}`;
}

function loadAttemptData() {
    try {
        const attemptData = JSON.parse(localStorage.getItem(getAttemptKey()) || '{}');
        attemptCount = attemptData.count || 0;
        lastSubmissionTime = attemptData.lastSubmission || 0;
    } catch(e) {
        attemptCount = 0;
        lastSubmissionTime = 0;
    }
}

function saveAttemptData() {
    try {
        localStorage.setItem(getAttemptKey(), JSON.stringify({
            count: attemptCount,
            lastSubmission: lastSubmissionTime
        }));
    } catch(e) {
        console.warn("Could not save attempt data:", e);
    }
}

function canTakeExam() {
    // Check attempt count (if enabled)
    if (ENABLE_ATTEMPT_LIMIT && attemptCount >= MAX_ATTEMPTS) {
        return { allowed: false, reason: 'attempts', message: `You have reached the maximum of ${MAX_ATTEMPTS} attempts for this exam.` };
    }
    
    // Check cooldown time (if enabled)
    if (ENABLE_COOLDOWN) {
        const timeSinceSubmission = Date.now() - lastSubmissionTime;
        if (lastSubmissionTime > 0 && timeSinceSubmission < COOLDOWN_MS) {
            const remainingMinutes = Math.ceil((COOLDOWN_MS - timeSinceSubmission) / 60000);
            return { 
                allowed: false, 
                reason: 'cooldown', 
                message: `You must wait ${remainingMinutes} minute(s) before retaking this exam.`,
                remainingMs: COOLDOWN_MS - timeSinceSubmission
            };
        }
    }
    
    return { allowed: true };
}

function showCooldownMessage(remainingMs) {
    const container = document.getElementById('exam-container');
    if (!container) return;
    
    const cooldownEndTime = lastSubmissionTime + COOLDOWN_MS;
    
    container.innerHTML = `
        <div class="alert alert-warning text-center shadow">
            <h4 class="fw-bold text-warning"><i class="fas fa-clock"></i> Cooldown Period</h4>
            <p>You recently submitted this exam. You must wait before retaking it.</p>
            <div class="display-4 my-4 fw-bold text-primary" id="cooldown-countdown">
                <strong>--:--</strong>
            </div>
            <p class="small text-muted">This page will automatically refresh when the cooldown ends.</p>
        </div>`;
    
    const updateCountdown = () => {
        const now = Date.now();
        const remaining = cooldownEndTime - now;
        
        if (remaining <= 0) {
            window.location.reload();
            return;
        }
        
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        
        const countdownEl = document.getElementById('cooldown-countdown');
        if (countdownEl) {
            countdownEl.innerHTML = `<strong>${mins}:${secs.toString().padStart(2, '0')}</strong>`;
        }
        
        requestAnimationFrame(updateCountdown);
    };
    
    requestAnimationFrame(updateCountdown);
}

function showAttemptLimitMessage() {
    const container = document.getElementById('exam-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="alert alert-danger text-center shadow">
            <h4 class="fw-bold text-danger"><i class="fas fa-ban"></i> Maximum Attempts Reached</h4>
            <p>You have used all ${MAX_ATTEMPTS} attempts for this exam.</p>
            <p class="small text-muted">Please contact your instructor if you need to retake this assessment.</p>
            <a href="/student" class="btn btn-primary mt-3">Return to Student Portal</a>
        </div>`;
}

// EMBEDDED FALLBACK QUESTIONS FOR EXAM ENGINE (when API is empty)
// Unit 0: Office Productivity - used when database has no questions
const csExamFallbackQuestions = {
    0: [
        { chapter: 0, question: "What is the primary function of Microsoft Word?", options: ["Word Processing", "Spreadsheet Calculations", "Presentation Graphics", "Database Management"], answer: "Word Processing" },
        { chapter: 0, question: "Which Excel feature automatically calculates values in cells?", options: ["Formulas", "Images", "Comments", "Page Layout"], answer: "Formulas" },
        { chapter: 0, question: "In Excel, what is a group of related cells called?", options: ["Range", "Chart", "Pivot Table", "Macro"], answer: "Range" },
        { chapter: 0, question: "What file extension do modern Word documents use?", options: [".docx", ".doc", ".txt", ".rtf"], answer: ".docx" },
        { chapter: 0, question: "PowerPoint is primarily used for:", options: ["Creating presentations", "Writing code", "Managing databases", "Sending emails"], answer: "Creating presentations" },
        { chapter: 0, question: "What does PDF stand for?", options: ["Portable Document Format", "Personal Data File", "Print Document First", "Protected Digital Format"], answer: "Portable Document Format" },
        { chapter: 0, question: "Which Microsoft Office application is best for budgets?", options: ["Excel", "Word", "PowerPoint", "Access"], answer: "Excel" },
        { chapter: 0, question: "OneDrive is Microsoft's:", options: ["Cloud Storage", "Email Service", "Web Browser", "Antivirus"], answer: "Cloud Storage" },
        { chapter: 0, question: "What is the intersection of a row and column in Excel called?", options: ["Cell", "Block", "Grid", "Box"], answer: "Cell" },
        { chapter: 0, question: "Which Office app creates professional resumes?", options: ["Word", "Excel", "PowerPoint", "Outlook"], answer: "Word" }
    ],
    a: [
        { chapter: "a", question: "What component pulls heat away from the CPU?", options: ["Heat Sink", "Power Supply", "Cooling Fan", "RAM"], answer: "Heat Sink" },
        { chapter: "a", question: "CPU speed is measured in:", options: ["GHz", "GB", "MBps", "dpi"], answer: "GHz" },
        { chapter: "a", question: "A 3.0 GHz CPU handles how many cycles per second?", options: ["3 Billion", "3 Million", "3 Thousand", "3 Trillion"], answer: "3 Billion" },
        { chapter: "a", question: "External devices like printers are called:", options: ["Peripherals", "Components", "Nodes", "Modules"], answer: "Peripherals" },
        { chapter: "a", question: "Which processor handles graphics?", options: ["GPU", "CPU", "RAM", "BIOS"], answer: "GPU" },
        { chapter: "a", question: "Motherboard size is called:", options: ["Form Factor", "Layout", "Design", "Architecture"], answer: "Form Factor" },
        { chapter: "a", question: "Permanent memory that cannot be easily erased is:", options: ["ROM", "RAM", "Cache", "Virtual Memory"], answer: "ROM" },
        { chapter: "a", question: "What boots the computer?", options: ["BIOS/UEFI", "Windows", "Kernel", "Driver"], answer: "BIOS/UEFI" },
        { chapter: "a", question: "The on/off switch in a CPU is a:", options: ["Transistor", "Capacitor", "Resistor", "Diode"], answer: "Transistor" },
        { chapter: "a", question: "Transistors double every two years is:", options: ["Moore's Law", "Gates' Principle", "Turing's Theory", "Silicon Rule"], answer: "Moore's Law" }
    ]
};

// Fetch questions from the API based on unit number
async function fetchExamQuestionsFromAPI(unitNum) {
    console.log("[examLogicCS] fetchExamQuestionsFromAPI called with unit:", unitNum);
    try {
        const apiUrl = `/api/cs-exam-questions?unit=${unitNum}`;
        console.log("[examLogicCS] Fetching from:", apiUrl);
        
        const response = await fetch(apiUrl);
        console.log("[examLogicCS] Response status:", response.status);
        
        if (!response.ok) {
            const errText = await response.text();
            console.error("[examLogicCS] API error response:", errText);
            throw new Error('Failed to fetch questions: ' + response.status);
        }
        
        const data = await response.json();
        console.log("[examLogicCS] API response:", JSON.stringify(data).substring(0, 500));
        
        if (!data.questions || data.questions.length === 0) {
            console.error("[examLogicCS] WARNING: API returned 0 questions!");
            console.error("[examLogicCS] Using embedded fallback for unit:", unitNum);
            
            // Try embedded fallback first
            let fallbackKey = unitNum;
            if (unitNum === "a" || unitNum === "A") fallbackKey = "a";
            
            // Try to find fallback - convert string "0" to number 0 for object key
            if (csExamFallbackQuestions[fallbackKey]) {
                console.log("[examLogicCS] Using embedded fallback questions:", csExamFallbackQuestions[fallbackKey].length);
                return csExamFallbackQuestions[fallbackKey];
            }
            
            // Try numeric to string conversion
            if (typeof unitNum === 'number' && csExamFallbackQuestions[String(unitNum)]) {
                return csExamFallbackQuestions[String(unitNum)];
            }
            
            // Try string to number conversion  
            if (typeof unitNum === 'string' && csExamFallbackQuestions[parseInt(unitNum, 10)]) {
                return csExamFallbackQuestions[parseInt(unitNum, 10)];
            }
            
            // Try legacy format
            if ((unitNum === "a" || unitNum === "A") && csExamFallbackQuestions["a"]) {
                return csExamFallbackQuestions["a"];
            }
            
            return [];
        }
        
        return data.questions || [];
    } catch (e) {
        console.error("[examLogicCS] Exception in fetchExamQuestionsFromAPI:", e.message);
        console.error("[examLogicCS] Stack:", e.stack);
        
        // Try fallback on exception too
        let fallbackKey = unitNum;
        if (unitNum === "a" || unitNum === "A") fallbackKey = "a";
        if (csExamFallbackQuestions[fallbackKey]) {
            console.log("[examLogicCS] Exception - using embedded fallback:", csExamFallbackQuestions[fallbackKey].length);
            return csExamFallbackQuestions[fallbackKey];
        }
        
        return [];
    }
}

// Fetch questions for multiple units (used for weighted mixing)
async function fetchQuestionsForWeightedMix(targetUnit) {
    const allQuestions = {};
    
    // Handle chapter "a" as a special case (only fetch for "a")
    if (targetUnit === "a") {
        allQuestions["a"] = await fetchExamQuestionsFromAPI("a");
        return allQuestions;
    }
    
    // Handle numeric units - fetch from 1 up to target unit
    const targetNum = parseInt(targetUnit, 10);
    for (let u = 1; u <= targetNum; u++) {
        const questions = await fetchExamQuestionsFromAPI(u);
        allQuestions[u] = questions;
    }
    
    return allQuestions;
}

// Weighted question mixing logic with new distribution for units a-8
function getWeightedQuestions(allQuestionsByUnit, targetUnit, totalQuestions = 25) {
    const weights = {
        a: { a: 100 },
        1: { 1: 100 },
        2: { 2: 95, 1: 5 },
        3: { 3: 90, 2: 5, 4: 5 },
        4: { 4: 85, 3: 5, 2: 5, 1: 5 },
        5: { 5: 80, 4: 5, 3: 5, 2: 5 },
        6: { 6: 75, 5: 5, 4: 5, 3: 5, 2: 5 },
        7: { 7: 70, 6: 5, 5: 5, 4: 5, 3: 5 },
        8: { 8: 65, 7: 5, 6: 5, 5: 5, 4: 5 }
    };
    
    const unitWeights = weights[targetUnit] || { [targetUnit]: 100 };
    const selectedQuestions = [];
    
    // Calculate how many questions to pull from each unit
    const questionsPerUnit = {};
    for (const unit in unitWeights) {
        questionsPerUnit[unit] = Math.round(totalQuestions * (unitWeights[unit] / 100));
    }
    
    // Ensure we get exactly totalQuestions
    let totalAllocated = Object.values(questionsPerUnit).reduce((a, b) => a + b, 0);
    if (totalAllocated < totalQuestions) {
        // Add remaining to target unit
        questionsPerUnit[targetUnit] += (totalQuestions - totalAllocated);
    }
    
// Shuffle and select questions from each unit
    for (const unit in questionsPerUnit) {
        const count = questionsPerUnit[unit];
        const unitQuestions = [...(allQuestionsByUnit[unit] || [])];
        
        // Shuffle the questions for this unit
        for (let i = unitQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unitQuestions[i], unitQuestions[j]] = [unitQuestions[j], unitQuestions[i]];
        }
        
        selectedQuestions.push(...unitQuestions.slice(0, count));
    }
    
    // Final shuffle of all selected questions
    for (let i = selectedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
    }
    
    return selectedQuestions.slice(0, totalQuestions);
}

let tabSwitchCount = 0;
let tabLockdownActive = false;

let serverFeedback = [];
let finalScore = 0;
let finalTotal = 0;
let finalPercentage = 0;

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function enableAntiCheat() {
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey) || (e.metaKey && e.altKey)) e.preventDefault();
    });
    const style = document.createElement('style');
    style.innerHTML = `body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }`;
    document.head.appendChild(style);
}
enableAntiCheat();

function setupTabLockdown() {
    if (tabLockdownActive) return;
    tabLockdownActive = true;

    document.addEventListener('visibilitychange', () => {
        if (examIsActive && document.visibilityState === 'hidden') {
            tabSwitchCount++;

            if (tabSwitchCount === 1) {
                showDacAlert(
                    "⚠️ SECURITY WARNING",
                    "You have switched tabs or left the exam window. This is your ONLY warning. If you leave the exam screen again, your test will be automatically submitted with your current score."
                );
            } else if (tabSwitchCount >= 2) {
                examIsActive = false;
                showDacAlert(
                    "🚨 SECURITY VIOLATION",
                    "You left the exam screen multiple times. Your exam has been locked and submitted automatically."
                );
                processSubmission();
            }
        }
    });
}

async function initExam(config) {
    // Extract unit number from config if provided (default to "a")
    currentUnit = config.unit || config.chapter || "a";
    
    let pool = Array.isArray(config) ? config : (config.questions || []);
    
    // Handle backward compatibility - convert old chapter config to unit
    if (!config.unit && config.chapter) {
        currentUnit = config.chapter;
    }
    
    // If no questions provided, fetch from API
    if (pool.length === 0 && currentUnit) {
        // Check if weighted mixing is enabled for unit 2+
        if (config.useWeightedMix && currentUnit > 1) {
            console.log("[examLogicCS] Using weighted question mix for unit:", currentUnit);
            const allQuestions = await fetchQuestionsForWeightedMix(currentUnit);
            pool = getWeightedQuestions(allQuestions, currentUnit, config.questionCount || 25);
        } else {
            console.log("[examLogicCS] Fetching questions from API for unit:", currentUnit);
            pool = await fetchExamQuestionsFromAPI(currentUnit);
        }
    }

    // COMPUTER SCIENCE LOGIC: Exact 5 Questions per chapter pulled dynamically
    if (config.perChapter) {
        const questionsByChapter = {};
        pool.forEach(q => {
            if (!questionsByChapter[q.chapter]) questionsByChapter[q.chapter] = [];
            questionsByChapter[q.chapter].push(q);
        });

        const selectedQuestions = [];
        for (const chapter in questionsByChapter) {
            const chapterPool = [...questionsByChapter[chapter]];
            for (let i = chapterPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [chapterPool[i], chapterPool[j]] = [chapterPool[j], chapterPool[i]];
            }
            selectedQuestions.push(...chapterPool.slice(0, config.perChapter));
        }

        for (let i = selectedQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
        }
        examQuestions = selectedQuestions;
    } else {
        let shuffledPool = [...pool];
        for (let i = shuffledPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
        }
        const count = config.questionCount || Math.min(20, shuffledPool.length);
        examQuestions = shuffledPool.slice(0, count);
    }

    // Shuffle Options within each question
    examQuestions = examQuestions.map(q => {
        let opts = [...q.options];
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        return { ...q, options: opts };
    });

// MARIADB ONLY - No Google Sheets webhook
    webhookUrl = "";

    chapterTitle = config.chapterTitle || document.title || "Assessment";
    userAnswers = {};
    currentIndex = 0;

    // Show loading state while auth resolves
    const container = document.getElementById('exam-container');
    if (container) {
        container.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2 fw-bold">Connecting to Database & Verifying Roster...</p>
            </div>`;
    }

    const authData = await waitForAuth();
    if (!authData.isAuthenticated) {
        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
    }

    let storedUser = {};
    try { storedUser = JSON.parse(localStorage.getItem('user') || '{}'); } catch(e) {}
    const username = storedUser.username;
    studentId = storedUser.student_id || '';

    if (!username || !studentId) {
        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
    }

    try {
        const profileRes = await fetch(`/api/student/profile?username=${encodeURIComponent(username)}`);
        if (!profileRes.ok) throw new Error('Profile not found');
        const profileData = await profileRes.json();
        fName = profileData.first_name || 'Unknown';
        lName = profileData.last_name || '';
        sClass = profileData.section_id || 'N/A';
    } catch (err) {
        console.error("Exam Engine: Roster lookup failed:", err);
        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const safeTitle = (chapterTitle || "Assessment").replace(/\s+/g, '_');
    examProgressId = `Summative_${studentId}_${safeTitle}_${todayStr}`;

    renderAuthScreen();
}

function renderAuthScreen() {
    if (fName === "Unverified") {
        const container = document.getElementById('exam-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger text-center shadow">
                    <h4 class="fw-bold">⚠️ Identity Verification Required</h4>
                    <p>Your portal session is not linked to an active student roster entry. Please log in again.</p>
                    <a href="/login.html" class="btn btn-danger">Log In as Active Student</a>
                </div>`;
        }
        return;
    }

    // Check attempt and cooldown restrictions
    loadAttemptData();
    const examPermission = canTakeExam();
    
    if (!examPermission.allowed) {
        if (examPermission.reason === 'attempts') {
            showAttemptLimitMessage();
            return;
        } else if (examPermission.reason === 'cooldown') {
            showCooldownMessage(examPermission.remainingMs);
            return;
        }
    }

    const container = document.getElementById('exam-container');
    if (!container) return;

    container.innerHTML = `
        <div class="card shadow border-primary mx-auto" style="max-width: 550px;">
            <div class="card-header bg-primary text-center py-3">
                <h4 class="mb-0 text-white gochi">Summative Assessment</h4>
            </div>
            <div class="card-body p-4 text-center">
                <h5 class="text-primary mb-3">${chapterTitle}</h5>

                <div class="alert alert-info py-3 mb-4 text-start border-info bg-light shadow-sm">
                    <div class="row align-items-center">
                        <div class="col-8">
                            <span class="small text-muted d-block mb-1 uppercase fw-bold" style="font-size:0.7rem; letter-spacing:1px;">Verified Student</span>
                            <span class="h5 mb-0 fw-bold text-dark">${fName} ${lName}</span>
                        </div>
                        <div class="col-4 border-start text-center">
                            <span class="small text-muted d-block mb-1 uppercase fw-bold" style="font-size:0.7rem; letter-spacing:1px;">Period</span>
                            <span class="h5 mb-0 fw-bold text-primary">${sClass}</span>
                        </div>
                    </div>
                </div>

                <div class="bg-site-secondary p-3 rounded border border-danger mb-4 text-center">
                    <i class="fas fa-lock text-danger fs-3 mb-2"></i>
                    <p class="small fw-bold text-dark mb-1">Tab Lockout Security Enabled</p>
                    <p class="x-small text-muted mb-0">Your Digital Notebook will automatically open side-by-side with the exam. You are strictly prohibited from switching to other browser tabs or using the website navigation.</p>
                </div>

                <div id="auth-footer">
                    <button onclick="checkResume()" class="btn btn-lg btn-primary w-100 fw-bold shadow-sm">Begin Assessment</button>
                </div>
            </div>
        </div>`;
}

async function checkResume() {
    const footer = document.getElementById('auth-footer');
    if (footer) footer.innerHTML = `<div class="spinner-border text-primary"></div><p class="small mt-2">Checking for saved progress...</p>`;

    try {
        const res = await fetch(`/api/student/exam-progress?student_id=${encodeURIComponent(studentId)}&exam_id=${encodeURIComponent(examProgressId)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.found) {
                const hoursSinceSave = (Date.now() - (data.timestamp || 0)) / (1000 * 60 * 60);
                if (hoursSinceSave < 12) {
                    if (confirm(`We found an unfinished session from ${new Date(data.timestamp || 0).toLocaleTimeString()}. Resume where you left off?`)) {
                        userAnswers = data.userAnswers || {};
                        currentIndex = data.currentIndex || 0;
                        examQuestions = data.examQuestions || examQuestions;
                    }
                } else {
                    console.log("Old ghost save file detected. Starting fresh.");
                }
            }
        }
    } catch (err) {
        console.warn("Could not check progress, starting fresh.", err);
    }

    startExam();
}

// Global function to cleanly handle iframe lockdown styling without nested quotes
window.lockdownIframe = function(iframe) {
    try {
        const doc = iframe.contentWindow.document;
        const s = doc.createElement('style');
        s.innerHTML = 'nav, footer, .footer, .site-footer, #nav-placeholder, #footer-placeholder, #footer-nav, .back-to-top { display: none !important; opacity: 0 !important; pointer-events: none !important; height: 0 !important; }';
        doc.head.appendChild(s);
    } catch(e) {}
};

function startExam() {
    examIsActive = true;

    if (!document.getElementById('exam-lockdown-css')) {
        const lockdownStyle = document.createElement('style');
        lockdownStyle.id = 'exam-lockdown-css';
        lockdownStyle.innerHTML = `
            nav, footer, .footer, .site-footer, #nav-placeholder, #footer-placeholder, #footer-nav, .back-to-top {
                display: none !important;
                opacity: 0 !important;
                pointer-events: none !important;
                height: 0 !important;
                overflow: hidden !important;
            }
        `;
        document.head.appendChild(lockdownStyle);
    }

    const navEl = document.getElementById('nav-placeholder');
    const footerEl = document.getElementById('footer-placeholder');
    const footerNavEl = document.getElementById('footer-nav');
    if (navEl) navEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'none';
    if (footerNavEl) footerNavEl.style.display = 'none';

    const containerCol = document.getElementById('exam-container')?.parentElement;
    if (containerCol && containerCol.classList.contains('col-lg-9')) {
        containerCol.classList.remove('col-lg-9');
        containerCol.classList.add('col-12');
    }

const examContainer = document.getElementById('exam-container');
    if (examContainer) {
        // Conditionally show worksheet/notebook based on ENABLE_WORKSHEET
        if (ENABLE_WORKSHEET) {
            examContainer.innerHTML = `
                <div class="row g-4">
                    <div class="col-lg-5 col-xl-5" id="quiz-pane"></div>
                    <div class="col-lg-7 col-xl-7 no-print">
                        <div class="card shadow-sm h-100 border-primary">
                            <div class="card-header bg-site-secondary border-bottom border-primary text-primary fw-bold py-2 d-flex justify-content-between align-items-center">
                                <span><i class="fas fa-book me-2"></i> My Digital Notebook</span>
                                <span class="badge bg-warning text-dark shadow-sm"><i class="fas fa-lock me-1"></i> Screen Locked</span>
                            </div>
                            <div class="card-body p-0" style="height: 80vh; min-height: 600px;">
<iframe src="/cs-notebook.html" onload="window.lockdownIframe(this)" style="width: 100%; height: 100%; border: none;"></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Worksheet disabled - show only quiz pane
            examContainer.innerHTML = `
                <div class="row g-4">
                    <div class="col-12" id="quiz-pane"></div>
                </div>
            `;
        }
    }

    renderQuestion();
    setupTabLockdown();
}

async function syncProgress() {
    if (!examIsActive || !studentId) return;
    try {
        await fetch('/api/student/exam-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                exam_id: examProgressId,
                currentIndex,
                userAnswers,
                examQuestions,
                timestamp: Date.now()
            })
        });
    } catch (err) {
        console.error("Failed to sync progress:", err);
    }
}

function renderQuestion() {
    const pane = document.getElementById('quiz-pane');
    if (!pane) return;

    // Defensive check for empty questions
    if (!examQuestions || examQuestions.length === 0) {
        pane.innerHTML = `
            <div class="alert alert-danger text-center">
                <h4>No Questions Available</h4>
                <p>Please contact your instructor - the question bank is empty for this unit.</p>
                <p class="small text-muted">Error: examQuestions array is empty</p>
            </div>`;
        return;
    }

    const q = examQuestions[currentIndex];
    const isAnswered = userAnswers[currentIndex] !== undefined;

    const optionsHtml = q.options.map((opt, i) => {
        const selectedClass = (userAnswers[currentIndex] === i) ? 'border-primary bg-site-secondary' : 'border-secondary';
        const checkedAttr = (userAnswers[currentIndex] === i) ? 'checked' : '';
        return `
            <div class="col-12 mb-3">
                <div class="card h-100 shadow-sm ${selectedClass}" onclick="selectOption(${i})" style="cursor: pointer; border-width: 2px !important;">
                    <div class="card-body d-flex align-items-center">
                        <input class="form-check-input me-3" type="radio" ${checkedAttr} style="pointer-events: none; border-color: var(--primary-color);">
                        <label class="form-check-label w-100 fw-bold" style="pointer-events: none; color: var(--primary-color);">${escapeHtml(opt)}</label>
                    </div>
                </div>
            </div>`;
    }).join('');

    // Pre-calculate clean variables to prevent IDE syntax parsers from breaking
    const progressPercent = (currentIndex / examQuestions.length) * 100;
    const isLastQuestion = currentIndex === examQuestions.length - 1;
    const btnAction = isLastQuestion ? "confirmSubmit()" : "nextQuestion()";
    const btnText = isLastQuestion ? "Submit Test" : "Next";
    const prevDisabled = currentIndex === 0 ? "disabled" : "";
    const nextDisabled = isAnswered ? "" : "disabled";

    pane.innerHTML = `
        <div class="card shadow-sm border-0 h-100 p-4">
            <div class="text-center mb-4">
                <div class="d-flex justify-content-between small text-muted mb-2">
                    <span><strong>Student:</strong> ${escapeHtml(lName)}, ${escapeHtml(fName)} (${sClass})</span>
                </div>
                <div class="progress mb-3 no-print" style="height: 10px; background-color: var(--secondary-color);">
                    <div class="progress-bar bg-primary" style="width: ${progressPercent}%"></div>
                </div>
                <h5 class="fw-bold text-primary mb-1">Question ${currentIndex + 1} of ${examQuestions.length}</h5>
                <p class="small text-muted mb-4">${chapterTitle}</p>
                <h4 class="fw-bold text-dark lh-base" style="color: var(--primary-color);">${escapeHtml(q.question)}</h4>
            </div>

            <div class="row mt-4 px-2">${optionsHtml}</div>

            <div class="d-flex justify-content-between mt-auto pt-4 border-top px-2 no-print">
                <button class="btn btn-outline-primary px-4 shadow-sm fw-bold" onclick="prevQuestion()" ${prevDisabled}>Previous</button>
                <button class="btn btn-primary px-5 shadow-sm fw-bold" onclick="${btnAction}" ${nextDisabled}>${btnText}</button>
            </div>
        </div>`;

    syncProgress();
}

function selectOption(idx) { userAnswers[currentIndex] = idx; renderQuestion(); }
function nextQuestion() { currentIndex++; renderQuestion(); }
function prevQuestion() { currentIndex--; renderQuestion(); }

function confirmSubmit() {
    showDacConfirm(
        "Submit Summative Assessment?",
        "You have reached the end of the exam. Please review your answers if needed.\n\nAre you sure you are ready to submit your final answers for official grading?",
        processSubmission
    );
}

async function downloadPDFReport(event) {
    const btn = event.currentTarget;
    const { jsPDF } = window.jspdf;

    if (!jsPDF) return showDacAlert("Loading", "PDF engine is still loading. Please wait 2 seconds.");

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Generating File...`;

    try {
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(22); doc.setTextColor(0, 51, 153); doc.setFont("helvetica", "bold");
        doc.text("SUMMATIVE ASSESSMENT REPORT", 105, y, { align: "center" });

        y += 10;
        doc.setFontSize(14); doc.setTextColor(100); doc.setFont("helvetica", "italic");
        doc.text(chapterTitle, 105, y, { align: "center" });

        y += 15;
        doc.setDrawColor(200); doc.line(20, y, 190, y);

        y += 10;
        doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
        doc.text(`STUDENT: ${lName.toUpperCase()}, ${fName.toUpperCase()} (ID: ${studentId})`, 20, y);
        doc.text(`CLASS: ${sClass}`, 190, y, { align: "right" });

        y += 10;
        doc.text(`SCORE: ${finalScore} / ${finalTotal}`, 20, y);
        doc.text(`PERCENTAGE: ${finalPercentage}%`, 190, y, { align: "right" });

        y += 15;
        doc.setFontSize(16); doc.setTextColor(0, 51, 153); doc.text("DETAILED QUESTION REVIEW", 20, y);
        y += 5;
        doc.line(20, y, 190, y);
        y += 12;

        const feedbackMap = {};
        serverFeedback.forEach(item => feedbackMap[item.question.trim()] = item.hint);

        examQuestions.forEach((q, i) => {
            if (y > 250) { doc.addPage(); y = 20; }

            doc.setFontSize(11); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            const qText = doc.splitTextToSize(`Question ${i + 1}: ${q.question}`, 170);
            doc.text(qText, 20, y);
            y += (qText.length * 6);

            const studentChoice = userAnswers[i] !== undefined ? q.options[userAnswers[i]] : "Unanswered";
            const hint = feedbackMap[q.question.trim()];
            const isCorrect = !hint;

            doc.setFont("helvetica", "normal");
            if (isCorrect) { doc.setTextColor(0, 150, 0); }
            else { doc.setTextColor(200, 0, 0); }

            doc.text(`Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`, 25, y);
            y += 6;

            doc.setTextColor(0);
            doc.text(`Your Choice: ${studentChoice}`, 25, y);
            y += 8;

            if (!isCorrect && hint) {
                doc.setFontSize(10); doc.setTextColor(80);
                const hText = doc.splitTextToSize(`Study Hint: ${hint}`, 160);
                doc.setFillColor(245, 245, 245); doc.rect(25, y-1, 165, (hText.length * 5) + 4, 'F');
                doc.text(hText, 28, y + 4);
                y += (hText.length * 5) + 10;
            } else {
                y += 5;
            }
        });

        const safeTitle = (chapterTitle || "Assessment").replace(/\s+/g, '_');
        doc.save(`Summative_${lName}_${fName}_${safeTitle}.pdf`);
    } catch (err) {
        console.error("PDF Error:", err);
        showDacAlert("Download Error", "We couldn't generate the PDF automatically.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function processSubmission() {
    examIsActive = false;

    const lockdownStyle = document.getElementById('exam-lockdown-css');
    if (lockdownStyle) lockdownStyle.remove();

    const navEl = document.getElementById('nav-placeholder');
    const footerEl = document.getElementById('footer-placeholder');
    const footerNavEl = document.getElementById('footer-nav');
    if (navEl) navEl.style.display = 'block';
    if (footerEl) footerEl.style.display = 'block';
    if (footerNavEl) footerNavEl.style.display = 'block';

    const containerCol = document.getElementById('exam-container')?.parentElement;
    if (containerCol && containerCol.classList.contains('col-12')) {
        containerCol.classList.remove('col-12');
        containerCol.classList.add('col-lg-9');
    }

    const container = document.getElementById('exam-container');
    if (!container) return;

    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div><h3 class="mt-4 text-primary">Grading & Submitting...</h3></div>`;

    const payload = {
        studentId: String(studentId), firstName: fName, lastName: lName, studentClass: sClass,
        chapter: chapterTitle, testType: "Summative", notesUrl: "Side-by-Side Digital Notebook Module", total: examQuestions.length,
        answers: examQuestions.map((q, i) => ({
            question: q.question.trim(),
            selected: userAnswers[i] !== undefined ? q.options[userAnswers[i]].trim() : "Unanswered"
        }))
    };

    try {
        // Calculate score using MariaDB (not Google Sheets webhook)
        const totalQuestions = examQuestions.length;
        let correctCount = 0;
        const feedbackList = [];
        
        examQuestions.forEach((q, i) => {
            const userAnswerIdx = userAnswers[i];
            if (userAnswerIdx !== undefined && q.options && q.options.length > 0) {
                const userAnswer = q.options[userAnswerIdx];
                const correctAnswer = q.answer || (q.options ? q.options[0] : '');
                const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
                if (isCorrect) {
                    correctCount++;
                } else if (q.hint) {
                    feedbackList.push({ question: q.question.trim(), hint: q.hint });
                }
            }
        });
        
        finalScore = correctCount;
        finalTotal = totalQuestions;
        finalPercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        serverFeedback = feedbackList;
    } catch (err) {
        console.error("Scoring error:", err);
        finalScore = 0;
        finalTotal = examQuestions.length;
        finalPercentage = 0;
    }

// Delete saved progress from MariaDB
    try {
        await fetch(`/api/student/exam-progress?student_id=${encodeURIComponent(studentId)}&exam_id=${encodeURIComponent(examProgressId)}`, {
            method: 'DELETE'
        });
    } catch(e) { console.warn("Could not clear saved progress:", e); }

    // Save attempt data for tracking (increment count and set submission time)
    attemptCount++;
    lastSubmissionTime = Date.now();
    saveAttemptData();
    console.log("[examLogicCS] Attempt saved:", attemptCount, "at", new Date(lastSubmissionTime).toLocaleTimeString());

// Build assignment key for gradebook (e.g. "Unit1-Exam")
    const unitNumMatch = chapterTitle ? chapterTitle.match(/(?:unit|chapter|ch)\s*(\d+)/i) : null;
    const unitNum = unitNumMatch ? unitNumMatch[1] : (currentUnit || 1);
    // FIXED: Use format Unit1-Exam, Unit2-Exam, etc. for gradebook
    const finalAssignmentKey = `Unit${unitNum}-Exam`;

// "Keep highest" grade logic — check existing grade and keep the higher one
    try {
        let shouldSave = true;
        let existingScore = -1;
        const gradesRes = await fetch(`/api/student/grades?student_id=${encodeURIComponent(studentId)}`);
        if (gradesRes.ok) {
            const gradesData = await gradesRes.json();
            const existing = (gradesData.responses || []).find(r => r.exam_id === finalAssignmentKey);
            if (existing) {
                existingScore = Number(existing.score);
                // Only skip saving if existing score is HIGHER than new score (keep highest)
                if (existingScore > finalScore) {
                    shouldSave = false;
                    console.log("[examLogicCS] Keeping higher existing score:", existingScore, "vs new:", finalScore);
                } else {
                    console.log("[examLogicCS] New score is higher or equal, updating grade:", finalScore, "vs existing:", existingScore);
                }
            }
        }
        if (shouldSave) {
            const saveRes = await fetch('/api/submit-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    exam_id: finalAssignmentKey,
                    score: finalScore,
                    total_points: finalTotal
                })
            });
            if (!saveRes.ok) {
                console.error("Grade save failed:", await saveRes.text());
            } else {
                console.log("[examLogicCS] Grade saved:", finalAssignmentKey, finalScore, "/", finalTotal);
            }
        } else {
            console.log("[examLogicCS] Grade not saved (existing score higher):", finalAssignmentKey);
        }
    } catch(e) { console.warn("Could not save grade:", e); }

    let badgeHtml = '';
    if (finalPercentage >= 100) {
        badgeHtml = '<span class="badge rounded-pill badge-platinum shadow-sm ms-3 fs-5 align-middle"><i class="fas fa-crown text-dark me-1"></i> Platinum Rank</span>';
    } else if (finalPercentage >= 85) {
        badgeHtml = '<span class="badge rounded-pill badge-gold shadow-sm ms-3 fs-5 align-middle"><i class="fas fa-medal text-dark me-1"></i> Gold Rank</span>';
    } else if (finalPercentage >= 75) {
        badgeHtml = '<span class="badge rounded-pill badge-silver shadow-sm ms-3 fs-5 align-middle"><i class="fas fa-award text-dark me-1"></i> Silver Rank</span>';
    }

    const feedbackMap = {};
    serverFeedback.forEach(item => feedbackMap[item.question.trim()] = item.hint);

    // Cleanly structure HTML mapping to prevent IDE syntax parsers from breaking
    const reviewHtml = examQuestions.map((q, i) => {
        const studentChoice = userAnswers[i] !== undefined ? q.options[userAnswers[i]] : "Unanswered";
        const hint = feedbackMap[q.question.trim()];
        const isCorrect = !hint;
        
        const reviewBadgeHtml = isCorrect 
            ? `<span class="badge bg-success text-white me-2">✅ Correct</span>` 
            : `<span class="badge bg-danger text-white me-2">❌ Incorrect</span>`;
            
        const hintHtml = (!isCorrect && hint) 
            ? `<div class="mt-2 p-2 rounded bg-light border-start border-danger border-4"><p class="small mb-0 text-muted italic">💡 <strong>Study Hint:</strong> ${escapeHtml(hint)}</p></div>` 
            : '';

        return `
            <div class="mb-4 border-bottom pb-3 text-start">
                <p class="mb-1 fw-bold text-dark">Q${i + 1}: ${escapeHtml(q.question)}</p>
                <p class="mb-1 small">Your Answer: <span class="${isCorrect ? 'text-success' : 'text-danger'} fw-bold">${escapeHtml(studentChoice)}</span></p>
                <div class="d-flex align-items-center mt-1">
                    ${reviewBadgeHtml}
                </div>
                ${hintHtml}
            </div>`;
    }).join('');

    // Determine if retake is needed based on local percentage
    let isRetake = finalPercentage < 80;
    let boxStyle = isRetake ? "background-color: #FFF2CC; border: 2px solid #ffc107;" : "background-color: var(--site-secondary); border: 2px solid var(--primary-color);";
    let titleText = isRetake ? "Assessment Submitted - Retake Required" : "Assessment Submitted!";
    let titleColor = isRetake ? "text-warning" : "text-success";
    let retakeMsg = isRetake ? `<div class="alert alert-warning fw-bold mt-3"><i class="fas fa-exclamation-triangle"></i> Score is below 80%. You need to retake this test for exams and projects.</div>` : "";

    container.innerHTML = `
        <div class="card shadow border-success mx-auto text-center" style="max-width: 750px;">
            <div class="card-body p-4 p-md-5">
                <div class="display-4 mb-3 no-print">${isRetake ? '⚠️' : '✅'}</div>
                <h2 class="fw-bold ${titleColor} mb-3">${titleText}</h2>
                <div class="p-4 rounded text-start" style="${boxStyle}">
                    <h4 class="text-primary mb-1">${escapeHtml(lName)}, ${escapeHtml(fName)}</h4>
                    <p class="small text-muted mb-3">${sClass} | ${chapterTitle} | ID: ${studentId}</p>

                    <div class="d-flex align-items-center mt-2 mb-0">
                        <h1 class="display-3 fw-bold text-primary mb-0">${finalPercentage}%</h1>
                        ${badgeHtml}
                    </div>
                    ${retakeMsg}
                    <p class="fw-bold mt-2 mb-4 text-dark border-bottom pb-2">${finalScore} out of ${finalTotal} correct</p>

                    <div class="review-section mt-3" style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                        <h6 class="fw-bold text-primary mb-3">Detailed Performance Review:</h6>
                        ${reviewHtml}
                    </div>
                </div>
                <div class="mt-4 no-print d-flex justify-content-center gap-2">
                    <button onclick="downloadPDFReport(event)" class="btn btn-primary text-white px-4 shadow-sm">📥 Download PDF Report</button>
                    <button onclick="window.location.reload()" class="btn btn-outline-secondary px-4">Return to Portal</button>
                </div>
            </div>
        </div>`;
}

// ---------------------------------------------------------
// EXPLICIT GLOBAL BINDING
// ---------------------------------------------------------
window.initExam = initExam;
window.initAdaptiveExam = initExam; // Alias for HTML backward compatibility
window.fetchExamQuestionsFromAPI = fetchExamQuestionsFromAPI;
window.fetchQuestionsForWeightedMix = fetchQuestionsForWeightedMix;
window.getWeightedQuestions = getWeightedQuestions;
window.selectOption = selectOption;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.confirmSubmit = confirmSubmit;
window.processSubmission = processSubmission;
window.checkResume = checkResume;
window.downloadPDFReport = downloadPDFReport;

// FAILSAFE: Trigger window.onload manually if it was missed
setTimeout(() => {
    if (examQuestions && examQuestions.length === 0 && typeof window.onload === 'function') {
        try {
            window.onload();
        } catch(e) {
            console.error("Failsafe trigger error", e);
        }
    }
}, 500);