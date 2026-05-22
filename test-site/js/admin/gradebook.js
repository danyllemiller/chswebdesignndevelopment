// test-site/js/admin/gradebook.js

/**
 * CHS Web Design - Master Teacher Gradebook Controller (MariaDB Edition)
 * This script powers the administrative gradebook interface, handling real-time MariaDB data synchronization 
 * for student rosters, assignments, and grades. It features a dynamically weighted grading engine based on course type, 
 * period-specific due dates with smart auto-fill from student submissions, automatic calendar-aware exemptions for 
 * timeclock entries, and inline editing for rapid grade entry, all while maintaining strict privacy and sorting controls.
 */

// Dynamically load Chart.js for the Analytics Graph
if (!document.getElementById('chartjs-lib')) {
    const script = document.createElement('script');
    script.id = 'chartjs-lib';
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(script);
}

// ========================================================
// ⚖️ WEIGHTED GRADING CONFIGURATION
// Easily modify these decimals if syllabus weights change!
// ========================================================
const COURSE_WEIGHTS = {
    WD1: { assignment: 0.50, project_quiz: 0.20, final: 0.20, career: 0.10 },
    WD2: { assignment: 0.35, project_quiz: 0.35, final: 0.20, career: 0.10 },
    AS:  { assignment: 0.35, project_quiz: 0.35, final: 0.20, career: 0.10 }, // Map Advanced Studies matching WD2
    CS:  { assignment: 0.60, project_quiz: 0.20, final: 0.20, career: 0.00 } 
};

function getAssignmentCategory(name, courseKey) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.startsWith('tc-') || lowerName.includes('timeclock')) {
        if (courseKey === 'CS') return 'assignment';
        return 'career';
    }
    
    if (lowerName.includes('final')) return 'final';
    if (lowerName.includes('project') || lowerName.includes('quiz') || lowerName.includes('exam') || lowerName.includes('summative') || lowerName.includes('assessment') || lowerName.includes('milestone')) return 'project_quiz';
    return 'assignment';
}

let allStudents = [];
let allGrades = {};
let allAssignments = {}; 
let calendarConfig = null; 
let privacyMode = false; 
let showSummaryColumns = true; 
let currentSortMode = 'lastName'; 
window.earliestSubmissions = {}; 

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
        const aPeriod = a.period || '';
        const bPeriod = b.period || '';

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
        <button type="button" id="btnSyncSheets" class="btn btn-sm btn-warning fw-bold shadow-sm" title="Pull Master Grades from Google Sheet">
            <i class="fas fa-cloud-download-alt me-1"></i> Sync Sheets
        </button>
        <button type="button" id="btnAddAssignment" class="btn btn-sm btn-success fw-bold shadow-sm" title="Manually Add Assignment">
            <i class="fas fa-plus me-1"></i> Assignment
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
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('btnSaveAddCol').addEventListener('click', saveAddCol);
    document.getElementById('btnSaveColEdit').addEventListener('click', saveColEdit);
    document.getElementById('btnConfirmDeleteCol').addEventListener('click', confirmDeleteCol);

    injectControls(); 
}

const getModal = (id) => bootstrap.Modal.getInstance(document.getElementById(id)) || new bootstrap.Modal(document.getElementById(id));

// ========================================================
// 2. DATA LOADING & RENDERING
// ========================================================

function getFilteredStudents(periodVal, studentVal) {
    let filtered = allStudents;
    if (periodVal !== 'All') {
        if (periodVal === 'All-WD1') filtered = filtered.filter(s => s.period.startsWith('WD1'));
        else if (periodVal === 'All-WD2') filtered = filtered.filter(s => s.period.startsWith('WD2'));
        else if (periodVal === 'All-CS') filtered = filtered.filter(s => s.period.startsWith('CS'));
        else if (periodVal === 'All-AS') filtered = filtered.filter(s => s.period.startsWith('AS'));
        else filtered = filtered.filter(s => s.period === periodVal);
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
    
    const periods = [...new Set(allStudents.map(s => s.period))]
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
        const prefix = p.split('-')[0];
        if (!groupedPeriods[prefix]) groupedPeriods[prefix] = [];
        groupedPeriods[prefix].push(p);
    });

    const courseNames = {
        'WD1': 'Web Design 1',
        'WD2': 'Web Design 2',
        'CS': 'Computer Science',
        'AS': 'Advanced Studies'
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
    
    if (!user || (user.role !== 'admin' && user.period !== 'Teacher' && !user.username.includes('damiller'))) {
        window.location.replace("/login-test.html");
        return;
    }
    
    injectModals();
    loadData();
});

async function loadData() {
    try {
        const response = await fetch('/api/admin/master-gradebook-data');
        const data = await response.json();
        
        allStudents = data.students.map(d => ({
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
        if (data.assignments && typeof data.assignments === 'object' && !Array.isArray(data.assignments)) {
            allAssignments = data.assignments;
        } else if (Array.isArray(data.assignments)) {
            data.assignments.forEach(e => {
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
        if (data.grades && typeof data.grades === 'object' && !Array.isArray(data.grades)) {
            allGrades = data.grades;
        } else if (Array.isArray(data.grades)) {
            data.grades.forEach(g => {
                if (!allGrades[g.student_id]) {
                    allGrades[g.student_id] = {};
                }
                allGrades[g.student_id][g.exam_id] = {
                    score: g.score,
                    max: g.total_points,
                    timestamp: g.timestamp
                };
            });
        }

        applyFiltersAndRender();
        
        document.getElementById('periodFilter').addEventListener('change', (e) => {
            document.getElementById('studentFilter').value = 'All';
            updateStudentDropdown(getFilteredStudents(e.target.value, 'All'));
            applyFiltersAndRender();
        });
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

    // Timeclock entries must ALWAYS render for all periods to prevent them from being hidden on filter switches
    if (name.toUpperCase().startsWith('TC-') || name.toLowerCase().includes('timeclock')) {
        return true;
    }
    
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
    
    return period.includes(resolvedTarget);
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

    Object.keys(allAssignments).forEach(key => { 
        if(key !== 'lastSubmitDate' && isAssignmentVisible(key, currentPeriod)) {
            assignmentMap.set(key, { ...parseAssignmentInfo(key), dueDate: resolveDueDate(key, currentPeriod), instructions: allAssignments[key].instructions || '' }); 
        }
    });

    students.forEach(s => {
        const sGrades = grades[s.studentId] || {};
        Object.keys(sGrades).forEach(key => { 
            if(key !== 'lastSubmitDate' && isAssignmentVisible(key, currentPeriod)) {
                const registryKeys = Array.from(assignmentMap.keys());
                const matchingKey = registryKeys.find(rKey => cleanKey(rKey) === cleanKey(key));
                if (!matchingKey) {
                    assignmentMap.set(key, { ...parseAssignmentInfo(key), dueDate: resolveDueDate(key, currentPeriod), instructions: '' }); 
                }
            }
        });
    });

    const sortedKeys = Array.from(assignmentMap.keys()).sort((a, b) => (assignmentMap.get(a).dueDate || '9999').localeCompare(assignmentMap.get(b).dueDate || '9999') || a.localeCompare(b));
    let headHtml = '<tr><th class="sticky-corner px-2 pb-2">';
    const privacyIcon = privacyMode ? "fa-user-secret" : "fa-eye";
    headHtml += `<div class="d-flex justify-content-between align-items-center mb-1">Student Info<button id="btnTogglePrivacy" class="btn btn-sm ${privacyMode?'btn-warning':'btn-outline-light'} py-0 px-2"><i class="fas ${privacyIcon}"></i></button></div></th>`;
    
    if (showSummaryColumns) headHtml += '<th class="header-summary">Points</th><th class="header-summary">Possible</th><th class="header-summary">Weighted %</th><th class="header-summary border-right-heavy">Grade</th>';
    
    sortedKeys.forEach((key, i) => {
        const info = assignmentMap.get(key);
        let tooltip = `${key}${info.dueDate ? ' | Due: ' + info.dueDate : ''}${info.instructions ? ' | ' + info.instructions : ''}`;
        headHtml += `<th class="header-main-blue" data-col-index="${i}"><div class="h-100 d-flex flex-column align-items-center justify-content-end pb-2">
            <span class="vertical-text analytics-trigger text-white fw-bold" title="${tooltip.replace(/"/g, "'")}" data-assignment="${key}">${abbreviateAssignmentName(key)}</span>
            <div class="d-flex gap-1 justify-content-center w-100"><i class="fas fa-edit text-white-50 x-small edit-col-btn" data-assignment="${key}"></i><i class="fas fa-trash-alt text-white-50 x-small delete-col-btn" data-assignment="${key}"></i></div></div></th>`;
    });
    thead.innerHTML = headHtml + '</tr>';

    let html = '<tr class="calc-row"><td class="sticky-col p-2 bg-light text-dark fw-bold border-bottom" style="font-size: 0.8rem;"><i class="fas fa-calendar-day text-warning me-1"></i> Due Date</td>';
    if(showSummaryColumns) html += `<td colspan="4" class="bg-light border-bottom text-center text-muted border-right-heavy">-</td>`;
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
    averages.forEach(a => html += `<td class="calc-val bg-light text-dark fw-bold border-bottom text-center">${a.max}</td>`);
    html += '</tr>';

    html += '<tr class="calc-row"><td class="sticky-col p-2 bg-secondary text-white fw-bold">Class Average</td>';
    if(showSummaryColumns) html += `<td colspan="4" class="bg-secondary border-bottom text-center text-white-50 border-right-heavy">-</td>`;
    averages.forEach(a => html += `<td class="calc-val bg-secondary text-white fw-bold text-center">${a.avg}</td>`);
    html += '</tr>';

    sortStudentsArray(students).forEach((s, rowIndex) => {
        const sGrades = grades[s.studentId] || {};
        const courseKey = s.period.startsWith('WD1') ? 'WD1' : s.period.startsWith('WD2') ? 'WD2' : s.period.startsWith('AS') ? 'AS' : 'CS';
        let earned = 0, possible = 0, catEarned = {assignment:0, project_quiz:0, final:0, career:0}, catPossible = {assignment:0, project_quiz:0, final:0, career:0};

        sortedKeys.forEach(key => {
            const fuzzyKey = Object.keys(sGrades).find(k => cleanKey(k) === cleanKey(key));
            const g = fuzzyKey ? sGrades[fuzzyKey] : null;
            const score = g ? (typeof g === 'object' ? g.score : g) : "";
            
            // Period-specific exemption check: If assignment has period due dates, and student's period has no due date, and student is ungraded
            const reg = allAssignments[key];
            const hasPeriodDueDates = reg?.periodDueDates && Object.values(reg.periodDueDates).some(d => d);
            const studentPeriodDueDate = reg?.periodDueDates?.[s.period];
            const isPeriodExempt = hasPeriodDueDates && !studentPeriodDueDate && (score === "" || score === undefined);

            if (score !== undefined && score !== null && score !== "" && score !== "EX" && !isPeriodExempt) {
                const num = Number(score);
                const max = (g && typeof g === 'object' && g.max) ? Number(g.max) : assignmentMap.get(key).maxPoints;
                earned += num; possible += max;
                const cat = getAssignmentCategory(key, courseKey);
                catEarned[cat] += num; catPossible[cat] += max;
            }
        });

        const weights = COURSE_WEIGHTS[courseKey];
        let weighted = 0, weightSum = 0;
        Object.keys(catPossible).forEach(cat => { if(catPossible[cat]>0 && weights[cat] > 0){ weighted += (catEarned[cat]/catPossible[cat])*weights[cat]; weightSum += weights[cat]; }});
        let pct = weightSum > 0 ? Math.round((weighted/weightSum)*100) : (possible > 0 ? Math.round((earned/possible)*100) : 0);
        let letter = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

        html += `<tr><td class="sticky-col student-info-cell p-2"><div><span class="fw-bold">${privacyMode?`Student ${rowIndex+1}`:`${s.lastName.toUpperCase()}, ${s.firstName}`}</span><div class="id-cell">${privacyMode?'HIDDEN':s.displaySchoolId} | ${s.period}</div></div></td>`;
        if (showSummaryColumns) html += `<td class="text-center bg-light">${earned}</td><td class="text-center bg-light">${possible}</td><td class="text-center bg-light text-primary fw-bold">${pct}%</td><td class="text-center border-right-heavy fw-bold">${letter}</td>`;

        sortedKeys.forEach((key, colIndex) => {
            const fuzzyKey = Object.keys(sGrades).find(k => cleanKey(k) === cleanKey(key));
            const g = fuzzyKey ? sGrades[fuzzyKey] : null;
            const info = assignmentMap.get(key);
            let score = "", display = '<span class="text-danger small fw-bold">MISSING</span>', bg = "";
            
            // Period-specific exemption check
            const reg = allAssignments[key];
            const hasPeriodDueDates = reg?.periodDueDates && Object.values(reg.periodDueDates).some(d => d);
            const studentPeriodDueDate = reg?.periodDueDates?.[s.period];
            const isPeriodExempt = hasPeriodDueDates && !studentPeriodDueDate;

            if (g) {
                score = typeof g === 'object' ? g.score : g;
                if (score === "EX") display = '<span class="badge bg-secondary px-1 text-white shadow-sm">EX</span>';
                else {
                    display = (Number(score) === info.maxPoints) ? '<span class="check-mark">✔</span>' : score;
                    if (Number(score)/info.maxPoints < 0.8) bg = "background-color: #FFF2CC;";
                }
            } else {
                if (isPeriodExempt) {
                    display = '<span class="badge bg-secondary px-1 text-white shadow-sm">EX</span>';
                } else {
                    let isTC = key.match(/TC-(?:In|Out)\s+(\d{1,2}\/\d{1,2})/i);
                    if (isTC && !isStudentScheduledOn(s.period, isTC[1])) display = '<span class="badge bg-secondary px-1 text-white shadow-sm">EX</span>';
                }
            }
            html += `<td class="grade-cell text-center border-end" style="${bg}" data-student-id="${s.studentId}" data-assignment="${key}" data-current-score="${score}" data-current-max="${info.maxPoints}" data-row-index="${rowIndex}" data-col-index="${colIndex}">${display}</td>`;
        });
        html += '</tr>';
    });
    tbody.innerHTML = html;
    
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) { return new bootstrap.Tooltip(tooltipTriggerEl); });
}

// ========================================================
// ANALYTICS & MODAL HANDLERS
// ========================================================
window.showAnalytics = function(dbKey, displayLabel) {
    let scores = [];
    let periodData = {};
    const filtered = getFilteredStudents(document.getElementById('periodFilter').value, 'All');
    
    filtered.forEach(s => {
        const fuzzyKey = Object.keys(allGrades[s.studentId]||{}).find(k=>cleanKey(k)===cleanKey(dbKey));
        const entry = fuzzyKey ? allGrades[s.studentId][fuzzyKey] : null;
        const score = entry ? (typeof entry === 'object' ? entry.score : entry) : "";
        if (score !== "" && score !== "EX" && !isNaN(Number(score))) {
            scores.push(Number(score));
            if (!periodData[s.period]) periodData[s.period] = [];
            periodData[s.period].push(Number(score));
        }
    });

    if (scores.length === 0) return alert("No scores to analyze.");
    const max = parseAssignmentInfo(dbKey).maxPoints;
    scores.sort((a,b)=>a-b);
    const mean = (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1);
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 !== 0 ? scores[mid] : ((scores[mid-1]+scores[mid])/2);
    const pass = Math.round((scores.filter(s=>(s/max)>=0.8).length / scores.length)*100);

    document.getElementById('analyticsModalTitle').innerText = displayLabel;
    document.getElementById('statMean').innerText = mean;
    document.getElementById('statMedian').innerText = median;
    document.getElementById('statPass').innerText = pass + "%";
    document.getElementById('masteryDescription').innerText = `Out of ${scores.length} attempts, ${pass}% reached Mastery (80%+).`;
    
    const ctx = document.getElementById('periodAnalyticsChart');
    if (window.analyticsChartInstance) window.analyticsChartInstance.destroy();
    window.analyticsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: Object.keys(periodData).sort(), datasets: [{ label: 'Mean Score', data: Object.keys(periodData).sort().map(p=>(periodData[p].reduce((a,b)=>a+b,0)/periodData[p].length).toFixed(1)), backgroundColor: 'rgba(54, 162, 235, 0.7)', borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: max } } }
    });
    getModal('analyticsModal').show();
};

document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.closest('#btnTogglePrivacy')) { privacyMode = !privacyMode; applyFiltersAndRender(); return; }
    if (target.closest('.analytics-trigger')) { const t = target.closest('.analytics-trigger'); showAnalytics(t.dataset.assignment, t.innerText); return; }
    
    if (target.closest('.edit-col-btn')) {
        const key = target.closest('.edit-col-btn').dataset.assignment;
        document.getElementById('editColOldName').value = key;
        document.getElementById('editColNewName').value = key.replace(/\s*[\[\(]\d+\s*pts?[\]\)]/i, '');
        document.getElementById('editColNewPts').value = parseAssignmentInfo(key).maxPoints;
        document.getElementById('editColDueDate').value = allAssignments[key]?.dueDate || "";
        document.getElementById('editColInstructions').value = allAssignments[key]?.instructions || "";
        document.getElementById('editColCourse').value = allAssignments[key]?.targetCourse || "All";
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
        const save = async () => {
            if (isSaving) return; isSaving = true;
            const val = input.value.trim().toUpperCase();
            let final = val === "EX" ? "EX" : (val === "" ? "" : Number(val));
            if (val !== "" && val !== "EX" && isNaN(final)) { cell.innerHTML = currentScore || '<span class="text-danger small fw-bold">MISSING</span>'; return; }

            if (String(final) !== String(currentScore)) {
                cell.innerHTML = '<span class="spinner-border spinner-border-sm text-warning"></span>';
                try {
                    await fetch('/api/admin/save-grade', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ student_id: studentId, exam_id: assignment, score: final, total_points: Number(currentMax) })
                    });
                    
                    if (!allGrades[studentId]) allGrades[studentId] = {};
                    allGrades[studentId][assignment] = { score: final, max: Number(currentMax), timestamp: new Date().toISOString() };
                    
                    cell.dataset.currentScore = final;
                    if (final === "EX") cell.innerHTML = '<span class="badge bg-secondary px-1 text-white shadow-sm">EX</span>';
                    else if (final === "") cell.innerHTML = '<span class="text-danger small fw-bold">MISSING</span>';
                    else cell.innerHTML = (final == currentMax ? '<span class="check-mark">✔</span>' : final);
                } catch (error) { console.error(error); cell.innerHTML = currentScore || '<span class="text-danger small fw-bold">MISSING</span>'; }
            } else cell.innerHTML = currentScore || '<span class="text-danger small fw-bold">MISSING</span>';
        };

        const nav = (rd, cd) => {
            const next = document.querySelector(`.grade-cell[data-row-index="${rowIndex + rd}"][data-col-index="${colIndex + cd}"]`);
            if (next) next.click();
        };

        input.onblur = () => { save(); setTimeout(() => { if (!document.querySelector('.inline-edit-input')) applyFiltersAndRender(); }, 500); };
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