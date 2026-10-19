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

    const sections = ['game-smarter', 'game-jeopardy', 'game-hollywood', 'game-millionaire', ...((window.CoopGames && window.CoopGames.sectionIds) || [])];
    sections.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('d-none'); });
    const target = document.getElementById(gameId);
    if (target) {
        target.classList.remove('d-none');
        target.scrollIntoView({ behavior: 'smooth' });
        window.dispatchEvent(new Event('resize'));
        buildGameShells();
        if (gameId === 'game-millionaire' && window.Millionaire) window.Millionaire.renderUI();
    }
    // Team Jeopardy / Boss Battle / Wordle (js/games/coop-games.js)
    if (window.CoopGames) window.CoopGames.onLaunch(gameId);
};

// ======================================================
// 4. DATA FETCH & INITIALIZATION (MariaDB / local pool)
// ======================================================

async function loadGameDataFromPool() {
    try {
        // Determine chapter filter from URL path or page title
        const rawPath = window.location.pathname;
        const path = rawPath.toLowerCase();
        let targetFilter = "chapter-1";
        if (path.includes('web1review')) targetFilter = "Year 1 Review";
        else if (path.includes('web2review')) targetFilter = "Year 2 Review";
        else if (path.includes('webreview')) targetFilter = "Ultimate Review";
        else if (path.includes('csreviewgames')) targetFilter = "CS Review";
        else if (/csunit([1-7])review/.test(path)) targetFilter = `CS Unit ${path.match(/csunit([1-7])review/)[1]}`;
        else {
            // WD1, WD2, and CS each restart their own "Chapter N" numbering
            // independently (and some page titles are stale leftovers from a
            // since-restructured curriculum), so two or three unrelated
            // chapters can share the exact same "Chapter 3" title text. The
            // page's own filename is already unique across the whole site,
            // so use that as the lookup key instead of the title.
            const slugMatch = rawPath.match(/\/([^\/]+)\.html?$/i);
            if (slugMatch) targetFilter = slugMatch[1];
        }

        let activeQs = [];
        let vocabTerms = [];

        // Try MariaDB API first
        try {
            const res = await fetch(`/api/review-questions?chapter=${encodeURIComponent(targetFilter)}`);
            if (res.ok) {
                const data = await res.json();
                activeQs = data.questions || [];
            }
        } catch (e) {
            console.warn("Review questions API unavailable, falling back to local pool.");
        }

        // Dedicated vocab bank for word search/crossword -- separate from the
        // quiz question pool above (see server/routes/assessments.js's
        // /vocab-terms route for why).
        try {
            const vocabRes = await fetch(`/api/vocab-terms?chapter=${encodeURIComponent(targetFilter)}`);
            if (vocabRes.ok) {
                const vocabData = await vocabRes.json();
                vocabTerms = vocabData.terms || [];
            }
        } catch (e) {
            console.warn("Vocab terms API unavailable.");
        }

        // Fall back to local migrationPool if DB returned nothing
        if (activeQs.length === 0) {
            const allQs = window.migrationPool || [];
            if (targetFilter === "Ultimate Review") {
                activeQs = allQs;
            } else if (targetFilter === "Year 1 Review") {
                activeQs = allQs.filter(q => q.grade === "Web Design 1");
            } else if (targetFilter === "Year 2 Review") {
                activeQs = allQs.filter(q => q.grade === "Web Design 2");
            } else if (targetFilter === "CS Review") {
                // No local fallback pool exists for CS (js/data/*.js only ever
                // populated window.migrationPool with WD content) -- CS review
                // content lives in the database only, seeded from the real CS
                // exam question bank.
                activeQs = allQs.filter(q => q.grade === "Computer Science");
            } else {
                const chapRegex = new RegExp('\\b' + targetFilter.replace(/\s+/g, '\\s*') + '\\b', 'i');
                activeQs = allQs.filter(q => q.chapter && chapRegex.test(q.chapter));
            }
        }

        if (activeQs.length === 0) {
            console.warn("No questions found for filter:", targetFilter);
            return;
        }

        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
        // Only categories with at least one point-value-tagged question are
        // eligible for the board -- a category with none would still get
        // picked here (every distinct `cat` in activeQs, jeopardy-ready or
        // not, used to qualify) and render as a fully empty column with no
        // clickable tiles at all.
        const jeopardyReady = activeQs.filter(q => q.val !== null && q.val !== undefined && q.val !== '');
        const allCats = [...new Set(jeopardyReady.map(q => q.cat))];
        const selectedCats = shuffle(allCats).slice(0, 5);

        const mappedJeopardy = {};
        selectedCats.forEach(cat => {
            mappedJeopardy[cat] = { 100: [], 200: [], 300: [], 400: [], 500: [] };
            const catQs = activeQs.filter(q => q.cat === cat);
            [100, 200, 300, 400, 500].forEach(val => {
                shuffle(catQs.filter(q => q.val == val)).forEach(qItem => mappedJeopardy[cat][val].push({ q: qItem.q, a: qItem.a }));
            });
        });

        // Every game plays from the SAME question set (activeQs); only the
        // format differs. Many questions (most of the CS bank) were written in
        // Jeopardy clue format with no wrong answers, which Millionaire,
        // Smarter, and Hollywood Squares need -- those used to skip such
        // questions entirely (18 of 90 in most CS chapters, so the same few
        // kept repeating). Questions missing wrong answers now borrow them
        // from other questions' real answers, same category first, closest
        // in length so the right answer doesn't stand out by being longer.
        const answerPool = activeQs.filter(q => q.a && String(q.a).trim());
        const withDistractors = (q) => {
            const own = Array.isArray(q.d) ? q.d.filter(x => x && String(x).trim() && x !== q.a) : [];
            if (own.length >= 3) return own;
            const taken = new Set([String(q.a).trim().toLowerCase(), ...own.map(x => String(x).trim().toLowerCase())]);
            const len = String(q.a).length;
            const byCloseness = (list) => shuffle(list)
                .map(o => String(o.a).trim())
                .filter(a => !taken.has(a.toLowerCase()))
                .sort((x, y) => Math.abs(x.length - len) - Math.abs(y.length - len));
            const picks = [...own];
            for (const a of [...byCloseness(answerPool.filter(o => o.cat === q.cat)), ...byCloseness(answerPool)]) {
                if (picks.length >= 3) break;
                if (taken.has(a.toLowerCase())) continue;
                taken.add(a.toLowerCase());
                picks.push(a);
            }
            return picks;
        };
        const mcReady = answerPool
            .map(q => ({ ...q, d: withDistractors(q) }))
            .filter(q => q.d.length >= 3);

        window.currentChapterData = {
            chapterTitle: targetFilter,
            jeopardyData: mappedJeopardy,
            hollywoodData: shuffle(mcReady).map(i => ({ question: i.q, answer: i.a, lie: i.d[0] })),
            millionaireData: shuffle(mcReady).map(i => ({ category: i.cat, question: i.q, options: shuffle([i.a, ...i.d]), answer: i.a })),
            vocabList: vocabTerms.map(item => ({ word: item.term.toUpperCase().replace(/[^A-Z]/g, ''), clue: item.clue }))
        };

        buildGameShells();
        window.currentRoom = (new URLSearchParams(window.location.search)).get('room') || 'solo';

        // db/appId are meaningless now (no real Firestore instance exists --
        // see js/games/firestore-shim.js), but every engine's ENTIRE
        // multiplayer branch is gated behind `roomID && roomID !== "solo"
        // && dbRef`, so passing null here (as this used to) made "join
        // room" a complete no-op regardless of what room code was typed in.
        // A truthy placeholder is all that's actually needed -- the engines
        // never read db/appId for anything except building the shim's
        // opaque room-path string.
        const dbPlaceholder = {};
        const appIdPlaceholder = 'chs-review-games';
        if (window.Jeopardy)    window.Jeopardy.setup(dbPlaceholder, appIdPlaceholder, window.currentRoom);
        if (window.Hollywood)   window.Hollywood.setup(dbPlaceholder, appIdPlaceholder, window.currentRoom);
        if (window.Millionaire) window.Millionaire.setup(dbPlaceholder, appIdPlaceholder, window.currentRoom);
        if (window.Smarter)     window.Smarter.setup(dbPlaceholder, appIdPlaceholder, window.currentRoom);
        if (window.WordGames)   window.WordGames.setup();

        // Team Jeopardy, Boss Battle, and Wordle add their own launcher
        // buttons once the questions above are ready.
        if (!document.getElementById('coop-games-script')) {
            const coopScript = document.createElement('script');
            coopScript.id = 'coop-games-script';
            coopScript.src = '/js/games/coop-games.js?v=1';
            document.body.appendChild(coopScript);
        }

        // Room chat only exists in multiplayer rooms (js/games/game-chat.js).
        if (window.currentRoom && window.currentRoom !== 'solo' && !document.getElementById('game-chat-script')) {
            const chatScript = document.createElement('script');
            chatScript.id = 'game-chat-script';
            chatScript.src = '/js/games/game-chat.js?v=1';
            document.body.appendChild(chatScript);
        }

        if (document.getElementById('word-games')) document.getElementById('word-games').classList.remove('d-none');
        if (document.getElementById('dynamic-title')) document.getElementById('dynamic-title').textContent = document.title;

    } catch (err) { console.error("Game setup failed:", err); }
}

// Wait for data files to populate migrationPool, then initialize games
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGameDataFromPool);
} else {
    loadGameDataFromPool();
}