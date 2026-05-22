/**
 * review_games_logic.js - Master Universal Controller
 * Version 7.8: Restored Smarter setup & Regex fixes
 */

// Global state for engines
window.currentRoom = "solo"; 
window.globalPlayerName = ""; 

// ======================================================
// 1. GLOBAL MODALS
// ======================================================
window.GameModal = {
    createContainer: function() {
        let m = document.getElementById('game-modal-container');
        if (!m) {
            m = document.createElement('div');
            m.id = 'game-modal-container';
            m.className = "position-fixed top-0 start-0 w-100 h-100 d-none align-items-center justify-content-center";
            m.style.cssText = "z-index:40000; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); padding:20px;";
            document.body.appendChild(m);
        }
        return m;
    },
    alert: (msg) => new Promise(resolve => {
        const m = window.GameModal.createContainer();
        m.innerHTML = `<div class="card shadow-lg p-4 text-center bg-primary border-info rounded-4" style="max-width: 400px; width: 100%; border-width: 2px;"><p class="text-secondary fs-5 mb-4 fw-bold">${msg}</p><button class="btn btn-lg w-100 shadow-sm btn-j-primary text-white" id="game-modal-ok">OK</button></div>`;
        m.classList.remove('d-none'); m.classList.add('d-flex');
        document.getElementById('game-modal-ok').onclick = () => { m.classList.add('d-none'); m.classList.remove('d-flex'); resolve(); };
    }),
    confirm: (msg) => new Promise(resolve => {
        const m = window.GameModal.createContainer();
        m.innerHTML = `<div class="card shadow-lg p-4 text-center bg-primary border-info rounded-4" style="max-width: 400px; width: 100%; border-width: 2px;"><p class="text-secondary fs-5 mb-4 fw-bold">${msg}</p><div class="d-flex gap-3"><button class="btn btn-outline-light w-50 fw-bold rounded-pill" id="game-modal-cancel">Cancel</button><button class="btn btn-j-primary w-50 shadow-sm text-white fw-bold" id="game-modal-yes">Yes</button></div></div>`;
        m.classList.remove('d-none'); m.classList.add('d-flex');
        document.getElementById('game-modal-yes').onclick = () => { m.classList.add('d-none'); m.classList.remove('d-flex'); resolve(true); };
        document.getElementById('game-modal-cancel').onclick = () => { m.classList.add('d-none'); m.classList.remove('d-flex'); resolve(false); };
    }),
    prompt: (msg, placeholder, maxLen) => new Promise(resolve => {
        const m = window.GameModal.createContainer();
        const finalPlaceholder = (placeholder === "Team Name" || !placeholder) ? "Player Name" : placeholder;
        m.innerHTML = `
            <div class="card shadow-lg p-4 text-center bg-primary border-info rounded-4" style="max-width: 400px; width: 95%; border-width: 2px;">
                <p class="text-secondary fs-5 mb-3 fw-bold">${msg}</p>
                <input type="text" id="game-modal-input" maxlength="${maxLen}" class="form-control mb-4 text-center fs-4 fw-bold border-info text-primary" placeholder="${finalPlaceholder}">
                <div class="d-flex gap-3">
                    <button class="btn btn-outline-light w-50 fw-bold rounded-pill" id="game-modal-cancel">Cancel</button>
                    <button class="btn btn-j-primary w-50 shadow-sm text-white fw-bold" id="game-modal-submit">Submit</button>
                </div>
            </div>`;
        m.classList.remove('d-none'); m.classList.add('d-flex');
        const inp = document.getElementById('game-modal-input'); 
        inp.focus();
        const closePrompt = (val) => { m.classList.add('d-none'); m.classList.remove('d-flex'); resolve(val); };
        inp.onkeydown = (e) => { if (e.key === 'Enter') closePrompt(inp.value.trim()); };
        document.getElementById('game-modal-submit').onclick = () => closePrompt(inp.value.trim());
        document.getElementById('game-modal-cancel').onclick = () => closePrompt(null);
    })
};

// ======================================================
// 2. DASHBOARD NUKE & SHELL BUILDER
// ======================================================
function buildGameShells() {
    const dashboardRow = document.querySelector('#game-launcher .card-body > .row');
    if (dashboardRow && dashboardRow.children.length >= 2) {
        const modeCol = dashboardRow.children[0];
        const gamesCol = dashboardRow.children[1];

        modeCol.className = 'col-md-4 border-end border-primary border-opacity-25';
        gamesCol.className = 'col-md-8 text-center';

        const gameButtonWrappers = gamesCol.querySelectorAll('.row > div');
        gameButtonWrappers.forEach(wrapper => {
            wrapper.className = 'col px-1'; 
        });
    }

    const milContainer = document.getElementById('millionaire-ui');
    if (milContainer && milContainer.children.length === 0) {
        milContainer.innerHTML = `
            <div class="row">
               <div class="col-12">
                   <div class="card shadow-sm p-4 mb-4 bg-primary border-info rounded-4 text-center" style="border-width: 2px;">
                       <h4 id="mil-question" class="text-white fw-bold mb-0">Loading question...</h4>
                   </div>
                   <div class="d-flex justify-content-center gap-3 mb-4 flex-wrap">
                       <button class="btn btn-warning text-primary rounded-pill px-4 fw-bold shadow-sm mil-50">50:50</button>
                       <button class="btn btn-warning text-primary rounded-pill px-4 fw-bold shadow-sm mil-phone">Phone</button>
                       <button class="btn btn-warning text-primary rounded-pill px-4 fw-bold shadow-sm mil-aud">Audience</button>
                   </div>
                   <div class="row g-3" id="mil-answers"></div>
                   <div id="mill-feedback" class="mt-3 w-100"></div>
               </div>
               <div class="col-12 mt-4">
                   <ul class="d-flex flex-row flex-wrap justify-content-center p-0 gap-2" id="mil-ladder" style="list-style:none;">
                   </ul>
               </div>
           </div>
        `;
    }

    document.querySelectorAll('button').forEach(btn => {
        const txt = btn.innerText;
        if (txt.includes('Add Team')) btn.innerHTML = "👤 Add Player";
        if (txt.includes('Add CPU')) btn.innerHTML = "🤖 Play AI";
        if (txt.includes('Play as X')) btn.innerHTML = "❌ Join X";
        if (txt.includes('Play as O')) btn.innerHTML = "⭕ Join O";
    });
}

// ======================================================
// 3. MASTER LAUNCHER (Updated with Silent Leaving)
// ======================================================
window.setPlayMode = async function(mode) {
    const roomInput = document.getElementById('room-input');
    if (mode === 'solo') {
        if (await window.GameModal.confirm("Are you sure you want to leave the multiplayer room and switch to Solo mode?")) {
            // Clean up database spots silently before leaving the room completely
            if (window.Jeopardy) await window.Jeopardy.leaveGame(true);
            if (window.Hollywood) await window.Hollywood.leaveGame(true);
            if (window.Millionaire) await window.Millionaire.leaveGame(true);
            if (window.Smarter) await window.Smarter.leaveGame(true);

            const url = new URL(window.location);
            url.searchParams.delete('room');
            window.location.href = url.href; 
        }
    } else {
        const roomCode = roomInput.value.trim().toLowerCase();
        if (!roomCode) { window.GameModal.alert("Please enter a room code!"); return; }
        const url = new URL(window.location);
        url.searchParams.set('room', roomCode);
        window.location.href = url.href; 
    }
};

window.launchGame = async function(gameId) {
    // Silently leave all *other* games so the player doesn't hog spots in games they aren't looking at
    const engines = {
        'game-smarter': window.Smarter,
        'game-jeopardy': window.Jeopardy,
        'game-hollywood': window.Hollywood,
        'game-millionaire': window.Millionaire
    };
    
    for (const [id, engine] of Object.entries(engines)) {
        if (id !== gameId && engine && typeof engine.leaveGame === 'function') {
            try { await engine.leaveGame(true); } catch(e) { console.error("Cleanup error:", e); }
        }
    }

    const sections = ['game-smarter', 'game-jeopardy', 'game-hollywood', 'game-millionaire'];
    sections.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('d-none'); });
    const target = document.getElementById(gameId);
    if (target) {
        target.classList.remove('d-none');
        target.scrollIntoView({ behavior: 'smooth' });
        window.dispatchEvent(new Event('resize'));
        buildGameShells();
        if (gameId === 'game-millionaire' && window.Millionaire) window.Millionaire.renderUI();
    }
};

/**
 * review_games_logic.js - Master Universal Controller
 * Version 7.9: Added Named App fix to prevent Auth collisions
 */

// Global state for engines
window.currentRoom = "solo"; 
window.globalPlayerName = ""; 

// ... [Sections 1, 2, and 3 remain unchanged] ...

// ======================================================
// 4. DATA FETCH & INITIALIZATION
// ======================================================
const firebaseConfig = {
  apiKey: "AIzaSyAK1sGWu6jyWzbxfQCj-cgUBn85mJh9Nv0",
  authDomain: "digitalartsclasses-games-67ae7.firebaseapp.com",
  projectId: "digitalartsclasses-games-67ae7",
  storageBucket: "digitalartsclasses-games-67ae7.firebasestorage.app",
  messagingSenderId: "662051088920",
  appId: "1:662051088920:web:3b05cb890d834c0b9cb16d",
  measurementId: "G-LZ4CXH6X3G"
};

async function loadGameDataFromFirestore() {
    try {
        const appMod = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
        const authMod = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
        const dbMod = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        
        window.doc = dbMod.doc;
        window.getDoc = dbMod.getDoc;
        window.setDoc = dbMod.setDoc;
        window.updateDoc = dbMod.updateDoc;
        window.onSnapshot = dbMod.onSnapshot;
        window.collection = dbMod.collection;
        window.getDocs = dbMod.getDocs;

        // --- THE FIX: Initialize as a NAMED APP so it doesn't collide with the main site ---
        let app;
        try {
            app = appMod.getApp("gamesApp");
        } catch (e) {
            app = appMod.initializeApp(firebaseConfig, "gamesApp");
        }

        const db = dbMod.getFirestore(app);
        const auth = authMod.getAuth(app);
        
        // Sign in anonymously ONLY for the games project
        const userCredential = await authMod.signInAnonymously(auth);
        window.currentUser = userCredential.user;

        const snap = await dbMod.getDocs(dbMod.collection(db, 'artifacts', firebaseConfig.appId, 'public', 'data', 'questions'));
        let allQs = snap.docs.map(doc => doc.data());

        const path = window.location.pathname.toLowerCase();
        let targetFilter = "Chapter 1"; 
        if (path.includes('web1review')) targetFilter = "Year 1 Review";
        else if (path.includes('web2review')) targetFilter = "Year 2 Review";
        else if (path.includes('webreview')) targetFilter = "Ultimate Review";
        else {
            const chapterMatch = document.title.match(/Chapter\s*\d+/i);
            if (chapterMatch) {
                targetFilter = chapterMatch[0];
            }
        }

        let activeQs = [];
        
        if (targetFilter === "Ultimate Review") {
            activeQs = allQs;
        } else if (targetFilter === "Year 1 Review") {
            activeQs = allQs.filter(q => q.grade === "Web Design 1");
        } else if (targetFilter === "Year 2 Review") {
            activeQs = allQs.filter(q => q.grade === "Web Design 2");
        } else {
            const chapRegex = new RegExp('\\b' + targetFilter.replace(/\s+/g, '\\s*') + '\\b', 'i');
            activeQs = allQs.filter(q => q.chapter && chapRegex.test(q.chapter));
        }

        if (activeQs.length === 0) return;

        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
        const allCats = [...new Set(activeQs.map(q => q.cat))];
        const selectedCats = shuffle(allCats).slice(0, 5);

        const mappedJeopardy = {};
        selectedCats.forEach(cat => {
            mappedJeopardy[cat] = { 100: [], 200: [], 300: [], 400: [], 500: [] };
            const catQs = activeQs.filter(q => q.cat === cat);
            [100, 200, 300, 400, 500].forEach(val => {
                shuffle(catQs.filter(q => q.val == val)).forEach(qItem => mappedJeopardy[cat][val].push({ q: qItem.q, a: qItem.a }));
            });
        });

        window.currentChapterData = {
            chapterTitle: targetFilter, jeopardyData: mappedJeopardy,
            hollywoodData: shuffle(activeQs).map(i => ({ question: i.q, answer: i.a, lie: i.d[0] })),
            millionaireData: shuffle(activeQs).map(i => ({ category: i.cat, question: i.q, options: shuffle([i.a, ...i.d]), answer: i.a })),
            vocabList: activeQs.map(item => ({ word: item.a.toUpperCase().replace(/[^A-Z]/g, ''), clue: item.q }))
        };

        buildGameShells();
        window.currentRoom = (new URLSearchParams(window.location.search)).get('room') || 'solo';
        
        if (window.Jeopardy) window.Jeopardy.setup(db, firebaseConfig.appId, window.currentRoom);
        if (window.Hollywood) window.Hollywood.setup(db, firebaseConfig.appId, window.currentRoom);
        if (window.Millionaire) window.Millionaire.setup(db, firebaseConfig.appId, window.currentRoom);
        if (window.Smarter) window.Smarter.setup(db, firebaseConfig.appId, window.currentRoom);
        if (window.WordGames) window.WordGames.setup();

        if (document.getElementById('word-games')) document.getElementById('word-games').classList.remove('d-none');
        if (document.getElementById('dynamic-title')) document.getElementById('dynamic-title').textContent = document.title;

    } catch (err) { console.error("Setup Failed:", err); }
}

loadGameDataFromFirestore();