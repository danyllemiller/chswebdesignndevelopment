// File: /js/cs-interactive.js
/**
 * CHS Computer Science - Interactive Workspace Controller
 * ---------------------------------------------------------------------
 * Handles the nested 5-Unit/18-Chapter structure, granular progression gates, 
 * Monaco Code Editor, External Dropbox, and embedded Digital Journal.
 */

(function() {
    const patch = function(original) {
        return function(selector) {
            if (typeof selector === 'string' && selector.includes(',')) {
                const cleaned = selector.split(',').map(s => s.trim()).filter(s => s.length > 0).join(', ');
                if (cleaned !== selector) selector = cleaned === '' ? 'nothing_to_select' : cleaned;
            }
            try { return original.call(this, selector); } 
            catch (e) { return document.createDocumentFragment().querySelectorAll('*'); }
        };
    };
    Document.prototype.querySelectorAll = patch(Document.prototype.querySelectorAll);
    Element.prototype.querySelectorAll = patch(Element.prototype.querySelectorAll);
})();

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const HOSTGATOR_UPLOAD_URL = "https://digitalartsclasses.com/upload.php";
const HOSTGATOR_MANAGE_URL = "https://digitalartsclasses.com/manage_files.php";

const firebaseConfig = {
    apiKey: "AIzaSyAK1sGWu6jyWzbxfQCj-cgUBn85mJh9Nv0",
    authDomain: "digitalartsclasses-games-67ae7.firebaseapp.com",
    projectId: "digitalartsclasses-games-67ae7",
    storageBucket: "digitalartsclasses-games-67ae7.firebasestorage.app",
    messagingSenderId: "662051088920",
    appId: "1:662051088920:web:3b05cb890d834c0b9cb16d"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const customAppId = typeof __app_id !== 'undefined' ? __app_id : 'dac-exam-system';

const csCourseMap = [
    {
        unitNum: 1, name: "Unit 1: The Digital Foundation",
        chapters: [
            { ch: 1, title: "Ch 1: How Computers Work", file: "how_computers_work.html" },
            { ch: 2, title: "Ch 2: Essential Computer Skills", file: "essential_computer_skills.html" },
            { ch: 3, title: "Ch 3: Intro to Office Software", file: "intro_to_office_software.html" }
        ]
    },
    {
        unitNum: 2, name: "Unit 2: The Connected World",
        chapters: [
            { ch: 4, title: "Ch 4: How the Internet Works", file: "how_the_internet_works.html" },
            { ch: 5, title: "Ch 5: Cybersecurity Threats", file: "cybersecurity_threats.html" },
            { ch: 6, title: "Ch 6: Defending Systems", file: "defending_systems.html" }
        ]
    },
    {
        unitNum: 3, name: "Unit 3: The Data Architect",
        chapters: [
            { ch: 7, title: "Ch 7: Language of Computers", file: "language_of_computers.html" },
            { ch: 8, title: "Ch 8: Storing Data", file: "storing_data.html" },
            { ch: 9, title: "Ch 9: Mastering Spreadsheets", file: "mastering_spreadsheets.html" },
            { ch: 10, title: "Ch 10: Computational Modeling", file: "computational_modeling.html" }
        ]
    },
    {
        unitNum: 4, name: "Unit 4: The Logic Builder",
        chapters: [
            { ch: 11, title: "Ch 11: Problem Solving & Algorithms", file: "problem_solving_algorithms.html" },
            { ch: 12, title: "Ch 12: Control Structures & Events", file: "control_structures_events.html" },
            { ch: 13, title: "Ch 13: Advanced Data Structures", file: "advanced_data_structures.html" },
            { ch: 14, title: "Ch 14: Modularity & Procedures", file: "modularity_procedures.html" }
        ]
    },
    {
        unitNum: 5, name: "Unit 5: The Human Impact",
        chapters: [
            { ch: 15, title: "Ch 15: Software Development Lifecycle", file: "software_development_lifecycle.html" },
            { ch: 16, title: "Ch 16: Ethics, Privacy & Law", file: "ethics_privacy_law.html" },
            { ch: 17, title: "Ch 17: Culture, Equity & Bias", file: "culture_equity_bias.html" },
            { ch: 18, title: "Ch 18: AI & Cross Disciplinary", file: "ai_cross_disciplinary.html" }
        ]
    }
];

let activeUnit = csCourseMap[0];
let activeTab = { type: 'PRE_SCALE' }; 

let currentStudentData = null;
let worksheetsLibrary = {};

const dom = {
    unitContainer: document.getElementById('unitTabsContainer'),
    chapContainer: document.getElementById('chapterTabsContainer'),
    curriculumFrame: document.getElementById('curriculum-frame'),
    assessmentFrame: document.getElementById('assessment-frame'),
    examOverlay: document.getElementById('exam-launch-overlay'),
    workspaceLock: document.getElementById('workspace-lock'),
    statusPill: document.getElementById('unit-status-pill'),
    paneTitle: document.getElementById('list-chapter-title')
};

function setupOverwriteModal() {
    if (document.getElementById('overwriteModal')) return;
    const modalHtml = `
      <div class="modal fade" id="overwriteModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content shadow border-danger">
            <div class="modal-header py-2 bg-danger text-white">
              <h6 class="modal-title fw-bold mb-0 font-monospace"><i class="fas fa-exclamation-triangle me-1"></i> File Exists</h6>
            </div>
            <div class="modal-body bg-light text-center">
              <p id="overwriteModalMsg" class="small mb-3 text-dark fw-bold"></p>
              <div class="d-flex flex-column gap-2">
                <button type="button" class="btn btn-danger btn-sm fw-bold w-100 shadow-sm" data-action="overwrite">Overwrite File</button>
                <button type="button" class="btn btn-primary btn-sm fw-bold w-100 shadow-sm" data-action="copy">Keep Both (Make Copy)</button>
                <button type="button" class="btn btn-outline-danger btn-sm fw-bold w-100" data-action="overwriteAll">Overwrite All</button>
                <button type="button" class="btn btn-secondary btn-sm fw-bold w-100 shadow-sm" data-action="skip">Skip File</button>
                <button type="button" class="btn btn-outline-secondary btn-sm fw-bold w-100" data-action="skipAll">Skip All</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function askForOverwrite(fileName) {
    return new Promise((resolve) => {
        const safeName = fileName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        document.getElementById('overwriteModalMsg').innerHTML = `The file <br><span class="fw-bold text-danger font-monospace border-bottom border-danger">${safeName}</span><br> already exists.<br><br>What would you like to do?`;
        
        const modalEl = document.getElementById('overwriteModal');
        let modal = null;
        if (typeof bootstrap !== 'undefined') { 
            modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl); 
            modal.show(); 
        }
        
        const buttons = modalEl.querySelectorAll('button[data-action]');
        const cleanup = () => { buttons.forEach(btn => btn.removeEventListener('click', handleChoice)); };
        
        const handleChoice = (e) => {
            if (document.activeElement) document.activeElement.blur(); 
            const action = e.target.getAttribute('data-action');
            cleanup(); if(modal) modal.hide(); resolve(action);
        };
        
        buttons.forEach(btn => btn.addEventListener('click', handleChoice));
    });
}

async function loadWorksheetLibrary() {
    try {
        const resp = await fetch('/data/cs-worksheets.json?v=' + Date.now());
        if (resp.ok) worksheetsLibrary = await resp.json();
    } catch (e) { console.warn("Worksheet Library not found."); }
}
loadWorksheetLibrary();

function extractAutoTitle(htmlString, titleElement, defaultTitleString) {
    if (!titleElement) return;
    const current = titleElement.value.trim();
    if (current === '' || current === defaultTitleString || current.startsWith('Note: ')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const heading = doc.querySelector('h1, h2, h3, h4');
        if (heading && heading.textContent.trim()) {
            titleElement.value = heading.textContent.trim().substring(0, 80);
        } else if (current === '' || current === defaultTitleString) {
            const now = new Date();
            titleElement.value = "Note: " + now.toLocaleDateString() + " " + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("/login.html");
        return;
    }
    
    const username = user.email.split('@')[0];
    const rosterRef = collection(db, 'artifacts', customAppId, 'public', 'data', 'roster');
    
    try {
        const q = query(rosterRef, where("username", "==", username));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            currentStudentData = snap.docs[0].data();
            currentStudentData.studentId = currentStudentData.studentId || snap.docs[0].id;
            
            const subtitle = document.getElementById('userSubtitle');
            if (subtitle) subtitle.innerText = `${currentStudentData.firstName} ${currentStudentData.lastName} | ID: ${currentStudentData.studentId}`;
            
            setupOverwriteModal();
            initCSInteractive(user, currentStudentData);
        } else {
            document.getElementById('cs-interactive-pane').innerHTML = `<div class="container text-center p-5 mt-5 shadow border rounded bg-white">
                <h2 class="text-danger gochi">Profile Not Linked</h2>
                <p>Your account is not linked to the roster.</p>
                <a href="/logout.html" class="btn btn-outline-danger mt-3">Log Out</a></div>`;
        }
    } catch(e) { console.error("Auth Error:", e); }
});

function renderTabs() {
    if (dom.unitContainer) {
        dom.unitContainer.innerHTML = csCourseMap.map(u => 
            `<button class="unit-tab-btn ${u.unitNum === activeUnit.unitNum ? 'active' : ''}" data-unit="${u.unitNum}">
                ${u.name}
            </button>`
        ).join('');
    }

    if (dom.chapContainer) {
        let chapHtml = '';
        
        chapHtml += `<button class="chapter-tab-btn ${activeTab.type === 'PRE_SCALE' ? 'active' : ''}" data-target="PRE_SCALE">
                        <i class="fas fa-balance-scale me-1 text-muted"></i> Pre-Scale
                     </button>`;
                     
        chapHtml += `<button class="chapter-tab-btn ${activeTab.type === 'PRE_TEST' ? 'active' : ''}" data-target="PRE_TEST">
                        <i class="fas fa-clipboard-check me-1 text-muted"></i> Diagnostic
                     </button>`;

        activeUnit.chapters.forEach(c => {
            const isActive = activeTab.type === 'CHAPTER' && activeTab.data && activeTab.data.ch === c.ch;
            chapHtml += `<button class="chapter-tab-btn ${isActive ? 'active' : ''}" data-target="CH_${c.ch}">
                            ${c.title.split(':')[0]}
                         </button>`;
        });
        
        chapHtml += `<button class="chapter-tab-btn exam-tab-btn ${activeTab.type === 'EXAM' ? 'active' : ''}" data-target="EXAM">
                        <i class="fas fa-trophy me-1"></i> Unit ${activeUnit.unitNum} Exam
                     </button>`;
                     
        chapHtml += `<button class="chapter-tab-btn ${activeTab.type === 'POST_SCALE' ? 'active' : ''}" data-target="POST_SCALE">
                        <i class="fas fa-chart-line me-1 text-muted"></i> Post-Scale
                     </button>`;
                     
        dom.chapContainer.innerHTML = chapHtml;
    }
}

function checkChapterCompletion(unit, grades) {
    return unit.chapters.every(c => {
        return Object.keys(grades).some(k => k.match(new RegExp(`^Ch${c.ch}-`, 'i')));
    });
}

function initCSInteractive(currentUser, student) {
    const viewJournal = document.getElementById('view-journal');
    const viewDropbox = document.getElementById('view-dropbox');
    const viewCode = document.getElementById('view-code');
    const modeTitle = document.getElementById('workspace-mode-title');
    const modeBadge = document.getElementById('workspace-badge');
    
    let activeNoteId = null;
    let autoSaveTimer = null; 

    const syncToGradebook = async (baseName, score, maxPoints) => {
        if (activeTab.type !== 'CHAPTER') return;
        const finalAssignmentKey = `Ch${activeTab.data.ch}-${baseName} [${maxPoints} pts]`;
        try {
            const gradeRef = doc(db, 'artifacts', customAppId, 'public', 'data', 'grades', student.studentId);
            const gradeSnap = await getDoc(gradeRef);
            if (gradeSnap.exists() && gradeSnap.data()[finalAssignmentKey]?.teacherOverride) return;

            const readableTime = new Date().toLocaleString();
            await setDoc(gradeRef, { 
                [finalAssignmentKey]: { score: score, max: maxPoints, timestamp: readableTime },
                lastSubmitDate: readableTime
            }, { merge: true });
        } catch (e) { console.error("Gradebook sync failed:", e); }
    };

    const checkProgressAndGate = async (isAutoAdvance = false) => {
        if (!currentStudentData) return;
        
        try {
            // 1. Fetch Teacher Grades
            const gradeRef = doc(db, 'artifacts', customAppId, 'public', 'data', 'grades', currentStudentData.studentId);
            const gradeSnap = await getDoc(gradeRef);
            let grades = gradeSnap.exists() ? gradeSnap.data() : {};
            
            // 2. Fetch Self-Assessments
            const saRef = doc(db, 'artifacts', customAppId, 'users', currentUser.uid, 'self_assessments', 'computer_science');
            const saSnap = await getDoc(saRef);
            let selfAssessments = saSnap.exists() ? saSnap.data() : {};
            
            // 3. Resolve States
            const hasPreScale = selfAssessments[`unit${activeUnit.unitNum}`] !== undefined && selfAssessments[`unit${activeUnit.unitNum}`] > 0;
            const hasPreTest = Object.keys(grades).some(k => k.match(new RegExp(`Unit\\s*-?\\s*${activeUnit.unitNum}`, 'i')) && k.match(/(Diagnostic|Pre-Assessment)/i));
            const hasExam = Object.keys(grades).some(k => k.match(new RegExp(`Unit\\s*-?\\s*${activeUnit.unitNum}`, 'i')) && k.match(/Summative/i));
            const hasAllChapWork = checkChapterCompletion(activeUnit, grades);

            if (isAutoAdvance) {
                if (!hasPreScale) activeTab = { type: 'PRE_SCALE' };
                else if (!hasPreTest) activeTab = { type: 'PRE_TEST' };
                else if (!hasExam && !hasAllChapWork) {
                    let incompleteCh = activeUnit.chapters.find(c => !Object.keys(grades).some(k => k.match(new RegExp(`^Ch${c.ch}-`, 'i'))));
                    activeTab = { type: 'CHAPTER', data: incompleteCh || activeUnit.chapters[0] };
                }
                else if (!hasExam && hasAllChapWork) activeTab = { type: 'EXAM' };
                else activeTab = { type: 'POST_SCALE' };
                renderTabs(); 
            } else {
                if (['CHAPTER', 'EXAM', 'POST_SCALE'].includes(activeTab.type)) {
                    if (!hasPreScale) {
                        activeTab = { type: 'PRE_SCALE' };
                        renderTabs();
                    } else if (!hasPreTest) {
                        activeTab = { type: 'PRE_TEST' };
                        renderTabs();
                    }
                }
            }

            // Hide Everything
            if (dom.curriculumFrame) dom.curriculumFrame.classList.add('d-none');
            if (dom.assessmentFrame) dom.assessmentFrame.classList.add('d-none');
            if (dom.examOverlay) dom.examOverlay.classList.add('d-none');
            if (dom.workspaceLock) dom.workspaceLock.classList.add('d-none');
            if (dom.statusPill) dom.statusPill.classList.add('d-none');
            if (viewJournal) viewJournal.classList.add('d-none');
            if (viewDropbox) viewDropbox.classList.add('d-none');
            if (viewCode) viewCode.classList.add('d-none');

            // Render Active State
            if (activeTab.type === 'PRE_SCALE') {
                const url = `/proficiencyScales/cs-unit-${activeUnit.unitNum}.html?type=pre`;
                if(dom.assessmentFrame && !dom.assessmentFrame.src.includes(url)) dom.assessmentFrame.src = url;
                if(dom.assessmentFrame) dom.assessmentFrame.classList.remove('d-none');
                if(dom.paneTitle) dom.paneTitle.innerText = `Unit ${activeUnit.unitNum}: Pre-Evaluation Scale`;
                
                if(dom.workspaceLock) {
                    dom.workspaceLock.innerHTML = `<i class="fas fa-balance-scale text-primary fa-4x mb-3 border p-3 rounded-circle bg-light shadow-sm"></i><h3 class="fw-bold">Workspace Locked</h3><p class="text-muted px-5">Please complete the Self-Evaluation Proficiency Scale on the left to proceed.</p>`;
                    dom.workspaceLock.classList.remove('d-none');
                }
            }
            else if (activeTab.type === 'PRE_TEST') {
                const url = `/pre-assessments/cs-unit-${activeUnit.unitNum}.html`;
                if(dom.assessmentFrame && !dom.assessmentFrame.src.includes(url)) dom.assessmentFrame.src = url;
                if(dom.assessmentFrame) dom.assessmentFrame.classList.remove('d-none');
                if(dom.paneTitle) dom.paneTitle.innerText = `Unit ${activeUnit.unitNum}: Diagnostic Pre-Assessment`;

                if(dom.workspaceLock) {
                    dom.workspaceLock.innerHTML = `<i class="fas fa-lock text-danger fa-4x mb-3 border p-3 rounded-circle bg-light shadow-sm"></i><h3 class="fw-bold">Workspace Locked</h3><p class="text-muted px-5">You must complete the Diagnostic Pre-Assessment on the left to unlock the unit chapters.</p>`;
                    dom.workspaceLock.classList.remove('d-none');
                }
            }
            else if (activeTab.type === 'CHAPTER') {
                const url = `/compsci/${activeTab.data.file}`;
                if (dom.curriculumFrame && !dom.curriculumFrame.src.includes(url)) dom.curriculumFrame.src = url;
                if (dom.curriculumFrame) dom.curriculumFrame.classList.remove('d-none');
                if (dom.paneTitle) dom.paneTitle.innerText = `${activeUnit.name} - ${activeTab.data.title}`;

                const chNum = activeTab.data.ch;
                const codeChapters = [12, 13, 14]; 
                const dropboxChapters = [3, 9, 10, 11, 15, 17, 18];

                if (codeChapters.includes(chNum) && viewCode) {
                    viewCode.classList.remove('d-none');
                    if (modeTitle) modeTitle.innerHTML = `<i class="fas fa-code me-2"></i> Logic & Algorithm Sandbox`;
                    if (modeBadge) modeBadge.className = "badge bg-dark text-white font-monospace shadow-sm", modeBadge.innerText = "Code Mode";
                } else if (dropboxChapters.includes(chNum) && viewDropbox) {
                    viewDropbox.classList.remove('d-none');
                    if (modeTitle) modeTitle.innerHTML = `<i class="fas fa-file-upload me-2"></i> Artifact Dropbox`;
                    if (modeBadge) modeBadge.className = "badge bg-info text-white font-monospace shadow-sm", modeBadge.innerText = "Upload Mode";
                } else if (viewJournal) {
                    viewJournal.classList.remove('d-none');
                    if (modeTitle) modeTitle.innerHTML = `<i class="fas fa-pencil-alt me-2"></i> Essay & Reflection Journal`;
                    if (modeBadge) modeBadge.className = "badge bg-warning text-dark font-monospace shadow-sm", modeBadge.innerText = "Journal Mode";
                }
            }
            else if (activeTab.type === 'EXAM') {
                if (dom.paneTitle) dom.paneTitle.innerText = `Unit ${activeUnit.unitNum}: Final Assessment`;
                if (!hasAllChapWork) {
                    if (dom.examOverlay) {
                        dom.examOverlay.innerHTML = `<i class="fas fa-ban text-danger fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i><h3 class="fw-bold">Exam Locked</h3><p class="text-muted px-4 mb-4">You must submit work (Journal, Code, or File Upload) for <strong>every chapter</strong> in this unit before the exam unlocks.</p>`;
                        dom.examOverlay.classList.remove('d-none');
                    }
                } else {
                    if (dom.examOverlay) {
                        dom.examOverlay.innerHTML = `
                            <i class="fas fa-file-signature text-primary fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i>
                            <h3 class="fw-bold">Summative Assessment Ready</h3>
                            <p class="text-muted px-4 mb-4">You have reached the end of this unit! The final exam will open in a <strong>secure new tab</strong>. Use the Journal scratchpad to help you.</p>
                            <button id="btn-launch-exam" class="btn btn-primary btn-lg fw-bold px-5 shadow-sm mt-2">
                                <i class="fas fa-external-link-alt me-2"></i> Launch Secure Exam
                            </button>
                        `;
                        dom.examOverlay.classList.remove('d-none');
                        document.getElementById('btn-launch-exam').onclick = () => window.open(`/exams/cs-unit-${activeUnit.unitNum}-exam.html`, '_blank');
                    }
                }
                if (viewJournal) {
                    viewJournal.classList.remove('d-none');
                    if (modeTitle) modeTitle.innerHTML = `<i class="fas fa-pencil-alt me-2"></i> Exam Scratchpad`;
                    if (modeBadge) modeBadge.className = "badge bg-secondary text-white font-monospace shadow-sm", modeBadge.innerText = "Notes Mode";
                }
            }
            else if (activeTab.type === 'POST_SCALE') {
                if (dom.paneTitle) dom.paneTitle.innerText = `Unit ${activeUnit.unitNum}: Post-Evaluation`;
                if (!hasExam) {
                    if (dom.examOverlay) {
                        dom.examOverlay.innerHTML = `<i class="fas fa-lock text-warning fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i><h3 class="fw-bold">Evaluation Locked</h3><p class="text-muted px-4 mb-4">You must complete the <strong>Unit ${activeUnit.unitNum} Summative Exam</strong> before filling out the final self-evaluation.</p>`;
                        dom.examOverlay.classList.remove('d-none');
                    }
                } else {
                    const url = `/proficiencyScales/cs-unit-${activeUnit.unitNum}.html?type=post`;
                    if(dom.assessmentFrame && !dom.assessmentFrame.src.includes(url)) dom.assessmentFrame.src = url;
                    if(dom.assessmentFrame) dom.assessmentFrame.classList.remove('d-none');
                }
                if(dom.workspaceLock) {
                    dom.workspaceLock.innerHTML = `<i class="fas fa-chart-line text-success fa-4x mb-3 border p-3 rounded-circle bg-light shadow-sm"></i><h3 class="fw-bold">Workspace Locked</h3><p class="text-muted px-5">Please complete the Post-Evaluation Proficiency Scale on the left to finish this unit.</p>`;
                    dom.workspaceLock.classList.remove('d-none');
                }
            }

            await fetchNotes();

        } catch (e) { console.error("Gating Check Failed:", e); }
    };

    // Monaco Code Editor Setup
    if (typeof require !== 'undefined' && document.getElementById('monaco-container')) {
        if (!window.monacoEditorInstance && !window.monacoIsLoading) {
            window.monacoIsLoading = true; 
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});
            require(['vs/editor/editor.main'], function() {
                window.monacoEditorInstance = monaco.editor.create(document.getElementById('monaco-container'), {
                    value: '<!-- Sandbox Environment -->\n<div style="text-align: center; margin-top: 20px;">\n  <h1 style="color: #000099; font-family: sans-serif;">Code Runner Ready</h1>\n</div>',
                    language: 'html', theme: 'vs-dark', automaticLayout: true
                });
                window.monacoIsLoading = false; 
                
                const runBtn = document.getElementById('btn-run-code');
                if (runBtn) {
                    runBtn.onclick = () => {
                        const outFrame = document.getElementById('code-output-frame');
                        if (outFrame) outFrame.srcdoc = window.monacoEditorInstance.getValue();
                    };
                }

                const saveCodeBtn = document.getElementById('btn-save-code');
                if (saveCodeBtn) {
                    saveCodeBtn.onclick = async () => {
                        saveCodeBtn.innerHTML = '⏳ Saving...';
                        const code = window.monacoEditorInstance.getValue();
                        const safeCh = activeTab.type === 'CHAPTER' ? activeTab.data.ch : 'Misc';
                        const file = new File([code], `Ch${safeCh}_logic.html`, {type: "text/html"});
                        
                        try {
                            const formData = new FormData();
                            formData.append("studentId", student.studentId);
                            formData.append("assignment", `Chapter_${safeCh}`);
                            formData.append("file", file);
                            formData.append("path", `cs_code/${file.name}`);
                            
                            const resp = await fetch(HOSTGATOR_UPLOAD_URL, { method: "POST", body: formData });
                            const res = await resp.json();
                            
                            if (res.success) {
                                saveCodeBtn.innerHTML = '✅ Saved!';
                                await syncToGradebook('Code Sandbox', 25, 25);
                            } else { saveCodeBtn.innerHTML = '❌ Error'; }
                        } catch(e) { saveCodeBtn.innerHTML = '❌ Error'; }
                        setTimeout(() => { saveCodeBtn.innerHTML = '<i class="fas fa-save"></i> Save & Turn In'; }, 2000);
                    };
                }
            });
        }
    }

    const contentIn = document.getElementById('note-content');
    const previewFrame = document.getElementById('preview-frame');
    const titleInput = document.getElementById('note-title');
    const catInput = document.getElementById('note-category');
    
    function updatePreview() {
        if (!previewFrame || !contentIn) return;
        const htmlContent = contentIn.value;
        const srcDoc = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    :root { --primary: #000099; --secondary: #cfe1f0; --accent: #E07A5F; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #333; line-height: 1.6; }
                    h2, h3, h4 { color: var(--primary); border-bottom: 2px solid var(--secondary); padding-bottom: 5px; margin-top: 0; }
                    .donow { background: #fffcf0; border-left: 5px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
                    .worksheet { font-family: 'Courier New', Courier, monospace; background: #f8f9fa; padding: 15px; border: 1px solid #ddd; }
                    .blank { border-bottom: 2px solid var(--primary); color: var(--primary); padding: 0 5px; font-weight: bold; }
                </style>
                <script>
                    function sync() { window.parent.postMessage({type:'updateHtml',content:document.body.innerHTML}, '*');} 
                    document.addEventListener('keydown', function(e) { 
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { 
                            e.preventDefault(); document.execCommand('undo'); sync(); 
                        } 
                    });
                </script>
            </head>
            <body contenteditable="true" oninput="sync()">${htmlContent || '<h2>Reflection</h2><p>Begin typing here...</p>'}</body>
            </html>
        `;
        previewFrame.srcdoc = srcDoc;
    }

    async function fetchNotes() {
        const snap = await getDocs(collection(db, 'artifacts', customAppId, 'users', currentUser.uid, 'cs_notebook'));
        const allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.timestamp - a.timestamp);
        
        let chapterString = `Unit ${activeUnit.unitNum} General`;
        if (activeTab.type === 'CHAPTER') chapterString = `Unit ${activeUnit.unitNum} - ${activeTab.data.title}`;
        else if (activeTab.type === 'EXAM') chapterString = `Unit ${activeUnit.unitNum} Exam Scratchpad`;

        const currentNotes = allNotes.filter(n => n.chapter === chapterString);
        
        if (currentNotes.length > 0) {
            const note = currentNotes[0];
            activeNoteId = note.id;
            if(titleInput) titleInput.value = note.title;
            if(contentIn) contentIn.value = note.content;
            updatePreview();
        } else {
            window.prepareNewNote();
        }
    }

    async function saveJournalData(isFinalSubmit = false) {
        if (!titleInput || !titleInput.value.trim()) return; 
        
        const btn = document.getElementById('btn-save-note');
        let originalText = '<i class="fas fa-save me-2"></i> Save & Turn In Worksheet';
        
        if (btn) {
            if (!btn.innerHTML.includes('Auto-saving') && !btn.innerHTML.includes('Saving') && !btn.innerHTML.includes('Submitting')) {
                originalText = btn.innerHTML;
            }
            btn.innerHTML = isFinalSubmit ? '⏳ Submitting...' : '⏳ Auto-saving...';
        }

        let chapterString = `Unit ${activeUnit.unitNum} General`;
        if (activeTab.type === 'CHAPTER') chapterString = `Unit ${activeUnit.unitNum} - ${activeTab.data.title}`;
        else if (activeTab.type === 'EXAM') chapterString = `Unit ${activeUnit.unitNum} Exam Scratchpad`;

        const categoryVal = catInput ? catInput.value : "Reflection";
        
        const data = {
            title: titleInput.value.trim(),
            chapter: chapterString, 
            category: categoryVal,
            content: contentIn ? contentIn.value : "",
            timestamp: Date.now()
        };

        if (isFinalSubmit) data.isSubmitted = true;

        try {
            if (activeNoteId) {
                await setDoc(doc(db, 'artifacts', customAppId, 'users', currentUser.uid, 'cs_notebook', activeNoteId), data, { merge: true });
            } else {
                const newDoc = await addDoc(collection(db, 'artifacts', customAppId, 'users', currentUser.uid, 'cs_notebook'), data);
                activeNoteId = newDoc.id; 
            }

            if (btn) {
                btn.innerHTML = '✅ Saved!';
                if (isFinalSubmit && categoryVal === 'Worksheet') {
                    await syncToGradebook('Worksheet', 25, 25);
                }
                setTimeout(() => { btn.innerHTML = originalText; }, 2000);
            }
        } catch (e) {
            if (btn) btn.innerHTML = '❌ Error';
            setTimeout(() => { if (btn) btn.innerHTML = originalText; }, 2000);
        }
    }

    function triggerAutoSave() {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => saveJournalData(false), 1500); 
    }

    const addRichTextToolbar = () => {
        const frameContainer = previewFrame ? previewFrame.parentElement : null;
        if (frameContainer && !document.getElementById('rich-text-toolbar')) {
            frameContainer.style.display = 'flex';
            frameContainer.style.flexDirection = 'column';
            frameContainer.style.overflow = 'hidden';
            
            previewFrame.style.borderTopLeftRadius = '0';
            previewFrame.style.borderTopRightRadius = '0';
            previewFrame.style.overflow = 'auto';
            
            const rtToolbar = document.createElement('div');
            rtToolbar.id = 'rich-text-toolbar';
            rtToolbar.className = 'd-flex flex-wrap p-2 bg-secondary bg-opacity-10 border border-bottom-0 rounded-top border-secondary align-items-center';
            
            rtToolbar.innerHTML = `
                <div class="btn-group me-2 shadow-sm">
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="undo" title="Undo (Ctrl+Z)"><i class="fas fa-undo"></i></button>
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="redo" title="Redo (Ctrl+Y)"><i class="fas fa-redo"></i></button>
                </div>
                <div class="btn-group me-2 shadow-sm">
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="bold" title="Bold"><i class="fas fa-bold"></i></button>
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="italic" title="Italic"><i class="fas fa-italic"></i></button>
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="underline" title="Underline"><i class="fas fa-underline"></i></button>
                </div>
                <div class="btn-group me-2 shadow-sm">
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn fw-bold" data-command="formatBlock" data-val="H2" title="Heading 1">H1</button>
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn fw-bold" data-command="formatBlock" data-val="H3" title="Heading 2">H2</button>
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn fw-bold" data-command="formatBlock" data-val="P" title="Paragraph">P</button>
                </div>
                <div class="btn-group me-2 shadow-sm">
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="insertUnorderedList" title="Bullet List"><i class="fas fa-list-ul"></i></button>
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn" data-command="insertOrderedList" title="Numbered List"><i class="fas fa-list-ol"></i></button>
                </div>
                <div class="btn-group shadow-sm">
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn text-warning" data-command="hiliteColor" data-val="#fff200" title="Highlight"><i class="fas fa-highlighter"></i></button>
                    <button type="button" class="btn btn-sm btn-light border-secondary rt-btn text-danger" data-command="removeFormat" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
                </div>
            `;
            
            frameContainer.insertBefore(rtToolbar, previewFrame);
            
            rtToolbar.querySelectorAll('.rt-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!previewFrame || !previewFrame.contentWindow) return;
                    
                    const doc = previewFrame.contentWindow.document;
                    const cmd = btn.getAttribute('data-command');
                    const val = btn.getAttribute('data-val') || null;

                    if (cmd === 'hiliteColor') {
                        try {
                            if (!doc.execCommand('hiliteColor', false, val)) doc.execCommand('backColor', false, val);
                        } catch(err) { doc.execCommand('backColor', false, val); }
                    } else {
                        doc.execCommand(cmd, false, val);
                    }
                    
                    previewFrame.contentWindow.focus();
                    if (contentIn) {
                        contentIn.value = doc.body.innerHTML;
                        extractAutoTitle(contentIn.value, titleInput, 'New Entry');
                        triggerAutoSave();
                    }
                });
            });
        }
    };

    const setupTemplatesAndHTML = () => {
        const btnWorksheetCS = document.getElementById('tpl-worksheet');
        if (btnWorksheetCS) {
            btnWorksheetCS.onclick = () => {
                const chNum = activeTab.type === 'CHAPTER' ? activeTab.data.ch : 'Misc';
                const sheet = worksheetsLibrary[chNum];
                if (contentIn) contentIn.value = sheet ? sheet.html : `<div class="worksheet"><h3>Chapter ${chNum} Worksheet</h3><p>Worksheet content coming soon.</p></div>`;
                if (titleInput) titleInput.value = sheet ? sheet.title : `Chapter ${chNum} Worksheet`;
                if (catInput) catInput.value = "Worksheet";
                updatePreview();
                triggerAutoSave();
            };
        }

        const btnDoNowCS = document.getElementById('tpl-donow');
        if (btnDoNowCS) {
            btnDoNowCS.onclick = () => {
                if(contentIn) contentIn.value += `<div class="donow"><h4>Daily Prompt</h4><p><strong>Question:</strong> [Paste Question Here]</p><hr><p><strong>My Response:</strong> </p></div>`;
                if (titleInput && (!titleInput.value || titleInput.value === 'New Entry Title' || titleInput.value === 'New Entry')) titleInput.value = "Do Now Response";
                if (catInput) catInput.value = "Do Now";
                updatePreview();
                triggerAutoSave();
            };
        }

        const btnHtmlCS = document.getElementById('tpl-html');
        if (btnHtmlCS) {
            btnHtmlCS.onclick = () => {
                if(contentIn) contentIn.value = `<h3>Topic: </h3><ul><li>Point 1</li><li>Point 2</li></ul>`;
                if (titleInput && (!titleInput.value || titleInput.value === 'New Entry Title' || titleInput.value === 'New Entry')) titleInput.value = "Topic Notes";
                if (catInput) catInput.value = "Notes";
                updatePreview();
                triggerAutoSave();
            };
        }

        const btnHtmlTemplate = document.getElementById('tpl-html');
        if (btnHtmlTemplate && btnHtmlTemplate.parentNode && !document.getElementById('btn-toggle-code')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'btn-toggle-code';
            toggleBtn.type = 'button';
            toggleBtn.className = 'btn btn-outline-dark fw-bold ms-auto';
            toggleBtn.innerHTML = '<i class="fas fa-code"></i> HTML';
            btnHtmlTemplate.parentNode.appendChild(toggleBtn);
            
            toggleBtn.onclick = () => {
                const rtToolbar = document.getElementById('rich-text-toolbar');
                if (contentIn.classList.contains('d-none')) {
                    contentIn.classList.remove('d-none', 'form-control'); 
                    contentIn.classList.add('notebook-textarea', 'mb-3', 'w-100', 'd-block');
                    toggleBtn.classList.replace('btn-outline-dark', 'btn-dark');
                    if (rtToolbar) rtToolbar.classList.add('d-none');
                    if (previewFrame) {
                        previewFrame.style.height = '300px'; 
                        previewFrame.style.marginBottom = '15px';
                    }
                } else {
                    contentIn.classList.add('d-none', 'form-control');
                    contentIn.classList.remove('notebook-textarea', 'mb-3', 'w-100', 'd-block');
                    toggleBtn.classList.replace('btn-dark', 'btn-outline-dark');
                    if (rtToolbar) rtToolbar.classList.remove('d-none');
                    if (previewFrame) {
                        previewFrame.style.height = '500px'; 
                        previewFrame.style.marginBottom = '0';
                    }
                }
            };
        }
    };

    window.prepareNewNote = function() {
        activeNoteId = null;
        const noteForm = document.getElementById('note-form');
        if(noteForm) noteForm.reset();
        if(contentIn) contentIn.value = `<h2>New Entry Title</h2><p>Start writing your notes here...</p>`;
        if(titleInput) titleInput.value = `New Entry Title`;
        updatePreview();
    };

    window.addEventListener('prepareNewNote', () => window.prepareNewNote());

    // --- EXECUTE THE NEW INCEPTION/IFRAME LOGIC AT THE END ---
    const urlParams = new URLSearchParams(window.location.search);
    const isExamMode = urlParams.get('mode') === 'exam';
    const examUnitParam = parseInt(urlParams.get('unit') || '1', 10);

    if (isExamMode) {
        // OVERRIDE: We are inside an exam iframe. Lock the active unit and hide everything else!
        activeUnit = csCourseMap.find(u => u.unitNum === examUnitParam) || csCourseMap[0];
        activeTab = { type: 'EXAM' };
        
        // Hide Navigation and Left Pane completely
        const navContainer = document.querySelector('.course-nav-container');
        if (navContainer) navContainer.style.display = 'none';
        
        const leftPane = document.getElementById('left-pane-card');
        if (leftPane && leftPane.parentElement) leftPane.parentElement.style.display = 'none';

        // Expand the right pane to 100% width
        const rightPane = viewJournal.closest('.col-lg-6');
        if (rightPane) {
            rightPane.classList.remove('col-lg-6');
            rightPane.classList.add('col-lg-12');
        }
        
        // Force the journal to show, hide the padlock
        if (dom.workspaceLock) dom.workspaceLock.classList.add('d-none');
        if (viewJournal) viewJournal.classList.remove('d-none');
        
        // Update Headers
        if (modeTitle) modeTitle.innerHTML = `<i class="fas fa-pencil-alt me-2"></i> Exam Scratchpad`;
        if (modeBadge) {
            modeBadge.className = "badge bg-secondary text-white font-monospace shadow-sm";
            modeBadge.innerText = "Notes Mode";
        }

        const headerRow = document.querySelector('h1.gochi');
        if (headerRow) headerRow.closest('.row').classList.add('d-none');

        addRichTextToolbar();
        setupTemplatesAndHTML();
        
        if (contentIn) {
            contentIn.addEventListener('input', () => {
                extractAutoTitle(contentIn.value, titleInput, 'New Entry Title');
                try {
                    if (previewFrame.contentWindow?.document?.body) {
                        previewFrame.contentWindow.document.body.innerHTML = contentIn.value;
                    } else updatePreview();
                } catch (e) { updatePreview(); }
                triggerAutoSave();
            });
        }
        
        if (titleInput) titleInput.addEventListener('input', triggerAutoSave);
        if (catInput) catInput.addEventListener('change', triggerAutoSave);

        window.addEventListener('message', (ev) => {
            if (ev.data && ev.data.type === 'updateHtml' && contentIn) {
                contentIn.value = ev.data.content;
                extractAutoTitle(ev.data.content, titleInput, 'New Entry Title');
                triggerAutoSave();
            }
        });

        const noteForm = document.getElementById('note-form');
        if (noteForm) {
            noteForm.onsubmit = async (e) => {
                e.preventDefault();
                if (autoSaveTimer) clearTimeout(autoSaveTimer);
                await saveJournalData(true);
            };
        }
        
        fetchNotes();
        return; // EXIT EARLY: Do not run checkProgressAndGate which causes the lock!
    } else {
        // NORMAL NOTEBOOK MODE
        addRichTextToolbar();
        setupTemplatesAndHTML();
        
        if (contentIn) {
            contentIn.addEventListener('input', () => {
                extractAutoTitle(contentIn.value, titleInput, 'New Entry Title');
                try {
                    if (previewFrame.contentWindow?.document?.body) {
                        previewFrame.contentWindow.document.body.innerHTML = contentIn.value;
                    } else updatePreview();
                } catch (e) { updatePreview(); }
                triggerAutoSave();
            });
        }
        
        if (titleInput) titleInput.addEventListener('input', triggerAutoSave);
        if (catInput) catInput.addEventListener('change', triggerAutoSave);

        window.addEventListener('message', (ev) => {
            if (ev.data && ev.data.type === 'updateHtml' && contentIn) {
                contentIn.value = ev.data.content;
                extractAutoTitle(ev.data.content, titleInput, 'New Entry Title');
                triggerAutoSave();
            }
        });

        const noteForm = document.getElementById('note-form');
        if (noteForm) {
            noteForm.onsubmit = async (e) => {
                e.preventDefault();
                if (autoSaveTimer) clearTimeout(autoSaveTimer);
                await saveJournalData(true);
            };
        }

        // Dropbox Logic
        const csFileInput = document.getElementById('fileInput');
        if (csFileInput) {
            csFileInput.onchange = async function() {
                const files = this.files;
                if(files.length === 0) return;
                const dropZone = document.getElementById('dropZone');
                const originalHtml = dropZone ? dropZone.innerHTML : "";
                if(dropZone) dropZone.innerHTML = `<h5 class="fw-bold text-primary mb-2 mt-4">⏳ Processing...</h5>`;
                
                let successCount = 0;
                let existingFiles = [];
                try {
                    const listData = new FormData();
                    listData.append("action", "list");
                    listData.append("studentId", student.studentId);
                    const listRes = await fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: listData });
                    const listJson = await listRes.json();
                    if (listJson.success) {
                        const prefix = `uploads/${student.studentId}/`;
                        existingFiles = listJson.files.map(f => f.path.startsWith(prefix) ? f.path.substring(prefix.length) : f.path);
                    }
                } catch (err) { console.warn("Could not fetch existing files.", err); }

                let skipAll = false;
                let overwriteAll = false;
                
                for (let i = 0; i < files.length; i++) {
                    if (files[i].name === '.DS_Store' || files[i].name.startsWith('._') || files[i].name === 'Thumbs.db') continue;
                    
                    const chapterStr = activeTab.type === 'CHAPTER' ? `Ch${activeTab.data.ch}` : `Misc`;
                    let finalPath = `submissions/${chapterStr}_${files[i].name}`;
                    
                    if (existingFiles.includes(finalPath)) {
                        if (skipAll) continue;
                        if (!overwriteAll) {
                            const choice = await askForOverwrite(finalPath);
                            if (choice === 'skipAll') { skipAll = true; continue; }
                            else if (choice === 'skip') { continue; }
                            else if (choice === 'overwriteAll') { overwriteAll = true; }
                            else if (choice === 'copy') {
                                const pathParts = finalPath.split('/');
                                const fName = pathParts.pop();
                                const fPath = pathParts.length > 0 ? pathParts.join('/') + '/' : '';
                                
                                const nameParts = fName.split('.');
                                const ext = nameParts.length > 1 ? '.' + nameParts.pop() : '';
                                const base = nameParts.join('.');
                                
                                let copyCount = 1;
                                let newPath = `${fPath}${base} (Copy)${ext}`;
                                while (existingFiles.includes(newPath)) {
                                    copyCount++;
                                    newPath = `${fPath}${base} (Copy ${copyCount})${ext}`;
                                }
                                finalPath = newPath;
                            }
                        }
                    }
                    
                    const formData = new FormData();
                    formData.append("studentId", student.studentId);
                    formData.append("assignment", chapterStr);
                    formData.append("file", files[i]);
                    formData.append("path", finalPath);
                    
                    try {
                        const resp = await fetch(HOSTGATOR_UPLOAD_URL, { method: "POST", body: formData });
                        const res = await resp.json();
                        if (res.success) {
                            successCount++;
                            existingFiles.push(finalPath);
                        }
                    } catch(e) { console.error("Upload error", e); }
                }
                
                if(dropZone) {
                    if (successCount > 0) {
                        dropZone.innerHTML = `<h5 class="fw-bold text-success mb-2 mt-4">✅ Upload Complete!</h5>`;
                        await syncToGradebook('Artifact Upload', 25, 25);
                    } else {
                        dropZone.innerHTML = `<h5 class="fw-bold text-danger mb-2 mt-4">❌ Upload Failed / Skipped</h5>`;
                    }
                    setTimeout(() => { dropZone.innerHTML = originalHtml; }, 3000);
                }
            };
        }

        // Router Listener for Tab Clicks
        document.body.addEventListener('click', async (e) => {
            if (e.target.classList.contains('unit-tab-btn')) {
                const unitNum = parseInt(e.target.dataset.unit, 10);
                activeUnit = csCourseMap.find(u => u.unitNum === unitNum);
                await checkProgressAndGate(true);
                renderTabs();
            }
            
            if (e.target.classList.contains('chapter-tab-btn')) {
                const target = e.target.getAttribute('data-target');
                if (target === 'PRE_SCALE') activeTab = { type: 'PRE_SCALE' };
                else if (target === 'PRE_TEST') activeTab = { type: 'PRE_TEST' };
                else if (target === 'EXAM') activeTab = { type: 'EXAM' };
                else if (target === 'POST_SCALE') activeTab = { type: 'POST_SCALE' };
                else if (target.startsWith('CH_')) {
                    const chNum = parseInt(target.split('_')[1]);
                    activeTab = { type: 'CHAPTER', data: activeUnit.chapters.find(c => c.ch === chNum) };
                }
                renderTabs();
                await checkProgressAndGate(false);
            }
        });

        window.addEventListener('refreshUserProgress', async () => {
            await checkProgressAndGate(true);
            renderTabs();
        });

        window.addEventListener('message', (event) => {
            if (event.data.type === 'diagnostic_complete' || 
                event.data.type === 'scale_complete' || 
                (event.data && event.data.score !== undefined && !event.data.type)) {
                window.dispatchEvent(new CustomEvent('refreshUserProgress'));
            }
        });

        // Initial Load
        renderTabs();
        checkProgressAndGate(true);
    }
}