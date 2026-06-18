// File: /js/prof-scales.js
/**
 * Interactive Gateway Logic for Proficiency Scales
 * Translates student self-assessments and syncs with the MariaDB database.
 * Seamlessly handles both standalone Web Design routing and CS iframe integration.
 */

let currentSelfAssessment = 0;
let gatewayMode = 'pre'; // 'pre' or 'post'

// Automatically grab the Chapter/Unit name and ID from the document title
const unitTitle = document.title || 'Unknown Unit';
const chapterMatch = unitTitle.match(/(?:Chapter|Unit)\s*(\d+)/i);
const chapterNum = chapterMatch ? parseInt(chapterMatch[1]) : 1; 

function setupPostMode() {
    gatewayMode = 'post';
    const modeBadge = document.getElementById('mode-badge');
    if (modeBadge) {
        modeBadge.innerHTML = '<i class="fa-solid fa-flag-checkered me-1"></i> End of Unit Reflection';
        modeBadge.style.backgroundColor = 'var(--code-color, #588157)';
        modeBadge.style.color = '#ffffff';
    }
    
    const title = document.getElementById('action-title');
    const desc = document.getElementById('action-desc');
    if (title) title.innerText = "How much did you grow?";
    if (desc) desc.innerText = "Look at the scale below again. Where do you honestly feel you are at before taking the final exam?";
}

// --- VISUAL FIX: Force Header Text to be White against the gradient ---
document.addEventListener("DOMContentLoaded", () => {
    const headerElements = document.querySelectorAll('header h1, header p, .header-banner h1, .header-banner p');
    headerElements.forEach(el => {
        el.classList.remove('text-primary', 'text-dark', 'text-muted');
        el.style.setProperty('color', '#ffffff', 'important');
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('type') === 'post') {
        setupPostMode();
    }

    loadStudentScores();
});

// Refresh scores when the parent iframe controller signals that a quiz just completed
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'refresh_scores') {
        loadStudentScores();
    }
});

/**
 * Fetches the logged-in student's grades and unlocks the pre/post overlay panels
 * if a matching score already exists in the gradebook.
 */
async function loadStudentScores() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('user')); } catch(e) {}
    if (!user || !user.student_id) return;

    // Use data-unit attribute (CS pages) if present, else parse from title (WD pages)
    const bodyUnit = document.body.getAttribute('data-unit');
    const unitNum  = bodyUnit ? parseInt(bodyUnit) : chapterNum;

    try {
        const res = await fetch(`/api/student/grades?student_id=${encodeURIComponent(user.student_id)}`);
        if (!res.ok) return;
        const { responses = [] } = await res.json();

        // ── Pre-Assessment bar ─────────────────────────────────────────────
        // Matches: "Unit5-Pre", "Ch2 Pre-Assessment [15 pts]", etc.
        const preGrade = responses.find(g => {
            const id = g.exam_id || '';
            const hasUnit = new RegExp(`(unit\\s*0*${unitNum}[\\s\\-]|ch\\s*0*${unitNum}[\\s\\-\\[])`, 'i').test(id);
            return hasUnit && /pre/i.test(id) && !/post/i.test(id) && !/scale/i.test(id);
        });

        if (preGrade) {
            const score = parseFloat(preGrade.score) || 0;
            const total = parseFloat(preGrade.total_points) || 15;
            unlockBar('pre-system-overlay', 'pre-test-bar', 'pre-test-label', score, total);
        }

        // ── Post / Summative bar ───────────────────────────────────────────
        // Matches: "Unit5 Summative", "Unit5 Exam", "Ch2 Final", etc.
        const postGrade = responses.find(g => {
            const id = g.exam_id || '';
            const hasUnit = new RegExp(`(unit\\s*0*${unitNum}|ch\\s*0*${unitNum})`, 'i').test(id);
            return hasUnit && /summative|exam|final/i.test(id);
        });

        if (postGrade) {
            const score = parseFloat(postGrade.score) || 0;
            const total = parseFloat(postGrade.total_points) || 100;
            unlockBar('post-system-overlay', 'post-test-bar', 'post-test-label', score, total);
        }

    } catch(e) {
        console.warn('[prof-scales] Could not load grades:', e);
    }
}

/**
 * Removes the lock overlay and fills the progress bar with the student's score.
 * @param {string} overlayId  - e.g. 'pre-system-overlay'
 * @param {string} barId      - e.g. 'pre-test-bar'
 * @param {string} labelId    - e.g. 'pre-test-label'
 * @param {number} score      - raw score (e.g. 12)
 * @param {number} total      - max points (e.g. 15)
 */
function unlockBar(overlayId, barId, labelId, score, total) {
    const overlay = document.getElementById(overlayId);
    if (overlay) overlay.remove();

    const pct   = total > 0 ? score / total : 0;
    const level = pct * 4;

    const bar = document.getElementById(barId);
    if (bar) {
        bar.style.width = (pct * 100) + '%';
        bar.className   = 'progress-bar text-end pe-2 fw-bold';
        bar.style.setProperty('color', '#ffffff', 'important');
        if      (level >= 3.5) bar.style.backgroundColor = 'var(--code-color, #588157)';
        else if (level >= 2.5) bar.style.backgroundColor = 'var(--tertiary-color, #3a52a4)';
        else if (level >= 1.5) bar.style.backgroundColor = 'var(--file-name-color, #E07A5F)';
        else if (level  >  0)  bar.style.backgroundColor = 'var(--primary-color, #000099)';
        else                   bar.style.backgroundColor = 'var(--quaternary-color, #c0c0c0)';
    }

    const label = document.getElementById(labelId);
    if (label) {
        label.innerText = `${score} / ${total} pts`;
        label.classList.remove('fst-italic', 'text-muted', 'fw-normal');
        label.style.color      = '#212529';
        label.style.fontWeight = 'bold';
    }
}

// 1. Listen for setup commands from your parent website (used by Web Design)
window.addEventListener('message', (event) => {
    if (!event.data) return;

    // Setup the UI based on whether they are about to take the Pre-Test or the Final Exam
    if (event.data.action === "INIT_GATEWAY") {
        if (event.data.mode === 'post') {
            setupPostMode();
        }
        
        if (event.data.preTestScore && window.updateSystemBar) {
            window.updateSystemBar('pre-test-bar', 'pre-test-label', event.data.preTestScore);
        }
    }
});

// 2. Handle Student Interaction
window.setSelfAssessment = function(level) {
    currentSelfAssessment = level;
    
    const bar = document.getElementById('self-assess-bar');
    if (bar) {
        bar.style.width = ((level / 4) * 100) + '%';
        bar.innerText = level.toFixed(1);
    }

// Apply custom theme colors based on level using strict inline variables
    document.querySelectorAll('.self-assess-btn').forEach(btn => {
        const val = parseFloat(btn.dataset.val);

        // Force reset to default white/gray
        btn.style.backgroundColor = '#ffffff';
        btn.style.color = '#6c757d';
        btn.style.border = '2px solid var(--quaternary-color, #c0c0c0)';
        btn.style.boxShadow = 'none';
        btn.style.transform = 'none';

        // Apply highlighted state to selected level and below
        if (val <= level) {
            btn.style.color = '#ffffff';
            if (val === 4.0) { 
                btn.style.backgroundColor = 'var(--code-color, #588157)'; 
                btn.style.border = '3px solid var(--code-color, #588157)'; 
            }
            else if (val === 3.0) { 
                btn.style.backgroundColor = 'var(--tertiary-color, #3a52a4)'; 
                btn.style.border = '3px solid var(--tertiary-color, #3a52a4)'; 
            }
            else if (val === 2.0) { 
                btn.style.backgroundColor = 'var(--file-name-color, #E07A5F)'; 
                btn.style.border = '3px solid var(--file-name-color, #E07A5F)'; 
            }
            else if (val === 1.0) { 
                btn.style.backgroundColor = 'var(--primary-color, #000099)'; 
                btn.style.border = '3px solid var(--primary-color, #000099)'; 
            }
            else { 
                btn.style.backgroundColor = 'var(--quaternary-color, #c0c0c0)'; 
                btn.style.border = '3px solid var(--quaternary-color, #c0c0c0)'; 
            }
            // Add scale effect to clearly show selection
            btn.style.transform = 'scale(1.15)';
            btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            btn.style.zIndex = '10';
            btn.style.position = 'relative';
        }
    });

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
    }
}

// 3. Update Visual Bars dynamically
window.updateSystemBar = function(barId, labelId, score) {
    const bar = document.getElementById(barId);
    const label = document.getElementById(labelId);
    if (!bar || !label) return;

    // THE NUCLEAR FIX: Completely delete the lock screen out of the DOM!
    let overlayId = null;
    if (barId === 'pre-test-bar') overlayId = 'pre-system-overlay';
    if (barId === 'post-test-bar') overlayId = 'post-system-overlay';
    
    if (overlayId) {
        const overlay = document.getElementById(overlayId);
        if (overlay) overlay.remove(); 
    }

    bar.style.width = ((score / 4) * 100) + '%';
    label.innerText = "Level " + score.toFixed(1);
    
    label.classList.remove('fst-italic', 'text-muted', 'fw-normal');
    label.style.color = '#212529';
    label.style.fontWeight = 'bold';

    // MATCH CUSTOM SITE COLORS: Bypass CSS classes and force inline styles
    bar.className = 'progress-bar text-end pe-2 fw-bold'; 
    bar.style.setProperty('color', '#ffffff', 'important');

    if (score >= 3.5) bar.style.backgroundColor = 'var(--code-color, #588157)'; // Architect (Green)
    else if (score >= 2.5) bar.style.backgroundColor = 'var(--tertiary-color, #3a52a4)'; // Practitioner (Tertiary Blue)
    else if (score >= 1.5) bar.style.backgroundColor = 'var(--file-name-color, #E07A5F)'; // Apprentice (Orange)
    else if (score > 0) bar.style.backgroundColor = 'var(--primary-color, #000099)'; // Novice (Deep Blue)
    else bar.style.backgroundColor = 'var(--quaternary-color, #c0c0c0)'; // Pending (Gray)
}

// 4. Send Data to MariaDB and Parent Window
window.submitToGateway = async function() {
    if (currentSelfAssessment === 0) return;
    
    const btn = document.getElementById('submit-btn');
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Saving...';
    }

// Retrieve user data from localStorage
    let user = null;
    try { user = JSON.parse(localStorage.getItem('user')); } catch(e) {}
    
    // A. SAVE TO MARIADB (if logged in)
    if (user && user.student_id) {
        // Pre-scale always gives full 10 points when completed
        // STANDARDIZED FORMAT: matches cs-interactive.js (no space between Unit and number)
        const preScaleExamId = gatewayMode === 'pre'
            ? 'Unit' + chapterNum + ' Pre-Scale'
            : 'Unit' + chapterNum + ' Post-Scale';
        
        console.log("SYNCING TO GRADEBOOK:", user.student_id, preScaleExamId, "10 points");
        
        // A.1: Save self-assessment level to self_assessments table
        try {
            const saRes = await fetch('/api/student/save-self-assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: user.student_id,
                    chapter_id: chapterNum,
                    level: currentSelfAssessment
                })
            });
            const saData = await saRes.json();
            console.log("Self-assessment save result:", saData);
        } catch(e) {
            console.error("Self-assessment save failed:", e);
        }
        
// A.2: SYNC PRE-SCALE TO GRADEBOOK - 10 POINTS with keep-highest logic
        try {
            // Check existing grade first and keep highest
            let shouldSave = true;
            const gradesRes = await fetch(`/api/student/grades?student_id=${encodeURIComponent(user.student_id)}`);
            if (gradesRes.ok) {
                const gradesData = await gradesRes.json();
                const existing = (gradesData.responses || []).find(r => r.exam_id === preScaleExamId);
                if (existing && Number(existing.score) > 10) {
                    shouldSave = false;
                    console.log("Gradebook: Keeping higher existing score:", existing.score, "vs new: 10");
                }
            }
            if (shouldSave) {
                const examRes = await fetch('/api/submit-exam', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_id: user.student_id,
                        exam_id: preScaleExamId,
                        score: 10,
                        total_points: 10
                    })
                });
const examData = await examRes.json();
                console.log("GRADEBOOK SYNC RESULT:", examData);

                // SAVE TO LOCALSTORAGE FOR PROGRESS CHART - Store self-assessment history
                try {
                    const historyKey = 'cs_self_assessment_history';
                    const stored = JSON.parse(localStorage.getItem(historyKey) || '{}');
                    stored['unit' + chapterNum] = {
                        level: currentSelfAssessment,
                        mode: gatewayMode,
                        timestamp: Date.now()
                    };
localStorage.setItem(historyKey, JSON.stringify(stored));
                    console.log("Self-assessment saved to localStorage:", stored);
                } catch(e) { console.warn("localStorage save failed:", e); }

                // Also alert so teacher can see it's working
                if(examData.success) {
                    alert("✅ Pre-Scale saved! 10 points recorded in gradebook for " + user.student_id);
                }
            }
        } catch(e) {
            console.error("Gradebook sync FAILED:", e);
            alert("ERROR syncing to gradebook: " + e.message);
        }
    } else {
        console.error("NO USER DATA - cannot sync to gradebook");
    }

    // B. CS NOTEBOOK INTEGRATION: If loaded inside an iframe, tell the parent
    if (window !== window.top) {
        window.parent.postMessage({
            type: "scale_complete",
            action: "GATEWAY_COMPLETE",
            unit: unitTitle,
            mode: gatewayMode,
            score: currentSelfAssessment
        }, "*");
    } else {
        // C. WEB DESIGN INTEGRATION: Standalone page redirect
        window.parent.postMessage({
            action: "GATEWAY_COMPLETE",
            unit: unitTitle,
            mode: gatewayMode,
            score: currentSelfAssessment
        }, "*");
    }
    
    // D. Visual Feedback & Navigation
    setTimeout(() => {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check me-2"></i> Saved & Synced!';
            btn.style.backgroundColor = 'var(--code-color, #588157)';
            btn.style.borderColor = 'var(--code-color, #588157)';
            btn.style.color = '#ffffff';
            
            setTimeout(() => {
                if (gatewayMode === 'pre') {
                    const fileName = window.location.pathname.split('/').pop();
                    window.top.location.href = `/pre-assessments/${fileName}`;
                } else {
                    btn.innerHTML = 'Save & Continue <i class="fas fa-arrow-right ms-2"></i>';
                    btn.style.backgroundColor = 'var(--primary-color)';
                    btn.style.borderColor = 'var(--primary-color)';
                }
            }, 2000); 
        }
    }, 1000); 
}
