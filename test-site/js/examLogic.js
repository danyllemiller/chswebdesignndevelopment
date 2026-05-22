/** /js/examLogic.js
 * WEB DESIGN & COMP SCI ADAPTIVE EXAM ENGINE
 * Handles dynamic question loading, adaptive weighting, and anti-cheat.
 */

// --- LIBRARIES & STYLES ---
const libs = [
    { id: 'jspdf-lib', src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' },
    { id: 'pdf-lib', src: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js' }
];

libs.forEach(lib => {
    if (!document.getElementById(lib.id)) {
        const s = document.createElement('script');
        s.id = lib.id; s.src = lib.src; s.async = false; document.head.appendChild(s);
    }
});

const customStyle = document.createElement('style');
customStyle.innerHTML = `
    @media print { body * { visibility: hidden; } #exam-container, #exam-container * { visibility: visible; } #exam-container { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }
    #dac-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: none; z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .dac-modal-content { background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.4); border: 3px solid var(--primary-color); }
`;
document.head.appendChild(customStyle);

// --- GLOBAL STATE ---
let examQuestions = [], userAnswers = {}, currentIndex = 0, chapterTitle = "", currentUser = null;

// --- NEW DB-ONLY INIT (The Bridge) ---
window.initExam = function(config) {
    examQuestions = config.questions.map(q => ({
        question: q.question_text || q.question,
        options: [q.option_a, q.option_b, q.option_c, q.option_d]
    }));
    chapterTitle = config.chapterTitle;
    renderAuthScreen();
};

// --- ADAPTIVE ENGINE ---
window.initAdaptiveExam = async function(config) {
    const { chapter, type } = config; 
    const totalQuestions = 25;
    let primaryWeight = (chapter <= 7) ? (1.0 - (chapter - 1) * 0.05) : 0.5;
    const primaryCount = Math.floor(totalQuestions * primaryWeight);
    const secondaryCount = totalQuestions - primaryCount;

    const pools = {};
    for (let i = 1; i <= chapter; i++) {
        const id = (type === 'web') ? `wd-ch${i}-exam` : `cs-u${i}-exam`;
        const resp = await fetch(`/api/questions?exam_id=${id}`);
        pools[i] = await resp.json();
    }

    let selected = [...pools[chapter].sort(() => 0.5 - Math.random()).slice(0, primaryCount)];
    let secondaryPool = [];
    for(let i=1; i < chapter; i++) { secondaryPool.push(...pools[i]); }
    selected.push(...secondaryPool.sort(() => 0.5 - Math.random()).slice(0, secondaryCount));

    examQuestions = selected.sort(() => 0.5 - Math.random()).map(q => ({
        question: q.question_text,
        options: [q.option_a, q.option_b, q.option_c, q.option_d]
    }));
    chapterTitle = config.chapterTitle;
    renderAuthScreen();
};

// --- UI & ENGINE ---
function renderAuthScreen() {
    const container = document.getElementById('exam-container');
    if(container) container.innerHTML = `<div class="text-center p-5"><h5>${chapterTitle}</h5><button onclick="startExam()" class="btn btn-primary btn-lg">Begin</button></div>`;
}

window.startExam = async function() {
    // SECURITY: Get User ID from your server API
    const email = prompt("Enter Username:");
    const res = await fetch('/api/verify-user', { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ studentEmail: email })
    });
    
    if (!res.ok) { alert("Unauthorized"); return; }
    currentUser = await res.json();

    // STRIP NAV & FOOTER
    const nav = document.querySelector('.sticky-top');
    const footer = document.querySelector('#footer-placeholder');
    if (nav) nav.style.display = 'none';
    if (footer) footer.style.display = 'none';

    document.getElementById('exam-container').innerHTML = `
        <div class="row">
            <div class="col-lg-5" id="quiz-pane"></div>
            <div class="col-lg-7 d-none d-lg-block"><iframe src="/student/notes.html" style="width:100%; height:80vh; border:none;"></iframe></div>
        </div>`;
    renderQuestion();
};

function renderQuestion() {
    const pane = document.getElementById('quiz-pane');
    if (!pane || !examQuestions[currentIndex]) return;
    
    const q = examQuestions[currentIndex];
    const optionsHtml = q.options.map((opt, i) => `
        <div class="card mb-2" onclick="selectOption(${i})" style="cursor:pointer;">
            <div class="card-body p-3">${opt}</div>
        </div>`).join('');
    pane.innerHTML = `<h4 class="mb-4">${q.question}</h4>${optionsHtml}`;
}

window.selectOption = function(i) { 
    userAnswers[currentIndex] = i; 
    currentIndex++;
    if(currentIndex < examQuestions.length) renderQuestion();
    else finishExam();
};

async function finishExam() {
    await fetch('/api/submit-exam', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            studentId: currentUser.user.studentId, 
            examId: 'wd-ch8-exam', 
            answers: userAnswers, 
            score: 100 
        })
    });
    document.getElementById('exam-container').innerHTML = `<div class="text-center p-5"><h3>Assessment Complete!</h3></div>`;
}