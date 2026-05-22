// --- HOLLYWOOD SQUARES GAME ENGINE ---
// Matches logic from review_games_logic.js but standalone for Chapter 6/10
const HollywoodSquaresGame = (() => {
    // DOM Elements
    let ui = {};
    
    // State
    let boardState = Array(9).fill(null);
    let turn = 'X'; // 'X' or 'O'
    let peopleList = [];
    let questionList = []; // Master list
    let availableQuestions = []; // Pool for tournament
    let activeSquareIndex = -1;
    let isTruth = false;
    let isStealPhaseB = false; // B tries to steal for win
    let isStealPhaseA = false; // A tries to recover for win
    let scores = { X: 0, O: 0 };
    let teams = { X: "Team X", O: "Team O" };
    let gameStarted = false; // Track if the first move has been made
    
    function init(config) {
        // Config: { people: [], questions: {} or [], teams: {X, O} }
        peopleList = config.people || [];
        
        // Handle Questions (Object or Array)
        if (Array.isArray(config.questions)) {
            questionList = config.questions;
        } else if (typeof config.questions === 'object') {
            questionList = [];
            Object.values(config.questions).forEach(arr => questionList = questionList.concat(arr));
        }
        
        teams = config.teams || { X: "Team X", O: "Team O" };
        
        // Bind UI
        ui.board = document.getElementById('gameBoard');
        ui.interaction = document.getElementById('hollywood-interaction-area');
        ui.intro = document.getElementById('h-intro-state');
        ui.active = document.getElementById('h-active-state');
        ui.hostQ = document.getElementById('h-host-question');
        ui.celebName = document.getElementById('h-celeb-name');
        ui.celebAns = document.getElementById('h-celeb-answer');
        ui.status = document.getElementById('h-status-msg');
        ui.turnText = document.getElementById('currentPlayerText');
        ui.scoreX = document.getElementById('roundsWonX');
        ui.scoreO = document.getElementById('roundsWonO');
        
        // --- BIND TEAM NAMES (Allow User Edits) ---
        bindTeamNameUpdates('roundsWonX', 'X');
        bindTeamNameUpdates('roundsWonO', 'O');

        // Start fresh tournament
        resetTournament();
    }

    function bindTeamNameUpdates(scoreId, teamKey) {
        const scoreEl = document.getElementById(scoreId);
        if (scoreEl && scoreEl.parentNode) {
            // Find the sibling header that has contenteditable
            const nameEl = scoreEl.parentNode.querySelector('.team-name') || scoreEl.parentNode.querySelector('[contenteditable]');
            
            if (nameEl) {
                // If the element has text already (from HTML), use it. 
                // Otherwise use the default/config name.
                if (nameEl.textContent.trim().length > 0 && nameEl.textContent.trim() !== "X" && nameEl.textContent.trim() !== "O") {
                    teams[teamKey] = nameEl.textContent.trim();
                } else {
                    nameEl.textContent = teams[teamKey];
                }

                // Listen for changes
                nameEl.addEventListener('input', () => {
                    const newName = nameEl.textContent.trim();
                    if (newName) {
                        teams[teamKey] = newName;
                        updateTurnUI(); // Update the "Turn" message instantly
                    }
                });
            }
        }
    }

    function resetBoard() {
        boardState = Array(9).fill(null);
        turn = 'X'; // Reset turn to X for new round? Or keep winner? Usually X starts.
        isStealPhaseB = false;
        isStealPhaseA = false;
        gameStarted = false; // Reset game started flag
        
        if(ui.intro) {
            ui.intro.classList.remove('d-none');
            // Reset intro text
            const introHeader = ui.intro.querySelector('h3');
            const introText = ui.intro.querySelector('p');
            if (introHeader) introHeader.textContent = "Welcome to the Show!";
            if (introText) introText.textContent = "Select a square on the left to begin the round.";
        }
        if(ui.active) ui.active.classList.add('d-none');
        
        updateTurnUI();
        render();
    }
    
    function resetTournament() {
        scores = { X: 0, O: 0 };
        // Reset question pool for new tournament
        availableQuestions = [...questionList];
        updateScoreUI();
        resetBoard();
    }

    function updateTurnUI() {
        let activePlayer = turn;
        let specialMessage = "";

        if(isStealPhaseB) {
            activePlayer = turn === 'X' ? 'O' : 'X';
            specialMessage = " FOR THE BLOCK/WIN!";
        } else if(isStealPhaseA) {
            activePlayer = turn;
            specialMessage = " FOR THE WIN!";
        } else if (activeSquareIndex !== -1) {
             // If a square is selected, check if it's for the win
             if (wouldWin(activePlayer, activeSquareIndex)) {
                 specialMessage = " FOR THE WIN!";
             }
        }

        const activeTeamName = teams[activePlayer] || activePlayer;

        if(ui.turnText) ui.turnText.textContent = `${activeTeamName}${specialMessage}`;
        
        if(ui.status) {
            if(isStealPhaseB) {
                ui.status.textContent = `BLOCK ATTEMPT! ${activeTeamName} must answer correctly!`;
                ui.status.className = "text-danger fw-bold blink"; 
            } else if(isStealPhaseA) {
                ui.status.textContent = `RECOVERY! ${activeTeamName} must answer correctly to win!`;
                ui.status.className = "text-success fw-bold blink";
            } else {
                ui.status.textContent = `${activeTeamName}, pick a square.`;
                ui.status.className = "text-muted fst-italic";
            }
        }
    }
    
    function updateScoreUI() {
         if(ui.scoreX) ui.scoreX.textContent = scores.X;
         if(ui.scoreO) ui.scoreO.textContent = scores.O;
    }

    function render() {
        if(!ui.board) return;
        ui.board.innerHTML = '';
        
        let displayPeople = [...peopleList];
        if(displayPeople.length > 0) {
            while(displayPeople.length < 9) {
                displayPeople = [...displayPeople, ...peopleList];
            }
            displayPeople = displayPeople.slice(0, 9);
        }

        displayPeople.forEach((p, i) => {
            const col = document.createElement('div');
            col.className = 'col-4';
            
            const btn = document.createElement('button');
            let className = 'square-btn'; 
            if(boardState[i]) className += ` claimed-${boardState[i]}`;
            btn.className = className;
            
            let content = `<span class="judge-name">${p.name}</span><span class="text-xs">${p.title}</span>`;
            if(boardState[i]) {
                btn.disabled = true;
                // Explicitly show X or O
                content = `<span style="font-size:3rem; font-weight:bold;">${boardState[i]}</span>`;
            }

            btn.innerHTML = content;
            btn.onclick = () => handleSquareClick(i, p.name);
            
            col.appendChild(btn);
            ui.board.appendChild(col);
        });
        // Removed updateTurnUI() from here to avoid overwriting "For the Win" messages set by handleSquareClick
    }
    
    function getRandomQuestion() {
        // If pool is empty, refill it (or handle end of content)
        if(availableQuestions.length === 0) {
            availableQuestions = [...questionList];
        }
        
        const randIdx = Math.floor(Math.random() * availableQuestions.length);
        const q = availableQuestions[randIdx];
        
        // Remove question from pool so it isn't asked again in this tournament
        availableQuestions.splice(randIdx, 1);
        
        return q;
    }

    function handleSquareClick(index, celebName) {
        if (boardState[index] !== null) return; 
        if(isStealPhaseB || isStealPhaseA) return;

        activeSquareIndex = index;
        gameStarted = true; // Mark game as started on first click
        
        // Update UI to show if this move is for the win immediately upon clicking
        updateTurnUI(); 
        
        startQuestionFlow(celebName);
    }
    
    function startQuestionFlow(celebName) {
        const qData = getRandomQuestion();
        isTruth = Math.random() > 0.5;
        const answerText = isTruth ? qData.truthfulText : qData.bluffText;
        
        if(ui.intro) ui.intro.classList.add('d-none');
        if(ui.active) ui.active.classList.remove('d-none');
        
        // Hide feedback
        const feedbackEl = document.getElementById('h-feedback');
        if(feedbackEl) feedbackEl.style.display = 'none';

        if(ui.hostQ) ui.hostQ.innerHTML = `"${qData.q}"`;
        if(ui.celebName) ui.celebName.textContent = celebName || "Celebrity"; 
        if(ui.celebAns) ui.celebAns.innerHTML = `"${answerText}"`;
        
        const buttons = ui.active.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = false);

        if(ui.interaction) ui.interaction.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    function showFeedback(msg, isSuccess, callback) {
        let feedbackEl = document.getElementById('h-feedback');
        if(!feedbackEl && ui.active) {
            feedbackEl = document.createElement('div');
            feedbackEl.id = 'h-feedback';
            const btnContainer = ui.active.querySelector('.d-grid');
            if(btnContainer) btnContainer.after(feedbackEl);
            else ui.active.appendChild(feedbackEl);
        }
        
        if(feedbackEl) {
            feedbackEl.textContent = msg;
            feedbackEl.className = isSuccess ? 'alert alert-success mt-3 fw-bold' : 'alert alert-danger mt-3 fw-bold';
            feedbackEl.style.display = 'block';
        }

        const buttons = ui.active.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);

        setTimeout(() => {
            if(feedbackEl) feedbackEl.style.display = 'none';
            if(callback) callback();
        }, 1500);
    }

    function wouldWin(player, squareIndex) {
        let tempBoard = [...boardState];
        tempBoard[squareIndex] = player;
        const WINNING_COMBINATIONS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        return WINNING_COMBINATIONS.some(combo => {
            return combo.every(index => tempBoard[index] === player);
        });
    }
    
    function getCelebName() {
        if(ui.board && ui.board.children[activeSquareIndex]) {
            const btn = ui.board.children[activeSquareIndex].querySelector('.judge-name');
            return btn ? btn.textContent : "Celebrity";
        }
        return "Celebrity";
    }

    function judge(agree) {
        const playerIsCorrect = (isTruth && agree) || (!isTruth && !agree);
        const opponent = turn === 'X' ? 'O' : 'X';
        const currentTeamName = teams[turn];
        const opponentTeamName = teams[opponent];

        if (isStealPhaseB) {
            if (playerIsCorrect) {
                showFeedback(`Correct! ${opponentTeamName} wins the square (and the game)!`, true, () => {
                    finalizeSquare(opponent); 
                });
            } else {
                if (wouldWin(turn, activeSquareIndex)) {
                    showFeedback(`Wrong! ${opponentTeamName} fails. ${currentTeamName} gets a chance to win!`, false, () => {
                        isStealPhaseB = false;
                        isStealPhaseA = true;
                        updateTurnUI();
                        startQuestionFlow(getCelebName());
                    });
                } else {
                     showFeedback(`Wrong! ${opponentTeamName} fails. Square goes to ${currentTeamName}.`, false, () => {
                        finalizeSquare(turn);
                     });
                }
            }
        } else if (isStealPhaseA) {
            if (playerIsCorrect) {
                showFeedback(`Correct! ${currentTeamName} wins the square (and the game)!`, true, () => {
                    finalizeSquare(turn);
                });
            } else {
                showFeedback(`Wrong! Nobody gets the square.`, false, () => {
                    finalizeSquare(null);
                });
            }
        } else {
            if (playerIsCorrect) {
                showFeedback(`Correct! ${currentTeamName} gets the square.`, true, () => {
                    finalizeSquare(turn);
                });
            } else {
                if (wouldWin(opponent, activeSquareIndex)) {
                    showFeedback(`Wrong! ${opponentTeamName} can steal for the WIN!`, false, () => {
                        isStealPhaseB = true;
                        updateTurnUI();
                        startQuestionFlow(getCelebName());
                    });
                } else {
                    showFeedback(`Wrong! Square goes to ${opponentTeamName}.`, false, () => {
                        finalizeSquare(opponent);
                    });
                }
            }
        }
    }
    
    function finalizeSquare(winner) {
        // 1. UPDATE STATE
        if (winner) boardState[activeSquareIndex] = winner;
        isStealPhaseB = false;
        isStealPhaseA = false;
        activeSquareIndex = -1; // Reset active square

        // 2. RESET UI PHASE
        if(ui.intro) {
            ui.intro.classList.remove('d-none');
            // Update intro text if game has started
            if (gameStarted) {
                const introHeader = ui.intro.querySelector('h3');
                const introText = ui.intro.querySelector('p');
                if (introHeader) introHeader.textContent = "Game in Progress";
                if (introText) introText.textContent = "Select the next square to continue.";
            }
        }
        if(ui.active) ui.active.classList.add('d-none');
        
        // 3. CHECK GAME STATUS
        checkGameStatus();
    }
    
    function checkGameStatus() {
        const WINNING_COMBINATIONS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        let gameWinner = null;
        if (WINNING_COMBINATIONS.some(c => c.every(i => boardState[i] === 'X'))) gameWinner = 'X';
        else if (WINNING_COMBINATIONS.some(c => c.every(i => boardState[i] === 'O'))) gameWinner = 'O';

        if (gameWinner) {
            handleRoundWin(gameWinner);
        } else if (boardState.every(c => c !== null)) {
             showMessage("It's a Draw!", "No one won this round. The board will reset.", () => resetBoard());
        } else {
            // NO WINNER YET - CONTINUE GAME
            turn = turn === 'X' ? 'O' : 'X';
            // IMPORTANT: Render the X or O that was just placed
            render(); 
            // Update turn UI AFTER render to ensure correct text ("Team O's Turn") is displayed
            updateTurnUI();
        }
    }
    
    function handleRoundWin(winner) {
        scores[winner]++;
        updateScoreUI();
        
        const winnerName = teams[winner];
        
        // CHECK FOR BEST OF 3 WIN (First to 2)
        if (scores[winner] >= 2) {
             const modalBody = `
                <h3 class="text-success">${winnerName} Wins the Tournament!</h3>
                <p>Final Score: ${scores.X} - ${scores.O}</p>
                <div class="mt-4">
                    <button class="btn btn-primary btn-lg" onclick="HollywoodSquaresGame.resetGame()">Start New Tournament</button>
                </div>
             `;
             showMessage("Tournament Winner!", modalBody, null, true); 
        } else {
             // Regular Round Win
             const modalBody = `
                <h3 class="text-success">${winnerName} Wins the Round!</h3>
                <p>Current Score: ${scores.X} - ${scores.O}</p>
                <p class="text-muted small">First to 2 wins the match.</p>
                <button class="btn btn-primary mt-3" data-bs-dismiss="modal" onclick="HollywoodSquaresGame.nextRound()">Next Round</button>
             `;
             showMessage("Round Winner!", modalBody);
        }
    }
    
    // Exposed function to start next round without resetting scores
    function nextRound() {
        resetBoard();
    }

    function showMessage(title, body, closeCallback, isHTML = false) {
        const modalEl = document.getElementById('messageBox');
        if(modalEl) {
            document.getElementById('messageTitle').textContent = title;
            const bodyEl = document.getElementById('messageBody');
            if(isHTML || body.includes('<')) bodyEl.innerHTML = body;
            else bodyEl.textContent = body;
            
            const bsModal = new bootstrap.Modal(modalEl);
            
            if (closeCallback) {
                modalEl.addEventListener('hidden.bs.modal', function handler() {
                    closeCallback();
                    modalEl.removeEventListener('hidden.bs.modal', handler);
                }, { once: true });
            }
            
            bsModal.show();
        } else {
            alert(title + "\n" + body.replace(/<[^>]*>?/gm, ''));
            if(closeCallback) closeCallback();
        }
    }

    return { init, judge, resetGame: resetTournament, nextRound: nextRound };
})();

// Ensure global access
window.HollywoodSquaresGame = HollywoodSquaresGame;