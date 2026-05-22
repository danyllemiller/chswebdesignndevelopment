// ======================================================
// 2. HOLLYWOOD SQUARES ENGINE
// ======================================================
window.Hollywood = (() => {
    const FAMOUS_PEOPLE = ["MrBeast", "Taylor Swift", "Cristiano Ronaldo", "Lionel Messi", "Dwayne Johnson", "Zendaya", "Tom Holland", "Billie Eilish", "LeBron James", "Steph Curry", "Kai Cenat", "IShowSpeed", "Mark Rober", "Jenna Ortega", "Ariana Grande", "Justin Bieber", "Selena Gomez", "Drake", "Rihanna", "Patrick Mahomes"];
    const getImagePath = (name) => `/images/celebs/${name.replace(/\s+/g, '')}.jpg`;

    const safeEscape = (str) => {
        try {
            if (typeof str !== 'string') str = String(str || '');
            if (typeof window !== 'undefined' && typeof window.escapeHTML === 'function') return window.escapeHTML(str);
            if (str.includes('&lt;') || str.includes('<code>')) return str; 
            return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        } catch(e) {
            return String(str || '');
        }
    };

    let currentQuestion = null, currentSquareIndex = null, turn = 'X', boardState = Array(9).fill(null), xWins = 0, oWins = 0;
    let playerX = "Player X", playerO = "Player O";
    let uidX = null, uidO = null;
    let matchOver = false;
    let isChallengeMode = false;
    let selectedCelebs = [];
    let hostMessage = "Welcome to Hollywood Squares! Claim your spot and pick a square to begin.";
    let isComputerO = false; 
    let hsIsTransitioning = false; 
    
    let dbRef, appIdRef, roomID, docRef;
    let hsUnsub = null;

    function showHowToPlay() {
        let htp = document.getElementById('hs-how-to-modal');
        if (!htp) {
            htp = document.createElement('div');
            htp.id = 'hs-how-to-modal';
            htp.className = "position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3";
            htp.style.cssText = "z-index:9999; background:rgba(0,0,0,0.85); backdrop-filter: blur(5px);";
            htp.innerHTML = `
                <div class="card shadow-lg p-4 text-start rounded-4" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color); max-width: 600px; width: 100%;">
                    <div class="d-flex justify-content-between align-items-center pb-2 mb-3" style="border-bottom: 2px solid var(--tertiary-color);">
                        <h3 class="fw-bold mb-0" style="color: var(--secondary-color); font-family: var(--font-family-monospace, monospace);">How to Play: Hollywood Squares</h3>
                        <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('hs-how-to-modal').style.display='none'"></button>
                    </div>
                    <p style="color: var(--secondary-color); font-size: 0.95rem;"><strong>📺 The TV Show:</strong> A massive Tic-Tac-Toe board filled with celebrities. Players pick a celeb, who gives a (sometimes fake!) answer to a trivia question. The player must Agree or Disagree to win the square.</p>
                    <p style="color: var(--secondary-color); font-size: 0.95rem;"><strong>💻 On This Site:</strong><br><br>
                    • Claim your spot as <strong style="color: white;">Player X</strong> or <strong style="color: white;">Player O</strong> (or add the Computer 🤖 to play against the AI).<br><br>
                    • Take turns clicking a celebrity square. Read the celebrity's response and decide if you <strong>Agree</strong> or <strong>Disagree</strong>.<br><br>
                    • Guess correctly to win the square! Guess wrong, and your opponent steals it (unless stealing would give them the game-winning square, in which case they must earn it on a new question).<br><br>
                    • First to 3-in-a-row (or 5 total squares) wins the round. Best of 3 rounds wins the match!</p>
                    <button class="btn btn-lg w-100 shadow-sm mt-2 fw-bold" onclick="document.getElementById('hs-how-to-modal').style.display='none'" style="background-color: var(--secondary-color); color: var(--primary-color); border: none;">Got It!</button>
                </div>
            `;
            document.body.appendChild(htp);
        }
        htp.style.display = 'flex';
    }

    function setup(db, appId, room) {
        dbRef = db; appIdRef = appId; roomID = room;
        
        const container = document.getElementById('hs-grid');
        if (!container) return;
        const data = window.currentChapterData?.hollywoodData;
        if (!data) return;

        if (roomID && roomID !== "solo" && dbRef) {
            const chapterKey = window.currentChapterData?.chapterTitle ? window.currentChapterData.chapterTitle.replace(/[^a-zA-Z0-9]/g, '') : 'General';
            const namespacedRoomID = chapterKey + "_" + roomID;
            
            docRef = window.doc(dbRef, 'artifacts', appIdRef, 'public', 'data', 'hollywoodRooms', namespacedRoomID);
            
            if (window.globalPlayerName) {
                handleJoin(window.globalPlayerName);
            } else {
                showInlineJoinPrompt(container);
            }

        } else {
            selectedCelebs = [...FAMOUS_PEOPLE].sort(() => 0.5 - Math.random()).slice(0, 9);
            renderBaseLayout(container);
            renderGrid(data);
        }
    }

    async function leaveGame(skipConfirm = false) {
        if (skipConfirm && (!roomID || roomID === "solo")) return;

        if (!skipConfirm && window.globalPlayerName && !(await window.GameModal.confirm("Are you sure you want to completely leave this game?"))) return;

        if (roomID !== "solo" && docRef && window.currentUser) {
            try {
                const snap = await window.getDoc(docRef);
                if (snap.exists()) {
                    let d = snap.data();
                    let updates = {};
                    if (d.uidX === window.currentUser.uid) { updates.playerX = "Player X"; updates.uidX = null; }
                    if (d.uidO === window.currentUser.uid) { updates.playerO = "Player O"; updates.uidO = null; }
                    if (Object.keys(updates).length > 0) await window.updateDoc(docRef, updates);
                }
            } catch(e){ console.error(e); }
        }

        if (hsUnsub) { hsUnsub(); hsUnsub = null; }
        
        if (!skipConfirm) {
            window.globalPlayerName = "";
        }
        
        boardState = Array(9).fill(null);
        turn = 'X'; xWins = 0; oWins = 0;
        playerX = "Player X"; playerO = "Player O";
        uidX = null; uidO = null;
        isChallengeMode = false; isComputerO = false;
        hostMessage = "Welcome to Hollywood Squares! Claim your spot and pick a square to begin.";

        const container = document.getElementById('hs-grid');
        
        if (!roomID || roomID === "solo") {
            selectedCelebs = [...FAMOUS_PEOPLE].sort(() => 0.5 - Math.random()).slice(0, 9);
            renderBaseLayout(container);
            renderGrid(window.currentChapterData?.hollywoodData);
        } else {
            showInlineJoinPrompt(container);
        }
    }

    function showInlineJoinPrompt(container) {
        container.innerHTML = `
            <div class="card shadow-sm p-5 text-center my-4 rounded-4" style="background-color: var(--secondary-color); border: 2px solid var(--primary-color);">
                <h2 class="fw-bold mb-3" style="color: var(--primary-color);">Hollywood Squares</h2>
                <p class="mb-4 fs-5" style="color: var(--primary-color);">Enter your name to join the game!</p>
                <input type="text" id="hs-join-name" maxlength="15" value="${window.globalPlayerName || ''}" class="form-control form-control-lg mb-4 text-center fw-bold mx-auto" style="max-width: 300px; color: var(--primary-color); border: 2px solid var(--primary-color); background-color: white;" placeholder="Player Name" onkeydown="if(event.key === 'Enter') window.Hollywood.handleJoinForm()" onfocus="if(!this.value && window.globalPlayerName) this.value = window.globalPlayerName;">
                <button class="btn btn-lg fw-bold shadow-sm mx-auto" id="hs-join-btn" style="max-width: 300px; width: 100%; background-color: var(--primary-color); color: white; border: none;" onclick="window.Hollywood.handleJoinForm()">Join Game</button>
            </div>
        `;
    }

    function handleJoinForm() {
        if (!docRef || !roomID || roomID === "solo") { location.reload(); return; }

        const inputEl = document.getElementById('hs-join-name');
        if (!inputEl) return;
        const pName = inputEl.value.trim().substring(0, 15);
        const finalName = pName || window.globalPlayerName || ("Player_" + Math.floor(Math.random()*1000));
        handleJoin(finalName);
    }

    async function handleJoin(name) {
        if (!docRef || !roomID || roomID === "solo") return;
        
        const currentUid = window.currentUser ? window.currentUser.uid : ("temp_id_" + Math.random().toString(36).substring(7));

        try {
            const snap = await window.getDoc(docRef);
            if (snap.exists()) {
                const d = snap.data();
                
                if ((d.playerX === name && d.uidX !== currentUid) || (d.playerO === name && d.uidO !== currentUid)) {
                    if (window.GameModal) await window.GameModal.alert(`The name "${name}" is already taken! Please enter a different name.`);
                    window.globalPlayerName = "";
                    showInlineJoinPrompt(document.getElementById('hs-grid'));
                    return;
                }
                
                window.globalPlayerName = name;
                
                if (d.uidX === currentUid) {
                    await window.updateDoc(docRef, { playerX: name, hostMessage: `<strong>${name}</strong> reconnected as X!` });
                } else if (d.uidO === currentUid) {
                    await window.updateDoc(docRef, { playerO: name, hostMessage: `<strong>${name}</strong> reconnected as O!` });
                } else if (!d.uidX) {
                    await window.updateDoc(docRef, { playerX: name, uidX: currentUid, hostMessage: `<strong>${name}</strong> is playing as X!` });
                } else if (!d.uidO && !d.isComputerO) {
                    await window.updateDoc(docRef, { playerO: name, uidO: currentUid, hostMessage: `<strong>${name}</strong> is playing as O!` });
                } else {
                    await window.GameModal.alert("Match is full! You are joining as a viewer. (To clear out old players, click the '🔄 Reset' button on the scoreboard!)");
                }
            } else {
                window.globalPlayerName = name;
                selectedCelebs = [...FAMOUS_PEOPLE].sort(() => 0.5 - Math.random()).slice(0, 9);
                await window.setDoc(docRef, { 
                    board: Array(9).fill(null), 
                    turn: 'X', 
                    xWins: 0, 
                    oWins: 0, 
                    celebs: selectedCelebs, 
                    isChallengeMode: false, 
                    activeQuestion: null, 
                    playerX: name, 
                    playerO: "Player O", 
                    uidX: currentUid, 
                    uidO: null,
                    isComputerO: false,
                    hostMessage: `<strong>${name}</strong> is playing as X!`
                });
            }
        } catch(e) {
            console.error("Hollywood Join Error:", e);
        }

        const container = document.getElementById('hs-grid');
        const data = window.currentChapterData?.hollywoodData;
        
        hsUnsub = window.onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const d = snap.data();
                boardState = d.board || Array(9).fill(null);
                turn = d.turn || 'X';
                xWins = d.xWins || 0;
                oWins = d.oWins || 0;
                playerX = d.playerX || "Player X";
                playerO = d.playerO || "Player O";
                uidX = d.uidX || null;
                uidO = d.uidO || null;
                isChallengeMode = d.isChallengeMode || false;
                isComputerO = d.isComputerO || false;

                if (d.celebs) {
                    selectedCelebs = d.celebs;
                    if (!document.getElementById('hs-board-area')) {
                        renderBaseLayout(container);
                        renderGrid(data);
                    }
                }
                
                if (d.hostMessage) {
                    hostMessage = d.hostMessage;
                }
                
                if (d.activeQuestion) {
                    showQuestionUI(d.activeQuestion);
                } else {
                    hideQuestionUI();
                }

                syncBoardUI();
                evaluateGameState();
            }
        });
    }

    function triggerStateEvaluation() {
        if (roomID === "solo") evaluateGameState();
    }

    let cpuTimer = null;
    function evaluateGameState() {
        if (matchOver || !isComputerO || turn !== 'O') {
            clearTimeout(cpuTimer);
            return;
        }
        
        if (roomID !== "solo" && window.currentUser && uidX && uidX !== window.currentUser.uid) {
            return; 
        }

        clearTimeout(cpuTimer);
        if (hsIsTransitioning) return;

        const qDisplay = document.getElementById('hs-question-display');
        const isQuestionActive = qDisplay && !qDisplay.classList.contains('d-none');

        if (isQuestionActive) {
            updateHost("The Computer 🤖 is thinking...");
            cpuTimer = setTimeout(() => {
                if (matchOver || hsIsTransitioning) return;
                const isRight = Math.random() < 0.75; 
                const cpuAnswer = isRight ? window.currentHSAnswer : !window.currentHSAnswer;
                
                const agreeBtn = document.getElementById('hs-agree-btn');
                const disagreeBtn = document.getElementById('hs-disagree-btn');
                if (cpuAnswer) {
                    if (agreeBtn) agreeBtn.style.transform = "scale(0.95)";
                } else {
                    if (disagreeBtn) disagreeBtn.style.transform = "scale(0.95)";
                }
                
                setTimeout(() => {
                    if (agreeBtn) agreeBtn.style.transform = "none";
                    if (disagreeBtn) disagreeBtn.style.transform = "none";
                    judge(cpuAnswer, true); 
                }, 300);

            }, 3500); 
        } else {
            updateHost("The Computer 🤖 is selecting a square...");
            cpuTimer = setTimeout(() => {
                if (matchOver || hsIsTransitioning) return;
                let pick = smartPick(boardState, 'O', 'X');
                if (pick !== null) clickSq(pick, true); 
            }, 2500); 
        }
    }

    function smartPick(board, cpuSym, humanSym) {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (let w of wins) {
            let vals = [board[w[0]], board[w[1]], board[w[2]]];
            if (vals.filter(v => v === cpuSym).length === 2 && vals.includes(null)) {
                return w[vals.indexOf(null)];
            }
        }
        for (let w of wins) {
            let vals = [board[w[0]], board[w[1]], board[w[2]]];
            if (vals.filter(v => v === humanSym).length === 2 && vals.includes(null)) {
                return w[vals.indexOf(null)];
            }
        }
        if (board[4] === null) return 4;
        const emptySquares = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        return emptySquares.length > 0 ? emptySquares[Math.floor(Math.random() * emptySquares.length)] : null;
    }

    function updateHost(msg) {
        hostMessage = msg;
        if (roomID && roomID !== "solo" && dbRef && docRef) {
            window.updateDoc(docRef, { hostMessage }).catch(e=>console.log(e));
        } else {
            syncBoardUI();
        }
    }

    async function checkCanAct(action, fromCpu = false) {
        if (fromCpu) return true; 
        if (roomID === "solo") {
            if (turn === 'O' && isComputerO) {
                await window.GameModal.alert("It's the Computer's turn! Please wait.");
                return false;
            }
            return true;
        }

        if (!window.currentUser) {
            await window.GameModal.alert("Still connecting to multiplayer. Please wait...");
            return false;
        }
        
        if (turn === 'X') {
            if (!uidX) {
                await window.GameModal.alert(`Player X hasn't been claimed yet! Click "Play as X" first.`);
                return false;
            }
            if (uidX !== window.currentUser.uid) {
                await window.GameModal.alert(`It is ${playerX}'s turn to ${action}. Only they can play right now!`);
                return false;
            }
        } else if (turn === 'O') {
            if (isComputerO) {
                await window.GameModal.alert("It's the Computer's turn! Please wait.");
                return false;
            }
            if (!uidO) {
                await window.GameModal.alert(`Player O hasn't been claimed yet! Click "Play as O" first.`);
                return false;
            }
            if (uidO !== window.currentUser.uid) {
                await window.GameModal.alert(`It is ${playerO}'s turn to ${action}. Only they can play right now!`);
                return false;
            }
        }
        return true; 
    }

    function renderBaseLayout(container) {
        container.innerHTML = `
            <div class="row">
                <div class="col-md-8 mb-4 d-flex flex-column">
                    <div class="card shadow-sm mb-3" style="border: 2px solid var(--primary-color); background-color: transparent;">
                        <div class="card-header fw-bold d-flex align-items-center py-2" style="background-color: var(--primary-color); color: var(--secondary-color); border-bottom: none;">
                            🎤 Host Commentary
                        </div>
                        <div class="card-body p-2 d-flex align-items-center justify-content-center text-center" style="background-color: var(--secondary-color);">
                            <p id="hs-host-msg" class="mb-0 fs-6 fw-bold" style="color: var(--primary-color);">${hostMessage}</p>
                        </div>
                    </div>
                    <div id="hs-board-area" class="w-100 d-flex justify-content-center mt-2"></div>
                </div>
                
                <div class="col-md-4 d-flex flex-column mb-4">
                    <div class="card shadow-sm hs-scoreboard-card flex-grow-1" style="border: 2px solid var(--tertiary-color); overflow: hidden;">
                        <div class="card-header text-center fw-bold fs-5" style="background-color: var(--primary-color); color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                            Scoreboard
                        </div>
                        
                        <div class="p-2 text-center" style="background-color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                            <div class="d-flex justify-content-center gap-2 flex-wrap">
                                <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="window.Hollywood.showHowToPlay()" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">❓ How to Play</button>
                                <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" id="hs-reset-roles-btn" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">🔄 Reset</button>
                                <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="window.Hollywood.leaveGame()" style="background-color: white; color: var(--file-name-color); border: 2px solid var(--file-name-color); touch-action: manipulation;">❌ Leave</button>
                            </div>
                        </div>

                        <div class="card-body p-3 bg-white text-primary d-flex flex-column">
                            <div class="text-center pb-3 mb-3" style="border-bottom: 1px solid var(--tertiary-color);">
                                <p class="small fw-bold text-uppercase mb-1" style="color: var(--tertiary-color);">Match Wins (Best of 3)</p>
                                <div class="h6 mb-0 fw-bold d-flex justify-content-center align-items-center flex-wrap">
                                    <span id="hs-name-x" style="color: var(--primary-color);">Player X (X)</span> 
                                    <button type="button" class="btn btn-sm py-0 px-1 mx-1 fw-bold" id="hs-claim-x" style="font-size: 0.7rem; border: 1px solid var(--primary-color); color: var(--primary-color); background-color: transparent; touch-action: manipulation;">Play as X</button>: <span id="hs-x-wins" style="color: var(--primary-color);">0</span> 
                                    <span class="mx-2" style="color: var(--quaternary-color);">|</span> 
                                    <span id="hs-name-o" style="color: var(--file-name-color);">Player O (O)</span> 
                                    <button type="button" class="btn btn-sm py-0 px-1 mx-1 fw-bold" id="hs-claim-o" style="font-size: 0.7rem; border: 1px solid var(--file-name-color); color: var(--file-name-color); background-color: transparent; touch-action: manipulation;">Play as O</button>
                                    <button type="button" class="btn btn-sm py-0 px-1 mx-1 fw-bold" id="hs-claim-cpu" style="font-size: 0.7rem; border: 1px solid var(--tertiary-color); color: var(--tertiary-color); background-color: transparent; touch-action: manipulation;">Play AI</button>: <span id="hs-o-wins" style="color: var(--file-name-color);">0</span>
                                </div>
                            </div>
                            <div class="text-center mb-4">
                                <h5 class="fw-bold mb-1" id="hs-turn-title" style="color: var(--tertiary-color);">Current Turn</h5>
                                <div id="hs-turn-indicator-name" class="h5 fw-bold mb-0" style="color: var(--tertiary-color);">Player X</div>
                                <div id="hs-turn-indicator" class="display-6 fw-bold" style="color: var(--primary-color);">X</div>
                            </div>
                            <hr style="border-color: var(--tertiary-color); opacity: 0.5;" class="mb-3 mt-0">
                            <div id="hs-interaction-panel" class="text-center flex-grow-1 d-flex flex-column justify-content-center">
                                <div id="hs-prompt" class="fst-italic small py-4" style="color: var(--tertiary-color);">Click a celebrity square to start...</div>
                                <div id="hs-question-display" class="d-none">
                                    <p id="hs-q-text" class="fw-bold mb-3 small" style="color: var(--primary-color);"></p>
                                    <div class="p-2 mb-3 rounded small text-start" style="background-color: var(--secondary-color); border: 1px solid var(--tertiary-color);">
                                        <strong id="hs-c-resp-label" style="color: var(--primary-color);">Celebrity Response:</strong><br>
                                        <span id="hs-c-response" class="fst-italic" style="color: var(--primary-color);"></span>
                                    </div>
                                    <div class="d-grid gap-2">
                                        <button type="button" class="btn fw-bold shadow-sm" id="hs-agree-btn" style="background-color: var(--tertiary-color); color: white; border: none; touch-action: manipulation;">Agree</button>
                                        <button type="button" class="btn fw-bold shadow-sm" id="hs-disagree-btn" style="background-color: var(--file-name-color); color: white; border: none; touch-action: manipulation;">Disagree</button>
                                    </div>
                                </div>
                                <div id="hs-feedback-area" class="mt-3"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
            
        document.getElementById('hs-agree-btn').addEventListener('click', (e) => { e.preventDefault(); judge(true); });
        document.getElementById('hs-disagree-btn').addEventListener('click', (e) => { e.preventDefault(); judge(false); });
        
        const resetRolesBtn = document.getElementById('hs-reset-roles-btn');
        if (resetRolesBtn) {
            resetRolesBtn.addEventListener('click', async (e) => { 
                e.preventDefault(); 
                if (await window.GameModal.confirm("Reset players? This will open the spots for new people to join.")) {
                    let msg = "Roles have been reset! Viewers can claim a spot to play.";
                    isComputerO = false;
                    hsIsTransitioning = false;
                    clearTimeout(cpuTimer);
                    if (roomID && roomID !== "solo" && dbRef && docRef) {
                        window.updateDoc(docRef, { playerX: "Player X", playerO: "Player O", uidX: null, uidO: null, isComputerO: false, hostMessage: msg }).catch(e=>console.log(e));
                    } else {
                        playerX = "Player X";
                        playerO = "Player O";
                        updateHost(msg);
                        syncBoardUI();
                    }
                }
            });
        }

        document.getElementById('hs-claim-x').addEventListener('click', async (e) => {
            e.preventDefault();
            let px;
            if (roomID === "solo") {
                px = await window.GameModal.prompt("Enter your name to play as X:", "Player Name", 15);
                if (!px) return;
                
                if (px === playerO) {
                    await window.GameModal.alert("That name is already taken by Player O! Please choose a different name.");
                    return;
                }
                
                playerX = px;
                updateHost(`<strong>${px}</strong> is playing as X!`);
                syncBoardUI();
            } else {
                if (!window.currentUser) return await window.GameModal.alert("Must be connected to multiplayer.");
                
                px = window.globalPlayerName;
                if (!px) {
                    px = await window.GameModal.prompt("Enter your name to play as X:", "Player Name", 15);
                    if (!px) return;
                }
                
                if (px === playerO) {
                    await window.GameModal.alert("That name is already taken by Player O! Please change your name first.");
                    window.globalPlayerName = "";
                    return;
                }
                
                window.globalPlayerName = px;
                if(docRef) window.updateDoc(docRef, { playerX: px, uidX: window.currentUser.uid, hostMessage: `<strong>${px}</strong> is playing as X!` }).catch(e=>console.log(e));
            }
        });

        document.getElementById('hs-claim-o').addEventListener('click', async (e) => {
            e.preventDefault();
            let po;
            if (roomID === "solo") {
                po = await window.GameModal.prompt("Enter your name to play as O:", "Player Name", 15);
                if (!po) return;
                
                if (po === playerX) {
                    await window.GameModal.alert("That name is already taken by Player X! Please choose a different name.");
                    return;
                }
                
                playerO = po;
                updateHost(`<strong>${po}</strong> is playing as O!`);
                syncBoardUI();
            } else {
                if (!window.currentUser) return await window.GameModal.alert("Must be connected to multiplayer.");
                
                po = window.globalPlayerName;
                if (!po) {
                    po = await window.GameModal.prompt("Enter your name to play as O:", "Player Name", 15);
                    if (!po) return;
                }
                
                if (po === playerX) {
                    await window.GameModal.alert("That name is already taken by Player X! Please change your name first.");
                    window.globalPlayerName = "";
                    return;
                }
                
                window.globalPlayerName = po;
                if(docRef) window.updateDoc(docRef, { playerO: po, uidO: window.currentUser.uid, hostMessage: `<strong>${po}</strong> is playing as O!` }).catch(e=>console.log(e));
            }
        });

        document.getElementById('hs-claim-cpu').addEventListener('click', async (e) => {
            e.preventDefault();
            if (roomID !== "solo" && !uidX) {
                return await window.GameModal.alert("Someone must claim Player X before adding the Computer!");
            }
            let msg = `The Computer 🤖 is playing as O!`;
            if (roomID === "solo") {
                playerO = "Computer 🤖";
                isComputerO = true;
                updateHost(msg);
                syncBoardUI();
                triggerStateEvaluation(); 
            } else {
                if (!window.currentUser) return await window.GameModal.alert("Must be connected to multiplayer.");
                if(docRef) window.updateDoc(docRef, { playerO: "Computer 🤖", isComputerO: true, uidO: "CPU", hostMessage: msg }).catch(e=>console.log(e));
            }
        });
    }

    function renderGrid(data) {
        const boardArea = document.getElementById('hs-board-area');
        if (!boardArea) return;
        boardArea.innerHTML = '';
        let html = '<div class="w-100" style="max-width: 75vh;"><div class="row row-cols-3 g-2">';
        for(let i=0; i<9; i++) {
            const mark = boardState[i];
            const celebName = selectedCelebs[i];
            const imgPath = getImagePath(celebName);
            const markImg = mark ? `/images/celebs/${mark}.png` : '';
            
            html += `
            <div class="col">
                <div class="card hs-square" data-index="${i}" role="button" tabindex="0" style="aspect-ratio: 1 / 1; position: relative; cursor: pointer; overflow: hidden; touch-action: manipulation; border: 2px solid var(--tertiary-color); background-color: var(--secondary-color); transition: all 0.3s ease;">
                    <div class="small fw-bold p-1 text-truncate w-100 text-center" style="position: absolute; top: 0; left: 0; z-index: 2; background-color: rgba(207, 225, 240, 0.9); color: var(--primary-color); pointer-events: none;">${celebName}</div>
                    
                    <div class="w-100 h-100 bg-dark pointer-events-none">
                        <img src="${imgPath}" alt="${celebName}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85; pointer-events: none;" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${celebName}&shape=square'">
                    </div>
                    
                    <img class="hs-mark" src="${markImg}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 5; pointer-events: none; ${mark ? 'display:block' : 'display:none'}">
                </div>
            </div>`;
        }
        html += '</div></div>';
        boardArea.innerHTML = html;

        const squares = boardArea.querySelectorAll('.hs-square');
        squares.forEach(sq => {
            sq.addEventListener('click', function(e) {
                e.preventDefault();
                const idx = parseInt(this.dataset.index);
                clickSq(idx);
            });
        });
    }

    function resetGlow() {
        document.querySelectorAll('.hs-square').forEach(sq => {
            sq.style.border = '2px solid var(--tertiary-color)';
            sq.style.boxShadow = 'none';
            sq.style.transform = 'none';
            sq.style.zIndex = '1';
        });
    }

    function setGlow(index) {
        resetGlow();
        if (index === null || index === undefined) return;
        const activeSq = document.querySelector(`.hs-square[data-index="${index}"]`);
        if (activeSq) {
            activeSq.style.border = '2px solid var(--primary-color)';
            activeSq.style.boxShadow = '0 0 20px 5px var(--tertiary-color)';
            activeSq.style.transform = 'scale(1.05)';
            activeSq.style.zIndex = '10';
        }
    }

    function syncBoardUI() {
        const squares = document.querySelectorAll('.hs-square');
        if (!squares.length) return;
        
        boardState.forEach((symbol, i) => {
            const markEl = squares[i].querySelector('.hs-mark');
            if (markEl) {
                if (symbol) {
                    markEl.src = `/images/celebs/${symbol}.png`;
                    markEl.style.display = 'block';
                } else {
                    markEl.src = '';
                    markEl.style.display = 'none';
                }
            }
        });
        
        const ind = document.getElementById('hs-turn-indicator');
        if(ind) { 
            ind.textContent = turn; 
            ind.className = 'display-6 fw-bold';
            ind.style.color = turn === 'X' ? 'var(--primary-color)' : 'var(--file-name-color)'; 
        }
        
        const turnName = turn === 'X' ? playerX : playerO;
        const indName = document.getElementById('hs-turn-indicator-name');
        if (indName) indName.textContent = turnName;

        const nx = document.getElementById('hs-name-x');
        const no = document.getElementById('hs-name-o');
        if (nx) nx.textContent = playerX + " (X)";
        if (no) no.textContent = playerO + " (O)";
        
        const cx = document.getElementById('hs-claim-x');
        const co = document.getElementById('hs-claim-o');
        const ccpu = document.getElementById('hs-claim-cpu');
        
        if (roomID === "solo") {
            if(cx) { cx.style.display = 'inline-block'; cx.textContent = "Rename X"; }
            if(co) { co.style.display = isComputerO ? 'none' : 'inline-block'; co.textContent = "Rename O"; }
            if(ccpu) { ccpu.style.display = isComputerO ? 'none' : 'inline-block'; }
        } else {
            if(cx) cx.style.display = uidX ? 'none' : 'inline-block';
            if(co) co.style.display = (uidO || isComputerO) ? 'none' : 'inline-block';
            if(ccpu) ccpu.style.display = (uidO || isComputerO) ? 'none' : 'inline-block';
        }
        
        const xEl = document.getElementById('hs-x-wins');
        const oEl = document.getElementById('hs-o-wins');
        if (xEl) xEl.textContent = xWins;
        if (oEl) oEl.textContent = oWins;
        
        const hostEl = document.getElementById('hs-host-msg');
        if (hostEl) {
            hostEl.innerHTML = hostMessage;
        }
    }

    async function clickSq(i, fromCpu = false) {
        if (matchOver || isChallengeMode || boardState[i] || hsIsTransitioning) return;
        
        const qDisplay = document.getElementById('hs-question-display');
        if (qDisplay && !qDisplay.classList.contains('d-none')) return;
        
        if (!(await checkCanAct("select a square", fromCpu))) return;
        
        const data = window.currentChapterData.hollywoodData;
        const q = data[Math.floor(Math.random() * data.length)];
        const isTruth = Math.random() > 0.5;
        
        const currentPlayerName = turn === 'X' ? playerX : playerO;
        const celebName = selectedCelebs[i];
        const msg = `<strong>${currentPlayerName}</strong> selects <strong>${celebName}</strong>! Let's hear the question...`;
        
        let baseResp = isTruth ? (q.answer || '') : (q.lie || '');
        let reasonText = "";
        
        let rawReason = String(q.reason || q.explanation || q.desc || "").trim();
        
        if (isTruth) {
            if (rawReason !== "") {
                reasonText = rawReason;
            } else {
                const truthReasons = [
                    "I know this for a fact.",
                    "We learned about this recently.",
                    "I'm absolutely positive about this one.",
                    "This is standard knowledge.",
                    "Trust me on this one."
                ];
                reasonText = truthReasons[Math.floor(Math.random() * truthReasons.length)];
            }
        } else {
            const fakeReasons = [
                "I read it on the internet recently.",
                "My friend told me that once.",
                "I'm pretty sure that's what I learned in school.",
                "I saw it in a documentary.",
                "It just feels right to me.",
                "I'm 100% confident about this.",
                "Don't quote me on this, but I'm pretty sure.",
                "I think I saw a TikTok about this.",
                "That's my final answer, locked in."
            ];
            reasonText = fakeReasons[Math.floor(Math.random() * fakeReasons.length)];
        }
        
        let cleanBase = String(baseResp || '').trim();
        if (cleanBase && !/[.!?]$/.test(cleanBase)) cleanBase += ".";
        let combinedResp = cleanBase ? `${cleanBase} ${reasonText}` : reasonText;
        
        const qData = {
            index: i,
            question: String(q.question || ""),
            c_resp: `"${String(combinedResp)}"`,
            isTruth: Boolean(isTruth),
            celebName: String(celebName || "")
        };

        if (roomID && roomID !== "solo" && dbRef && docRef) {
            window.updateDoc(docRef, { activeQuestion: qData, hostMessage: msg }).catch(e=>console.log(e));
        } else {
            updateHost(msg);
            showQuestionUI(qData);
            triggerStateEvaluation(); 
        }
    }

    function showQuestionUI(qData) {
        currentSquareIndex = qData.index;
        window.currentHSAnswer = qData.isTruth;
        
        setGlow(qData.index);
        
        const promptEl = document.getElementById('hs-prompt');
        if (promptEl) promptEl.classList.add('d-none');
        
        const displayEl = document.getElementById('hs-question-display');
        if (displayEl) displayEl.classList.remove('d-none');
        
        const fbEl = document.getElementById('hs-feedback-area');
        if (fbEl) fbEl.innerHTML = '';
        
        const qTextEl = document.getElementById('hs-q-text');
        if (qTextEl) qTextEl.innerHTML = safeEscape(qData.question);
        
        const respEl = document.getElementById('hs-c-response');
        if (respEl) respEl.innerHTML = safeEscape(qData.c_resp); 
        
        const respLabel = document.getElementById('hs-c-resp-label');
        if (respLabel && qData.celebName) {
            respLabel.textContent = `${qData.celebName}'s Response:`;
        } else if (respLabel) {
            respLabel.textContent = `Celebrity Response:`;
        }
        
        document.querySelectorAll('#hs-question-display button').forEach(b => {
            b.disabled = false;
            b.classList.remove('d-none');
        });
        
        const title = document.getElementById('hs-turn-title');
        if (title) {
            if (isChallengeMode) {
                title.textContent = "CHALLENGE!";
                title.style.color = "var(--file-name-color)";
            } else {
                title.textContent = "Current Turn";
                title.style.color = "var(--tertiary-color)";
            }
        }
    }

    function hideQuestionUI() {
        const d = document.getElementById('hs-question-display');
        if(d) d.classList.add('d-none');
        const p = document.getElementById('hs-prompt');
        if(p) p.classList.remove('d-none');
        const f = document.getElementById('hs-feedback-area');
        if(f) f.innerHTML = '';
        const t = document.getElementById('hs-turn-title');
        if(t) {
            t.textContent = "Current Turn";
            t.style.color = "var(--tertiary-color)";
        }
        resetGlow();
    }

    function wouldWin(board, symbol, index) {
        const tempBoard = [...board];
        tempBoard[index] = symbol;
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for(let w of wins) {
            if(tempBoard[w[0]] === symbol && tempBoard[w[1]] === symbol && tempBoard[w[2]] === symbol) {
                return true;
            }
        }
        if (tempBoard.filter(s => s === symbol).length >= 5) return true;
        return false;
    }

    async function judge(userAgree, fromCpu = false) {
        if (!(await checkCanAct("answer the question", fromCpu))) return;
        
        document.querySelectorAll('#hs-question-display button').forEach(b => b.disabled = true);
        const isCorrect = (userAgree === window.currentHSAnswer);
        const opponentSymbol = turn === 'X' ? 'O' : 'X';
        const opponentName = opponentSymbol === 'X' ? playerX : playerO;
        const turnName = turn === 'X' ? playerX : playerO;
        const fb = document.getElementById('hs-feedback-area');
        
        if(isCorrect) { 
            fb.innerHTML = `<div class="p-2 rounded fw-bold small mb-2 shadow-sm" style="background-color: var(--code-color); color: white;">Correct! Square to ${turnName} (${turn}).</div>`; 
            updateHost(`Spot on! <strong>${turnName}</strong> claims the square.`);
            markSquare(currentSquareIndex, turn); 
            isChallengeMode = false;
            hsIsTransitioning = true;
            setTimeout(() => { hsIsTransitioning = false; resetInteraction(); checkWin(); triggerStateEvaluation(); }, 1500);
        } else {
            if (!isChallengeMode) {
                if (wouldWin(boardState, opponentSymbol, currentSquareIndex)) {
                    fb.innerHTML = `<div class="p-2 rounded fw-bold small mb-2 shadow-sm" style="background-color: var(--file-name-color); color: white;">Wrong! But ${opponentName} (${opponentSymbol}) must earn the win on a new question!</div>`;
                    updateHost(`Wrong! <strong>${opponentName}</strong> must answer correctly to claim the win!`);
                    
                    isChallengeMode = true;
                    turn = opponentSymbol;
                    syncBoardUI();
                    
                    document.querySelectorAll('#hs-question-display button').forEach(b => b.classList.add('d-none'));
                    
                    if (roomID && roomID !== "solo" && dbRef && docRef) window.updateDoc(docRef, { turn, isChallengeMode }).catch(e=>console.log(e));
                    
                    hsIsTransitioning = true;
                    setTimeout(() => {
                        hsIsTransitioning = false;
                        const data = window.currentChapterData?.hollywoodData;
                        const q = data[Math.floor(Math.random() * data.length)];
                        const isTruth = Math.random() > 0.5;
                        const celebName = selectedCelebs[currentSquareIndex];
                        
                        let baseResp = isTruth ? (q.answer || '') : (q.lie || '');
                        let reasonText = "";
                        
                        let rawReason = String(q.reason || q.explanation || q.desc || "").trim();
                        
                        if (isTruth) {
                            if (rawReason !== "") {
                                reasonText = rawReason;
                            } else {
                                const truthReasons = ["I know this for a fact.", "We learned about this recently.", "I'm absolutely positive about this one.", "This is standard knowledge.", "Trust me on this one."];
                                reasonText = truthReasons[Math.floor(Math.random() * truthReasons.length)];
                            }
                        } else {
                            const fakeReasons = ["I read it on the internet recently.", "My friend told me that once.", "I'm pretty sure that's what I learned in school.", "I saw it in a documentary.", "It just feels right to me.", "I'm 100% confident about this.", "Don't quote me on this, but I'm pretty sure.", "I think I saw a TikTok about this.", "That's my final answer, locked in."];
                            reasonText = fakeReasons[Math.floor(Math.random() * fakeReasons.length)];
                        }
                        
                        let cleanBase = String(baseResp || '').trim();
                        if (cleanBase && !/[.!?]$/.test(cleanBase)) cleanBase += ".";
                        let combinedResp = cleanBase ? `${cleanBase} ${reasonText}` : reasonText;
                        
                        const qData = {
                            index: currentSquareIndex,
                            question: String(q.question || ""),
                            c_resp: `"${String(combinedResp)}"`,
                            isTruth: Boolean(isTruth),
                            celebName: String(celebName || "")
                        };
                        
                        if (roomID && roomID !== "solo" && dbRef && docRef) {
                            window.updateDoc(docRef, { activeQuestion: qData }).catch(e=>console.log(e));
                        } else {
                            showQuestionUI(qData);
                            triggerStateEvaluation();
                        }
                    }, 3000); 
                } else {
                    fb.innerHTML = `<div class="p-2 rounded fw-bold small mb-2 shadow-sm" style="background-color: var(--file-name-color); color: white;">Wrong! Square automatically goes to ${opponentName} (${opponentSymbol}).</div>`;
                    updateHost(`Incorrect! The square is stolen by <strong>${opponentName}</strong>.`);
                    markSquare(currentSquareIndex, opponentSymbol);
                    hsIsTransitioning = true;
                    setTimeout(() => { hsIsTransitioning = false; resetInteraction(); checkWin(); triggerStateEvaluation(); }, 1500);
                }
            } else {
                fb.innerHTML = `<div class="p-2 rounded fw-bold small mb-2 shadow-sm" style="background-color: var(--quaternary-color); color: var(--primary-color);">Both players missed! Square remains neutral.</div>`;
                updateHost(`Both players missed! The square remains blank.`);
                isChallengeMode = false;
                turn = opponentSymbol; 
                syncBoardUI();
                
                if (roomID && roomID !== "solo" && dbRef && docRef) window.updateDoc(docRef, { turn, isChallengeMode }).catch(e=>console.log(e));
                
                hsIsTransitioning = true;
                setTimeout(() => { hsIsTransitioning = false; resetInteraction(); checkWin(); triggerStateEvaluation(); }, 2000);
            }
        }
    }

    function resetInteraction() {
        if (roomID && roomID !== "solo" && dbRef && docRef) {
            window.updateDoc(docRef, { activeQuestion: null }).catch(e=>console.log(e));
        } else {
            hideQuestionUI();
        }
    }

    function markSquare(index, symbol) {
        boardState[index] = symbol;
        turn = turn === 'X' ? 'O' : 'X';
        isChallengeMode = false;
        resetGlow();
        if (roomID && roomID !== "solo" && dbRef && docRef) {
            window.updateDoc(docRef, { board: boardState, turn, isChallengeMode }).catch(e=>console.log(e));
        }
        syncBoardUI();
    }

    async function checkWin() {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        let winner = null;
        for(let w of wins) { if(boardState[w[0]] && boardState[w[0]] === boardState[w[1]] && boardState[w[0]] === boardState[w[2]]) { winner = boardState[w[0]]; break; } }
        if (!winner) { const xCount = boardState.filter(s => s === 'X').length, oCount = boardState.filter(s => s === 'O').length; if (xCount >= 5) winner = 'X'; else if (oCount >= 5) winner = 'O'; }
        if(winner) {
            let winnerName = winner === 'X' ? playerX : playerO;
            let nextTurnName = turn === 'X' ? playerX : playerO;
            if(winner === 'X') xWins++; else oWins++;
            const xEl = document.getElementById('hs-x-wins');
            const oEl = document.getElementById('hs-o-wins');
            if (xEl) xEl.textContent = xWins;
            if (oEl) oEl.textContent = oWins;
            
            if(xWins >= 2 || oWins >= 2) { 
                updateHost(`MATCH OVER! <strong>${winnerName}</strong> is the grand champion!`);
                await window.GameModal.alert(`MATCH OVER! ${winnerName} (${winner}) wins the series!`); 
                matchOver = true; 
            } else { 
                updateHost(`<strong>${winnerName}</strong> wins the round! Starting the next round... <strong>${nextTurnName}</strong>, pick a square.`);
                await window.GameModal.alert(`${winnerName} (${winner}) wins the round! Starting next...`); 
                boardState.fill(null); 
                renderGrid(window.currentChapterData.hollywoodData); 
            }
            if (roomID && roomID !== "solo" && dbRef && docRef) window.updateDoc(docRef, { xWins, oWins, board: boardState }).catch(e=>console.log(e));
        } else if(!boardState.includes(null)) { 
            let nextTurnName = turn === 'X' ? playerX : playerO;
            updateHost(`It's a Draw! Resetting the board... <strong>${nextTurnName}</strong>, pick a square.`);
            await window.GameModal.alert("Draw! Resetting round..."); 
            boardState.fill(null); 
            renderGrid(window.currentChapterData.hollywoodData); 
            if (roomID && roomID !== "solo" && dbRef && docRef) window.updateDoc(docRef, { board: boardState }).catch(e=>console.log(e));
        }
    }
    
    return { setup, clickSq, judge, showHowToPlay, leaveGame, handleJoinForm };
})();