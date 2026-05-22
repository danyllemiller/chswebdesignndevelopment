/**
 * COMPUTER SCIENCE SUMMATIVE EXAM ENGINE (PROCTOR EDITION)
 * - Base: Proven Web Design examLogic.js layout
 * - UPGRADE: Hardcoded Computer Science Webhook.
 * - UPGRADE: Dynamic 5-Question Per Chapter pooling logic (15 or 20 total questions).
 * - UPGRADE: Interactive CS Notebook iframe integration.
 * - FIX: Grade overwriting and 'Unit X' key formatting restored for Gradebook syncing.
 */

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

// Global Variables
let db, auth, appId, setDoc, doc, collection, query, where, getDocs, deleteDoc, getDoc;

let examQuestions = [];
let userAnswers = {};
let currentIndex = 0;
let fName = "Unverified";
let lName = "";
let sClass = "N/A";
let studentEmail = "";
let studentId = ""; 
let globalUid = null; 
let webhookUrl = "";
let chapterTitle = "";
let examIsActive = false;
let rosterDataLoaded = false; 

let tabSwitchCount = 0;
let tabLockdownActive = false;

// DYNAMIC FIREBASE INJECTION - Prevents Script Crashing in Classic HTML files
async function initCloudStorage() {
    try {
        const fbAuth = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
        const fbFirestore = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const localFb = await import("/js/firebase-init.js");

        auth = localFb.auth;
        db = localFb.db;
        appId = localFb.appId || 'dac-exam-system';

        setDoc = fbFirestore.setDoc;
        doc = fbFirestore.doc;
        collection = fbFirestore.collection;
        query = fbFirestore.query;
        where = fbFirestore.where;
        getDocs = fbFirestore.getDocs;
        deleteDoc = fbFirestore.deleteDoc;
        getDoc = fbFirestore.getDoc;

        fbAuth.onAuthStateChanged(auth, async (u) => {
            if (u) {
                globalUid = u.uid; 
                studentEmail = u.email ? u.email.split('@')[0].toLowerCase() : "unknown";
                
                try {
                    const rosterRef = collection(db, 'artifacts', appId, 'public', 'data', 'roster');
                    const q = query(rosterRef, where("username", "==", studentEmail));
                    const snap = await getDocs(q);
                    
                    if (!snap.empty) {
                        const studentData = snap.docs[0].data();
                        fName = studentData.firstName;
                        lName = studentData.lastName;
                        sClass = studentData.period;
                        studentId = String(studentData.studentId || snap.docs[0].id || globalUid); 
                        rosterDataLoaded = true;
                        console.log(`✅ Exam Engine: Identity Verified [${fName} ${lName}] - ID: ${studentId}`);
                    } else {
                        console.warn("🔐 Security Alert: Ghost Session detected. Redirecting to login.");
                        await fbAuth.signOut(auth);
                        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
                        return;
                    }

                    // If initExam was already called while waiting for Firebase, render the screen now
                    if (examQuestions.length > 0) {
                        renderAuthScreen();
                    }

                } catch (err) {
                    console.error("Exam Engine: Roster lookup failed:", err);
                }
            } else {
                window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
            }
        });
    } catch (e) {
        console.error("Cloud Initialization Error:", e);
    }
}
initCloudStorage();

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

let serverFeedback = [];
let finalScore = 0;
let finalTotal = 0;
let finalPercentage = 0;

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function initExam(config) {
    let pool = Array.isArray(config) ? config : (config.questions || []);

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
        return { question: q.question, options: opts };
    });
    
    // HARDCODED COMP SCI WEBHOOK
    webhookUrl = "https://script.google.com/macros/s/AKfycbxNCMXZ5zBtBLSqalNUh6bGzSZwcp7GfUzpLb2VgzcARaNt7x1biA_9jdK64_mDfy6ajA/exec";
    
    chapterTitle = config.chapterTitle || document.title || "Assessment";
    userAnswers = {};
    currentIndex = 0;

    if (globalUid && rosterDataLoaded) {
        renderAuthScreen();
    } else {
        const container = document.getElementById('exam-container');
        if(container) {
            container.innerHTML = `
                <div class="text-center p-5">
                    <div class="spinner-border text-primary"></div>
                    <p class="mt-2 fw-bold">Connecting to Database & Verifying Roster...</p>
                </div>`;
        }
    }
}

function renderAuthScreen() {
    if (!rosterDataLoaded || fName === "Unverified") {
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

    if (db && globalUid) {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const safeTitle = (chapterTitle || "Assessment").replace(/\s+/g, '_');
            const docId = `${studentEmail}_${safeTitle}_${todayStr}`;
            const docRef = doc(db, `artifacts/${appId}/users/${globalUid}/progress/${docId}`);
            const progressDoc = await getDoc(docRef);
            
            if (progressDoc.exists()) {
                const data = progressDoc.data();
                const hoursSinceSave = (Date.now() - data.timestamp) / (1000 * 60 * 60);

                if (hoursSinceSave < 12) {
                    if (confirm(`We found an unfinished session from ${new Date(data.timestamp).toLocaleTimeString()}. Resume where you left off?`)) {
                        userAnswers = data.userAnswers || {};
                        currentIndex = data.currentIndex || 0;
                        examQuestions = data.examQuestions;
                    }
                } else {
                    console.log("Old ghost save file detected. Starting fresh.");
                }
            }
        } catch (err) {
            console.warn("Could not check progress, starting fresh.", err);
        }
    }

    startExam();
}

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
                            <iframe src="/cs-interactive.html" onload="try{const doc=this.contentWindow.document; const s=doc.createElement('style'); s.innerHTML='nav, footer, .footer, .site-footer, #nav-placeholder, #footer-placeholder, #footer-nav, .back-to-top { display: none !important; opacity: 0 !important; pointer-events: none !important; height: 0 !important; }'; doc.head.appendChild(s);}catch(e){}" style="width: 100%; height: 100%; border: none;"></iframe>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderQuestion();
    setupTabLockdown(); 
}

async function syncProgress() {
    if (!examIsActive || !db || !globalUid) return;
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const safeTitle = (chapterTitle || "Assessment").replace(/\s+/g, '_');
        const docId = `${studentEmail}_${safeTitle}_${todayStr}`;
        const docRef = doc(db, `artifacts/${appId}/users/${globalUid}/progress/${docId}`);
        await setDoc(docRef, {
            currentIndex,
            userAnswers,
            examQuestions, 
            timestamp: Date.now()
        });
    } catch (err) {
        console.error("Failed to sync progress:", err);
    }
}

function renderQuestion() {
    const pane = document.getElementById('quiz-pane');
    if (!pane) return;

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

    pane.innerHTML = `
        <div class="card shadow-sm border-0 h-100 p-4">
            <div class="text-center mb-4">
                <div class="d-flex justify-content-between small text-muted mb-2">
                    <span><strong>Student:</strong> ${escapeHtml(lName)}, ${escapeHtml(fName)} (${sClass})</span>
                </div>
                <div class="progress mb-3 no-print" style="height: 10px; background-color: var(--secondary-color);">
                    <div class="progress-bar bg-primary" style="width: ${(currentIndex/examQuestions.length)*100}%"></div>
                </div>
                <h5 class="fw-bold text-primary mb-1">Question ${currentIndex + 1} of ${examQuestions.length}</h5>
                <p class="small text-muted mb-4">${chapterTitle}</p>
                <h4 class="fw-bold text-dark lh-base" style="color: var(--primary-color);">${escapeHtml(q.question)}</h4>
            </div>
            
            <div class="row mt-4 px-2">${optionsHtml}</div>
            
            <div class="d-flex justify-content-between mt-auto pt-4 border-top px-2 no-print">
                <button class="btn btn-outline-primary px-4 shadow-sm fw-bold" onclick="prevQuestion()" ${currentIndex === 0 ? 'disabled' : ''}>Previous</button>
                <button class="btn btn-primary px-5 shadow-sm fw-bold" onclick="${currentIndex === examQuestions.length - 1 ? 'confirmSubmit()' : 'nextQuestion()'}" ${isAnswered ? '' : 'disabled'}>
                    ${currentIndex === examQuestions.length - 1 ? 'Submit Test' : 'Next'}
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
        const response = await fetch(webhookUrl, { method: "POST", body: JSON.stringify(payload) });
        const rawResponse = await response.text();
        let serverData = JSON.parse(rawResponse);

        if (serverData.result === "error") {
            container.innerHTML = `<div class="alert alert-warning p-5 text-center shadow mx-auto border-warning" style="max-width:600px; background-color: #fff;">
                <h4 class="fw-bold text-warning">✋ Wait a moment</h4><p>${serverData.message}</p>
                <button onclick="window.location.reload()" class="btn btn-outline-primary mt-3">Try Another Student</button></div>`;
            return;
        }

        finalScore = Number(serverData.score) || 0; 
        finalTotal = Number(serverData.total) || examQuestions.length; 
        finalPercentage = Number(serverData.percentage) || 0; 
        serverFeedback = serverData.feedback || [];

        if (db && studentId) {
            const todayStr = new Date().toISOString().split('T')[0];
            const safeTitle = (chapterTitle || "Assessment").replace(/\s+/g, '_');
            
            if (globalUid) {
                const docId = `${studentEmail}_${safeTitle}_${todayStr}`;
                const docRef = doc(db, `artifacts/${appId}/users/${globalUid}/progress/${docId}`);
                try { await deleteDoc(docRef); } catch (err) {}
            }

            // FIXED: Matches "Unit1-Summative-Exam" pattern required by gradebook
            const unitNumMatch = chapterTitle ? chapterTitle.match(/(?:unit|chapter|ch)\s*(\d+)/i) : null;
            const unitNum = unitNumMatch ? unitNumMatch[1] : null;
            const isUnit = chapterTitle && chapterTitle.toLowerCase().includes('unit');
            const prefix = isUnit ? 'Unit' : 'Ch';
            const finalAssignmentKey = unitNum ? `${prefix}${unitNum}-Summative-Exam` : "Summative-Exam";
            
            const gradeRef = doc(db, 'artifacts', appId, 'public', 'data', 'grades', String(studentId));
            
            const gradeSnap = await getDoc(gradeRef);
            let shouldSave = true;
            
            if (gradeSnap.exists() && gradeSnap.data()[finalAssignmentKey] !== undefined) {
                const existingData = gradeSnap.data()[finalAssignmentKey];
                let existingScore = 0;
                if (typeof existingData === 'object' && existingData !== null) {
                    existingScore = Number(existingData.score) || 0;
                } else {
                    existingScore = Number(existingData) || 0;
                }
                
                // ONLY skip saving if the existing score is strictly HIGHER
                if (existingScore > finalScore) {
                    shouldSave = false; 
                }
            }

            if (shouldSave) {
                await setDoc(gradeRef, { 
                    [finalAssignmentKey]: { score: finalScore, max: finalTotal, timestamp: new Date().toLocaleString() },
                    lastSubmitDate: new Date().toLocaleString()
                }, { merge: true });
            }
        }

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

        const reviewHtml = examQuestions.map((q, i) => {
            const studentChoice = userAnswers[i] !== undefined ? q.options[userAnswers[i]] : "Unanswered";
            const hint = feedbackMap[q.question.trim()];
            const isCorrect = !hint;

            return `
                <div class="mb-4 border-bottom pb-3 text-start">
                    <p class="mb-1 fw-bold text-dark">Q${i + 1}: ${escapeHtml(q.question)}</p>
                    <p class="mb-1 small">Your Answer: <span class="${isCorrect ? 'text-success' : 'text-danger'} fw-bold">${escapeHtml(studentChoice)}</span></p>
                    <div class="d-flex align-items-center mt-1">
                        ${isCorrect ? `<span class="badge bg-success text-white me-2">✅ Correct</span>` : `<span class="badge bg-danger text-white me-2">❌ Incorrect</span>`}
                    </div>
                    ${!isCorrect ? `<div class="mt-2 p-2 rounded bg-light border-start border-danger border-4"><p class="small mb-0 text-muted italic">💡 <strong>Study Hint:</strong> ${escapeHtml(hint)}</p></div>` : ''}
                </div>`;
        }).join('');

        let isRetake = serverData.retakeRequired; 
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
                            <h1 class="display-3 fw-bold text-primary mb-0">${serverData.percentage}%</h1>
                            ${badgeHtml}
                        </div>
                        ${retakeMsg}
                        <p class="fw-bold mt-2 mb-4 text-dark border-bottom pb-2">${serverData.score} out of ${serverData.total} correct</p>
                        
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
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger p-5 text-center shadow mx-auto border-danger" style="max-width:600px; background-color: #fff;">
            <h4 class="fw-bold text-danger">⚠️ Submission Issue</h4><p>${error.message}</p>
            <button onclick="processSubmission()" class="btn btn-danger mt-3">Try Submitting Again</button></div>`;
    }
}

// ---------------------------------------------------------
// EXPLICIT GLOBAL BINDING
// ---------------------------------------------------------
window.initExam = initExam;
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