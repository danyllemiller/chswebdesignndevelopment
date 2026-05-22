// /js/timeclock.js
/**
 * CHS Web Design & Computer Science - Professional Timeclock
 * Updated to use MariaDB API instead of Firebase
 */

let studentData = null;
let currentQuestion = null;

// ==============================================================================
// 1. HELPERS & CONFIGURATION
// ==============================================================================

function getLocalTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// 2-day rotation engine
function getTwoDayIndex() {
    const now = new Date();
    let startYear = now.getFullYear();
    if (now.getMonth() < 7) startYear--; 
    let current = new Date(startYear, 7, 1);
    let days = 0;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    while (current <= today) {
        if (current.getDay() !== 0 && current.getDay() !== 6) days++;
        current.setDate(current.getDate() + 1);
    }
    return Math.floor((days - 1) / 2);
}

// ==============================================================================
// 2. CORE LOGIC
// ==============================================================================

async function initTimeclock() {
    // Get student from localStorage (set during login)
    const userJson = localStorage.getItem('user');
    if (!userJson) return;
    studentData = JSON.parse(userJson);
    
    injectTimeclockUI();
    checkStatus();
}

async function checkStatus() {
    if (!studentData) return;

    // Call your server API to get the current mode
    const response = await fetch(`/api/timeclock/status?student_id=${studentData.student_id}`);
    const statusData = await response.json(); 

    const label = document.getElementById('tc-question-label');
    const optsContainer = document.getElementById('tc-options-container');
    const btn = document.getElementById('tc-submit-btn');

    window.timeclock.currentMode = statusData.mode; // Track globally

    if (statusData.mode === 'done') {
        document.getElementById('tc-form').style.display = 'none';
        document.getElementById('tc-success-msg').classList.remove('d-none');
        return;
    }

    if (statusData.mode === 'in') {
        // DETECT TRACK: CS vs WD
        const isCS = studentData.section_id.startsWith('CS');
        const category = isCS ? 'CS_IN' : 'WD_IN';
        const dayGroup = getTwoDayIndex();

        // Fetch Question from DB
        const qResp = await fetch(`/api/timeclock/question?type=${category}&group=${dayGroup}`);
        currentQuestion = await qResp.json();
        
        label.innerText = currentQuestion.question_text;
        const options = JSON.parse(currentQuestion.options);
        
        optsContainer.innerHTML = options.map((opt, i) => `
            <div class="form-check mb-2">
                <input class="form-check-input" type="radio" name="tc-radio" value="${opt}" id="opt${i}" required>
                <label class="form-check-label" for="opt${i}">${opt}</label>
            </div>
        `).join('');
        btn.innerText = "Submit & Clock In";
    } 
    else if (statusData.mode === 'out') {
        label.innerText = "Daily Reflection";
        optsContainer.innerHTML = `<textarea id="tc-out-answer" class="form-control" rows="3" required></textarea>`;
        btn.innerText = "Submit & Clock Out";
    }
}

async function handleTimeclockSubmit(e) {
    e.preventDefault();
    const mode = window.timeclock.currentMode;
    let answer = "";
    
    if (mode === 'in') {
        answer = document.querySelector('input[name="tc-radio"]:checked').value;
    } else {
        answer = document.getElementById('tc-out-answer').value;
    }

    await fetch('/api/timeclock/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            student_id: studentData.student_id, 
            mode: mode, 
            answer: answer 
        })
    });
    
    location.reload();
}

function injectTimeclockUI() {
    if (document.getElementById('tc-widget')) return;
    const uiHtml = `
    <div id="tc-widget" class="position-fixed bottom-0 end-0 m-4 z-3">
        <button class="btn btn-dark shadow-lg rounded-pill px-4 py-3" id="tc-widget-btn">Timeclock</button>
    </div>
    <div class="modal fade" id="timeclock-modal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">Employee Timecard</h5>
                </div>
                <div class="modal-body bg-light p-4">
                    <div id="tc-status-badge" class="badge bg-secondary mb-3 w-100 py-2">STATUS: IDLE</div>
                    <form id="tc-form">
                        <h6 id="tc-question-label" class="fw-bold text-dark mb-3"></h6>
                        <div id="tc-options-container" class="mb-4"></div>
                        <button type="submit" id="tc-submit-btn" class="btn btn-primary w-100 fw-bold py-3">Submit</button>
                    </form>
                    <div id="tc-success-msg" class="alert alert-success mt-3 d-none text-center fw-bold">Success!</div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', uiHtml);
    document.getElementById('tc-form').addEventListener('submit', handleTimeclockSubmit);
    document.getElementById('tc-widget-btn').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('timeclock-modal')).show();
    });
}

window.timeclock = { currentMode: "idle" };
document.addEventListener("DOMContentLoaded", initTimeclock);