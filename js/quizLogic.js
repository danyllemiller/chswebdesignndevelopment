 /**
 * REUSABLE PRE-TEST ENGINE (DIAGNOSTIC EDITION)
 * MIGRATED: Firebase removed. Uses MariaDB API + auth-guard.js.
 */

// --- Dependencies Injection ---
const libs = [
    { id: 'jspdf-lib', src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' },
    { id: 'pdf-lib', src: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js' }
];

libs.forEach(lib => {
    if (!document.getElementById(lib.id)) {
        const s = document.createElement('script');
        s.id = lib.id;
        s.src = lib.src;
        document.head.appendChild(s);
    }
});

// Inject Custom Modal & Print Styles
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

    /* Custom DAC Modal UI */
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
`;
document.head.appendChild(customStyle);

// Create Modal structure on load
window.addEventListener('DOMContentLoaded', () => {
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
    document.body.insertAdjacentHTML('beforeend', modalHtml);
});

function showDacConfirm(title, body, onConfirm) {
    const overlay = document.getElementById('dac-modal-overlay');
    const titleEl = document.getElementById('dac-modal-title');
    const bodyEl = document.getElementById('dac-modal-body');
    const confirmBtn = document.getElementById('dac-modal-confirm');
    const cancelBtn = document.getElementById('dac-modal-cancel');

    // FIX: Check if modal elements exist before trying to use them
    // If they don't exist yet, create them dynamically
    if (!overlay || !titleEl || !bodyEl) {
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
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        // Re-fetch elements after creation
        return showDacConfirm(title, body, onConfirm);
    }

    titleEl.innerText = title;
    bodyEl.innerText = body;
    cancelBtn.style.display = 'inline-block';
    confirmBtn.innerText = "Submit Assessment";
    overlay.style.display = 'flex';

    confirmBtn.onclick = () => { overlay.style.display = 'none'; onConfirm(); };
    cancelBtn.onclick = () => { overlay.style.display = 'none'; };
}

function showDacAlert(title, body) {
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

let serverFeedback = [];
let finalScore = 0;
let finalTotal = 0;
let finalPercentage = 0;
let gradebookExamId = "";

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function initPreTest(config) {
    let pool = shuffleArray([...config.questions]);
    examQuestions = pool.slice(0, 10).map(q => ({ ...q, options: shuffleArray([...q.options]) }));
    webhookUrl = config.webhookUrl;
    chapterTitle = config.chapterTitle;

    // Pre-compute the gradebook exam_id so processResults uses a consistent key.
    // config.gradebookExamId is an explicit override; config.chapter is the unit/chapter number.
    gradebookExamId = config.gradebookExamId || '';
    if (!gradebookExamId && config.chapter !== undefined && config.chapter !== null) {
        const chStr = String(config.chapter).toUpperCase();
        const isCSPath = window.location.pathname.includes('/cs-') || window.location.pathname.includes('cs-unit');
        gradebookExamId = isCSPath ? `Unit${chStr}-Pre` : `Ch${chStr} Pre-Assessment [15 pts]`;
    }

    const container = document.getElementById('exam-container');
    if (container) {
        container.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2 fw-bold text-primary">Connecting to Database & Verifying Roster...</p>
            </div>`;
    }

    const authData = await waitForAuth();
    if (!authData.isAuthenticated) {
        window.top.location.replace(`/login.html?redirect=${encodeURIComponent(window.top.location.pathname)}`);
        return;
    }

    let storedUser = {};
    try { storedUser = JSON.parse(localStorage.getItem('user') || '{}'); } catch(e) {}
    const username = storedUser.username;
    studentId = storedUser.student_id || '';

    if (!username || !studentId) {
        window.top.location.replace(`/login.html?redirect=${encodeURIComponent(window.top.location.pathname)}`);
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
        console.error("Diagnostic Engine: Roster lookup failed:", err);
        window.top.location.replace(`/login.html?redirect=${encodeURIComponent(window.top.location.pathname)}`);
        return;
    }

    examProgressId = `PreTest_${studentId}_${chapterTitle.replace(/\s+/g, '_')}`;
    renderAuthScreen();
}

function renderAuthScreen() {
    const container = document.getElementById('exam-container');
    if (!container) return;

    if (fName === "Unverified") {
        container.innerHTML = `
            <div class="alert alert-danger text-center shadow">
                <h4 class="fw-bold">⚠️ Identity Verification Required</h4>
                <p>Your portal session is not linked to an active student roster entry. Please log in again.</p>
                <a href="/login.html" target="_top" class="btn btn-danger">Log In as Active Student</a>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="card shadow border-primary mx-auto" style="max-width: 550px;">
            <div class="card-header bg-primary text-center py-3"><h4 class="mb-0 fw-bold text-white">Diagnostic Assessment</h4></div>
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

                <div class="alert alert-light border border-secondary small text-start mb-4">
                    <strong>Welcome!</strong> This assessment is designed to see what you already know before we begin the chapter. Your score gives us a baseline to measure your learning progress.
                </div>

                <div id="auth-footer"><button onclick="checkResume()" class="btn btn-lg btn-primary w-100 fw-bold shadow-sm">Start Assessment</button></div>
            </div>
        </div>`;
}

async function checkResume() {
    const footer = document.getElementById('auth-footer');
    footer.innerHTML = `<div class="spinner-border text-primary"></div><p class="small mt-2">Checking for saved progress...</p>`;

    try {
        const res = await fetch(`/api/student/exam-progress?student_id=${encodeURIComponent(studentId)}&exam_id=${encodeURIComponent(examProgressId)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.found && confirm(`We found a saved session. Resume where you left off?`)) {
                userAnswers = data.userAnswers || {};
                currentIndex = data.currentIndex || 0;
                examQuestions = data.examQuestions || examQuestions;
            }
        }
    } catch (e) {
        console.warn("Could not check progress, starting fresh.", e);
    }
    startPreTest();
}

function startPreTest() {
    examIsActive = true;
    document.getElementById('exam-container').innerHTML = `<div id="quiz-pane"></div>`;
    renderQuestion();
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
    } catch (e) {
        console.error("Failed to sync progress:", e);
    }
}

function renderQuestion() {
    const container = document.getElementById('quiz-pane');
    const q = examQuestions[currentIndex];
    const isAnswered = userAnswers[currentIndex] !== undefined;

    const optionsHtml = q.options.map((opt, i) => `
        <div class="col-md-6 mb-3">
            <div class="card h-100 shadow-sm ${userAnswers[currentIndex] === i ? 'border-primary bg-site-secondary' : 'border-secondary'}" onclick="selectOption(${i})" style="cursor: pointer; border-width: 2px !important;">
                <div class="card-body d-flex align-items-center">
                    <input class="form-check-input me-3 mt-0" type="radio" ${userAnswers[currentIndex] === i ? 'checked' : ''} style="pointer-events: none; border-color: var(--primary-color);">
                    <label class="form-check-label w-100 fw-bold" style="pointer-events: none; color: var(--primary-color);">${escapeHtml(opt)}</label>
                </div>
            </div>
        </div>`).join('');

    container.innerHTML = `
        <div class="card shadow-sm border-0 p-4">
            <div class="text-center mb-4">
                <div class="d-flex justify-content-between mb-3 small text-muted">
                    <span><strong>Student:</strong> ${escapeHtml(lName)}, ${escapeHtml(fName)} (${sClass})</span>
                    <span>Diagnostic: ${chapterTitle}</span>
                </div>
                <div class="progress mb-4 no-print" style="height: 10px; background-color: var(--secondary-color);">
                    <div class="progress-bar bg-primary" style="width: ${((currentIndex + 1) / examQuestions.length) * 100}%"></div>
                </div>
                <h5 class="fw-bold text-primary mb-1">Question ${currentIndex + 1} of ${examQuestions.length}</h5>
                <h4 class="fw-bold mt-3 text-dark lh-base" style="color: var(--primary-color);">${escapeHtml(q.question)}</h4>
            </div>
            <div class="row mt-4 px-2">${optionsHtml}</div>
            <div class="d-flex justify-content-between mt-4 pt-4 border-top no-print">
                <button class="btn btn-outline-primary px-4 fw-bold" onclick="prevQuestion()" ${currentIndex === 0 ? 'disabled' : ''}>Previous</button>
                <button class="btn btn-primary px-5 fw-bold shadow-sm" onclick="${currentIndex === examQuestions.length - 1 ? 'confirmSubmit()' : 'nextQuestion()'}" ${isAnswered ? '' : 'disabled'}>
                    ${currentIndex === examQuestions.length - 1 ? 'Finish Diagnostic' : 'Next Question'}
                </button>
            </div>
        </div>`;

    syncProgress();
}

function selectOption(idx) { userAnswers[currentIndex] = idx; renderQuestion(); }
function nextQuestion() { currentIndex++; renderQuestion(); }
function prevQuestion() { currentIndex--; renderQuestion(); }

function confirmSubmit() {
    showDacConfirm(
        "Assessment Complete!",
        "Great job completing the diagnostic! Your responses will help us measure your learning progress throughout this chapter.\n\nReady to submit and see your baseline report?",
        processResults
    );
}

async function downloadPDFReport(event) {
    const btn = event.currentTarget;
    const { jsPDF } = window.jspdf;

    if (!jsPDF) return showDacAlert("Error", "PDF Library not loaded yet. Please wait 2 seconds.");

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Generating File...`;

    try {
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(22); doc.setTextColor(0, 51, 153); doc.setFont("helvetica", "bold");
        doc.text("DIAGNOSTIC ASSESSMENT REPORT", 105, y, { align: "center" });

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
            // FIX: Use actual answer field from question, not hints (hints may be empty without webhook)
            const correctOption = q.answer || q.options[0];
            const isCorrect = studentChoice === correctOption && userAnswers[i] !== undefined;

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

        doc.save(`Diagnostic_${lName}_${fName}_${chapterTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
        console.error("PDF Error:", err);
        showDacAlert("Download Error", "We couldn't generate the PDF automatically. Please take a photo of this screen for your records.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function processResults() {
    examIsActive = false;
    const container = document.getElementById('exam-container');
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div><h3 class="mt-4 text-primary">Grading & Submitting...</h3></div>`;

// Calculate score locally - FIXED: Use answer field from API (correct_answer doesn't exist in API response)
    // FIX: The API returns 'answer' but quizLogic was checking 'correct_answer' first (which is undefined)
    // Then it fell back to q.options[0] which is WRONG because the options were shuffled!
    let correctCount = 0;
    examQuestions.forEach((q, i) => {
        if (userAnswers[i] !== undefined) {
            const selectedOption = q.options[userAnswers[i]];
            // FIX: Priority is q.answer (from API) OR q.options[0] (fallback - only use if no answer field)
            // Never use correct_answer as it doesn't exist in the MariaDB API response!
            const correctOption = q.answer || q.options[0];
            if (selectedOption === correctOption) {
                correctCount++;
            }
        }
    });
    finalScore = correctCount;
    finalTotal = examQuestions.length;
    finalPercentage = Math.round((finalScore / finalTotal) * 100);

    // If webhookUrl exists, try to send to webhook (Google Sheets). Otherwise use MariaDB only
    if (webhookUrl) {
        const payload = {
            email: studentId,
            studentId: studentId,
            firstName: fName,
            lastName: lName,
            studentClass: sClass,
            chapter: chapterTitle,
            testType: "Pre-Test",
            total: examQuestions.length,
            answers: examQuestions.map((q, i) => ({
                question: q.question.trim(),
                selected: userAnswers[i] !== undefined ? q.options[userAnswers[i]].trim() : "Unanswered"
            }))
        };

        try {
            const response = await fetch(webhookUrl, { method: "POST", body: JSON.stringify(payload) });
            if (response.ok) {
                const serverData = await response.json();
                // Override if webhook returns valid data
                if (serverData && serverData.score !== undefined) {
                    finalScore = serverData.score;
                    finalTotal = serverData.total;
                    finalPercentage = serverData.percentage;
                    serverFeedback = serverData.feedback || [];
                }
            }
} catch (e) {
        console.warn("Webhook fetch failed, using local score:", e.message);
    }
} else {
    console.log("[QuizLogic] No webhookUrl - using local grading for CS");
}

// Delete saved progress from MariaDB
    try {
        await fetch(`/api/student/exam-progress?student_id=${encodeURIComponent(studentId)}&exam_id=${encodeURIComponent(examProgressId)}`, {
            method: 'DELETE'
        });
    } catch(e) { console.warn("Could not clear saved progress:", e); }

// Build feedback map (empty if no server feedback) - used only for hints, NOT for correctness
    const feedbackMap = {};
    serverFeedback.forEach(item => feedbackMap[item.question.trim()] = item.hint);

// FIXED: Use 'answer' field from API (correct_answer doesn't exist in API response)
    // FIX: Same issue as scoring - must use q.answer, not q.correct_answer!
    const reviewHtml = examQuestions.map((q, i) => {
        const studentChoice = userAnswers[i] !== undefined ? q.options[userAnswers[i]] : "Unanswered";
        // FIX: Priority is q.answer (from API) OR q.options[0] (fallback - only if no answer)
        const correctOption = q.answer || q.options[0];
        const isCorrect = studentChoice === correctOption && userAnswers[i] !== undefined;
        const hint = feedbackMap[q.question.trim()];
        
        return `
            <div class="mb-4 border-bottom pb-3 text-start">
                <p class="mb-1 fw-bold text-dark">Q${i + 1}: ${escapeHtml(q.question)}</p>
                <p class="mb-1 small">Your Answer: <span class="${isCorrect ? 'text-success' : 'text-danger'} fw-bold">${escapeHtml(studentChoice)}</span></p>
                <p class="mb-1 small">Correct Answer: <span class="text-success fw-bold">${escapeHtml(correctOption)}</span></p>
                <div class="d-flex align-items-center mt-1">
                    ${isCorrect ? `<span class="badge bg-success text-white me-2">✅ Correct</span>` : `<span class="badge bg-danger text-white me-2">❌ Incorrect</span>`}
                </div>
                ${!isCorrect && hint ? `<div class="mt-2 p-2 rounded bg-light border-start border-danger border-4 small italic text-muted">💡 <strong>Hint:</strong> ${escapeHtml(hint)}</div>` : ''}
            </div>`;
    }).join('');

    container.innerHTML = `
        <div class="card shadow border-success mx-auto text-center" style="max-width: 750px;">
            <div class="card-body p-4 p-md-5">
                <div class="display-4 mb-3 no-print">📋</div>
                <h2 class="fw-bold text-success mb-3">Diagnostic Complete!</h2>
                <div class="p-4 rounded bg-site-secondary border border-primary text-start">
                    <h4 class="text-primary mb-1">${escapeHtml(lName)}, ${escapeHtml(fName)}</h4>
                    <p class="small text-muted mb-3">${sClass} | ${chapterTitle} | ID: ${studentId}</p>
                    <h1 class="display-3 fw-bold text-primary mb-0">${finalPercentage}%</h1>
                    <p class="fw-bold mt-2 mb-4 text-dark border-bottom pb-2">${finalScore} out of ${finalTotal} correct</p>
                    <div class="review-section mt-3" style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                        <h6 class="fw-bold text-primary mb-3">Detailed Performance Review:</h6>
                        ${reviewHtml}
                    </div>
                </div>
<div class="mt-4 no-print d-flex justify-content-center gap-2">
                    <button onclick="downloadPDFReport(event)" class="btn btn-primary text-white px-4 shadow-sm">📥 Download PDF Report</button>
                    <button onclick="returnToWorkspace()" class="btn btn-outline-secondary px-4">Return to Workspace</button>
                </div>
            </div>
        </div>`;

    // Use opener for new-window context (CS), fall back to parent for iframe context (WD)
    (window.opener || window.parent || window).postMessage({ type: 'diagnostic_complete', score: finalScore }, '*');

// B. SYNC PRE-ASSESSMENT TO GRADEBOOK - 15 POINTS FIXED
    // Web Design diagnostic AND CS Pre-Assessment both get fixed 15 points when completed
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.student_id) {
            // Use the pre-computed exam_id set in initPreTest when config.chapter was provided.
            // Fall back to extracting from chapterTitle / URL for legacy pages without config.chapter.
            let preAssmtExamId = gradebookExamId;

            if (!preAssmtExamId) {
                const isCS = window.location.pathname.includes('/cs-') || window.location.pathname.includes('cs-unit');
                // Try numeric chapter from title first (e.g. "Chapter 13 Diagnostic" → 13)
                const numMatch = chapterTitle.match(/(?:unit|chapter)\s*(\d+)/i);
                if (numMatch) {
                    const unitNum = parseInt(numMatch[1], 10);
                    preAssmtExamId = isCS ? `Unit${unitNum}-Pre` : `Ch${unitNum} Pre-Assessment [15 pts]`;
                } else {
                    // Try alphabetic chapter (e.g. "Chapter A Pre-Assessment" → A)
                    const alphaMatch = chapterTitle.match(/(?:unit|chapter)\s*([A-Za-z])\b/i);
                    if (alphaMatch) {
                        const alphaUnit = alphaMatch[1].toUpperCase();
                        preAssmtExamId = isCS ? `Unit${alphaUnit}-Pre` : `Ch${alphaUnit} Pre-Assessment [15 pts]`;
                    } else {
                        // Try URL as last resort (e.g. /cs-unit-1.html)
                        const urlNum = window.location.pathname.match(/cs[_-]?unit[\s_-]?(\d+)/i);
                        const urlAlpha = window.location.pathname.match(/cs[_-]?unit[\s_-]?([a-z])\b/i);
                        if (urlNum) {
                            preAssmtExamId = isCS ? `Unit${urlNum[1]}-Pre` : `Ch${urlNum[1]} Pre-Assessment [15 pts]`;
                        } else if (urlAlpha) {
                            preAssmtExamId = isCS ? `Unit${urlAlpha[1].toUpperCase()}-Pre` : `Ch${urlAlpha[1].toUpperCase()} Pre-Assessment [15 pts]`;
                        } else {
                            console.warn("[QuizLogic] Could not determine chapter from title or URL. Skipping gradebook sync.");
                            preAssmtExamId = null;
                        }
                    }
                }
            }

            if (!preAssmtExamId) {
                throw new Error("Chapter could not be determined for gradebook sync.");
            }

            console.log("[QuizLogic] Syncing Pre-Assessment to gradebook:", preAssmtExamId, "15 points");
            
            const res = await fetch('/api/submit-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: user.student_id,
                    exam_id: preAssmtExamId,
                    score: 15,  // FIXED: Pre-assessment = 15 points fixed for completion
                    total_points: 15
                })
            });
            
            if (res.ok) {
                const result = await res.json();
                console.log("[QuizLogic] Gradebook sync result:", result);
            } else {
                console.error("[QuizLogic] Gradebook sync failed:", res.status);
            }
        }
    } catch(e) { console.error("[QuizLogic] Could not sync pre-assessment to gradebook:", e.message); }
}

// Return to Workspace function - properly redirects back to cs-interactive
function returnToWorkspace() {
    // Notify parent that diagnostic is complete (use opener for new-window, parent for iframe)
    (window.opener || window.parent || window).postMessage({ type: 'diagnostic_complete', score: finalScore }, '*');
    // Clear lastPage to prevent redirect loop back to quiz
    try {
        localStorage.removeItem('lastPage');
    } catch(e) {}
    // Redirect back to cs-interactive workspace
    window.top.location.href = '/cs-interactive.html';
}

// Expose to global scope for onclick handlers in dynamically rendered HTML
window.initPreTest = initPreTest;
window.__quizLogicInitPreTest = initPreTest; // stable reference used by preTestLogic.js module
window.selectOption = selectOption;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.confirmSubmit = confirmSubmit;
window.processResults = processResults;
window.checkResume = checkResume;
window.downloadPDFReport = downloadPDFReport;
window.returnToWorkspace = returnToWorkspace;
