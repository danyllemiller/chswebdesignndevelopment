// ======================================================
// 1. JEOPARDY ENGINE
// ======================================================
window.Jeopardy = (() => {
    let isPanelSetup = false; 
    let dbRef, appIdRef, roomID, docRef;
    let jUnsub = null;
    let localState = { scores: {}, spent: [], teams: [], cpuTeams: [], activeBuzzer: null, boardControl: null, activeModal: null, finalJeopardy: null };
    let hostMessage = "Welcome to Jeopardy! Add teams or CPUs to begin.";
    let myJeopardyName = "";
    
    let countdownInterval = null;
    let currentTimerType = null;
    let jeopardyCpuTimer = null;
    let jeopardyCpuAnswerTimer = null;
    let jeopardyCpuPickSquareTimer = null;

    function safeAttributeEscape(str) {
        try {
            if (typeof str !== 'string') str = String(str || '');
            if (typeof window !== 'undefined' && typeof window.escapeHTML === 'function') return window.escapeHTML(str);
            if (str.includes('&lt;') || str.includes('<code>')) return str; 
            return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        } catch(e) { return String(str || ''); }
    }

    function showHowToPlay() {
        let htp = document.getElementById('j-how-to-modal');
        if (!htp) {
            htp = document.createElement('div');
            htp.id = 'j-how-to-modal';
            htp.className = "position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3 d-none";
            htp.style.cssText = "z-index:9999; background:rgba(0,0,0,0.85); backdrop-filter: blur(5px);";
            htp.innerHTML = `
                <div class="card shadow-lg p-4 text-start rounded-4" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color); max-width: 600px; width: 100%;">
                    <div class="d-flex justify-content-between align-items-center pb-2 mb-3" style="border-bottom: 2px solid var(--tertiary-color);">
                        <h3 class="fw-bold mb-0" style="color: var(--secondary-color); font-family: var(--font-family-monospace, monospace);">How to Play: Jeopardy</h3>
                        <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('j-how-to-modal').classList.replace('d-flex', 'd-none')"></button>
                    </div>
                    <p style="color: var(--secondary-color); font-size: 0.95rem;"><strong>📺 The TV Show:</strong> Contestants pick trivia clues from a board by category and value. The host reads the clue, and the first to buzz in gets to answer. You must answer in the form of a question!</p>
                    <p style="color: var(--secondary-color); font-size: 0.95rem;"><strong>💻 On This Site:</strong><br><br>
                    • <strong>Solo/AI:</strong> Add your team, then click "Play AI" to spawn bot opponents who will randomly buzz in!<br><br>
                    • <strong>Multiplayer:</strong> The first person to join acts as the Host and has control of the board. When the Host clicks a square, the question appears on everyone's screen. The first person to tap their "🚨 Buzz In" button gets to answer!<br><br>
                    • The Host decides if the typed answer is correct or wrong and awards the points. Don't forget to click "Final Jeopardy" at the end!</p>
                    <button type="button" class="btn btn-lg w-100 shadow-sm mt-2 fw-bold" onclick="document.getElementById('j-how-to-modal').classList.replace('d-flex', 'd-none')" style="background-color: var(--secondary-color); color: var(--primary-color); border: none;">Got It!</button>
                </div>
            `;
            document.body.appendChild(htp);
        }
        htp.classList.remove('d-none');
        htp.classList.add('d-flex');
    }

    function setup(db, appId, room) {
        dbRef = db; appIdRef = appId; roomID = room;
        const boardContainer = document.getElementById('jeopardy-board');
        if (!boardContainer) return;
        const data = window.currentChapterData?.jeopardyData;
        const table = boardContainer.tagName === 'TABLE' ? boardContainer : boardContainer.querySelector('table');

        if (!document.getElementById('buzzer-styles')) {
            const style = document.createElement('style');
            style.id = 'buzzer-styles';
            style.innerHTML = `@keyframes pulseBuzzer { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }`;
            document.head.appendChild(style);
        }

        if (roomID && roomID !== "solo" && dbRef) {
            const chapterKey = window.currentChapterData?.chapterTitle ? window.currentChapterData.chapterTitle.replace(/[^a-zA-Z0-9]/g, '') : 'General';
            const namespacedRoomID = chapterKey + "_" + roomID;
            docRef = window.doc(dbRef, 'artifacts', appIdRef, 'public', 'data', 'jeopardyRooms', namespacedRoomID);
            
            if (window.globalPlayerName) {
                handleJoin(window.globalPlayerName);
            } else {
                showInlineJoinPrompt(boardContainer);
            }
        } else {
            hostMessage = "Welcome to Jeopardy! Add teams or CPUs to begin.";
            if (table && data) {
                populateHardcodedTable(table, data);
                attachListeners(table);
                setupScoreboard();
                return;
            }
            if (!data) return;
            renderBoard(boardContainer, data);
            setupScoreboard();
        }
    }

    async function leaveGame(skipConfirm = false) {
        if (skipConfirm && (!roomID || roomID === "solo")) return;
        
        if (!skipConfirm && myJeopardyName && !(await window.GameModal.confirm("Are you sure you want to completely leave this game?"))) return;
        
        if (roomID !== "solo" && docRef) {
            try {
                const snap = await window.getDoc(docRef);
                if (snap.exists()) {
                    let d = snap.data();
                    let t = d.teams || [];
                    let s = d.scores || {};
                    let cpus = d.cpuTeams || [];
                    
                    t = t.filter(x => x !== myJeopardyName);
                    delete s[myJeopardyName];
                    
                    let updates = { teams: t, scores: s };
                    
                    // Check if there are any human players left
                    const remainingHumans = t.filter(team => !cpus.includes(team));
                    
                    if (remainingHumans.length === 0) {
                        // Kicks all AIs and fully resets the room if no humans are left
                        updates.teams = [];
                        updates.scores = {};
                        updates.cpuTeams = [];
                        updates.boardControl = null;
                        updates.activeBuzzer = null;
                        updates.activeModal = null;
                        updates.finalJeopardy = null;
                        updates.hostMessage = "Welcome to Jeopardy! Add teams or CPUs to begin.";
                    } else {
                        // Normal turn-passing if other humans are still playing
                        if (d.boardControl === myJeopardyName) updates.boardControl = t.length > 0 ? t[0] : null;
                        if (d.activeBuzzer === myJeopardyName) updates.activeBuzzer = null;
                    }
                    
                    await window.updateDoc(docRef, updates).catch(e=>{});
                }
            } catch(e){}
        }

        if (jUnsub) { jUnsub(); jUnsub = null; }
        myJeopardyName = "";
        
        if (!skipConfirm) {
            window.globalPlayerName = ""; 
        }
        
        if (jeopardyCpuPickSquareTimer) { clearTimeout(jeopardyCpuPickSquareTimer); jeopardyCpuPickSquareTimer = null; }
        
        localState = { scores: {}, spent: [], teams: [], cpuTeams: [], activeBuzzer: null, boardControl: null, activeModal: null, finalJeopardy: null };

        const boardContainer = document.getElementById('jeopardy-board');
        
        let hb = document.getElementById('j-host-box-wrapper');
        let sb = document.getElementById('jeopardy-scoreboard');

        if (hb) {
            if (sb) hb.parentNode.insertBefore(sb, hb);
            hb.remove();
        }
        if (sb) {
            sb.innerHTML = '';
            sb.className = 'row row-cols-2 row-cols-lg-4 g-2 mb-3';
        }

        if (!roomID || roomID === "solo") {
            hostMessage = "Welcome to Jeopardy! Add teams or CPUs to begin.";
            const data = window.currentChapterData?.jeopardyData;
            if (data) renderBoard(boardContainer, data);
            setupScoreboard();
        } else {
            showInlineJoinPrompt(boardContainer);
        }
    }

    function showInlineJoinPrompt(container) {
        container.innerHTML = `
            <div class="card shadow-sm p-5 text-center my-4 rounded-4" style="background-color: var(--secondary-color); border: 2px solid var(--primary-color);">
                <h2 class="fw-bold mb-3" style="color: var(--primary-color);">Jeopardy Multiplayer</h2>
                <p class="mb-4 fs-5" style="color: var(--primary-color);">Enter your name or team name to join!</p>
                <input type="text" id="j-join-name" maxlength="15" value="${window.globalPlayerName || ''}" class="form-control form-control-lg mb-4 text-center fw-bold mx-auto" style="max-width: 300px; color: var(--primary-color); border: 2px solid var(--primary-color); background-color: white;" placeholder="Player Name" onkeydown="if(event.key === 'Enter') window.Jeopardy.handleJoinForm()">
                <button type="button" class="btn btn-lg fw-bold shadow-sm mx-auto" style="max-width: 300px; width:100%; background-color: var(--primary-color); color: white; border: none;" onclick="window.Jeopardy.handleJoinForm()">Join Game</button>
            </div>
        `;
    }

    function handleJoinForm() {
        if (!docRef || !roomID || roomID === "solo") { location.reload(); return; }
        const inputEl = document.getElementById('j-join-name');
        if (!inputEl) return;
        const nameInp = inputEl.value.trim().substring(0, 15);
        const finalName = nameInp || window.globalPlayerName || ("Player_" + Math.floor(Math.random()*1000));
        handleJoin(finalName);
    }

    async function handleJoin(name) {
        if (!docRef || !roomID || roomID === "solo") return;
        
        myJeopardyName = name;
        window.globalPlayerName = name; 
        
        try {
            const snap = await window.getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                const teams = data.teams || [];
                const scores = data.scores || {};
                if (!teams.includes(myJeopardyName)) {
                    if (teams.length >= 4) {
                        await window.GameModal.alert("Match is full! You are joining as a viewer.");
                    } else {
                        teams.push(myJeopardyName);
                        scores[myJeopardyName] = 0;
                        const isFirstTeam = teams.length === 1;
                        let msg = `<strong>${myJeopardyName}</strong> has joined the game!`;
                        if(isFirstTeam) msg += ` <strong>${myJeopardyName}</strong>, you have control of the board!`;
                        
                        const updateData = { teams, scores, hostMessage: msg };
                        if (isFirstTeam) updateData.boardControl = myJeopardyName;
                        
                        await window.updateDoc(docRef, updateData).catch(e=>{});
                    }
                }
            } else {
                let msg = `<strong>${myJeopardyName}</strong> has joined the game! You have control of the board!`;
                await window.setDoc(docRef, {
                    teams: [myJeopardyName],
                    scores: { [myJeopardyName]: 0 },
                    spent: [],
                    cpuTeams: [],
                    boardControl: myJeopardyName,
                    hostMessage: msg,
                    activeBuzzer: null,
                    activeModal: null,
                    finalJeopardy: null
                });
            }
        } catch(e) {}

        jUnsub = window.onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                localState = snap.data();
                syncJeopardyUI();
                
                if (localState.activeModal && !localState.finalJeopardy) {
                    showPanelUI(localState.activeModal);
                    if (localState.activeModal.revealed) {
                        showAnswer(!!localState.activeModal.matchName, localState.activeModal.isTimeUp, localState.activeModal.matchName);
                        disableInputs();
                    }
                } else if (!localState.finalJeopardy) {
                    hidePanelUI();
                }
            }
        });

        const boardContainer = document.getElementById('jeopardy-board');
        const data = window.currentChapterData?.jeopardyData;
        const table = boardContainer.tagName === 'TABLE' ? boardContainer : boardContainer.querySelector('table');
        if (table && data) {
            populateHardcodedTable(table, data);
            attachListeners(table);
            setupScoreboard();
        } else if (data) {
            renderBoard(boardContainer, data);
            setupScoreboard();
        }
    }

    function startTimer(seconds, callback, onTick = null) {
        clearInterval(countdownInterval);
        const timerDisplay = document.getElementById('j-timer-display');
        if (!timerDisplay) return;
        
        let timeLeft = seconds;
        timerDisplay.textContent = `⏳ Time: ${timeLeft}s`;
        if (onTick) onTick(timeLeft);
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0) {
                timerDisplay.textContent = `⏳ Time: ${timeLeft}s`;
            }
            if (onTick) onTick(timeLeft);
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                timerDisplay.textContent = `⏳ Time's Up!`;
                callback();
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(countdownInterval);
        currentTimerType = null;
        const timerDisplay = document.getElementById('j-timer-display');
        if (timerDisplay) timerDisplay.textContent = '';
    }

    function updateHost(msg) {
        hostMessage = msg;
        if (roomID && roomID !== "solo" && dbRef && docRef) {
            window.updateDoc(docRef, { hostMessage }).catch(e=>console.log(e));
        } else {
            localState.hostMessage = msg;
            syncJeopardyUI();
        }
    }

    function clearBuzzerState(msg) {
        if (jeopardyCpuAnswerTimer) { clearTimeout(jeopardyCpuAnswerTimer); jeopardyCpuAnswerTimer = null; }
        if (jeopardyCpuTimer) { clearTimeout(jeopardyCpuTimer); jeopardyCpuTimer = null; }

        if (roomID && roomID !== "solo" && dbRef && docRef) {
            window.updateDoc(docRef, { activeBuzzer: null, hostMessage: msg || "Buzzer cleared. Floor is open!" }).catch(e=>console.log(e));
        } else {
            localState.activeBuzzer = null;
            if (msg) localState.hostMessage = msg;
            syncJeopardyUI();
        }
    }

    function renderBuzzers() {
        let buzzerSec = document.getElementById('j-buzzer-section');
        if (!buzzerSec) return;

        if (localState.finalJeopardy) {
            buzzerSec.innerHTML = '';
            return;
        }

        if (!localState.activeModal) {
            buzzerSec.innerHTML = '';
            stopTimer();
            return;
        }

        const ans = document.getElementById('j-panel-answer');
        if (ans && !ans.classList.contains('d-none')) {
            stopTimer();
            buzzerSec.classList.add('d-none');
            return;
        }

        const teams = localState.teams || [];
        const cpus = localState.cpuTeams || [];
        const isHost = (roomID === "solo") || (myJeopardyName === localState.boardControl);
        
        // Central tick handler to monitor the last 10 seconds of any active timer
        const tickHandler = (timeLeft) => {
            const revealBtn = document.getElementById('j-reveal-btn');
            const isHostCheck = (roomID === "solo") || (myJeopardyName === localState.boardControl);
            if (revealBtn && isHostCheck && !localState.finalJeopardy) {
                if (timeLeft <= 10) {
                    revealBtn.classList.remove('d-none');
                } else {
                    revealBtn.classList.add('d-none');
                }
            }
        };

        if (localState.activeBuzzer) {
            const isMyTurn = (roomID === "solo") || (myJeopardyName === localState.activeBuzzer);
            const isCpuTurn = cpus.includes(localState.activeBuzzer);

            let clearBtnHtml = '';
            // Allow the host or the person who currently buzzed in to clear the buzzer
            if (isHost || isMyTurn) {
                clearBtnHtml = `<button type="button" class="btn btn-sm fw-bold shadow-sm ms-1" id="j-clear-buzzer-btn" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; height: 30px; padding: 0 6px; font-size: 0.7rem;">Clear</button>`;
            }

            buzzerSec.innerHTML = `
                <div class="d-flex align-items-center justify-content-center w-100">
                    <div class="p-1 px-3 rounded fw-bold shadow-sm text-center text-truncate w-100" style="background-color: var(--file-name-color); color: white; animation: pulseBuzzer 1s infinite; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">
                        🚨 ${localState.activeBuzzer}
                    </div>
                    ${clearBtnHtml}
                </div>
            `;
            
            if (isHost || isMyTurn) {
                const clearBtn = document.getElementById('j-clear-buzzer-btn');
                if (clearBtn) {
                    clearBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        const teamName = localState.activeBuzzer;
                        clearBuzzerState(`<strong>${teamName}</strong>'s buzzer was cleared. Floor is open!`);
                    });
                }
            }

            const inp = document.getElementById('j-user-answer');
            const check = document.getElementById('j-check-btn');

            if (isMyTurn && !isCpuTurn) {
                if (inp) inp.classList.remove('d-none');
                if (check) check.classList.remove('d-none');
                const inputRow = document.getElementById('j-answer-input-wrap');
                if (inputRow) inputRow.classList.remove('d-none');
                if (inp && !inp.disabled) inp.focus();
            } else {
                if (inp) inp.classList.add('d-none');
                if (check) check.classList.add('d-none');
                const inputRow = document.getElementById('j-answer-input-wrap');
                if (inputRow) inputRow.classList.add('d-none');
            }

            if (currentTimerType !== 'answer') {
                currentTimerType = 'answer';
                startTimer(30, () => {
                    const teamName = localState.activeBuzzer;
                    clearBuzzerState(`Time is up for <strong>${teamName}</strong>! Floor is back open.`);
                }, tickHandler);
            }

            if (isCpuTurn && (!roomID || roomID === "solo" || myJeopardyName === localState.boardControl)) {
                if (!jeopardyCpuAnswerTimer) {
                    jeopardyCpuAnswerTimer = setTimeout(async () => {
                        const isCorrect = Math.random() < 0.75; 
                        const valEl = document.getElementById('j-panel-val');
                        const valText = valEl ? valEl.textContent.replace('$', '') : '0';
                        const val = parseInt(valText) || 0;
                        const teamName = localState.activeBuzzer;
                        
                        if (isCorrect) {
                            updateHost(`Correct! <strong>${teamName}</strong> is awarded $${val}.`);
                            if (roomID !== "solo" && docRef) {
                                const snap = await window.getDoc(docRef);
                                const scores = snap.data().scores || {};
                                scores[teamName] = (scores[teamName] || 0) + val;
                                await window.updateDoc(docRef, { scores, boardControl: teamName, "activeModal.revealed": true, "activeModal.matchName": teamName }).catch(e=>{});
                            } else {
                                localState.scores[teamName] = (localState.scores[teamName] || 0) + val;
                                localState.boardControl = teamName;
                                if (localState.activeModal) {
                                    localState.activeModal.revealed = true;
                                    localState.activeModal.matchName = teamName;
                                }
                                syncJeopardyUI();
                                showAnswer(true, false, teamName);
                                disableInputs();
                            }
                            setTimeout(() => { closeActiveModal(); }, 4000);
                        } else {
                            clearBuzzerState(`Incorrect! <strong>${teamName}</strong> was wrong. Floor is open!`);
                        }
                        jeopardyCpuAnswerTimer = null;
                    }, 2500); 
                }
            }
            
        } else if (teams.length > 0) {
            buzzerSec.innerHTML = '<div class="d-flex justify-content-center gap-2 flex-wrap w-100" id="j-buzzer-buttons"></div>';
            const btnContainer = document.getElementById('j-buzzer-buttons');
            
            const teamsToShow = (roomID !== "solo" && myJeopardyName) ? [myJeopardyName] : teams;
            
            teamsToShow.forEach(team => {
                if (!teams.includes(team) || cpus.includes(team)) return; 

                const b = document.createElement('button');
                b.setAttribute("type", "button");
                b.className = 'btn btn-sm fw-bold shadow-sm w-100 py-0';
                b.style.cursor = 'pointer';
                b.style.touchAction = 'manipulation';
                b.style.backgroundColor = 'var(--file-name-color)';
                b.style.color = 'white';
                b.style.border = 'none';
                b.style.height = '30px';
                b.style.fontSize = '0.8rem';
                b.innerHTML = `🚨 Buzz in`;
                
                b.addEventListener('click', async function(e) {
                    e.preventDefault();
                    this.disabled = true; 
                    
                    if (roomID && roomID !== "solo" && dbRef && docRef) {
                        const snap = await window.getDoc(docRef);
                        if (snap.exists() && snap.data().activeBuzzer) { return; }
                        await window.updateDoc(docRef, { activeBuzzer: team }).catch(e=>{});
                        updateHost(`🚨 <strong>${team}</strong> buzzed in! What is your answer?`);
                    } else {
                        if (localState.activeBuzzer) return;
                        updateHost(`🚨 <strong>${team}</strong> buzzed in! What is your answer?`);
                        localState.activeBuzzer = team;
                        syncJeopardyUI();
                    }
                });

                btnContainer.appendChild(b);
            });
            
            const inp = document.getElementById('j-user-answer');
            if (inp) inp.classList.add('d-none');
            const check = document.getElementById('j-check-btn');
            if (check) check.classList.add('d-none');
            const inputRow = document.getElementById('j-answer-input-wrap');
            if (inputRow) inputRow.classList.add('d-none');

            if (cpus.length > 0 && (!roomID || roomID === "solo" || myJeopardyName === localState.boardControl)) {
                if (!jeopardyCpuTimer) {
                    jeopardyCpuTimer = setTimeout(async () => {
                        if (!localState.activeBuzzer) { 
                            const cpu = cpus[Math.floor(Math.random() * cpus.length)];
                            if (roomID !== "solo" && docRef) {
                                const snap = await window.getDoc(docRef);
                                if (snap.exists() && !snap.data().activeBuzzer) {
                                    await window.updateDoc(docRef, { activeBuzzer: cpu }).catch(e=>{});
                                    updateHost(`🚨 <strong>${cpu}</strong> buzzed in!`);
                                }
                            } else {
                                localState.activeBuzzer = cpu; 
                                updateHost(`🚨 <strong>${cpu}</strong> buzzed in!`);
                                syncJeopardyUI();
                            }
                        }
                        jeopardyCpuTimer = null;
                    }, Math.random() * 5000 + 25000); 
                }
            }

            if (currentTimerType !== 'buzz') {
                currentTimerType = 'buzz';
                startTimer(45, async () => {
                    const controller = localState.boardControl || "Someone";
                    updateHost(`Time is up! No one buzzed in. Revealing answer. <strong>${controller}</strong>, pick the next clue.`);
                    
                    if (roomID && roomID !== "solo" && dbRef && docRef) {
                        await window.updateDoc(docRef, { 
                            "activeModal.revealed": true,
                            "activeModal.isTimeUp": true
                        }).catch(e=>{});
                    } else {
                        if (localState.activeModal) {
                            localState.activeModal.revealed = true;
                            localState.activeModal.isTimeUp = true;
                        }
                        showAnswer(false, true);
                        disableInputs();
                    }
                    setTimeout(() => { closeActiveModal(); }, 4000);
                }, tickHandler);
            }
        } else {
            buzzerSec.innerHTML = '<div class="p-1 rounded fw-bold text-center small w-100" style="background-color: var(--secondary-color); color: var(--primary-color); border: 1px solid var(--tertiary-color); height: 30px; display: flex; align-items: center; justify-content: center;">Please add players!</div>';
            const inp = document.getElementById('j-user-answer');
            if (inp) inp.classList.add('d-none');
            const check = document.getElementById('j-check-btn');
            if (check) check.classList.add('d-none');
            stopTimer(); 
        }
    }

    function syncJeopardyUI() {
        const boardTable = document.querySelector('.jeopardy-table');
        if (boardTable) {
            const isMyTurnToPick = (roomID === "solo") || (localState.boardControl === myJeopardyName);
            const isModalActive = !!localState.activeModal;
            if (!isMyTurnToPick || isModalActive) {
                boardTable.style.pointerEvents = 'none';
                boardTable.style.opacity = '0.7'; 
            } else {
                boardTable.style.pointerEvents = 'auto';
                boardTable.style.opacity = '1';
            }
        }

        // BOARD COLORS: Primary Blue & File Name Color when fresh, Quaternary Grey when spent
        document.querySelectorAll('.question-btn').forEach(btn => {
            if (!btn.dataset.question || btn.dataset.question.trim() === "" || btn.dataset.question === "undefined") {
                btn.classList.add('disabled', 'btn-spent');
                btn.style.opacity = '1';
                btn.style.backgroundColor = '#808080';
                btn.style.color = 'transparent';
                btn.innerHTML = "&nbsp;";
                btn.style.pointerEvents = 'none';
                return;
            }
            
            const id = `${btn.dataset.cat}-${btn.dataset.val}`;
            if (localState.spent && localState.spent.includes(id)) {
                btn.classList.add('disabled', 'btn-spent');
                btn.style.opacity = '1';
                btn.style.backgroundColor = '#808080';
                btn.style.color = 'transparent';
                btn.innerHTML = "&nbsp;";
                btn.style.pointerEvents = 'none';
            } else {
                btn.classList.remove('disabled', 'btn-spent');
                btn.style.opacity = '';
                btn.style.backgroundColor = 'var(--primary-color)';
                btn.style.color = 'var(--file-name-color)';
                btn.textContent = `$${btn.dataset.val}`; 
                btn.style.pointerEvents = 'auto';
            }
        });

        const cardsContainer = document.getElementById('jeopardy-scoreboard-cards');
        if (cardsContainer) {
            const serverTeams = localState.teams || [];
            
            // SAVE EXISTING WAGERS
            const currentWagers = {};
            document.querySelectorAll('[id^="wager-input-"]').forEach(inp => {
                const teamName = inp.id.replace('wager-input-', '');
                currentWagers[teamName] = inp.value;
            });
            
            const activeId = document.activeElement?.dataset?.team;
            const activeVal = document.activeElement?.value;
            const activeSel = document.activeElement?.selectionStart;
            const activeNodeId = document.activeElement?.id;

            cardsContainer.innerHTML = ''; 

            serverTeams.forEach((tName) => {
                const score = (localState.scores && localState.scores[tName]) ? localState.scores[tName] : 0;
                
                const isController = localState.boardControl === tName && !localState.finalJeopardy;
                const borderColor = isController ? 'var(--primary-color)' : 'var(--tertiary-color)';
                const headerBg = isController ? 'var(--primary-color)' : 'var(--secondary-color)';
                const textColor = isController ? 'white' : 'var(--primary-color)';
                
                // Keep the important flag so Bootstrap's defaults don't overpower it
                const glowStyle = isController ? 'box-shadow: 0 0 15px 4px var(--tertiary-color, #ffc107) !important; transform: scale(1.05); z-index: 10;' : 'box-shadow: none !important; transform: none; z-index: 1;';
                const shadowClass = isController ? '' : 'shadow-sm';
                
                let scoreContent = `<h3 class="score-display mb-0">${score}</h3>`;

                // FINAL JEOPARDY SCORE CARD LOGIC
                if (localState.finalJeopardy) {
                    const fj = localState.finalJeopardy;
                    const isCpu = (localState.cpuTeams || []).includes(tName);
                    const isMe = (roomID === "solo") ? !isCpu : (tName === myJeopardyName);
                    
                    if (fj.phase === 'wager') {
                        if (isCpu) {
                            scoreContent = `<div class="small fw-bold text-muted mt-2">Wager Locked</div>`;
                        } else if (isMe) {
                            const isReady = fj.readyForClue?.includes(tName);
                            if (isReady) {
                                scoreContent = `<div class="small fw-bold mt-2" style="color: var(--code-color);">Wager Locked</div>`;
                            } else {
                                const savedWager = currentWagers[tName.replace(/\s+/g, '')] !== undefined ? currentWagers[tName.replace(/\s+/g, '')] : "0";
                                scoreContent = `
                                    <div class="d-flex flex-column align-items-center w-100 px-1">
                                        <input type="number" class="form-control form-control-sm text-center fw-bold w-100 mb-1" id="wager-input-${tName.replace(/\s+/g, '')}" style="border: 2px solid var(--tertiary-color);" placeholder="Wager" value="${savedWager}" min="0" max="${Math.max(score, 100)}">
                                        <button type="button" class="btn btn-sm w-100 text-white fw-bold py-0" style="background-color: var(--tertiary-color); font-size: 0.7rem;" onclick="window.Jeopardy.submitFJWagerAndReady('${tName}')">Lock Wager</button>
                                    </div>`;
                            }
                        } else {
                            scoreContent = `<div class="small fw-bold text-muted mt-2">${fj.readyForClue?.includes(tName) ? 'Wager Locked' : 'Thinking...'}</div>`;
                        }
                    } else if (fj.phase === 'clue') {
                        if (isCpu) {
                            scoreContent = `<div class="small fw-bold text-muted mt-2">${fj.readyForGrade?.includes(tName) ? 'Locked In' : 'Writing...'}</div>`;
                        } else if (isMe) {
                            const isReady = fj.readyForGrade?.includes(tName);
                            if (isReady) {
                                scoreContent = `<div class="small fw-bold mt-2" style="color: var(--code-color);">Locked In</div>`;
                            } else {
                                scoreContent = `<div class="small fw-bold text-muted mt-2">Writing in main box...</div>`;
                            }
                        } else {
                            scoreContent = `<div class="small fw-bold text-muted mt-2">${fj.readyForGrade?.includes(tName) ? 'Locked In' : 'Writing...'}</div>`;
                        }
                    } else if (fj.phase === 'grade' || fj.phase === 'results' || fj.phase === 'end') {
                        const resp = fj.responses?.[tName] || "No Answer";
                        const isCorrect = fj.judged?.[tName];
                        const color = isCorrect === true ? 'var(--code-color)' : (isCorrect === false ? 'var(--file-name-color)' : 'var(--tertiary-color)');
                        scoreContent = `
                            <div class="small fw-bold text-truncate w-100 px-1 mt-1" style="color: ${color}; font-size: 0.8rem;">${safeAttributeEscape(resp)}</div>
                            <h4 class="mb-0 mt-1" style="color: var(--primary-color);">$${score}</h4>
                        `;
                    }
                }

                const col = document.createElement('div');
                col.className = 'col'; 
                col.innerHTML = `
                    <div class="card text-center h-100 ${shadowClass}" style="border: 2px solid ${borderColor}; overflow: hidden; transition: all 0.3s ease; ${glowStyle}">
                        <div class="card-header p-2" style="background-color: ${headerBg}; border-bottom: 1px solid ${borderColor};">
                            <input type="text" class="team-name-input text-center fw-bold w-100" style="background: transparent; border: none; color: ${textColor}; outline: none; font-size: 0.9rem;" value="${tName}" readonly>
                        </div>
                        <div class="card-body p-1 d-flex align-items-center justify-content-center" style="background-color: white; color: var(--primary-color); min-height: 60px;">
                            ${scoreContent}
                        </div>
                    </div>`;
                cardsContainer.appendChild(col);
            });

            if (activeId) {
                const inp = document.querySelector(`input[data-team="${activeId}"]`);
                if (inp) { inp.focus(); inp.value = activeVal; try { inp.setSelectionRange(activeSel, activeSel); } catch(e){} }
            } else if (activeNodeId && activeNodeId.startsWith('wager-input-')) {
                const wInp = document.getElementById(activeNodeId);
                if (wInp) { wInp.focus(); try { wInp.setSelectionRange(activeSel, activeSel); } catch(e){} }
            }
        }
        
        const hostEl = document.getElementById('j-host-msg');
        if (hostEl) {
            hostEl.innerHTML = localState.hostMessage || hostMessage;
        }

        const teamCount = (localState.teams || []).length;
        const addBtnsContainer = document.getElementById('j-add-buttons-container');
        if (addBtnsContainer) {
            if (teamCount >= 4) {
                addBtnsContainer.style.display = 'none';
            } else {
                addBtnsContainer.style.display = 'flex';
            }
        }

        renderFinalJeopardy();

        if (!localState.finalJeopardy) {
            renderBuzzers();

            const humanTeams = (localState.teams || []).filter(t => !(localState.cpuTeams || []).includes(t));
            const amIResponsibleForAI = (roomID === "solo") || (myJeopardyName === humanTeams[0]);

            if (amIResponsibleForAI && !localState.activeModal && (localState.cpuTeams || []).includes(localState.boardControl)) {
                if (!jeopardyCpuPickSquareTimer) {
                    jeopardyCpuPickSquareTimer = setTimeout(() => {
                        const availableBtns = Array.from(document.querySelectorAll('.question-btn:not(.disabled)'));
                        if (availableBtns.length > 0) {
                            const randomBtn = availableBtns[Math.floor(Math.random() * availableBtns.length)];
                            randomBtn.click();
                        }
                        jeopardyCpuPickSquareTimer = null;
                    }, Math.random() * 2000 + 3000); 
                }
            } else {
                if (jeopardyCpuPickSquareTimer) {
                    clearTimeout(jeopardyCpuPickSquareTimer);
                    jeopardyCpuPickSquareTimer = null;
                }
            }
        }
    }

    function renderFinalJeopardy() {
        const fj = localState.finalJeopardy;
        const qa = document.getElementById('j-active-question-area');
        const board = document.getElementById('jeopardy-board');
        const triggerBtn = document.getElementById('j-trigger-final-btn');
        
        if (!fj) {
            if (triggerBtn) triggerBtn.classList.remove('d-none');
            if (board) board.style.display = '';
            return;
        }
        
        if (triggerBtn) triggerBtn.classList.add('d-none');
        if (board) board.style.display = 'none';
        if (qa) qa.classList.remove('d-none');

        const empty = document.getElementById('j-empty-state');
        const filled = document.getElementById('j-filled-state');
        if(empty) empty.classList.add('d-none');
        if(filled) filled.classList.remove('d-none');

        const isHost = (roomID === "solo") || (myJeopardyName === localState.boardControl);

        document.getElementById('j-panel-cat').textContent = "FINAL JEOPARDY";
        document.getElementById('j-panel-val').textContent = "";
        
        const wrap = document.getElementById('j-answer-input-wrap');
        const reveal = document.getElementById('j-reveal-btn');
        const timerDiv = document.getElementById('j-timer-display');
        const qEl = document.getElementById('j-panel-q');
        const ansEl = document.getElementById('j-panel-answer');
        const buzzerSec = document.getElementById('j-buzzer-section');
        
        if (ansEl) ansEl.classList.add('d-none'); 
        if (wrap) wrap.classList.add('d-none');
        if (reveal) reveal.classList.add('d-none');

        if (fj.phase === 'wager') {
            qEl.textContent = "Make your wagers in your team card above!";
            if(timerDiv) timerDiv.classList.add('d-none');

            const humans = (localState.teams || []).filter(t => !(localState.cpuTeams || []).includes(t));
            
            if (isHost && buzzerSec) {
                buzzerSec.innerHTML = `<button type="button" class="btn btn-sm fw-bold w-100 shadow-sm" style="background-color: var(--tertiary-color); color: white;" onclick="window.Jeopardy.advanceFJPhase('clue')">Show Final Clue</button>`;
                buzzerSec.classList.remove('d-none');
            } else if (buzzerSec) buzzerSec.innerHTML = '';
            
            if (isHost && humans.length > 0 && humans.every(t => fj.readyForClue?.includes(t))) {
                window.Jeopardy.advanceFJPhase('clue');
            }

        } else if (fj.phase === 'clue') {
            qEl.innerHTML = safeAttributeEscape(fj.q);
            if(timerDiv) timerDiv.classList.remove('d-none');
            if(buzzerSec) buzzerSec.innerHTML = '';
            
            if (wrap) wrap.classList.remove('d-none');
            
            const inp = document.getElementById('j-user-answer');
            const check = document.getElementById('j-check-btn');
            
            if (inp && check) {
                inp.classList.remove('d-none');
                check.classList.remove('d-none');
                
                const humans = (localState.teams || []).filter(t => !(localState.cpuTeams || []).includes(t));
                const myTeam = (roomID === "solo") ? humans[0] : myJeopardyName;
                const isReady = fj.readyForGrade?.includes(myTeam);
                
                if (isReady) {
                    inp.disabled = true;
                    inp.value = fj.responses?.[myTeam] || inp.value;
                    check.disabled = true;
                    check.textContent = "Locked In";
                } else {
                    inp.disabled = false;
                    check.disabled = false;
                    check.textContent = "Final Answer";
                }
            }
            
            if (currentTimerType !== 'fj-clue') {
                currentTimerType = 'fj-clue';
                startTimer(45, () => {
                    if (isHost) window.Jeopardy.advanceFJPhase('grade');
                });
            }

            if (isHost) {
                const humans = (localState.teams || []).filter(t => !(localState.cpuTeams || []).includes(t));
                const readyCount = humans.filter(t => fj.readyForGrade?.includes(t)).length;
                if (humans.length > 0 && readyCount >= humans.length) {
                    stopTimer();
                    window.Jeopardy.advanceFJPhase('grade');
                }
            }
        } else if (fj.phase === 'grade') {
            stopTimer();
            if(timerDiv) timerDiv.classList.add('d-none');
            if(buzzerSec) buzzerSec.innerHTML = '';
            
            qEl.innerHTML = `${safeAttributeEscape(fj.q)}<br><br><span style="color: var(--code-color); font-size: 0.9rem;">Correct Answer: ${safeAttributeEscape(fj.a)}</span><br><span class="small text-muted mt-2 d-block">Grading responses...</span>`;
            
            if (isHost) {
                setTimeout(() => {
                    window.Jeopardy.advanceFJPhase('results');
                }, 2000); 
            }
        } else if (fj.phase === 'results') {
            stopTimer();
            if(timerDiv) timerDiv.classList.remove('d-none');
            if(buzzerSec) buzzerSec.innerHTML = '';

            let answersHtml = '<div class="mt-3 text-start mx-auto w-100" style="max-width: 500px; background: rgba(0,0,0,0.05); padding: 10px; border-radius: 8px;">';
            answersHtml += '<h6 class="fw-bold mb-2 text-center" style="color: var(--file-name-color);">Team Answers:</h6>';
            (localState.teams || []).forEach(t => {
                const resp = fj.responses?.[t] || "No Answer";
                const wager = fj.wagers?.[t] || 0;
                const isCorrect = fj.judged?.[t];
                const color = isCorrect === true ? 'var(--code-color)' : (isCorrect === false ? 'var(--file-name-color)' : 'var(--tertiary-color)');
                const icon = isCorrect === true ? '✅' : (isCorrect === false ? '❌' : '❓');
                answersHtml += `<div class="d-flex justify-content-between border-bottom pb-1 mb-1">
                                    <span class="fw-bold text-truncate" style="max-width: 30%;" title="${t}">${t}</span>
                                    <span class="text-truncate px-2" style="color: ${color}; max-width: 45%; flex-grow: 1;" title="${safeAttributeEscape(resp)}">${safeAttributeEscape(resp)}</span>
                                    <span class="fw-bold text-muted text-end" style="min-width: 60px;">$${wager} ${icon}</span>
                                </div>`;
            });
            answersHtml += '</div>';

            qEl.innerHTML = `${safeAttributeEscape(fj.q)}<br><br><span style="color: var(--code-color); font-size: 0.9rem;">Correct Answer: ${safeAttributeEscape(fj.a)}</span>${answersHtml}`;
            
            if (currentTimerType !== 'fj-results') {
                currentTimerType = 'fj-results';
                startTimer(45, () => {
                    if (isHost) window.Jeopardy.advanceFJPhase('end');
                });
            }
        } else if (fj.phase === 'end') {
            stopTimer();
            if(timerDiv) timerDiv.classList.add('d-none');
            if(buzzerSec) buzzerSec.innerHTML = '';

            const results = localState.teams.map(t => ({ name: t, score: localState.scores[t] })).sort((a,b) => b.score - a.score);
            const topScore = results[0].score;
            const winners = results.filter(r => r.score === topScore && topScore > 0);
            
            if (winners.length > 0) {
                const winnerNames = winners.map(w => w.name).join(' & ');
                qEl.innerHTML = `<div class="alert shadow p-3 rounded-4 w-100 mx-auto" style="background-color: var(--code-color); color: white; border: none; max-width: 400px;"><h3 class="fw-bold mb-1">🏆 WINNER</h3><h4 class="fw-bold mb-0">${winnerNames} with $${topScore.toLocaleString()}!</h4></div>`;
            } else {
                qEl.innerHTML = `<div class="alert shadow p-3 rounded-4 w-100 mx-auto" style="background-color: var(--file-name-color); color: white; border: none; max-width: 400px;"><h4 class="fw-bold mb-0">No Winners This Time!</h4></div>`;
            }

            if (isHost && buzzerSec) {
                buzzerSec.innerHTML = `<button type="button" class="btn btn-sm w-100 mt-2 fw-bold shadow-sm" onclick="window.Jeopardy.resetBoard(true)" style="background-color: var(--tertiary-color); color: white;">Play New Game</button>`;
                buzzerSec.classList.remove('d-none');
            }
        }
    }

    async function resetBoard(forceReload = false) {
        if (!forceReload && !(await window.GameModal.confirm("Reset Board? All scores and clues will be cleared."))) return;
        
        const teams = localState.teams || [];
        const cpus = localState.cpuTeams || [];
        const resetScores = {};
        teams.forEach(t => resetScores[t] = 0);
        const msg = "The board has been reset. Let's play anew!";
        const firstTeam = teams.length > 0 ? teams[0] : null; 
        
        if (roomID && roomID !== "solo" && dbRef && docRef) {
            try {
                await window.setDoc(docRef, { 
                    scores: resetScores, 
                    spent: [], 
                    teams: teams,
                    cpuTeams: cpus,
                    activeBuzzer: null, 
                    boardControl: firstTeam, 
                    hostMessage: msg,
                    activeModal: null,
                    finalJeopardy: null
                }, { merge: true });
            } catch(e) {}
        } else {
            localState.scores = resetScores;
            localState.spent = [];
            localState.activeBuzzer = null;
            localState.boardControl = firstTeam;
            localState.hostMessage = msg;
            localState.activeModal = null;
            localState.finalJeopardy = null;
            syncJeopardyUI();
        }
        
        if (forceReload) {
            location.reload();
        }
    }

    function isCloseEnough(user, correctRaw) {
        let userTrimmed = user.trim().toLowerCase();
        if (!/^(what|who|where|when|why|how)/i.test(userTrimmed)) return false; 
        
        function normalizeNumbers(str) {
            if (!str) return str;
            let s = str.toLowerCase().replace(/-/g, ' ');
            const small = {
                'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
                'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19
            };
            const tens = {
                'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
                'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
            };
            
            // Replace combinations (e.g., "twenty one" -> "21")
            for (const [tWord, tVal] of Object.entries(tens)) {
                for (const [sWord, sVal] of Object.entries(small)) {
                    if (sVal > 0 && sVal < 10) {
                        s = s.replace(new RegExp(`\\b${tWord}\\s+${sWord}\\b`, 'g'), String(tVal + sVal));
                    }
                }
                // Replace standalone tens
                s = s.replace(new RegExp(`\\b${tWord}\\b`, 'g'), String(tVal));
            }
            // Replace standalone small numbers
            for (const [sWord, sVal] of Object.entries(small)) {
                s = s.replace(new RegExp(`\\b${sWord}\\b`, 'g'), String(sVal));
            }
            
            s = s.replace(/\bhundred\b/g, '100');
            s = s.replace(/\bthousand\b/g, '1000');
            s = s.replace(/\bmillion\b/g, '1000000');
            
            return s;
        }

        let u = normalizeNumbers(userTrimmed.replace(/^(what is|what's|who is|who's|what are|who are|where is|when is|why is|how is|what does|who was|what was)\s+/gi, "").trim());
        let rawStr = (correctRaw || "").toString().replace(/<[^>]*>?/gm, '').toLowerCase();
        
        let targets = [rawStr];
        const parenMatch = rawStr.match(/\(([^)]+)\)/);
        if (parenMatch) {
            targets.push(parenMatch[1].trim()); 
            targets.push(rawStr.replace(/\([^)]+\)/g, '').trim()); 
        }
        
        // Normalize numbers in all possible correct answers
        targets = targets.map(t => normalizeNumbers(t));

        for (let target of targets) {
            if (u === target) return true;
        }

        const cleanStr = (str) => str.replace(/[^\w\s#.\-<>+]/gi, ' ').replace(/\s+/g, ' ').trim();
        const removeFillers = (str) => str.split(' ').filter(w => !['a', 'an', 'the', 'of', 'in', 'to', 'for', 'and', 'or', 'is', 'are'].includes(w)).join(' ');

        u = removeFillers(cleanStr(u));

        for (let target of targets) {
            let cOpt = removeFillers(cleanStr(target));
            if (!u || !cOpt) continue;

            if (u === cOpt) return true;

            if (u.length >= 3 && cOpt.length >= 3) {
                if (cOpt.includes(u) || u.includes(cOpt)) return true;
            } else if (u.length > 0 && cOpt.split(' ').includes(u)) {
                return true; 
            }

            const acronymMatch = cOpt.match(/\b([a-z0-9]{2,6})\b/); 
            if (acronymMatch && u.includes(acronymMatch[1])) return true;

            const dist = getLevenshteinDistance(u, cOpt);
            const maxLen = Math.max(u.length, cOpt.length);
            if (maxLen > 3 && (1 - dist / maxLen) >= 0.70) return true;
            
            const uWords = u.split(' ');
            const cWords = cOpt.split(' ');
            for (let uw of uWords) {
                if (uw.length < 4) continue; 
                for (let cw of cWords) {
                    if (cw.length < 4) continue;
                    if (uw === cw || (1 - getLevenshteinDistance(uw, cw)/Math.max(uw.length, cw.length)) >= 0.8) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function getLevenshteinDistance(s, t) {
        if (!s.length) return t.length;
        if (!t.length) return s.length;
        const arr = [];
        for (let i = 0; i <= t.length; i++) arr[i] = [i];
        for (let j = 0; j <= s.length; j++) arr[0][j] = j;
        for (let i = 1; i <= t.length; i++) {
            for (let j = 1; j <= s.length; j++) {
                arr[i][j] = t.charAt(i - 1) === s.charAt(j - 1) ? arr[i - 1][j - 1] : Math.min(arr[i - 1][j - 1] + 1, arr[i][j - 1] + 1, arr[i - 1][j] + 1);
            }
        }
        return arr[t.length][s.length];
    }

    function populateHardcodedTable(table, data) {
        let categories = Object.keys(data);
        for (let i = categories.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [categories[i], categories[j]] = [categories[j], categories[i]];
        }
        const rows = table.querySelectorAll('tbody tr');
        const headers = table.querySelectorAll('thead th');
        headers.forEach((th, i) => {
            if (categories[i]) th.textContent = categories[i];
            th.classList.add('jeopardy-header');
        });
        rows.forEach((row, rowIndex) => {
            const level = (rowIndex + 1) * 100;
            const btns = row.querySelectorAll('.question-btn');
            btns.forEach((btn, colIndex) => {
                const cat = categories[colIndex];
                if (cat && data[cat][level]) {
                    const qPool = data[cat][level];
                    const qItem = qPool[Math.floor(Math.random() * qPool.length)];
                    btn.dataset.question = qItem.q;
                    btn.dataset.answer = qItem.a;
                    btn.dataset.cat = cat;
                    btn.dataset.val = level;
                    btn.textContent = `$${level}`;
                }
            });
        });
    }

    function renderBoard(container, data) {
        let categories = Object.keys(data);
        for (let i = categories.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [categories[i], categories[j]] = [categories[j], categories[i]];
        }
        const levels = [100, 200, 300, 400, 500];
        let html = `<div class="table-responsive"><table class="table table-bordered text-center mb-0 jeopardy-table" style="border: 2px solid var(--secondary-color); background-color: var(--primary-color); table-layout: fixed;"><thead><tr>`;
        categories.forEach(cat => { html += `<th class="jeopardy-col-head" style="background-color: var(--primary-color); color: var(--secondary-color); font-weight: bold; border: 2px solid var(--secondary-color); font-size: 0.8rem; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cat}</th>`; });
        html += `</tr></thead><tbody>`;
        levels.forEach(level => {
            html += `<tr>`;
            categories.forEach(cat => {
                const qPool = data[cat]?.[level] || [];
                if (qPool.length > 0) {
                    const qItem = qPool[Math.floor(Math.random() * qPool.length)];
                    const safeQ = safeAttributeEscape(qItem.q || qItem.question);
                    const safeA = safeAttributeEscape(qItem.a || qItem.answer);
                    html += `<td class="p-0 jeopardy-td" style="background-color: var(--primary-color); border: 2px solid var(--secondary-color);"><button type="button" class="question-btn" data-cat="${safeAttributeEscape(cat)}" data-val="${level}" data-question="${safeQ}" data-answer="${safeA}" style="background-color: var(--primary-color); color: var(--file-name-color); border: none; font-weight: bold; width: 100%; height: 100%; padding: 15px;">$${level}</button></td>`;
                } else { html += `<td class="jeopardy-empty-cell" style="background-color: var(--primary-color); border: 2px solid var(--secondary-color);"></td>`; }
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
        attachListeners(container);
    }

    function attachListeners(container) {
        container.querySelectorAll('.question-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                if (this.classList.contains('disabled')) return;
                
                const isCpuTurn = (localState.cpuTeams || []).includes(localState.boardControl);
                if (localState.boardControl) {
                    if (isCpuTurn && e.isTrusted) {
                        if (window.GameModal) await window.GameModal.alert(`Please wait! It is ${localState.boardControl}'s turn to pick a square.`);
                        return;
                    } else if (!isCpuTurn && roomID !== "solo" && localState.boardControl !== myJeopardyName) {
                        if (window.GameModal) await window.GameModal.alert(`It is ${localState.boardControl}'s turn to pick a square!`);
                        return;
                    }
                }
                
                this.classList.add('disabled', 'btn-spent');
                this.style.opacity = '1';
                this.style.backgroundColor = '#808080';
                this.style.color = 'transparent';
                this.innerHTML = "&nbsp;"; 
                this.style.pointerEvents = 'none';
                
                const id = `${this.dataset.cat}-${this.dataset.val}`;
                const modalData = {
                    cat: this.dataset.cat,
                    val: this.dataset.val,
                    question: this.dataset.question,
                    answer: this.dataset.answer,
                    revealed: false,
                    matchName: null,
                    isTimeUp: false
                };

                if (roomID && roomID !== "solo" && dbRef && docRef) {
                    const snap = await window.getDoc(docRef);
                    if (snap.exists()) {
                        const spent = snap.data().spent || [];
                        if (!spent.includes(id)) {
                            spent.push(id);
                            await window.updateDoc(docRef, { 
                                spent: spent,
                                activeModal: modalData,
                                activeBuzzer: null,
                                hostMessage: `Let's look at <strong>${modalData.cat}</strong> for <strong>$${modalData.val}</strong>! Get ready to buzz!`
                            }).catch(e=>{});
                        }
                    }
                } else {
                    if (!localState.spent) localState.spent = [];
                    localState.spent.push(id);
                    localState.activeBuzzer = null;
                    localState.activeModal = modalData;
                    updateHost(`Let's look at <strong>${modalData.cat}</strong> for <strong>$${modalData.val}</strong>! Get ready to buzz!`);
                    showPanelUI(modalData);
                }
            });
        });
    }

    function closeActiveModal() {
        if (jeopardyCpuAnswerTimer) { clearTimeout(jeopardyCpuAnswerTimer); jeopardyCpuAnswerTimer = null; }
        if (jeopardyCpuTimer) { clearTimeout(jeopardyCpuTimer); jeopardyCpuTimer = null; }

        if (roomID && roomID !== "solo" && dbRef && docRef) {
            window.updateDoc(docRef, { activeModal: null }).catch(()=>{});
        } else {
            localState.activeModal = null;
            hidePanelUI();
            resetModalUI();
            syncJeopardyUI(); 
        }
    }

    function hidePanelUI() {
        const empty = document.getElementById('j-empty-state');
        const filled = document.getElementById('j-filled-state');
        
        if (empty) empty.classList.remove('d-none');
        if (filled) filled.classList.add('d-none');
    }

    function showPanelUI(dataset) {
        const val = dataset.value || dataset.val || "0";
        
        const empty = document.getElementById('j-empty-state');
        const filled = document.getElementById('j-filled-state');
        
        if (empty) empty.classList.add('d-none');
        if (filled) filled.classList.remove('d-none');
        
        const catEl = document.getElementById('j-panel-cat');
        if (catEl) {
            catEl.textContent = dataset.cat || "Topic";
        }
        
        const valEl = document.getElementById('j-panel-val');
        if (valEl) {
            valEl.textContent = "$" + val;
        }
        
        const qEl = document.getElementById('j-panel-q');
        if (qEl) {
            qEl.innerHTML = dataset.question || "Error: Question missing.";
        }
        
        const ansEl = document.getElementById('j-panel-answer');
        if (ansEl) {
            ansEl.dataset.rawAnswer = dataset.answer || "Error: Answer missing.";
            if (!dataset.revealed) { 
                ansEl.classList.add('d-none'); 
            }
        }

        const timerDiv = document.getElementById('j-timer-display');
        const buzzerSec = document.getElementById('j-buzzer-section');
        
        if (!dataset.revealed) {
            if(buzzerSec) buzzerSec.classList.remove('d-none');
            if(timerDiv) timerDiv.classList.remove('d-none');
            
            // Strictly hide all input elements by default until activeBuzzer logic verifies the user
            const inp = document.getElementById('j-user-answer');
            if (inp) { inp.classList.add('d-none'); inp.value = ''; inp.disabled = false; }
            const check = document.getElementById('j-check-btn');
            if (check) { check.classList.add('d-none'); check.disabled = false; }
            const wrap = document.getElementById('j-answer-input-wrap');
            if (wrap) { wrap.classList.add('d-none'); }

            const reveal = document.getElementById('j-reveal-btn');
            if (reveal) { reveal.classList.add('d-none'); reveal.disabled = false; } 
            
            if (dataset.cat !== "FINAL JEOPARDY") {
                renderBuzzers();
            }
        } else {
            if(buzzerSec) buzzerSec.classList.add('d-none');
            if(timerDiv) timerDiv.classList.add('d-none');
            const inp = document.getElementById('j-user-answer');
            if (inp) inp.classList.add('d-none');
            const check = document.getElementById('j-check-btn');
            if (check) check.classList.add('d-none');
            const reveal = document.getElementById('j-reveal-btn');
            if (reveal) reveal.classList.add('d-none');
            const wrap = document.getElementById('j-answer-input-wrap');
            if (wrap) wrap.classList.add('d-none');
        }

        setTimeout(() => {
            const inp = document.getElementById('j-user-answer');
            if(inp && !inp.disabled && !inp.classList.contains('d-none')) {
                inp.focus();
            }
        }, 200);
    }

    function setupPanelListeners() {
        if (isPanelSetup) return;
        isPanelSetup = true;

        const check = document.getElementById('j-check-btn');
        const reveal = document.getElementById('j-reveal-btn');
        const closePanelBtn = document.getElementById('j-close-panel-btn');
        const inp = document.getElementById('j-user-answer');

        if (inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (check && !check.disabled && !check.classList.contains('d-none')) {
                        check.click();
                    }
                }
            });
        }
        
        if(check) {
            check.addEventListener('click', async (e) => { 
                e.preventDefault();
                const userInp = document.getElementById('j-user-answer').value;
                const correctAns = document.getElementById('j-panel-answer').dataset.rawAnswer;
                
                const trimmed = userInp.trim();
                if (!/^(what|who|where|when|why|how)/i.test(trimmed)) {
                    let hintEl = document.getElementById('j-format-hint');
                    if (!hintEl) {
                        hintEl = document.createElement('div');
                        hintEl.id = 'j-format-hint';
                        hintEl.className = 'p-2 rounded mt-2 mb-0 small fw-bold shadow-sm';
                        hintEl.style.backgroundColor = 'var(--file-name-color)';
                        hintEl.style.color = 'white';
                        document.getElementById('j-user-answer').after(hintEl);
                    }
                    hintEl.innerHTML = "⚠️ Must be in the form of a question!<br><small>(e.g., 'What is...', 'Who is...')</small>";
                    return; 
                } else {
                    const hintEl = document.getElementById('j-format-hint');
                    if (hintEl) hintEl.remove();
                }

                // FINAL JEOPARDY INTERCEPT
                if (localState.finalJeopardy && localState.finalJeopardy.phase === 'clue') {
                    const humans = (localState.teams || []).filter(t => !(localState.cpuTeams || []).includes(t));
                    const myTeam = (roomID === "solo") ? humans[0] : myJeopardyName;
                    if (myTeam) {
                        window.Jeopardy.submitFJResponse(myTeam, userInp);
                        document.getElementById('j-user-answer').disabled = true;
                        document.getElementById('j-check-btn').disabled = true;
                        document.getElementById('j-check-btn').textContent = "Locked In";
                    }
                    return;
                }

                // NORMAL JEOPARDY
                const match = isCloseEnough(userInp, correctAns);
                
                if (match) {
                    const teamName = localState.activeBuzzer;
                    const valEl = document.getElementById('j-panel-val');
                    const val = valEl ? parseInt(valEl.textContent.replace('$', '')) : 0;
                    
                    if (teamName) {
                        updateHost(`Correct! <strong>${teamName}</strong> is awarded $${val}. <strong>${teamName}</strong>, pick the next clue!`);
                        
                        if (roomID && roomID !== "solo" && dbRef && docRef) {
                            const snap = await window.getDoc(docRef);
                            if (snap.exists()) {
                                const scores = snap.data().scores || {};
                                scores[teamName] = (scores[teamName] || 0) + val;
                                await window.updateDoc(docRef, { 
                                    scores, 
                                    boardControl: teamName,
                                    "activeModal.revealed": true,
                                    "activeModal.matchName": teamName
                                }).catch(e=>{});
                            }
                        } else {
                            if(!localState.scores) localState.scores = {};
                            localState.scores[teamName] = (localState.scores[teamName] || 0) + val;
                            localState.boardControl = teamName;
                            if (localState.activeModal) {
                                localState.activeModal.revealed = true;
                                localState.activeModal.matchName = teamName;
                            }
                            syncJeopardyUI();
                            showAnswer(true, false, teamName);
                            disableInputs();
                        }
                    } else {
                        const controller = localState.boardControl || "Someone";
                        updateHost(`Correct! <strong>${controller}</strong>, please pick the next clue!`);
                    }
                    
                    setTimeout(() => { closeActiveModal(); }, 4000);

                } else {
                    const teamName = localState.activeBuzzer;
                    clearBuzzerState(`Incorrect! <strong>${teamName}</strong> was wrong. Floor is open!`);
                }
            });
        }
        if(reveal) {
            reveal.addEventListener('click', async (e) => { 
                e.preventDefault();
                const controller = localState.boardControl || "Someone";
                updateHost(`The answer has been revealed. No points awarded. <strong>${controller}</strong>, choose the next clue.`);
                
                if (roomID && roomID !== "solo" && dbRef && docRef) {
                    await window.updateDoc(docRef, { 
                        "activeModal.revealed": true,
                        "activeModal.isTimeUp": false
                    }).catch(e=>{});
                } else {
                    if (localState.activeModal) {
                        localState.activeModal.revealed = true;
                        localState.activeModal.isTimeUp = false;
                    }
                    showAnswer(false, false); 
                    disableInputs(); 
                }
                
                setTimeout(() => { closeActiveModal(); }, 4000);
            });
        }
        if (closePanelBtn) {
            closePanelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeActiveModal();
            });
        }
    }

    function resetModalUI() {
        stopTimer();
        const hintEl = document.getElementById('j-format-hint');
        if (hintEl) hintEl.remove();

        const ans = document.getElementById('j-panel-answer');
        if(ans) {
            ans.classList.add('d-none');
            ans.style.backgroundColor = '';
            ans.style.color = '';
        }
        const awardSec = document.getElementById('j-award-section');
        if(awardSec) awardSec.classList.add('d-none');
        const modalQ = document.getElementById('j-panel-q');
        if(modalQ) modalQ.classList.remove('d-none');
        
        const inp = document.getElementById('j-user-answer');
        if(inp) { inp.value = ''; inp.disabled = false; }
        
        const wrap = document.getElementById('j-answer-input-wrap');
        if (wrap) wrap.classList.add('d-none');
        
        const check = document.getElementById('j-check-btn');
        if(check) { check.disabled = false; check.textContent = "Submit Answer"; }
        
        const reveal = document.getElementById('j-reveal-btn');
        if(reveal) reveal.disabled = false;
        
        const buzzerSec = document.getElementById('j-buzzer-section');
        if (buzzerSec) buzzerSec.classList.add('d-none');
        
        const timerDiv = document.getElementById('j-timer-display');
        if (timerDiv) timerDiv.classList.add('d-none');
    }

    function disableInputs() {
        const inp = document.getElementById('j-user-answer');
        const check = document.getElementById('j-check-btn');
        const reveal = document.getElementById('j-reveal-btn');
        if(inp) inp.disabled = true;
        if(check) check.disabled = true;
        if(reveal) reveal.disabled = true;
    }

    function showAnswer(isAutoMatch, isTimeUp = false, matchName = null) {
        stopTimer();
        const buzzerSec = document.getElementById('j-buzzer-section');
        if (buzzerSec) buzzerSec.classList.add('d-none');

        const ans = document.getElementById('j-panel-answer');
        if(ans) {
            ans.classList.remove('d-none');
            ans.innerHTML = '';
            
            if (isAutoMatch) {
                ans.style.backgroundColor = "var(--code-color)";
                ans.style.color = "white";
                ans.innerHTML = `<div class="fw-bold mb-1">Correct! Points to ${matchName || 'Team'}</div><div>${safeAttributeEscape(ans.dataset.rawAnswer)}</div>`;
            } else {
                ans.style.backgroundColor = "var(--file-name-color)";
                ans.style.color = "white";
                if (isTimeUp) {
                    ans.innerHTML = `<div class="fw-bold mb-1">Time's Up!</div><div>${safeAttributeEscape(ans.dataset.rawAnswer)}</div>`;
                } else {
                    ans.innerHTML = `<div class="fw-bold mb-1">Answer Revealed</div><div>${safeAttributeEscape(ans.dataset.rawAnswer)}</div>`;
                }
            }
        }

        const awardSection = document.getElementById('j-award-section');
        if (awardSection) awardSection.classList.add('d-none');
    }

    function setupScoreboard() {
        ['jeopardy-add-team', 'jeopardy-reset-btn', 'jeopardy-final-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        const container = document.getElementById('jeopardy-scoreboard');
        
        let hostBoxContainer = document.getElementById('j-host-box-wrapper');
        if (!hostBoxContainer && container) {
            const wrapper = document.createElement('div');
            wrapper.className = 'row mb-4 align-items-start';
            wrapper.id = 'j-host-box-wrapper';
            
            const leftCol = document.createElement('div');
            leftCol.className = 'col-lg-8 d-flex flex-column gap-3';
            
            const rightCol = document.createElement('div');
            rightCol.className = 'col-lg-4 d-flex flex-column mt-0';
            
            const cardsContainer = document.createElement('div');
            cardsContainer.id = 'jeopardy-scoreboard-cards';
            cardsContainer.className = 'row row-cols-2 row-cols-lg-4 g-2';
            
            const activeQuestionPanel = document.createElement('div');
            activeQuestionPanel.id = 'j-active-question-area';
            activeQuestionPanel.className = 'w-100 p-2 rounded-4 shadow-sm text-center d-flex flex-column justify-content-center';
            activeQuestionPanel.style.cssText = 'background-color: var(--secondary-color); border: 2px solid var(--tertiary-color); min-height: 160px; transition: all 0.3s ease;';
            activeQuestionPanel.innerHTML = `
                <div id="j-empty-state" class="text-muted fst-italic fw-bold w-100 d-flex align-items-center justify-content-center h-100 py-3" style="color: var(--tertiary-color) !important; opacity: 0.7;">
                    Select a clue from the board below to begin...
                </div>
                <div id="j-filled-state" class="d-none w-100 d-flex flex-column h-100">
                    <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1 flex-shrink-0" style="border-color: var(--tertiary-color) !important; font-size: 0.8rem;">
                        <span id="j-panel-cat" class="fw-bold text-uppercase mb-0 text-truncate text-start" style="color: var(--tertiary-color); max-width: 45%;">CATEGORY</span>
                        <span id="j-panel-val" class="fw-bold" style="color: var(--primary-color);">$100</span>
                        <button type="button" id="j-close-panel-btn" class="btn-close" style="filter: opacity(0.5); transform: scale(0.7);"></button>
                    </div>
                    <div class="flex-grow-1 d-flex flex-column justify-content-center">
                        <p id="j-panel-q" class="fs-4 fw-bold mb-2 px-2 flex-grow-1 d-flex align-items-center justify-content-center" style="color: var(--primary-color); line-height: 1.2;"></p>
                        
                        <div id="j-action-line" class="d-flex align-items-center justify-content-between gap-2 mb-1 px-1 w-100">
                             <div style="width: 33.33%;" class="text-start">
                                 <div id="j-timer-display" class="small fw-bold mb-0 d-none text-nowrap" style="color: var(--file-name-color);"></div>
                             </div>
                             <div id="j-buzzer-section" class="d-flex justify-content-center" style="width: 33.33%;"></div>
                             <div style="width: 33.33%;" class="d-flex justify-content-end">
                                 <button type="button" id="j-reveal-btn" class="btn btn-sm fw-bold d-none shadow-sm text-nowrap py-0 w-100" style="background-color: white; color: var(--primary-color); border: 1px solid var(--quaternary-color); height: 30px; max-width: 100px;">Reveal</button>
                             </div>
                        </div>
                        
                        <div class="mx-auto w-100 d-none mt-1" id="j-answer-input-wrap" style="max-width: 400px;">
                            <div class="d-flex gap-2">
                                <input type="text" id="j-user-answer" class="form-control form-control-sm text-center fw-bold shadow-sm" style="border: 2px solid var(--tertiary-color); color: var(--primary-color);" placeholder="Who is / What is...">
                                <button type="button" id="j-check-btn" class="btn btn-sm fw-bold shadow-sm text-nowrap" style="background-color: var(--tertiary-color); color: white; border: none;">Submit Answer</button>
                            </div>
                        </div>
                        <div id="j-panel-answer" class="p-1 rounded small fw-bold d-none w-100 mt-1 mx-auto" style="max-width: 500px;"></div>
                    </div>
                </div>
            `;
            
            const finalAreaPanel = document.createElement('div');
            finalAreaPanel.id = 'j-final-area';
            finalAreaPanel.className = 'w-100 d-none mt-3 p-4 rounded-4 shadow-sm text-center';
            finalAreaPanel.style.cssText = 'background-color: var(--secondary-color); border: 2px solid var(--tertiary-color);';
            
            leftCol.appendChild(cardsContainer);
            leftCol.appendChild(activeQuestionPanel);
            leftCol.appendChild(finalAreaPanel);
            
            rightCol.innerHTML = `
                <div class="card shadow-sm flex-grow-1" style="border: 2px solid var(--tertiary-color); overflow: hidden;">
                    <div class="card-header text-center fw-bold fs-5 py-1" style="background-color: var(--primary-color); color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                        Host Desk
                    </div>
                    
                    <div class="p-2 text-center" style="background-color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                        <div class="d-flex justify-content-center gap-2 flex-wrap">
                            <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="window.Jeopardy.showHowToPlay()" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">❓ How to Play</button>
                            <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" id="j-reset-roles-btn" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">🔄 Reset</button>
                            <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="window.Jeopardy.leaveGame()" style="background-color: white; color: var(--file-name-color); border: 2px solid var(--file-name-color); touch-action: manipulation;">❌ Leave</button>
                        </div>
                    </div>

                    <div class="card-body p-3 d-flex flex-column" style="background-color: white;">
                        <div id="j-host-interaction-area" class="text-center flex-grow-1 d-flex flex-column justify-content-center">
                            
                            <div id="j-host-msg-area" class="w-100 d-flex flex-column justify-content-center p-3 rounded" style="background-color: var(--secondary-color); min-height: 100px;">
                                <p id="j-host-msg" class="mb-0 fs-6 fw-bold" style="color: var(--primary-color);">${hostMessage}</p>
                            </div>
                            
                            <div id="j-add-buttons-container" class="mt-2 d-flex justify-content-center gap-2">
                                <button type="button" id="j-add-player-btn" class="btn btn-sm shadow-sm fw-bold w-50" style="background-color: var(--tertiary-color); color: white;">👤 Add Player</button>
                                <button type="button" id="j-add-cpu-btn" class="btn btn-sm shadow-sm fw-bold w-50" style="background-color: var(--primary-color); color: white;">🤖 Play AI</button>
                            </div>

                            <button type="button" class="btn btn-sm w-100 mt-2 fw-bold shadow-sm py-2" id="j-trigger-final-btn" style="background-color: var(--tertiary-color); color: white; border: none;">🏆 Final Jeopardy</button>
                        </div>
                    </div>
                </div>
            `;
            
            container.parentNode.insertBefore(wrapper, container);
            wrapper.appendChild(leftCol);
            wrapper.appendChild(rightCol);

            const resetRolesBtn = document.getElementById('j-reset-roles-btn');
            if (resetRolesBtn) {
                resetRolesBtn.addEventListener('click', async (e) => { 
                    e.preventDefault(); 
                    window.Jeopardy.resetBoard(false); 
                });
            }

            const triggerFinalBtn = document.getElementById('j-trigger-final-btn');
            if (triggerFinalBtn) {
                triggerFinalBtn.addEventListener('click', triggerFinalJeopardy);
            }

            const addPlayerBtn = document.getElementById('j-add-player-btn');
            if (addPlayerBtn) {
                addPlayerBtn.addEventListener('click', async function(e) {
                    e.preventDefault(); 
                    const currentCount = (localState.teams || []).length;
                    if (currentCount >= 4) {
                        if (window.GameModal) await window.GameModal.alert("Maximum of 4 teams allowed per game!");
                        return;
                    }
                    let tName = null;
                    if (currentCount === 0 && window.globalPlayerName) {
                        tName = window.globalPlayerName;
                    } else {
                        if (window.GameModal) tName = await window.GameModal.prompt("Enter team or player name:", "Team Name", 15);
                        if (!tName) return; 
                        if (currentCount === 0) window.globalPlayerName = tName;
                    }
                    tName = tName || `Team ${currentCount + 1}`;
                    
                    if (!localState.teams) localState.teams = [];
                    if (localState.teams.includes(tName)) {
                        if (window.GameModal) await window.GameModal.alert("Team name already exists!");
                        return;
                    }
                    
                    localState.teams.push(tName);
                    if (!localState.scores) localState.scores = {};
                    localState.scores[tName] = 0;
                    if (currentCount === 0) localState.boardControl = tName;
                    
                    updateHost(`<strong>${tName}</strong> has joined the game!`);
                    syncJeopardyUI(); 
                });
            }

            const addCpuBtn = document.getElementById('j-add-cpu-btn');
            if (addCpuBtn) {
                addCpuBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const currentCount = (localState.teams || []).length;
                    if (currentCount >= 4) {
                        if (window.GameModal) await window.GameModal.alert("Maximum of 4 teams allowed per game!");
                        return;
                    }
                    const aiNamesList = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"];
                    const availableAIs = aiNamesList.map(n => n + " AI").filter(name => !(localState.teams || []).includes(name));
                    const tName = availableAIs.length > 0 ? availableAIs[Math.floor(Math.random() * availableAIs.length)] : "Guest " + Math.floor(Math.random() * 100) + " AI";
                    
                    let newTeams = [...(localState.teams || [])];
                    let newCpuTeams = [...(localState.cpuTeams || [])];
                    let newScores = { ...(localState.scores || {}) };
                    
                    newTeams.push(tName);
                    newCpuTeams.push(tName);
                    newScores[tName] = 0;
                    
                    let msg = `<strong>${tName}</strong> has joined the game!`;
                    
                    if (roomID && roomID !== "solo" && dbRef && docRef) {
                        await window.updateDoc(docRef, { teams: newTeams, cpuTeams: newCpuTeams, scores: newScores, hostMessage: msg }).catch(e=>{});
                    } else {
                        localState.teams = newTeams;
                        localState.cpuTeams = newCpuTeams;
                        localState.scores = newScores;
                        updateHost(msg);
                        syncJeopardyUI();
                    }
                });
            }

            setupPanelListeners();
        }

        syncJeopardyUI();
    }

    async function triggerFinalJeopardy(e) {
        if(e) e.preventDefault();
        
        const teams = localState.teams || [];
        if (teams.length === 0) {
            if (window.GameModal) await window.GameModal.alert("Add at least one team before playing Final Jeopardy!");
            return;
        }
        
        const data = window.currentChapterData?.jeopardyData;
        const categories = Object.keys(data);
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const finalQ = data[randomCat][500][0]; 
        
        let fj = {
            phase: 'wager',
            cat: randomCat,
            q: finalQ.q,
            a: finalQ.a,
            wagers: {},
            readyForClue: [],
            responses: {},
            readyForGrade: [],
            judged: {}
        };

        const cpus = localState.cpuTeams || [];
        cpus.forEach(c => {
            const max = Math.max(localState.scores[c] || 0, 100);
            fj.wagers[c] = Math.floor(Math.random() * max);
            fj.readyForClue.push(c);
        });

        if (roomID && roomID !== "solo" && dbRef && docRef) {
            await window.updateDoc(docRef, { finalJeopardy: fj, hostMessage: "<strong>FINAL JEOPARDY!</strong> Make your wagers!" }).catch(e=>{});
        } else {
            localState.finalJeopardy = fj;
            updateHost("<strong>FINAL JEOPARDY!</strong> Make your wagers!");
        }
    }

    const submitFJWagerAndReady = async (team) => {
        const inp = document.getElementById(`wager-input-${team.replace(/\s+/g, '')}`);
        if (!inp) return;
        let val = parseInt(inp.value) || 0;
        const max = Math.max(localState.scores[team] || 0, 100);
        val = Math.min(Math.max(val, 0), max);

        if (roomID && roomID !== "solo" && dbRef && docRef) {
            const snap = await window.getDoc(docRef);
            if(snap.exists()){
                let fj = snap.data().finalJeopardy;
                if(!fj.wagers) fj.wagers = {};
                fj.wagers[team] = val;
                if(!fj.readyForClue) fj.readyForClue = [];
                if (!fj.readyForClue.includes(team)) fj.readyForClue.push(team);
                await window.updateDoc(docRef, { finalJeopardy: fj }).catch(e=>{});
            }
        } else {
            if(!localState.finalJeopardy.wagers) localState.finalJeopardy.wagers = {};
            localState.finalJeopardy.wagers[team] = val;
            if(!localState.finalJeopardy.readyForClue) localState.finalJeopardy.readyForClue = [];
            if (!localState.finalJeopardy.readyForClue.includes(team)) localState.finalJeopardy.readyForClue.push(team);
            syncJeopardyUI();
        }
    };

    const submitFJResponse = async (team, overrideVal) => {
        let val = overrideVal;
        if (val === undefined) {
            const inp = document.getElementById(`response-input-${team.replace(/\s+/g, '')}`);
            if (!inp) return;
            val = inp.value;
        }

        if (roomID && roomID !== "solo" && dbRef && docRef) {
            const snap = await window.getDoc(docRef);
            if(snap.exists()) {
                let fj = snap.data().finalJeopardy;
                if(!fj.responses) fj.responses = {};
                fj.responses[team] = val;
                if(!fj.readyForGrade) fj.readyForGrade = [];
                if (!fj.readyForGrade.includes(team)) fj.readyForGrade.push(team);
                await window.updateDoc(docRef, { finalJeopardy: fj }).catch(e=>{});
            }
        } else {
            if(!localState.finalJeopardy.responses) localState.finalJeopardy.responses = {};
            localState.finalJeopardy.responses[team] = val;
            if(!localState.finalJeopardy.readyForGrade) localState.finalJeopardy.readyForGrade = [];
            if (!localState.finalJeopardy.readyForGrade.includes(team)) localState.finalJeopardy.readyForGrade.push(team);
            syncJeopardyUI();
        }
    };

    const advanceFJPhase = async (phase) => {
        let fj = localState.finalJeopardy;
        if (!fj) return;
        
        fj.phase = phase;

        if (phase === 'clue') {
            const cpus = localState.cpuTeams || [];
            cpus.forEach(c => {
                if (!fj.readyForGrade) fj.readyForGrade = [];
                fj.readyForGrade.push(c);
            });
        }

        if (phase === 'grade') {
            const cpus = localState.cpuTeams || [];
            cpus.forEach(cpu => {
                if (!fj.responses) fj.responses = {};
                if (!fj.responses[cpu]) {
                    fj.responses[cpu] = Math.random() > 0.5 ? fj.a : "What is an incorrect bot answer?";
                }
            });

            const newScores = { ...localState.scores };
            (localState.teams || []).forEach(t => {
                const resp = fj.responses[t] || "";
                const wager = fj.wagers[t] || 0;
                const isCorrect = isCloseEnough(resp, fj.a);
                if (!fj.judged) fj.judged = {};
                fj.judged[t] = isCorrect;

                if (isCorrect) {
                    newScores[t] += wager;
                } else {
                    newScores[t] -= wager;
                }
            });
            localState.scores = newScores;
            
            if (roomID && roomID !== "solo" && dbRef && docRef) {
                await window.updateDoc(docRef, { finalJeopardy: fj, scores: localState.scores, hostMessage: "The results are in!" }).catch(e=>{});
            } else {
                localState.finalJeopardy = fj;
                updateHost("The results are in!");
            }
        } else {
            if (roomID && roomID !== "solo" && dbRef && docRef) {
                await window.updateDoc(docRef, { finalJeopardy: fj }).catch(e=>{});
            } else {
                localState.finalJeopardy = fj;
                syncJeopardyUI();
            }
        }
    };

    return { setup, resetBoard, showHowToPlay, leaveGame, handleJoinForm, triggerFinalJeopardy, submitFJWagerAndReady, submitFJResponse, advanceFJPhase };
})();