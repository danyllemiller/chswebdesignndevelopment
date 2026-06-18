// /js/student/dashboard.js
import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';
import { escapeHtml, parsePts } from '../modules/utils.js';

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

// HELPER: Mimics Teacher Gradebook logic to hide CS assignments from WD students and vice versa!
function isAssignmentVisible(name, period, registryData) {
    if (!period || period === 'Teacher') return true;

    // Supports registry keyed by exam_id while preserving title-key fallback.
    const registryEntry = registryData[name]
        || Object.values(registryData).find((entry) => entry && entry.title && entry.title.trim() === String(name).trim());

    if (registryEntry && registryEntry.targetCourse) {
        const courseMap = {
            '05254G1S': 'WD1',
            '05254G2S': 'WD2',
            '10003GS': 'CS',
            '05254ES': 'AS',
            '99999999': 'Teacher'
        };
        const targetRaw = registryEntry.targetCourse;
        const target = courseMap[targetRaw] || targetRaw;
        if (target !== 'All' && !period.includes(target)) return false;
    }

    const lowerName = String(name).toLowerCase();
    const match = lowerName.match(/(?:chapter|ch|unit|milestone)\s*(\d+)/i);
    const num = match ? parseInt(match[1], 10) : null;

    if (period.includes('WD1')) {
        if (num !== null) return lowerName.includes('unit') || lowerName.includes('milestone') ? num >= 1 && num <= 4 : num >= 1 && num <= 8; 
        return true; 
    }
    if (period.includes('WD2')) {
        if (num !== null) return lowerName.includes('unit') || lowerName.includes('milestone') ? num >= 5 && num <= 8 : num >= 9 && num <= 16;
        return true;
    }
    if (period.includes('CS')) {
        if (num !== null) return num >= 1 && num <= 19;
        return true;
    }
    return true;
}

// --- UPDATED LOAD GRADES (MARIADB INTEGRATION) ---
async function loadGrades() {
    const user = getLoggedInUser();
    if (!user || !user.student_id) return; 
    
    try {
        const [data, saData] = await Promise.all([
            apiFetch(`/api/student/course-gradebook?student_id=${user.student_id}`),
            apiFetch(`/api/student/self-assessments?student_id=${user.student_id}`)
        ]);

        const welcomeEl = document.getElementById('welcomeMessage');
        if (welcomeEl) welcomeEl.innerText = `Welcome, ${user.first_name}!`;

        const studentPeriod = (data.section_id || user.section_id || "").trim().toUpperCase();
        let courseKey = "WD1";
        if (studentPeriod.includes("WD2")) courseKey = "WD2";
        if (studentPeriod.includes("CS")) courseKey = "CS";

        const subtitleEl = document.getElementById('userSubtitle');
        if (subtitleEl) {
            if (courseKey === "WD1") subtitleEl.innerText = `Viewing Web Design Gradebook (Period ${studentPeriod})`;
            if (courseKey === "WD2") subtitleEl.innerText = `Viewing Advanced Web Design Gradebook (Period ${studentPeriod})`;
            if (courseKey === "CS") subtitleEl.innerText = `Viewing Computer Science Gradebook (Period ${studentPeriod})`;
        }

        const registryData = {};
        if (Array.isArray(data.assignments)) {
            data.assignments.forEach((assignment) => {
                const examIdKey = String(assignment.exam_id || '').trim();
                const titleKey = String(assignment.title || '').trim();
                const registryEntry = {
                    title: assignment.title || '',
                    maxPoints: assignment.total_points || 0,
                    dueDate: assignment.due_date || '',
                    instructions: assignment.instructions || '',
                    targetCourse: assignment.course_id || 'All'
                };

                if (examIdKey) registryData[examIdKey] = registryEntry;
                if (titleKey && !registryData[titleKey]) registryData[titleKey] = registryEntry;
            });
        }

        const myGrades = {};
        if (Array.isArray(data.assignments)) {
            data.assignments.forEach((assignment) => {
                const examIdKey = String(assignment.exam_id || '').trim();
                const titleKey = String(assignment.title || '').trim();
                const entry = {
                    score: assignment.score,
                    timestamp: assignment.timestamp,
                    exam_id: examIdKey,
                    title: titleKey
                };

                if (examIdKey) myGrades[examIdKey] = entry;
                if (titleKey && !myGrades[titleKey]) myGrades[titleKey] = entry;
            });
        }

        const allKeys = new Set(Object.keys(myGrades).filter(k => k !== 'lastSubmitDate' && k !== 'uid'));
        Object.keys(registryData).forEach(key => allKeys.add(key));
            
const keys = Array.from(allKeys)
            .filter(key => isAssignmentVisible(key, studentPeriod, registryData))
            .sort();
            
calculateGradeStats(keys, myGrades);
        calculateBadges(keys, myGrades);
        renderGradeTable(keys, myGrades, user.student_id, registryData, studentPeriod);
        renderProficiencyScales(keys, myGrades, user.student_id, courseKey, saData.assessments);
        
        // Render self-assessment chart with BOTH perceived (self-assessment) AND actual (exam) levels
        if (saData.assessments) {
            renderSelfAssessmentChart(saData.assessments, courseKey, myGrades);
        }
            
    } catch (e) {
        console.error("Error loading grades:", e);
    }
}

function calculateGradeStats(keys, myGrades) {
    let totalEarned = 0;
    let totalPossible = 0;
    let completed = 0;
    
    keys.forEach(key => {
        if (myGrades[key] !== undefined && myGrades[key] !== null) {
            const max = parsePts(key); 
            const score = typeof myGrades[key] === 'object' ? myGrades[key].score : myGrades[key];
            
            if (score !== "Submitted" && score !== "") {
                totalPossible += max;
                totalEarned += Number(score);
                completed++;
            }
        }
    });
    
    const percent = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    
    let letterGrade = 'F';
    let gradeColor = 'text-danger';
    if (percent >= 90) { letterGrade = 'A'; gradeColor = 'text-success'; }
    else if (percent >= 80) { letterGrade = 'B'; gradeColor = 'text-primary'; }
    else if (percent >= 70) { letterGrade = 'C'; gradeColor = 'text-secondary'; }
    else if (percent >= 60) { letterGrade = 'D'; gradeColor = 'text-warning'; }

    const statsContainer = document.getElementById('statsContainer');
    if (statsContainer) statsContainer.style.display = 'flex';

    const overallEl = document.getElementById('overallPercent');
    const letterEl = document.getElementById('overallLetter');
    const countEl = document.getElementById('completedCount');
    const pointsEl = document.getElementById('pointsEarned');
    const overallBadge = document.getElementById('overallBadge');

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

function calculateBadges(keys, myGrades) {
    const badgesContainer = document.getElementById('badgesContainer');
    const badgesCard = document.getElementById('badgesCard');
    
    if (!badgesContainer) return;
    if (badgesCard) badgesCard.classList.remove('d-none');

    let badgesHtml = '';
    let badgeCount = 0;

    const addBadge = (icon, type, title, desc) => {
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

        badgesHtml += `
            <div class="badge-item text-center p-2 rounded border shadow-sm ${badgeClass}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${desc}">
                <i class="${icon} fs-3 mb-1 ${textColorClass}"></i>
                <div class="small fw-bold lh-sm ${textColorClass}">${title}</div>
            </div>
        `;
        badgeCount++;
    };

    let totalPoints = 0;
    let totalSubmitted = 0;
    let perfectScores = 0;
    let platinumExams = 0;
    let goldExams = 0;
    let silverExams = 0;

    keys.forEach(key => {
        const grade = myGrades[key];
        if (grade) {
            const score = typeof grade === 'object' ? grade.score : grade;
            const max = parsePts(key); 
            
            if (score !== "Submitted" && score !== "") {
                totalSubmitted++;
                totalPoints += Number(score);

                if (key.toLowerCase().includes('exam') || key.toLowerCase().includes('summative') || key.toLowerCase().includes('project')) {
                    const percentage = max > 0 ? (Number(score) / max) * 100 : 0;
                    if (percentage >= 100) platinumExams++;
                    else if (percentage >= 85) goldExams++;
                    else if (percentage >= 75) silverExams++;
                } else {
                    if (Number(score) === max && max > 0) perfectScores++;
                }
            }
        }
    });

    if (totalSubmitted >= 1) addBadge('fas fa-shoe-prints', 'info', 'First Steps', 'Submitted your first assignment!');
    if (totalSubmitted >= 10) addBadge('fas fa-running', 'success', 'On a Roll', 'Submitted 10 assignments!');
    if (totalSubmitted >= 25) addBadge('fas fa-briefcase', 'platinum', 'Master Architect', `Turned in 25 total assignments!`);
    
    if (perfectScores >= 1) addBadge('fas fa-star', 'gold', 'Flawless', 'Achieved a perfect score!');
    if (perfectScores >= 5) addBadge('fas fa-star', 'diamond', 'Unstoppable', 'Achieved 5 perfect scores!');
    
    if (platinumExams >= 1) addBadge('fas fa-trophy', 'platinum', 'Platinum Exam', 'Scored 100% on a major exam!');
    else if (goldExams >= 1) addBadge('fas fa-trophy', 'gold', 'Gold Exam', 'Scored 85%+ on a major exam!');
    else if (silverExams >= 1) addBadge('fas fa-trophy', 'silver', 'Silver Exam', 'Scored 75%+ on a major exam!');

    if (totalPoints >= 100) addBadge('fas fa-gem', 'info', 'Century Club', 'Earned over 100 total points!');
    if (totalPoints >= 500) addBadge('fas fa-gem', 'success', '500 Club', 'Earned over 500 total points!');

    if (badgeCount === 0) {
        badgesHtml = '<div class="text-muted small fst-italic py-2 px-3">Complete assignments to unlock badges!</div>';
    }

    badgesContainer.innerHTML = badgesHtml;

    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) { return new bootstrap.Tooltip(tooltipTriggerEl); });
    }
}

function renderGradeTable(keys, myGrades, studentId, registryData, studentPeriod) {
    const thead = document.getElementById('gradeHead');
    const tbody = document.getElementById('gradeBody');
    if (!thead || !tbody) return;

    let headHtml = `<tr><th class="label-cell sticky-col font-monospace px-3 py-3 assignment-header">Assignment</th>`;
    keys.forEach(key => { 
        const displayLabel = key.replace(/Lab\s*/i, 'Ch ').replace(/CS Unit\s*/i, 'Unit ');
        let tooltipText = key;
        const regInfo = registryData[key];
        
        if (regInfo) {
            let dueDate = regInfo.dueDate || '';
            if (regInfo.periodDueDates && regInfo.periodDueDates[studentPeriod]) dueDate = regInfo.periodDueDates[studentPeriod];
            if (dueDate && dueDate !== '9999-99-99') {
                const [y, m, d] = dueDate.split('-');
                tooltipText += ` | Due: ${parseInt(m)}/${parseInt(d)}`;
            }
            if (regInfo.instructions) tooltipText += ` | Instructions: ${regInfo.instructions.replace(/"/g, "'")}`;
        }
        
        headHtml += `<th class="header-main-blue" data-bs-toggle="tooltip" data-bs-placement="top" title="${escapeHtml(tooltipText)}">
            <div class="h-100 d-flex flex-column align-items-center justify-content-end pb-2" style="cursor: help;">
                <span class="vertical-text mb-2">${displayLabel}</span>
            </div>
        </th>`; 
    });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    let bodyHtml = '';
    bodyHtml += `<tr><td class="label-cell sticky-col font-monospace fw-bold text-dark bg-light" style="font-size: 0.8rem;"><i class="fas fa-calendar-day text-warning me-1"></i> Due Date</td>`;
    keys.forEach(key => { 
        let dateText = '-';
        const regInfo = registryData[key];
        if (regInfo) {
            let dueDate = regInfo.dueDate || '';
            if (regInfo.periodDueDates && regInfo.periodDueDates[studentPeriod]) dueDate = regInfo.periodDueDates[studentPeriod];
            if (dueDate && dueDate !== '9999-99-99') {
                const [y, m, d] = dueDate.split('-');
                dateText = `${parseInt(m)}/${parseInt(d)}`;
            }
        }
        bodyHtml += `<td class="text-center align-middle fw-bold text-muted bg-light border-bottom" style="font-size:0.75rem;">${dateText}</td>`; 
    });
    bodyHtml += `<td class="empty-cell bg-light border-bottom"></td></tr>`;

    bodyHtml += `<tr><td class="label-cell sticky-col font-monospace fw-bold text-dark bg-light">Possible Points</td>`;
    keys.forEach(key => { 
        const max = parsePts(key); 
        bodyHtml += `<td class="text-center align-middle fw-bold text-muted bg-light border-bottom">${max}</td>`; 
    });
    bodyHtml += `<td class="empty-cell bg-light border-bottom"></td></tr>`;

    bodyHtml += `<tr><td class="label-cell sticky-col font-monospace fw-bold text-primary">My Score</td>`;
    keys.forEach(key => {
        const grade = myGrades[key];
        const isHighStakes = key.toLowerCase().includes('exam') || key.toLowerCase().includes('project') || key.toLowerCase().includes('milestone') || key.toLowerCase().includes('summative');
        const max = parsePts(key); 
        
        if (!grade || grade.score === "") {
            bodyHtml += `<td class="text-center align-middle">
                <button class="btn btn-sm btn-outline-primary fw-bold px-2 py-1 shadow-sm mark-done-btn" 
                    onclick="openTurnInModal('${studentId}', '${key.replace(/'/g, "\\'")}', this)" 
                    title="Click to turn in a link or mark as done!">
                    <i class="fas fa-paper-plane me-1"></i> Turn In
                </button>
            </td>`;
            return;
        }
        
        const score = typeof grade === 'object' ? grade.score : grade;
        const time = typeof grade === 'object' ? grade.timestamp : '';
        const studentNote = typeof grade === 'object' && grade.studentNote ? grade.studentNote : '';
        
        let display;
        let customStyle = "";
        let dateStr = '';
        if (time) {
            const d = new Date(time);
            dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        }

        if (score === "Submitted") {
            let noteIndicator = studentNote ? `<br><small class="text-primary text-truncate d-inline-block mt-1" style="max-width: 80px;" title="${escapeHtml(studentNote)}"><i class="fas fa-comment-dots"></i> Note attached</small>` : '';
            display = `<span class="badge bg-warning text-dark shadow-sm px-2 py-1" style="font-size: 0.75rem;"><i class="fas fa-clock me-1"></i> Pending</span>${noteIndicator}`;
            customStyle = "background-color: #fffbe6;";
        } else {
            const safeScore = (score !== undefined && score !== null) ? score : 0;
            display = (!isHighStakes && Number(safeScore) === max) ? '<span class="check-mark">✅</span>' : `<strong>${safeScore}</strong>`;
            if (isHighStakes && score !== "") {
                const pct = (Number(safeScore) / max) * 100;
                if (pct < 80) customStyle = "background-color: #FFF2CC;";
            }
        }
        bodyHtml += `<td style="${customStyle}">${display} <small class="d-block text-muted opacity-75 font-monospace mt-1">${dateStr}</small></td>`;
    });
    bodyHtml += `<td class="empty-cell"></td></tr>`;
    tbody.innerHTML = bodyHtml;
}

function getRankName(lvl) {
    if(lvl === 4) return "4.0 - Digital Architect";
    if(lvl === 3) return "3.0 - Practitioner";
    if(lvl === 2) return "2.0 - Apprentice";
    if(lvl === 1) return "1.0 - Novice";
    return "Not Rated Yet";
}

async function renderProficiencyScales(keys, myGrades, userId, courseKey, assessmentsArray) {
    const container = document.getElementById('proficiencyContainer');
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
        
        // FIX: Use CORRECT format for exam_id
        // CS uses "Unit1-PreScale" format
        // WD uses "ch1 Pre-Scale" format (with space, matching current grading format)
        let scaleExamId;
        if (isCS) {
            // Extract number: "unit1" -> "Unit1", "unit2" -> "Unit2", etc.
            const num = chapterLower.replace('unit', '');
            scaleExamId = `Unit${num}-PreScale`;
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
    } catch (e) { console.error(e); }
};

// --- SELF-ASSESSMENT CHART RENDERING ---
async function renderSelfAssessmentChart(assessmentsArray, courseKey, myGrades) {
    const chartCard = document.getElementById('chartCard');
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
    const actualLevelsData = [];
    
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
    
    // Destroy existing chart if any
    if (window.selfAssessChartInstance) {
        window.selfAssessChartInstance.destroy();
    }
    
    const ctx = document.getElementById('selfAssessChart');
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
    
    window.selfAssessChartInstance = new Chart(ctx, {
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
    } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', loadGrades);