/**
 * CHS Web Design - Master Teacher Gradebook Controller (MariaDB Edition)
 * This script powers the administrative gradebook interface, handling real-time MariaDB data synchronization
 * for student rosters, assignments, and grades. It features a dynamically weighted grading engine based on course type,
 * period-specific due dates with smart auto-fill from student submissions, automatic calendar-aware exemptions for
 * timeclock entries, and inline editing for rapid grade entry, all while maintaining strict privacy and sorting controls.
 */

// Weighted grading config is shared with the student dashboard via js/modules/grade-weights.js —
// edit there, not here, so teacher and student views never diverge.
import { COURSE_WEIGHTS, getAssignmentCategory, periodToCourseKey } from '../modules/grade-weights.js?v=3';

// Dynamically load Chart.js for the Analytics Graph
if (!document.getElementById('chartjs-lib')) {
    const script = document.createElement('script');
    script.id = 'chartjs-lib';
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(script);
}

// Matches data/cs-course-map.json -- which chapters' classwork
// (cs_chN_activity_name) belong to which unit's exam. Kept in sync with
// the identical copies in server/gradeCalc.js and js/student/dashboard.js.
const CS_UNIT_CHAPTERS = {
    1: [1, 2], 2: [3, 4], 3: [5, 6, 7, 8], 4: [9, 10],
    5: [11, 12, 13], 6: [14, 15, 16], 7: [17, 18, 19]
};
function unitForCsChapter(ch) {
    for (const unit in CS_UNIT_CHAPTERS) {
        if (CS_UNIT_CHAPTERS[unit].includes(ch)) return Number(unit);
    }
    return null;
}

// Period-group filtering (the "All WD1"/"All CS" dropdown options) needs to
// resolve a bare period code (A1, A3, B2...) to its course the same way
// periodToCourseKey() does for grade weighting, so the two can't disagree.
function periodGroupPrefix(period) {
    return periodToCourseKey(period) || String(period).split('-')[0];
}

let allStudents = [];
let allGrades = {};
let allAssignments = {};
let calendarConfig = null;
let privacyMode = false;
let showSummaryColumns = true;
let currentSortMode = 'lastName';
let assignmentSortMode = 'dueDate'; // 'dueDate' | 'weight' | 'alpha'
let assignmentSortDir = 'asc';
let allStickers = {}; // student_id -> [{ id, sticker_name, awarded_at }]
let stickerModalStudentId = null;

const STICKER_DIR = '/images/Big-Motivational-Reward-Stickers-Bundle/';
const STICKERS = [
    'A+', 'APEELING WORK', 'APTLY DONE', 'AWESOME WORK', 'BEE YOUR BEST', 'BEEUTIFUL WORK',
    'BRILLIANT WORK', 'CHERRY GOOD', 'CHERRY SWEET WORK', 'DONUT GIVE UP', 'DREAM BIG',
    'EXCELLENT', 'FANTASTIC WORK', 'FINTASTIC WORK', 'GOOD JOB', 'GRAPE JOB',
    'GREAT JOB BRAVOCADO', 'GREAT WORK LETTUCE CELEBRATE', 'HOLIDAY CHEERS', 'HOLLY JOLLY GREAT WORK',
    'I AM SNOW PROUD OF YOU', 'KEEP IT UP', 'KEEP LEARNING', 'KEEP SHINING', 'KEEP UP THE GOOD WORK',
    'LOOKING ROCK', 'NICE WORK SPOTTED', 'NICE WORK', 'ONE IN A MELON', 'ORANGE YOU A SMARTIE',
    'OTTERLY AMAZING', 'PURRFECT JOB', 'SHINE BRIGHT', 'SHOOT FOR THE STARS', 'SIMPLY GOOD', 'STAR',
    'SUPER COOL WORK', 'SUPER COOL', 'SUPER', 'THIS WORK IS SODALIGHTFUL', 'THUMBS UP',
    'TOADALLY TERRIFIC', 'TOTALLY BANANAS', 'TRY AGAIN', 'WAY TO GO', 'WELL DONE (2)', 'WELL DONE (3)',
    'WELL DONE', 'WHALE DONE', 'YOU ARE A GIFT', 'YOU ARE A SHINING STAR', 'YOU ARE A STAR',
    'YOU ARE LLAMAZING', 'YOU ARE OUT OF THIS WORLD', 'YOU ARE PURRFECT', 'YOU DID IT (2)', 'YOU DID IT',
    'YOU ROCK', 'YOU SNAILED IT', "YOU'RE LIKE A HUG IN A MUG", "YOU'RE ONE SMART COOKIE",
    "YOU'RE THE BERRY BEST", "YOU'VE GOT MAGIC IN YOU", 'YOUR WORK SHINES'
];
function stickerImgUrl(name) { return STICKER_DIR + encodeURIComponent(name + '.png'); }
window.earliestSubmissions = {}; 

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Cached from the most recent renderGradebook() call so the "Copy Scores"
// button (delegated click handler, outside that function's scope) can read
// the exact same row order and grade data currently on screen, instead of
// recomputing the sort/grouping logic a second time.
let lastOrderedStudents = [];
let lastGrades = {};

const cleanKey = (str) => {
    if (!str) return "";
    return str.toString()
              .replace(/\s*[\[\(]\d+\s*pts?[\]\)]/i, '')
              .replace(/[^a-zA-Z0-9]/g, '')
              .toLowerCase()
              .trim();
};

// ========================================================
// Helper to sort students globally
// ========================================================
function sortStudentsArray(studentsArray) {
    return studentsArray.sort((a, b) => {
        const aLast = a.lastName || '';
        const bLast = b.lastName || '';
        const aFirst = a.firstName || '';
        const bFirst = b.firstName || '';
        const aPeriod = a.matchedPeriod || a.period || '';
        const bPeriod = b.matchedPeriod || b.period || '';

        if (currentSortMode === 'lastName') {
            return aLast.localeCompare(bLast);
        } else if (currentSortMode === 'firstName') {
            return aFirst.localeCompare(bFirst);
        } else if (currentSortMode === 'periodLast') {
            return aPeriod.localeCompare(bPeriod) || aLast.localeCompare(bLast);
        } else if (currentSortMode === 'periodFirst') {
            return aPeriod.localeCompare(bPeriod) || aFirst.localeCompare(bFirst);
        }
        return 0;
    });
}

// ========================================================
// 1. INJECT CUSTOM BOOTSTRAP MODALS & CONTROLS
// ========================================================
function injectControls() {
    if (document.getElementById('gbControlsInjected')) return;
    
const toggleHtml = `
    <div id="gbControlsInjected" class="ms-2 d-flex gap-2 align-items-center">
        <select id="sortStudentFilter" class="form-select form-select-sm border-primary text-primary fw-bold shadow-sm" style="width: auto;" title="Sort Students By">
            <option value="lastName">Sort: Last Name</option>
            <option value="firstName">Sort: First Name</option>
            <option value="periodLast">Sort: Period, Last Name</option>
            <option value="periodFirst">Sort: Period, First Name</option>
        </select>
        <select id="sortAssignmentFilter" class="form-select form-select-sm border-info text-info fw-bold shadow-sm" style="width: auto;" title="Sort Assignment Columns By">
            <option value="dueDate">Assignments: Due Date</option>
            <option value="weight">Assignments: Weight (Category)</option>
            <option value="alpha">Assignments: Alphabetical</option>
        </select>
        <button type="button" id="btnAssignmentSortDir" class="btn btn-sm btn-outline-info fw-bold shadow-sm" title="Reverse assignment sort direction">
            <i class="fas fa-arrow-down-a-z me-1"></i> Forward
        </button>
        <button type="button" id="btnSyncSheets" class="btn btn-sm btn-warning fw-bold shadow-sm" title="Pull Master Grades from Google Sheet">
            <i class="fas fa-cloud-download-alt me-1"></i> Sync Sheets
        </button>
        <button type="button" id="btnAddAssignment" class="btn btn-sm btn-success fw-bold shadow-sm" title="Manually Add Assignment">
            <i class="fas fa-plus me-1"></i> Assignment
        </button>
        <button type="button" id="btnClearAllAssignments" class="btn btn-sm btn-danger fw-bold shadow-sm" title="Clear all assignments and grades for fresh start">
            <i class="fas fa-trash-alt me-1"></i> Clear All
        </button>
        <button type="button" id="btnToggleSummaries" class="btn btn-sm btn-outline-primary active fw-bold shadow-sm" title="Toggle Summary Columns">
            <i class="fas fa-table-columns me-1"></i> Summaries
        </button>
    </div>`;
    
    const filterContainer = document.querySelector('.d-flex.flex-wrap.gap-3.align-items-center.no-print');
    if (filterContainer) {
        const printBtn = filterContainer.querySelector('button[onclick="window.print()"]');
        if(printBtn) printBtn.insertAdjacentHTML('beforebegin', toggleHtml);
        else filterContainer.insertAdjacentHTML('beforeend', toggleHtml);
    }

    const sortFilter = document.getElementById('sortStudentFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            currentSortMode = e.target.value;
            const periodVal = document.getElementById('periodFilter') ? document.getElementById('periodFilter').value : 'All';
            updateStudentDropdown(getFilteredStudents(periodVal, 'All'));
            applyFiltersAndRender();
        });
    }

    const sortAssignmentFilter = document.getElementById('sortAssignmentFilter');
    if (sortAssignmentFilter) {
        sortAssignmentFilter.addEventListener('change', (e) => {
            assignmentSortMode = e.target.value;
            applyFiltersAndRender();
        });
    }

    const btnAssignmentSortDir = document.getElementById('btnAssignmentSortDir');
    if (btnAssignmentSortDir) {
        btnAssignmentSortDir.addEventListener('click', () => {
            assignmentSortDir = assignmentSortDir === 'asc' ? 'desc' : 'asc';
            btnAssignmentSortDir.innerHTML = assignmentSortDir === 'asc'
                ? '<i class="fas fa-arrow-down-a-z me-1"></i> Forward'
                : '<i class="fas fa-arrow-up-a-z me-1"></i> Backward';
            applyFiltersAndRender();
        });
    }

    const btnToggleSummaries = document.getElementById('btnToggleSummaries');
    if (btnToggleSummaries) {
        btnToggleSummaries.addEventListener('click', (e) => {
            showSummaryColumns = !showSummaryColumns;
            e.currentTarget.classList.toggle('active', showSummaryColumns);
            applyFiltersAndRender();
        });
    }

const btnAddAssignment = document.getElementById('btnAddAssignment');
    if (btnAddAssignment) {
        btnAddAssignment.addEventListener('click', () => {
            document.getElementById('addColName').value = '';
            document.getElementById('addColPts').value = '100';
            document.getElementById('addColDueDate').value = '';
            document.getElementById('addColInstructions').value = '';
            document.getElementById('addColCourse').value = 'All';
            renderPeriodDateInputs('addColPeriodDates', {}, 'success');
            getModal('addColModal').show();
        });
    }

    // Clear All Assignments button handler
    const btnClearAllAssignments = document.getElementById('btnClearAllAssignments');
    if (btnClearAllAssignments) {
        btnClearAllAssignments.addEventListener('click', async () => {
            if (!confirm("⚠️ CLEAR ALL ASSIGNMENTS & GRADES?\n\nThis will delete ALL assignments and ALL student grades. This cannot be undone!\n\nUse this to start a fresh school year.")) return;
            if (!confirm("Are you absolutely sure? All gradebook data will be permanently deleted.")) return;
            
            const btn = btnClearAllAssignments;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Clearing...';
            btn.disabled = true;
            
            try {
                const res = await fetch('/api/admin/clear-all-assignments', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'}
                });
                
                if (res.ok) {
                    alert('✅ All assignments and grades have been cleared! You can now start fresh for the new school year.');
                    loadData(); // Reload the gradebook
                } else {
                    const j = await res.json().catch(()=>({}));
                    alert(j.error || 'Failed to clear assignments.');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred while clearing assignments.');
            } finally {
                btn.innerHTML = '<i class="fas fa-trash-alt me-1"></i> Clear All';
                btn.disabled = false;
            }
        });
    }

    // ==========================================
    // SYNC LOGIC: STRICT OVERWRITE (Highest Score Wins)
    // ==========================================
    const btnSyncSheets = document.getElementById('btnSyncSheets');
    if (btnSyncSheets) {
        btnSyncSheets.addEventListener('click', async (e) => {
            if(!confirm("Sync Google Sheet grades? This will overwrite existing grades ONLY if the Sheet score is HIGHER.")) return;
            
            const btn = e.currentTarget;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Syncing...';
            btn.disabled = true;
            
            try {
                const scriptUrl = "https://script.google.com/macros/s/AKfycbyoX6MTNxThGNVQtIn4e_OgJoYUGUdPPKY9lbXf63h3H9fwGOxUeToxptyORS7LgWVNeg/exec";
                const response = await fetch(scriptUrl);
                const json = await response.json();
                
                if (json.result === "success" && json.data) {
                    let payload = [];
                    const gradebookAssignmentKeys = Object.keys(allAssignments);

                    Object.keys(json.data).forEach(studentId => {
                        const incomingGrades = json.data[studentId];
                        const currentGrades = allGrades[studentId] || {};
                        let updatesForStudent = {};
                        let hasUpdates = false;

                        Object.keys(incomingGrades).forEach(incomingKey => {
                            const incomingData = incomingGrades[incomingKey];
                            const incomingScore = incomingData.score === "EX" ? "EX" : (Number(incomingData.score) || 0);

                            const match = gradebookAssignmentKeys.find(gbKey => cleanKey(gbKey) === cleanKey(incomingKey)) || incomingKey;
                            
                            const currentEntry = currentGrades[match];
                            let currentScore = "";
                            if (currentEntry) {
                                const raw = typeof currentEntry === 'object' ? currentEntry.score : currentEntry;
                                currentScore = raw === "EX" ? "EX" : (Number(raw) || 0);
                            }

                            let shouldUpdate = false;
                            
                            if (currentScore === "" || currentScore === undefined || currentScore === null) {
                                shouldUpdate = true; 
                            } else if (incomingScore === "EX" && currentScore !== "EX") {
                                shouldUpdate = true;
                            } else if (typeof incomingScore === 'number' && typeof currentScore === 'number') {
                                if (incomingScore > currentScore) {
                                    shouldUpdate = true; 
                                }
                            }

                            if (shouldUpdate) {
                                updatesForStudent[match] = {
                                    score: incomingScore,
                                    max: incomingData.max || 100
                                };
                                hasUpdates = true;
                            }
                        });
                        
                        if (hasUpdates) {
                            payload.push({ studentId, updates: updatesForStudent });
                        }
                    });
                    
                    if (payload.length > 0) {
                        await fetch('/api/admin/batch-update-grades', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ batch: payload })
                        });
                        alert(`Sync complete! Updated grades for ${payload.length} students based on highest scores.`);
                        loadData(); 
                    } else alert("Sync complete! All current gradebook scores were higher than or equal to the spreadsheet.");
                } else alert("Failed to read data from Google Sheet.");
            } catch (err) {
                console.error("Sync Error:", err);
                alert("An error occurred during sync.");
            } finally {
                btn.innerHTML = '<i class="fas fa-cloud-download-alt me-1"></i> Sync Sheets';
                btn.disabled = false;
            }
        });
    }
}

function renderPeriodDateInputs(containerId, existingPeriodDates = {}, colorClass = 'primary') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const periods = [...new Set(allStudents.map(s => s.period))]
                    .filter(p => p && p !== 'Unassigned' && p !== 'Teacher')
                    .sort();
    
    if (periods.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <div class="col-12 mt-2 border-top pt-3">
            <label class="form-label small fw-bold text-muted mb-2"><i class="fas fa-calendar-day me-1"></i> Period-Specific Due Dates (Overrides Global)</label>
        </div>
    `;
    
    periods.forEach(p => {
        const val = existingPeriodDates[p] || '';
        html += `
        <div class="col-6 col-md-4 mb-3">
            <label class="form-label text-${colorClass} mb-1" style="font-size: 0.7rem; font-weight: 800;">${p}</label>
            <input type="date" class="form-control form-control-sm border-${colorClass} fw-bold period-due-date-input" data-period="${p}" value="${val}">
        </div>
        `;
    });
    
    container.innerHTML = html;
}

function injectModals() {
    if (document.getElementById('gbModalsInjected')) return;
    const modalHtml = `
    <div id="gbModalsInjected"></div>
    
    <div class="modal fade" id="addColModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-success">
          <div class="modal-header bg-success text-white py-2">
            <h6 class="modal-title fw-bold"><i class="fas fa-plus me-2"></i>Create New Assignment</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body bg-light">
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Assignment Name</label>
              <input type="text" id="addColName" class="form-control border-success fw-bold" placeholder="e.g. Ch5-Summative Exam">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Instructions / Description (Optional)</label>
              <textarea id="addColInstructions" class="form-control border-success" rows="2" placeholder="Instructions for students..."></textarea>
            </div>
            <div class="row mb-3">
                <div class="col-12">
                  <label class="form-label small fw-bold text-muted">Target Course Visibility</label>
                  <select id="addColCourse" class="form-select border-success fw-bold">
                    <option value="All">All Courses & Periods</option>
                    <option value="WD1">Web Design 1 (WD1) Only</option>
                    <option value="WD2">Advanced Web Design (WD2) Only</option>
                    <option value="AS">Advanced Studies (AS) Only</option>
                    <option value="CS">Computer Science (CS) Only</option>
                  </select>
                </div>
            </div>
            <div class="row mb-1">
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted">Max Points</label>
                  <input type="number" id="addColPts" class="form-control border-success fw-bold" value="100">
                </div>
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted">Global Due Date</label>
                  <input type="date" id="addColDueDate" class="form-control border-success fw-bold">
                </div>
            </div>
            <div class="row" id="addColPeriodDates"></div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" data-bs-dismiss="modal">Cancel</button>
            <button type="button" id="btnSaveAddCol" class="btn btn-success btn-sm fw-bold px-4">Create</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="analyticsModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow border-info">
          <div class="modal-header bg-info text-white py-2">
            <h6 class="modal-title fw-bold" id="analyticsModalTitle"><i class="fas fa-chart-bar me-2"></i>Assignment Analytics</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row text-center g-3 mb-3">
                <div class="col-4"><div class="p-3 bg-light rounded border"><h3 id="statMean" class="text-primary mb-1">-</h3><small class="fw-bold text-muted text-uppercase">Mean</small></div></div>
                <div class="col-4"><div class="p-3 bg-light rounded border"><h3 id="statMedian" class="text-primary mb-1">-</h3><small class="fw-bold text-muted text-uppercase">Median</small></div></div>
                <div class="col-4"><div class="p-3 bg-light rounded border"><h3 id="statPass" class="text-success mb-1">-</h3><small class="fw-bold text-muted text-uppercase">Mastery</small></div></div>
            </div>
            <div class="border rounded p-3 bg-light mb-3">
                <h6 class="text-center fw-bold text-muted mb-1 text-uppercase" style="letter-spacing: 1px; font-size: 0.8rem;">Mastery by Period</h6>
                <div style="height: 250px; position: relative;"><canvas id="periodAnalyticsChart"></canvas></div>
            </div>
            <p id="masteryDescription" class="text-center text-secondary small fst-italic mb-0"></p>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="editColModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-primary">
          <div class="modal-header bg-primary text-white py-2">
            <h6 class="modal-title fw-bold"><i class="fas fa-edit me-2"></i>Edit Assignment Column</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body bg-light">
            <input type="hidden" id="editColOldName">
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Assignment Name</label>
              <input type="text" id="editColNewName" class="form-control border-primary fw-bold">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Instructions / Description (Optional)</label>
              <textarea id="editColInstructions" class="form-control border-primary" rows="2" placeholder="Instructions for students..."></textarea>
            </div>
            <div class="row mb-3">
                <div class="col-12">
                  <label class="form-label small fw-bold text-muted">Target Course Visibility</label>
                  <select id="editColCourse" class="form-select border-primary fw-bold">
                    <option value="All">All Courses & Periods</option>
                    <option value="WD1">Web Design 1 (WD1) Only</option>
                    <option value="WD2">Advanced Web Design (WD2) Only</option>
                    <option value="AS">Advanced Studies (AS) Only</option>
                    <option value="CS">Computer Science (CS) Only</option>
                  </select>
                </div>
            </div>
            <div class="row mb-1">
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted">Max Points</label>
                  <input type="number" id="editColNewPts" class="form-control border-primary fw-bold">
                </div>
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted">Global Due Date</label>
                  <input type="date" id="editColDueDate" class="form-control border-primary fw-bold">
                </div>
            </div>
            <div class="row" id="editColPeriodDates"></div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" data-bs-toggle="modal" data-bs-target="#editColModal">Cancel</button>
            <button type="button" id="btnSaveColEdit" class="btn btn-primary btn-sm fw-bold px-4">Save Changes</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="deleteColModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-danger">
          <div class="modal-header bg-danger text-white py-2">
            <h6 class="modal-title fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>Delete Assignment</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body bg-light text-center">
            <p class="mb-2 fw-bold text-dark">Are you absolutely sure?</p>
            <p class="small text-muted mb-3">This will permanently delete <br><span id="deleteColName" class="text-danger fw-bold border-bottom border-danger"></span><br> and ALL recorded scores.</p>
            <input type="hidden" id="deleteColTarget">
          </div>
          <div class="modal-footer py-2 justify-content-center">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" data-bs-dismiss="modal">Cancel</button>
            <button type="button" id="btnConfirmDeleteCol" class="btn btn-danger btn-sm fw-bold px-4">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="stickerModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow border-warning">
          <div class="modal-header bg-warning py-2">
            <h6 class="modal-title fw-bold"><i class="fas fa-star me-2"></i>Award a Sticker — <span id="stickerModalStudentName"></span></h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body bg-light">
            <div id="stickerGrid" class="d-flex flex-wrap gap-2 mb-3" style="max-height:340px; overflow-y:auto;"></div>
            <hr>
            <p class="small fw-bold text-muted mb-1">Already awarded</p>
            <div id="stickerAwardedList" class="d-flex flex-wrap gap-2"></div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="changePeriodModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-primary">
          <div class="modal-header bg-primary text-white py-2">
            <h6 class="modal-title fw-bold"><i class="fas fa-right-left me-2"></i>Change Period — <span id="changePeriodStudentName"></span></h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body bg-light">
            <label class="form-label small fw-bold text-muted">New Period</label>
            <select id="changePeriodSelect" class="form-select fw-bold border-primary"></select>
            <input type="hidden" id="changePeriodStudentId">
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" data-bs-dismiss="modal">Cancel</button>
            <button type="button" id="btnSaveChangePeriod" class="btn btn-primary btn-sm fw-bold px-4">Save</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="dropStudentModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-danger">
          <div class="modal-header bg-danger text-white py-2">
            <h6 class="modal-title fw-bold"><i class="fas fa-user-minus me-2"></i>Mark as Dropped</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body bg-light text-center">
            <p class="mb-2 fw-bold text-dark">Mark <span id="dropStudentName" class="text-danger"></span> as dropped?</p>
            <p class="small text-muted mb-0">They'll be archived and removed from active rosters and gradebook views, but their grade history is kept. You can restore them later from the roster's year filter.</p>
            <input type="hidden" id="dropStudentId">
          </div>
          <div class="modal-footer py-2 justify-content-center">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" data-bs-dismiss="modal">Cancel</button>
            <button type="button" id="btnConfirmDropStudent" class="btn btn-danger btn-sm fw-bold px-4">Mark as Dropped</button>
          </div>
        </div>
      </div>
    </div>

    <div id="studentContextMenu" class="shadow border rounded bg-white py-1" style="display:none; position:fixed; z-index:3000; min-width:190px;">
        <button type="button" class="dropdown-item ctx-change-period"><i class="fas fa-right-left me-2 text-primary"></i>Change Period</button>
        <button type="button" class="dropdown-item ctx-drop-student text-danger"><i class="fas fa-user-minus me-2"></i>Mark as Dropped</button>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btnSaveAddCol').addEventListener('click', saveAddCol);
    document.getElementById('btnSaveColEdit').addEventListener('click', saveColEdit);
    document.getElementById('btnConfirmDeleteCol').addEventListener('click', confirmDeleteCol);
    document.getElementById('btnSaveChangePeriod').addEventListener('click', saveChangePeriod);
    document.getElementById('btnConfirmDropStudent').addEventListener('click', confirmDropStudent);

    injectControls();
    injectStudentContextMenu();
}

// ========================================================
// STUDENT RIGHT-CLICK CONTEXT MENU (Change Period / Mark as Dropped)
// ========================================================
function injectStudentContextMenu() {
    const menu = document.getElementById('studentContextMenu');

    document.addEventListener('contextmenu', (e) => {
        const cell = e.target.closest('.student-info-cell');
        if (!cell) return;
        e.preventDefault();
        menu.dataset.studentId = cell.dataset.studentId;
        menu.dataset.studentName = cell.dataset.studentName;
        menu.dataset.currentPeriod = cell.dataset.currentPeriod;

        // Keep the menu fully on-screen regardless of where along the row it was triggered.
        const menuWidth = 190, menuHeight = 90;
        const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
        const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) menu.style.display = 'none';
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') menu.style.display = 'none';
    });

    menu.querySelector('.ctx-change-period').addEventListener('click', () => {
        menu.style.display = 'none';
        openChangePeriodModal(menu.dataset.studentId, menu.dataset.studentName, menu.dataset.currentPeriod);
    });
    menu.querySelector('.ctx-drop-student').addEventListener('click', () => {
        menu.style.display = 'none';
        openDropStudentModal(menu.dataset.studentId, menu.dataset.studentName);
    });
}

function openChangePeriodModal(studentId, studentName, currentPeriod) {
    document.getElementById('changePeriodStudentName').textContent = studentName;
    document.getElementById('changePeriodStudentId').value = studentId;

    // Real, currently-in-use periods only — same source as the period filter dropdown.
    const allPeriods = allStudents.flatMap(s => [s.period, ...(s.additional_sections || []).map(a => a.section_id)]);
    const periods = [...new Set(allPeriods)].filter(p => p && p !== 'Teacher' && p !== 'Unassigned').sort();

    const select = document.getElementById('changePeriodSelect');
    select.innerHTML = periods.map(p => `<option value="${escapeHtml(p)}" ${p === currentPeriod ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
    getModal('changePeriodModal').show();
}

async function saveChangePeriod() {
    const studentId = document.getElementById('changePeriodStudentId').value;
    const newPeriod = document.getElementById('changePeriodSelect').value;
    const btn = document.getElementById('btnSaveChangePeriod');
    btn.disabled = true;
    try {
        const res = await fetch('/api/admin/save-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, section_id: newPeriod })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to change period');
        }
        getModal('changePeriodModal').hide();
        await loadData();
        applyFiltersAndRender();
    } catch (e) {
        alert('Could not change period: ' + e.message);
    } finally {
        btn.disabled = false;
    }
}

function openDropStudentModal(studentId, studentName) {
    document.getElementById('dropStudentName').textContent = studentName;
    document.getElementById('dropStudentId').value = studentId;
    getModal('dropStudentModal').show();
}

async function confirmDropStudent() {
    const studentId = document.getElementById('dropStudentId').value;
    const btn = document.getElementById('btnConfirmDropStudent');
    btn.disabled = true;
    try {
        const res = await fetch('/api/admin/archive-students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_ids: [studentId] })
        });
        if (!res.ok) throw new Error('Failed to archive student');
        getModal('dropStudentModal').hide();
        await loadData();
        applyFiltersAndRender();
    } catch (e) {
        alert('Could not mark student as dropped: ' + e.message);
    } finally {
        btn.disabled = false;
    }
}

function openStickerModal(studentId) {
    stickerModalStudentId = studentId;
    const student = allStudents.find(s => s.studentId === studentId);
    document.getElementById('stickerModalStudentName').textContent = student ? `${student.firstName} ${student.lastName}` : studentId;

    const grid = document.getElementById('stickerGrid');
    grid.innerHTML = '';
    STICKERS.forEach(name => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-light border p-1';
        btn.title = name;
        btn.style.width = '64px';
        btn.style.height = '64px';
        const img = document.createElement('img');
        img.src = stickerImgUrl(name);
        img.alt = name;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        btn.appendChild(img);
        btn.addEventListener('click', () => awardSticker(studentId, name));
        grid.appendChild(btn);
    });

    renderAwardedStickers(studentId);
    getModal('stickerModal').show();
}

function renderAwardedStickers(studentId) {
    const wrap = document.getElementById('stickerAwardedList');
    wrap.innerHTML = '';
    const awarded = allStickers[studentId] || [];
    if (awarded.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-muted small mb-0';
        p.textContent = 'None yet.';
        wrap.appendChild(p);
        return;
    }
    awarded.forEach(a => {
        const chip = document.createElement('span');
        chip.className = 'badge bg-white text-dark border d-flex align-items-center gap-1 p-2';
        const img = document.createElement('img');
        img.src = stickerImgUrl(a.sticker_name);
        img.alt = a.sticker_name;
        img.style.width = '24px';
        img.style.height = '24px';
        img.style.objectFit = 'contain';
        const label = document.createElement('span');
        label.textContent = a.sticker_name;
        const removeIcon = document.createElement('i');
        removeIcon.className = 'fas fa-xmark ms-1';
        removeIcon.style.cursor = 'pointer';
        removeIcon.addEventListener('click', () => removeSticker(a.id, studentId));
        chip.append(img, label, removeIcon);
        wrap.appendChild(chip);
    });
}

async function awardSticker(studentId, stickerName) {
    try {
        const res = await fetch('/api/admin/award-sticker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, sticker_name: stickerName })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to award sticker');
        if (!allStickers[studentId]) allStickers[studentId] = [];
        allStickers[studentId].unshift({ id: data.id, student_id: studentId, sticker_name: stickerName, awarded_at: new Date().toISOString() });
        renderAwardedStickers(studentId);
        applyFiltersAndRender();
    } catch (e) {
        alert('Failed to award sticker: ' + e.message);
    }
}

async function removeSticker(id, studentId) {
    try {
        const res = await fetch('/api/admin/remove-sticker', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to remove sticker');
        allStickers[studentId] = (allStickers[studentId] || []).filter(a => a.id !== id);
        renderAwardedStickers(studentId);
        applyFiltersAndRender();
    } catch (e) {
        alert('Failed to remove sticker: ' + e.message);
    }
}

const getModal = (id) => bootstrap.Modal.getInstance(document.getElementById(id)) || new bootstrap.Modal(document.getElementById(id));

// ========================================================
// 2. DATA LOADING & RENDERING
// ========================================================

// Resolves which single course a view is scoped to, if any — 'All-CS' or a
// specific CS period both resolve to 'CS'. Returns null for the unfiltered
// 'All' view, where there's no single course to weight everyone against.
function getViewCourseKey(periodVal) {
    if (!periodVal || periodVal === 'All') return null;
    if (periodVal.startsWith('All-')) return periodVal.slice(4);
    return periodToCourseKey(periodVal);
}

// A student matches a course/period filter either through their primary
// period or through an additional (non-primary) section — e.g. a CS-primary
// student who's also enrolled in Intervention or a second real class should
// still show up, correctly weighted, when that other course's gradebook is
// filtered. matchedPeriod records which period actually qualified them so
// period-specific due dates/exemptions use the right one for this view.
function getFilteredStudents(periodVal, studentVal) {
    let filtered = allStudents.map(s => ({ ...s, matchedPeriod: s.period }));

    if (periodVal !== 'All') {
        const groupPrefix = periodVal.startsWith('All-') ? periodVal.slice(4) : null;

        filtered = filtered.filter(s => {
            if (groupPrefix ? periodGroupPrefix(s.period) === groupPrefix : s.period === periodVal) {
                return true;
            }
            const extraMatch = (s.additional_sections || []).find(a =>
                groupPrefix ? periodGroupPrefix(a.section_id) === groupPrefix : a.section_id === periodVal
            );
            if (extraMatch) { s.matchedPeriod = extraMatch.section_id; return true; }
            return false;
        });
    }

    if (studentVal && studentVal !== 'All') filtered = filtered.filter(s => s.studentId === studentVal);
    return filtered;
}

function updateStudentDropdown(filteredStudents) {
    const select = document.getElementById('studentFilter');
    if (!select) return;
    select.innerHTML = '<option value="All">All Students in View</option>';
    sortStudentsArray([...filteredStudents]).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.studentId;
        opt.textContent = `${s.lastName}, ${s.firstName} (${s.period})`;
        select.appendChild(opt);
    });
}

function updatePeriodDropdown() {
    const select = document.getElementById('periodFilter');
    if (!select) return;
    
    const currentVal = select.value;
    
    // Include periods a student only has as an additional (non-primary)
    // section too — e.g. Intervention, if nobody has it as their primary
    // class — so it's still selectable as its own filter.
    const allPeriods = allStudents.flatMap(s => [s.period, ...(s.additional_sections || []).map(a => a.section_id)]);
    const periods = [...new Set(allPeriods)]
        .filter(p => p && p !== 'Teacher' && p !== 'Unassigned')
        .sort();

    let html = '<option value="All">All Periods</option>';

    if (periods.length === 0) {
        select.innerHTML = html;
        select.value = 'All';
        return;
    }

    const groupedPeriods = {};
    periods.forEach(p => {
        const prefix = periodGroupPrefix(p);
        if (!groupedPeriods[prefix]) groupedPeriods[prefix] = [];
        groupedPeriods[prefix].push(p);
    });

    const courseNames = {
        'WD1': 'Web Design 1',
        'WD2': 'Web Design 2',
        'CS': 'Computer Science',
        'AS': 'Advanced Studies',
        'INTV': 'Intervention'
    };

    Object.keys(groupedPeriods).sort().forEach(prefix => {
        const name = courseNames[prefix] || prefix;
        html += `<option value="All-${prefix}">All ${name}</option>`;
    });

    Object.keys(groupedPeriods).sort().forEach(prefix => {
        const name = courseNames[prefix] || prefix;
        html += `<optgroup label="${name}">`;
        groupedPeriods[prefix].forEach(p => {
            html += `<option value="${p}">${p}</option>`;
        });
        html += `</optgroup>`;
    });

    select.innerHTML = html;

    if ([...select.options].some(opt => opt.value === currentVal)) {
        select.value = currentVal;
    } else {
        select.value = 'All';
    }
}

function applyFiltersAndRender() {
    const periodVal = document.getElementById('periodFilter')?.value || 'All';
    const studentVal = document.getElementById('studentFilter')?.value || 'All';
    if (!periodVal || periodVal.includes('Select')) {
        document.getElementById('gradebookBody').innerHTML = '<tr><td colspan="100%" class="text-center p-5 text-muted"><h4>No Class Selected</h4></td></tr>';
        return;
    }
    renderGradebook(getFilteredStudents(periodVal, studentVal), allGrades, periodVal);
}

window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || (user.role !== 'admin' && user.section_id !== 'Teacher' && !user.username?.includes('damiller'))) {
        window.location.replace("/login-test.html");
        return;
    }
    
    injectModals();
    loadData();

    document.getElementById('periodFilter')?.addEventListener('change', (e) => {
        document.getElementById('studentFilter').value = 'All';
        updateStudentDropdown(getFilteredStudents(e.target.value, 'All'));
        applyFiltersAndRender();
    });

    document.getElementById('studentFilter')?.addEventListener('change', applyFiltersAndRender);

    document.getElementById('markEnteredIcBtn')?.addEventListener('click', markEnteredIcForCurrentView);
});

// Scoped to the period filter only (not the individual-student filter) --
// "All" periods clears every blue "needs entering in IC" cell in the
// gradebook, a specific period only clears that period's.
async function markEnteredIcForCurrentView() {
    const periodVal = document.getElementById('periodFilter')?.value || 'All';
    const students = getFilteredStudents(periodVal, 'All');
    const pairs = [];
    students.forEach(s => {
        const sGrades = allGrades[s.studentId] || {};
        Object.entries(sGrades).forEach(([examId, g]) => {
            if (g && typeof g === 'object' && g.score !== '' && g.score !== undefined && g.score !== null && !g.enteredIC) {
                pairs.push({ student_id: s.studentId, exam_id: examId });
            }
        });
    });

    if (pairs.length === 0) {
        alert('No new grades to mark — nothing currently needs entering into IC in this view.');
        return;
    }
    if (!confirm(`Mark ${pairs.length} grade(s) as entered in IC${periodVal !== 'All' ? ` for ${periodVal}` : ''}?`)) return;

    const btn = document.getElementById('markEnteredIcBtn');
    btn.disabled = true;
    try {
        const res = await fetch('/api/admin/mark-grades-entered-ic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pairs })
        });
        if (!res.ok) throw new Error();
        pairs.forEach(p => { allGrades[p.student_id][p.exam_id].enteredIC = true; });
        applyFiltersAndRender();
    } catch (e) {
        alert('Failed to mark grades as entered. Try again.');
    } finally {
        btn.disabled = false;
    }
}

async function loadData() {
    try {
        const response = await fetch('/api/admin/master-gradebook-data');
        if (!response.ok) {
            throw new Error(`Failed to fetch gradebook data. HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data || typeof data !== 'object') {
            throw new Error('Malformed API payload: expected an object response.');
        }

        const studentsRaw = Array.isArray(data.students) ? data.students : [];
        const assignmentsRaw = data.assignments;
        const gradesRaw = data.grades;

        allStudents = studentsRaw.map(d => ({
            ...d,
            studentId: d.student_id,
            displaySchoolId: d.student_id,
            period: d.section_id,
            firstName: d.first_name,
            lastName: d.last_name,
            username: d.username
        })).filter(s => s.period !== "Teacher");
        
        updatePeriodDropdown();
        updateStudentDropdown(allStudents);

        calendarConfig = data.calendarConfig || null;

        allAssignments = {};
        if (assignmentsRaw && typeof assignmentsRaw === 'object' && !Array.isArray(assignmentsRaw)) {
            allAssignments = assignmentsRaw;
        } else if (Array.isArray(assignmentsRaw)) {
            assignmentsRaw.forEach(e => {
                allAssignments[e.exam_id] = {
                    maxPoints: e.total_points,
                    dueDate: e.due_date || '',
                    instructions: e.instructions || '',
                    targetCourse: e.course_id || 'All',
                    periodDueDates: e.period_due_dates ? (typeof e.period_due_dates === 'string' ? JSON.parse(e.period_due_dates) : e.period_due_dates) : {}
                };
            });
        }

        allGrades = {};
        if (gradesRaw && typeof gradesRaw === 'object' && !Array.isArray(gradesRaw)) {
            allGrades = gradesRaw;
        } else if (Array.isArray(gradesRaw)) {
            gradesRaw.forEach(g => {
                if (!allGrades[g.student_id]) {
                    allGrades[g.student_id] = {};
                }
                allGrades[g.student_id][g.exam_id] = {
                    score: g.score,
                    max: g.total_points,
                    timestamp: g.timestamp,
                    enteredIC: !!g.entered_in_ic
                };
            });
        }

        try {
            const stickerRes = await fetch('/api/admin/stickers');
            if (stickerRes.ok) {
                const stickerData = await stickerRes.json();
                allStickers = {};
                (stickerData.stickers || []).forEach(row => {
                    if (!allStickers[row.student_id]) allStickers[row.student_id] = [];
                    allStickers[row.student_id].push(row);
                });
            }
        } catch (e) { console.error('Failed to load stickers', e); }

        applyFiltersAndRender();
    } catch (e) {
        console.error(e);
        document.getElementById('gradebookBody').innerHTML = '<tr><td colspan="100%" class="text-center p-5 text-danger"><h4>Failed to load MariaDB Server Data</h4></td></tr>';
    }
}

// SMART CALENDAR EXCEPTION CHECKER FOR TIMECLOCK
function isStudentScheduledOn(periodStr, dateStr) {
    if (!calendarConfig) return true;
    if (!periodStr) return false;
    const now = new Date();
    const [m, d] = dateStr.split('/');
    let targetDate = new Date(now.getFullYear(), parseInt(m) - 1, parseInt(d));
    const fullDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    if (calendarConfig.dates && typeof calendarConfig.dates === 'object') {
        let dayType = null;
        if (calendarConfig.dates.A?.includes(fullDateStr)) dayType = 'A';
        else if (calendarConfig.dates.B?.includes(fullDateStr)) dayType = 'B';
        else if (calendarConfig.dates.A_MIN?.includes(fullDateStr)) dayType = 'A_MIN';
        else if (calendarConfig.dates.B_MIN?.includes(fullDateStr)) dayType = 'B_MIN';
        
        if (!dayType) return false; 
        const block = periodStr.includes('-') ? periodStr.split('-').pop() : periodStr;
        if (dayType.startsWith('A') && block.startsWith("B")) return false;
        if (dayType.startsWith('B') && block.startsWith("A")) return false;
        return true;
    }
    return true;
}

function parseAssignmentInfo(name) {
    const ptsMatch = name.match(/[\[\(](\d+)\s*pts?[\]\)]/i);
    if (ptsMatch) return { maxPoints: parseInt(ptsMatch[1], 10) };

    const lowerName = name.toLowerCase();
    if (lowerName.includes('pre-test') || lowerName.includes('pretest') || lowerName.includes('diagnostic')) return { maxPoints: 10 };
    if (lowerName.includes('test') || lowerName.includes('exam') || lowerName.includes('summative')) return { maxPoints: 20 };
    if (lowerName.includes('lab') || lowerName.includes('ch ') || lowerName.match(/ch\d+/)) return { maxPoints: 25 };

    return { maxPoints: 100 };
}

function isAssignmentVisible(name, period) {
    if (!period || period === 'All' || period === 'Teacher') return true;

    // Timeclock entries (TC-{courseKey}-{date}) are written to the exams
    // table with a real course_id at creation time (server/routes/
    // timeclock.js), same as every other assignment -- they used to be
    // unconditionally visible in every period regardless of that course_id,
    // which is exactly what leaked a dual-enrolled student's CS check-ins
    // into a Web Design period filter (and vice versa). Falling through to
    // the normal targetCourse check below filters them correctly, and the
    // existing "no targetCourse yet -> visible" fallback further down still
    // covers the case this was originally guarding against (a same-day
    // check-in whose exams-table row hasn't been created yet).

    // Map backend relational course codes to frontend shorthand prefixes
    const courseMap = {
        '05254G1S': 'WD1',
        '05254G2S': 'WD2',
        '10003GS': 'CS',
        '05254ES': 'AS',
        '99999999': 'Teacher'
    };
    
    const rawTarget = allAssignments[name]?.targetCourse;
    if (!rawTarget || rawTarget === 'All') return true;
    
    const resolvedTarget = courseMap[rawTarget] || rawTarget;
    
    // Handle All-[Course] filtering (e.g., 'All-WD1' matches 'WD1')
    if (period.startsWith('All-')) {
        const prefix = period.split('-')[1];
        return resolvedTarget === prefix;
    }

    // period is a specific period code (e.g. "A5", "B2", or a legacy "WD1-A1")
    return periodGroupPrefix(period) === resolvedTarget;
}

function abbreviateAssignmentName(name) {
    let abbr = name.replace(/\s*[\[\(]\d+\s*pts?[\]\)]/i, '').trim();
    if (abbr.toUpperCase().startsWith('TC-')) return abbr;
    
    abbr = abbr.replace(/Chapter\s*(\d+)/i, 'Ch$1')
               .replace(/Unit\s*(\d+)/i, 'Unit$1')
               .replace(':', '-');
               
    abbr = abbr.replace(/\b(Summative|Formative|Assessment|Assignment)\b/ig, '').replace(/Lab\s*/i, 'Ch ').trim();
    
    if (!abbr.includes('-') && abbr.includes(' ')) {
        abbr = abbr.replace(' ', '-');
    }
    
    if (abbr.includes('-')) {
        let parts = abbr.split('-');
        let prefix = parts[0].trim();
        let suffixWords = parts.slice(1).join('-').trim().replace(/['"()\[\]]/g, '').split(/[\s\/]+/); 
        
        if (suffixWords.length > 1 && suffixWords[0].toLowerCase() === 'the') {
            suffixWords.shift();
        }
        
        if (suffixWords.length > 0 && suffixWords[0].length > 0) abbr = prefix + '-' + suffixWords[0];
        else abbr = prefix;
    }
    return abbr.replace(/\s+/g, ' ').replace(/--+/g, '-').replace(/-+$/, '').trim();
}

function resolveDueDate(key, periodFilterVal) {
    window.earliestSubmissions = {};
    allStudents.forEach(s => {
        const sGrades = allGrades[s.studentId] || {};
        Object.keys(sGrades).forEach(k => {
            if (sGrades[k]?.timestamp) {
                const d = new Date(sGrades[k].timestamp);
                if (!isNaN(d.getTime())) {
                    const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    if (!window.earliestSubmissions[k]) window.earliestSubmissions[k] = {};
                    if (!window.earliestSubmissions[k][s.period] || dStr < window.earliestSubmissions[k][s.period]) window.earliestSubmissions[k][s.period] = dStr;
                    if (!window.earliestSubmissions[k].global || dStr < window.earliestSubmissions[k].global) window.earliestSubmissions[k].global = dStr;
                }
            }
        });
    });

    const reg = allAssignments[key];
    if (periodFilterVal !== 'All' && !periodFilterVal.startsWith('All-') && reg?.periodDueDates?.[periodFilterVal]) return reg.periodDueDates[periodFilterVal];
    return reg?.dueDate || window.earliestSubmissions[key]?.global || '';
}

function renderGradebook(students, grades, currentPeriod) {
    const thead = document.getElementById('gradebookHead');
    const tbody = document.getElementById('gradebookBody');
    const assignmentMap = new Map();
    const seenCleanKeys = new Set();

    Object.keys(allAssignments).forEach(key => {
        // "-Score" entries hold the raw accuracy behind a flat completion
        // credit (e.g. diagnostic performance behind "Unit3-Pre"'s 15/15).
        // They're shown as a tooltip on the real column, not their own column.
        if (key.endsWith('-Score')) return;
        if(key !== 'lastSubmitDate' && isAssignmentVisible(key, currentPeriod)) {
            const ck = cleanKey(key);
            if (!seenCleanKeys.has(ck)) {
                seenCleanKeys.add(ck);
                const storedMax = allAssignments[key].maxPoints;
                const info = { ...parseAssignmentInfo(key), dueDate: resolveDueDate(key, currentPeriod), instructions: allAssignments[key].instructions || '' };
                if (storedMax !== undefined && storedMax !== null) info.maxPoints = storedMax;
                assignmentMap.set(key, info);
            }
        }
    });

    students.forEach(s => {
        const sGrades = grades[s.studentId] || {};
        Object.keys(sGrades).forEach(key => {
            if (key.endsWith('-Score')) return;
            if(key !== 'lastSubmitDate' && isAssignmentVisible(key, currentPeriod)) {
                const ck = cleanKey(key);
                if (!seenCleanKeys.has(ck)) {
                    seenCleanKeys.add(ck);
                    const storedMax = allAssignments[key]?.maxPoints ?? sGrades[key]?.max;
                    const info = { ...parseAssignmentInfo(key), dueDate: resolveDueDate(key, currentPeriod), instructions: '' };
                    if (storedMax !== undefined && storedMax !== null) info.maxPoints = storedMax;
                    assignmentMap.set(key, info);
                }
            }
        });
    });

    // Assignment column sort/filter — Due Date, Weight (category, e.g. Final
    // outweighs a regular Assignment), or Alphabetical, each forward/backward.
    // "Weight" uses the active view's course when filtered; falls back to CS
    // for an unfiltered/mixed view, since it's just an ordering aid there.
    const sortCourseKey = getViewCourseKey(currentPeriod) || 'CS';
    const sortWeights = COURSE_WEIGHTS[sortCourseKey] || COURSE_WEIGHTS.CS;
    const sortedKeys = Array.from(assignmentMap.keys()).sort((a, b) => {
        let cmp;
        if (assignmentSortMode === 'weight') {
            const wA = sortWeights[getAssignmentCategory(a, sortCourseKey)] || 0;
            const wB = sortWeights[getAssignmentCategory(b, sortCourseKey)] || 0;
            cmp = wB - wA || a.localeCompare(b);
        } else if (assignmentSortMode === 'alpha') {
            cmp = a.localeCompare(b);
        } else {
            cmp = (assignmentMap.get(a).dueDate || '9999').localeCompare(assignmentMap.get(b).dueDate || '9999') || a.localeCompare(b);
        }
        return assignmentSortDir === 'desc' ? -cmp : cmp;
    });
    let headHtml = '<tr><th class="sticky-corner px-2 pb-2">';
    const privacyIcon = privacyMode ? "fa-user-secret" : "fa-eye";
    headHtml += `<div class="d-flex justify-content-between align-items-center mb-1">Student Info<button id="btnTogglePrivacy" class="btn btn-sm ${privacyMode?'btn-warning':'btn-outline-light'} py-0 px-2"><i class="fas ${privacyIcon}"></i></button></div></th>`;
    
    if (showSummaryColumns) headHtml += '<th class="header-summary">Points</th><th class="header-summary">Possible</th><th class="header-summary">Weighted %</th><th class="header-summary border-right-heavy">Grade</th>';
    headHtml += '<th class="header-summary border-right-heavy">Stickers</th>';

    sortedKeys.forEach((key, i) => {
        const info = assignmentMap.get(key);
        let tooltip = `${key}${info.dueDate ? ' | Due: ' + info.dueDate : ''}${info.instructions ? ' | ' + info.instructions : ''}`;
        // Copy Scores: unit tests only (Unit1-Exam, Unit2-Exam, ...) -- for
        // pulling just that one column's scores, in gradebook row order,
        // into whatever format the district/admin wants them reported in,
        // without copying the whole gradebook.
        const isUnitExam = /^Unit\d+-Exam$/i.test(key);
        const copyBtn = isUnitExam
            ? `<i class="fas fa-copy text-white-50 x-small copy-scores-btn" data-assignment="${key}" title="Copy scores for this test, in gradebook order"></i>`
            : '';
        headHtml += `<th class="header-main-blue" data-col-index="${i}"><div class="h-100 d-flex flex-column align-items-center justify-content-end pb-2">
            <span class="vertical-text analytics-trigger text-white fw-bold" title="${tooltip.replace(/"/g, "'")}" data-assignment="${key}">${abbreviateAssignmentName(key)}</span>
            <div class="d-flex gap-1 justify-content-center w-100">${copyBtn}<i class="fas fa-edit text-white-50 x-small edit-col-btn" data-assignment="${key}"></i><i class="fas fa-trash-alt text-white-50 x-small delete-col-btn" data-assignment="${key}"></i></div></div></th>`;
    });
    thead.innerHTML = headHtml + '</tr>';

    let html = '<tr class="calc-row"><td class="sticky-col p-2 bg-light text-dark fw-bold border-bottom" style="font-size: 0.8rem;"><i class="fas fa-calendar-day text-warning me-1"></i> Due Date</td>';
    if(showSummaryColumns) html += `<td colspan="4" class="bg-light border-bottom text-center text-muted border-right-heavy">-</td>`;
    html += `<td class="bg-light border-bottom border-right-heavy">-</td>`;
    sortedKeys.forEach(key => {
        const info = assignmentMap.get(key);
        let dateText = '-';
        if (info.dueDate) {
            const cleanDate = info.dueDate.split('T')[0].split(' ')[0];
            const [y, m, d] = cleanDate.split('-');
            if (m && d) {
                dateText = `${parseInt(m)}/${parseInt(d)}`;
            }
        }
        html += `<td class="calc-val bg-light text-muted fw-bold border-bottom text-center" style="font-size:0.75rem;">${dateText}</td>`; 
    });
    html += '</tr>';

    const averages = sortedKeys.map(key => {
        const info = assignmentMap.get(key);
        let sum = 0, count = 0;
        students.forEach(s => {
            const g = grades[s.studentId]?.[Object.keys(grades[s.studentId]||{}).find(k=>cleanKey(k)===cleanKey(key))];
            const score = g ? (typeof g === 'object' ? g.score : g) : "";
            if (score !== "" && score !== "EX" && !isNaN(Number(score))) { sum += Number(score); count++; }
        });
        return { avg: count > 0 ? (sum / count).toFixed(1) : '-', max: info.maxPoints };
    });

    html += '<tr class="calc-row"><td class="sticky-col p-2 bg-light text-dark fw-bold border-bottom">Possible Points</td>';
    if(showSummaryColumns) html += `<td colspan="4" class="bg-light border-bottom text-center text-muted border-right-heavy">-</td>`;
    html += `<td class="bg-light border-bottom border-right-heavy">-</td>`;
    averages.forEach(a => html += `<td class="calc-val bg-light text-dark fw-bold border-bottom text-center">${a.max}</td>`);
    html += '</tr>';

    html += '<tr class="calc-row"><td class="sticky-col p-2 bg-secondary text-white fw-bold">Class Average</td>';
    if(showSummaryColumns) html += `<td colspan="4" class="bg-secondary border-bottom text-center text-white-50 border-right-heavy">-</td>`;
    html += `<td class="bg-secondary border-right-heavy">-</td>`;
    averages.forEach(a => html += `<td class="calc-val bg-secondary text-white fw-bold text-center">${a.avg}</td>`);
    html += '</tr>';

    // Viewing a grouped course (e.g. "All Comp Sci") clusters students by
    // period with a header row between each, regardless of the Sort dropdown —
    // otherwise "All CS" just interleaves every period's students together.
    const isGroupedView = currentPeriod.startsWith('All-');
    // Grouped views always need students clustered by period (the group
    // header rows assume contiguous same-period blocks), but should still
    // respect whichever last/first-name choice is selected as the tiebreaker
    // within each period, instead of hardcoding it.
    let orderedStudents;
    if (isGroupedView) {
        const byFirst = currentSortMode === 'firstName' || currentSortMode === 'periodFirst';
        orderedStudents = [...students].sort((a, b) => {
            const periodCmp = (a.matchedPeriod || a.period || '').localeCompare(b.matchedPeriod || b.period || '');
            if (periodCmp !== 0) return periodCmp;
            return byFirst
                ? (a.firstName || '').localeCompare(b.firstName || '')
                : (a.lastName || '').localeCompare(b.lastName || '');
        });
    } else {
        orderedStudents = sortStudentsArray(students);
    }
    let lastGroupPeriod = null;
    // When a specific course's gradebook is filtered (e.g. "All Comp Sci" or
    // a single CS period), every student in the list — whether it's their
    // primary class or an additional one — gets weighted using THAT course's
    // scheme and only counts assignments belonging to it (sortedKeys is
    // already scoped to the active view via isAssignmentVisible). Only the
    // unfiltered "All" view falls back to each student's own primary course.
    const viewCourseKey = getViewCourseKey(currentPeriod);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    orderedStudents.forEach((s, rowIndex) => {
        const displayPeriod = s.matchedPeriod || s.period;
        if (isGroupedView && displayPeriod !== lastGroupPeriod) {
            lastGroupPeriod = displayPeriod;
            html += `<tr class="table-primary"><td colspan="100%" class="fw-bold py-2 px-3"><i class="fas fa-users me-2"></i>Period ${escapeHtml(displayPeriod || 'Unassigned')}</td></tr>`;
        }

        const sGrades = grades[s.studentId] || {};
        // Only honor the view's course as an override if it's a real graded
        // course (has its own weight scheme) — a view like "All Intervention"
        // mixes students from different real courses, so each still needs
        // their own primary course's weights, not a shared one.
        const courseKey = (viewCourseKey && COURSE_WEIGHTS[viewCourseKey]) ? viewCourseKey : (periodToCourseKey(s.period) || 'CS');

        // Alternating row background for better readability
        const rowBgClass = rowIndex % 2 === 0 ? 'bg-white' : 'bg-light';
        
        let earned = 0, possible = 0, catEarned = {assignment:0, project_quiz:0, final:0, career:0}, catPossible = {assignment:0, project_quiz:0, final:0, career:0};

        sortedKeys.forEach(key => {
            // CS-only mastery exemption: 80%+ on a unit's exam exempts that
            // unit's Pre-Test and Pre-Scale. Mirrors js/student/dashboard.js.
            if (courseKey === 'CS') {
                const unitMatch = key.match(/^Unit(\d+)(?:-Pre|\s+Pre-Scale)$/);
                if (unitMatch) {
                    const examKey = `Unit${unitMatch[1]}-Exam`;
                    const examFuzzy = Object.keys(sGrades).find(k => cleanKey(k) === cleanKey(examKey));
                    const examEntry = examFuzzy ? sGrades[examFuzzy] : null;
                    const examScore = examEntry ? (typeof examEntry === 'object' ? examEntry.score : examEntry) : null;
                    const examMax = (examEntry && typeof examEntry === 'object' && examEntry.max) ? Number(examEntry.max) : allAssignments[examKey]?.maxPoints;
                    if (examScore !== null && examScore !== undefined && examScore !== '' && examMax
                        && (Number(examScore) / examMax) >= 0.80) {
                        return;
                    }
                }
            }

            const fuzzyKey = Object.keys(sGrades).find(k => cleanKey(k) === cleanKey(key));
            const g = fuzzyKey ? sGrades[fuzzyKey] : null;
            const score = g ? (typeof g === 'object' ? g.score : g) : "";

            // Period-specific exemption check: If assignment has period due dates, and student's period has no due date, and student is ungraded
            const reg = allAssignments[key];
            const hasPeriodDueDates = reg?.periodDueDates && Object.values(reg.periodDueDates).some(d => d);
            const studentPeriodDueDate = reg?.periodDueDates?.[displayPeriod];
            const isPeriodExempt = hasPeriodDueDates && !studentPeriodDueDate && (score === "" || score === undefined);
            if (isPeriodExempt) return;

            const hasScore = score !== undefined && score !== null && score !== "" && score !== "EX";
            if (!hasScore) {
                // Ungraded — only count it as a missed zero once its due date
                // has actually passed, so students aren't dinged for work
                // that isn't due yet. Matches js/student/dashboard.js.
                const effectiveDueDate = studentPeriodDueDate || reg?.dueDate;
                const isPastDue = !!effectiveDueDate && new Date(effectiveDueDate + 'T00:00:00') < today;
                if (!isPastDue) return;
            }

            const num = hasScore ? Number(score) : 0;
            const max = (g && typeof g === 'object' && g.max) ? Number(g.max) : assignmentMap.get(key).maxPoints;
            earned += num; possible += max;
            const cat = getAssignmentCategory(key, courseKey);
            catEarned[cat] += num; catPossible[cat] += max;
        });

        const weights = COURSE_WEIGHTS[courseKey];
        let weighted = 0, weightSum = 0;
        Object.keys(catPossible).forEach(cat => { if(catPossible[cat]>0 && weights[cat] > 0){ weighted += (catEarned[cat]/catPossible[cat])*weights[cat]; weightSum += weights[cat]; }});
        let pct = weightSum > 0 ? Math.round((weighted/weightSum)*100) : (possible > 0 ? Math.round((earned/possible)*100) : 0);
        let letter = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

// Alternating row background - gray/white pattern for readability
        const rowClass = rowIndex % 2 === 0 ? 'gradebook-row-even' : 'gradebook-row-odd';
const cellClass = rowIndex % 2 === 0 ? 'gradebook-cell-even' : 'gradebook-cell-odd';
        html += `<tr class="${rowClass}"><td class="sticky-col student-info-cell p-2 ${cellClass}" data-student-id="${s.studentId}" data-student-name="${escapeHtml(`${s.firstName} ${s.lastName}`)}" data-current-period="${escapeHtml(displayPeriod || '')}" title="Right-click for options"><div><span class="fw-bold">${privacyMode?`Student ${rowIndex+1}`:`${s.lastName.toUpperCase()}, ${s.firstName}`}</span><div class="id-cell">${privacyMode?'HIDDEN':s.displaySchoolId} | ${displayPeriod}</div></div></td>`;
// Summary cells match row background
        if (showSummaryColumns) html += `<td class="text-center ${cellClass}">${earned}</td><td class="text-center ${cellClass}">${possible}</td><td class="text-center ${cellClass} text-primary fw-bold">${pct}%</td><td class="text-center border-right-heavy fw-bold ${cellClass}">${letter}</td>`;

        const stickerCount = (allStickers[s.studentId] || []).length;
        html += `<td class="text-center border-right-heavy ${cellClass}"><button type="button" class="btn btn-sm btn-outline-warning award-sticker-btn" data-student-id="${s.studentId}" title="Award a sticker">
            <i class="fas fa-star"></i>${stickerCount > 0 ? ` ${stickerCount}` : ''}</button></td>`;

        sortedKeys.forEach((key, colIndex) => {
            const fuzzyKey = Object.keys(sGrades).find(k => cleanKey(k) === cleanKey(key));
            const g = fuzzyKey ? sGrades[fuzzyKey] : null;
            const info = assignmentMap.get(key);
let score = "", display = '', bg = "";
            
            // Period-specific exemption check
            const reg = allAssignments[key];
            const hasPeriodDueDates = reg?.periodDueDates && Object.values(reg.periodDueDates).some(d => d);
            const studentPeriodDueDate = reg?.periodDueDates?.[displayPeriod];
            const isPeriodExempt = hasPeriodDueDates && !studentPeriodDueDate;

            if (g) {
                score = typeof g === 'object' ? g.score : g;
                if (score === "EX") display = '<span class="badge bg-secondary px-1 text-white shadow-sm">EX</span>';
                else {
                    display = (Number(score) === info.maxPoints) ? '<span class="check-mark">✔</span>' : score;
                    const pct = Number(score) / info.maxPoints;
                    // Only exams get a score-based color: red under 60%,
                    // orange 60-70%, yellow 70-80%, nothing at 80%+ (also the
                    // mastery threshold that exempts a unit's chapter
                    // classwork). Matches "Exam" in either course's naming
                    // convention (Unit1-Exam, Final-Exam, WD-Ch1-Exam, ...).
                    // Every other assignment type (Pre-Test, Pre-Scale,
                    // classwork, worksheets...) gets no score-based
                    // highlight at all -- there used to be a flat "below 80%"
                    // yellow applied here regardless of assignment type,
                    // which is exactly what made some Unit#-Pre cells turn
                    // color for no reason anyone could explain from the
                    // score alone.
                    if (/Exam/i.test(key)) {
                        if (pct < 0.60) bg = "background-color: rgb(240, 155, 155);";
                        else if (pct < 0.70) bg = "background-color: rgb(245, 191, 137);";
                        else if (pct < 0.80) bg = "background-color: #FFF2CC;";
                    }
                    // A new/updated score not yet copied into IC takes visual
                    // priority over the low-score highlight above -- once
                    // marked entered, the cell falls back to whatever bg (if
                    // any) it would've had otherwise. Blue on purpose: red,
                    // orange, and yellow are all reserved for exam score
                    // quality now, and this is an unrelated workflow signal
                    // ("needs copying into IC"), not a score-quality one --
                    // reusing yellow here is exactly what made it ambiguous
                    // with the new 70-80% exam tier.
                    if (score !== "" && typeof g === 'object' && !g.enteredIC) bg = "background-color: rgb(174, 214, 241);";
                }
            } else {
                if (isPeriodExempt) {
                    display = '<span class="badge bg-secondary px-1 text-white shadow-sm">EX</span>';
                } else {
                    let isTC = key.match(/TC-(?:In|Out)\s+(\d{1,2}\/\d{1,2})/i);
                    if (isTC && !isStudentScheduledOn(displayPeriod, isTC[1])) display = '<span class="badge bg-secondary px-1 text-white shadow-sm">EX</span>';
                    else {
                        // CS-only mastery exemption: once a student scores
                        // 80%+ on a unit's exam, that unit's chapter classwork
                        // is exempt -- shown with the same EX badge a teacher
                        // would type manually, so it reads identically to any
                        // other exemption and is obviously safe to skip when
                        // copying grades into IC. Never applies to Pre-Test,
                        // Pre-Scale, or timeclock entries (those aren't
                        // cs_chN_* keys, so the regex below can't match them).
                        const chMatch = key.match(/^cs_ch(\d+)_/);
                        const unit = chMatch ? unitForCsChapter(Number(chMatch[1])) : null;
                        let masteryExempt = false;
                        if (unit) {
                            const examEntry = sGrades[`Unit${unit}-Exam`];
                            const examScore = examEntry ? (typeof examEntry === 'object' ? examEntry.score : examEntry) : null;
                            const examMax = allAssignments[`Unit${unit}-Exam`]?.maxPoints;
                            if (examScore !== null && examScore !== undefined && examScore !== '' && examMax
                                && (Number(examScore) / examMax) >= 0.80) {
                                display = '<span class="badge bg-secondary px-1 text-white shadow-sm">EX</span>';
                                masteryExempt = true;
                            }
                        }
                        // Didn't reach 80% on the unit exam (or hasn't taken
                        // it yet) -- if this chapter assignment's due date has
                        // passed with nothing turned in, flag it the same way
                        // the student's own dashboard already counts it: a
                        // visible MISSING marker instead of a blank cell, so
                        // it's not mistaken for "not due yet" or silently
                        // overlooked at a glance.
                        if (unit && !masteryExempt) {
                            const effectiveDueDate = studentPeriodDueDate || reg?.dueDate;
                            const isPastDue = !!effectiveDueDate && new Date(effectiveDueDate + 'T00:00:00') < today;
                            if (isPastDue) {
                                display = '<span class="text-danger fw-bold" title="Missing">M</span>';
                                // Text color alone was too easy to miss scanning
                                // a full row -- the cell background itself is
                                // now red too.
                                bg = "background-color: rgb(240, 155, 155);";
                            }
                        }
                    }
                }
            }

            // If this cell has a companion raw-accuracy entry ("{key}-Score",
            // e.g. a diagnostic's real performance behind its flat completion
            // credit), surface it as a tooltip and a small on-cell marker.
            let rawScoreAttrs = '';
            const rawKey = Object.keys(sGrades).find(k => cleanKey(k) === cleanKey(key + '-Score'));
            if (rawKey) {
                const raw = sGrades[rawKey];
                const rawScore = typeof raw === 'object' ? raw.score : raw;
                const rawMax = (raw && typeof raw === 'object' && raw.max) ? raw.max : '';
                if (rawScore !== '' && rawScore !== undefined && rawScore !== null) {
                    const rawPct = rawMax ? Math.round((Number(rawScore) / Number(rawMax)) * 100) : '';
                    rawScoreAttrs = ` data-bs-toggle="tooltip" title="Actual score: ${rawScore}${rawMax ? '/' + rawMax : ''}${rawPct !== '' ? ' (' + rawPct + '%)' : ''}"`;
                    display += `<sup class="text-muted ms-1" style="font-size:0.6em;">${rawScore}${rawMax ? '/' + rawMax : ''}</sup>`;
                }
            }

            html += `<td class="grade-cell text-center border-end" style="${bg}"${rawScoreAttrs} data-student-id="${s.studentId}" data-assignment="${key}" data-current-score="${score}" data-current-max="${info.maxPoints}" data-row-index="${rowIndex}" data-col-index="${colIndex}">${display}</td>`;
        });
        html += '</tr>';
    });
    tbody.innerHTML = html;
    stickCalcRows(thead);

    lastOrderedStudents = orderedStudents;
    lastGrades = grades;

    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) { return new bootstrap.Tooltip(tooltipTriggerEl); });
}

// Pins the Due Date / Possible Points / Class Average rows directly beneath
// the sticky assignment-name header, so scrolling only moves student rows.
// Offsets are measured from the actual rendered heights (rather than
// hardcoded) since the header's row height varies with content.
function stickCalcRows(thead) {
    requestAnimationFrame(() => {
        const calcRows = document.querySelectorAll('#gradebookBody tr.calc-row');
        if (!thead || !calcRows.length) return;
        let top = thead.offsetHeight;
        calcRows.forEach((row, i) => {
            const isLast = i === calcRows.length - 1;
            row.querySelectorAll('td').forEach(td => {
                td.style.position = 'sticky';
                td.style.top = top + 'px';
                if (!td.classList.contains('sticky-col')) td.style.zIndex = 9;
                if (isLast) td.style.boxShadow = '0 0.125rem 0.25rem rgba(0,0,0,0.15)';
            });
            top += row.offsetHeight;
        });
    });
}

// ========================================================
// ANALYTICS & MODAL HANDLERS
// ========================================================
window.showAnalytics = function(dbKey, displayLabel) {
    let percents = [];
    let periodData = {};
    const filtered = getFilteredStudents(document.getElementById('periodFilter').value, 'All');

    // Pre-assessments/diagnostics award flat completion credit for taking them
    // (e.g. always 15/15) and store the real diagnostic accuracy separately
    // under a "-Score" companion key. Analytics needs to answer "how much did
    // students already know before this unit," not "who clicked through the
    // quiz" -- so prefer the real "-Score" entry when one exists.
    //
    // Every student's own (score, max) pair comes straight off their actual
    // grade record and its matching exams.total_points -- never a guessed or
    // hardcoded point total. Because a quiz's question count can change over
    // time (older submissions may be out of a different total than newer
    // ones), raw scores from different totals aren't comparable, so each
    // student is normalized to a percentage before averaging -- that's what
    // stays correct "for all tests everywhere" regardless of how many
    // questions a given test currently has.
    filtered.forEach(s => {
        const sGrades = allGrades[s.studentId] || {};
        const fuzzyScoreKey = Object.keys(sGrades).find(k => cleanKey(k) === cleanKey(dbKey + '-Score'));
        const fuzzyKey = fuzzyScoreKey || Object.keys(sGrades).find(k => cleanKey(k) === cleanKey(dbKey));
        const entry = fuzzyKey ? sGrades[fuzzyKey] : null;
        if (!entry || typeof entry !== 'object') return;
        const score = entry.score;
        const entryMax = Number(entry.max) || Number(allAssignments[fuzzyKey]?.maxPoints) || 0;
        if (score === "" || score === undefined || score === "EX" || isNaN(Number(score)) || !entryMax) return;
        const pct = (Number(score) / entryMax) * 100;
        percents.push(pct);
        if (!periodData[s.period]) periodData[s.period] = [];
        periodData[s.period].push(pct);
    });

    if (percents.length === 0) return alert("No scores to analyze.");
    percents.sort((a,b)=>a-b);
    const mean = (percents.reduce((a,b)=>a+b,0)/percents.length).toFixed(1);
    const mid = Math.floor(percents.length / 2);
    const median = (percents.length % 2 !== 0 ? percents[mid] : ((percents[mid-1]+percents[mid])/2)).toFixed(1);
    const pass = Math.round((percents.filter(p=>p>=80).length / percents.length)*100);

    document.getElementById('analyticsModalTitle').innerText = displayLabel;
    document.getElementById('statMean').innerText = mean + '%';
    document.getElementById('statMedian').innerText = median + '%';
    document.getElementById('statPass').innerText = pass + "%";
    document.getElementById('masteryDescription').innerText = `Out of ${percents.length} attempts, ${pass}% reached Mastery (80%+).`;

    const ctx = document.getElementById('periodAnalyticsChart');
    if (window.analyticsChartInstance) window.analyticsChartInstance.destroy();
    window.analyticsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: Object.keys(periodData).sort(), datasets: [{ label: 'Mean %', data: Object.keys(periodData).sort().map(p=>(periodData[p].reduce((a,b)=>a+b,0)/periodData[p].length).toFixed(1)), backgroundColor: 'rgba(54, 162, 235, 0.7)', borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
    });
    getModal('analyticsModal').show();
};

// =========================================
// UNSAVED GRADE CHANGES
// Every cell edit used to POST /api/admin/save-grade the instant you
// tabbed/clicked away -- a typo landed in the real gradebook immediately,
// with no way back (confirmed live: the responses table just gets
// overwritten in place, nothing else keeps the old value). Edits now
// stage locally here and only actually save when Save Changes is
// clicked, so a mistake can be caught and discarded before it's real.
// =========================================
const pendingChanges = new Map(); // `${studentId}::${assignment}` -> { studentId, assignment, newScore, newMax, oldScore, oldMax, cellEl }

function renderGradeCellValue(cell, val, max) {
    if (val === "EX") cell.innerHTML = '<span class="badge bg-secondary px-1 text-white shadow-sm">EX</span>';
    else if (val === "" || val === undefined || val === null) cell.innerHTML = '<span class="text-danger small fw-bold">MISSING</span>';
    else cell.innerHTML = (val == max ? '<span class="check-mark">✔</span>' : val);
}

function updatePendingChangesBar() {
    const bar = document.getElementById('pendingChangesBar');
    const countEl = document.getElementById('pendingChangesCount');
    if (!bar || !countEl) return;
    if (pendingChanges.size === 0) {
        bar.classList.add('d-none');
    } else {
        bar.classList.remove('d-none');
        countEl.textContent = `${pendingChanges.size} unsaved change${pendingChanges.size === 1 ? '' : 's'}`;
    }
}

async function commitPendingChanges() {
    if (pendingChanges.size === 0) return;
    const btn = document.getElementById('savePendingBtn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

    const byStudent = new Map();
    pendingChanges.forEach(ch => {
        if (!byStudent.has(ch.studentId)) byStudent.set(ch.studentId, {});
        byStudent.get(ch.studentId)[ch.assignment] = { score: ch.newScore, max: ch.newMax };
    });
    const batch = [...byStudent.entries()].map(([studentId, updates]) => ({ studentId, updates }));

    try {
        const res = await fetch('/api/admin/batch-update-grades', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch })
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        pendingChanges.forEach(ch => {
            if (!allGrades[ch.studentId]) allGrades[ch.studentId] = {};
            allGrades[ch.studentId][ch.assignment] = { score: ch.newScore, max: ch.newMax, timestamp: new Date().toISOString() };
            ch.cellEl.classList.remove('pending-change');
        });
        pendingChanges.clear();
        updatePendingChangesBar();
        applyFiltersAndRender(); // now safe/worthwhile -- averages etc. should reflect the just-saved data
    } catch (e) {
        console.error('Batch save failed:', e);
        alert("Couldn't save changes -- please try again. Your edits are still here, nothing was lost.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

function discardPendingChanges() {
    if (pendingChanges.size === 0) return;
    if (!confirm(`Discard ${pendingChanges.size} unsaved change${pendingChanges.size === 1 ? '' : 's'}? This cannot be undone.`)) return;
    pendingChanges.forEach(ch => {
        ch.cellEl.classList.remove('pending-change');
        ch.cellEl.dataset.currentScore = ch.oldScore;
        renderGradeCellValue(ch.cellEl, ch.oldScore, ch.oldMax);
    });
    pendingChanges.clear();
    updatePendingChangesBar();
}

document.getElementById('savePendingBtn')?.addEventListener('click', commitPendingChanges);
document.getElementById('discardPendingBtn')?.addEventListener('click', discardPendingChanges);

window.addEventListener('beforeunload', (e) => {
    if (pendingChanges.size > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved grade changes. Leave anyway?';
        return e.returnValue;
    }
});

document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.closest('#btnTogglePrivacy')) { privacyMode = !privacyMode; applyFiltersAndRender(); return; }
    if (target.closest('.analytics-trigger')) { const t = target.closest('.analytics-trigger'); showAnalytics(t.dataset.assignment, t.innerText); return; }
    
    if (target.closest('.copy-scores-btn')) {
        const btn = target.closest('.copy-scores-btn');
        const key = btn.dataset.assignment;
        // Same lookup the Class Average row already uses (fuzzy-matched via
        // cleanKey, since a score can be stored under a slightly different
        // key spelling than the column header) -- keeps "what gets copied"
        // consistent with "what the gradebook already shows as this
        // student's score for this test."
        const scores = lastOrderedStudents.map(s => {
            const sGrades = lastGrades[s.studentId] || {};
            const matchKey = Object.keys(sGrades).find(k => cleanKey(k) === cleanKey(key));
            const g = matchKey ? sGrades[matchKey] : null;
            const score = g ? (typeof g === 'object' ? g.score : g) : '';
            return score === undefined || score === null ? '' : String(score);
        });
        navigator.clipboard.writeText(scores.join('\n')).then(() => {
            const original = btn.className;
            btn.className = 'fas fa-check text-success x-small';
            setTimeout(() => { btn.className = original; }, 1500);
        }).catch(() => alert('Could not copy to clipboard. Try again.'));
        return;
    }

    if (target.closest('.edit-col-btn')) {
        const key = target.closest('.edit-col-btn').dataset.assignment;
        document.getElementById('editColOldName').value = key;
        document.getElementById('editColNewName').value = key.replace(/\s*[\[\(]\d+\s*pts?[\]\)]/i, '');
        document.getElementById('editColNewPts').value = parseAssignmentInfo(key).maxPoints;
        document.getElementById('editColDueDate').value = allAssignments[key]?.dueDate || "";
        document.getElementById('editColInstructions').value = allAssignments[key]?.instructions || "";
        // targetCourse holds the raw DB course_id (e.g. '10003GS'), but the
        // <select>'s <option> values are the short codes ('CS'/'WD1'/...) --
        // setting .value to an unmatched string leaves the <select> with
        // nothing selected, so saving (even without touching this field)
        // silently fell through to the dbCourseMap[''] fallback in
        // saveColEdit() and reassigned the assignment to the wrong course.
        const rawTarget = allAssignments[key]?.targetCourse;
        const courseCodeMap = { '05254G1S': 'WD1', '05254G2S': 'WD2', '10003GS': 'CS', '05254ES': 'AS' };
        document.getElementById('editColCourse').value = courseCodeMap[rawTarget] || rawTarget || 'All';
        renderPeriodDateInputs('editColPeriodDates', allAssignments[key]?.periodDueDates || {}, 'primary');
        getModal('editColModal').show();
        return;
    }
    
    if (target.closest('.delete-col-btn')) {
        const key = target.closest('.delete-col-btn').dataset.assignment;
        document.getElementById('deleteColName').innerText = key;
        document.getElementById('deleteColTarget').value = key;
        getModal('deleteColModal').show();
        return;
    }

    if (target.closest('.award-sticker-btn')) {
        openStickerModal(target.closest('.award-sticker-btn').dataset.studentId);
        return;
    }

    const cell = target.closest('.grade-cell');
    if (cell && !target.classList.contains('inline-edit-input')) {
        if (cell.querySelector('input')) return;
        const studentId = cell.dataset.studentId, assignment = cell.dataset.assignment;
        const currentScore = cell.dataset.currentScore, currentMax = cell.dataset.currentMax;
        const rowIndex = parseInt(cell.dataset.rowIndex), colIndex = parseInt(cell.dataset.colIndex);

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control inline-edit-input text-center fw-bold border-warning shadow-sm';
        input.style.height = '24px';
        input.value = (currentScore === "MISSING" || !currentScore) ? "" : currentScore;
        cell.innerHTML = ''; cell.appendChild(input); input.focus();

        let isSaving = false;
        const save = () => {
            if (isSaving) return; isSaving = true;
            const val = input.value.trim().toUpperCase();
            let final = val === "EX" ? "EX" : (val === "" ? "" : Number(val));
            if (val !== "" && val !== "EX" && isNaN(final)) { cell.innerHTML = currentScore || '<span class="text-danger small fw-bold">MISSING</span>'; return; }

            if (String(final) !== String(currentScore)) {
                // Stage the change locally instead of saving immediately --
                // nothing reaches the real gradebook until Save Changes is
                // clicked, so a typo here is a non-event, not a scare.
                const key = `${studentId}::${assignment}`;
                const existing = pendingChanges.get(key);
                const trueOriginalScore = existing ? existing.oldScore : currentScore;
                const trueOriginalMax = existing ? existing.oldMax : Number(currentMax);

                if (String(final) === String(trueOriginalScore)) {
                    // Edited back to the original value -- no longer a real change
                    pendingChanges.delete(key);
                    cell.classList.remove('pending-change');
                } else {
                    pendingChanges.set(key, {
                        studentId, assignment, newScore: final, newMax: Number(currentMax),
                        oldScore: trueOriginalScore, oldMax: trueOriginalMax, cellEl: cell
                    });
                    cell.classList.add('pending-change');
                }
                cell.dataset.currentScore = final;
                renderGradeCellValue(cell, final, currentMax);
                updatePendingChangesBar();
            } else cell.innerHTML = currentScore || '<span class="text-danger small fw-bold">MISSING</span>';
        };

        const nav = (rd, cd) => {
            const next = document.querySelector(`.grade-cell[data-row-index="${rowIndex + rd}"][data-col-index="${colIndex + cd}"]`);
            if (next) next.click();
        };

        input.onblur = () => save();
        input.onkeydown = (e) => {
            if (e.key === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) { 
                e.preventDefault(); save(); setTimeout(() => nav(1, 0), 40); 
            } else if (e.key === 'Tab') { 
                e.preventDefault(); save(); setTimeout(() => nav(0, e.shiftKey ? -1 : 1), 40); 
            } else if (e.key === 'ArrowDown') { e.preventDefault(); save(); setTimeout(() => nav(1, 0), 40); 
            } else if (e.key === 'ArrowUp') { e.preventDefault(); save(); setTimeout(() => nav(-1, 0), 40); 
            } else if (e.key === 'Escape') { isSaving = true; cell.innerHTML = currentScore || '<span class="text-danger small fw-bold">MISSING</span>'; }
        };
    }
});

async function saveAddCol() {
    const name = document.getElementById('addColName').value.trim();
    const pts = Number(document.getElementById('addColPts').value) || 100;
    const date = document.getElementById('addColDueDate').value;
    const inst = document.getElementById('addColInstructions').value;
    const course = document.getElementById('addColCourse').value;
    
    if (!name) return alert("Name required");
    const finalName = `${name} [${pts} pts]`;
    
    const periodDates = {};
    document.querySelectorAll('#addColPeriodDates .period-due-date-input').forEach(i => periodDates[i.dataset.period] = i.value);
    
    // Map visible track types back to database state code keys to satisfy relational constraints
    const dbCourseMap = {
        'WD1': '05254G1S',
        'WD2': '05254G2S',
        'CS':  '10003GS',
        'AS':  '05254ES',
        'All': '05254G1S'
    };
    const dbCourseId = dbCourseMap[course] || '05254G1S';
    
    try {
        await fetch('/api/admin/save-assignment', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ exam_id: finalName, title: name, total_points: pts, due_date: date || null, instructions: inst, course_id: dbCourseId })
        });
        
        allAssignments[finalName] = { maxPoints: pts, dueDate: date, instructions: inst, targetCourse: dbCourseId, periodDueDates: periodDates };
        applyFiltersAndRender();
        getModal('addColModal').hide();
    } catch (err) { alert("Failed to save new column."); }
}

async function saveColEdit() {
    const old = document.getElementById('editColOldName').value;
    const name = document.getElementById('editColNewName').value.trim();
    const pts = Number(document.getElementById('editColNewPts').value) || 100;
    const date = document.getElementById('editColDueDate').value;
    const final = `${name} [${pts} pts]`;
    const course = document.getElementById('editColCourse').value;
    
    const periodDates = {};
    document.querySelectorAll('#editColPeriodDates .period-due-date-input').forEach(i => periodDates[i.dataset.period] = i.value);
    
    // Map visible track types back to database state code keys to satisfy relational constraints
    const dbCourseMap = {
        'WD1': '05254G1S',
        'WD2': '05254G2S',
        'CS':  '10003GS',
        'AS':  '05254ES',
        'All': '05254G1S'
    };
    const dbCourseId = dbCourseMap[course] || '05254G1S';
    
    try {
        await fetch('/api/admin/edit-assignment', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ old_exam_id: old, exam_id: final, title: name, total_points: pts, due_date: date || null, instructions: document.getElementById('editColInstructions').value, course_id: dbCourseId })
        });
        
        delete allAssignments[old];
        allAssignments[final] = { maxPoints: pts, dueDate: date, periodDueDates: periodDates, instructions: document.getElementById('editColInstructions').value, targetCourse: dbCourseId };
        
        Object.keys(allGrades).forEach(sId => {
            if (allGrades[sId][old]) {
                allGrades[sId][final] = allGrades[sId][old];
                delete allGrades[sId][old];
            }
        });
        
        applyFiltersAndRender();
        getModal('editColModal').hide();
    } catch (err) { alert("Failed to save edits."); }
}

async function confirmDeleteCol() {
    const target = document.getElementById('deleteColTarget').value;
    try {
        await fetch('/api/admin/delete-assignment', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ exam_id: target })
        });
        
        delete allAssignments[target];
        applyFiltersAndRender();
        getModal('deleteColModal').hide();
    } catch (err) { alert("Failed to delete column."); }
}
