// ======================================================
// 3. MILLIONAIRE ENGINE (With Multiplayer & Lifelines)
// ======================================================
window.Millionaire = (() => {
    let currentLevel = 0, levelsPool = [], activeQ = null, activeCorrectIndex = -1, activeOptions = [];
    const MONEY_LEVELS = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
    
    const formatAmt = (amt) => {
        if (amt >= 1000000) return (amt/1000000) + 'M';
        if (amt >= 1000) return (amt/1000) + 'k';
        return amt;
    };

    const safeEscape = (str) => {
        try {
            if (typeof str !== 'string') str = String(str || '');
            if (typeof window !== 'undefined' && typeof window.escapeHTML === 'function') return window.escapeHTML(str);
            if (str.includes('&lt;') || str.includes('<code>')) return str; 
            return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        } catch(e) { return String(str || ''); }
    };
    
    let dbRef, appIdRef, roomID, docRef;
    let milUnsub = null;
    let localState = {};
    let myName = "";
    let isHotSeat = false;
    let mySafeUid = null; 

    function showHowToPlay() {
        let htp = document.getElementById('mil-how-to-modal');
        if (!htp) {
            htp = document.createElement('div');
            htp.id = 'mil-how-to-modal';
            htp.className = "position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3 d-none";
            htp.style.cssText = "z-index:9999; background-color:rgba(0,0,0,0.85); backdrop-filter: blur(5px);";
            htp.innerHTML = `
                <div class="card shadow-lg p-4 text-start rounded-4" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color); max-width: 600px; width: 100%;">
                    <div class="d-flex justify-content-between align-items-center pb-2 mb-3" style="border-bottom: 2px solid var(--tertiary-color);">
                        <h3 class="fw-bold mb-0" style="color: var(--secondary-color); font-family: var(--font-family-monospace, monospace);">How to Play: Who Wants to be a Millionaire?</h3>
                        <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('mil-how-to-modal').classList.replace('d-flex', 'd-none')"></button>
                    </div>
                    <p style="color: var(--secondary-color);"><strong>📺 The TV Show:</strong> A single contestant climbs a 15-question money ladder. If they get stuck, they can use lifelines to help them survive. One wrong answer, and they go home!</p>
                    <p style="color: var(--secondary-color);"><strong>💻 On This Site:</strong><br><br>
                        • <strong>Solo/AI:</strong> Play the game normally! The lifelines will automatically ask the AI Computer for help!<br><br>
                        • <strong>Multiplayer:</strong> One player clicks <strong>Take the Hot Seat</strong>. Everyone else becomes the live Audience!<br><br>
                        • <strong>The Lifelines:</strong><br>
                        <strong>50:50:</strong> Eliminates two incorrect answers.<br>
                        <strong>Ask the Audience:</strong> Sends a live voting poll to everyone in the room (or AI).<br>
                        <strong>Phone a Friend:</strong> Messages a specific person (or the Computer) for advice.<br><br>
                        • Get a question wrong? You lose the Hot Seat, and someone else can take a turn!</p>
                    <button class="btn btn-lg w-100 shadow-sm mt-2 fw-bold" onclick="document.getElementById('mil-how-to-modal').classList.replace('d-flex', 'd-none')" style="background-color: var(--secondary-color); color: var(--primary-color); border: none;">Got It!</button>
                </div>
            `;
            document.body.appendChild(htp);
        }
        htp.classList.remove('d-none');
        htp.classList.add('d-flex');
    }

    function renderBaseLayout(container) {
        if(container.querySelector('#mil-layout-wrapper')) return; 
        
        let actionsRow = document.getElementById('mil-header-actions');
        if (actionsRow) actionsRow.remove(); 
        
        container.innerHTML = `
            <div id="mil-layout-wrapper" class="row g-4">
                <div class="col-lg-8 d-flex flex-column position-relative" style="min-height: 400px;">
                    <div class="card shadow-sm p-4 mb-4 rounded-4 text-center z-2" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color);">
                        <h4 id="mil-question" class="fw-bold mb-0" style="color: var(--secondary-color);">Loading question...</h4>
                    </div>
                    <div class="row g-3 mb-4 z-2" id="mil-answers"></div>
                    
                    <div class="d-flex justify-content-center gap-3 flex-wrap mb-3 z-2" id="mil-lifelines-container">
                        <button class="btn rounded-pill px-4 fw-bold shadow-sm mil-50" style="background-color: var(--tertiary-color); color: white;">50:50</button>
                        <button class="btn rounded-pill px-4 fw-bold shadow-sm mil-phone" style="background-color: var(--tertiary-color); color: white;">Phone</button>
                        <button class="btn rounded-pill px-4 fw-bold shadow-sm mil-aud" style="background-color: var(--tertiary-color); color: white;">Poll</button>
                    </div>
                    <div id="mil-status-area" class="w-100 text-center mb-3 z-2"></div>
                    <div id="mill-feedback" class="w-100 z-2 flex-grow-1"></div>
                    
                    <!-- STUDIO AUDIENCE BACKGROUND -->
                    <div class="position-absolute bottom-0 start-0 w-100 z-1" style="opacity: 0.35; pointer-events: none; overflow: hidden; height: 250px; -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%); mask-image: linear-gradient(to top, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%);">
                        <img src="/images/celebs/studioAudience.png" alt="Studio Audience" style="width: 100%; height: 100%; object-fit: cover; object-position: center bottom;">
                    </div>
                </div>
                
                <div class="col-lg-4 d-flex flex-column z-2">
                    <div class="card shadow-sm flex-grow-1" style="border: 2px solid var(--tertiary-color); overflow: hidden;">
                        <div class="card-header text-center fw-bold fs-5" style="background-color: var(--primary-color); color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                            Money Ladder
                        </div>
                        
                        <div class="p-2 text-center" style="background-color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                            <div class="d-flex justify-content-center gap-2 flex-wrap">
                                <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="window.Millionaire.showHowToPlay()" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">❓ How to Play</button>
                                <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="location.reload()" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">🔄 Reset</button>
                                <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="window.Millionaire.leaveGame()" style="background-color: white; color: var(--file-name-color); border: 2px solid var(--file-name-color); touch-action: manipulation;">❌ Leave</button>
                            </div>
                        </div>

                        <div class="card-body p-3 d-flex flex-column" style="background-color: white;">
                            <ul class="d-flex flex-column p-0 m-0 gap-2 list-unstyled flex-grow-1" id="mil-ladder"></ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function buildLadder(ladderEl) {
        if (!ladderEl) return;
        const totalLevels = levelsPool.length;
        const displayAmounts = MONEY_LEVELS.slice(0, totalLevels).reverse();
        ladderEl.innerHTML = displayAmounts.map((amt, i) => {
            const actualLevel = totalLevels - 1 - i;
            return `<li class="badge rounded-pill fs-6 py-2 px-3 mill-level-item w-100 text-center shadow-sm" data-level="${actualLevel}" style="border: 1px solid var(--tertiary-color); transition: all 0.3s ease;"><span>${actualLevel+1}: $${formatAmt(amt)}</span></li>`;
        }).join('');
        updateLadder();
    }

    function updateLadder() { 
        document.querySelectorAll('.mill-level-item').forEach((li) => { 
            const levelIdx = parseInt(li.getAttribute('data-level')); 
            if (levelIdx === currentLevel) {
                li.style.backgroundColor = 'var(--primary-color)';
                li.style.color = 'var(--secondary-color)';
                li.style.borderColor = 'var(--primary-color)';
                li.style.transform = 'scale(1.05)';
            } else if (levelIdx < currentLevel) {
                li.style.backgroundColor = 'var(--code-color)';
                li.style.color = 'white';
                li.style.borderColor = 'var(--code-color)';
                li.style.transform = 'none';
            } else {
                li.style.backgroundColor = 'transparent';
                li.style.color = 'var(--primary-color)';
                li.style.borderColor = 'var(--tertiary-color)';
                li.style.transform = 'none';
            }
        }); 
    }

    function setup(db, appId, room) {
        dbRef = db; appIdRef = appId; roomID = room;
        const container = document.getElementById('millionaire-ui'); 
        if(!container) return;
        const data = window.currentChapterData?.millionaireData; 
        if (!data || !Array.isArray(data)) return;
        
        levelsPool = []; 
        const chunkSize = 5;
        for (let i = 0; i < data.length; i += chunkSize) levelsPool.push(data.slice(i, i + chunkSize));
        if (levelsPool.length > 15) levelsPool = levelsPool.slice(0, 15);
        
        renderBaseLayout(container);
        buildLadder(document.getElementById('mil-ladder'));

        if (roomID && roomID !== "solo" && dbRef) {
            const chapterKey = window.currentChapterData?.chapterTitle ? window.currentChapterData.chapterTitle.replace(/[^a-zA-Z0-9]/g, '') : 'General';
            const namespacedRoomID = chapterKey + "_" + roomID;
            docRef = window.doc(dbRef, 'artifacts', appIdRef, 'public', 'data', 'millionaireRooms', namespacedRoomID);
            
            if (window.globalPlayerName) {
                handleJoin(window.globalPlayerName);
            } else {
                showInlineJoinPrompt(container);
            }
        } else {
            localState = {
                activePlayerName: "Solo Player",
                currentLevel: 0,
                lifelines: {
                    fifty: { used: false, removedIndexes: [] },
                    phone: { used: false, status: 'idle', targetUid: null, response: null },
                    audience: { used: false, status: 'idle', votes: [0,0,0,0], votedUids: [] }
                }
            };
            isHotSeat = true;
            loadNewLevel(0); 
        }
    }

    async function leaveGame(skipConfirm = false) {
        if (skipConfirm && (!roomID || roomID === "solo")) return;

        if (!skipConfirm && myName && !(await window.GameModal.confirm("Are you sure you want to completely leave this game?"))) return;

        if (roomID !== "solo" && docRef && mySafeUid) {
            try {
                const snap = await window.getDoc(docRef);
                if (snap.exists()) {
                    let d = snap.data();
                    let updates = {};
                    if (d.activePlayerUid === mySafeUid) {
                        updates.activePlayerUid = null;
                        updates.activePlayerName = null;
                    }
                    let users = d.users || {};
                    delete users[mySafeUid];
                    updates.users = users;
                    await window.updateDoc(docRef, updates).catch(e=>{});
                }
            } catch(e){}
        }

        if (milUnsub) { milUnsub(); milUnsub = null; }
        myName = "";
        
        if (!skipConfirm) {
            window.globalPlayerName = ""; 
        }
        
        isHotSeat = false;
        localState = {};
        hideOverlay();
        
        const container = document.getElementById('millionaire-ui');
        container.innerHTML = '';
        
        if (!roomID || roomID === "solo") {
            renderBaseLayout(container);
            buildLadder(document.getElementById('mil-ladder'));
            localState = {
                activePlayerName: "Solo Player",
                currentLevel: 0,
                lifelines: {
                    fifty: { used: false, removedIndexes: [] },
                    phone: { used: false, status: 'idle', targetUid: null, response: null },
                    audience: { used: false, status: 'idle', votes: [0,0,0,0], votedUids: [] }
                }
            };
            isHotSeat = true;
            loadNewLevel(0);
        } else {
            renderBaseLayout(container);
            buildLadder(document.getElementById('mil-ladder'));
            showInlineJoinPrompt(container);
        }
    }

    function showInlineJoinPrompt(container) {
        showOverlay(`
            <div class="card shadow-sm p-5 text-center rounded-4 w-100 mx-auto" style="max-width: 450px; background-color: var(--secondary-color); border: 2px solid var(--primary-color);">
                <h2 class="fw-bold mb-3" style="color: var(--primary-color);">Who Wants to be a Millionaire?</h2>
                <p class="mb-4 fs-5" style="color: var(--primary-color);">Enter your name to join the studio audience!</p>
                <input type="text" id="mil-join-name" maxlength="15" value="${window.globalPlayerName || ''}" class="form-control form-control-lg mb-4 text-center fw-bold mx-auto" style="max-width: 300px; color: var(--primary-color); border: 2px solid var(--primary-color); background-color: white;" placeholder="Player Name" onkeydown="if(event.key === 'Enter') window.Millionaire.handleJoinForm()">
                <button class="btn btn-lg fw-bold shadow-sm mx-auto w-100" id="mil-join-btn" style="max-width: 300px; background-color: var(--primary-color); color: white; border: none;" onclick="window.Millionaire.handleJoinForm()">Join Studio</button>
            </div>
        `);
    }

    function handleJoinForm() {
        if (!docRef || !roomID || roomID === "solo") { location.reload(); return; }

        const inputEl = document.getElementById('mil-join-name');
        if (!inputEl) return;
        const nameInp = inputEl.value.trim().substring(0, 15);
        const finalName = nameInp || window.globalPlayerName || ("Player_" + Math.floor(Math.random()*1000));
        handleJoin(finalName);
    }

    function handleJoin(name) {
        if (!docRef || !roomID || roomID === "solo") return;
        
        myName = name;
        window.globalPlayerName = name; 
        hideOverlay();
        
        mySafeUid = window.currentUser ? window.currentUser.uid : ("temp_id_" + Math.random().toString(36).substring(7));
        
        joinRoom();

        milUnsub = window.onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                localState = snap.data();
                isHotSeat = mySafeUid && localState.activePlayerUid === mySafeUid;
                syncUI();
            } else {
                window.setDoc(docRef, {
                    activePlayerUid: null,
                    activePlayerName: null,
                    users: {},
                    currentLevel: 0,
                    activeQ: null,
                    activeOptions: null,
                    correctIndex: -1,
                    lifelines: {
                        fifty: { used: false, removedIndexes: [] },
                        phone: { used: false, status: 'idle', targetUid: null, response: null },
                        audience: { used: false, status: 'idle', votes: [0,0,0,0], votedUids: [] }
                    },
                    status: 'playing' 
                });
            }
        });
    }

    async function joinRoom() {
        if (!docRef) return;
        try {
            await window.setDoc(docRef, { 
                users: { [mySafeUid]: myName } 
            }, { merge: true });
        } catch(e) {}
    }

    function showOverlay(html) {
        const container = document.getElementById('millionaire-ui');
        if (!container) return;
        let overlay = document.getElementById('mil-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'mil-overlay';
            overlay.className = "position-absolute top-0 left-0 w-100 h-100 flex-column align-items-center justify-content-center p-3 d-none rounded-4";
            overlay.style.cssText = "z-index:50; background-color:rgba(0,0,0,0.85); backdrop-filter: blur(5px);";
            container.style.position = "relative";
            container.appendChild(overlay);
        }
        overlay.innerHTML = html;
        overlay.classList.remove('d-none');
        overlay.classList.add('d-flex');
    }

    function hideOverlay() {
        const overlay = document.getElementById('mil-overlay');
        if (overlay) {
            overlay.classList.remove('d-flex');
            overlay.classList.add('d-none');
        }
    }

    function syncUI() {
        if (!localState) return;

        if (localState.status === 'won') {
            showWinner();
            return;
        }

        currentLevel = localState.currentLevel || 0;
        activeQ = { question: localState.activeQ, answer: localState.activeOptions?.[localState.correctIndex] };
        activeOptions = localState.activeOptions || [];
        activeCorrectIndex = localState.correctIndex !== undefined ? localState.correctIndex : -1;
        
        renderUI();

        if (roomID !== "solo" && !localState.activePlayerUid) {
            showOverlay(`
                <h2 class="text-white mb-4 fw-bold" style="font-family: var(--font-family-monospace, monospace);">Waiting for a player...</h2>
                <button class="btn btn-lg fw-bold shadow px-5 py-3 rounded-pill fs-4" id="mil-claim-btn" style="background-color: var(--primary-color); color: var(--secondary-color); border: none;">Take the Hot Seat</button>
            `);
            document.getElementById('mil-claim-btn').onclick = async () => {
                if(docRef) {
                    await window.updateDoc(docRef, { 
                        activePlayerUid: mySafeUid, 
                        activePlayerName: myName, 
                        status: 'playing',
                        lifelines: {
                            fifty: { used: false, removedIndexes: [] },
                            phone: { used: false, status: 'idle', targetUid: null, response: null },
                            audience: { used: false, status: 'idle', votes: [0,0,0,0], votedUids: [] }
                        }
                    }).catch(e=>{});
                }
                loadLevelIntoDB(0); 
            };
            return;
        }

        hideOverlay();
        
        if (isHotSeat) {
            let feedbackHtml = '';

            if (localState.lifelines?.phone?.status === 'calling') {
                if (localState.lifelines.phone.targetUid === 'CPU') {
                    feedbackHtml += `<div class="alert shadow-sm text-start mb-3" style="background-color: var(--secondary-color); border: 2px solid var(--tertiary-color); color: var(--primary-color);"><strong>🤖 Computing Answer...</strong><br>The AI is analyzing its databanks...</div>`;
                } else {
                    const targetName = localState.users?.[localState.lifelines.phone.targetUid] || "Friend";
                    feedbackHtml += `<div class="alert shadow-sm text-start d-flex justify-content-between align-items-center mb-3" style="background-color: var(--secondary-color); border: 2px solid var(--tertiary-color); color: var(--primary-color);"><span><strong>📞 Calling ${targetName}...</strong><br>Waiting for them to send advice.</span> <button class="btn btn-sm fw-bold text-white shadow-sm" onclick="window.Millionaire.cancelPhone()" style="background-color: var(--file-name-color); border: none;">Cancel</button></div>`;
                }
            } else if (localState.lifelines?.phone?.status === 'answered') {
                feedbackHtml += `<div class="alert text-white shadow-sm text-start d-flex justify-content-between align-items-center mb-3" style="background-color: var(--code-color); border: 2px solid var(--primary-color);"><span><strong>📞 Phone Result:</strong><br>${localState.lifelines.phone.response}</span> <button class="btn btn-sm fw-bold" onclick="window.Millionaire.closePhone()" style="background-color: white; color: var(--code-color); border: none;">Dismiss</button></div>`;
            }

            if (localState.lifelines?.audience?.status === 'polling') {
                const total = localState.lifelines.audience.votes.reduce((a,b)=>a+b, 0);
                const v = localState.lifelines.audience.votes;
                const getPct = (val) => total > 0 ? Math.round((val/total)*100) : 0;
                
                let aiBtn = (roomID !== "solo") ? `<button class="btn btn-sm fw-bold w-100 mb-2 shadow-sm" onclick="window.Millionaire.addAIVotes()" style="background-color: var(--tertiary-color); color: white; border: none;">🤖 Simulate AI Votes</button>` : '';

                feedbackHtml += `
                    <div class="alert shadow-sm text-start mb-3" style="background-color: var(--secondary-color); border: 2px solid var(--tertiary-color);">
                        <h5 class="fw-bold mb-3" style="color: var(--primary-color);">👥 Audience Poll (Live)</h5>
                        ${[0,1,2,3].map(i => `
                            <div class="d-flex align-items-center mb-1 small">
                                <span class="fw-bold me-2" style="width: 25px; color: var(--primary-color);">${String.fromCharCode(65+i)}:</span>
                                <div class="progress flex-grow-1 bg-white" style="height: 18px; border: 1px solid var(--tertiary-color);">
                                    <div class="progress-bar fw-bold" style="width: ${getPct(v[i])}%; transition: width 0.5s ease; background-color: var(--primary-color); color: var(--secondary-color);"></div>
                                </div>
                                <span class="ms-2 fw-bold" style="width: 40px; text-align:right; color: var(--primary-color);">${getPct(v[i])}%</span>
                            </div>
                        `).join('')}
                        <div class="text-center small mt-2 mb-2 fw-bold" style="color: var(--tertiary-color);">Total Votes: ${total}</div>
                        ${aiBtn}
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm fw-bold w-50 shadow-sm" onclick="window.Millionaire.cancelAudience()" style="background-color: white; color: var(--primary-color); border: 1px solid var(--tertiary-color);">Cancel</button>
                            <button class="btn btn-sm text-white fw-bold w-50 shadow-sm" onclick="window.Millionaire.closeAudience()" style="background-color: var(--file-name-color); border: none;">End Poll</button>
                        </div>
                    </div>
                `;
                
                if (roomID === "solo" && total === 0 && !window.milAIVoted) {
                    window.milAIVoted = true;
                    setTimeout(() => window.Millionaire.addAIVotes(), 1000);
                }
            }
            
            const feedbackContainer = document.getElementById('mill-feedback');
            if (feedbackContainer && !feedbackContainer.innerHTML.includes('mill-fail-box')) {
                feedbackContainer.innerHTML = feedbackHtml;
            }

        } else {
            if (localState.lifelines?.phone?.status === 'calling' && localState.lifelines.phone.targetUid === mySafeUid) {
                let optionsHtml = '<div class="mb-3 text-start w-100 mx-auto" style="max-width: 300px;">';
                activeOptions.forEach((opt, i) => {
                    const removedIndexes = localState?.lifelines?.fifty?.removedIndexes || [];
                    if (!removedIndexes.includes(i)) {
                        const ltr = String.fromCharCode(65+i);
                        optionsHtml += `<div class="small mb-2 pb-1" style="color: var(--secondary-color); border-bottom: 1px solid var(--tertiary-color);"><strong>${ltr}:</strong> ${safeEscape(opt)}</div>`;
                    }
                });
                optionsHtml += '</div>';

                document.getElementById('mill-feedback').innerHTML = `
                    <div class="alert text-center rounded-4 shadow-sm" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color);">
                        <h3 class="mb-2" style="color: var(--secondary-color);">📞 Incoming Call!</h3>
                        <p class="text-white mb-2 small">${localState.activePlayerName} needs help!</p>
                        ${optionsHtml}
                        <input type="text" id="mil-phone-reply" class="form-control mb-3" placeholder="Type your advice..." style="border: 1px solid var(--tertiary-color); color: var(--primary-color);">
                        <button class="btn fw-bold w-100 shadow-sm" onclick="window.Millionaire.submitPhone()" style="background-color: var(--code-color); color: white; border: none;">Send Advice</button>
                    </div>
                `;
            } else if (localState.lifelines?.audience?.status === 'polling' && !localState.lifelines.audience.votedUids.includes(mySafeUid)) {
                let html = `<div class="alert text-center rounded-4 shadow-sm" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color);">
                            <h3 class="mb-3" style="color: var(--secondary-color);">👥 Audience Poll</h3>
                            <p class="text-white small mb-4">Select the correct answer to help!</p>
                            <div class="d-flex flex-column gap-2 w-100 mx-auto" style="max-width: 300px;">`;
                activeOptions.forEach((opt, i) => {
                    const removedIndexes = localState?.lifelines?.fifty?.removedIndexes || [];
                    if (!removedIndexes.includes(i)) {
                        const ltr = String.fromCharCode(65+i);
                        html += `<button class="btn text-start text-truncate fw-bold shadow-sm" onclick="window.Millionaire.submitAudience(${i})" style="background-color: white; color: var(--primary-color); border: 1px solid var(--tertiary-color);"><span class="me-2" style="color: var(--tertiary-color);">${ltr}:</span> ${safeEscape(opt)}</button>`;
                    }
                });
                html += `</div></div>`;
                document.getElementById('mill-feedback').innerHTML = html;
            } else if (localState.lifelines?.audience?.status === 'polling' && localState.lifelines.audience.votedUids.includes(mySafeUid)) {
                 document.getElementById('mill-feedback').innerHTML = `<div class="alert text-center rounded-4 shadow-sm" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color);"><h3 class="mb-2" style="color: var(--code-color);">✔️ Vote Cast</h3><p class="text-white mb-0 small">Waiting for ${localState.activePlayerName} to close the poll...</p></div>`;
            } else {
                 document.getElementById('mill-feedback').innerHTML = '';
            }
        }
    }

    function loadNewLevel(levelIndex) {
        currentLevel = levelIndex;
        window.milAIVoted = false; 
        document.getElementById('mill-feedback').innerHTML = ''; 
        
        const pool = levelsPool[currentLevel]; 
        if (!pool) return;
        activeQ = pool[Math.floor(Math.random() * pool.length)];
        activeOptions = [...activeQ.options];
        for (let i = activeOptions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [activeOptions[i], activeOptions[j]] = [activeOptions[j], activeOptions[i]]; }
        activeCorrectIndex = activeOptions.indexOf(activeQ.answer); 
        
        if (localState && localState.lifelines && localState.lifelines.fifty) {
            localState.lifelines.fifty.removedIndexes = [];
        }

        localState.activeQ = activeQ.question;
        localState.activeOptions = activeOptions;
        localState.correctIndex = activeCorrectIndex;
        localState.currentLevel = currentLevel;

        renderUI();
    }

    function loadLevelIntoDB(levelIdx) {
        if (levelIdx >= levelsPool.length) {
            if(docRef) window.updateDoc(docRef, { status: 'won' }).catch(e=>{});
            return;
        }
        const q = levelsPool[levelIdx][Math.floor(Math.random() * levelsPool[levelIdx].length)];
        let opts = [...q.options].sort(() => 0.5 - Math.random());
        let ansIdx = opts.indexOf(q.answer);
        if(docRef) window.updateDoc(docRef, {
            currentLevel: levelIdx,
            activeQ: q.question,
            activeOptions: opts,
            correctIndex: ansIdx,
            "lifelines.fifty.removedIndexes": [] 
        }).catch(e=>{});
    }

    function renderUI() {
        const qEl = document.getElementById('mil-question');
        const ansEl = document.getElementById('mil-answers');
        
        if(qEl) qEl.innerHTML = safeEscape(activeQ?.question || "Loading...");
        
        if(ansEl && activeOptions) {
            const removedIndexes = localState?.lifelines?.fifty?.removedIndexes || [];
            
            ansEl.innerHTML = activeOptions.map((opt, i) => {
                if (removedIndexes.includes(i)) {
                    return `<div class="col-md-6"><button type="button" class="btn w-100" style="visibility: hidden;" disabled></button></div>`;
                }
                return `<div class="col-md-6"><button type="button" class="btn w-100 p-3 fw-bold text-start mill-opt shadow-sm fs-5" data-index="${i}" style="background-color: white; color: var(--primary-color); border: 2px solid var(--tertiary-color);"><span class="me-2" style="color: var(--tertiary-color);">${String.fromCharCode(65+i)}:</span> ${safeEscape(opt)}</button></div>`;
            }).join('');
            
            document.querySelectorAll('.mill-opt:not([disabled])').forEach(btn => {
                btn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    if (roomID !== "solo" && !isHotSeat) {
                        if (window.GameModal) await window.GameModal.alert("Only the player in the Hot Seat can lock in an answer!");
                        return;
                    }
                    window.Millionaire.check(parseInt(this.dataset.index), this);
                });
            });
        }

        const allBtns = Array.from(document.querySelectorAll('#mil-lifelines-container button'));
        const fiftyBtns = allBtns.filter(b => b.textContent.toLowerCase().includes('50:50') || b.textContent.includes('50'));
        const phoneBtns = allBtns.filter(b => b.textContent.toLowerCase().includes('phone'));
        const audBtns = allBtns.filter(b => b.textContent.toLowerCase().includes('audience') || b.textContent.toLowerCase().includes('poll'));
        
        const fiftyUsed = localState?.lifelines?.fifty?.used;
        const phoneUsed = localState?.lifelines?.phone?.used;
        const audUsed = localState?.lifelines?.audience?.used;
        
        fiftyBtns.forEach(btn => {
            btn.onclick = (e) => { e.preventDefault(); window.Millionaire.startFifty(); };
            if ((roomID !== "solo" && !isHotSeat) || fiftyUsed) {
                btn.disabled = true;
                btn.style.opacity = '0.4';
                if (fiftyUsed) btn.style.textDecoration = 'line-through';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.textDecoration = 'none';
            }
        });

        phoneBtns.forEach(btn => {
            btn.onclick = (e) => { e.preventDefault(); window.Millionaire.startPhone(); };
            if ((roomID !== "solo" && !isHotSeat) || phoneUsed) {
                btn.disabled = true;
                btn.style.opacity = '0.4';
                if (phoneUsed) btn.style.textDecoration = 'line-through';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.textDecoration = 'none';
            }
        });

        audBtns.forEach(btn => {
            btn.onclick = (e) => { e.preventDefault(); window.Millionaire.startAud(); };
            if ((roomID !== "solo" && !isHotSeat) || audUsed) {
                btn.disabled = true;
                btn.style.opacity = '0.4';
                if (audUsed) btn.style.textDecoration = 'line-through';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.textDecoration = 'none';
            }
        });

        if (roomID !== "solo") {
            let statusArea = document.getElementById('mil-status-area');
            if (statusArea) {
                if (isHotSeat) {
                    statusArea.innerHTML = `<button class="btn fw-bold shadow px-4 py-2 rounded-pill w-100" id="mil-btn-leave" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none;">Give Up Hot Seat</button>`;
                    document.getElementById('mil-btn-leave').onclick = async () => { 
                        if (window.GameModal && await window.GameModal.confirm("Are you sure you want to step down from the Hot Seat?")) if(docRef) window.updateDoc(docRef, { activePlayerUid: null }).catch(e=>{}); 
                    };
                } else if (localState?.activePlayerName) {
                    statusArea.innerHTML = `<div class="badge p-3 fs-6 shadow rounded-pill w-100" style="background-color: var(--secondary-color); color: var(--primary-color); border: 1px solid var(--tertiary-color);">Currently Playing: ${localState.activePlayerName}</div>`;
                } else {
                    statusArea.innerHTML = '';
                }
            }
        }

        updateLadder();
    }

    function check(selectedIndex, btn) {
        document.querySelectorAll('.mill-opt').forEach(b => b.disabled = true);
        if(selectedIndex === activeCorrectIndex) { 
            btn.style.backgroundColor = "var(--code-color)";
            btn.style.borderColor = "var(--code-color)";
            btn.style.color = "white";
            setTimeout(() => { 
                if (roomID !== "solo") {
                    loadLevelIntoDB(currentLevel + 1);
                } else {
                    currentLevel++; 
                    if(currentLevel < levelsPool.length) loadNewLevel(currentLevel); else showWinner(); 
                }
            }, 1500); 
        } else { 
            btn.style.backgroundColor = "var(--file-name-color)";
            btn.style.borderColor = "var(--file-name-color)";
            btn.style.color = "white";
            document.getElementById('mill-feedback').innerHTML = `<div class="alert text-white text-center fs-5 shadow mill-fail-box rounded-4" style="background-color: var(--file-name-color); border: 2px solid var(--primary-color);">Correct Answer: <br><code id="mill-correct-code" class="text-white fs-4 fw-bold"></code></div>`;
            document.getElementById('mill-correct-code').innerHTML = safeEscape(activeQ.answer || activeOptions[activeCorrectIndex]);
            
            if (roomID !== "solo") {
                setTimeout(() => {
                    if(docRef) window.updateDoc(docRef, { activePlayerUid: null }).catch(e=>{}); 
                    document.getElementById('mill-feedback').innerHTML = ""; 
                }, 4000);
            } else {
                setTimeout(() => { location.reload() }, 3000);
            }
        }
    }

    function showWinner() {
        const container = document.getElementById('millionaire-ui');
        if (!container) return;
        container.innerHTML = `
            <div class='card shadow-lg text-center p-5 rounded-4 w-100 mx-auto' style='max-width: 600px; background-color: var(--primary-color); border: 2px solid var(--tertiary-color);'>
                <h2 class='display-3 fw-bold mb-4 mill-win-text' style="color: var(--secondary-color);">WINNER!</h2>
                <button class='btn btn-lg mx-auto w-100 fw-bold shadow-sm' style="max-width: 250px; background-color: var(--code-color); color: white; border: none;" onclick='${roomID !== "solo" ? "window.Millionaire.resetMultiplayer()" : "location.reload()"}'>Reset Game</button>
            </div>`;
    }

    function resetMultiplayer() {
        if (roomID && roomID !== "solo" && dbRef && docRef) {
            window.updateDoc(docRef, { activePlayerUid: null, status: 'playing' }).catch(e=>{});
        }
    }

    function startFifty() {
        if (localState?.lifelines?.fifty?.used) return;
        
        let wrongIndexes = [];
        for (let i = 0; i < 4; i++) {
            if (i !== activeCorrectIndex) wrongIndexes.push(i);
        }
        wrongIndexes.sort(() => Math.random() - 0.5);
        let removed = [wrongIndexes[0], wrongIndexes[1]];
        
        if (roomID !== "solo" && docRef) {
            window.updateDoc(docRef, { 
                "lifelines.fifty.used": true, 
                "lifelines.fifty.removedIndexes": removed 
            }).catch(e=>{});
        } else {
            if (!localState.lifelines) localState.lifelines = {};
            if (!localState.lifelines.fifty) localState.lifelines.fifty = {};
            localState.lifelines.fifty.used = true;
            localState.lifelines.fifty.removedIndexes = removed;
            renderUI();
        }
    }

    async function startPhone() {
        if (localState?.lifelines?.phone?.used) return;
        const users = localState.users || {};
        const availableUids = Object.keys(users).filter(uid => uid !== mySafeUid);
        
        let buttonsHtml = availableUids.map(uid =>
            `<button class="btn w-100 mb-2 fw-bold shadow-sm" style="background-color: white; color: var(--primary-color); border: 1px solid var(--tertiary-color);" onclick="window.Millionaire.pickPhoneTarget('${uid}')">${users[uid]}</button>`
        ).join('');

        buttonsHtml += `<button class="btn w-100 mb-2 fw-bold shadow-sm" style="background-color: var(--tertiary-color); color: white; border: none;" onclick="window.Millionaire.pickPhoneTarget('CPU')">🤖 Computer AI</button>`;

        document.getElementById('mill-feedback').innerHTML = `
            <div class="alert shadow-sm text-center mt-3" style="background-color: var(--secondary-color); border: 2px solid var(--tertiary-color);">
                <h5 class="fw-bold mb-3" style="color: var(--primary-color);">📞 Who do you want to call?</h5>
                <div class="d-flex flex-column gap-2 w-100 mx-auto" style="max-width: 300px;">
                    ${buttonsHtml}
                </div>
                <button class="btn btn-sm mt-3 fw-bold text-white w-100 mx-auto shadow-sm" style="max-width: 300px; background-color: var(--file-name-color); border: none;" onclick="window.Millionaire.cancelPhone()">Cancel</button>
            </div>
        `;
    }

    function pickPhoneTarget(uid) {
        document.getElementById('mill-feedback').innerHTML = ''; 
        if(docRef) window.updateDoc(docRef, { "lifelines.phone.used": true, "lifelines.phone.status": "calling", "lifelines.phone.targetUid": uid }).catch(e=>{});
        else {
            localState.lifelines.phone.used = true;
            localState.lifelines.phone.status = 'calling';
            localState.lifelines.phone.targetUid = uid;
            syncUI();
        }

        if (uid === 'CPU') {
            setTimeout(() => {
                const correctIdx = localState.correctIndex;
                const opts = localState.activeOptions || [];
                const removed = localState.lifelines?.fifty?.removedIndexes || [];
                const available = [0, 1, 2, 3].filter(i => !removed.includes(i));
                
                const isRight = Math.random() < 0.75; 
                const chosenIndex = isRight ? correctIdx : (available.find(i => i !== correctIdx) ?? correctIdx);
                const ansText = safeEscape(opts[chosenIndex] || "I'm not sure");
                
                const correctReasons = [
                    `I just checked my databanks. The answer is definitely "${ansText}".`,
                    `I'm highly confident about this one! It's "${ansText}".`,
                    `I remember processing this recently. Go with "${ansText}".`
                ];
                const wrongReasons = [
                    `This is a tough one, but my algorithm leans towards "${ansText}".`,
                    `I'm only 50% sure, but I think it might be "${ansText}".`,
                    `My data is a bit corrupted here, but I'll guess "${ansText}".`
                ];

                const msg = isRight 
                    ? correctReasons[Math.floor(Math.random() * correctReasons.length)] 
                    : wrongReasons[Math.floor(Math.random() * wrongReasons.length)];
                
                if (docRef) window.updateDoc(docRef, { "lifelines.phone.status": "answered", "lifelines.phone.response": msg }).catch(e=>{});
                else { localState.lifelines.phone.status = "answered"; localState.lifelines.phone.response = msg; syncUI(); }
            }, 2500);
        }
    }
    
    function cancelPhone() {
        document.getElementById('mill-feedback').innerHTML = ''; 
        if (docRef) window.updateDoc(docRef, { "lifelines.phone.used": false, "lifelines.phone.status": "idle", "lifelines.phone.targetUid": null }).catch(e=>{});
        else {
            localState.lifelines.phone.used = false;
            localState.lifelines.phone.status = 'idle';
            localState.lifelines.phone.targetUid = null;
            syncUI();
        }
    }

    async function startAud() {
        if (localState?.lifelines?.audience?.used) return;
        if(docRef) window.updateDoc(docRef, { "lifelines.audience.used": true, "lifelines.audience.status": "polling", "lifelines.audience.votes": [0,0,0,0], "lifelines.audience.votedUids": [] }).catch(e=>{});
        else {
            localState.lifelines.audience.used = true;
            localState.lifelines.audience.status = 'polling';
            localState.lifelines.audience.votes = [0,0,0,0];
            localState.lifelines.audience.votedUids = [];
            syncUI();
        }
    }

    function addAIVotes() {
        const votes = [...(localState.lifelines.audience.votes || [0,0,0,0])];
        for(let i=0; i<100; i++) {
            if(Math.random() < 0.75) votes[activeCorrectIndex]++;
            else votes[Math.floor(Math.random() * 4)]++;
        }
        if (docRef) window.updateDoc(docRef, { "lifelines.audience.votes": votes }).catch(e=>{});
        else { localState.lifelines.audience.votes = votes; syncUI(); }
    }

    function submitPhone() {
        const text = document.getElementById('mil-phone-reply').value;
        if (!text) return;
        if(docRef) window.updateDoc(docRef, { "lifelines.phone.status": "answered", "lifelines.phone.response": text }).catch(e=>{});
    }

    function closePhone() {
        document.getElementById('mill-feedback').innerHTML = '';
        if(docRef) window.updateDoc(docRef, { "lifelines.phone.status": "finished" }).catch(e=>{});
        else { localState.lifelines.phone.status = 'finished'; syncUI(); }
    }

    function cancelAudience() {
        document.getElementById('mill-feedback').innerHTML = '';
        if (docRef) window.updateDoc(docRef, { "lifelines.audience.used": false, "lifelines.audience.status": "idle", "lifelines.audience.votes": [0,0,0,0], "lifelines.audience.votedUids": [] }).catch(e=>{});
        else {
            localState.lifelines.audience.used = false;
            localState.lifelines.audience.status = 'idle';
            localState.lifelines.audience.votes = [0,0,0,0];
            localState.lifelines.audience.votedUids = [];
            syncUI();
        }
    }

    async function submitAudience(optIdx) {
        if (!docRef) return;
        try {
            const snap = await window.getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.lifelines.audience.votedUids.includes(mySafeUid)) return; 
                
                const newVotes = [...data.lifelines.audience.votes];
                newVotes[optIdx]++;
                const newUids = [...data.lifelines.audience.votedUids, mySafeUid];
                
                window.updateDoc(docRef, { "lifelines.audience.votes": newVotes, "lifelines.audience.votedUids": newUids }).catch(e=>{});
            }
        } catch(e) {}
    }

    function closeAudience() {
        document.getElementById('mill-feedback').innerHTML = '';
        if (docRef) window.updateDoc(docRef, { "lifelines.audience.status": "finished" }).catch(e=>{});
        else { localState.lifelines.audience.status = 'finished'; syncUI(); }
    }

    return { setup, check, resetMultiplayer, closePhone, submitPhone, closeAudience, submitAudience, startPhone, startAud, startFifty, cancelPhone, cancelAudience, showHowToPlay, leaveGame, pickPhoneTarget, hideOverlay, addAIVotes, loadNewLevel, renderUI, handleJoinForm };
})();