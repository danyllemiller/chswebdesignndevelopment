// File: /js/cs-interactive.js
/**
 * CHS Computer Science - Interactive Workspace Controller
 * ALL TABS VISIBLE VERSION.
 * Handles the nested 5-Unit/18-Chapter structure and granular progression gates.
 * Tabs are always visible. Left and right panes react dynamically to state.
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

// ==========================================
// LAST POSITION TRACKING (Unit/Chapter)
// ==========================================
const LAST_POSITION_KEY = 'csLastPosition';

/**
 * Save the user's current position (unit/chapter) to localStorage.
 * Called whenever the user changes units or chapters.
 */
function saveLastPosition(unitNum, chapterNum = null, tabType = 'PRE_SCALE') {
    if (!currentStudentData || !currentStudentData.student_id) return;
    
    const positionData = {
        unit: unitNum,
        chapter: chapterNum,
        tabType: tabType,
        timestamp: Date.now(),
        student_id: currentStudentData.student_id
    };
    localStorage.setItem(LAST_POSITION_KEY, JSON.stringify(positionData));
    console.log('[lastPosition] Saved:', positionData);
}

/**
 * Get the user's last saved position from localStorage.
 * Returns null if no valid position exists or if data is stale (> 24 hours).
 */
function getLastPosition() {
    try {
        const stored = localStorage.getItem(LAST_POSITION_KEY);
        if (!stored) return null;
        
        const positionData = JSON.parse(stored);
        const age = Date.now() - positionData.timestamp;
        const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age > MAX_AGE) {
            localStorage.removeItem(LAST_POSITION_KEY);
            console.log('[lastPosition] Expired, cleared');
            return null;
        }
        
        return positionData;
    } catch (e) {
        console.log('[lastPosition] Error:', e);
        return null;
    }
}

const HOSTGATOR_UPLOAD_URL = "https://digitalartsclasses.com/upload.php";
const HOSTGATOR_MANAGE_URL = "https://digitalartsclasses.com/manage_files.php";

// ========================================================
// GLOBAL CONFIGURATION - APPLIES TO ALL STUDENTS
// ========================================================
// Set these to true to REQUIRE completion, false to BYPASS (skip)
// Default: false = bypass/optional for all students
const GLOBAL_BYPASS_CONFIG = {
    requirePreScale: false,        // false = Pre-Scale NOT required for exam unlock
    requireDiagnostic: false,     // false = Diagnostic NOT required for exam unlock
    requireWorksheets: false,     // false = Worksheets NOT required (enable_worksheet=false)
    bypassAll: false              // If true, bypasses all gating requirements
};

function waitForAuth(timeout = 12000) {
    return new Promise((resolve) => {
        if (window.dacAuthData) { 
            resolve(window.dacAuthData); 
            return; 
        }
        const handler = () => { 
            resolve(window.dacAuthData); 
        };
        document.addEventListener('authComplete', handler, { once: true });
        setTimeout(() => {
            document.removeEventListener('authComplete', handler);
            resolve(window.dacAuthData || { isAuthenticated: false, isTeacher: false });
        }, timeout);
    });
}

// Default course map (fallback if JSON fails to load)
const DEFAULT_COURSE_MAP = [
    {
        unitNum: 0, name: "Unit 0: Office Productivity",
        chapters: [
            { ch: 0, title: "Ch 0: Intro to Office Software", file: "intro_to_office_software.html" }
        ]
    },
    {
        unitNum: 1, name: "Unit 1: Digital Skills & Safety",
        chapters: [
            { ch: 1, title: "Ch 1: Essential Computer Skills", file: "essential_computer_skills.html" },
            { ch: 2, title: "Ch 2: Ethics, Privacy & Law", file: "ethics_privacy_law.html" },
            { ch: 3, title: "Ch 3: Cybersecurity Threats", file: "cybersecurity_threats.html" }
        ]
    },
    {
        unitNum: 2, name: "Unit 2: Computing Fundamentals",
        chapters: [
            { ch: 4, title: "Ch 4: How Computers Work", file: "how_computers_work.html" },
            { ch: 5, title: "Ch 5: Language of Computers", file: "language_of_computers.html" }
        ]
    },
    {
        unitNum: 3, name: "Unit 3: Data & Visualization",
        chapters: [
            { ch: 6, title: "Ch 6: Storing Data", file: "storing_data.html" },
            { ch: 7, title: "Ch 7: Mastering Spreadsheets", file: "mastering_spreadsheets.html" },
            { ch: 8, title: "Ch 8: Computational Modeling", file: "computational_modeling.html" }
        ]
    },
    {
        unitNum: 4, name: "Unit 4: Logic & Algorithms",
        chapters: [
            { ch: 9, title: "Ch 9: Problem Solving & Algorithms", file: "problem_solving_algorithms.html" },
            { ch: 10, title: "Ch 10: Control Structures & Events", file: "control_structures_events.html" },
            { ch: 11, title: "Ch 11: Modularity & Procedures", file: "modularity_procedures.html" }
        ]
    },
    {
        unitNum: 5, name: "Unit 5: Society & Ethics",
        chapters: [
            { ch: 12, title: "Ch 12: Culture, Equity & Bias", file: "culture_equity_bias.html" },
            { ch: 13, title: "Ch 13: Ethics & Societal Impact", file: "ethics_societal_impact.html" }
        ]
    },
    {
        unitNum: 6, name: "Unit 6: Software Engineering",
        chapters: [
            { ch: 14, title: "Ch 14: Advanced Data Structures", file: "advanced_data_structures.html" },
            { ch: 15, title: "Ch 15: Software Development Lifecycle", file: "software_development_lifecycle.html" }
        ]
    },
    {
        unitNum: 7, name: "Unit 7: Networks & Security",
        chapters: [
            { ch: 16, title: "Ch 16: How the Internet Works", file: "how_the_internet_works.html" },
            { ch: 17, title: "Ch 17: Defending Systems", file: "defending_systems.html" }
        ]
    },
    {
        unitNum: 8, name: "Unit 8: AI & Innovation",
        chapters: [
            { ch: 18, title: "Ch 18: AI & Cross Disciplinary", file: "ai_cross_disciplinary.html" }
        ]
    }
];

// Dynamic course map loaded from JSON (stored globally)
let csCourseMap = DEFAULT_COURSE_MAP;

/**
 * Load course map from JSON config file
 * @returns {Promise<Array>} Course map array
 */
async function loadCourseMap() {
    try {
        const resp = await fetch('/data/cs-course-map.json?v=' + Date.now());
        if (resp.ok) {
            const data = await resp.json();
            if (data.courseMap && Array.isArray(data.courseMap) && data.courseMap.length > 0) {
                csCourseMap = data.courseMap;
                console.log('Course map loaded dynamically from JSON:', data.version || 'unknown version');
                console.log('Units loaded:', csCourseMap.length);
                return csCourseMap;
            }
        }
    } catch (e) {
        console.warn('Could not load course map from JSON, using default:', e.message);
    }
    csCourseMap = DEFAULT_COURSE_MAP;
    return csCourseMap;
}

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
    statusPill: document.getElementById('unit-status-pill'),
    paneTitle: document.getElementById('list-chapter-title'),
    viewJournal: document.getElementById('view-journal'),
    viewDropbox: document.getElementById('view-dropbox'),
    viewCode: document.getElementById('view-code')
};

// ============================================================================
// HELPER FUNCTIONS - Support both API-based and localStorage-based patterns
// ============================================================================

// Cache for progress data (populated from API calls)
let progressCache = {
    selfAssessments: {},
    grades: {},
    notes: {},
    loaded: false
};

/**
 * Get progress data - combines API data with localStorage fallback
 * @returns {Object} Progress object with keys like 'u1_prescale', 'u1_ch1_note', etc.
 */
function getProg() {
    // Return cached progress if loaded, otherwise return empty object
    // The actual loading happens via loadProgressData() called elsewhere
    const storageKey = `cs_progress_${currentStudentData?.student_id || 'temp'}`;
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored);
    } catch(e) { console.warn('getProg localStorage error:', e); }
    
    // Return converted cache data in the expected format for shorter code
    const prog = {};
    
    // Convert self-assessments to prescale format
    Object.keys(progressCache.selfAssessments).forEach(u => {
        if (progressCache.selfAssessments[u] > 0) {
            prog[`u${u}_prescale`] = progressCache.selfAssessments[u];
        }
    });
    
    // Convert grades to various formats
    Object.keys(progressCache.grades).forEach(k => {
        if (k.match(/(Diagnostic|Pre-Assessment|Pre)/i)) {
            const match = k.match(/Unit\s*-?\s*(\d+)/i);
            if (match) prog[`u${match[1]}_diagnostic`] = 1;
        }
        if (k.match(/(Ch|Chapter)/i)) {
            const match = k.match(/(Ch|Chapter)\s*0*(\d+)/i);
            if (match) prog[`u${activeUnit?.unitNum || 1}_ch${match[2]}_grade`] = 1;
        }
        if (k.match(/Summative/i)) {
            const match = k.match(/Unit\s*-?\s*(\d+)/i);
            if (match) prog[`u${match[1]}_exam`] = 1;
        }
    });
    
    // Convert notes to chapter note format
    Object.keys(progressCache.notes).forEach(key => {
        const match = key.match(/Ch\s*(\d+)/i);
        if (match) {
            prog[`u${activeUnit?.unitNum || 1}_ch${match[1]}_note`] = true;
        }
    });
    
    return prog;
}

/**
 * Check if a specific progress key is completed
 * @param {string} key - Key like 'u1_prescale', 'u1_ch1_note', 'u1_chapterDone', etc.
 * @returns {boolean} True if completed
 */
function hasCompleted(key) {
    const p = getProg();
    const val = p[key];
    return val !== undefined && val !== null && val !== 0;
}



/**
 * Save progress to localStorage (backup/cache)
 * @param {string} key - Progress key
 * @param {any} value - Progress value
 */
function saveProg(key, value) {
    if (!currentStudentData) return;
    const storageKey = `cs_progress_${currentStudentData.student_id}`;
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
        stored[key] = value;
        localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch(e) { console.warn('saveProg error:', e); }
}

/**
 * Load all progress data from server APIs
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Progress data
 */
async function loadProgressData(studentId) {
    if (!studentId) return {};
    
    const data = {
        selfAssessments: {},
        grades: {},
        notes: {},
        loaded: false
    };
    
    try {
        // Load self-assessments
        const saRes = await fetch(`/api/student/self-assessments?student_id=${encodeURIComponent(studentId)}`);
        if (saRes.ok) {
            const saData = await saRes.json();
            (saData.assessments || []).forEach(a => {
                const numMatch = String(a.chapter_id).match(/\d+/);
                if (numMatch) {
                    data.selfAssessments[numMatch[0]] = parseFloat(a.level);
                }
            });
        }
    } catch(e) { console.warn('Self-assessments API unavailable:', e); }
    
    try {
        // Load grades
        const gradesRes = await fetch(`/api/student/grades?student_id=${encodeURIComponent(studentId)}`);
        if (gradesRes.ok) {
            const gradesData = await gradesRes.json();
            (gradesData.responses || []).forEach(r => {
                data.grades[r.exam_id] = { score: r.score, max: r.total_points };
            });
        }
    } catch(e) { console.warn('Grades API unavailable:', e); }
    
    try {
        // Load notes
        const notesRes = await fetch(`/api/student/cs-notebook?student_id=${encodeURIComponent(studentId)}`);
        if (notesRes.ok) {
            const notesData = await notesRes.json();
            (notesData.notes || []).forEach(n => {
                data.notes[n.chapter] = true;
            });
        }
    } catch(e) { console.warn('Notes API unavailable:', e); }
    
    data.loaded = true;
    progressCache = data;
    
    return data;
}

// Expose helper functions globally for shorter code pattern compatibility
window.getProg = getProg;
window.hasCompleted = hasCompleted;

window.saveProg = saveProg;
window.loadProgressData = loadProgressData;

// Expose last position tracking functions globally
window.saveLastPosition = saveLastPosition;
window.getLastPosition = getLastPosition;

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

(async function init() {
    const authData = await waitForAuth();
    if (!authData.isAuthenticated) {
        window.location.replace("/login.html?redirect=" + encodeURIComponent(window.location.pathname));
        return;
    }

    // Load course map from JSON config (dynamic structure)
    await loadCourseMap();
    
    // Update activeUnit after loading course map
    activeUnit = csCourseMap[0];

    let storedUser = {};
    try { storedUser = JSON.parse(localStorage.getItem('user') || '{}'); } catch(e) {}
    const username = storedUser.username || authData.user?.username;
    const studentId = storedUser.student_id || authData.user?.student_id;

if (!username || !studentId) {
        window.location.replace("/login.html?redirect=" + encodeURIComponent(window.location.pathname));
        return;
    }

    try {
        const profileRes = await fetch(`/api/student/profile?username=${encodeURIComponent(username)}`);
        if (!profileRes.ok) throw new Error('Profile not found');
        currentStudentData = await profileRes.json();
        currentStudentData.student_id = currentStudentData.student_id || studentId;

        const subtitle = document.getElementById('userSubtitle');
        if (subtitle) subtitle.innerText = `${currentStudentData.first_name} ${currentStudentData.last_name} | ID: ${currentStudentData.student_id}`;

        setupOverwriteModal();
        initCSInteractive(currentStudentData);
    } catch(e) {
        document.getElementById('cs-interactive-pane').innerHTML = `<div class="container text-center p-5 mt-5 shadow border rounded bg-white">
            <h2 class="text-danger gochi">Profile Not Linked</h2>
            <p>Your account is not linked to the roster.</p>
            <a href="/logout.html" class="btn btn-outline-danger mt-3">Log Out</a></div>`;
    }
})();

function renderTabs() {
    if (dom.unitContainer) {
        let unitHtml = csCourseMap.map(u =>
            `<button class="unit-tab-btn ${u.unitNum === activeUnit.unitNum && activeTab.type !== 'FINAL_EXAM' ? 'active' : ''}" data-unit="${u.unitNum}">
                ${u.name}
            </button>`
        ).join('');
        unitHtml += `<button class="unit-tab-btn final-exam-unit-btn ${activeTab.type === 'FINAL_EXAM' ? 'active' : ''}" data-unit="FINAL_EXAM">
            <i class="fas fa-graduation-cap me-1"></i> CS Final Exam
        </button>`;
        dom.unitContainer.innerHTML = unitHtml;
    }

    if (dom.chapContainer) {
        let chapHtml = '';

        // TABS ARE PERMANENTLY VISIBLE. NO CONDITIONALS HERE.
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

function initCSInteractive(student) {
    const viewJournal = document.getElementById('view-journal');
    const viewDropbox = document.getElementById('view-dropbox');
    const viewCode = document.getElementById('view-code');
    const modeTitle = document.getElementById('workspace-mode-title');
    const modeBadge = document.getElementById('workspace-badge');

    // Track current workspace mode
    let currentWorkspaceMode = null;

// Function to switch workspace views - ONLY ONE shows at a time
    function switchWorkspaceView(mode) {
        console.log('switchWorkspaceView mode:', mode);
        
        // Hide ALL views first
        if (viewJournal) viewJournal.classList.add('d-none');
        if (viewDropbox) viewDropbox.classList.add('d-none');
        if (viewCode) viewCode.classList.add('d-none');

        // Update button states - keep the base colors but show active state
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.opacity = '0.7';
        });

// Show ONLY the selected view
        if ((mode === 'journal' || mode === 'worksheet') && viewJournal) {
            viewJournal.classList.remove('d-none');
            
            // Get current chapter number - prioritize activeTab data first
            let chapterNum = null;
            
            console.log('WORKSHEET DEBUG: activeTab.type=', activeTab.type, 'activeTab.data=', activeTab.data, 'activeUnit.unitNum=', activeUnit ? activeUnit.unitNum : 'none');
            
            // Priority 1: If we're on a CHAPTER tab, use that chapter number
            if (activeTab.type === 'CHAPTER' && activeTab.data && activeTab.data.ch !== undefined) {
                chapterNum = activeTab.data.ch;
                console.log('WORKSHEET DEBUG: Using chapter from activeTab:', chapterNum);
            }
            
            // Priority 2: For PRE_SCALE, PRE_TEST, EXAM, POST_SCALE - use unit's FIRST chapter
            if (chapterNum === null && (activeTab.type === 'PRE_SCALE' || activeTab.type === 'PRE_TEST' || activeTab.type === 'EXAM' || activeTab.type === 'POST_SCALE')) {
                // Use the first chapter of the current unit for general worksheets
                if (activeUnit && activeUnit.chapters && activeUnit.chapters.length > 0) {
                    chapterNum = activeUnit.chapters[0].ch;
                    console.log('WORKSHEET DEBUG: Using first chapter of unit:', chapterNum);
                }
            }
            
            // Priority 3: Try to parse from curriculum frame URL (handles URLs like /compsci/essential_computer_skills.html)
            if (chapterNum === null && dom.curriculumFrame && dom.curriculumFrame.src && dom.curriculumFrame.src !== 'about:blank') {
                const frameSrc = dom.curriculumFrame.src;
                // Match patterns like "ch1", "ch_1", "chapter_1" in the filename
                const chMatch = frameSrc.match(/(?:ch|chapter)[-_]?(\d+)/i);
                if (chMatch) {
                    chapterNum = parseInt(chMatch[1], 10);
                    console.log('WORKSHEET DEBUG: Parsed chapter from frame URL:', chapterNum);
                }
                // Also try matching the file name itself (e.g., "essential_computer_skills" -> look for chapter info)
                if (chapterNum === null) {
                    const fileNameMatch = frameSrc.match(/\/([^/]+)\.html/i);
                    if (fileNameMatch) {
                        const fileName = fileNameMatch[1];
                        for (const unit of csCourseMap) {
                            const found = unit.chapters.find(c => c.file === fileName);
                            if (found) {
                                chapterNum = found.ch;
                                console.log('WORKSHEET DEBUG: Found chapter from course map:', chapterNum, 'for file:', fileName);
                                break;
                            }
                        }
                    }
                }
            }
            
            // Fallback: Use first chapter of current unit or default to 1
            if (chapterNum === null || chapterNum === 0) {
                if (activeUnit && activeUnit.chapters && activeUnit.chapters.length > 0) {
                    chapterNum = activeUnit.chapters[0].ch;
                } else {
                    chapterNum = 1;
                }
                console.log('WORKSHEET DEBUG: Using fallback chapter:', chapterNum);
            }
            
            // Load the notebook iframe with the appropriate mode and chapter
            const notebookFrame = document.getElementById('notebook-frame');
            if (notebookFrame) {
                let notebookUrl = '/cs-notebook.html?mode=' + (mode === 'worksheet' ? 'worksheet' : 'notes');
                notebookUrl += '&chapter=' + chapterNum;
                notebookUrl += '&t=' + Date.now(); // Cache buster
                notebookFrame.src = notebookUrl;
                console.log('Loading notebook with:', notebookUrl, 'for chapter:', chapterNum, 'activeTab:', activeTab.type);
            }
            
            // Highlight the clicked button
            const activeBtn = document.querySelector('.mode-btn[data-mode="' + mode + '"]');
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.style.opacity = '1';
            }
            
            if (modeTitle) {
                if (mode === 'worksheet') {
                    modeTitle.innerHTML = '<i class="fas fa-file-invoice me-2"></i> Worksheet';
                } else {
                    modeTitle.innerHTML = '<i class="fas fa-pencil-alt me-2"></i> Notes';
                }
            }
            if (modeBadge) { 
                if (mode === 'worksheet') {
                    modeBadge.className = "badge bg-success text-white font-monospace shadow-sm";
                    modeBadge.innerText = "Worksheet Mode";
                } else {
                    modeBadge.className = "badge bg-primary text-white font-monospace shadow-sm";
                    modeBadge.innerText = "Notes Mode";
                }
}
        } else if (mode === 'dropbox' && viewDropbox) {
            viewDropbox.classList.remove('d-none');
            const activeBtn = document.querySelector('.mode-btn[data-mode="dropbox"]');
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.style.opacity = '1';
            }
            if (modeTitle) modeTitle.innerHTML = '<i class="fas fa-cloud-upload-alt me-2"></i> File Upload';
            if (modeBadge) { modeBadge.className = "badge bg-info text-white font-monospace shadow-sm"; modeBadge.innerText = "Upload Mode"; }
        } else if (mode === 'code' && viewCode) {
            viewCode.classList.remove('d-none');
            const activeBtn = document.querySelector('.mode-btn[data-mode="code"]');
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.style.opacity = '1';
            }
            if (modeTitle) modeTitle.innerHTML = '<i class="fas fa-code me-2"></i> Code Editor';
            if (modeBadge) { modeBadge.className = "badge bg-dark text-white font-monospace shadow-sm"; modeBadge.innerText = "Code Mode"; }
        }

        currentWorkspaceMode = mode;
    }

    // Setup mode toggle button click handlers - called to enable manual mode switching
    function setupModeToggleHandlers() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const mode = btn.dataset.mode;
                switchWorkspaceView(mode);
            });
        });
    }

// Initialize mode toggle - set up click handlers and show initial view
    setupModeToggleHandlers();
    
    // Hide ALL workspace views by default - user must select a mode
    if (viewJournal) viewJournal.classList.add('d-none');
    if (viewDropbox) viewDropbox.classList.add('d-none');
    if (viewCode) viewCode.classList.add('d-none');
    
    // Show prompt message
    if (modeTitle) {
        modeTitle.innerHTML = '<i class="fas fa-hand-pointer me-2"></i> Select a Mode';
    }
    if (modeBadge) {
        modeBadge.className = "badge bg-secondary text-white font-monospace shadow-sm";
        modeBadge.innerText = "Choose Above";
    }

    // Load worksheet template helper
    function loadWorksheetTemplate() {
        const btnWorksheetCS = document.getElementById('tpl-worksheet');
        if (btnWorksheetCS && typeof btnWorksheetCS.onclick === 'function') {
            btnWorksheetCS.onclick();
        }
    }

let activeNoteId = null;
    let autoSaveTimer = null;
    
    // Progress tracking variables accessible from event handlers
    let selfAssessments = {};
    let selfAssessmentsLoaded = false;
    let grades = {};
    let gradesLoaded = false;
    let notes = {};
    let notesLoaded = false;

const syncToGradebook = async (baseName, score, maxPoints) => {
        const finalAssignmentKey = `Ch${activeTab.data?.ch || '0'}-${baseName} [${maxPoints} pts]`;
        try {
            await fetch('/api/submit-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: student.student_id,
                    exam_id: finalAssignmentKey.substring(0, 95),
                    score,
                    total_points: maxPoints
                })
            });
        } catch (e) { console.error("Gradebook sync failed:", e); }
    };

// Sync Pre-Scale to gradebook - 10 POINTS FIXED with keep-highest logic
    const syncPreScale = async (level) => {
        // Pre-scale ALWAYS gives 10 points when completed (level >= 1)
        // FIXED: Assignment name format to "Unit1 Pre-Scale" (no space between Unit and number)
        const key = `Unit${activeUnit.unitNum} Pre-Scale`;
        const newScore = level > 0 ? 10 : 0;
        try {
            // Check existing grade first and keep highest
            let shouldSave = true;
            const gradesRes = await fetch(`/api/student/grades?student_id=${encodeURIComponent(student.student_id)}`);
            if (gradesRes.ok) {
                const gradesData = await gradesRes.json();
                const existing = (gradesData.responses || []).find(r => r.exam_id === key);
                if (existing && Number(existing.score) > newScore) {
                    shouldSave = false;
                    console.log(`Unit${activeUnit.unitNum} Pre-Scale: Keeping higher existing score:`, existing.score);
                }
            }
            if (shouldSave) {
                await fetch('/api/submit-exam', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_id: student.student_id,
                        exam_id: key,
                        score: newScore,
                        total_points: 10
                    })
                });
            }
            console.log(`Unit${activeUnit.unitNum} Pre-Scale synced: ${newScore} points`);
        } catch (e) { console.error("Pre-Scale sync failed:", e); }
    };

// Sync Pre-Assessment (Diagnostic) to gradebook - 15 POINTS FIXED (full credit for completion)
    const syncPreAssessment = async (score, maxPoints) => {
        // Pre-assessment ALWAYS gives 15 points full credit for COMPLETING the test
        // FIXED: Assignment name format to "Unit1-Pre" (no space between Unit and number)
        const key = `Unit${activeUnit.unitNum}-Pre`;
        const newScore = 15; // Full credit just for completing
        try {
            // Check existing grade first and keep highest
            let shouldSave = true;
            const gradesRes = await fetch(`/api/student/grades?student_id=${encodeURIComponent(student.student_id)}`);
            if (gradesRes.ok) {
                const gradesData = await gradesRes.json();
                const existing = (gradesData.responses || []).find(r => r.exam_id === key);
                if (existing && Number(existing.score) >= newScore) {
                    shouldSave = false;
                    console.log(`Unit${activeUnit.unitNum}-Pre: Keeping existing score:`, existing.score, "(already completed)");
                }
            }
            if (shouldSave) {
                await fetch('/api/submit-exam', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_id: student.student_id,
                        exam_id: key,
                        score: newScore,
                        total_points: 15
                    })
                });
                console.log(`Unit${activeUnit.unitNum}-Pre synced: ${newScore} points (FULL CREDIT for completion)`);
            }
        } catch (e) { console.error("Pre-Assessment sync failed:", e); }
    };

const checkProgressAndGate = async (isAutoAdvance = false) => {
        if (!currentStudentData) return;

        try {
            // Re-use outer variables instead of creating new local ones
            grades = {};
            gradesLoaded = false;
            try {
                const gradesRes = await fetch(`/api/student/grades?student_id=${encodeURIComponent(student.student_id)}`);
                if (gradesRes.ok) {
                    const gradesData = await gradesRes.json();
                    (gradesData.responses || []).forEach(r => {
                        grades[r.exam_id] = { score: r.score, max: r.total_points };
                    });
                    gradesLoaded = true;
                }
            } catch(e) { console.warn("Grades API unavailable:", e); }

            selfAssessments = {};
            selfAssessmentsLoaded = false;
            try {
                const saRes = await fetch(`/api/student/self-assessments?student_id=${encodeURIComponent(student.student_id)}`);
                if (saRes.ok) {
                    const saData = await saRes.json();
                    (saData.assessments || []).forEach(a => {
                        const numMatch = String(a.chapter_id).match(/\d+/);
                        if (numMatch) {
                            selfAssessments[`unit${numMatch[0]}`] = parseFloat(a.level);
                        }
                    });
                    selfAssessmentsLoaded = true;
                }
} catch(e) { console.warn("Self-assessments API unavailable:", e); }

            notes = {};
            notesLoaded = false;
            try {
                const notesRes = await fetch(`/api/student/cs-notebook?student_id=${encodeURIComponent(student.student_id)}`);
                if (notesRes.ok) {
                    const notesData = await notesRes.json();
                    // Only mark as loaded if we actually got notes AND no error
                    if (notesData.notes && notesData.notes.length > 0 && !notesData.error) {
                        (notesData.notes || []).forEach(n => {
                            notes[n.chapter] = true;
                        });
                        notesLoaded = true;
                    }
                }
            } catch(e) { console.warn("Notes API unavailable:", e); }

            // FIX: Default to NOT completed - be conservative
            // Only consider completed if ALL conditions are met:
            // 1. API actually loaded data (gradesLoaded === true)
            // 2. We found matching data for this specific unit
            // 3. NOT empty data
            const hasPreScale = selfAssessmentsLoaded && 
                              selfAssessments[`unit${activeUnit.unitNum}`] !== undefined && 
                              selfAssessments[`unit${activeUnit.unitNum}`] > 0;
                              
            const hasPreTest = gradesLoaded && 
                              Object.keys(grades).length > 0 &&
                              Object.keys(grades).some(k => k.match(new RegExp(`Unit\\s*-?\\s*${activeUnit.unitNum}`, 'i')) && k.match(/(Diagnostic|Pre-Assessment|Pre)/i));
                              
            const hasExam = gradesLoaded && 
                           Object.keys(grades).length > 0 &&
                           Object.keys(grades).some(k => k.match(new RegExp(`Unit\\s*-?\\s*${activeUnit.unitNum}`, 'i')) && k.match(/Summative/i));
            
            // FIX: hasAllChapWork - require BOTH notesLoaded AND actual notes exist
            // If API failed or returned empty, default to false
            const hasAllChapWork = notesLoaded && 
                                  Object.keys(notes).length > 0 &&
                                  activeUnit.chapters.every(c => {
                const hasNote = Object.keys(notes).some(key => key.includes(`Ch ${c.ch}`) || key.includes(`Ch${c.ch}`));
                const hasGrade = Object.keys(grades).some(k => k.match(new RegExp(`(Ch|Chapter)\\s*0*${c.ch}[-\s:]`, 'i')));
                return hasNote || hasGrade;
            });

// FIX: Better auto-advance logic with explicit defaults
            // ALWAYS start at PRE_SCALE for first-time users or if no progress
            if (isAutoAdvance) {
                // Default to PRE_SCALE if no completed items
                if (!hasPreScale && !hasPreTest) {
                    activeTab = { type: 'PRE_SCALE' };
                }
                else if (hasPreScale && !hasPreTest) {
                    activeTab = { type: 'PRE_TEST' };
                }
                else if (hasPreTest && !hasAllChapWork) {
                    // Find first incomplete chapter
                    let incompleteCh = activeUnit.chapters.find(c => {
                        const hasN = Object.keys(notes).some(key => key.includes(`Ch ${c.ch}`) || key.includes(`Ch${c.ch}`));
                        const hasG = Object.keys(grades).some(k => k.match(new RegExp(`(Ch|Chapter)\\s*0*${c.ch}[-\\s:]`, 'i')));
                        return !(hasN || hasG);
                    });
                    activeTab = { type: 'CHAPTER', data: incompleteCh || activeUnit.chapters[0] };
                }
                else if (hasAllChapWork && !hasExam) {
                    activeTab = { type: 'EXAM' };
                }
                else if (hasExam) {
                    activeTab = { type: 'POST_SCALE' };
                }
                else {
                    // Fallback - should not happen but default to PRE_SCALE
                    activeTab = { type: 'PRE_SCALE' };
                }
            }

            renderTabs();

// ==========================================
            // HIDE EVERYTHING TO RESET THE UI STATE
            // ==========================================
            // FIX: Add null checks to prevent TypeError
            if (dom.curriculumFrame && dom.curriculumFrame.classList) dom.curriculumFrame.classList.add('d-none');
            if (dom.assessmentFrame && dom.assessmentFrame.classList) dom.assessmentFrame.classList.add('d-none');
            if (dom.examOverlay && dom.examOverlay.classList) dom.examOverlay.classList.add('d-none');
            if (dom.statusPill && dom.statusPill.classList) dom.statusPill.classList.add('d-none');
// Workspace is ALWAYS accessible - don't hide it
            // NOTE: Workspace view is now controlled by the mode toggle buttons - user chooses which view to show

            // ==========================================
            // RENDER ACTIVE STATE & ENFORCE LOCKS
            // ==========================================
            if (activeTab.type === 'PRE_SCALE') {
                const url = `/proficiencyScales/cs-unit-${activeUnit.unitNum}.html?type=pre`;
                if(dom.assessmentFrame && !dom.assessmentFrame.src.includes(url)) dom.assessmentFrame.src = url;
                if(dom.assessmentFrame) dom.assessmentFrame.classList.remove('d-none');
                if(dom.paneTitle) dom.paneTitle.innerText = `Unit ${activeUnit.unitNum}: Pre-Evaluation Scale`;

                // Workspace is accessible - user manually selects mode via toggle buttons
                // Don't auto-show any view - let user choose
            }
else if (activeTab.type === 'PRE_TEST') {
                if (dom.paneTitle) dom.paneTitle.innerText = `Unit ${activeUnit.unitNum}: Diagnostic Pre-Assessment`;

                const bypassPreScale = !GLOBAL_BYPASS_CONFIG.requirePreScale || GLOBAL_BYPASS_CONFIG.bypassAll;
                const diagnosticUrl = `/pre-assessments/cs-unit-${activeUnit.unitNum}.html`;

                if (!hasPreScale && !bypassPreScale) {
                    // Pre-scale not done — locked
                    if (dom.examOverlay) {
                        dom.examOverlay.innerHTML = `<i class="fas fa-lock text-danger fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i><h3 class="fw-bold">Diagnostic Locked</h3><p class="text-muted px-4 mb-4">You must complete the <strong>Pre-Scale</strong> (the first tab) before you can take the diagnostic.</p>`;
                        dom.examOverlay.classList.remove('d-none');
                    }
                } else if (hasPreTest) {
                    // Already completed — show completion notice instead of reopening the window.
                    // Student can still retake by clicking the button (explicit action).
                    if (dom.examOverlay) {
                        dom.examOverlay.innerHTML = `<i class="fas fa-check-circle text-success fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i><h3 class="fw-bold text-success">Pre-Assessment Complete</h3><p class="text-muted px-4 mb-4">You've already completed this pre-assessment and your score is saved in the gradebook.</p><button class="btn btn-outline-secondary btn-sm" onclick="window.open('${diagnosticUrl}', '_blank')">Retake Pre-Assessment</button>`;
                        dom.examOverlay.classList.remove('d-none');
                    }
                } else {
                    // Not completed yet, unlocked → open pre-assessment window.
                    // On auto-advance: only open once per browser session per unit so the tab doesn't
                    // pop up again on every page reload before the student finishes.
                    // On manual tab click (!isAutoAdvance): always open (student explicitly requested it).
                    const sessionKey = `pretest_opened_u${activeUnit.unitNum}`;
                    if (!isAutoAdvance || !sessionStorage.getItem(sessionKey)) {
                        if (isAutoAdvance) sessionStorage.setItem(sessionKey, '1');
                        window.open(diagnosticUrl, '_blank');
                    }
                    if (dom.examOverlay) {
                        dom.examOverlay.innerHTML = `<i class="fas fa-external-link-alt text-primary fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i><h3 class="fw-bold">Diagnostic Pre-Assessment</h3><p class="text-muted px-4 mb-4">Complete the pre-assessment in the new tab, then return here to continue.</p><button class="btn btn-outline-primary btn-sm" onclick="sessionStorage.removeItem('${sessionKey}'); window.open('${diagnosticUrl}', '_blank')">Open Again</button>`;
                        dom.examOverlay.classList.remove('d-none');
                    }
                }
            }
            else if (activeTab.type === 'CHAPTER') {
                if (dom.paneTitle) dom.paneTitle.innerText = `${activeUnit.name} - ${activeTab.data.title}`;

                // Allow them to READ the chapter content
                const url = `/compsci/${activeTab.data.file}`;
                if (dom.curriculumFrame && !dom.curriculumFrame.src.includes(url)) dom.curriculumFrame.src = url;
                if (dom.curriculumFrame) dom.curriculumFrame.classList.remove('d-none');

                // Workspace is accessible - user manually selects mode via toggle buttons
                // Don't auto-show any view based on chapter - let user choose
            }
else if (activeTab.type === 'EXAM') {
                if (dom.paneTitle) dom.paneTitle.innerText = `Unit ${activeUnit.unitNum}: Final Assessment`;

                if (dom.examOverlay) dom.examOverlay.classList.remove('d-none');

                const bypassWorksheets = !GLOBAL_BYPASS_CONFIG.requireWorksheets || GLOBAL_BYPASS_CONFIG.bypassAll;
                const examUnlocked = bypassWorksheets || hasAllChapWork;

                if (!examUnlocked && dom.examOverlay) {
                    dom.examOverlay.innerHTML = `<i class="fas fa-ban text-danger fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i><h3 class="fw-bold">Exam Locked</h3><p class="text-muted px-4 mb-4">You must submit work (Journal, Code, or File Upload) for <strong>every chapter</strong> in this unit before the exam unlocks.</p>`;
                } else if (dom.examOverlay) {
                    dom.examOverlay.innerHTML = `
                        <i class="fas fa-file-signature text-primary fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i>
                        <h3 class="fw-bold">Summative Assessment Ready</h3>
                        <p class="text-muted px-4 mb-4">You have reached the end of this unit! The final exam will open in a <strong>secure new tab</strong>. Use the Journal scratchpad to help you.</p>
                        <button id="btn-launch-exam" class="btn btn-primary btn-lg fw-bold px-5 shadow-sm mt-2">
                            <i class="fas fa-external-link-alt me-2"></i> Launch Secure Exam
                        </button>
                    `;
                    setTimeout(() => {
                        const btn = document.getElementById('btn-launch-exam');
                        if (btn) btn.onclick = () => window.open(`/exams/cs-unit-${activeUnit.unitNum}-exam.html`, '_blank');
                    }, 50);
                }
            }
            else if (activeTab.type === 'POST_SCALE') {
                if (dom.paneTitle) dom.paneTitle.innerText = `Unit ${activeUnit.unitNum}: Post-Evaluation`;

if (!hasExam) {
                    dom.examOverlay.classList.remove('d-none');
                    dom.examOverlay.innerHTML = `<i class="fas fa-lock text-warning fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i><h3 class="fw-bold">Evaluation Locked</h3><p class="text-muted px-4 mb-4">You must complete the <strong>Unit ${activeUnit.unitNum} Summative Exam</strong> before filling out the final self-evaluation.</p>`;
                } else {
                    const url = `/proficiencyScales/cs-unit-${activeUnit.unitNum}.html?type=post`;
                    if(dom.assessmentFrame && !dom.assessmentFrame.src.includes(url)) dom.assessmentFrame.src = url;
                    if(dom.assessmentFrame) dom.assessmentFrame.classList.remove('d-none');
                }
            }
            else if (activeTab.type === 'FINAL_EXAM') {
                if (dom.paneTitle) dom.paneTitle.innerText = 'CS Course Final Exam';
                if (dom.examOverlay) dom.examOverlay.classList.remove('d-none');

                // Units 1–7 are required; Units 0 and 8 are extra credit
                const requiredUnits = [1, 2, 3, 4, 5, 6, 7];
                const unitStatus = requiredUnits.map(n => ({
                    n,
                    done: gradesLoaded && Object.keys(grades).some(k =>
                        k.match(new RegExp(`Unit\\s*-?\\s*${n}\\b`, 'i')) &&
                        k.match(/Summative|Exam|Final/i) &&
                        !k.match(/Pre/i)
                    )
                }));
                const allUnitsDone = unitStatus.every(s => s.done);

                if (!allUnitsDone && dom.examOverlay) {
                    const missing = unitStatus.filter(s => !s.done)
                        .map(s => `<li>Unit ${s.n} Exam</li>`).join('');
                    dom.examOverlay.innerHTML = `<i class="fas fa-lock text-danger fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i>
                        <h3 class="fw-bold">Final Exam Locked</h3>
                        <p class="text-muted px-4 mb-2">Complete the following unit exams to unlock the CS Final Exam:</p>
                        <ul class="text-start text-danger fw-bold d-inline-block mb-0">${missing}</ul>
                        <p class="text-muted small mt-3">Units 0 and 8 are extra credit and not required.</p>`;
                } else if (dom.examOverlay) {
                    dom.examOverlay.innerHTML = `
                        <i class="fas fa-graduation-cap text-warning fa-4x mb-3 border p-3 rounded-circle bg-white shadow-sm"></i>
                        <h3 class="fw-bold">CS Course Final Exam</h3>
                        <p class="text-muted px-4 mb-4">You've completed all required unit exams. The final exam will open in a new tab.</p>
                        <button id="btn-launch-final" class="btn btn-success btn-lg fw-bold px-5 shadow-sm mt-2">
                            <i class="fas fa-graduation-cap me-2"></i> Launch CS Final Exam
                        </button>`;
                    setTimeout(() => {
                        const btn = document.getElementById('btn-launch-final');
                        if (btn) btn.onclick = () => window.open('/exams/cs-final-exam.html', '_blank');
                    }, 50);
                }
            }

            await fetchNotes();

        } catch (e) { console.error("Gating Check Failed:", e); }
    };

    if (typeof require !== 'undefined' && document.getElementById('monaco-container')) {
        if (!window.monacoEditorInstance && !window.monacoIsLoading) {
            window.monacoIsLoading = true;
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});
            require(['vs/editor/editor.main'], function() {
                window.monacoEditorInstance = monaco.editor.create(document.getElementById('monaco-container'), {
                    value: '\n<div style="text-align: center; margin-top: 20px;">\n  <h1 style="color: #000099; font-family: sans-serif;">Code Runner Ready</h1>\n</div>',
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
                            formData.append("studentId", student.student_id);
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
    
    // ======================= FILE UPLOAD IN WORKSPACE =======================
    const fileDropZone = document.getElementById('file-drop-zone');
    const workspaceFileInput = document.getElementById('workspace-file-input');
    const gdocLinkInput = document.getElementById('gdoc-link-input');
    const btnEmbedGdoc = document.getElementById('btn-embed-gdoc');
    const uploadedFilesList = document.getElementById('uploaded-files-list');
    const filesDisplayArea = document.getElementById('files-display-area');
    const btnTurnIn = document.getElementById('btn-turn-in');
    
    let uploadedFiles = [];  // Track uploaded files
    
    // Handle click to browse files
    if (fileDropZone && workspaceFileInput) {
        fileDropZone.addEventListener('click', () => workspaceFileInput.click());
        
        workspaceFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        });
    }
    
    // Handle drag and drop
    if (fileDropZone) {
        fileDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDropZone.classList.add('border-primary', 'bg-light');
        });
        
        fileDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileDropZone.classList.remove('border-primary', 'bg-light');
        });
        
        fileDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDropZone.classList.remove('border-primary', 'bg-light');
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });
    }
    
    // Handle Google Doc embed button
    if (btnEmbedGdoc && gdocLinkInput) {
        btnEmbedGdoc.addEventListener('click', async () => {
            const url = gdocLinkInput.value.trim();
            if (url && url.includes('docs.google.com')) {
                // Extract document ID
                let docId = '';
                const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                    docId = match[1];
                }
                
                // Create embed iframe or link
                const embedHtml = `<div class="gdoc-embed">
                    <iframe src="https://docs.google.com/document/d/${docId}/preview" class="w-100 border rounded" style="min-height: 400px;"></iframe>
                    <a href="${url}" target="_blank" class="btn btn-sm btn-outline-primary mt-1"><i class="fas fa-external-link-alt"></i> Open in New Tab</a>
                </div>`;
                
                // Add to content
                if (contentIn) {
                    contentIn.value += embedHtml;
                }
                updatePreview();
                triggerAutoSave();
                
                alert('Google Doc linked! You can now save or turn in your work.');
            } else {
                alert('Please enter a valid Google Doc URL (e.g., https://docs.google.com/document/d/...)');
            }
        });
    }
    
    // Process uploaded files
    async function handleFiles(files) {
        if (!files || files.length === 0) return;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name === '.DS_Store' || file.name.startsWith('._')) continue;
            
            // Show uploading status
            const fileCard = document.createElement('div');
            fileCard.className = 'card shadow-sm';
            fileCard.innerHTML = `
                <div class="card-body py-2 px-3 d-flex align-items-center justify-content-between">
                    <div>
                        <i class="fas fa-file-${getFileIcon(file.name)} text-primary me-2"></i>
                        <span class="small fw-bold">${file.name}</span>
                    </div>
                    <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>`;
            
            if (filesDisplayArea) {
                uploadedFilesList.classList.remove('d-none');
                filesDisplayArea.appendChild(fileCard);
            }
            
            try {
                // Upload to server
                const formData = new FormData();
                formData.append("studentId", student.student_id);
                formData.append("assignment", activeTab.type === 'CHAPTER' ? `Ch${activeTab.data.ch}` : 'Workspace');
                formData.append("file", file);
                formData.append("path", `submissions/Ch${activeTab.data?.ch || 'Misc'}_${file.name}`);
                
                const resp = await fetch(HOSTGATOR_UPLOAD_URL, { method: "POST", body: formData });
                const res = await resp.json();
                
                if (res.success) {
                    uploadedFiles.push({ name: file.name, path: res.path });
                    fileCard.innerHTML = `
                        <div class="card-body py-2 px-3 d-flex align-items-center justify-content-between bg-success bg-opacity-10">
                            <div>
                                <i class="fas fa-check-circle text-success me-2"></i>
                                <span class="small fw-bold">${file.name}</span>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.card').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`;
                    
                    // Add file reference to notes content
                    if (contentIn) {
                        const ext = file.name.split('.').pop().toLowerCase();
                        if (['doc', 'docx', 'pdf'].includes(ext)) {
                            contentIn.value += `<p><i class="fas fa-paperclip"></i> Attached: <a href="${res.path}" target="_blank">${file.name}</a></p>`;
                        }
                    }
                    updatePreview();
                } else {
                    fileCard.innerHTML = `
                        <div class="card-body py-2 px-3 d-flex align-items-center bg-danger bg-opacity-10">
                            <i class="fas fa-exclamation-triangle text-danger me-2"></i>
                            <span class="small fw-bold text-danger">Upload failed: ${file.name}</span>
                        </div>`;
                }
            } catch (e) {
                fileCard.innerHTML = `
                    <div class="card-body py-2 px-3 d-flex align-items-center bg-danger bg-opacity-10">
                        <i class="fas fa-exclamation-triangle text-danger me-2"></i>
                        <span class="small fw-bold text-danger">Error: ${file.name}</span>
                    </div>`;
            }
        }
    }
    
    // Get file icon based on extension
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': 'pdf text-danger',
            'doc': 'file-word text-primary',
            'docx': 'file-word text-primary',
            'html': 'code text-dark',
            'txt': 'file-alt text-muted',
            'png': 'image text-info',
            'jpg': 'image text-info',
            'jpeg': 'image text-info',
            'gif': 'image text-info'
        };
        return icons[ext] || 'file';
    }
    
    // Turn In button handler
    if (btnTurnIn) {
        btnTurnIn.addEventListener('click', async () => {
            if (uploadedFiles.length === 0 && (!contentIn || !contentIn.value.trim())) {
                alert('Please add some content or upload a file before turning in.');
                return;
            }
            
            btnTurnIn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Turning In...';
            
            // Save the note first
            await saveJournalData(true);
            
            // If there are uploaded files, mark them as turned in
            if (uploadedFiles.length > 0) {
                await syncToGradebook('Artifact Upload', 25, 25);
            }
            
            btnTurnIn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Turned In!';
            setTimeout(() => {
                btnTurnIn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Turn In Work';
            }, 3000);
        });
    }

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
                <\/script>
            </head>
            <body contenteditable="true" oninput="sync()">${htmlContent || '<h2>Reflection</h2><p>Begin typing here...</p>'}</body>
            </html>
        `;
        previewFrame.srcdoc = srcDoc;
    }

    async function fetchNotes() {
        let chapterString = `Unit ${activeUnit.unitNum} General`;
        if (activeTab.type === 'CHAPTER') chapterString = `Unit ${activeUnit.unitNum} - ${activeTab.data.title}`;
        else if (activeTab.type === 'EXAM') chapterString = `Unit ${activeUnit.unitNum} Exam Scratchpad`;

        try {
            const res = await fetch(`/api/student/cs-notebook?student_id=${encodeURIComponent(student.student_id)}`);
            if (!res.ok) throw new Error('Failed to fetch notes');
            const data = await res.json();
            const allNotes = data.notes || [];
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
        } catch(e) {
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

        const payload = {
            student_id: student.student_id,
            chapter: chapterString,
            title: titleInput.value.trim(),
            category: categoryVal,
            content: contentIn ? contentIn.value : "",
            is_submitted: isFinalSubmit,
            timestamp: Date.now()
        };

        try {
            const res = await fetch('/api/student/cs-notebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Save failed');

            if (btn) {
                btn.innerHTML = '✅ Saved!';
if (isFinalSubmit && categoryVal === 'Worksheet') {
                    await syncToGradebook('Worksheet', 20, 20);  // FIXED: 20 points for worksheet
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

// ========================================================
    // LOAD SAVED NOTES FUNCTIONALITY
    // ========================================================
const escapeHtmlSimple = function(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/&/g, "&amp;").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "\\x22").replace(/'/g, "&#039;");
    };

    const btnLoadNotes = document.getElementById('btn-load-notes');
    if (btnLoadNotes && !document.getElementById('loadNotesModal')) {
        btnLoadNotes.onclick = async () => {
            // Create modal if it doesn't exist
            if (!document.getElementById('loadNotesModal')) {
                const modalHtml = `
                    <div class="modal fade" id="loadNotesModal" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered modal-lg">
                            <div class="modal-content">
                                <div class="modal-header bg-primary text-white">
                                    <h5 class="modal-title fw-bold"><i class="fas fa-folder-open me-2"></i> Load Saved Notes</h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                                    <div id="notes-list-container" class="text-center p-4">
                                        <div class="spinner-border text-primary"></div>
                                        <p class="mt-2 text-muted">Loading your saved notes...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
            }

            // Show modal
            const modalEl = document.getElementById('loadNotesModal');
            let modal = null;
            if (typeof bootstrap !== 'undefined') {
                modal = new bootstrap.Modal(modalEl);
                modal.show();
            }

// Fetch all notes for this student
                const listContainer = document.getElementById('notes-list-container');
                try {
                    const res = await fetch(`/api/student/cs-notebook?student_id=${encodeURIComponent(student.student_id)}`);
                    if (!res.ok) throw new Error('Failed to fetch');
                    const data = await res.json();
                    const allNotes = data.notes || [];

                    if (allNotes.length === 0) {
                        listContainer.innerHTML = `
                            <div class="text-center p-4">
                                <i class="fas fa-clipboard text-muted fs-1 mb-3"></i>
                                <p class="text-muted">No saved notes found. Start a new entry!</p>
                            </div>`;
                        return;
                    }

                    // Sort by timestamp descending (newest first)
                    allNotes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    
                    // Filter to only keep ONE note per unique title (the most recent one)
                    const uniqueNotesMap = new Map();
                    allNotes.forEach(n => {
                        const titleKey = (n.title || '').trim().toLowerCase();
                        // Only add if we haven't seen this title yet (first one is most recent due to sort)
                        if (titleKey && !uniqueNotesMap.has(titleKey)) {
                            uniqueNotesMap.set(titleKey, n);
                        }
                    });
                    const uniqueNotes = Array.from(uniqueNotesMap.values());
                    
                    if (uniqueNotes.length === 0) {
                        listContainer.innerHTML = `
                            <div class="text-center p-4">
                                <i class="fas fa-clipboard text-muted fs-1 mb-3"></i>
                                <p class="text-muted">No saved notes found. Start a new entry!</p>
                            </div>`;
                        return;
                    }

                    const notesHtml = uniqueNotes.map(n => {
                    const date = n.timestamp ? new Date(n.timestamp).toLocaleDateString() : 'Unknown date';
                    const preview = n.content ? n.content.substring(0, 80).replace(/<[^>]*>/g, '') + '...' : 'No content';
                    return `
                        <div class="card mb-2 shadow-sm note-card" style="cursor: pointer; border-left: 4px solid var(--primary-color);" data-id="${n.id}" data-title="${escapeHtmlSimple(n.title || '')}" data-content="${escapeHtmlSimple(n.content || '')}">
                            <div class="card-body py-2">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="mb-1 fw-bold text-primary">${escapeHtmlSimple(n.title || 'Untitled')}</h6>
                                        <p class="mb-0 small text-muted">${escapeHtmlSimple(n.chapter || 'General')} | ${date}</p>
                                        <p class="mb-0 small text-muted mt-1" style="font-style: italic;">${escapeHtmlSimple(preview)}</p>
                                    </div>
                                    <span class="badge bg-light text-dark border">${escapeHtmlSimple(n.category || 'Note')}</span>
                                </div>
                            </div>
                        </div>`;
                }).join('');

                listContainer.innerHTML = `<div class="text-start">${notesHtml}</div>`;

                // Add click handlers to load notes
                listContainer.querySelectorAll('.note-card').forEach(card => {
                    card.onclick = () => {
                        const noteId = card.dataset.id;
                        const noteTitle = card.dataset.title;
                        const noteContent = card.dataset.content;
                        
                        // Load into the current note form
                        if (titleInput) titleInput.value = noteTitle;
                        if (contentIn) contentIn.value = noteContent;
                        if (catInput) catInput.value = card.querySelector('.badge')?.innerText || 'Notes';
                        
                        // Update the preview
                        updatePreview();
                        triggerAutoSave();
                        
                        // Close modal
                        if (modal) modal.hide();
                    };
                });
            } catch (e) {
                listContainer.innerHTML = `<div class="text-center p-4 text-danger">
                    <i class="fas fa-exclamation-triangle fs-1 mb-2"></i>
                    <p>Could not load notes. Please try again.</p>
                </div>`;
            }
        };
    }

    window.prepareNewNote = function() {
        activeNoteId = null;
        const noteForm = document.getElementById('note-form');
        if(noteForm) noteForm.reset();
        if(contentIn) contentIn.value = `<h2>New Entry Title</h2><p>Start writing your notes here...</p>`;
        if(titleInput) titleInput.value = `New Entry Title`;
        updatePreview();
    };

    window.addEventListener('prepareNewNote', () => window.prepareNewNote());

    const urlParams = new URLSearchParams(window.location.search);
    const isExamMode = urlParams.get('mode') === 'exam';
    const examUnitParam = parseInt(urlParams.get('unit') || '1', 10);

    if (isExamMode) {
        activeUnit = csCourseMap.find(u => u.unitNum === examUnitParam) || csCourseMap[0];
        activeTab = { type: 'EXAM' };

        const navContainer = document.querySelector('.course-nav-container');
        if (navContainer) navContainer.style.display = 'none';

        const leftPane = document.getElementById('left-pane-card');
        if (leftPane && leftPane.parentElement) leftPane.parentElement.style.display = 'none';

        const rightPane = viewJournal.closest('.col-lg-6');
        if (rightPane) {
            rightPane.classList.remove('col-lg-6');
            rightPane.classList.add('col-lg-12');
        }

        if (viewJournal) viewJournal.classList.remove('d-none');

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
        return; 
    } else {
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
                    listData.append("studentId", student.student_id);
                    const listRes = await fetch(HOSTGATOR_MANAGE_URL, { method: "POST", body: listData });
                    const listJson = await listRes.json();
                    if (listJson.success) {
                        const prefix = `uploads/${student.student_id}/`;
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
                    formData.append("studentId", student.student_id);
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

        document.body.addEventListener('click', async (e) => {
            const unitBtn = e.target.closest('.unit-tab-btn');
            const chapBtn = e.target.closest('.chapter-tab-btn');

            if (unitBtn) {
                const unitVal = unitBtn.dataset.unit;
                if (unitVal === 'FINAL_EXAM') {
                    // If grades are loaded, check lock immediately — no extra click needed
                    const requiredUnits = [1, 2, 3, 4, 5, 6, 7];
                    const allDone = gradesLoaded && requiredUnits.every(n =>
                        Object.keys(grades).some(k =>
                            k.match(new RegExp(`Unit\\s*-?\\s*${n}\\b`, 'i')) &&
                            k.match(/Summative|Exam|Final/i) &&
                            !k.match(/Pre/i)
                        )
                    );
                    if (allDone) {
                        window.open('/exams/cs-final-exam.html', '_blank');
                    } else {
                        // Locked or grades not yet loaded — show the lock overlay
                        activeTab = { type: 'FINAL_EXAM' };
                        await checkProgressAndGate(false);
                    }
                } else {
                    activeUnit = csCourseMap.find(u => u.unitNum === parseInt(unitVal, 10));
                    await checkProgressAndGate(true);
                }
            }

if (chapBtn) {
                const target = chapBtn.getAttribute('data-target');

                // Set the active tab based on which button was clicked
                if (target === 'PRE_SCALE') {
                    activeTab = { type: 'PRE_SCALE' };
                }
                else if (target === 'PRE_TEST') {
                    activeTab = { type: 'PRE_TEST' };
                }
                else if (target === 'EXAM') {
                    // Direct open — same behavior as before (bypass config controls locking)
                    const bypassWorksheets = !GLOBAL_BYPASS_CONFIG.requireWorksheets || GLOBAL_BYPASS_CONFIG.bypassAll;
                    const bypassDiagnostic = !GLOBAL_BYPASS_CONFIG.requireDiagnostic || GLOBAL_BYPASS_CONFIG.bypassAll;
                    const bypassPreScale   = !GLOBAL_BYPASS_CONFIG.requirePreScale   || GLOBAL_BYPASS_CONFIG.bypassAll;

                    const _hasPreScale = selfAssessmentsLoaded && selfAssessments[`unit${activeUnit.unitNum}`] !== undefined && selfAssessments[`unit${activeUnit.unitNum}`] > 0;
                    const allChaptersDone = activeUnit.chapters.every(c => {
                        const hasNote  = Object.keys(notes).some(key => key.includes(`Ch ${c.ch}`) || key.includes(`Ch${c.ch}`));
                        const hasGrade = Object.keys(grades).some(k => k.match(new RegExp(`(Ch|Chapter)\\s*0*${c.ch}[-\\s:]`, 'i')));
                        return hasNote || hasGrade;
                    });

                    const examUnlocked  = bypassPreScale   || _hasPreScale;
                    const diagUnlocked  = bypassDiagnostic || examUnlocked;
                    const worksUnlocked = bypassWorksheets  || allChaptersDone;

                    if (examUnlocked && diagUnlocked && worksUnlocked) {
                        window.open(`/exams/cs-unit-${activeUnit.unitNum}-exam.html`, '_blank');
                        return;
                    } else {
                        const missing = [];
                        if (!examUnlocked)  missing.push('Pre-Scale');
                        if (!diagUnlocked)  missing.push('Diagnostic');
                        if (!worksUnlocked) missing.push('All Chapter Notes');
                        alert(`Exam Locked! Complete the following to unlock:\n• ${missing.join('\n• ')}`);
                        return;
                    }
                }
                else if (target === 'POST_SCALE') {
                    activeTab = { type: 'POST_SCALE' };
                }
                else if (target.startsWith('CH_')) {
                    const chNum = parseInt(target.split('_')[1]);
                    activeTab = { type: 'CHAPTER', data: activeUnit.chapters.find(c => c.ch === chNum) };
                }
                
                // Call checkProgressAndGate to handle the UI - it has all the logic for rendering
                // Pass false to NOT auto-advance - we want to stay on the clicked tab
                await checkProgressAndGate(false);
            }
        });

        window.addEventListener('refreshUserProgress', async () => {
            await checkProgressAndGate(true);
        });

window.addEventListener('message', async (event) => {
            if (event.data.type === 'diagnostic_complete' ||
                event.data.type === 'scale_complete' ||
                (event.data && event.data.score !== undefined && !event.data.type)) {
                // Refresh progress to update the UI state
                window.dispatchEvent(new CustomEvent('refreshUserProgress'));
                
// Sync Pre-Scale completion to gradebook - FIXED 10 POINTS
                if (event.data.type === 'scale_complete' || event.data.scaleType === 'pre') {
                    await syncPreScale(10);  // FIXED: Always pass 10 points (not level)
                    console.log("Pre-Scale synced: 10 pts fixed");
                }

                // Sync Pre-Assessment (Diagnostic) to gradebook - FIXED 15 POINTS
                if (event.data.type === 'diagnostic_complete') {
                    await syncPreAssessment(15, 15);  // FIXED: Always pass 15 points fixed
                    console.log("Pre-Assessment synced: 15 pts fixed");

                    // Tell the scale iframe (curriculum-frame) to refresh its grade bars
                    // so the pre-system-overlay unlocks without the user needing to reload
                    if (dom.curriculumFrame && dom.curriculumFrame.contentWindow) {
                        dom.curriculumFrame.contentWindow.postMessage({ type: 'refresh_scores' }, '*');
                    }
                }
            }
        });

// ==========================================
        // RESTORE LAST POSITION (Unit/Chapter)
        // ==========================================
        const savedPosition = getLastPosition();
        if (savedPosition) {
            // Find the saved unit
            const savedUnit = csCourseMap.find(u => u.unitNum === savedPosition.unit);
            if (savedUnit) {
                activeUnit = savedUnit;
                // Restore the tab type
                if (savedPosition.tabType === 'CHAPTER' && savedPosition.chapter !== null) {
                    const chapterData = activeUnit.chapters.find(c => c.ch === savedPosition.chapter);
                    if (chapterData) {
                        activeTab = { type: 'CHAPTER', data: chapterData };
                        console.log('[lastPosition] Restored to Chapter', savedPosition.chapter);
                    } else {
                        activeTab = { type: savedPosition.tabType || 'PRE_SCALE' };
                    }
                } else {
                    activeTab = { type: savedPosition.tabType || 'PRE_SCALE' };
                }
                console.log('[lastPosition] Restored:', savedPosition);
            }
        }
        
        // ==========================================
        // SAVE POSITION ON USER INTERACTION
        // ==========================================
        // Setup automatic position saving when user clicks unit/chapter buttons
        const originalClickHandler = document.body.onclick;
        document.body.addEventListener('click', function(e) {
            const unitBtn = e.target.closest('.unit-tab-btn');
            const chapBtn = e.target.closest('.chapter-tab-btn');
            
            if (unitBtn && activeUnit) {
                // Save position when unit changes
                saveLastPosition(activeUnit.unitNum, null, activeTab.type);
            }
            if (chapBtn && activeUnit) {
                const target = chapBtn.getAttribute('data-target');
                let chapNum = null;
                let tabType = activeTab.type;
                
                if (target && target.startsWith('CH_')) {
                    chapNum = parseInt(target.split('_')[1]);
                    tabType = 'CHAPTER';
                } else if (target === 'PRE_SCALE') {
                    tabType = 'PRE_SCALE';
                } else if (target === 'PRE_TEST') {
                    tabType = 'PRE_TEST';
                } else if (target === 'EXAM') {
                    tabType = 'EXAM';
                } else if (target === 'POST_SCALE') {
                    tabType = 'POST_SCALE';
                }
                
                saveLastPosition(activeUnit.unitNum, chapNum, tabType);
            }
        }, true);

// Initialize with default states, which renders the initial UI before DB replies
        renderTabs();
        checkProgressAndGate(true);
        
        // ==========================================
        // RENDER SELF-ASSESSMENT PROGRESS CHART
        // ==========================================
        // Load saved self-assessments from localStorage and display as a progress chart
        if (typeof Chart !== 'undefined') {
            renderSelfAssessmentChart();
        }
    }
}

// Function to render the self-assessment progress chart
window.renderSelfAssessmentChart = function() {
    try {
        const historyKey = 'cs_self_assessment_history';
        const stored = JSON.parse(localStorage.getItem(historyKey) || '{}');
        if (Object.keys(stored).length === 0) return;
        
        // Build chart data from all saved units
        const labels = [];
        const preData = [];
        const postData = [];
        
        for (let u = 0; u <= 8; u++) {
            const key = 'unit' + u;
            if (stored[key]) {
                labels.push('Unit ' + u);
                if (stored[key].mode === 'pre') {
                    preData.push(stored[key].level || 0);
                    postData.push(0);
                } else if (stored[key].mode === 'post') {
                    preData.push(0);
                    postData.push(stored[key].level || 0);
                }
            } else {
                preData.push(0);
                postData.push(0);
            }
        }
        
        // Create or update chart container
        let chartContainer = document.getElementById('self-assessment-chart-container');
        if (!chartContainer) {
            // Find a good spot - try the status area or create one
            const statusArea = document.getElementById('unit-status-pill');
            if (statusArea) {
                chartContainer = document.createElement('div');
                chartContainer.id = 'self-assessment-chart-container';
                chartContainer.className = 'mt-3 p-2 bg-light rounded';
                chartContainer.innerHTML = '<h6 class="mb-2 fw-bold text-primary">Self-Assessment Progress</h6><canvas id="sa-progress-chart" height="150"></canvas>';
                statusArea.parentNode.insertBefore(chartContainer, statusArea.nextSibling);
            }
        }
        
        if (chartContainer) {
            const ctx = document.getElementById('sa-progress-chart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            { label: 'Pre-Scale', data: preData, backgroundColor: 'rgba(0, 0, 153, 0.7)', borderRadius: 4 },
                            { label: 'Post-Scale', data: postData, backgroundColor: 'rgba(88, 129, 88, 0.7)', borderRadius: 4 }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: { y: { beginAtZero: true, max: 4, ticks: { stepSize: 1 } } }
                    }
                });
            }
        }
    } catch(e) { console.warn("Chart render failed:", e); }
};
