// /js/student/dashboard.js
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';
import { escapeHtml, parsePts } from '../modules/utils.js';
import { COURSE_WEIGHTS, periodToCourseKey } from '../modules/grade-weights.js?v=5';
import { computeGradeStats, computeBadges } from '../modules/achievements.js';

// --- INJECT TURN-IN MODAL ON LOAD ---
function injectTurnInModal() {
    if (document.getElementById('turnInModal')) return;
    const modalHtml = `
    <div class="modal fade" id="turnInModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-primary">
          <div class="modal-header bg-primary text-white py-2">
            <h6 class="modal-title fw-bold"><i class="fas fa-paper-plane me-2"></i>Turn In Assignment</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body bg-light">
            <p class="small text-muted mb-2">If this assignment requires a link (like a GitHub repo, published URL, or Google Doc), or if you need to leave a note for your teacher, paste it below!</p>
            <h6 id="turnInAssignmentTitle" class="text-dark fw-bold mb-3 border-bottom pb-2"></h6>
            <textarea id="turnInNote" class="form-control border-primary shadow-sm fw-bold" rows="3" placeholder="Paste link or comment here... (Optional)"></textarea>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" data-bs-dismiss="modal">Cancel</button>
            <button type="button" id="btnConfirmTurnIn" class="btn btn-primary btn-sm fw-bold px-4">Submit</button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('btnConfirmTurnIn')?.addEventListener('click', processTurnIn);
}
injectTurnInModal();

let currentTurnInState = null; 

// Maps exam_id → chapter page URL + anchor so gradebook columns link directly to the lesson.
const ASSIGNMENT_PAGE_LINKS = {
    // Chapter 1 — Web Design
    'ch1_lab_exec_sum':        '/year1/join-the-developers-guild.html#section-business-plan',
    'ch1_proj_m2':             '/year1/join-the-developers-guild.html#section-business-plan',
    'ch1_lab_infra':           '/year1/join-the-developers-guild.html#section-history-infra',
    'ch1_lab_dns':             '/year1/join-the-developers-guild.html#section-dns',
    'ch1_lab_url':             '/year1/join-the-developers-guild.html#section-urls',
    'ch1_lab_know_your_guild': '/year1/join-the-developers-guild.html#section-ctso-origins',
    'ch1_lab_mock_meeting':    '/year1/join-the-developers-guild.html#section-parliamentary',
    'ch1_lab_service_proposal':'/year1/join-the-developers-guild.html#section-service-wbl',
    'ch1_lab_portfolio_audit': '/year1/join-the-developers-guild.html#section-professional-image',
    'ch1_lab_cte_advocate':    '/year1/join-the-developers-guild.html#section-cte-relevance',
    'ch1_lab_job_app':         '/year1/join-the-developers-guild.html#section-soft-skills',
    'ch1_proj_m1':             '/year1/join-the-developers-guild.html#section-soft-skills',
    'ch1_lab_client_neg':      '/year1/join-the-developers-guild.html#section-workflow',
    'ch1_proj_m4':             '/year1/join-the-developers-guild.html#section-workflow',
    'ch1_lab_code_conduct':    '/year1/join-the-developers-guild.html#section-ethics',
    'ch1_proj_m5':             '/year1/join-the-developers-guild.html#section-ethics',
    'ch1_lab_root':            '/year1/join-the-developers-guild.html#section-root-setup',
    'ch1_milestone_setup':     '/year1/join-the-developers-guild.html#section-root-setup',
    'ch1_proj_m3':             '/year1/join-the-developers-guild.html#section-urls',
    // WRS Practice Assessments
    'WRS-Practice-A':          '/pre-assessments/workplace-readiness-skills.html',
    'WRS-Practice-B':          '/pre-assessments/workplace-readiness-skills-b.html',
    'WRS-Practice-C':          '/pre-assessments/workplace-readiness-skills-c.html',
    'WRS-Practice-D':          '/pre-assessments/workplace-readiness-skills-d.html',
};

// Mirrors the identical function in admin/gradebook.js so column labels match exactly
function abbreviateAssignmentName(name) {
    let abbr = name.replace(/\s*[\[\(]\d+\s*pts?[\]\)]/i, '').trim();
    if (abbr.toUpperCase().startsWith('TC-')) return abbr;
    abbr = abbr.replace(/Chapter\s*(\d+)/i, 'Ch$1')
               .replace(/Unit\s*(\d+)/i, 'Unit$1')
               .replace(':', '-');
    abbr = abbr.replace(/\b(Summative|Formative|Assessment|Assignment)\b/ig, '').replace(/Lab\s*/i, 'Ch ').trim();
    if (!abbr.includes('-') && abbr.includes(' ')) abbr = abbr.replace(' ', '-');
    if (abbr.includes('-')) {
        const parts = abbr.split('-');
        const prefix = parts[0].trim();
        const suffixWords = parts.slice(1).join('-').trim().replace(/['"()\[\]]/g, '').split(/[\s\/]+/);
        if (suffixWords.length > 1 && suffixWords[0].toLowerCase() === 'the') suffixWords.shift();
        abbr = suffixWords.length > 0 && suffixWords[0].length > 0 ? prefix + '-' + suffixWords[0] : prefix;
    }
    return abbr.replace(/\s+/g, ' ').replace(/--+/g, '-').replace(/-+$/, '').trim();
}

// HELPER: Mimics Teacher Gradebook logic to hide CS assignments from WD students and vice versa!
function isAssignmentVisible(name, period, registryData) {
    if (!period || period === 'Teacher') return true;

    const studentCourse = periodToCourseKey(period);

    // Supports registry keyed by exam_id while preserving title-key fallback.
    const registryEntry = registryData[name]
        || Object.values(registryData).find((entry) => entry && entry.title && entry.title.trim() === String(name).trim());

    if (registryEntry && registryEntry.targetCourse) {
        const courseMap = {
            '05254G1S': 'WD1',
            '05254G2S': 'WD2',
            '10003GS': 'CS',
            '05254ES': 'AS',       // last year's archived AS course code
            '05254EF-201': 'AS',   // this year's real AS-B2 course code
            '99999999': 'Teacher'
        };
        const targetRaw = registryEntry.targetCourse;
        const target = courseMap[targetRaw] || targetRaw;
        if (target !== 'All' && target !== studentCourse) return false;
    }

    const lowerName = String(name).toLowerCase();
    const match = lowerName.match(/(?:chapter|ch|unit|milestone)\s*(\d+)/i);
    const num = match ? parseInt(match[1], 10) : null;

    if (studentCourse === 'WD1') {
        if (num !== null) return lowerName.includes('unit') || lowerName.includes('milestone') ? num >= 1 && num <= 4 : num >= 1 && num <= 8;
        return true;
    }
    if (studentCourse === 'WD2' || studentCourse === 'AS') {
        // Milestone ids follow "ch{n}_milestone" just like every other WD2
        // assignment (ch9_milestone .. ch16_milestone) -- no separate 1-4
        // milestone-only numbering scheme, so it needs the same 9-16 range
        // as everything else or every WD2 milestone is silently invisible.
        if (num !== null) return num >= 9 && num <= 16;
        return true;
    }
    if (studentCourse === 'CS') {
        if (num !== null) return num >= 1 && num <= 19;
        return true;
    }
    return true;
}

// --- UPDATED LOAD GRADES (MARIADB INTEGRATION) ---
const COURSE_LABELS = { WD1: 'Web Design 1', WD2: 'Web Design 2', AS: 'Advanced Studies', CS: 'Computer Science', INTV: 'Intervention' };

// Curriculum-chapter features (proficiency scales, growth chart) only make
// sense for courses that actually have a fixed chapter/unit sequence.
// Intervention assignments are ad-hoc, so it gets stats + a grade table only.
function hasCurriculumChapters(courseKey) {
    return courseKey !== 'INTV';
}

// Builds the full markup for one course's panel — stats cards, badges,
// grade table, and (if applicable) proficiency scales + growth chart — all
// with IDs suffixed by courseKey so multiple panels can coexist on the page.
function coursePanelTemplate(courseKey, sectionId) {
    const suffix = `-${courseKey}`;
    const chapterBlock = hasCurriculumChapters(courseKey) ? `
        <div id="proficiencyContainer${suffix}" class="mb-4"></div>
        <div class="card shadow-sm mb-4 border-0 d-none" id="chartCard${suffix}">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-0">
                <h6 class="fw-bold text-primary mb-0"><i class="fas fa-chart-line me-2"></i>My Proficiency Growth</h6>
            </div>
            <div class="card-body">
                <div style="max-height: 350px;"><canvas id="selfAssessChart${suffix}"></canvas></div>
            </div>
        </div>` : '';

    return `
    <div class="course-panel mb-5" id="coursePanel${suffix}">
        <div class="d-flex align-items-center mb-1">
            <h3 class="text-primary fw-bold mb-0">${COURSE_LABELS[courseKey] || courseKey}</h3>
            <div id="overallBadge${suffix}" class="d-none ms-2"></div>
        </div>
        <p class="text-muted small mb-3">Period ${escapeHtml(sectionId)}</p>

        <div class="row g-3 mb-4" id="statsContainer${suffix}" style="display:none;">
            <div class="col-md-4">
                <div class="summary-card shadow-sm bg-white p-3 rounded border-start border-4 border-primary">
                    <small class="text-uppercase fw-bold text-muted" style="font-size: 0.75rem;">Overall Grade</small>
                    <div class="d-flex align-items-end">
                        <h2 id="overallPercent${suffix}" class="mb-0 text-primary fw-bold">--%</h2>
                        <h4 id="overallLetter${suffix}" class="mb-0 ms-2 fw-bold text-muted"></h4>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="summary-card shadow-sm bg-white p-3 rounded border-start border-4" style="border-left-color: #34a853 !important;">
                    <small class="text-uppercase fw-bold text-muted" style="font-size: 0.75rem;">Assignments Completed</small>
                    <h2 id="completedCount${suffix}" class="mb-0 fw-bold text-dark">0 / 0</h2>
                </div>
            </div>
            <div class="col-md-4">
                <div class="summary-card shadow-sm bg-white p-3 rounded border-start border-4" style="border-left-color: #fbbc05 !important;">
                    <small class="text-uppercase fw-bold text-muted" style="font-size: 0.75rem;">Points Earned</small>
                    <h2 id="pointsEarned${suffix}" class="mb-0 fw-bold text-dark">0 pts</h2>
                </div>
            </div>
        </div>

        <div class="card shadow-sm mb-4 border-0 d-none" id="badgesCard${suffix}">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-0">
                <h6 class="fw-bold text-primary mb-0"><i class="fas fa-award me-2"></i>My Achievements</h6>
            </div>
            <div class="card-body">
                <div id="badgesContainer${suffix}" class="d-flex flex-wrap gap-3"></div>
            </div>
        </div>

        <div class="card shadow-sm mb-4 border-0">
            <div class="card-header bg-white border-bottom-0 pt-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h6 class="fw-bold text-primary mb-0"><i class="fas fa-list-check me-2"></i>My Assignments</h6>
                <input type="search" class="form-control form-control-sm" style="max-width: 260px;" id="gradeSearch${suffix}" placeholder="Find an assignment..." aria-label="Find an assignment">
            </div>
            <div class="card-body pt-2" id="gradeList${suffix}">
                <div class="p-5 text-center"><div class="spinner-border text-primary"></div></div>
            </div>
        </div>
        ${chapterBlock}
    </div>
    <hr class="my-5">`;
}

// Loads and renders one course's full panel — its own stats, badges, grade
// table, and (if applicable) proficiency scales + growth chart, all scoped
// by courseKey so this can run independently for every enrolled course.
async function renderCoursePanel(user, courseKey, sectionId) {
    const root = document.getElementById('courseGradesRoot');
    if (!root) return;
    // loadGrades() clears #courseGradesRoot before calling this for each
    // course, so panels are always appended fresh, never patched in place.
    root.insertAdjacentHTML('beforeend', coursePanelTemplate(courseKey, sectionId));

    try {
        const [data, saData] = await Promise.all([
            apiFetch(`/api/student/course-gradebook?student_id=${user.student_id}&section_id=${encodeURIComponent(sectionId)}`),
            apiFetch(`/api/student/self-assessments?student_id=${user.student_id}`)
        ]);

        const studentPeriod = (data.section_id || sectionId || "").trim().toUpperCase();

        const registryData = {};
        const myGrades = {};
        if (Array.isArray(data.assignments)) {
            data.assignments.forEach((assignment) => {
                const examIdKey = String(assignment.exam_id || '').trim();
                if (!examIdKey) return;
                registryData[examIdKey] = {
                    title: assignment.title || examIdKey,
                    maxPoints: assignment.total_points || 0,
                    dueDate: assignment.due_date || '',
                    instructions: assignment.instructions || '',
                    targetCourse: assignment.course_id || 'All',
                    category: assignment.category,
                    isProjectMilestone: !!assignment.is_project_milestone,
                    projectPending: !!Number(assignment.project_pending),
                    periodDueDates: assignment.period_due_dates
                        ? (typeof assignment.period_due_dates === 'string'
                            ? JSON.parse(assignment.period_due_dates)
                            : assignment.period_due_dates)
                        : {}
                };
                myGrades[examIdKey] = {
                    score: assignment.score,
                    timestamp: assignment.timestamp,
                    exam_id: examIdKey,
                    title: assignment.title || examIdKey,
                    onTime: assignment.on_time // 1/0 for a timeclock check-in, null otherwise
                };
            });
        }

        const allKeys = new Set(
            Object.keys(myGrades)
                .concat(Object.keys(registryData))
                .filter(k => k !== 'lastSubmitDate' && k !== 'uid' && !k.endsWith('-Score'))
        );
        // Newest due date on the left, oldest on the right -- so the columns
        // a student actually needs to look at next are the first ones they
        // see without scrolling. Undated items (no real due date registered)
        // sort to the far right, past even the oldest dated item.
        const getDueDateForSort = (key) => {
            const reg = registryData[key];
            let d = reg?.dueDate || '';
            if (reg?.periodDueDates && reg.periodDueDates[studentPeriod]) d = reg.periodDueDates[studentPeriod];
            return (d && d !== '9999-99-99') ? d : '';
        };
        const keys = Array.from(allKeys)
            .filter(key => isAssignmentVisible(key, studentPeriod, registryData))
            .sort((a, b) => {
                const da = getDueDateForSort(a);
                const db = getDueDateForSort(b);
                if (!da && !db) return a.localeCompare(b);
                if (!da) return 1;
                if (!db) return -1;
                return db.localeCompare(da);
            });

        calculateGradeStats(keys, myGrades, registryData, courseKey);
        calculateBadges(keys, myGrades, registryData, courseKey);
        renderGradeList(keys, myGrades, user.student_id, registryData, studentPeriod, courseKey);

        if (hasCurriculumChapters(courseKey)) {
            renderProficiencyScales(keys, myGrades, user.student_id, courseKey, saData.assessments);
            // Awaited and caught on its own -- this call was previously fire-and-forget,
            // so a Chart.js failure (e.g. undefined Chart) became an unhandled promise
            // rejection instead of hitting the catch below, and would otherwise wipe out
            // the grade table above (already rendered fine) with a false "could not load"
            // message for what's really just a decorative chart failing.
            if (saData.assessments) {
                try {
                    await renderSelfAssessmentChart(saData.assessments, courseKey, myGrades);
                } catch (chartErr) {
                    console.error(`Self-assessment chart failed for ${courseKey}:`, chartErr);
                }
            }
        }
    } catch (e) {
        console.error(`Error loading grades for ${courseKey}:`, e);
        const list = document.getElementById(`gradeList-${courseKey}`);
        if (list) list.innerHTML = `<p class="p-4 text-center text-danger mb-0">Could not load this class's gradebook. Please refresh or contact your teacher.</p>`;
    }
}

async function loadGrades() {
    const user = getLoggedInUser();
    if (!user || !user.student_id) return;

    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) welcomeEl.innerText = `Welcome, ${user.first_name}!`;
    const subtitleEl = document.getElementById('userSubtitle');
    if (subtitleEl) subtitleEl.innerText = 'Your grades across every class you\'re enrolled in:';

    const primaryPeriod = (user.section_id || '').trim().toUpperCase();
    const courses = new Map(); // courseKey -> representative section_id
    const primaryCourseKey = periodToCourseKey(primaryPeriod);
    if (primaryCourseKey && COURSE_WEIGHTS[primaryCourseKey]) courses.set(primaryCourseKey, primaryPeriod);

    try {
        const extra = await apiFetch(`/api/admin/student-sections?student_id=${user.student_id}`);
        (Array.isArray(extra) ? extra : []).forEach((sec) => {
            const key = periodToCourseKey(String(sec.section_id || '').trim().toUpperCase());
            if (key && COURSE_WEIGHTS[key] && !courses.has(key)) {
                courses.set(key, String(sec.section_id).trim().toUpperCase());
            }
        });
    } catch (e) { console.error('Could not load additional sections:', e); }

    const root = document.getElementById('courseGradesRoot');
    if (courses.size === 0) {
        if (root) root.innerHTML = `<div class="alert alert-warning">We couldn't determine your class enrollment. Please contact your teacher.</div>`;
        return;
    }
    if (root) root.innerHTML = '';

    // Each course's panel loads independently so one failing doesn't block the rest.
    await Promise.all(Array.from(courses.entries()).map(([courseKey, sectionId]) => renderCoursePanel(user, courseKey, sectionId)));
}

function calculateGradeStats(keys, myGrades, registryData, courseKey) {
    // Actual computation lives in js/modules/achievements.js, shared with
    // the review-games arcade page (reviewGames/webReviewGames.html) so
    // both show the exact same weighted grade/rank a student's real
    // gradebook does. This function only writes the result to the DOM.
    const { percent, letterGrade, completed, totalEarned } = computeGradeStats(keys, myGrades, registryData, courseKey);

    let gradeColor = 'text-danger';
    if (letterGrade === 'A') gradeColor = 'text-success';
    else if (letterGrade === 'B') gradeColor = 'text-primary';
    else if (letterGrade === 'C') gradeColor = 'text-secondary';
    else if (letterGrade === 'D') gradeColor = 'text-warning';

    const statsContainer = document.getElementById(`statsContainer-${courseKey}`);
    if (statsContainer) statsContainer.style.display = 'flex';

    const overallEl = document.getElementById(`overallPercent-${courseKey}`);
    const letterEl = document.getElementById(`overallLetter-${courseKey}`);
    const countEl = document.getElementById(`completedCount-${courseKey}`);
    const pointsEl = document.getElementById(`pointsEarned-${courseKey}`);
    const overallBadge = document.getElementById(`overallBadge-${courseKey}`);

    if (overallEl) overallEl.innerText = percent + '%';
    if (letterEl) {
        letterEl.innerText = letterGrade;
        letterEl.className = `mb-0 ms-3 fw-bold ${gradeColor}`;
    }
    if (countEl) countEl.innerText = `${completed} / ${keys.length}`;
    if (pointsEl) pointsEl.innerText = `${totalEarned} pts`;

    if (overallBadge) {
        overallBadge.classList.remove('d-none');
        if (percent >= 100 && completed > 0) {
            overallBadge.className = 'badge rounded-pill shadow-sm ms-2 fs-6 badge-platinum';
            overallBadge.innerHTML = '<span class="text-dark"><i class="fas fa-crown me-1"></i> Platinum Rank</span>';
        } else if (percent >= 85 && completed > 0) {
            overallBadge.className = 'badge rounded-pill shadow-sm ms-2 fs-6 badge-gold';
            overallBadge.innerHTML = '<span class="text-dark"><i class="fas fa-medal me-1"></i> Gold Rank</span>';
        } else if (percent >= 75 && completed > 0) {
            overallBadge.className = 'badge rounded-pill shadow-sm ms-2 fs-6 badge-silver';
            overallBadge.innerHTML = '<span class="text-dark"><i class="fas fa-award me-1"></i> Silver Rank</span>';
        } else {
            overallBadge.classList.add('d-none');
        }
    }
}

function calculateBadges(keys, myGrades, registryData, courseKey) {
    const badgesContainer = document.getElementById(`badgesContainer-${courseKey}`);
    const badgesCard = document.getElementById(`badgesCard-${courseKey}`);

    if (!badgesContainer) return;
    if (badgesCard) badgesCard.classList.remove('d-none');

    // Achievement thresholds live in js/modules/achievements.js (see
    // calculateGradeStats above) -- this just renders whatever it returns.
    const badges = computeBadges(keys, myGrades, registryData);

    const badgeToHtml = ({ icon, type, title, desc }) => {
        let badgeClass = 'bg-primary';
        let textColorClass = 'text-white';

        if (type === 'platinum') { badgeClass = 'badge-platinum'; textColorClass = 'text-dark'; }
        else if (type === 'gold') { badgeClass = 'badge-gold'; textColorClass = 'text-dark'; }
        else if (type === 'silver') { badgeClass = 'badge-silver'; textColorClass = 'text-dark'; }
        else if (type === 'diamond') { badgeClass = 'badge-diamond'; textColorClass = 'text-white'; }
        else if (type === 'info' || type === 'success' || type === 'danger' || type === 'warning') {
            const baseColor = type.split(' ')[0];
            badgeClass = `bg-${baseColor}`;
            textColorClass = (baseColor === 'warning') ? 'text-dark' : 'text-white';
        }

        return `
            <div class="badge-item text-center p-2 rounded border shadow-sm ${badgeClass}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${desc}">
                <i class="${icon} fs-3 mb-1 ${textColorClass}"></i>
                <div class="small fw-bold lh-sm ${textColorClass}">${title}</div>
            </div>
        `;
    };

    badgesContainer.innerHTML = badges.length > 0
        ? badges.map(badgeToHtml).join('')
        : '<div class="text-muted small fst-italic py-2 px-3">Complete assignments to unlock badges!</div>';

    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) { return new bootstrap.Tooltip(tooltipTriggerEl); });
    }
}

// CS mastery exemption (same rule as js/modules/achievements.js): an 80%+
// unit exam excuses that unit's chapter activities, so an unfinished one
// isn't "missing."
const CS_UNIT_CHAPTERS_FOR_LIST = { 1: [1, 2], 2: [3, 4], 3: [5, 6, 7, 8], 4: [9, 10], 5: [11, 12, 13], 6: [14, 15, 16], 7: [17, 18, 19] };
function isCsMasteryExempt(key, myGrades, registryData, courseKey) {
    const m = courseKey === 'CS' && key.match(/^cs_ch(\d+)_/);
    if (!m) return false;
    const unit = Object.keys(CS_UNIT_CHAPTERS_FOR_LIST).find(u => CS_UNIT_CHAPTERS_FOR_LIST[u].includes(Number(m[1])));
    if (!unit) return false;
    const exam = myGrades[`Unit${unit}-Exam`];
    const examScore = exam ? (typeof exam === 'object' ? exam.score : exam) : null;
    const examMax = registryData?.[`Unit${unit}-Exam`]?.maxPoints;
    return examScore !== null && examScore !== undefined && examScore !== '' && !!examMax && (Number(examScore) / examMax) >= 0.80;
}

// The grade list's groups, in page order (teacher request 2026-10-26).
const GRADE_GROUPS = [
    { id: 'projects', label: 'Projects', icon: 'fa-diagram-project' },
    { id: 'assignments', label: 'Assignments & Labs', icon: 'fa-flask' },
    { id: 'tests', label: 'Tests & Quizzes', icon: 'fa-file-pen' },
    { id: 'pre', label: 'Pre-Tests & Pre-Scales', icon: 'fa-clipboard-question' },
    { id: 'clockins', label: 'Daily Clock-Ins', icon: 'fa-clock' },
];
// Which group an assignment goes in, by its exam_id first: WD labs
// (ch3_lab4) are titled "Milestone 1: ..." but are labs, while ch3_milestone
// is the chapter project.
function gradeGroupOf(key, title, reg) {
    if (/^TC-/i.test(key)) return 'clockins';
    if (/\bpre\b|pre-(assessment|scale|test)/i.test(key)) return 'pre';
    if (reg?.isProjectMilestone || /(^|_)milestone(_|$)|_proj|project/i.test(key) || (!/_lab/i.test(key) && /project|capstone/i.test(title))) return 'projects';
    if (/exam|quiz|^final|wrs-practice/i.test(key) || /\b(exam|quiz)\b/i.test(title)) return 'tests';
    return 'assignments';
}

// The student's grades as a plain list (it used to be a sideways spreadsheet
// with vertical column headers, and students couldn't find their grades).
// Only shows what they've turned in and what's past due; assignments that
// aren't due yet stay hidden until one of those happens (teacher request
// 2026-10-23). Daily clock-ins fold into their own collapsed section.
function renderGradeList(keys, myGrades, studentId, registryData, studentPeriod, courseKey) {
    const listEl = document.getElementById(`gradeList-${courseKey}`);
    if (!listEl) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const fmtDate = (ymd) => { const [, mo, d] = ymd.split('-'); return `${parseInt(mo)}/${parseInt(d)}`; };

    const items = [];
    keys.forEach(key => {
        const reg = registryData[key] || {};
        let due = reg.dueDate || '';
        if (reg.periodDueDates && reg.periodDueDates[studentPeriod]) due = reg.periodDueDates[studentPeriod];
        if (due === '9999-99-99') due = '';
        const grade = myGrades[key];
        const score = grade && typeof grade === 'object' ? grade.score : grade;
        const hasScore = score !== undefined && score !== null && score !== '';
        const pastDue = !!due && new Date(due + 'T00:00:00') < today;

        let status;
        if (hasScore) status = score === 'Submitted' ? 'waiting' : score === 'EX' ? 'excused' : 'graded';
        else if (reg.projectPending) status = 'project-pending';
        else if (isCsMasteryExempt(key, myGrades, registryData, courseKey)) return;
        else if (pastDue) status = 'missing';
        else return; // not due yet and not turned in: hidden

        const time = grade && typeof grade === 'object' ? grade.timestamp : '';
        const turnedInYmd = time ? String(time).split('T')[0].split(' ')[0] : '';
        const isTc = key.startsWith('TC-');
        const isLate = status === 'graded' && (isTc ? grade.onTime === 0 : !!(due && turnedInYmd && turnedInYmd > due));
        items.push({ key, title: reg.title || key, due, max: reg.maxPoints || parsePts(key), score, status, turnedInYmd, isLate, isTc });
    });

    const byDueDesc = (a, b) => (!a.due && !b.due) ? a.title.localeCompare(b.title) : !a.due ? 1 : !b.due ? -1 : b.due.localeCompare(a.due);
    // Grouped by kind, each group closed until the student clicks it
    // (teacher request 2026-10-26): what's turned in and what's officially
    // missing, missing first. Excused work isn't shown at all.
    const groups = GRADE_GROUPS.map(g => {
        const mine = items.filter(i => i.status !== 'excused' && gradeGroupOf(i.key, i.title, registryData[i.key]) === g.id);
        return { ...g, missing: mine.filter(i => i.status === 'missing').sort(byDueDesc), done: mine.filter(i => i.status !== 'missing').sort(byDueDesc) };
    }).filter(g => g.missing.length || g.done.length);
    const missingCount = groups.reduce((n, g) => n + g.missing.length, 0);

    function badgeFor(i) {
        if (i.status === 'missing') {
            return `<span class="badge bg-danger me-2">Missing</span>
                <button class="btn btn-sm btn-outline-danger fw-bold mark-done-btn" onclick="openTurnInModal('${studentId}', '${i.key.replace(/'/g, "\\'")}', this)" title="Past due with nothing turned in"><i class="fas fa-paper-plane me-1"></i>Turn In</button>`;
        }
        if (i.status === 'waiting') return '<span class="badge bg-warning text-dark">Waiting for teacher</span>';
        if (i.status === 'excused') return '<span class="badge bg-secondary">Excused</span>';
        if (i.status === 'project-pending') return '<span class="badge bg-warning text-dark">PENDING</span><div class="small text-muted mt-1">Needs your upload + a confirmed peer review</div>';
        const pct = i.max ? (Number(i.score) / i.max) * 100 : 0;
        const color = pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-warning text-dark' : 'bg-danger';
        return `<span class="badge ${color} fs-6">${escapeHtml(String(i.score))} / ${i.max}</span>${i.isLate ? ' <span class="badge bg-danger" title="Turned in after the due date">Late</span>' : ''}`;
    }
    function row(i) {
        const pageLink = ASSIGNMENT_PAGE_LINKS[i.key];
        const lesson = pageLink ? ` <a href="${pageLink}" target="_blank" rel="noopener" title="Go to lesson" class="text-muted"><i class="fas fa-book-open" style="font-size:.75rem;"></i></a>` : '';
        const meta = [i.due ? `Due ${fmtDate(i.due)}` : 'No due date', `${i.max} pts`, i.turnedInYmd ? `Turned in ${fmtDate(i.turnedInYmd)}` : ''].filter(Boolean).join(' &middot; ');
        return `<li class="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2 grade-item" data-search="${escapeHtml(i.title.toLowerCase())}">
            <div class="me-auto" style="min-width: 0;">
                <div class="fw-semibold text-dark">${escapeHtml(i.title)}${lesson}</div>
                <div class="small text-muted">${meta}</div>
            </div>
            <div class="text-end">${badgeFor(i)}</div>
        </li>`;
    }

    let html = missingCount
        ? `<p class="fw-bold text-danger mb-2"><i class="fas fa-triangle-exclamation me-1"></i>${missingCount} missing: past due, not turned in. Click a group to see what.</p>`
        : '<p class="fw-bold text-success mb-2"><i class="fas fa-check-circle me-1"></i>Nothing missing.</p>';
    html += groups.map(g => `<details class="grade-group mb-2" id="gradeGroup-${courseKey}-${g.id}">
        <summary class="d-flex flex-wrap align-items-center gap-2 px-3 py-2 rounded border bg-light fw-bold">
            <i class="fas fa-chevron-right small text-muted grade-group-chevron"></i><i class="fas ${g.icon} text-primary"></i>${g.label}
            <span class="ms-auto d-flex flex-wrap gap-1">${g.missing.length ? `<span class="badge bg-danger">${g.missing.length} missing</span>` : ''}${g.done.length ? `<span class="badge bg-success">${g.done.length} turned in</span>` : ''}</span>
        </summary>
        ${g.missing.length ? `<ul class="list-group mt-2">${g.missing.map(row).join('')}</ul>` : ''}
        ${g.done.length ? `<ul class="list-group mt-2"${g.id === 'clockins' ? ` id="clockinList-${courseKey}"` : ''}>${g.done.map(row).join('')}</ul>` : ''}
    </details>`).join('');
    if (!groups.length) html += '<p class="text-muted small">Nothing turned in yet.</p>';
    html += '<p class="small text-muted mt-3 mb-0"><i class="fas fa-info-circle me-1"></i>Assignments that aren\'t due yet show up here once you turn them in or their due date passes.</p>';
    listEl.innerHTML = html;

    // Each clock-in's question, answer and right answer load the first time
    // its group opens.
    const clockinGroup = document.getElementById(`gradeGroup-${courseKey}-clockins`);
    const clockinList = document.getElementById(`clockinList-${courseKey}`);
    if (clockinGroup && clockinList) {
        const keys = new Set(groups.find(g => g.id === 'clockins').done.map(i => i.key));
        clockinGroup.addEventListener('toggle', () => {
            if (clockinGroup.open && !clockinGroup.dataset.loaded) {
                clockinGroup.dataset.loaded = '1';
                loadClockinHistory(studentId, keys, clockinList);
            }
        });
    }

    const search = document.getElementById(`gradeSearch-${courseKey}`);
    if (search) search.oninput = () => {
        const q = search.value.trim().toLowerCase();
        listEl.querySelectorAll('.grade-item').forEach(li => { li.classList.toggle('d-none', !!q && !li.dataset.search.includes(q)); });
        if (q) listEl.querySelectorAll('details').forEach(d => { d.open = true; });
    };
}

// Each clock-in with its question, the student's answer, the right answer,
// the points it earned and the clock-out answer (/api/student/clockin-history;
// the full page is student/clockins.html). Teacher request
// 2026-10-23: students couldn't see any of this, so "all my clock-ins were on
// time and correct" couldn't be checked. Only this course's days (keys).
async function loadClockinHistory(studentId, keys, listEl) {
    if (!listEl) return;
    let days;
    try {
        const res = await fetch(`/api/student/clockin-history?student_id=${encodeURIComponent(studentId)}`);
        if (!res.ok) return; // keep the plain list
        days = ((await res.json()).days || []).filter(d => keys.has(`TC-${d.course}-${d.date}`));
    } catch (e) { return; }
    if (!days.length) return;
    const dayName = (ymd) => new Date(ymd + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
    const items = days.map(d => {
        const pts = d.points === null || d.points === undefined ? null : Number(d.points);
        const ptsColor = pts === null ? 'background:#6c757d;color:#fff;' : pts >= 3 ? 'background:#198754;color:#fff;' : pts === 2 ? 'background:#ffc107;color:#000;' : 'background:#dc3545;color:#fff;';
        const onTime = d.on_time === true ? '<span style="display:inline-block;padding:.25em .65em;border-radius:999px;font-weight:700;font-size:.8em;line-height:1;background:#198754;color:#fff;">On time</span>'
            : d.on_time === false ? '<span style="display:inline-block;padding:.25em .65em;border-radius:999px;font-weight:700;font-size:.8em;line-height:1;background:#dc3545;color:#fff;">Late</span>' : '';
        const mark = d.is_right === true ? ' <span class="fw-bold" style="color:#198754;">&#10004; right</span>'
            : d.is_right === false ? ' <span class="fw-bold" style="color:#dc3545;">&#10008; wrong</span>' : '';
        const right = d.right_answer ? `<div><strong>Right answer:</strong> ${escapeHtml(d.right_answer)}</div>`
            : d.right_answer_tomorrow ? '<div class="text-muted"><strong>Right answer:</strong> shows here tomorrow (your class has this same question today).</div>' : '';
        return `<li class="list-group-item small">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div><strong>${dayName(d.date)}</strong>${d.clock_in ? ` &middot; clocked in ${escapeHtml(d.clock_in)}` : ''} ${onTime}</div>
                ${pts === null ? '' : `<span style="display:inline-block;padding:.25em .65em;border-radius:999px;font-weight:700;font-size:.8em;line-height:1;font-size:.95em;${ptsColor}">${pts} / ${d.max_points || 3}</span>`}
            </div>
            <div class="mt-2"><strong>Question:</strong> ${d.question ? escapeHtml(d.question) : '<span class="text-muted">not saved for this day</span>'}</div>
            <div><strong>Your answer:</strong> ${d.your_answer ? escapeHtml(d.your_answer) : '<span class="text-muted">none</span>'}${mark}</div>
            ${right}
            ${d.explanation ? `<div class="text-muted"><strong>Why:</strong> ${escapeHtml(d.explanation)}</div>` : ''}
            ${d.out_answer ? `<div class="mt-1"><strong>Clock-out${d.clock_out ? ` ${escapeHtml(d.clock_out)}` : ''}:</strong> ${d.out_question ? `<em>${escapeHtml(d.out_question)}</em> ` : ''}${escapeHtml(d.out_answer)}</div>` : ''}
        </li>`;
    });
    listEl.innerHTML = `<li class="list-group-item small bg-light">Each clock-in is worth <strong>3 points</strong>: 1 for clocking in, 1 for being <strong>on time</strong> (within 5 minutes of the bell), and 1 for the <strong>right answer</strong>. <a href="/student/clockins.html">Open My Clock-Ins &amp; Outs</a></li>${items.join('')}`;
}

function getRankName(lvl) {
    if(lvl === 4) return "4.0 - Digital Architect";
    if(lvl === 3) return "3.0 - Practitioner";
    if(lvl === 2) return "2.0 - Apprentice";
    if(lvl === 1) return "1.0 - Novice";
    return "Not Rated Yet";
}

async function renderProficiencyScales(keys, myGrades, userId, courseKey, assessmentsArray) {
    const container = document.getElementById(`proficiencyContainer-${courseKey}`);
    if (!container) return;
    
    const selfAssessments = {};
    if (Array.isArray(assessmentsArray)) {
        assessmentsArray.forEach(a => selfAssessments[String(a.chapter_id).toLowerCase().trim()] = a.level);
    }

    const isCS = (courseKey === "CS");
    const totalItems = isCS ? 5 : 16;
    const keyPrefix = isCS ? "unit" : "ch";

    let cardsHtml = '<div class="row g-4">';
    for (let i = 1; i <= totalItems; i++) {
        const lookupKey = `${keyPrefix}${i}`.toLowerCase().trim();
        const level = selfAssessments[lookupKey] || 0;
        
        cardsHtml += `
            <div class="col-md-6 col-lg-4">
                <div class="card shadow-sm h-100 border-primary" style="border-width: 2px !important;">
                    <div class="card-header bg-site-secondary text-primary fw-bold py-2 text-center">
                        ${isCS ? "Unit" : "Chapter"} ${i} Tracker
                    </div>
                    <div class="card-body p-3">
                        <div class="mb-3 p-2 bg-light rounded border border-secondary shadow-sm">
                            <span class="small fw-bold text-primary d-block mb-2 text-center">My Self-Rating:</span>
                            <div class="btn-group w-100 shadow-sm" role="group">
                                <button class="btn btn-sm ${level == 1 ? 'btn-danger fw-bold' : 'btn-outline-danger'}" onclick="saveSelfAssessment('${lookupKey}', 1)">1</button>
                                <button class="btn btn-sm ${level == 2 ? 'btn-warning fw-bold text-dark' : 'btn-outline-warning'}" onclick="saveSelfAssessment('${lookupKey}', 2)">2</button>
                                <button class="btn btn-sm ${level == 3 ? 'btn-info fw-bold text-dark' : 'btn-outline-info'}" onclick="saveSelfAssessment('${lookupKey}', 3)">3</button>
                                <button class="btn btn-sm ${level == 4 ? 'btn-success fw-bold' : 'btn-outline-success'}" onclick="saveSelfAssessment('${lookupKey}', 4)">4</button>
                            </div>
                            <div class="text-center mt-2">
                                <small class="fw-bold ${level ? 'text-primary' : 'text-muted'}">${getRankName(level)}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    cardsHtml += '</div>';
    container.innerHTML = cardsHtml;
}

window.saveSelfAssessment = async function(chapterId, level) {
    const user = getLoggedInUser();
    try {
        // Save self-assessment to self_assessments table
        await apiFetch('/api/student/save-self-assessment', {
            method: 'POST',
            body: JSON.stringify({ student_id: user.student_id, chapter_id: chapterId, level: level })
        });
        
        // FIX: Save FIXED 10 points to gradebook regardless of level chosen
        // Determine courseKey from chapterId
        const chapterLower = String(chapterId).toLowerCase();
        const isCS = chapterLower.startsWith('unit');
        const courseKey = isCS ? 'CS' : 'WD1';
        
        // Exam ID format must match what prof-scales.js / cs-interactive.js write
        // ("Unit1 Pre-Scale", WITH a space) — a mismatched format here creates a
        // second, duplicate gradebook entry for the same self-assessment.
        let scaleExamId;
        if (isCS) {
            // Extract number: "unit1" -> "Unit1", "unit2" -> "Unit2", etc.
            const num = chapterLower.replace('unit', '');
            scaleExamId = `Unit${num} Pre-Scale`;
        } else {
            // WD format: "ch1" -> "ch1 Pre-Scale", matching existing gradebook format
            const num = chapterLower.replace('ch', '');
            scaleExamId = `Ch${num} Pre-Scale`;
        }
        
        // Get course_id based on course
        const courseIdMap = { 'CS': '10003GS', 'WD1': '05254G1S', 'WD2': '05254G2S' };
        
        // FIX: Save 10 FIXED POINTS (not level * 2.5) - pre-scale completion = 10 points
        await apiFetch('/api/submit-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: user.student_id,
                exam_id: scaleExamId,
                score: 10,  // FIXED: Fixed 10 points for pre-scale completion
                total_points: 10,
                course_id: courseIdMap[courseKey] || '10003GS'
            })
        });
        
        console.log("[Dashboard] Pre-Scale synced to gradebook:", scaleExamId, "10 FIXED points");
        loadGrades();
    } catch (e) {
        console.error(e);
        const container = document.getElementById('selfAssessmentContainer');
        if (container) container.insertAdjacentHTML('afterbegin', `<div class="alert alert-warning small py-2">Self-assessment save failed. Please try again.</div>`);
    }
};

// --- SELF-ASSESSMENT CHART RENDERING ---
async function renderSelfAssessmentChart(assessmentsArray, courseKey, myGrades) {
    const chartCard = document.getElementById(`chartCard-${courseKey}`);
    if (!chartCard) {
        console.log('[Chart] No chartCard element found');
        return;
    }
    
    if (!assessmentsArray || assessmentsArray.length === 0) {
        console.log('[Chart] No assessment data, hiding chart');
        chartCard.classList.add('d-none');
        return;
    }
    
    console.log('[Chart] Rendering chart with', assessmentsArray.length, 'assessments for course:', courseKey, 'myGrades:', myGrades ? Object.keys(myGrades).length : 0);
    chartCard.classList.remove('d-none');
    
    const isCS = courseKey === "CS";
    const totalItems = isCS ? 5 : 16;
    const keyPrefix = isCS ? "unit" : "ch";
    
// Build labels and perceived (self-assessment) data
    const labels = [];
    const perceivedData = [];
    const actualLevelsData = []; // Actual level from pretest + exam
    
for (let i = 1; i <= totalItems; i++) {
        const lookupKey = `${keyPrefix}${i}`.toLowerCase().trim();
        const assessment = assessmentsArray.find(a => String(a.chapter_id).toLowerCase().trim() === lookupKey);
        const level = assessment ? Number(assessment.level) : 0;
        
        // Fetch actual scores from myGrades (pre-assessment and exam)
        const preKey = isCS ? `Unit${i}-Pre` : `Ch${i} Pre-Assessment [15 pts]`;
        const examKey = isCS ? `Unit${i}-Exam` : `Ch${i} Exam`;
        
        const preGrade = myGrades[preKey];
        const preScore = preGrade ? (typeof preGrade === 'object' ? Number(preGrade.score || 0) : Number(preGrade)) : 0;
        const preLevel = preScore > 0 ? Math.min(4, (preScore / 15) * 4) : 0;
        
        const examGrade = myGrades[examKey];
        const examScore = examGrade ? (typeof examGrade === 'object' ? Number(examGrade.score || 0) : Number(examGrade)) : 0;
        const examLevel = examScore > 0 ? Math.min(4, (examScore / 100) * 4) : 0;
        
        // FIX: TWO labels per unit - pretest first, then exam
        labels.push(isCS ? `Unit ${i} Pre` : `Ch ${i} Pre`);
        labels.push(isCS ? `Unit ${i} Exam` : `Ch ${i} Exam`);
        
        // Perceived level repeats for both points (shows self-assessment at both moments)
        perceivedData.push(level);
        perceivedData.push(level);
        
        // Actual levels: pretest level, then exam level (TWO separate points)
        actualLevelsData.push(preLevel);
        actualLevelsData.push(examLevel);
    }
    
    // Destroy this course's existing chart instance, if any — each course
    // panel has its own canvas/instance so they don't clobber each other.
    window.selfAssessChartInstances = window.selfAssessChartInstances || {};
    if (window.selfAssessChartInstances[courseKey]) {
        window.selfAssessChartInstances[courseKey].destroy();
    }

    const ctx = document.getElementById(`selfAssessChart-${courseKey}`);
    if (!ctx) {
        console.log('[Chart] No canvas element found');
        return;
    }
    
    const chartColors = {
        primary: '#000099',
        tertiary: '#3a52a4',
        code: '#588157',
        secondary: '#E07A5F'
    };
    
// FIXED: Create TWO datasets with TWO points per unit
    const perceivedColor = '#20c997';  // Teal for perceived
    const actualColor = '#fd7e14';   // Orange for actual
    
    window.selfAssessChartInstances[courseKey] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'My Self-Assessment (Perceived)',
                    data: perceivedData,
                    borderColor: perceivedColor,
                    backgroundColor: 'rgba(32, 201, 151, 0.1)',
                    borderWidth: 3,
                    borderDash: [5, 5],  // Dashed line
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: perceivedColor,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: 'Actual Level (Pre + Exam)',
                    data: actualLevelsData,
                    borderColor: actualColor,
                    backgroundColor: 'rgba(253, 126, 20, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: actualLevelsData.map((_, idx) => idx % 2 === 0 ? '#3a52a4' : actualColor),
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 4,
                    title: {
                        display: true,
                        text: 'Proficiency Level'
                    },
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            const labels = ['', '1.0\nNovice', '2.0\nApprentice', '3.0\nPractitioner', '4.0\nArchitect'];
                            return labels[value] || value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const level = context.raw;
                            let label = context.dataset.label + ': Level ' + level;
                            if (level >= 3.5) label += ' - Mastery+';
                            else if (level >= 2.5) label += ' - Mastery';
                            else if (level >= 1.5) label += ' - Foundational';
                            else if (level >= 1) label += ' - Beginner';
                            else if (level > 0) label += ' - Getting Started';
                            return label;
                        }
                    }
                }
            }
        }
    });
}

window.openTurnInModal = function(studentId, assignmentName, btnElement) {
    window.currentTurnInState = { studentId, assignmentName, btnElement };
    document.getElementById('turnInAssignmentTitle').innerText = assignmentName;
    const modal = bootstrap.Modal.getInstance(document.getElementById('turnInModal')) || new bootstrap.Modal(document.getElementById('turnInModal'));
    modal.show();
};

async function processTurnIn() {
    const { studentId, assignmentName } = window.currentTurnInState;
    const note = document.getElementById('turnInNote').value;
    try {
        await apiFetch('/api/student/submit-turnin', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId, assignment_name: assignmentName, note: note, timestamp: new Date().toISOString() })
        });
        location.reload();
    } catch (e) {
        console.error(e);
        const btn = document.getElementById('btnConfirmTurnIn');
        if (btn) btn.insertAdjacentHTML('beforebegin', `<div class="text-danger small mb-2">Turn-in failed. Please try again.</div>`);
    }
}

document.addEventListener('DOMContentLoaded', loadGrades);