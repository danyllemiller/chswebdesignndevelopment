// --- MILLIONAIRE GAME ENGINE ---
// Extracted directly from review_games_logic.js for Chapter 7 usage
const Millionaire = (() => {
    // UI Elements (populated in init)
    let ui = {};
    
    let questions = [];
    let currentQuestionIndex = 0;
    
    // Check if elements exist (return dummy object if not, to prevent errors)
    if(!document.getElementById('mil-question')) return { init: () => {}, resetGame: () => {} };

    function init(qs) {
        // Clone and shuffle questions initially
        questions = shuffleArray([...qs]);
        
        // Bind UI Elements
        ui.question = document.getElementById('mil-question');
        ui.answers = document.getElementById('mil-answers');
        ui.ladder = document.getElementById('mil-ladder');
        ui.btn50 = document.getElementById('ll-fifty');
        ui.btnFriend = document.getElementById('ll-friend');
        ui.btnAudience = document.getElementById('ll-audience');
        
        // Bind Lifelines
        if(ui.btn50) ui.btn50.onclick = useFiftyFifty;
        if(ui.btnFriend) ui.btnFriend.onclick = usePhoneFriend;
        if(ui.btnAudience) ui.btnAudience.onclick = useAskAudience;

        buildLadder();
        loadQuestion();
    }

    function loadQuestion() {
        if(currentQuestionIndex >= questions.length || currentQuestionIndex >= 15) { 
            endGame(true);
            return; 
        }
        
        const q = questions[currentQuestionIndex];
        ui.question.innerHTML = q.question;
        ui.answers.innerHTML = '';
        
        // Clone answers to shuffle them without modifying original object
        // We need to track the 'correct' index. 
        // Strategy: Create objects { text: "Answer", isCorrect: boolean }
        let answerObjects = q.answers.map((ans, i) => ({ 
            text: ans, 
            isCorrect: (i === q.correct) 
        }));
        
        // Shuffle the answer objects
        answerObjects = shuffleArray(answerObjects);
        
        // Create answer buttons
        answerObjects.forEach((obj, i) => {
            const btn = document.createElement('button');
            btn.className = 'mil-answer-btn';
            btn.innerHTML = obj.text;
            // Store if this specific button is correct
            btn.dataset.isCorrect = obj.isCorrect; 
            btn.dataset.letter = String.fromCharCode(65 + i); // A, B, C, D
            btn.onclick = () => check(btn);
            ui.answers.appendChild(btn);
        });
        
        // Update Ladder UI
        // Ladder is usually built bottom-up (1 at bottom, 15 at top) or reverse.
        // Assuming IDs mil-level-0 to mil-level-14
        document.querySelectorAll('.mil-money-item').forEach(el => el.classList.remove('active'));
        const currentLevelId = `mil-level-${currentQuestionIndex}`;
        const currentLevelEl = document.getElementById(currentLevelId);
        if(currentLevelEl) currentLevelEl.classList.add('active');
    }

    function check(btn) {
        const isCorrect = btn.dataset.isCorrect === 'true';
        const allBtns = document.querySelectorAll('.mil-answer-btn');
        allBtns.forEach(b => b.disabled = true);

        if(isCorrect) {
            btn.classList.add('correct');
            setTimeout(() => { 
                currentQuestionIndex++; 
                loadQuestion(); 
            }, 1000);
        } else {
            btn.classList.add('wrong');
            // Highlight correct answer
            allBtns.forEach(b => {
                if(b.dataset.isCorrect === 'true') b.classList.add('correct');
            });
            setTimeout(() => { endGame(false); }, 1500);
        }
    }
    
    function endGame(won) {
        ui.question.innerHTML = won ? 
            "<h3 class='text-success'>YOU WIN! $1,000,000!</h3>" : 
            "<h3 class='text-danger'>GAME OVER</h3>";
        
        ui.answers.innerHTML = `
            <div class="text-center mt-3">
                <button class="btn btn-light btn-lg" onclick="Millionaire.resetGame()">Play Again</button>
            </div>
        `;
    }

    function buildLadder() {
        if(ui.ladder) {
            ui.ladder.innerHTML = '';
            const amounts = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
            // Render in reverse order so $1M is at top
            for (let i = amounts.length - 1; i >= 0; i--) {
                const li = document.createElement('li');
                li.className = 'mil-money-item';
                li.id = `mil-level-${i}`;
                li.innerHTML = `<span>${i+1}</span><span>$${amounts[i].toLocaleString()}</span>`;
                ui.ladder.appendChild(li); 
            }
        }
    }

    function resetGame() {
        currentQuestionIndex = 0;
        // Reshuffle questions for new game
        questions = shuffleArray(questions);
        
        // Re-enable lifelines
        [ui.btn50, ui.btnFriend, ui.btnAudience].forEach(btn => {
            if(btn) {
                btn.disabled = false;
                btn.style.visibility = 'visible';
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
        loadQuestion();
    }

    // --- LIFELINES ---
    function useFiftyFifty(e) {
        if (e && e.target) {
            e.target.disabled = true;
            e.target.style.opacity = '0.5';
            e.target.style.cursor = 'not-allowed';
        }
        
        const btns = Array.from(document.querySelectorAll('.mil-answer-btn'));
        const wrongBtns = btns.filter(b => b.dataset.isCorrect !== 'true');
        
        // Hide 2 wrong answers
        shuffleArray(wrongBtns); // Randomize which wrong ones to hide
        if(wrongBtns.length >= 2) {
            wrongBtns[0].style.visibility = 'hidden';
            wrongBtns[1].style.visibility = 'hidden';
        }
    }

    function usePhoneFriend(e) {
        if (e && e.target) {
            e.target.disabled = true;
            e.target.style.opacity = '0.5';
            e.target.style.cursor = 'not-allowed';
        }
        // Find the text of the correct answer
        const correctBtn = Array.from(document.querySelectorAll('.mil-answer-btn')).find(b => b.dataset.isCorrect === 'true');
        
        if (correctBtn) {
            const reasons = [
                "I remember learning this in class.",
                "I use this all the time.",
                "it's the only one that makes sense.",
                "I read about it recently."
            ];
            const randomReason = reasons[Math.floor(Math.random() * reasons.length)];
            
            alert(`Friend says: "I think it is ${correctBtn.textContent} because ${randomReason}"`);
        }
    }

    function useAskAudience(e) {
        if (e && e.target) {
            e.target.disabled = true;
            e.target.style.opacity = '0.5';
            e.target.style.cursor = 'not-allowed';
        }

        // 1. Determine Correct Answer
        const btns = Array.from(document.querySelectorAll('.mil-answer-btn'));
        // Find index of correct answer relative to current button order
        let correctIndex = -1;
        let visibleBtns = [];
        
        btns.forEach((btn, index) => {
            if (btn.style.visibility !== 'hidden') {
                visibleBtns.push(index);
                if (btn.dataset.isCorrect === 'true') correctIndex = index;
            }
        });

        // 2. Generate Votes (Total 1000)
        // High probability for correct answer
        let votes = new Array(btns.length).fill(0);
        let remaining = 1000;
        
        if (visibleBtns.length === 2) {
             // 50/50 case
             // Give correct answer ~70-80%
             let correctVotes = Math.floor(700 + Math.random() * 100);
             if (correctVotes > remaining) correctVotes = remaining;
             votes[correctIndex] = correctVotes;
             remaining -= correctVotes;
             
             // Give rest to the other visible button
             let otherIndex = visibleBtns.find(i => i !== correctIndex);
             votes[otherIndex] = remaining;
        } else {
             // Normal case (4 options)
             // Give correct answer ~50-60%
             let correctVotes = Math.floor(500 + Math.random() * 150);
             votes[correctIndex] = correctVotes;
             remaining -= correctVotes;
             
             // Distribute rest randomly among wrong answers
             let wrongIndices = visibleBtns.filter(i => i !== correctIndex);
             wrongIndices.forEach((wIndex, i) => {
                 if (i === wrongIndices.length - 1) {
                     votes[wIndex] = remaining; // Last one gets remainder
                 } else {
                     let v = Math.floor(Math.random() * (remaining / 2));
                     votes[wIndex] = v;
                     remaining -= v;
                 }
             });
        }

        // 3. Generate Chart HTML
        // Using A, B, C, D labels
        let chartHTML = `<div style="display:flex; justify-content:space-around; align-items:flex-end; height:200px; padding-top:20px;">`;
        
        btns.forEach((btn, i) => {
            const height = Math.max(5, (votes[i] / 1000) * 100); // Percentage height
            const label = String.fromCharCode(65 + i); // A, B, C, D
            const isHidden = btn.style.visibility === 'hidden';
            const barColor = isHidden ? '#ccc' : '#0d6efd';
            const count = isHidden ? 0 : votes[i];
            
            chartHTML += `
                <div style="text-align:center; width: 40px;">
                    <div style="font-weight:bold; margin-bottom:5px;">${count}</div>
                    <div style="height:${height*1.5}px; background-color:${barColor}; width:100%; border-radius:3px 3px 0 0; transition: height 1s ease-out;"></div>
                    <div style="border-top:1px solid #ccc; padding-top:5px; font-weight:bold;">${label}</div>
                </div>
            `;
        });
        chartHTML += `</div>`;
        chartHTML += `<p class="text-center mt-3 text-muted small">Total Votes: 1000</p>`;

        // 4. Show Modal
        // Check if a modal exists or create a simple overlay
        // We'll leverage the existing #messageBox modal if available (from other games), or alert fallback
        // Better: Inject a custom modal div for the chart
        
        const modalId = 'audiencePollModal';
        let modalEl = document.getElementById(modalId);
        
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = modalId;
            modalEl.className = 'modal fade';
            modalEl.tabIndex = -1;
            modalEl.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">Audience Poll Results</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal">Close</button>
                        </div>
                        <div class="modal-body" id="${modalId}-body">
                            <!-- Chart goes here -->
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalEl);
        }
        
        document.getElementById(`${modalId}-body`).innerHTML = chartHTML;
        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
    }

    // Utility: Fisher-Yates Shuffle
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Expose globally
    return { init, resetGame };
})();

window.Millionaire = Millionaire;