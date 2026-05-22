// File: /js/preTestLogic.js
/**
 * REUSABLE PRE-TEST ENGINE (DIAGNOSTIC EDITION)
 * Centralized logic for all Web Design & Comp Sci Pre-Assessments
 */

import { getApps } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
`;
document.head.appendChild(customStyle);

window.addEventListener('DOMContentLoaded', () => {
    const modalHtml = `
        <div id="dac-modal-overlay">
            <div class="dac-modal-content">
                <h3 id="dac-modal-title" class="fw-bold text-primary mb-3"></h3>
                <p id="dac-modal-body" class="mb-4 text-muted" style="font-size: 1.1rem; line-height: 1.5;"></p>
                <div id="dac-modal-footer" class="d-flex justify-content-center gap-3">
                    <button id="dac-modal-cancel" class="btn btn-outline-secondary px-4">Cancel</button>
                    <button id="dac-modal-confirm" class="btn px-4 fw-bold" style="background-color: var(--primary-color); color: white; border: none;">Submit Assessment</button>
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

    titleEl.style.color = "var(--primary-color)";
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

    titleEl.style.color = "var(--primary-color)";
    titleEl.innerText = title;
    bodyEl.innerText = body;
    cancelBtn.style.display = 'none';
    confirmBtn.innerText = "OK";
    overlay.style.display = 'flex';

    confirmBtn.onclick = () => { overlay.style.display = 'none'; };
}

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
let serverFeedback = [];
let finalScore = 0;
let finalTotal = 0;
let finalPercentage = 0;

async function initCloudStorage() {
    try {
        const waitForApp = () => new Promise(resolve => {
            const check = () => getApps().length > 0 ? resolve(getApps()[0]) : setTimeout(check, 50);
            check();
        });

        const app = await waitForApp();
        auth = getAuth(app);
        db = getFirestore(app);
        fbFirestore = { doc, getDoc, setDoc, deleteDoc, collection };

        onAuthStateChanged(auth, async (u) => {
            if (u) {
                user = u;
                studentEmail = user.email || "unknown";
                const username = studentEmail.split('@')[0].toLowerCase();
                
                try {
                    const rosterRef = collection(db, 'artifacts', appId, 'public', 'data', 'roster');
                    const q = query(rosterRef, where("username", "==", username));
                    const snap = await getDocs(q);
                    
                    if (!snap.empty) {
                        const studentData = snap.docs[0].data();
                        fName = studentData.firstName;
                        lName = studentData.lastName;
                        sClass = studentData.period;
                        studentId = studentData.studentId || snap.docs[0].id; 
                        rosterDataLoaded = true;
                    } else {
                        await signOut(auth);
                        window.top.location.replace(`/login.html?redirect=${encodeURIComponent(window.top.location.pathname)}`);
                        return;
                    }

                    if (examQuestions.length > 0) renderAuthScreen();

                } catch (err) {
                    console.error("Engine: Roster lookup failed:", err);
                }
            } else {
                window.top.location.replace(`/login.html?redirect=${encodeURIComponent(window.top.location.pathname)}`);
            }
        });
    } catch (e) {
        console.error("Cloud Initialization Error:", e);
    }
}
initCloudStorage();

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

export function initPreTest(config) {
    let pool = shuffleArray([...config.questions]);
    examQuestions = pool.slice(0, config.questionCount || 10).map(q => ({ 
        ...q, 
        options: shuffleArray([...q.options]) 
    }));
    
    webhookUrl = config.webhookUrl;
    chapterTitle = config.chapterTitle;
    
    if (user && rosterDataLoaded) {
        renderAuthScreen();
    } else {
        const container = document.getElementById('exam-container');
        if(container) {
            container.innerHTML = `
                <div class="text-center p-5 bg-white shadow-sm rounded" style="border-top: 6px solid var(--primary-color);">
                    <div class="spinner-border" style="color: var(--primary-color);"></div>
                    <p class="mt-3 fw-bold" style="color: var(--primary-color);">Connecting to Database & Verifying Roster...</p>
                </div>`;
        }
    }
}

function renderAuthScreen() {
    const container = document.getElementById('exam-container');
    if (!container) return;

    if (!rosterDataLoaded || fName === "Unverified") {
        container.innerHTML = `
            <div class="alert alert-danger text-center shadow border-danger" style="border-width: 2px !important;">
                <h4 class="fw-bold text-danger">⚠️ Identity Verification Required</h4>
                <p class="text-dark">Your portal session is not linked to an active student roster entry. Please log in again.</p>
                <a href="/login.html" target="_top" class="btn btn-danger text-white">Log In as Active Student</a>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="card shadow border-0 mx-auto" style="max-width: 550px;">
            <div class="card-header text-center py-3" style="background-color: var(--primary-color); border-bottom: 1px solid var(--tertiary-color);">
                <h4 class="mb-0 fw-bold text-white">Diagnostic Assessment</h4>
            </div>
            <div class="card-body p-4 text-center border" style="border-color: var(--primary-color) !important;">
                <h5 class="mb-3 fw-bold" style="color: var(--primary-color);">${chapterTitle}</h5>
                
                <div class="alert py-3 mb-4 text-start shadow-sm" style="background-color: var(--secondary-color); border: 1px solid var(--tertiary-color);">
                    <div class="row align-items-center">
                        <div class="col-8">
                            <span class="small d-block mb-1 uppercase fw-bold" style="color: var(--primary-color); font-size:0.7rem; letter-spacing:1px;">Verified Student</span>
                            <span class="h5 mb-0 fw-bold text-dark">${fName} ${lName}</span>
                        </div>
                        <div class="col-4 border-start text-center" style="border-color: var(--tertiary-color) !important;">
                            <span class="small d-block mb-1 uppercase fw-bold" style="color: var(--primary-color); font-size:0.7rem; letter-spacing:1px;">Period</span>
                            <span class="h5 mb-0 fw-bold" style="color: var(--primary-color);">${sClass}</span>
                        </div>
                    </div>
                </div>

                <div class="alert bg-light border border-secondary small text-start mb-4 text-dark">
                    <strong>Welcome!</strong> This assessment is designed to see what you already know before we begin the chapter. Your score gives us a baseline to measure your learning progress.
                </div>
                
                <div id="auth-footer"><button onclick="checkResume()" class="btn btn-lg w-100 fw-bold shadow-sm" style="background-color: var(--primary-color); color: white; border: none;">Start Assessment</button></div>
            </div>
        </div>`;
}

async function checkResume() {
    const footer = document.getElementById('auth-footer');
    footer.innerHTML = `<div class="spinner-border" style="color: var(--primary-color);"></div><p class="small mt-2" style="color: var(--primary-color);">Checking for saved progress...</p>`;

    if (db && user && fbFirestore) {
        try {
            const { doc, getDoc } = fbFirestore;
            const docId = `PreTest_${studentId}_${chapterTitle.replace(/\s+/g, '_')}`;
            const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/progress/${docId}`);
            const progressDoc = await getDoc(docRef);
            
            if (progressDoc.exists()) {
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
        await setDoc(docRef, { currentIndex, userAnswers, examQuestions, timestamp: Date.now() });
    } catch (e) {
        console.error("Failed to sync progress:", e);
    }
}

function renderQuestion() {
    const container = document.getElementById('quiz-pane');
    const q = examQuestions[currentIndex];
    const isAnswered = userAnswers[currentIndex] !== undefined;
    
    const optionsHtml = q.options.map((opt, i) => {
        const isSelected = userAnswers[currentIndex] === i;
        const cardBg = isSelected ? "background-color: var(--secondary-color); border-color: var(--primary-color) !important;" : "background-color: white; border-color: #dee2e6;";
        return `
        <div class="col-md-6 mb-3">
            <div class="card h-100 shadow-sm" onclick="selectOption(${i})" style="cursor: pointer; border-width: 2px !important; ${cardBg}">
                <div class="card-body d-flex align-items-center">
                    <input class="form-check-input me-3 mt-0" type="radio" ${isSelected ? 'checked' : ''} style="pointer-events: none; border-color: var(--primary-color);">
                    <label class="form-check-label w-100 fw-bold" style="pointer-events: none; color: var(--primary-color);">${escapeHtml(opt)}</label>
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="card shadow-sm border-0 p-4" style="border-top: 6px solid var(--primary-color) !important;">
            <div class="text-center mb-4">
                <div class="d-flex justify-content-between mb-3 small text-muted">
                    <span><strong>Student:</strong> ${escapeHtml(lName)}, ${escapeHtml(fName)} (${sClass})</span>
                    <span>Diagnostic: ${chapterTitle}</span>
                </div>
                <div class="progress mb-4 no-print" style="height: 10px; background-color: var(--secondary-color);">
                    <div class="progress-bar" style="width: ${((currentIndex + 1) / examQuestions.length) * 100}%; background-color: var(--primary-color);"></div>
                </div>
                <h5 class="fw-bold mb-1" style="color: var(--tertiary-color);">Question ${currentIndex + 1} of ${examQuestions.length}</h5>
                <h4 class="fw-bold mt-3 text-dark lh-base" style="color: var(--primary-color);">${escapeHtml(q.question)}</h4>
            </div>
            <div class="row mt-4 px-2">${optionsHtml}</div>
            <div class="d-flex justify-content-between mt-4 pt-4 border-top no-print">
                <button class="btn fw-bold" onclick="prevQuestion()" ${currentIndex === 0 ? 'disabled' : ''} style="background: transparent; color: var(--primary-color); border: 2px solid var(--primary-color);">Previous</button>
                <button class="btn px-5 fw-bold shadow-sm" style="background-color: var(--primary-color); color: white; border: none; opacity: ${isAnswered ? '1' : '0.5'};" onclick="${currentIndex === examQuestions.length - 1 ? 'confirmSubmit()' : 'nextQuestion()'}" ${isAnswered ? '' : 'disabled'}>
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

async function processResults() {
    examIsActive = false;
    const container = document.getElementById('exam-container');
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border" style="color: var(--primary-color);"></div><h3 class="mt-4 fw-bold" style="color: var(--primary-color);">Grading & Submitting...</h3></div>`;

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
        const serverData = await response.json();

        if (serverData.result === "error") {
            container.innerHTML = `
                <div class="card shadow-sm border-0 mx-auto text-center" style="max-width:600px; border-top: 5px solid var(--file-name-color) !important;">
                    <div class="card-body p-5">
                        <i class="fas fa-lock mb-3" style="font-size: 3rem; color: var(--file-name-color);"></i>
                        <h3 class="fw-bold" style="color: var(--file-name-color);">Access Denied</h3>
                        <p class="text-dark mt-3 mb-4">${serverData.message}</p>
                        <button onclick="window.location.href='/proficiencyScales/${window.location.pathname.split('/').pop()}'" class="btn px-4 py-2 fw-bold shadow-sm" style="background-color: var(--primary-color); color: white; border:none;">Return to Proficiency Scale</button>
                    </div>
                </div>`;
            return;
        }
        
        finalScore = Number(serverData.score) || 0; 
        finalTotal = Number(serverData.total) || examQuestions.length; 
        finalPercentage = Number(serverData.percentage) || 0; 
        serverFeedback = serverData.feedback || [];

        if (db && user && fbFirestore) {
            const { doc, deleteDoc, setDoc, collection } = fbFirestore;
            
            const docId = `PreTest_${studentId}_${chapterTitle.replace(/\s+/g, '_')}`;
            const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/progress/${docId}`);
            await deleteDoc(docRef);

            const chapterNumMatch = chapterTitle.match(/(?:chapter|ch|unit)\s*(\d+)/i);
            const chapterNum = chapterNumMatch ? chapterNumMatch[1] : null;
            const prefix = chapterTitle.toLowerCase().includes('unit') ? 'Unit' : 'Ch';
            
            const finalAssignmentKey = chapterNum ? `${prefix}${chapterNum}-Pre-Assessment` : "Pre-Assessment";
            
            const gradeRef = doc(db, 'artifacts', appId, 'public', 'data', 'grades', studentId);
            await setDoc(gradeRef, { 
                [finalAssignmentKey]: { score: finalScore, max: finalTotal, timestamp: new Date().toLocaleString() },
                lastSubmitDate: new Date().toLocaleString()
            }, { merge: true });

            try {
                let exactChapterName = chapterTitle;
                if (window.parent && window.parent.document) {
                    const activeTab = window.parent.document.querySelector('.chapter-tab-btn.active');
                    if (activeTab && activeTab.dataset.chapter) exactChapterName = activeTab.dataset.chapter;
                }
                
                const isCS = chapterTitle.toLowerCase().includes('unit');
                const notebookCollection = isCS ? 'cs_notebook' : 'notebook';
                
                const notebookRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/${notebookCollection}`));
                await setDoc(notebookRef, {
                    title: `Diagnostic Assessment Results`,
                    chapter: exactChapterName,
                    category: "Reflection",
                    content: `<h2>Diagnostic Complete</h2><p>You scored ${finalPercentage}% on your pre-assessment.</p><p>You have successfully unlocked the curriculum workspace for this module.</p>`,
                    timestamp: Date.now()
                });
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
                    <p class="mb-1 small text-dark">Your Answer: <span class="${isCorrect ? 'text-success' : 'text-danger'} fw-bold">${escapeHtml(studentChoice)}</span></p>
                    <div class="d-flex align-items-center mt-1">
                        ${isCorrect ? `<span class="badge bg-success text-white me-2">✅ Correct</span>` : `<span class="badge" style="background-color: var(--file-name-color); color: white;">❌ Incorrect</span>`}
                    </div>
                    ${!isCorrect && feedbackMap[q.question.trim()] ? `<div class="mt-2 p-2 rounded bg-light border-start border-danger border-4 small italic text-muted">💡 <strong>Hint:</strong> ${escapeHtml(feedbackMap[q.question.trim()])}</div>` : ''}
                </div>`;
        }).join('');

        container.innerHTML = `
            <div class="card shadow mx-auto text-center" style="max-width: 750px; border: 2px solid var(--code-color);">
                <div class="card-body p-4 p-md-5">
                    <div class="display-4 mb-3 no-print">📋</div>
                    <h2 class="fw-bold mb-3" style="color: var(--code-color);">Diagnostic Complete!</h2>
                    <div class="p-4 rounded border text-start" style="background-color: var(--secondary-color); border-color: var(--primary-color) !important;">
                        <h4 class="mb-1 fw-bold" style="color: var(--primary-color);">${escapeHtml(lName)}, ${escapeHtml(fName)}</h4>
                        <p class="small text-dark mb-3">${sClass} | ${chapterTitle} | ID: ${studentId}</p>
                        <h1 class="display-3 fw-bold mb-0" style="color: var(--primary-color);">${serverData.percentage}%</h1>
                        <p class="fw-bold mt-2 mb-4 text-dark border-bottom pb-2" style="border-color: var(--primary-color) !important;">${serverData.score} out of ${serverData.total} correct</p>
                        <div class="review-section mt-3" style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                            <h6 class="fw-bold mb-3" style="color: var(--primary-color);">Detailed Performance Review:</h6>
                            ${reviewHtml}
                        </div>
                    </div>
                    <div class="mt-4 no-print d-flex justify-content-center gap-2">
                        <button onclick="downloadPDFReport(event)" class="btn text-white px-4 shadow-sm" style="background-color: var(--primary-color); border:none;">📥 Download PDF Report</button>
                        <button onclick="window.parent.postMessage({type: 'diagnostic_complete'}, '*'); window.location.href='/proficiencyScales/${window.location.pathname.split('/').pop()}';" class="btn px-4 fw-bold bg-white" style="color: var(--primary-color); border: 2px solid var(--primary-color);">Continue to Curriculum</button>
                    </div>
                </div>
            </div>`;
            
        if (window.parent) {
            window.parent.postMessage({type: 'diagnostic_complete', score: finalScore}, '*');
        }
            
    } catch (error) { 
        container.innerHTML = `<div class="alert alert-danger shadow" style="border: 2px solid var(--file-name-color); color: var(--file-name-color);"><strong>Submission Error:</strong> ${error.message} <br>Please alert your instructor.</div>`; 
    }
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
            const isCorrect = !hint;

            doc.setFont("helvetica", "normal");
            if (isCorrect) doc.setTextColor(0, 150, 0); 
            else doc.setTextColor(200, 0, 0); 
            
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

// Bind methods to window so inline HTML onclick attributes can access them
window.selectOption = selectOption;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.confirmSubmit = confirmSubmit;
window.processResults = processResults;
window.checkResume = checkResume;
window.downloadPDFReport = downloadPDFReport;