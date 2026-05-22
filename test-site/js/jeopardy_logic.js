// --- JEOPARDY GAME ENGINE ---
// Extracted from review_games_logic.js
// This handles the Bootstrap Modal-based Jeopardy game (buttons with data attributes)

const Jeopardy = (() => {
    let modal;
    let currentBtn = null;
    let teamCount = 0;

    function init() {
        const board = document.getElementById('jeopardy-board');
        const modalEl = document.getElementById('jeopardyModal');
        const scoreboard = document.getElementById('jeopardy-scoreboard');
        
        // If essential elements are missing, stop (prevents errors on non-Jeopardy pages)
        if (!board || !modalEl) return;

        // Initialize Bootstrap Modal
        // We check if bootstrap is available to avoid errors
        if (typeof bootstrap !== 'undefined') {
            modal = new bootstrap.Modal(modalEl);
        } else {
            console.error("Bootstrap 5 is required for Jeopardy Modal");
            return;
        }

        // Init Scoreboard "Add Team" Button
        const addTeamBtn = document.getElementById('jeopardy-add-team');
        if(addTeamBtn) {
            // Remove old listener to prevent duplicates if init is called twice
            const newBtn = addTeamBtn.cloneNode(true);
            addTeamBtn.parentNode.replaceChild(newBtn, addTeamBtn);
            
            newBtn.addEventListener('click', () => {
                teamCount++;
                const div = document.createElement('div');
                div.className = 'col-md-3 mb-2';
                div.innerHTML = `
                    <div class="team-card">
                        <div class="team-name" contenteditable="true">Team ${teamCount}</div>
                        <div class="team-score" id="j-score-${teamCount}">0</div>
                        <div>
                            <button class="btn btn-sm btn-success" onclick="Jeopardy.award(${teamCount}, true)">+</button>
                            <button class="btn btn-sm btn-danger" onclick="Jeopardy.award(${teamCount}, false)">-</button>
                        </div>
                    </div>`;
                scoreboard.appendChild(div);
            });
        }

        // Board Click Delegation
        // We use a clone/replace trick or checking if listener exists to avoid duplicates would be complex,
        // so we simply rely on the fact that this init usually runs once on load.
        // For safety in single-page-app styles, we can remove the listener if we stored the reference, 
        // but simple overwriting or just adding is fine for this context.
        board.addEventListener('click', handleBoardClick);

        // Check Answer Button Logic
        const checkBtn = document.getElementById('j-check-btn');
        const userInput = document.getElementById('j-user-input');
        const revealBtn = document.getElementById('j-reveal-btn');
        const resetBtn = document.getElementById('jeopardy-reset-btn'); // If exists

        if(checkBtn) checkBtn.onclick = performCheck;
        
        if(userInput) {
            userInput.onkeypress = (e) => {
                if(e.key === 'Enter') performCheck();
            };
        }

        if(revealBtn) {
            revealBtn.onclick = () => {
                const ansEl = document.getElementById('j-modal-answer');
                if(ansEl) ansEl.classList.remove('d-none');
                if(currentBtn) {
                    currentBtn.classList.add('btn-secondary');
                    // Ensure it stays disabled/visited
                    currentBtn.disabled = true;
                }
            };
        }
        
        if(resetBtn) resetBtn.onclick = resetGame;
    }

    function handleBoardClick(e) {
        if(e.target.classList.contains('question-btn')) {
            currentBtn = e.target;
            
            // Disable button visually immediately
            currentBtn.disabled = true;
            currentBtn.classList.add('btn-secondary'); 
            currentBtn.classList.remove('btn-primary'); 
            
            const q = currentBtn.dataset.question;
            const a = currentBtn.dataset.answer;
            const v = currentBtn.dataset.value;
            
            // Populate Modal
            document.getElementById('j-modal-title').textContent = `For ${v} Points`;
            document.getElementById('j-modal-question').textContent = q;
            
            // Add hint if missing
            if(!document.getElementById('j-hint-text')) {
                 const hint = document.createElement('p');
                 hint.id = 'j-hint-text';
                 hint.className = 'text-muted small fst-italic';
                 hint.textContent = "(Answer in the form of a question: Who is... / What is...)";
                 document.getElementById('j-modal-question').after(hint);
            }

            // Setup Answer section (hidden)
            const ansEl = document.getElementById('j-modal-answer');
            ansEl.textContent = a; 
            ansEl.classList.add('d-none');
            
            // Reset Inputs
            const input = document.getElementById('j-user-input');
            const feedback = document.getElementById('j-feedback');
            const awardSection = document.getElementById('j-award-section');
            
            if(input) input.value = '';
            if(feedback) {
                feedback.textContent = '';
                feedback.className = ''; 
            }
            if(awardSection) awardSection.classList.add('d-none');
            
            if(modal) modal.show();
        }
    }

    // Check Answer Logic
    function performCheck() {
        const userAnsEl = document.getElementById('j-user-input');
        if(!userAnsEl) return;
        
        const userAns = userAnsEl.value.trim();
        const correctAns = currentBtn ? currentBtn.dataset.answer.toLowerCase() : "";
        const feedback = document.getElementById('j-feedback');
        
        // Regex to ensure "What is/Who is" format
        const questionFormatRegex = /^(who|what|where|when)\s+(is|are|was|were)\s+/i;
        
        if (!questionFormatRegex.test(userAns)) {
            feedback.textContent = "Please phrase your answer in the form of a question (e.g., 'What is HTML?').";
            feedback.className = "text-warning fw-bold";
            return; 
        }

        // Clean up answer for comparison
        let cleanUserAns = userAns.replace(questionFormatRegex, '').toLowerCase().trim();
        cleanUserAns = cleanUserAns.replace(/[.,?!]+$/, "");
        
        let cleanCorrect = correctAns.replace(/<[^>]*>?/gm, ''); // Remove HTML tags from data-answer if any
        cleanCorrect = cleanCorrect.toLowerCase().trim();
        
        // Loose comparison check
        if (cleanUserAns.length > 1 && (cleanCorrect.includes(cleanUserAns) || cleanUserAns.includes(cleanCorrect))) {
            feedback.textContent = "Correct! Award points below.";
            feedback.className = "text-success fw-bold";
            document.getElementById('j-award-section').classList.remove('d-none');
        } else {
            feedback.textContent = `Incorrect. (Your core answer: "${cleanUserAns}")`;
            feedback.className = "text-danger fw-bold";
        }
    }
    
    function resetGame() {
         if(confirm("Reset Jeopardy board and scores?")) {
             const allBtns = document.querySelectorAll('#jeopardy-board .question-btn');
             allBtns.forEach(btn => {
                 btn.disabled = false;
                 btn.classList.remove('btn-secondary');
                 btn.classList.add('question-btn'); // Ensure class is correct
             });
             const scores = document.querySelectorAll('.team-score');
             scores.forEach(s => s.textContent = '0');
         }
    }

    function award(id, add) {
        const el = document.getElementById(`j-score-${id}`);
        if(el) {
            let val = parseInt(el.textContent);
            // Default step is 100, logic could be enhanced to use current button value if needed
            // For now, simple +/- 100 as per original logic
            val += add ? 100 : -100;
            el.textContent = val;
        }
    }

    return {
        init,
        award,
        resetGame 
    };
})();

// Initialize on load if elements exist
document.addEventListener('DOMContentLoaded', Jeopardy.init);

// Expose globally
window.Jeopardy = Jeopardy;