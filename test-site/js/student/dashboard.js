// /js/student/dashboard.js
/**
 * CHS Web Design & CS - Student Grades Controller (MariaDB Version)
 */

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.replace('/login-test.html');
        return null;
    }
    return user;
}

// Logic to filter assignments based on course period
function isAssignmentVisible(name, period, registryData) {
    if (!period || period === 'Teacher') return true;
    
    if (registryData[name] && registryData[name].targetCourse) {
        const target = registryData[name].targetCourse;
        
        // FIX: If the target isn't 'All' and doesn't match the period string,
        // we check for a period-to-course mapping to override the hide.
        if (target !== 'All' && !period.includes(target)) {
            // Bridge logic: If student is WD1, allow G1 assignments. If WD2, allow G2.
            if (period.includes('WD1') && target.includes('G1')) return true;
            if (period.includes('WD2') && target.includes('G2')) return true;
            
            // If it still doesn't match, hide it.
            return false;
        }
    }

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
            <h6 id="turnInAssignmentTitle" class="text-dark fw-bold mb-3"></h6>
            <textarea id="turnInNote" class="form-control border-primary shadow-sm" rows="3" placeholder="Note for instructor..."></textarea>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
            <button type="button" id="btnConfirmTurnIn" class="btn btn-primary btn-sm px-4">Submit</button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('btnConfirmTurnIn')?.addEventListener('click', processTurnIn);
}
injectTurnInModal();

let currentTurnInState = null;

async function loadGrades() {
    const user = checkAuth();
    if (!user) return;

    try {
        const response = await fetch(`/api/student/grades?student_id=${user.student_id}`);
        const data = await response.json();
        const regResponse = await fetch('/api/admin/master-gradebook-data');
        const regData = await regResponse.json();
        
        const myGrades = {};
        if (data.responses) {
            data.responses.forEach(r => myGrades[r.exam_id] = { score: r.score, total_points: r.total_points });
        }

        // Filter assignments by period
        const allKeys = Object.keys(regData.assignments)
            .filter(key => isAssignmentVisible(key, user.section_id, regData.assignments));
        
        document.getElementById('userSubtitle').innerText = `Viewing Gradebook (Period ${user.section_id})`;
        
        calculateGradeStats(allKeys, myGrades, regData.assignments);
        renderGradeTable(allKeys, myGrades, user.student_id, regData.assignments);

    } catch (e) {
        console.error("Error loading MariaDB data:", e);
    }
}

function calculateGradeStats(keys, myGrades, assignments) {
    let totalEarned = 0, totalPossible = 0, completed = 0;
    
    keys.forEach(key => {
        if (myGrades[key]) {
            totalPossible += assignments[key].maxPoints;
            totalEarned += Number(myGrades[key].score);
            completed++;
        }
    });
    
    const percent = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    document.getElementById('overallPercent').innerText = percent + '%';
    document.getElementById('completedCount').innerText = `${completed} / ${keys.length}`;
    document.getElementById('pointsEarned').innerText = `${totalEarned} pts`;
    document.getElementById('statsContainer').style.display = 'flex';
}

function renderGradeTable(keys, myGrades, studentId, assignments) {
    const thead = document.getElementById('gradeHead');
    const tbody = document.getElementById('gradeBody');
    
    let headHtml = `<tr><th class="sticky-col">Assignment</th>`;
    keys.forEach(key => headHtml += `<th class="text-center">${key}</th>`);
    thead.innerHTML = headHtml + '</tr>';

    let bodyHtml = `<tr><td class="sticky-col">My Score</td>`;
    keys.forEach(key => {
        const grade = myGrades[key];
        if (!grade) {
            bodyHtml += `<td class="text-center"><button class="btn btn-sm btn-outline-primary" onclick="openTurnInModal('${studentId}', '${key}', this)">Turn In</button></td>`;
        } else {
            bodyHtml += `<td class="text-center">${grade.score}</td>`;
        }
    });
    tbody.innerHTML = bodyHtml + '</tr>';
}

window.openTurnInModal = function(studentId, assignmentName, btnElement) {
    currentTurnInState = { studentId, assignmentName, btnElement };
    document.getElementById('turnInAssignmentTitle').innerText = assignmentName;
    new bootstrap.Modal(document.getElementById('turnInModal')).show();
};

async function processTurnIn() {
    const { studentId, assignmentName } = currentTurnInState;
    const score = 0;
    const total_points = 0; 
    
    await fetch('/api/admin/save-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, exam_id: assignmentName, score, total_points })
    });
    location.reload();
}

document.addEventListener("DOMContentLoaded", loadGrades);