/**
 * REUSABLE PRE-TEST ENGINE (DIAGNOSTIC EDITION)
 * Upgraded: Automated Identity & Period Retrieval (Firestore lookup)
 * Upgraded: Native PDF Text Generation (Reliable Text Drawing)
 * Upgraded: Custom UI Modals (Replaces browser alerts/confirms)
 * Features: Forced 10-Question limit, Low-Stress Messaging
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

/**
 * Custom Confirmation Dialog
 */
function showDacConfirm(title, body, onConfirm) {
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

/**
 * Custom Alert Dialog (Replaces alert)
 */
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


// --- Firebase Initialization (Modern Modular Approach) ---
let db, auth, user, fbFirestore;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'dac-exam-system';

let examQuestions = [];
let userAnswers = {};
let currentIndex = 0;
let fName = "Unverified";
let lName = "";
let sClass = "N/A";
let studentId = ""; 
let studentEmail = ""; 
let webhookUrl = "";
let chapterTitle = "";
let examIsActive = false;
let rosterDataLoaded = false;

async function initCloudStorage() {
    try {
        const { getApps } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
        const { getAuth, onAuthStateChanged, signOut } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
        const firestore = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        
        fbFirestore = firestore; 

        // Wait for parent window/auth-guard to initialize Firebase
        const waitForApp = () => new Promise(resolve => {
            const check = () => {
                if (getApps().length > 0) resolve(getApps()[0]);
                else setTimeout(check, 50);
            };
            check();
        });

        const app = await waitForApp();
        auth = getAuth(app);
        db = firestore.getFirestore(app);

        onAuthStateChanged(auth, async (u) => {
            if (u) {
                user = u;
                studentEmail = user.email || "unknown";
                
                // Extract the username (which is the student ID number based on your setup)
                const username = studentEmail.split('@')[0];
                
                try {
                    const { collection, getDocs, query, where } = fbFirestore;
                    const rosterRef = collection(db, 'artifacts', appId, 'public', 'data', 'roster');
                    const q = query(rosterRef, where("username", "==", username));
                    const snap = await getDocs(q);
                    
                    if (!snap.empty) {
                        const studentData = snap.docs[0].data();
                        fName = studentData.firstName;
                        lName = studentData.lastName;
                        sClass = studentData.period;
                        studentId = studentData.studentId; 
                        rosterDataLoaded = true;
                        console.log(`✅ Diagnostic Engine: Identity Verified [${fName} ${lName}] - ID: ${studentId}`);
                    } else {
                        // --- HARD SECURITY GUARD ---
                        console.warn("🔐 Security Alert: Ghost Session detected. Redirecting to login.");
                        await signOut(auth);
                        window.top.location.replace(`/login.html?redirect=${encodeURIComponent(window.top.location.pathname)}`);
                        return;
                    }

                    if (examQuestions.length > 0) {
                        renderAuthScreen();
                    }

                } catch (err) {
                    console.error("Diagnostic Engine: Roster lookup failed:", err);
                }
            } else {
                // Not logged in at all - redirect the entire portal out to login
                window.top.location.replace(`/login.html?redirect=${encodeURIComponent(window.top.location.pathname)}`);
            }
        });
    } catch (e) {
        console.error("Cloud Initialization Error:", e);
    }
}
initCloudStorage();

let serverFeedback = [];
let finalScore = 0;
let finalTotal = 0;
let finalPercentage = 0;

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

function initPreTest(config) {
    let pool = shuffleArray([...config.questions]);
    examQuestions = pool.slice(0, 10).map(q => ({ ...q, options: shuffleArray([...q.options]) }));
    webhookUrl = config.webhookUrl;
    chapterTitle = config.chapterTitle;
    
    if (user && rosterDataLoaded) {
        renderAuthScreen();
    } else {
        const container = document.getElementById('exam-container');
        if(container) {
            container.innerHTML = `
                <div class="text-center p-5">
                    <div class="spinner-border text-primary"></div>
                    <p class="mt-2 fw-bold text-primary">Connecting to Database & Verifying Roster...</p>
                </div>`;
        }
    }
}

function renderAuthScreen() {
    const container = document.getElementById('exam-container');
    if (!container) return;

    if (!rosterDataLoaded || fName === "Unverified") {
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

    if (db && user && fbFirestore) {
        try {
            const { doc, getDoc } = fbFirestore;
            const docId = `PreTest_${studentId}_${chapterTitle.replace(/\s+/g, '_')}`;
            const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/progress/${docId}`);
            const progressDoc = await getDoc(docRef);
            
            if (progressDoc.exists()) {
                // Quick native confirm for seamless interception
                if (confirm(`We found a saved session. Resume where you left off?`)) {
                    const data = progressDoc.data();
                    userAnswers = data.userAnswers || {};
                    currentIndex = data.currentIndex || 0;
                    examQuestions = data.examQuestions;
                }
            }
        } catch (e) {
            console.warn("Could not check progress, starting fresh.", e);
        }
    }
    startPreTest();
}

function startPreTest() {
    examIsActive = true;
    document.getElementById('exam-container').innerHTML = `<div id="quiz-pane"></div>`;
    renderQuestion();
}

async function syncProgress() {
    if (!examIsActive || !db || !user || !fbFirestore) return;
    try {
        const { doc, setDoc } = fbFirestore;
        const docId = `PreTest_${studentId}_${chapterTitle.replace(/\s+/g, '_')}`;
        const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/progress/${docId}`);
        
        await setDoc(docRef, {
            currentIndex, 
            userAnswers, 
            examQuestions, 
            timestamp: Date.now()
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
                <h5 class="fw-bold text-primary mb-1">Question ${currentIndex + 1} of 10</h5>
                <h4 class="fw-bold mt-3 text-dark lh-base" style="color: var(--primary-color);">${escapeHtml(q.question)}</h4>
            </div>
            <div class="row mt-4 px-2">${optionsHtml}</div>
            <div class="d-flex justify-content-between mt-4 pt-4 border-top no-print">
                <button class="btn btn-outline-primary px-4 fw-bold" onclick="prevQuestion()" ${currentIndex === 0 ? 'disabled' : ''}>Previous</button>
                <button class="btn btn-primary px-5 fw-bold shadow-sm" onclick="${currentIndex === 9 ? 'confirmSubmit()' : 'nextQuestion()'}" ${isAnswered ? '' : 'disabled'}>
                    ${currentIndex === 9 ? 'Finish Diagnostic' : 'Next Question'}
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

/**
 * Direct PDF Download Logic
 * Uses native text drawing for 100% stability.
 */
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

        // Header
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
        doc.text(`SCORE: ${finalScore} / 10`, 20, y);
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
            
            if (isCorrect) {
                doc.setTextColor(0, 150, 0); 
            } else {
                doc.setTextColor(200, 0, 0); 
            }
            
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

    const payload = {
        email: studentId, // Passing Student ID as the primary tracking key per system requirements
        studentId: studentId, 
        firstName: fName, 
        lastName: lName, 
        studentClass: sClass, 
        chapter: chapterTitle, 
        testType: "Pre-Test", 
        total: 10,
        answers: examQuestions.map((q, i) => ({ 
            question: q.question.trim(), 
            selected: userAnswers[i] !== undefined ? q.options[userAnswers[i]].trim() : "Unanswered" 
        }))
    };

    try {
        const response = await fetch(webhookUrl, { method: "POST", body: JSON.stringify(payload) });
        const serverData = await response.json();
        
        finalScore = serverData.score; 
        finalTotal = serverData.total; 
        finalPercentage = serverData.percentage; 
        serverFeedback = serverData.feedback || [];

        // Clean up progress file & Auto-Unlock the Notebook for the Student Portal
        if (db && user && fbFirestore) {
            const { doc, deleteDoc, setDoc, collection } = fbFirestore;
            
            // Delete the saved test progress
            const docId = `PreTest_${studentId}_${chapterTitle.replace(/\s+/g, '_')}`;
            const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/progress/${docId}`);
            await deleteDoc(docRef);

            // Generate a 'Reflection' Note so the Portal sees the Module as 'Unlocked'
            try {
                let exactChapterName = chapterTitle;
                // Peek at the parent window to get the exact string (e.g. "1: How Computers Work")
                if (window.parent && window.parent.document) {
                    const activeTab = window.parent.document.querySelector('.chapter-tab-btn.active');
                    if (activeTab && activeTab.dataset.chapter) {
                        exactChapterName = activeTab.dataset.chapter;
                    }
                }
                const notebookRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/notebook`));
                await setDoc(notebookRef, {
                    title: `Diagnostic Assessment Results`,
                    chapter: exactChapterName,
                    category: "Reflection",
                    content: `<h2>Diagnostic Complete</h2><p>You scored ${finalPercentage}% on your pre-assessment.</p><p>You have successfully unlocked the curriculum workspace for this module.</p>`,
                    timestamp: Date.now()
                });
                console.log("Module unlocked in Database:", exactChapterName);
            } catch (err) {
                console.warn("Could not create unlock note:", err);
            }
        }

        const feedbackMap = {};
        serverFeedback.forEach(item => feedbackMap[item.question.trim()] = item.hint);

        const reviewHtml = examQuestions.map((q, i) => {
            const studentChoice = userAnswers[i] !== undefined ? q.options[userAnswers[i]] : "Unanswered";
            const isCorrect = !feedbackMap[q.question.trim()];
            return `
                <div class="mb-4 border-bottom pb-3 text-start">
                    <p class="mb-1 fw-bold text-dark">Q${i + 1}: ${escapeHtml(q.question)}</p>
                    <p class="mb-1 small">Your Answer: <span class="${isCorrect ? 'text-success' : 'text-danger'} fw-bold">${escapeHtml(studentChoice)}</span></p>
                    <div class="d-flex align-items-center mt-1">
                        ${isCorrect ? `<span class="badge bg-success text-white me-2">✅ Correct</span>` : `<span class="badge bg-danger text-white me-2">❌ Incorrect</span>`}
                    </div>
                    ${!isCorrect ? `<div class="mt-2 p-2 rounded bg-light border-start border-danger border-4 small italic text-muted">💡 <strong>Hint:</strong> ${escapeHtml(feedbackMap[q.question.trim()])}</div>` : ''}
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
                        <h1 class="display-3 fw-bold text-primary mb-0">${serverData.percentage}%</h1>
                        <p class="fw-bold mt-2 mb-4 text-dark border-bottom pb-2">${serverData.score} out of 10 correct</p>
                        <div class="review-section mt-3" style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                            <h6 class="fw-bold text-primary mb-3">Detailed Performance Review:</h6>
                            ${reviewHtml}
                        </div>
                    </div>
                    <div class="mt-4 no-print d-flex justify-content-center gap-2">
                        <button onclick="downloadPDFReport(event)" class="btn btn-primary text-white px-4 shadow-sm">📥 Download PDF Report</button>
                        <button onclick="window.parent.postMessage({type: 'diagnostic_complete'}, '*'); window.location.reload();" class="btn btn-outline-secondary px-4">Return to Workspace</button>
                    </div>
                </div>
            </div>`;
            
        // --- MASTER WORKSPACE HANDSHAKE ---
        // Sends a message to the parent iframe immediately so student-portal.js unlocks the workspace!
        if (window.parent) {
            window.parent.postMessage({type: 'diagnostic_complete', score: finalScore}, '*');
        }
            
    } catch (error) { 
        container.innerHTML = `<div class="alert alert-danger shadow"><strong>Submission Error:</strong> ${error.message} <br>Please alert your instructor.</div>`; 
    }
}