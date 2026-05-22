// js/student-grades.js
/**
 * CHS Web Design & CS - Student Grades Controller
 * This script securely fetches a student's individual grades, calculates their standard-based 
 * proficiency percentages, and dynamically renders their achievements.
 * FIX: Removed CS Student lockout block so both classes can access this dashboard!
 */

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, appId } from "./firebase-init.js";

// --- SECURITY HELPER ---
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

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

let currentTurnInState = null; // Stores target info while modal is open

// HELPER: Mimics Teacher Gradebook logic to hide CS assignments from WD students and vice versa!
function isAssignmentVisible(name, period, registryData) {
    if (!period || period === 'Teacher') return true;
    
    // 1. Check if the Teacher explicitly locked this to a specific course
    if (registryData[name] && registryData[name].targetCourse) {
        const target = registryData[name].targetCourse;
        if (target !== 'All' && !period.includes(target)) {
            return false;
        }
    }

    // 2. Intelligent Auto-Parsing Fallback
    const lowerName = name.toLowerCase();
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

async function loadGrades(user) {
    if (!user || !user.email) return; 
    
    const username = user.email.split('@')[0].toLowerCase();
    const rosterRef = collection(db, 'artifacts', appId, 'public', 'data', 'roster');
    
    try {
        const q = query(rosterRef, where("username", "==", username));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            const studentData = snap.docs[0].data();
            if (!studentData || typeof studentData !== 'object') {
                console.error("CRITICAL: Student data is malformed or undefined.");
                return;
            }
            
            const studentId = studentData.studentId || snap.docs[0].id; 
            if (!studentId) {
                console.error("CRITICAL: No valid student ID found. Database lookup aborted.");
                return;
            }

            // --- Update UI with Name and Course ---
            const welcomeEl = document.getElementById('welcomeMessage');
            if (welcomeEl) welcomeEl.innerText = `Welcome, ${studentData.firstName}!`;

            const subtitleEl = document.getElementById('userSubtitle');
            const studentPeriod = (studentData.period || "").trim().toUpperCase();
            let courseKey = "WD1"; 
            if(studentPeriod.includes("WD2")) courseKey = "WD2";
            if(studentPeriod.includes("CS")) courseKey = "CS";
            
            if (subtitleEl) {
                if(courseKey === "WD1") subtitleEl.innerText = `Viewing Web Design Gradebook (Period ${studentData.period})`;
                if(courseKey === "WD2") subtitleEl.innerText = `Viewing Advanced Web Design Gradebook (Period ${studentData.period})`;
                if(courseKey === "CS") subtitleEl.innerText = `Viewing Computer Science Gradebook (Period ${studentData.period})`;
            }

            // --- Fetch Grades AND Registry ---
            const gradeRef = doc(db, 'artifacts', appId, 'public', 'data', 'grades', String(studentId));
            const registryRef = doc(db, 'artifacts', appId, 'public', 'data', 'assignments', 'registry');
            
            const [gradeSnap, registrySnap] = await Promise.all([
                getDoc(gradeRef),
                getDoc(registryRef)
            ]);
            
            let myGrades = {};
            if (gradeSnap.exists()) {
                const gradeData = gradeSnap.data();
                myGrades = (gradeData && typeof gradeData === 'object') ? gradeData : {};
            }
            
            let allKeys = new Set(Object.keys(myGrades).filter(k => k !== 'lastSubmitDate' && k !== 'uid'));
            
            let registryData = {};
            // Adding registry assignments so manual gradebook items show up!
            if (registrySnap.exists()) {
                registryData = registrySnap.data();
                Object.keys(registryData).forEach(key => allKeys.add(key));
            }
            
            // SMART COURSE FILTER: Hides CS assignments from WD students and vice versa
            const keys = Array.from(allKeys)
                .filter(key => isAssignmentVisible(key, studentData.period, registryData))
                .sort();
            
            // Execute UI Builders
            calculateGradeStats(keys, myGrades);
            calculateBadges(keys, myGrades);
            
            // Passed studentId and registryData so we can attach it to the "Mark Done" buttons and hover tooltips!
            renderGradeTable(keys, myGrades, studentId, registryData, studentData.period);
            
            // Render the Master Growth Dashboard (Passes courseKey to determine CS vs WD)
            renderProficiencyScales(keys, myGrades, user.uid, courseKey);
            
        } else {
            console.error("No roster entry found for this user.");
        }
    } catch (e) {
        console.error("Error loading grades:", e);
    }
}

// THE ABSOLUTE SOURCE OF TRUTH FOR POINTS
function parsePts(name) {
    const ptsMatch = name.match(/[\[\(](\d+)\s*pts?[\]\)]/i);
    if (ptsMatch) return parseInt(ptsMatch[1], 10);

    const lowerName = name.toLowerCase();
    if (lowerName.includes('pre-test') || lowerName.includes('pretest') || lowerName.includes('pre-assessment') || lowerName.includes('preassessment') || lowerName.includes('diagnostic')) return 10;
    if (lowerName.includes('post test') || lowerName.includes('post-test') || lowerName.includes('formative') || lowerName.includes('assessment') || lowerName.includes('exam') || lowerName.includes('summative')) return 20;
    if (lowerName.includes('lab') || lowerName.includes('worksheet') || lowerName.includes('ch ') || lowerName.match(/ch\d+/) || lowerName.includes('unit')) return 25;
    
    return 100;
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

function renderGradeTable(keys, myGrades, studentId, registryData = {}, studentPeriod = '') {
    const thead = document.getElementById('gradeHead');
    const tbody = document.getElementById('gradeBody');
    if (!thead || !tbody) return;

    let headHtml = `<tr><th class="label-cell sticky-col font-monospace px-3 py-3 assignment-header">Assignment</th>`;
    keys.forEach(key => { 
        const displayLabel = key.replace(/Lab\s*/i, 'Ch ').replace(/CS Unit\s*/i, 'Unit ');
        
        // Smart Tooltips mapping registry logic for the student
        let tooltipText = key;
        const regInfo = registryData[key];
        
        if (regInfo) {
            let dueDate = regInfo.dueDate || '';
            if (regInfo.periodDueDates && regInfo.periodDueDates[studentPeriod]) {
                dueDate = regInfo.periodDueDates[studentPeriod];
            }
            if (dueDate && dueDate !== '9999-99-99') {
                const [y, m, d] = dueDate.split('-');
                tooltipText += ` | Due: ${parseInt(m)}/${parseInt(d)}`;
            }
            if (regInfo.instructions) {
                tooltipText += ` | Instructions: ${regInfo.instructions.replace(/"/g, "'")}`;
            }
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
    
    // NEW: Dedicated Due Date Row
    bodyHtml += `<tr><td class="label-cell sticky-col font-monospace fw-bold text-dark bg-light" style="font-size: 0.8rem;"><i class="fas fa-calendar-day text-warning me-1"></i> Due Date</td>`;
    keys.forEach(key => { 
        let dateText = '-';
        const regInfo = registryData[key];
        if (regInfo) {
            let dueDate = regInfo.dueDate || '';
            if (regInfo.periodDueDates && regInfo.periodDueDates[studentPeriod]) {
                dueDate = regInfo.periodDueDates[studentPeriod];
            }
            if (dueDate && dueDate !== '9999-99-99') {
                const [y, m, d] = dueDate.split('-');
                dateText = `${parseInt(m)}/${parseInt(d)}`;
            }
        }
        bodyHtml += `<td class="text-center align-middle fw-bold text-muted bg-light border-bottom" style="font-size:0.75rem;">${dateText}</td>`; 
    });
    bodyHtml += `<td class="empty-cell bg-light border-bottom"></td></tr>`;

    // Existing Possible Points Row
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
            // INJECTED: The Turn In Modal Button
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
            display = (!isHighStakes && Number(safeScore) === max) ? 
                '<span class="check-mark">✅</span>' : 
                `<strong>${safeScore}</strong>`;
            
            if (isHighStakes && score !== "") {
                const pct = (Number(safeScore) / max) * 100;
                if (pct < 80) {
                    customStyle = "background-color: #FFF2CC;";
                }
            }
        }

        bodyHtml += `<td style="${customStyle}">${display} <small class="d-block text-muted opacity-75 font-monospace mt-1">${dateStr}</small></td>`;
    });
    bodyHtml += `<td class="empty-cell"></td></tr>`;
    
    tbody.innerHTML = bodyHtml;

    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('#gradeHead [data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) { return new bootstrap.Tooltip(tooltipTriggerEl); });
    }
}

// TRIGGERS THE NEW MODAL INSTEAD OF INSTANT SAVE
window.openTurnInModal = function(studentId, assignmentName, btnElement) {
    if (!studentId || !assignmentName) return;
    
    currentTurnInState = {
        studentId: studentId,
        assignmentName: assignmentName,
        btnElement: btnElement
    };
    
    document.getElementById('turnInAssignmentTitle').innerText = assignmentName;
    document.getElementById('turnInNote').value = ""; // Clear old notes
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('turnInModal')) || new bootstrap.Modal(document.getElementById('turnInModal'));
    modal.show();
};

// HANDLES THE ACTUAL SAVE TO FIREBASE
async function processTurnIn() {
    if (!currentTurnInState) return;
    
    const { studentId, assignmentName, btnElement } = currentTurnInState;
    const studentNoteText = document.getElementById('turnInNote').value.trim();
    
    const btnSubmit = document.getElementById('btnConfirmTurnIn');
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
    btnSubmit.disabled = true;
    
    try {
        const gradeRef = doc(db, 'artifacts', appId, 'public', 'data', 'grades', studentId);
        const updatedTimestamp = new Date().toISOString();
        const max = parsePts(assignmentName);
        
        await setDoc(gradeRef, { 
            [assignmentName]: { 
                score: "Submitted", 
                timestamp: updatedTimestamp, 
                max: max,
                studentNote: studentNoteText // SECURELY ATTACHING THE NOTE
            } 
        }, { merge: true });
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('turnInModal'));
        modal.hide();
        
        // Optimistically update the UI so they don't have to refresh
        const td = btnElement.parentElement;
        let noteIndicator = studentNoteText ? `<br><small class="text-primary text-truncate d-inline-block mt-1" style="max-width: 80px;" title="${escapeHtml(studentNoteText)}"><i class="fas fa-comment-dots"></i> Note attached</small>` : '';
        td.innerHTML = `<span class="badge bg-warning text-dark shadow-sm px-2 py-1" style="font-size: 0.75rem;"><i class="fas fa-clock me-1"></i> Pending</span>${noteIndicator}<small class="d-block text-muted opacity-75 font-monospace mt-1">Just now</small>`;
        td.style.backgroundColor = "#fffbe6";
        
    } catch (error) {
        console.error("Error marking done:", error);
        alert("Failed to submit. Please try again.");
    } finally {
        btnSubmit.innerHTML = 'Submit';
        btnSubmit.disabled = false;
        currentTurnInState = null;
    }
}

// ============================================================================
// MASTER GROWTH DASHBOARD: Chart.js & Dynamic Roadmap
// ============================================================================
function getRankName(lvl) {
    if(lvl === 4) return "4.0 - Digital Architect";
    if(lvl === 3) return "3.0 - Practitioner";
    if(lvl === 2) return "2.0 - Apprentice";
    if(lvl === 1) return "1.0 - Novice";
    return "Not Rated Yet";
}

function calculateProficiencyLevel(score, max) {
    if (score === "Submitted" || score === "" || max === 0) return 0;
    const pct = Number(score) / max;
    if (pct >= 0.90) return 4.0;
    if (pct >= 0.70) return 3.0;
    if (pct >= 0.40) return 2.0;
    return 1.0;
}

async function loadChartJS() {
    return new Promise((resolve) => {
        if (window.Chart) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
    });
}

let growthChartInstance = null;

async function renderProficiencyScales(keys, myGrades, userId, courseKey) {
    let container = document.getElementById('proficiencyContainer');
    const gradebookDiv = document.querySelector('.gradebook-container');
    
    // GUARANTEE IT SITS BELOW THE GRADEBOOK!
    if (container && gradebookDiv) {
        gradebookDiv.parentNode.insertBefore(container, gradebookDiv.nextSibling);
    } else if (!container && gradebookDiv) {
        gradebookDiv.insertAdjacentHTML('afterend', '<div id="proficiencyContainer" class="mt-5 mb-5"></div>');
        container = document.getElementById('proficiencyContainer');
    }

    if (!container) return;

    // Course Specific Logic (WD vs CS)
    const isCS = (courseKey === "CS");
    const totalItems = isCS ? 5 : 16;
    const itemLabel = isCS ? "Unit" : "Chapter";
    const itemShortLabel = isCS ? "Unit" : "Ch";
    const dbDocName = isCS ? "computer_science" : "web_design";
    const keyPrefix = isCS ? "unit" : "ch";

    // Known Web Design Chapters Dictionary
    const wdUrls = {
        1: "join-the-developers-guild.html",
        2: "the-rules-how-not-to-get-sued.html",
        3: "the-blueprint.html",
        4: "the-why-intro-to-uiux.html",
        5: "the-bones-intro-to-html.html",
        6: "the-clothes-intro-to-css.html",
        7: "the-style-advanced-css-layout.html",
        8: "sights-sounds-making-it-pop-html-media.html",
        9: "the-brains-intro-to-javascript.html",
        10: "the-game-dev-advanced-js-game-logic.html",
        11: "the-cloud-collaboration-hosting.html",
        12: "the-manager-cms-platforms.html",
        13: "the-network-intro-to-apis.html",
        14: "the-brain-databases.html",
        15: "the-game-never-ends.html",
        16: "the-final-boss-going-live.html"
    };

    let selfAssessments = {};
    try {
        const saRef = doc(db, 'artifacts', appId, 'users', userId, 'self_assessments', dbDocName);
        const saSnap = await getDoc(saRef);
        if (saSnap.exists()) selfAssessments = saSnap.data();
    } catch (err) {
        console.error("Could not fetch self-assessments", err);
    }

    const itemsArray = Array.from({length: totalItems}, (_, i) => i + 1);
    
    const chartLabels = [];
    const preData = [];
    const postData = [];
    let cardsHtml = '<div class="row g-4">';

    itemsArray.forEach(item => {
        chartLabels.push(`${itemShortLabel} ${item}`);

        // SMART REGEX: Looks for either "Ch X" or "Unit X" based on course type
        const preKey = keys.find(k => {
            const name = k.toLowerCase();
            const hasItem = isCS ? name.match(new RegExp(`unit\\s*-?\\s*${item}\\b`, 'i')) : name.match(new RegExp(`ch(?:apter)?\\s*-?\\s*${item}\\b`, 'i'));
            const hasPre = name.includes('pre') || name.includes('diagnostic');
            return hasItem && hasPre;
        });

        let preLevelNum = 0;
        let chartPre = null; 
        let preScoreText = 'Pending';
        
        if (preKey && myGrades[preKey]) {
            const score = typeof myGrades[preKey] === 'object' ? myGrades[preKey].score : myGrades[preKey];
            const max = parsePts(preKey);
            if (score !== "Submitted" && score !== "") {
                preLevelNum = calculateProficiencyLevel(score, max);
                chartPre = preLevelNum;
                preScoreText = `${score}/${max}`;
            }
        }
        preData.push(chartPre);

        const sumKey = keys.find(k => {
            const name = k.toLowerCase();
            const hasItem = isCS ? name.match(new RegExp(`unit\\s*-?\\s*${item}\\b`, 'i')) : name.match(new RegExp(`ch(?:apter)?\\s*-?\\s*${item}\\b`, 'i'));
            const hasPost = name.includes('summative') || name.includes('exam') || name.includes('project');
            return hasItem && hasPost;
        });

        let tLevelNum = 0;
        let chartPost = null;
        let tScoreText = 'Pending';
        
        if (sumKey && myGrades[sumKey]) {
            const score = typeof myGrades[sumKey] === 'object' ? myGrades[sumKey].score : myGrades[sumKey];
            const max = parsePts(sumKey);
            if (score !== "Submitted" && score !== "") {
                tLevelNum = calculateProficiencyLevel(score, max);
                chartPost = tLevelNum;
                tScoreText = `${score}/${max}`;
            }
        }
        postData.push(chartPost);

        const selfLevel = selfAssessments[`${keyPrefix}${item}`] || 0;
        
        // Determine if they've interacted with this module at all
        const hasStarted = keys.some(k => {
            const name = k.toLowerCase();
            return isCS ? name.match(new RegExp(`unit\\s*-?\\s*${item}\\b`, 'i')) : name.match(new RegExp(`ch(?:apter)?\\s*-?\\s*${item}\\b`, 'i'));
        }) || selfLevel > 0 || preLevelNum > 0 || tLevelNum > 0;

        const targetUrl = isCS ? `cs-unit-${item}.html` : (wdUrls[item] || `chapter-${item}.html`);
        const headerLinkHtml = `
            <a href="/proficiencyScales/${targetUrl}" class="text-decoration-none" style="color: inherit;">
                ${itemLabel} ${item} Tracker <i class="fas fa-external-link-alt ms-1" style="font-size: 0.75rem;"></i>
            </a>
        `;

        if (!hasStarted) {
            cardsHtml += `
            <div class="col-md-6 col-lg-4">
                <div class="card shadow-sm h-100 border-secondary" style="border-width: 2px !important; opacity: 0.6; background-color: #f8f9fa;">
                    <div class="card-header bg-light text-muted fw-bold py-2 text-center">
                        ${headerLinkHtml}
                    </div>
                    <div class="card-body p-3 d-flex flex-column align-items-center justify-content-center text-center">
                        <i class="fas fa-lock fs-1 text-muted mb-3 opacity-50"></i>
                        <span class="fw-bold text-muted fs-5">Not Started</span>
                    </div>
                </div>
            </div>`;
        } else {
            cardsHtml += `
            <div class="col-md-6 col-lg-4">
                <div class="card shadow-sm h-100 border-primary" style="border-width: 2px !important;">
                    <div class="card-header bg-site-secondary text-primary fw-bold py-2 text-center">
                        ${headerLinkHtml}
                    </div>
                    <div class="card-body p-3">
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="small fw-bold text-muted">1. Baseline (Pre-Test):</span>
                            <span class="badge ${preLevelNum >= 3 ? 'bg-success' : (preLevelNum > 0 ? 'bg-warning text-dark' : 'bg-secondary')} px-2 py-1 shadow-sm">
                                ${preScoreText} ${preLevelNum ? `(Lvl ${preLevelNum})` : ''}
                            </span>
                        </div>

                        <div class="mb-3 p-2 bg-light rounded border border-secondary shadow-sm">
                            <span class="small fw-bold text-primary d-block mb-2 text-center">2. My Self-Rating:</span>
                            <div class="btn-group w-100 shadow-sm" role="group">
                                <button class="btn btn-sm ${selfLevel === 1 ? 'btn-danger fw-bold' : 'btn-outline-danger'}" onclick="saveSelfAssessment(${item}, 1, '${userId}', '${courseKey}')">1</button>
                                <button class="btn btn-sm ${selfLevel === 2 ? 'btn-warning fw-bold text-dark' : 'btn-outline-warning'}" onclick="saveSelfAssessment(${item}, 2, '${userId}', '${courseKey}')">2</button>
                                <button class="btn btn-sm ${selfLevel === 3 ? 'btn-info fw-bold text-dark' : 'btn-outline-info'}" onclick="saveSelfAssessment(${item}, 3, '${userId}', '${courseKey}')">3</button>
                                <button class="btn btn-sm ${selfLevel === 4 ? 'btn-success fw-bold' : 'btn-outline-success'}" onclick="saveSelfAssessment(${item}, 4, '${userId}', '${courseKey}')">4</button>
                            </div>
                            <div class="text-center mt-2">
                                <small class="fw-bold ${selfLevel ? 'text-primary' : 'text-muted'}">${getRankName(selfLevel)}</small>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <span class="small fw-bold text-dark">3. Final Teacher Score:</span>
                            <span class="badge ${tLevelNum >= 3 ? 'bg-success' : (tLevelNum > 0 ? 'bg-danger text-white' : 'bg-secondary')} px-2 py-1 shadow-sm">
                                ${tScoreText} ${tLevelNum ? `(Lvl ${tLevelNum})` : ''}
                            </span>
                        </div>
                        
                    </div>
                </div>
            </div>`;
        }
    });

    cardsHtml += '</div>';

    container.innerHTML = `
        <div class="d-flex align-items-center mb-4 border-bottom pb-2 mt-5">
            <i class="fas fa-chart-area fs-2 text-primary me-3"></i>
            <div>
                <h3 class="fw-bold text-dark mb-0">Master Growth Dashboard</h3>
                <p class="text-muted mb-0">Track your transition from Novice to Digital Architect across all ${totalItems} ${isCS ? 'units' : 'chapters'}.</p>
            </div>
        </div>
        
        <div class="card shadow-sm border-primary mb-5" style="border-width: 2px !important;">
            <div class="card-body">
                <h5 class="fw-bold text-primary mb-3 text-center">My Proficiency Journey</h5>
                <div style="height: 350px; position: relative;">
                    <canvas id="growthChartCanvas"></canvas>
                </div>
            </div>
        </div>

        ${cardsHtml}
    `;

    setTimeout(async () => {
        await loadChartJS();
        
        const canvas = document.getElementById('growthChartCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (growthChartInstance) {
            growthChartInstance.destroy();
        }
        
        growthChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: 'Baseline (Pre-Test)',
                        data: preData,
                        borderColor: '#c0c0c0', 
                        backgroundColor: '#c0c0c0',
                        borderDash: [5, 5], 
                        borderWidth: 2,
                        pointRadius: 4,
                        tension: 0.3,
                        spanGaps: true 
                    },
                    {
                        label: 'Mastery (Final Score)',
                        data: postData,
                        borderColor: '#000099', 
                        backgroundColor: '#000099',
                        borderWidth: 3,
                        pointRadius: 6,
                        tension: 0.3,
                        spanGaps: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 0,
                        max: 4.0,
                        ticks: { 
                            stepSize: 1,
                            callback: function(value) { return 'Lvl ' + value; }
                        },
                        title: {
                            display: true,
                            text: 'Proficiency Level',
                            font: { weight: 'bold' }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(1);
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 14, weight: 'bold' } }
                    }
                }
            }
        });
    }, 50);
}

// Ensure the courseKey is passed so CS self-assessments save to the correct DB doc
window.saveSelfAssessment = async function(itemNum, level, userId, courseKey) {
    try {
        const isCS = (courseKey === "CS");
        const dbDocName = isCS ? "computer_science" : "web_design";
        const keyPrefix = isCS ? "unit" : "ch";

        const ref = doc(db, 'artifacts', appId, 'users', userId, 'self_assessments', dbDocName);
        await setDoc(ref, { [`${keyPrefix}${itemNum}`]: level }, { merge: true });
        
        const u = auth.currentUser;
        if(u) loadGrades(u);
    } catch (e) {
        console.error("Error saving self assessment", e);
        alert("Failed to save self-assessment. Please check your connection.");
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) loadGrades(user);
});