// File: /js/prof-scales-cs-firebase.js
/**
 * REUSABLE MARIADB LOGIC FOR COMPUTER SCIENCE PROFICIENCY SCALES
 * MIGRATED: Firebase removed. Uses MariaDB API + auth-guard.js.
 * Automatically detects the Unit Number via the body's data-unit attribute.
 */

// Pull the unit number dynamically from the HTML body tag
const unitNum = parseInt(document.body.getAttribute('data-unit') || "1", 10);

// ==========================================
// AUTH GUARD (MariaDB / auth-guard.js)
// ==========================================
function waitForAuth(timeout = 8000) {
    return new Promise((resolve) => {
        if (window.dacAuthData) { resolve(window.dacAuthData); return; }
        const handler = () => { resolve(window.dacAuthData); };
        document.addEventListener('authComplete', handler, { once: true });
        setTimeout(() => {
            document.removeEventListener('authComplete', handler);
            resolve({ isAuthenticated: false, isTeacher: false });
        }, timeout);
    });
}

function parsePts(name) {
    const ptsMatch = name.match(/[\[\(](\d+)\s*pts?[\]\)]/i);
    if (ptsMatch) return parseInt(ptsMatch[1], 10);
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pre-test') || lowerName.includes('pretest') || lowerName.includes('diagnostic') || lowerName.includes('pre-assessment')) return 10;
    if (lowerName.includes('exam') || lowerName.includes('summative')) return 20;
    return 100;
}

function calculateProficiencyLevel(score, max) {
    if (score === "Submitted" || score === "" || max === 0) return 0;
    const pct = Number(score) / max;
    if (pct >= 0.90) return 4.0;
    if (pct >= 0.70) return 3.0;
    if (pct >= 0.40) return 2.0;
    return 1.0;
}

// ==========================================
// AUTO-LOAD ON PAGE LOAD
// ==========================================
async function init() {
    const authData = await waitForAuth();
    if (!authData.isAuthenticated) return;

    let storedUser = {};
    try { storedUser = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) {}
    const studentId = storedUser.student_id;
    if (!studentId) return;

    try {
        // A. Fetch grades and update pre-test + summative bars
        const gradeRes = await fetch(`/api/student/grades?student_id=${encodeURIComponent(studentId)}`);
        if (gradeRes.ok) {
            const gradeData = await gradeRes.json();
            const responses = gradeData.responses || [];

            const preEntry = responses.find(r => {
                const name = (r.title || r.exam_id || '').toLowerCase();
                const hasUnit = name.includes(`unit ${unitNum}`) || name.includes(`unit${unitNum}-`) || name.includes(`unit ${unitNum}-`);
                const hasPre = name.includes('pre') || name.includes('diagnostic');
                return hasUnit && hasPre;
            });

            if (preEntry) {
                const score = preEntry.score;
                const max = preEntry.total_points || parsePts(preEntry.title || preEntry.exam_id || '');
                const lvl = calculateProficiencyLevel(score, max || 10);
                if (window.updateSystemBar) window.updateSystemBar('pre-test-bar', 'pre-test-label', lvl);
            }

            const postEntry = responses.find(r => {
                const name = (r.title || r.exam_id || '').toLowerCase();
                const hasUnit = name.includes(`unit ${unitNum}`) || name.includes(`unit${unitNum}-`) || name.includes(`unit ${unitNum}-`);
                const hasPost = name.includes('summative') || name.includes('exam') || name.includes('project');
                return hasUnit && hasPost;
            });

            if (postEntry) {
                const score = postEntry.score;
                const max = postEntry.total_points || parsePts(postEntry.title || postEntry.exam_id || '');
                const lvl = calculateProficiencyLevel(score, max || 20);
                if (window.updateSystemBar) window.updateSystemBar('post-test-bar', 'post-test-label', lvl);
            }
        }

        // B. Fetch self-assessment for this unit (chapter_id = unitNum for CS)
        const saRes = await fetch(`/api/student/self-assessments?student_id=${encodeURIComponent(studentId)}`);
        if (saRes.ok) {
            const saData = await saRes.json();
            const assessments = saData.assessments || [];
            const thisUnit = assessments.find(a => String(a.chapter_id) === String(unitNum));
            if (thisUnit && window.setSelfAssessment) {
                window.setSelfAssessment(parseFloat(thisUnit.level));
            }
        }
    } catch (err) {
        console.error("[ProfScale Database] Error fetching data:", err);
    }
}

init();

// ==========================================
// SAVE SELF-ASSESSMENT (called by HTML onclick)
// ==========================================
window.saveToFirebase = async function(level) {
    let storedUser = {};
    try { storedUser = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) {}
    const studentId = storedUser.student_id;
    if (!studentId) return;

    const btn = document.getElementById('submit-btn');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Saving to Database...';

    try {
        const res = await fetch('/api/student/save-self-assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, chapter_id: unitNum, level: parseFloat(level) })
        });
        if (!res.ok) throw new Error('Save failed');

        if (btn) {
            btn.innerHTML = '<i class="fas fa-check me-2"></i> Saved Successfully!';
            btn.style.backgroundColor = 'var(--code-color)';
            setTimeout(() => {
                btn.innerHTML = 'Save & Continue <i class="fas fa-arrow-right ms-2"></i>';
                btn.style.backgroundColor = 'var(--primary-color)';
                if (window.submitToGateway) window.submitToGateway();
            }, 1000);
        }
    } catch (e) {
        console.error("Save failed:", e);
        if (btn) btn.innerHTML = 'Error Saving. Check Connection.';
    }
};
