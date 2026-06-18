// ======================================================
// 4. ARE YOU SMARTER THAN A WEB DESIGN INTERN? ENGINE
// ======================================================
window.Smarter = (() => {
    let dbRef, appIdRef, roomID, docRef;
    let smUnsub = null;
    let localState = {};
    let myName = "";
    let isPodium = false;
    let activeOptions = [];
    let activeCorrectIndex = -1;
    let mySafeUid = null;

    function shuffleArray(array) {
        let copy = [...array];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function safeEscape(str) {
        try {
            if (typeof window.escapeHTML === 'function') return window.escapeHTML(str);
            if (typeof str !== 'string') return str;
            return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        } catch(e) { return String(str || ''); }
    }

    function showHowToPlay() {
        let htp = document.getElementById('sm-how-to-modal');
        if (!htp) {
            htp = document.createElement('div');
            htp.id = 'sm-how-to-modal';
            htp.className = "position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3 d-none";
            htp.style.cssText = "z-index:9999; background-color:rgba(0,0,0,0.85); backdrop-filter: blur(5px);";
            htp.innerHTML = `
                <div class="card shadow-lg p-4 text-start rounded-4" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color); max-width: 600px; width: 100%;">
                    <div class="d-flex justify-content-between align-items-center pb-2 mb-3" style="border-bottom: 2px solid var(--tertiary-color);">
                        <h3 class="fw-bold mb-0" style="color: var(--secondary-color); font-family: var(--font-family-monospace, monospace);">How to Play: Are You Smarter?</h3>
                        <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('sm-how-to-modal').classList.replace('d-flex', 'd-none')"></button>
                    </div>
                    <p style="color: var(--secondary-color);"><strong>📺 The TV Show:</strong> An adult tries to answer 10 grade-school questions. They have a class of kids to help them using three cheats: Peek, Copy, and Save.</p>
                    <p style="color: var(--secondary-color);"><strong>💻 On This Site:</strong><br><br>
                    • <strong>Randomization:</strong> Subjects and answer choices are randomized every game.<br><br>
                    • <strong>The Cheats:</strong><br>
                    <strong>👁️ Peek:</strong> See the Class's live voting chart.<br>
                    <strong>📝 Copy:</strong> Auto-locks the Class's top choice.<br>
                    <strong>🛟 Save:</strong> If you guess wrong but the Class gets it right, you are saved!</p>
                    <button class="btn btn-lg w-100 shadow-sm mt-2 fw-bold" onclick="document.getElementById('sm-how-to-modal').classList.replace('d-flex', 'd-none')" style="background-color: var(--secondary-color); color: var(--primary-color); border: none;">Got It!</button>
                </div>
            `;
            document.body.appendChild(htp);
        }
        htp.classList.remove('d-none');
        htp.classList.add('d-flex');
    }

    function renderBaseLayout(container) {
        if(container.querySelector('#sm-layout')) return;
        
        let actionsRow = document.getElementById('sm-header-actions');
        if (actionsRow) actionsRow.remove(); 
        
        container.innerHTML = `
            <div id="sm-layout" class="row mt-3 g-4">
                <div class="col-lg-7 d-flex flex-column position-relative" id="sm-left-col" style="min-height: 400px;">
                    <div id="sm-q-area" class="card shadow-sm p-4 mb-3 text-center rounded-4 z-2" style="background-color: var(--primary-color); border: 2px solid var(--tertiary-color); min-height: 250px; display: flex; flex-direction: column; justify-content: center;">
                        <h3 class="mb-4 fst-italic fw-bold" id="sm-q-text" style="color: var(--secondary-color);">Select a subject from the board...</h3>
                        <div class="row g-2" id="sm-options-area"></div>
                    </div>
                    <div id="sm-cheats-area" class="d-flex justify-content-center gap-3 z-2"></div>
                    <div id="sm-feedback-area" class="mt-3 w-100 flex-grow-1 z-2"></div>
                    
                    <!-- STUDIO AUDIENCE BACKGROUND -->
                    <div class="position-absolute bottom-0 start-0 w-100 z-1" style="opacity: 0.35; pointer-events: none; overflow: hidden; height: 250px; -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%); mask-image: linear-gradient(to top, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%);">
                        <img src="/images/celebs/studioAudience.png" alt="Studio Audience" style="width: 100%; height: 100%; object-fit: cover; object-position: center bottom;">
                    </div>
                </div>
                <div class="col-lg-5 d-flex flex-column z-2" id="sm-right-col">
                    <div class="card shadow-sm rounded-4 flex-grow-1" style="border: 2px solid var(--tertiary-color); overflow: hidden;">
                        <div class="card-header text-center fw-bold fs-5" style="background-color: var(--primary-color); color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                            Subject Board
                        </div>
                        
                        <div class="p-2 text-center" style="background-color: var(--secondary-color); border-bottom: 2px solid var(--tertiary-color);">
                            <div class="d-flex justify-content-center gap-2 flex-wrap">
                                <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="window.Smarter.showHowToPlay()" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">❓ How to Play</button>
                                <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="location.reload()" style="background-color: var(--quaternary-color); color: var(--primary-color); border: none; touch-action: manipulation;">🔄 Reset</button>
                                <button type="button" class="btn btn-sm py-1 px-3 fw-bold shadow-sm" onclick="window.Smarter.leaveGame()" style="background-color: white; color: var(--file-name-color); border: 2px solid var(--file-name-color); touch-action: manipulation;">❌ Leave</button>
                            </div>
                        </div>

                        <div class="card-body p-3 d-grid gap-2" id="sm-board-area" style="background-color: white;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function setup(db, appId, room) {
        dbRef = db; appIdRef = appId; roomID = room;
        const container = document.getElementById('smarter-ui'); 
        if(!container) return;
        
        const data = window.currentChapterData?.smarterData || window.currentChapterData?.millionaireData; 
        if (!data || !Array.isArray(data)) return;

        renderBaseLayout(container);

        if (roomID && roomID !== "solo" && dbRef) {
            const chapterKey = window.currentChapterData?.chapterTitle ? window.currentChapterData.chapterTitle.replace(/[^a-zA-Z0-9]/g, '') : 'General';
            const namespacedRoomID = chapterKey + "_" + roomID;
            docRef = window.doc(dbRef, 'artifacts', appIdRef, 'public', 'data', 'smarterRooms', namespacedRoomID);
            
            if (window.globalPlayerName) {
                handleJoin(window.globalPlayerName);
            } else {
                showInlineJoinPrompt(container);
            }

        } else {
            const shuffledIndices = shuffleArray([...Array(Math.min(data.length, 10)).keys()]);
            localState = {
                activePlayerName: "Solo Player",
                completedSubjects: [],
                subjectOrder: shuffledIndices,
                activeQ: null,
                activeOptions: null,
                correctIndex: -1,
                cheats: { peek: { used: false }, copy: { used: false }, save: { used: false } },
                classVotes: [0,0,0,0],
                votedUids: []
            };
            isPodium = true;
            syncUI();
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

        if (smUnsub) { smUnsub(); smUnsub = null; }
        myName = "";
        
        if (!skipConfirm && typeof window.globalPlayerName !== 'undefined') {
            window.globalPlayerName = ""; 
        }
        
        isPodium = false;
        localState = {};
        hideOverlay();

        const container = document.getElementById('smarter-ui');
        container.innerHTML = '';
        
        if (!roomID || roomID === "solo") {
            renderBaseLayout(container);
            const data = window.currentChapterData?.smarterData || window.currentChapterData?.millionaireData;
            const shuffledIndices = shuffleArray([...Array(Math.min(data.length, 10)).keys()]);
            localState = {
                activePlayerName: "Solo Player",
                completedSubjects: [],
                subjectOrder: shuffledIndices,
                activeQ: null,
                activeOptions: null,
                correctIndex: -1,
                cheats: { peek: { used: false }, copy: { used: false }, save: { used: false } },
                classVotes: [0,0,0,0],
                votedUids: []
            };
            isPodium = true;
            syncUI();
        } else {
            renderBaseLayout(container);
            showInlineJoinPrompt(container);
        }
    }

    function showInlineJoinPrompt(container) {
        showOverlay(`
            <div class="card shadow-sm p-5 text-center rounded-4 w-100 mx-auto" style="max-width: 450px; background-color: var(--secondary-color); border: 2px solid var(--primary-color);">
                <h2 class="fw-bold mb-3" style="color: var(--primary-color);">Are You Smarter Than a Web Design Intern?</h2>
                <p class="mb-4 fs-5" style="color: var(--primary-color);">Enter your name to join the class!</p>
                <input type="text" id="sm-join-name" maxlength="15" value="${window.globalPlayerName || ''}" class="form-control form-control-lg mb-4 text-center fw-bold mx-auto" style="max-width: 300px; color: var(--primary-color); border: 2px solid var(--primary-color); background-color: white;" placeholder="Player Name" onkeydown="if(event.key === 'Enter') window.Smarter.handleJoinForm()">
                <button class="btn btn-lg fw-bold shadow-sm mx-auto w-100" style="max-width: 300px; background-color: var(--primary-color); color: white; border: none;" onclick="window.Smarter.handleJoinForm()">Join Classroom</button>
            </div>
        `);
    }

    function handleJoinForm() {
        if (!docRef || !roomID || roomID === "solo") { location.reload(); return; }

        const inputEl = document.getElementById('sm-join-name');
        if (!inputEl) return;
        const nameInp = inputEl.value.trim().substring(0, 15);
        const finalName = nameInp || ("Player_" + Math.floor(Math.random()*1000));
        handleJoin(finalName);
    }

    function handleJoin(name) {
        if (!docRef || !roomID || roomID === "solo") return;
        
        myName = name;
        if (typeof window.globalPlayerName !== 'undefined') window.globalPlayerName = name; 
        hideOverlay();
        
        mySafeUid = window.currentUser ? window.currentUser.uid : ("temp_id_" + Math.random().toString(36).substring(7));
        
        joinRoom();

        smUnsub = window.onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                localState = snap.data();
                isPodium = mySafeUid && localState.activePlayerUid === mySafeUid;
                syncUI();
            } else {
                const data = window.currentChapterData?.smarterData || window.currentChapterData?.millionaireData;
                const shuffledIndices = shuffleArray([...Array(Math.min(data.length, 10)).keys()]);
                window.setDoc(docRef, {
                    activePlayerUid: null,
                    activePlayerName: null,
                    users: {},
                    completedSubjects: [],
                    subjectOrder: shuffledIndices,
                    activeQ: null,
                    activeOptions: null,
                    correctIndex: -1,
                    cheats: {
                        peek: { used: false },
                        copy: { used: false },
                        save: { used: false }
                    },
                    classVotes: [0,0,0,0],
                    votedUids: [],
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
        const container = document.getElementById('smarter-ui');
        if (!container) return;
        let overlay = document.getElementById('sm-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sm-overlay';
            overlay.className = "position-absolute top-0 start-0 w-100 h-100 flex-column align-items-center justify-content-center p-3 d-none rounded-4";
            overlay.style.cssText = "z-index:50; background-color:rgba(0,0,0,0.85); backdrop-filter: blur(5px);";
            container.style.position = "relative";
            container.appendChild(overlay);
        }
        overlay.innerHTML = html;
        overlay.classList.remove('d-none');
        overlay.classList.add('d-flex');
    }

    function hideOverlay() {
        const overlay = document.getElementById('sm-overlay');
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

        const data = window.currentChapterData?.smarterData || window.currentChapterData?.millionaireData;
        const totalSubjects = Math.min(data.length, 10); 

        if (roomID !== "solo" && !localState.activePlayerUid) {
            showOverlay(`
                <h2 class="text-white mb-4 fw-bold">Waiting for a player...</h2>
                <button class="btn btn-lg fw-bold shadow px-5 py-3 rounded-pill fs-4" id="sm-claim-btn" style="background-color: var(--primary-color); color: var(--secondary-color); border: none;">Take the Podium</button>
            `);
            document.getElementById('sm-claim-btn').onclick = async () => {
                if(docRef) {
                    await window.updateDoc(docRef, { 
                        activePlayerUid: mySafeUid, 
                        activePlayerName: myName, 
                        status: 'playing',
                        completedSubjects: [],
                        activeQ: null,
                        activeOptions: null,
                        correctIndex: -1,
                        cheats: { peek: { used: false }, copy: { used: false }, save: { used: false } },
                        classVotes: [0,0,0,0],
                        votedUids: []
                    }).catch(e=>{});
                }
            };
            return;
        }

        hideOverlay();

        const completed = localState.completedSubjects || [];
        if (completed.length >= totalSubjects && localState.status !== 'won') {
            if (isPodium) {
                if (docRef) window.updateDoc(docRef, { status: 'won' }).catch(e=>{});
                else { localState.status = 'won'; syncUI(); }
            }
            return;
        }

        const boardArea = document.getElementById('sm-board-area');
        if (boardArea) {
            let boardHtml = "";
            const order = localState.subjectOrder || [...Array(totalSubjects).keys()];
            
            for (let i of order) {
                const isCompleted = completed.includes(i);
                const qData = data[i];
                let label = qData.category ? safeEscape(qData.category) : `${Math.ceil((i+1)/2)}st Grade Topic`;
                if(i===2 || i===3) label = label.replace("st", "nd");
                if(i===4 || i===5) label = label.replace("st", "rd");
                if(i>5) label = label.replace("st", "th");

                if (isCompleted) {
                    boardHtml += `<button class="btn w-100 fw-bold text-white shadow-sm" disabled style="background-color: var(--code-color); border: none;">✔️ ${label}</button>`;
                } else if (localState.activeQ) {
                    boardHtml += `<button class="btn w-100 fw-bold shadow-sm" disabled style="background-color: white; color: var(--quaternary-color); border: 2px solid var(--quaternary-color);">${label}</button>`;
                } else {
                    boardHtml += `<button class="btn w-100 fw-bold shadow-sm" ${!isPodium ? 'disabled' : `onclick="window.Smarter.pickSubject(${i})"`} style="background-color: var(--secondary-color); color: var(--primary-color); border: 2px solid var(--tertiary-color);">${label}</button>`;
                }
            }
            boardArea.innerHTML = boardHtml;
        }

        const qArea = document.getElementById('sm-q-text');
        const optArea = document.getElementById('sm-options-area');
        const fbArea = document.getElementById('sm-feedback-area');
        
        if (localState.activeQ) {
            qArea.innerHTML = safeEscape(localState.activeQ);
            activeOptions = localState.activeOptions || [];
            activeCorrectIndex = localState.correctIndex;
            
            let optsHtml = "";
            activeOptions.forEach((opt, i) => {
                const ltr = String.fromCharCode(65+i);
                if (isPodium) {
                    optsHtml += `<div class="col-md-6"><button class="btn w-100 fw-bold text-start p-3 h-100 shadow-sm" style="background-color: white; color: var(--primary-color); border: 2px solid var(--tertiary-color);" onclick="window.Smarter.checkAnswer(${i})"><span style="color: var(--tertiary-color);" class="me-1">${ltr}:</span> ${safeEscape(opt)}</button></div>`;
                } else {
                    const hasVoted = localState.votedUids?.includes(mySafeUid);
                    if (hasVoted) {
                        optsHtml += `<div class="col-md-6"><button class="btn w-100 fw-bold text-start p-3 h-100 shadow-sm text-white" disabled style="background-color: var(--tertiary-color); border: none;"><span class="text-white me-1">${ltr}:</span> ${safeEscape(opt)}</button></div>`;
                    } else {
                        optsHtml += `<div class="col-md-6"><button class="btn w-100 fw-bold text-start p-3 h-100 shadow-sm" style="background-color: white; color: var(--primary-color); border: 2px solid var(--tertiary-color);" onclick="window.Smarter.voteAnswer(${i})"><span style="color: var(--tertiary-color);" class="me-1">${ltr}:</span> ${safeEscape(opt)}</button></div>`;
                    }
                }
            });
            optArea.innerHTML = optsHtml;

            if (isPodium) {
                const cheats = localState.cheats || {};
                document.getElementById('sm-cheats-area').innerHTML = `
                    <button class="btn btn-sm fw-bold rounded-pill shadow-sm" ${cheats.peek.used ? 'disabled' : 'onclick="window.Smarter.usePeek()"'} style="background-color: var(--tertiary-color); color: white; ${cheats.peek.used ? 'opacity: 0.5; text-decoration: line-through;' : ''}">👁️ PEEK</button>
                    <button class="btn btn-sm fw-bold rounded-pill shadow-sm" ${cheats.copy.used ? 'disabled' : 'onclick="window.Smarter.useCopy()"'} style="background-color: var(--primary-color); color: white; ${cheats.copy.used ? 'opacity: 0.5; text-decoration: line-through;' : ''}">📝 COPY</button>
                    <div class="badge d-flex align-items-center px-3 rounded-pill shadow-sm" style="background-color: var(--code-color); color: white;">
                        <span class="fw-bold" style="${cheats.save.used ? 'text-decoration: line-through; opacity: 0.5;' : ''}">🛟 AUTO-SAVE</span>
                    </div>
                `;

                const totalVotes = localState.classVotes ? localState.classVotes.reduce((a,b)=>a+b, 0) : 0;
                if (roomID !== "solo" && totalVotes === 0 && !cheats.peek.active && !cheats.copy.used) {
                    document.getElementById('sm-cheats-area').innerHTML += `<button class="btn btn-sm fw-bold ms-2 rounded-pill shadow-sm" onclick="window.Smarter.addAIVotes()" style="background-color: white; color: var(--primary-color); border: 1px solid var(--tertiary-color);">🤖 AI Class</button>`;
                }

                if (cheats.peek.active) {
                    const v = localState.classVotes;
                    const getPct = (val) => totalVotes > 0 ? Math.round((val/totalVotes)*100) : 0;
                    
                    fbArea.innerHTML = `
                        <div class="alert shadow text-start" style="background-color: var(--secondary-color); border: 2px solid var(--tertiary-color);">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5 class="fw-bold mb-0" style="color: var(--primary-color);">👁️ Peeking at the Class!</h5>
                                <button class="btn btn-sm fw-bold shadow-sm" onclick="window.Smarter.closePeek()" style="background-color: var(--file-name-color); color: white; border: none;">Close Peek</button>
                            </div>
                            ${[0,1,2,3].map(i => `
                                <div class="d-flex align-items-center mb-2 small">
                                    <span class="fw-bold me-2" style="width: 25px; color: var(--primary-color);">${String.fromCharCode(65+i)}:</span>
                                    <div class="progress flex-grow-1 bg-white" style="height: 20px; border: 1px solid var(--tertiary-color);">
                                        <div class="progress-bar fw-bold" style="width: ${getPct(v[i])}%; transition: width 0.5s ease; background-color: var(--primary-color); color: white;">
                                            ${getPct(v[i])}% (${v[i]})
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    fbArea.innerHTML = '';
                }

            } else {
                document.getElementById('sm-cheats-area').innerHTML = `
                    <div class="badge p-2 mt-2 shadow rounded-pill" style="background-color: var(--secondary-color); color: var(--primary-color); border: 1px solid var(--tertiary-color);">At Podium: ${localState.activePlayerName}</div>
                `;
            }

        } else {
            qArea.innerHTML = "Select a subject from the board...";
            optArea.innerHTML = "";
            fbArea.innerHTML = "";
            if (isPodium) {
                document.getElementById('sm-cheats-area').innerHTML = `<button class="btn btn-sm fw-bold mt-3 rounded-pill shadow-sm" onclick="window.Smarter.leaveGame()" style="background-color: var(--file-name-color); color: white; border: none;">Give Up Podium</button>`;
            } else {
                document.getElementById('sm-cheats-area').innerHTML = `<div class="badge p-2 mt-2 shadow rounded-pill" style="background-color: var(--secondary-color); color: var(--primary-color); border: 1px solid var(--tertiary-color);">At Podium: ${localState.activePlayerName}</div>`;
            }
        }
    }

    function pickSubject(index) {
        if (!isPodium) return;
        const data = window.currentChapterData?.smarterData || window.currentChapterData?.millionaireData;
        const qData = data[index];
        let opts = shuffleArray([...(qData.options || [qData.answer, "Fake A", "Fake B", "Fake C"])]);
        let ansIdx = opts.indexOf(qData.answer);

        if (docRef) {
            window.updateDoc(docRef, {
                activeQ: qData.question || qData.q,
                activeOptions: opts,
                correctIndex: ansIdx,
                classVotes: [0,0,0,0],
                votedUids: [],
                currentSubjectIndex: index
            }).catch(e=>{});
        } else {
            localState.activeQ = qData.question || qData.q;
            localState.activeOptions = opts;
            localState.correctIndex = ansIdx;
            localState.classVotes = [0,0,0,0];
            localState.votedUids = [];
            localState.currentSubjectIndex = index;
            syncUI();
            setTimeout(() => { if(isPodium) addAIVotes(); }, 1500);
        }
    }

    function addAIVotes() {
        const votes = [0,0,0,0];
        for(let i=0; i<25; i++) {
            if(Math.random() < 0.75) votes[localState.correctIndex]++;
            else votes[Math.floor(Math.random() * 4)]++;
        }
        if (docRef) window.updateDoc(docRef, { classVotes: votes }).catch(e=>{});
        else { localState.classVotes = votes; syncUI(); }
    }

    async function voteAnswer(optIdx) {
        if (!docRef || isPodium) return;
        try {
            const snap = await window.getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.votedUids.includes(mySafeUid)) return; 
                const newVotes = [...data.classVotes];
                newVotes[optIdx]++;
                const newUids = [...data.votedUids, mySafeUid];
                window.updateDoc(docRef, { classVotes: newVotes, votedUids: newUids }).catch(e=>{});
            }
        } catch(e) {}
    }

    function usePeek() {
        if (!isPodium || localState.cheats.peek.used) return;
        if (docRef) window.updateDoc(docRef, { "cheats.peek.used": true, "cheats.peek.active": true }).catch(e=>{});
        else { localState.cheats.peek.used = true; localState.cheats.peek.active = true; syncUI(); }
    }

    function closePeek() {
        if (!isPodium) return;
        if (docRef) window.updateDoc(docRef, { "cheats.peek.active": false }).catch(e=>{});
        else { localState.cheats.peek.active = false; syncUI(); }
    }

    async function useCopy() {
        if (!isPodium || localState.cheats.copy.used) return;
        const votes = localState.classVotes || [0,0,0,0];
        const maxVote = Math.max(...votes);
        const topIndex = votes.indexOf(maxVote);
        if (docRef) await window.updateDoc(docRef, { "cheats.copy.used": true }).catch(e=>{});
        else localState.cheats.copy.used = true;
        checkAnswer(topIndex);
    }

    async function checkAnswer(selectedIndex) {
        if (!isPodium) return;
        const isCorrect = (selectedIndex === localState.correctIndex);
        
        if (isCorrect) {
            showOverlay(`<h1 class="fw-bold display-1" style="color: var(--code-color); text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">CORRECT!</h1>`);
            setTimeout(() => {
                const newCompleted = [...localState.completedSubjects, localState.currentSubjectIndex];
                if (docRef) {
                    window.updateDoc(docRef, { activeQ: null, completedSubjects: newCompleted }).catch(e=>{});
                } else {
                    localState.activeQ = null;
                    localState.completedSubjects = newCompleted;
                    syncUI();
                }
                hideOverlay();
            }, 2500);
        } else {
            const saveCheat = localState.cheats.save;
            if (!saveCheat.used) {
                const votes = localState.classVotes || [0,0,0,0];
                const maxVote = Math.max(...votes);
                if (maxVote > 0 && votes.indexOf(maxVote) === localState.correctIndex) {
                    showOverlay(`
                        <h1 class="fw-bold display-4 mb-3" style="color: var(--file-name-color);">WRONG ANSWER!</h1>
                        <h3 class="text-white mb-4">But the majority of the Class got it right...</h3>
                        <h1 class="display-2 fw-bold" style="color: var(--code-color);">YOU ARE SAVED! 🛟</h1>
                    `);
                    setTimeout(() => {
                        const newCompleted = [...localState.completedSubjects, localState.currentSubjectIndex];
                        if (docRef) {
                            window.updateDoc(docRef, { activeQ: null, completedSubjects: newCompleted, "cheats.save.used": true }).catch(e=>{});
                        } else {
                            localState.activeQ = null;
                            localState.completedSubjects = newCompleted;
                            localState.cheats.save.used = true;
                            syncUI();
                        }
                        hideOverlay();
                    }, 4000);
                    return; 
                }
            }
            showOverlay(`
                <h1 class="fw-bold display-2 mb-3" style="color: var(--file-name-color); text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">INCORRECT!</h1>
                <h4 class="text-white mb-4">Correct Answer: <span style="color: var(--code-color);">${safeEscape(localState.activeOptions[localState.correctIndex])}</span></h4>
                <p class="text-light fs-5">Losing your spot at the podium...</p>
            `);
            setTimeout(() => {
                if (docRef) window.updateDoc(docRef, { activePlayerUid: null, activeQ: null }).catch(e=>{});
                else location.reload();
            }, 4000);
        }
    }

    function showWinner() {
        const container = document.getElementById('smarter-ui');
        container.innerHTML = `
            <div class='card shadow-lg text-center p-5 mt-4 rounded-4 w-100 mx-auto' style='max-width: 600px; background-color: var(--primary-color); border: 2px solid var(--tertiary-color);'>
                <h2 class='display-4 fw-bold mb-4' style="color: var(--code-color);">YOU WIN!</h2>
                <h3 class='mb-4' style="color: var(--secondary-color);">You ARE Smarter Than a Web Design Intern!</h3>
                <button class='btn btn-lg fw-bold mx-auto w-100 shadow-sm' style='max-width: 250px; background-color: var(--tertiary-color); color: white; border: none;' onclick='${roomID !== "solo" ? "window.Smarter.resetMultiplayer()" : "location.reload()"}'>Play Again</button>
            </div>`;
    }

    function resetMultiplayer() {
        if (roomID && roomID !== "solo" && dbRef && docRef) {
            const data = window.currentChapterData?.smarterData || window.currentChapterData?.millionaireData;
            const shuffledIndices = shuffleArray([...Array(Math.min(data.length, 10)).keys()]);
            window.updateDoc(docRef, { activePlayerUid: null, status: 'playing', completedSubjects: [], subjectOrder: shuffledIndices }).catch(e=>{});
        }
    }

    return { setup, showHowToPlay, leaveGame, pickSubject, checkAnswer, voteAnswer, usePeek, closePeek, useCopy, resetMultiplayer, addAIVotes, handleJoinForm };
})();