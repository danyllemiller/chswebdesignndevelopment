// /js/examLogicWD.js
/**
 * WEB DESIGN CHAPTER EXAM ENGINE (PROCTOR EDITION)
 * Uses MariaDB API + auth-guard.js. Mirrors js/examLogicCS.js's structure
 * (attempt limit, cooldown, tab lockdown, keep-highest grading) but pulls
 * from wd_questions per-chapter, with no cross-chapter question mixing or
 * unit-prerequisite gating (Web Design chapters aren't sequentially gated).
 */

const ENABLE_ATTEMPT_LIMIT = true;   // true = limit to 3 attempts, false = unlimited
const ENABLE_COOLDOWN = true;        // true = 45-min block after submit, false = no block
const ENABLE_WORKSHEET = true;       // true = show side-by-side notebook, false = quiz only
const MAX_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 45;

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
        color: #495057 !important; border: 2px solid #ced4da !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .badge-gold {
        background: linear-gradient(135deg, #ffd700 0%, #ffeb73 50%, #daa520 100%) !important;
        color: #664d03 !important; border: 2px solid #ffc107 !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .badge-silver {
        background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #a9a9a9 100%) !important;
        color: #495057 !important; border: 2px solid #adb5bd !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .dac-modal-content.urgent {
        border: 5px solid #dc3545 !important;
        animation: dacUrgentPulse 0.9s ease-in-out infinite;
    }
    .dac-modal-content.urgent #dac-modal-title {
        color: #dc3545 !important; font-size: 1.9rem;
    }
    .dac-modal-content.urgent #dac-modal-body {
        font-size: 1.3rem !important; font-weight: 700; color: #212529 !important;
    }
    @keyframes dacUrgentPulse {
        0%, 100% { box-shadow: 0 0 0 6px rgba(220,53,69,.3), 0 20px 50px rgba(0,0,0,.5); }
        50%      { box-shadow: 0 0 0 16px rgba(220,53,69,.05), 0 20px 50px rgba(0,0,0,.5); }
    }
`;
document.head.appendChild(customStyle);

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

function showDacConfirm(title, body, onConfirm, opts = {}) {
    injectModals();
    const overlay = document.getElementById('dac-modal-overlay');
    const titleEl = document.getElementById('dac-modal-title');
    const bodyEl = document.getElementById('dac-modal-body');
    const confirmBtn = document.getElementById('dac-modal-confirm');
    const cancelBtn = document.getElementById('dac-modal-cancel');

    titleEl.innerText = title;
    bodyEl.innerText = body;
    cancelBtn.style.display = 'inline-block';
    cancelBtn.innerText = opts.cancelText || "Cancel";
    confirmBtn.innerText = opts.confirmText || "Submit Assessment";
    overlay.style.display = 'flex';

    confirmBtn.onclick = () => { overlay.style.display = 'none'; onConfirm(); };
    cancelBtn.onclick = () => { overlay.style.display = 'none'; if (opts.onCancel) opts.onCancel(); };
}

function showDacAlert(title, body, opts = {}) {
    injectModals();
    const overlay = document.getElementById('dac-modal-overlay');
    const content = overlay.querySelector('.dac-modal-content');
    const titleEl = document.getElementById('dac-modal-title');
    const bodyEl = document.getElementById('dac-modal-body');
    const confirmBtn = document.getElementById('dac-modal-confirm');
    const cancelBtn = document.getElementById('dac-modal-cancel');

    titleEl.innerText = title;
    bodyEl.innerText = body;
    cancelBtn.style.display = 'none';
    confirmBtn.innerText = "OK";
    content.classList.toggle('urgent', !!opts.urgent);
    overlay.style.display = 'flex';

    confirmBtn.onclick = () => { overlay.style.display = 'none'; };
}

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

let examQuestions = [];
let userAnswers = {};
let flaggedQuestions = {}; // { [questionIndex]: true } -- questions the student marked to revisit
let currentIndex = 0;
let fName = "Unverified";
let lName = "";
let sClass = "N/A";
let studentId = "";
let chapterTitle = "";
let examIsActive = false;
let examProgressId = "";
let currentChapter = 1;

const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
let attemptCount = 0;
let lastSubmissionTime = 0;

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
    if (ENABLE_ATTEMPT_LIMIT && attemptCount >= MAX_ATTEMPTS) {
        return { allowed: false, reason: 'attempts', message: `You have reached the maximum of ${MAX_ATTEMPTS} attempts for this exam.` };
    }
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

// Same formula as admin/daily-agenda.html's unlabeled corner stamp -- a
// deterministic per-day 6-digit code, purely client-side (no server round
// trip, no DB row, both servers naturally agree since it's just today's
// date through the same hash). Typing it here clears the cooldown early.
function dailyOverrideCode() {
    const d = new Date();
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const input = dateStr + 'chs-guild-2026';
    let hash = 0;
    for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    return String(hash % 1000000).padStart(6, '0');
}

function showCooldownMessage(remainingMs) {
    const container = document.getElementById('exam-container');
    if (!container) return;
    const cooldownEndTime = lastSubmissionTime + COOLDOWN_MS;
    container.innerHTML = `
        <div class="alert alert-warning text-center shadow">
            <h4 class="fw-bold text-warning"><i class="fas fa-clock"></i> Cooldown Period</h4>
            <p>You recently submitted this exam. You must wait before retaking it.</p>
            <div class="display-4 my-4 fw-bold text-primary" id="cooldown-countdown"><strong>--:--</strong></div>
            <p class="small text-muted">This page will automatically refresh when the cooldown ends.</p>
            <a href="#" id="override-toggle-link" class="small text-muted">Override</a>
            <div id="override-box" class="d-none mt-2">
                <div class="input-group input-group-sm mx-auto" style="max-width: 220px;">
                    <input type="text" id="override-code-input" class="form-control text-center" maxlength="6" inputmode="numeric">
                    <button class="btn btn-outline-secondary" id="override-submit-btn">Go</button>
                </div>
            </div>
        </div>`;
    document.getElementById('override-toggle-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('override-box')?.classList.remove('d-none');
        document.getElementById('override-code-input')?.focus();
    });
    document.getElementById('override-submit-btn')?.addEventListener('click', () => {
        const input = document.getElementById('override-code-input');
        if (input && input.value.trim() === dailyOverrideCode()) {
            lastSubmissionTime = 0;
            saveAttemptData();
            window.location.reload();
        } else if (input) {
            input.value = '';
            input.placeholder = 'Try again';
        }
    });
    document.getElementById('override-code-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('override-submit-btn')?.click(); }
    });
    const updateCountdown = () => {
        const remaining = cooldownEndTime - Date.now();
        if (remaining <= 0) { window.location.reload(); return; }
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const countdownEl = document.getElementById('cooldown-countdown');
        if (countdownEl) countdownEl.innerHTML = `<strong>${mins}:${secs.toString().padStart(2, '0')}</strong>`;
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

async function fetchExamQuestionsFromAPI(chapterNum) {
    try {
        const response = await fetch(`/api/wd-exam-questions?chapter=${chapterNum}`);
        if (!response.ok) throw new Error('Failed to fetch questions: ' + response.status);
        const data = await response.json();
        return data.questions || [];
    } catch (e) {
        console.error("[examLogicWD] Exception fetching questions:", e.message);
        return [];
    }
}

async function fetchMatchingQuestionsFromAPI(chapterNum) {
    try {
        const response = await fetch(`/api/wd-exam-matching?chapter=${chapterNum}`);
        if (!response.ok) throw new Error('Failed to fetch matching questions: ' + response.status);
        const data = await response.json();
        return data.questions || [];
    } catch (e) {
        console.error("[examLogicWD] Exception fetching matching questions:", e.message);
        return [];
    }
}

async function fetchImageLabelingQuestionsFromAPI(chapterNum) {
    try {
        const response = await fetch(`/api/wd-exam-image-labeling?chapter=${chapterNum}`);
        if (!response.ok) throw new Error('Failed to fetch image labeling questions: ' + response.status);
        const data = await response.json();
        return data.questions || [];
    } catch (e) {
        console.error("[examLogicWD] Exception fetching image labeling questions:", e.message);
        return [];
    }
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

// Single source of truth for "what did the student answer, and was it
// right" -- used by the score tally, the on-screen review, the PDF report,
// and the missed-questions capture, so the four can never drift apart on
// what counts as correct again. (A past bug had the PDF report inferring
// correctness from "does a hint exist" instead of comparing the actual
// answer, which showed every question as CORRECT regardless of the real
// answer -- three/four separately-maintained copies of this exact logic is
// exactly how that kind of bug happens.)
function gradeQuestion(q, answer) {
    if (q.type === 'matching') {
        const answers = answer || {};
        const truePairs = q.pairs || [];
        const correctPairs = truePairs.filter(p => answers[p.item] === p.target).length;
        return {
            studentChoice: truePairs.length > 0 ? `${correctPairs} of ${truePairs.length} matched correctly` : 'Unanswered',
            isCorrect: truePairs.length > 0 && correctPairs === truePairs.length,
            partialCredit: truePairs.length > 0 ? correctPairs / truePairs.length : 0
        };
    }
    if (q.type === 'image_label') {
        const answers = answer || {};
        const trueZones = q.answerZones || [];
        const correctZones = trueZones.filter(z => answers[z.key] === z.label).length;
        return {
            studentChoice: trueZones.length > 0 ? `${correctZones} of ${trueZones.length} labeled correctly` : 'Unanswered',
            isCorrect: trueZones.length > 0 && correctZones === trueZones.length,
            partialCredit: trueZones.length > 0 ? correctZones / trueZones.length : 0
        };
    }
    const isAnswered = answer !== undefined && q.options && q.options.length > 0;
    const studentChoice = isAnswered ? q.options[answer] : 'Unanswered';
    const correctAnswer = q.answer || (q.options ? q.options[0] : '');
    const isCorrect = isAnswered && studentChoice.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    return { studentChoice, isCorrect, partialCredit: isCorrect ? 1 : 0, isAnswered };
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
        if (window.__timeclockModalOpen) return;
        if (examIsActive && document.visibilityState === 'hidden') {
            tabSwitchCount++;
            if (tabSwitchCount === 1) {
                showDacAlert(
                    "⚠️ SECURITY WARNING",
                    "You have switched tabs or left the exam window. This is your ONLY warning. If you leave the exam screen again, your test will be automatically submitted with your current score.",
                    { urgent: true }
                );
            } else if (tabSwitchCount >= 2) {
                examIsActive = false;
                window.examIsActive = false;
                showDacAlert(
                    "🚨 SECURITY VIOLATION",
                    "You left the exam screen multiple times. Your exam has been locked and submitted automatically."
                );
                processSubmission();
            }
        }
    });
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

async function initExam(config) {
    currentChapter = config.chapter || 1;

    // questionTypes = {mc, tf, matching, image_label} -- how many of each to
    // draw for this chapter's exam (EOP-style rework). Omitting it keeps the
    // original all-MC behavior for every other chapter untouched.
    const types = config.questionTypes || null;
    const pool = await fetchExamQuestionsFromAPI(currentChapter);

    if (types) {
        const mcPool = shuffleArray(pool.filter(q => q.type === 'mc' || !q.type));
        const tfPool = shuffleArray(pool.filter(q => q.type === 'tf'));
        const matchingPool = (types.matching > 0) ? shuffleArray(await fetchMatchingQuestionsFromAPI(currentChapter)) : [];
        const imageLabelPool = (types.image_label > 0) ? shuffleArray(await fetchImageLabelingQuestionsFromAPI(currentChapter)) : [];

        examQuestions = shuffleArray([
            ...mcPool.slice(0, types.mc || 0),
            ...tfPool.slice(0, types.tf || 0),
            ...matchingPool.slice(0, types.matching || 0),
            ...imageLabelPool.slice(0, types.image_label || 0)
        ]);
    } else {
        const shuffledPool = shuffleArray(pool);
        const count = config.questionCount || Math.min(20, shuffledPool.length);
        examQuestions = shuffledPool.slice(0, count);
    }

    // Matching/image-label questions arrive with their items/targets/labels
    // already shuffled server-side (server/routes/assessments.js) -- only mc
    // needs its options reshuffled here. True/False stays exactly as the
    // server sends it (['True','False'], from option_a/option_b) -- shuffling
    // a 2-option T/F question doesn't add any real randomness (a 50/50 flip
    // either way) and just makes "True" sometimes render second, which reads
    // as inconsistent/wrong to a student used to seeing True first.
    examQuestions = examQuestions.map(q => {
        if (q.type !== 'mc') return q;
        return { ...q, options: shuffleArray(q.options) };
    });

    chapterTitle = config.chapterTitle || document.title || "Assessment";
    userAnswers = {};
    currentIndex = 0;

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

    const windowGate = await checkTestingWindow();
    if (!windowGate.ok) {
        renderTestingWindowBlock(windowGate.reason, windowGate.label);
        return;
    }

    renderAuthScreen();
}

// Tests only open 7am-4pm on real school days -- real enforcement is
// server-side in /api/submit-exam, this is just the up-front locked screen.
async function checkTestingWindow() {
    try {
        const res = await fetch('/api/exam/testing-window-status');
        if (!res.ok) return { ok: true }; // fail open on an API hiccup
        return await res.json();
    } catch (e) {
        console.error('[examLogicWD] Testing window check failed:', e);
        return { ok: true };
    }
}

function renderTestingWindowBlock(reason, label) {
    const container = document.getElementById('exam-container');
    if (!container) return;
    const message = reason === 'holiday'
        ? `Testing is closed today (${label}). Please wait until the next school day.`
        : reason === 'weekend'
            ? 'Testing is only open 7am-4pm on school days -- not weekends.'
            : 'Testing is only open 7am-4pm on school days. Please try again during school hours.';
    container.innerHTML = `
        <div class="alert alert-warning text-center shadow p-5">
            <h4 class="fw-bold"><i class="fas fa-lock me-2"></i>Testing Closed</h4>
            <p class="mb-4">${escapeHtml(message)}</p>
            <a href="/student" class="btn btn-warning fw-bold">&laquo; Back to Portal</a>
        </div>`;
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

    loadAttemptData();
    const examPermission = canTakeExam();
    if (!examPermission.allowed) {
        if (examPermission.reason === 'attempts') { showAttemptLimitMessage(); return; }
        if (examPermission.reason === 'cooldown') { showCooldownMessage(examPermission.remainingMs); return; }
    }

    const container = document.getElementById('exam-container');
    if (!container) return;

    container.innerHTML = `
        <div class="card shadow border-primary mx-auto" style="max-width: 550px;">
            <div class="card-header bg-primary text-center py-3">
                <h4 class="mb-0 text-white gochi">Chapter Exam</h4>
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
                        flaggedQuestions = data.flaggedQuestions || {};
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
    window.examIsActive = true; // read by js/student/timeclock.js's checkAutoPopup, so the clock-out reminder defers instead of covering an active test

    if (!document.getElementById('exam-lockdown-css')) {
        const lockdownStyle = document.createElement('style');
        lockdownStyle.id = 'exam-lockdown-css';
        lockdownStyle.innerHTML = `
            nav, footer, .footer, .site-footer, #nav-placeholder, #footer-placeholder, #footer-nav, .back-to-top {
                display: none !important; opacity: 0 !important; pointer-events: none !important;
                height: 0 !important; overflow: hidden !important;
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
                                <iframe src="/student/notes.html" onload="window.lockdownIframe(this)" style="width: 100%; height: 100%; border: none;"></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            examContainer.innerHTML = `<div class="row g-4"><div class="col-12" id="quiz-pane"></div></div>`;
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
            body: JSON.stringify({ student_id: studentId, exam_id: examProgressId, currentIndex, userAnswers, flaggedQuestions, examQuestions, timestamp: Date.now() })
        });
    } catch (err) {
        console.error("Failed to sync progress:", err);
    }
}

function renderQuestion() {
    const pane = document.getElementById('quiz-pane');
    if (!pane) return;

    if (!examQuestions || examQuestions.length === 0) {
        pane.innerHTML = `
            <div class="alert alert-danger text-center">
                <h4>No Questions Available</h4>
                <p>Please contact your instructor - the question bank is empty for this chapter.</p>
            </div>`;
        return;
    }

    const q = examQuestions[currentIndex];
    const isFlagged = !!flaggedQuestions[currentIndex];

    const optionsHtml = q.type === 'matching' ? renderMatchingQuestion(q) : q.type === 'image_label' ? renderImageLabelingQuestion(q) : q.options.map((opt, i) => {
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

    const progressPercent = (currentIndex / examQuestions.length) * 100;
    const isLastQuestion = currentIndex === examQuestions.length - 1;
    const btnAction = isLastQuestion ? "confirmSubmit()" : "nextQuestion()";
    const btnText = isLastQuestion ? "Submit Test" : "Next";
    const prevDisabled = currentIndex === 0 ? "disabled" : "";
    // Students can move on without answering -- a question map lets them see
    // and jump to every question, so they can skim ahead and come back
    // rather than being blocked one at a time. Unanswered ones are caught
    // and listed for them right before final submit instead (confirmSubmit).
    const flagBtnClass = isFlagged ? "btn-warning" : "btn-outline-warning";
    const flagBtnLabel = isFlagged ? "Flagged" : "Flag for Review";

    const paletteHtml = examQuestions.map((qq, i) => {
        const answered = userAnswers[i] !== undefined;
        const flagged = !!flaggedQuestions[i];
        let cls = answered ? 'btn-secondary text-white' : 'btn-outline-secondary';
        if (flagged) cls = 'btn-warning';
        if (i === currentIndex) cls += ' border-primary border-3';
        const titleBits = [flagged ? 'flagged' : null, answered ? 'answered' : 'unanswered'].filter(Boolean).join(', ');
        return `<button type="button" class="btn btn-sm ${cls}" style="width: 2.5rem;" onclick="goToQuestion(${i})" title="Question ${i + 1} (${titleBits})">${i + 1}</button>`;
    }).join(' ');

    pane.innerHTML = `
        <div class="card shadow-sm border-0 h-100 p-4">
            <div class="text-center mb-4">
                <div class="d-flex justify-content-between small text-muted mb-2">
                    <span><strong>Student:</strong> ${escapeHtml(lName)}, ${escapeHtml(fName)} (${sClass})</span>
                </div>
                <div class="progress mb-3 no-print" style="height: 10px; background-color: var(--secondary-color);">
                    <div class="progress-bar bg-primary" style="width: ${progressPercent}%"></div>
                </div>
                <div class="d-flex flex-wrap justify-content-center gap-1 mb-3 no-print" aria-label="Jump to any question">${paletteHtml}</div>
                <div class="d-flex justify-content-between align-items-start gap-2">
                    <div class="text-start">
                        <h5 class="fw-bold text-primary mb-1">Question ${currentIndex + 1} of ${examQuestions.length}</h5>
                        <p class="small text-muted mb-0">${chapterTitle}</p>
                    </div>
                    <button class="btn btn-sm ${flagBtnClass} fw-bold no-print flex-shrink-0" onclick="toggleFlag()" title="Mark this question to come back to later">
                        <i class="fas fa-flag me-1"></i>${flagBtnLabel}
                    </button>
                </div>
                <h4 class="fw-bold text-dark lh-base mt-3" style="color: var(--primary-color);">${escapeHtml(q.question)}</h4>
            </div>
            <div class="row mt-4 px-2">${optionsHtml}</div>
            <div class="d-flex justify-content-between mt-auto pt-4 border-top px-2 no-print">
                <button class="btn btn-outline-primary px-4 shadow-sm fw-bold" onclick="prevQuestion()" ${prevDisabled}>Previous</button>
                <button class="btn btn-primary px-5 shadow-sm fw-bold" onclick="${btnAction}">${btnText}</button>
            </div>
        </div>`;

    syncProgress();
}

// Drag-and-drop matching/labeling questions. userAnswers[currentIndex] holds
// a plain {item: target} map as pairs get placed (built up incrementally,
// not all-or-nothing) -- graded for partial credit in processSubmission.
let selectedMatchItem = null;

function renderMatchingQuestion(q) {
    const answers = userAnswers[currentIndex] || {};

    const itemsHtml = q.items.map(item => {
        const isPlaced = answers[item] !== undefined;
        const isSelected = selectedMatchItem === item;
        const cls = isPlaced ? 'border-success bg-light' : (isSelected ? 'border-primary bg-site-secondary' : 'border-secondary');
        return `
            <div class="matching-item card shadow-sm mb-2 ${cls}"
                 draggable="${isPlaced ? 'false' : 'true'}"
                 ondragstart="matchDragStart(event, '${escapeHtml(item).replace(/'/g, "\\'")}')"
                 onclick="matchItemClick('${escapeHtml(item).replace(/'/g, "\\'")}')"
                 style="cursor:pointer; border-width:2px !important;">
                <div class="card-body py-2 px-3 fw-bold small d-flex justify-content-between align-items-center">
                    <span>${escapeHtml(item)}</span>
                    ${isPlaced ? '<i class="fas fa-check-circle text-success"></i>' : ''}
                </div>
            </div>`;
    }).join('');

    const targetsHtml = q.targets.map(target => {
        const matchedItem = Object.keys(answers).find(item => answers[item] === target);
        return `
            <div class="matching-target card shadow-sm mb-2 ${matchedItem ? 'border-success' : 'border-secondary'}"
                 ondragover="event.preventDefault()"
                 ondrop="matchDrop(event, '${escapeHtml(target).replace(/'/g, "\\'")}')"
                 onclick="matchTargetClick('${escapeHtml(target).replace(/'/g, "\\'")}')"
                 style="cursor:pointer; border-width:2px !important; min-height:58px;">
                <div class="card-body py-2 px-3 small d-flex justify-content-between align-items-center">
                    <span>${escapeHtml(target)}</span>
                    ${matchedItem
                        ? `<span class="badge bg-success ms-2">${escapeHtml(matchedItem)}</span>`
                        : '<span class="text-muted fst-italic small ms-2">drop here</span>'}
                </div>
            </div>`;
    }).join('');

    return `
        <div class="col-12">
            <p class="text-muted small mb-3"><i class="fas fa-arrows-alt me-1"></i>Drag each item onto its match on the right &mdash; or click an item, then click its match. Click a placed item to undo it.</p>
        </div>
        <div class="col-md-6">
            <h6 class="fw-bold small text-muted mb-2">ITEMS</h6>
            ${itemsHtml}
        </div>
        <div class="col-md-6">
            <h6 class="fw-bold small text-muted mb-2">MATCH TO</h6>
            ${targetsHtml}
        </div>`;
}

function placeMatch(item, target) {
    const answers = { ...(userAnswers[currentIndex] || {}) };
    // A target or item already in use gets freed before the new pairing --
    // one item per target, one target per item.
    Object.keys(answers).forEach(k => { if (answers[k] === target) delete answers[k]; });
    delete answers[item];
    answers[item] = target;
    userAnswers[currentIndex] = answers;
    selectedMatchItem = null;
    renderQuestion();
}

function matchDragStart(event, item) {
    event.dataTransfer.setData('text/plain', item);
}
function matchDrop(event, target) {
    event.preventDefault();
    const item = event.dataTransfer.getData('text/plain');
    if (item) placeMatch(item, target);
}
function matchItemClick(item) {
    const answers = userAnswers[currentIndex] || {};
    if (answers[item] !== undefined) {
        // Already placed -- clicking it again undoes that pairing.
        const updated = { ...answers };
        delete updated[item];
        userAnswers[currentIndex] = Object.keys(updated).length ? updated : undefined;
        renderQuestion();
        return;
    }
    selectedMatchItem = (selectedMatchItem === item) ? null : item;
    renderQuestion();
}
function matchTargetClick(target) {
    if (!selectedMatchItem) return;
    placeMatch(selectedMatchItem, target);
}

// Image labeling: drag/click a text label onto a percentage-positioned zone
// overlaid on a diagram image. userAnswers[currentIndex] holds a plain
// {zoneKey: label} map, same shape/spirit as matching's {item: target}.
let selectedImageLabel = null;

function renderImageLabelingQuestion(q) {
    const answers = userAnswers[currentIndex] || {};
    const usedLabels = new Set(Object.values(answers));

    const zonesHtml = q.zones.map(zone => {
        const placedLabel = answers[zone.key];
        const borderColor = placedLabel ? 'rgba(25,135,84,.85)' : 'rgba(13,110,253,.6)';
        const bgColor = placedLabel ? 'rgba(25,135,84,.18)' : 'rgba(13,110,253,.08)';
        return `
            <div class="labeling-zone"
                 ondragover="event.preventDefault()"
                 ondrop="imageLabelDrop(event, '${escapeHtml(zone.key)}')"
                 onclick="imageZoneClick('${escapeHtml(zone.key)}')"
                 style="position:absolute; left:${zone.left}%; top:${zone.top}%; width:${zone.width}%; height:${zone.height}%;
                        border:3px dashed ${borderColor}; background:${bgColor}; border-radius:6px; padding:2px;
                        display:flex; align-items:center; justify-content:center; text-align:center; cursor:pointer;">
                ${placedLabel ? `<span class="badge bg-success" style="font-size:.68rem; white-space:normal;">${escapeHtml(placedLabel)}</span>` : ''}
            </div>`;
    }).join('');

    // Labels run in a horizontal row across the top rather than a side
    // column, so the image itself -- the thing students actually need to
    // read closely -- gets the full width instead of giving up a third of
    // it to a vertical list.
    const paletteHtml = q.labels.map(label => {
        const isPlaced = usedLabels.has(label);
        const isSelected = selectedImageLabel === label;
        const cls = isPlaced ? 'border-success bg-light' : (isSelected ? 'border-primary bg-site-secondary' : 'border-secondary');
        return `
            <div class="shadow-sm ${cls}"
                 draggable="${isPlaced ? 'false' : 'true'}"
                 ondragstart="imageLabelDragStart(event, '${escapeHtml(label).replace(/'/g, "\\'")}')"
                 onclick="imageLabelClick('${escapeHtml(label).replace(/'/g, "\\'")}')"
                 style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; border-width:2px !important; border-style:solid; border-radius:20px; padding:6px 14px; font-weight:bold; font-size:.78rem; background:#fff; white-space:nowrap;">
                <span>${escapeHtml(label)}</span>
                ${isPlaced ? '<i class="fas fa-check-circle text-success"></i>' : ''}
            </div>`;
    }).join('');

    return `
        <div class="col-12 mb-2">
            <p class="text-muted small mb-2"><i class="fas fa-arrows-alt me-1"></i>Drag each label onto its correct spot on the image &mdash; or click a label, then click its spot. Click a placed label (or its spot) to undo it.</p>
            <div class="d-flex flex-wrap gap-2 mb-3">
                ${paletteHtml}
            </div>
        </div>
        <div class="col-12">
            <div style="position:relative; width:100%; border-radius:8px; overflow:hidden; border:1px solid #dee2e6; box-shadow:0 2px 8px rgba(0,0,0,.1);">
                <img src="${q.imageUrl}" style="width:100%; display:block;" draggable="false">
                ${zonesHtml}
            </div>
        </div>`;
}

function placeImageLabel(zoneKey, label) {
    const answers = { ...(userAnswers[currentIndex] || {}) };
    Object.keys(answers).forEach(k => { if (answers[k] === label) delete answers[k]; });
    delete answers[zoneKey];
    answers[zoneKey] = label;
    userAnswers[currentIndex] = answers;
    selectedImageLabel = null;
    renderQuestion();
}

function imageLabelDragStart(event, label) {
    event.dataTransfer.setData('text/plain', label);
}
function imageLabelDrop(event, zoneKey) {
    event.preventDefault();
    const label = event.dataTransfer.getData('text/plain');
    if (label) placeImageLabel(zoneKey, label);
}
function imageLabelClick(label) {
    const answers = userAnswers[currentIndex] || {};
    const placedZone = Object.keys(answers).find(k => answers[k] === label);
    if (placedZone) {
        const updated = { ...answers };
        delete updated[placedZone];
        userAnswers[currentIndex] = Object.keys(updated).length ? updated : undefined;
        renderQuestion();
        return;
    }
    selectedImageLabel = (selectedImageLabel === label) ? null : label;
    renderQuestion();
}
function imageZoneClick(zoneKey) {
    const answers = userAnswers[currentIndex] || {};
    if (!selectedImageLabel) {
        if (answers[zoneKey] !== undefined) {
            const updated = { ...answers };
            delete updated[zoneKey];
            userAnswers[currentIndex] = Object.keys(updated).length ? updated : undefined;
            renderQuestion();
        }
        return;
    }
    placeImageLabel(zoneKey, selectedImageLabel);
}

function selectOption(idx) { userAnswers[currentIndex] = idx; renderQuestion(); }
function nextQuestion() { selectedMatchItem = null; selectedImageLabel = null; currentIndex++; renderQuestion(); }
function prevQuestion() { selectedMatchItem = null; selectedImageLabel = null; currentIndex--; renderQuestion(); }
function goToQuestion(i) { if (i >= 0 && i < examQuestions.length) { selectedMatchItem = null; selectedImageLabel = null; currentIndex = i; renderQuestion(); } }
function toggleFlag() { flaggedQuestions[currentIndex] = !flaggedQuestions[currentIndex]; renderQuestion(); }

function confirmSubmit() {
    const unanswered = examQuestions.map((_, i) => i).filter(i => userAnswers[i] === undefined);

    if (unanswered.length > 0) {
        const list = unanswered.map(i => i + 1).join(', ');
        const plural = unanswered.length > 1;
        showDacConfirm(
            "You Have Unanswered Questions",
            `Question${plural ? 's' : ''} ${list} ${plural ? "don't" : "doesn't"} have an answer selected yet. If you submit now, ${plural ? 'they' : 'it'} will be scored as incorrect.\n\nGo back and answer ${plural ? 'them' : 'it'}, or submit anyway?`,
            processSubmission,
            { confirmText: "Submit Anyway", cancelText: "Go Back", onCancel: () => goToQuestion(unanswered[0]) }
        );
        return;
    }

    showDacConfirm(
        "Submit Chapter Exam?",
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
        doc.text("CHAPTER EXAM REPORT", 105, y, { align: "center" });
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

            const { studentChoice, isCorrect } = gradeQuestion(q, userAnswers[i]);
            const hint = !isCorrect ? feedbackMap[q.question.trim()] : undefined;

            doc.setFont("helvetica", "normal");
            doc.setTextColor(isCorrect ? 0 : 200, isCorrect ? 150 : 0, 0);
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
        doc.save(`ChapterExam_${lName}_${fName}_${safeTitle}.pdf`);
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
    window.examIsActive = false;

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

    const totalQuestions = examQuestions.length;
    let correctCount = 0; // can be fractional -- a matching question earns partial credit
    const feedbackList = [];
    // Per-question detail for the Most Missed Questions report
    // (server/routes/missed-questions.js) -- this used to only exist
    // transiently in a student's downloaded PDF, so a teacher had to
    // physically collect PDFs to see it. Recording it here, on every real
    // submission, means it's captured automatically going forward.
    const questionDetails = [];
    const MATCHED_TABLE_BY_TYPE = { matching: 'wd_matching_questions', image_label: 'wd_image_labeling_questions' };
    examQuestions.forEach((q, i) => {
        const { studentChoice, isCorrect, partialCredit, isAnswered } = gradeQuestion(q, userAnswers[i]);
        correctCount += partialCredit;
        if (isAnswered && !isCorrect && q.hint) feedbackList.push({ question: q.question.trim(), hint: q.hint });
        questionDetails.push({
            question_id: q.id, matched_table: MATCHED_TABLE_BY_TYPE[q.type] || 'wd_questions',
            question_text: q.question, student_choice: studentChoice, is_correct: isCorrect ? 1 : 0
        });
    });
    // Scored the same way CS scores its unit/final exams: raw correct count
    // out of however many items are actually on this attempt, not
    // normalized to a flat 100 (or any other fixed total) -- a matching
    // question still earns fractional credit for partially-correct pairs,
    // it just doesn't get rescaled afterward.
    finalScore = Math.round(correctCount * 100) / 100;
    finalTotal = totalQuestions;
    finalPercentage = finalTotal > 0 ? Math.round((finalScore / finalTotal) * 100) : 0;
    serverFeedback = feedbackList;

    try {
        await fetch(`/api/student/exam-progress?student_id=${encodeURIComponent(studentId)}&exam_id=${encodeURIComponent(examProgressId)}`, { method: 'DELETE' });
    } catch(e) { console.warn("Could not clear saved progress:", e); }

    attemptCount++;
    lastSubmissionTime = Date.now();
    saveAttemptData();

    const finalAssignmentKey = `Ch${currentChapter}-Exam`;

    try {
        let shouldSave = true;
        const gradesRes = await fetch(`/api/student/grades?student_id=${encodeURIComponent(studentId)}`);
        if (gradesRes.ok) {
            const gradesData = await gradesRes.json();
            const existing = (gradesData.responses || []).find(r => r.exam_id === finalAssignmentKey);
            if (existing) {
                const existingScore = Number(existing.score);
                if (existingScore > finalScore) shouldSave = false;
            }
        }
        if (shouldSave) {
            const saveRes = await fetch('/api/submit-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId, exam_id: finalAssignmentKey, score: finalScore, total_points: finalTotal,
                    chapter_title: chapterTitle, report_type: 'CHAPTER EXAM REPORT', question_details: questionDetails
                })
            });
            if (!saveRes.ok && saveRes.status === 503) {
                try {
                    const errBody = await saveRes.json();
                    if (errBody.testingPaused) alert(errBody.error);
                } catch {}
            }
        }
    } catch(e) { console.warn("Could not save grade:", e); }

    let badgeHtml = '';
    if (finalPercentage >= 100) badgeHtml = '<span class="badge rounded-pill badge-platinum shadow-sm ms-3 fs-5 align-middle"><i class="fas fa-crown text-dark me-1"></i> Platinum Rank</span>';
    else if (finalPercentage >= 85) badgeHtml = '<span class="badge rounded-pill badge-gold shadow-sm ms-3 fs-5 align-middle"><i class="fas fa-medal text-dark me-1"></i> Gold Rank</span>';
    else if (finalPercentage >= 75) badgeHtml = '<span class="badge rounded-pill badge-silver shadow-sm ms-3 fs-5 align-middle"><i class="fas fa-award text-dark me-1"></i> Silver Rank</span>';

    const feedbackMap = {};
    serverFeedback.forEach(item => feedbackMap[item.question.trim()] = item.hint);

    const reviewHtml = examQuestions.map((q, i) => {
        const { studentChoice, isCorrect } = gradeQuestion(q, userAnswers[i]);
        const hint = !isCorrect ? feedbackMap[q.question.trim()] : undefined;
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
                <div class="d-flex align-items-center mt-1">${reviewBadgeHtml}</div>
                ${hintHtml}
            </div>`;
    }).join('');

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
                    <p class="fw-bold mt-2 mb-4 text-dark border-bottom pb-2">${finalScore} out of ${finalTotal} points</p>
                    <div class="review-section mt-3" style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                        <h6 class="fw-bold text-primary mb-3">Detailed Performance Review:</h6>
                        ${reviewHtml}
                    </div>
                </div>
                <div class="mt-4 no-print d-flex justify-content-center gap-2">
                    <button onclick="downloadPDFReport(event)" class="btn btn-primary text-white px-4 shadow-sm">📥 Download PDF Report</button>
                    <a href="/student" class="btn btn-primary px-4 shadow-sm">&laquo; Back to Portal</a>
                </div>
            </div>
        </div>`;
}

window.initExam = initExam;
window.initAdaptiveExam = initExam; // alias for the existing per-page inline config calls
window.selectOption = selectOption;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.confirmSubmit = confirmSubmit;
window.processSubmission = processSubmission;
window.checkResume = checkResume;
window.downloadPDFReport = downloadPDFReport;
