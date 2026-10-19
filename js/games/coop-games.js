/**
 * coop-games.js -- three extra review games, added to every review page by
 * review_games_logic.js once the chapter's questions are loaded:
 *
 *   Team Jeopardy  (co-op) the whole room is one team against the board.
 *                  Anyone picks a square, everyone votes, majority locks in.
 *   Boss Battle    (co-op) everyone answers their own questions; right answers
 *                  damage a shared boss, wrong answers cost a team heart.
 *   Wordle         (solo)  guess the chapter's vocab word in 6 tries.
 *
 * All three use the same question set as the other games
 * (window.currentChapterData). In Solo mode the co-op games run entirely in
 * the browser; in a room they share one state blob through /api/game-room,
 * using its `increments` and `ifMatch` options so simultaneous answers from
 * several students all count and each question resolves exactly once.
 */
(function () {
    if (window.CoopGames) return;

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
    const ROOM = window.currentRoom || 'solo';
    const IN_ROOM = ROOM !== 'solo';
    const ME = { uid: String((window.currentUser && window.currentUser.uid) || 'me').replace(/\./g, '_'), name: 'You' };
    const data = () => window.currentChapterData || {};
    const chapterKey = () => (data().chapterTitle || 'General').replace(/[^a-zA-Z0-9]/g, '');

    // ---------------------------------------------------------------- stores
    function getDot(state, key) {
        return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), state);
    }
    function setDot(state, key, value) {
        const parts = key.split('.');
        let o = state;
        for (let i = 0; i < parts.length - 1; i++) {
            if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {};
            o = o[parts[i]];
        }
        o[parts[parts.length - 1]] = value;
    }

    // Solo: same API, same semantics as the server, all in memory.
    function localStore() {
        let state = null, listeners = [];
        const notify = () => setTimeout(() => listeners.forEach(fn => fn(clone(state))), 0);
        return {
            async get() { return clone(state); },
            async set(d) { state = clone(d); notify(); },
            async patch(updates, opts = {}) {
                if (!state) state = {};
                if (opts.ifMatch && !Object.entries(opts.ifMatch).every(([k, v]) => (getDot(state, k) ?? null) === v)) return false;
                Object.entries(updates || {}).forEach(([k, v]) => setDot(state, k, clone(v)));
                Object.entries(opts.increments || {}).forEach(([k, n]) => setDot(state, k, (Number(getDot(state, k)) || 0) + n));
                notify();
                return true;
            },
            subscribe(fn) { listeners.push(fn); notify(); },
            stop() { listeners = []; }
        };
    }

    // Room: polls /api/game-room; any write triggers an immediate re-poll.
    function roomStore(kind) {
        const path = `artifacts/chs-review-games/public/data/${kind}/${chapterKey()}_${ROOM}`;
        let listeners = [], last, timer = null, stopped = true, inflight = false, again = false;
        async function fetchState() {
            const r = await fetch(`/api/game-room?path=${encodeURIComponent(path)}`);
            const b = r.ok ? await r.json() : { exists: false };
            return b.exists ? b.data : null;
        }
        async function poll() {
            if (stopped) return;
            if (inflight) { again = true; return; }
            inflight = true;
            clearTimeout(timer);
            try {
                const st = await fetchState();
                const j = JSON.stringify(st);
                if (j !== last) { last = j; listeners.forEach(fn => fn(clone(st))); }
            } catch (e) { /* next poll retries */ }
            inflight = false;
            if (stopped) return;
            if (again) { again = false; poll(); return; }
            timer = setTimeout(poll, 1000);
        }
        const send = (method, body) => fetch('/api/game-room', {
            method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, ...body })
        });
        return {
            get: fetchState,
            async set(d) { await send('POST', { data: d }); poll(); },
            async patch(updates, opts = {}) {
                try {
                    const r = await send('PATCH', { updates: updates || {}, ifMatch: opts.ifMatch, increments: opts.increments });
                    const b = r.ok ? await r.json() : { applied: false };
                    poll();
                    return r.ok && b.applied !== false;
                } catch (e) { return false; }
            },
            subscribe(fn) { listeners.push(fn); if (stopped) { stopped = false; poll(); } },
            stop() { stopped = true; clearTimeout(timer); listeners = []; last = undefined; }
        };
    }

    async function ensureName() {
        if (!IN_ROOM) { ME.name = 'You'; return; }
        if (window.globalPlayerName) { ME.name = window.globalPlayerName; return; }
        const n = window.GameModal ? await window.GameModal.prompt('Enter your name for the co-op games:', 'Player Name', 15) : null;
        ME.name = (n && n.trim()) || ('Player ' + Math.floor(Math.random() * 100));
        window.globalPlayerName = ME.name;
    }

    function presentPlayers(state) {
        if (!IN_ROOM) return [{ uid: ME.uid, name: ME.name }];
        const now = Date.now();
        const list = Object.entries((state && state.players) || {})
            .filter(([, p]) => p && now - p.t < 15000)
            .map(([uid, p]) => ({ uid, name: p.name }));
        if (!list.some(p => p.uid === ME.uid)) list.push({ uid: ME.uid, name: ME.name });
        return list;
    }

    function startHeartbeat(store) {
        if (!IN_ROOM) return null;
        const beat = () => store.patch({ [`players.${ME.uid}`]: { name: ME.name, t: Date.now() } });
        beat();
        return setInterval(beat, 5000);
    }

    // Multiple-choice version of a question: the real answer plus 3 others.
    function mcOptions(question, answer) {
        const md = data().millionaireData || [];
        const hit = md.find(m => m.question === question);
        const others = hit ? hit.options.filter(o => o !== answer)
            : md.map(m => m.answer).filter(a => a && a !== answer);
        return shuffle([answer, ...shuffle([...new Set(others)]).slice(0, 3)]);
    }

    // ------------------------------------------------------------ styles/UI
    const style = document.createElement('style');
    style.textContent = `
      .coop-bar { height: 22px; border-radius: 999px; background: #e9ecef; overflow: hidden; }
      .coop-bar > div { height: 100%; transition: width .4s ease; }
      .coop-chip { display: inline-block; padding: .15rem .6rem; border-radius: 999px; background: #e7f1ff; color: #0b3d91; font-weight: 700; font-size: .85rem; margin: .15rem; }
      .tj-board { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 6px; }
      .tj-board th { background: var(--primary-color, #0d6efd); color: #fff; padding: .6rem .3rem; border-radius: .5rem; font-size: .85rem; text-align: center; vertical-align: middle; }
      .tj-tile { width: 100%; min-height: 64px; border: none; border-radius: .5rem; font-size: 1.4rem; font-weight: 800;
        background: var(--primary-color, #0d6efd); color: #ffc107; }
      .tj-tile:disabled { opacity: .55; }
      .tj-tile.right { background: #198754; color: #fff; font-size: 1.1rem; }
      .tj-tile.wrong { background: #6c757d; color: #fff; font-size: 1.1rem; }
      .coop-option { width: 100%; text-align: left; font-weight: 700; border-radius: .7rem; padding: .8rem 1rem; border: 3px solid #ced4da; background: #fff; color: #212529; }
      .coop-option:hover:not(:disabled) { border-color: var(--primary-color, #0d6efd); }
      .coop-option.mine { border-color: var(--primary-color, #0d6efd); background: #e7f1ff; }
      .coop-option.correct { border-color: #198754; background: #d1f2e0; }
      .coop-option.wrongpick { border-color: #dc3545; background: #fde0de; }
      .coop-votes { font-size: .78rem; color: #6c757d; font-weight: 700; }
      .boss-emoji { font-size: 5rem; line-height: 1; display: inline-block; }
      .boss-emoji.hit { animation: bossShake .35s; }
      @keyframes bossShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-10px) rotate(-6deg); } 75% { transform: translateX(10px) rotate(6deg); } }
      .wd-grid { display: grid; gap: 6px; justify-content: center; margin: 0 auto 1rem; }
      .wd-cell { width: 48px; height: 48px; border: 2px solid #ced4da; border-radius: 6px; display: flex; align-items: center; justify-content: center;
        font-size: 1.5rem; font-weight: 800; text-transform: uppercase; background: #fff; color: #212529; }
      .wd-cell.filled { border-color: #6c757d; }
      .wd-cell.g, .wd-key.g { background: #198754; border-color: #198754; color: #fff; }
      .wd-cell.y, .wd-key.y { background: #e0a800; border-color: #e0a800; color: #fff; }
      .wd-cell.x, .wd-key.x { background: #6c757d; border-color: #6c757d; color: #fff; }
      .wd-keys { max-width: 560px; margin: 0 auto; }
      .wd-row { display: flex; justify-content: center; gap: 5px; margin-bottom: 6px; }
      .wd-key { min-width: 36px; height: 50px; border: none; border-radius: 6px; background: #dee2e6; font-weight: 800; color: #212529; padding: 0 .5rem; }
      @media (max-width: 576px) { .wd-cell { width: 38px; height: 38px; font-size: 1.15rem; } .wd-key { min-width: 28px; } }
    `;
    document.head.appendChild(style);

    const SECTIONS = [
        { id: 'game-coop-jeopardy', icon: '🤝', label: 'Team Jeopardy', title: 'Team Jeopardy (Co-op)' },
        { id: 'game-boss', icon: '🐉', label: 'Boss Battle', title: 'Boss Battle (Co-op)' },
        { id: 'game-wordle', icon: '🟩', label: 'Wordle', title: 'Vocab Wordle' }
    ];

    function injectUI() {
        const gamesCol = document.querySelector('#game-launcher .card-body > .row > div:nth-child(2)');
        if (gamesCol && !document.getElementById('coop-launch-row')) {
            const row = document.createElement('div');
            row.id = 'coop-launch-row';
            row.className = 'row g-2 justify-content-center mt-1';
            row.innerHTML = SECTIONS.map(s => `<div class="col px-1"><button onclick="launchGame('${s.id}')" class="btn btn-outline-primary w-100 py-3 bg-white shadow-sm h-100">${s.icon}<br>${s.label}</button></div>`).join('');
            gamesCol.appendChild(row);
        }
        const root = document.getElementById('game-container-root');
        if (root && !document.getElementById('game-wordle')) {
            const html = SECTIONS.map(s => `
              <section id="${s.id}" class="game-section d-none mb-5 shadow-sm rounded-4 bg-white p-4">
                <h2 class="game-title text-site-secondary mb-3 text-center">${s.title}</h2>
                <div id="${s.id}-ui"></div>
              </section>`).join('');
            root.insertAdjacentHTML('afterbegin', html);
        }
    }

    // ======================================================= TEAM JEOPARDY
    const TeamJeopardy = (() => {
        const VOTE_SECONDS = 25;
        let store = null, state = null, hb = null, tick = null, resolving = false, clearing = null;
        const ui = () => document.getElementById('game-coop-jeopardy-ui');

        function buildBoard() {
            const jd = data().jeopardyData || {};
            const cats = Object.keys(jd).slice(0, 5);
            const tiles = {};
            cats.forEach((cat, ci) => [100, 200, 300, 400, 500].forEach(val => {
                const item = ((jd[cat] || {})[val] || [])[0];
                if (!item) return;
                tiles[`${ci}-${val}`] = { cat, val, q: item.q, answer: item.a, options: mcOptions(item.q, item.a) };
            }));
            const total = Object.values(tiles).reduce((s, t) => s + t.val, 0);
            return { cats, tiles, target: Math.round((total * 0.6) / 100) * 100 };
        }
        function fresh(players) {
            return { board: buildBoard(), used: {}, score: 0, active: null, players: players || {}, round: Date.now() };
        }

        async function open() {
            await ensureName();
            store = IN_ROOM ? roomStore('coopJeopardy') : localStore();
            const existing = IN_ROOM ? await store.get() : null;
            if (!existing || !existing.board || !Object.keys(existing.board.tiles || {}).length) await store.set(fresh(existing && existing.players));
            store.subscribe(st => { state = st; render(); afterUpdate(); });
            hb = startHeartbeat(store);
            tick = setInterval(() => { updateTimer(); maybeResolve(); }, 1000);
        }
        function close() {
            if (store) store.stop();
            clearInterval(hb); clearInterval(tick); clearTimeout(clearing);
            store = null; state = null; clearing = null; resolving = false;
        }

        function pick(key) {
            if (!state || state.active || (state.used || {})[key]) return;
            store.patch({ active: { id: key, opened: Date.now(), resolved: false, votes: {}, by: ME.name } }, { ifMatch: { active: null } });
        }
        function vote(i) {
            const a = state && state.active;
            if (!a || a.resolved) return;
            store.patch({ [`active.votes.${ME.uid}`]: i }, { ifMatch: { 'active.id': a.id, 'active.resolved': false } });
        }

        async function maybeResolve() {
            const a = state && state.active;
            if (!a || a.resolved || resolving) return;
            const votes = a.votes || {};
            const present = presentPlayers(state);
            const allIn = present.length > 0 && present.every(p => votes[p.uid] !== undefined);
            const timeUp = Date.now() - a.opened > VOTE_SECONDS * 1000;
            if (!allIn && !timeUp) return;
            const tile = state.board.tiles[a.id];
            const counts = {};
            Object.values(votes).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
            let chosen = -1, best = 0;
            Object.entries(counts).forEach(([v, c]) => { if (c > best) { best = c; chosen = Number(v); } });
            const correct = chosen >= 0 && tile.options[chosen] === tile.answer;
            resolving = true;
            await store.patch(
                { 'active.resolved': true, 'active.chosen': chosen, 'active.correct': correct, [`used.${a.id}`]: correct ? 'right' : 'wrong' },
                { ifMatch: { 'active.id': a.id, 'active.resolved': false }, increments: correct ? { score: tile.val } : undefined }
            );
            resolving = false;
        }

        function afterUpdate() {
            const a = state && state.active;
            if (a && a.resolved && clearing === null) {
                const id = a.id;
                clearing = setTimeout(async () => {
                    await store.patch({ active: null }, { ifMatch: { 'active.id': id, 'active.resolved': true } });
                    clearing = null;
                }, 4500);
            }
        }

        function updateTimer() {
            const el = document.getElementById('tj-timer');
            const a = state && state.active;
            if (!el || !a || a.resolved) return;
            el.textContent = `${Math.max(0, Math.ceil(VOTE_SECONDS - (Date.now() - a.opened) / 1000))}s`;
        }

        function render() {
            const box = ui();
            if (!box || !state || !state.board) return;
            const { board } = state;
            const used = state.used || {};
            const tileCount = Object.keys(board.tiles).length;
            const done = Object.keys(used).length >= tileCount && !state.active;
            const pct = Math.min(100, Math.round(((state.score || 0) / Math.max(1, board.target)) * 100));
            const players = presentPlayers(state);
            let html = `
              <p class="text-center text-muted mb-2">Everyone is on <strong>one team</strong>. Anyone can pick a square, then <strong>everyone votes</strong>. The answer with the most votes locks in when everyone has voted or time runs out. Beat the target score!</p>
              <div class="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-1">
                <div class="fs-4 fw-bold">Team score: $${(state.score || 0).toLocaleString()}</div>
                <div class="fw-bold text-muted">Target: $${board.target.toLocaleString()}</div>
              </div>
              <div class="coop-bar mb-2"><div style="width:${pct}%;background:${pct >= 100 ? '#198754' : 'var(--primary-color, #0d6efd)'}"></div></div>
              <div class="mb-3">${IN_ROOM ? players.map(p => `<span class="coop-chip">${esc(p.name)}</span>`).join('') : ''}</div>`;

            if (done) {
                const won = (state.score || 0) >= board.target;
                html += `<div class="alert ${won ? 'alert-success' : 'alert-warning'} text-center fs-5 fw-bold">${won ? '🏆 Your team beat the target!' : '😅 So close! The team didn\'t reach the target this time.'}
                    <div class="mt-2"><button class="btn btn-primary fw-bold" data-tj="new">Play a new board</button></div></div>`;
            }

            const a = state.active;
            if (a && board.tiles[a.id]) {
                const t = board.tiles[a.id];
                const votes = a.votes || {};
                const myVote = votes[ME.uid];
                const voteCount = Object.keys(votes).length;
                html += `<div class="card border-primary border-3 rounded-4 shadow mb-3"><div class="card-body p-4">
                    <div class="d-flex justify-content-between fw-bold mb-2"><span>${esc(t.cat)} · $${t.val}</span>
                    <span>${a.resolved ? '' : `⏳ <span id="tj-timer"></span>`}</span></div>
                    <h4 class="fw-bold mb-3">${esc(t.q)}</h4>
                    <div class="row g-2">${t.options.map((o, i) => {
                        const n = Object.values(votes).filter(v => v === i).length;
                        let cls = '';
                        if (a.resolved) { if (o === t.answer) cls = 'correct'; else if (i === a.chosen) cls = 'wrongpick'; }
                        else if (myVote === i) cls = 'mine';
                        return `<div class="col-md-6"><button class="coop-option ${cls}" data-tj-vote="${i}" ${a.resolved ? 'disabled' : ''}>${esc(o)}
                            ${IN_ROOM && n ? `<div class="coop-votes">${n} vote${n === 1 ? '' : 's'}</div>` : ''}</button></div>`;
                    }).join('')}</div>
                    <div class="mt-3 fw-bold text-center">${a.resolved
                        ? (a.correct ? `<span class="text-success fs-5">✅ Correct! +$${t.val}</span>` : `<span class="text-danger fs-5">❌ ${a.chosen < 0 ? 'Time ran out.' : 'Not quite.'} The answer: ${esc(t.answer)}</span>`)
                        : (IN_ROOM ? `${voteCount} of ${players.length} voted · picked by ${esc(a.by)}` : 'Pick your answer')}</div>
                  </div></div>`;
            }

            html += `<div class="table-responsive"><table class="tj-board"><thead><tr>${board.cats.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>`;
            [100, 200, 300, 400, 500].forEach(val => {
                html += '<tr>' + board.cats.map((c, ci) => {
                    const key = `${ci}-${val}`;
                    if (!board.tiles[key]) return '<td></td>';
                    const u = used[key];
                    if (u) return `<td><button class="tj-tile ${u}" disabled>${u === 'right' ? '✓' : '✗'}</button></td>`;
                    return `<td><button class="tj-tile" data-tj-pick="${key}" ${state.active ? 'disabled' : ''}>$${val}</button></td>`;
                }).join('') + '</tr>';
            });
            html += '</tbody></table></div>';
            if (!done) html += `<div class="text-center mt-3"><button class="btn btn-outline-danger btn-sm" data-tj="new">Start a new board</button></div>`;
            box.innerHTML = html;
            updateTimer();
        }

        document.addEventListener('click', async (e) => {
            const p = e.target.closest('[data-tj-pick]');
            if (p) return pick(p.dataset.tjPick);
            const v = e.target.closest('[data-tj-vote]');
            if (v) return vote(Number(v.dataset.tjVote));
            const n = e.target.closest('[data-tj="new"]');
            if (n && store) {
                if (state && Object.keys(state.used || {}).length && !(await window.GameModal.confirm('Start a new board for the whole team?'))) return;
                store.set(fresh(state && state.players));
            }
        });

        return { open, close };
    })();

    // ========================================================= BOSS BATTLE
    const BossBattle = (() => {
        const BOSSES = [
            { name: 'The Bug King', emoji: '🐛' }, { name: 'The Syntax Dragon', emoji: '🐉' },
            { name: 'The Lag Monster', emoji: '👾' }, { name: 'Captain Null', emoji: '👻' },
            { name: 'The Spam Kraken', emoji: '🐙' }, { name: 'The Firewall Golem', emoji: '🗿' }
        ];
        let store = null, state = null, hb = null, deck = [], current = null, streak = 0, answered = null, lastRound = null, lastBossHp = null, advanceTimer = null;
        const ui = () => document.getElementById('game-boss-ui');

        function fresh(players) {
            return { status: 'lobby', players: players || {}, hits: {}, misses: {}, bossHp: 0, bossMax: 0, teamHp: 0, teamMax: 0, boss: null, round: Date.now() };
        }
        async function open() {
            await ensureName();
            store = IN_ROOM ? roomStore('bossBattle') : localStore();
            const existing = IN_ROOM ? await store.get() : null;
            if (!existing || !existing.status) await store.set(fresh(existing && existing.players));
            store.subscribe(st => { onState(st); });
            hb = startHeartbeat(store);
        }
        function close() {
            if (store) store.stop();
            clearInterval(hb); clearTimeout(advanceTimer);
            store = null; state = null;
        }

        function nextQuestion() {
            if (!deck.length) deck = shuffle(data().millionaireData || []);
            const q = deck.shift();
            current = q ? { q: q.question, answer: q.answer, options: mcOptions(q.question, q.answer) } : null;
            answered = null;
        }

        function onState(st) {
            const prevHp = lastBossHp;
            state = st;
            if (!state) return;
            if (state.round !== lastRound) { lastRound = state.round; streak = 0; deck = []; nextQuestion(); }
            lastBossHp = state.bossHp;
            if (state.status === 'fight') {
                if (state.bossHp <= 0) store.patch({ status: 'won' }, { ifMatch: { status: 'fight' } });
                else if (state.teamHp <= 0) store.patch({ status: 'lost' }, { ifMatch: { status: 'fight' } });
            }
            render(prevHp !== null && state.bossHp < prevHp);
        }

        function start() {
            const n = presentPlayers(state).length;
            const bossMax = Math.max(15, 12 * n);
            const teamMax = 3 + 2 * n;
            const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
            store.patch({ status: 'fight', bossHp: bossMax, bossMax, teamHp: teamMax, teamMax, hits: {}, misses: {}, boss, round: Date.now() }, { ifMatch: { status: 'lobby' } });
        }

        async function answer(i) {
            if (!current || answered || !state || state.status !== 'fight') return;
            const right = current.options[i] === current.answer;
            answered = { pick: i, right };
            if (right) {
                streak++;
                const dmg = streak >= 3 ? 2 : 1;
                answered.dmg = dmg;
                render(false);
                await store.patch({}, { ifMatch: { status: 'fight' }, increments: { bossHp: -dmg, [`hits.${ME.uid}`]: dmg } });
                advanceTimer = setTimeout(() => { nextQuestion(); render(false); }, 900);
            } else {
                streak = 0;
                // Missed questions come back a few questions later -- that's the studying.
                deck.splice(Math.min(3, deck.length), 0, data().millionaireData.find(m => m.question === current.q));
                deck = deck.filter(Boolean);
                render(false);
                await store.patch({}, { ifMatch: { status: 'fight' }, increments: { teamHp: -1, [`misses.${ME.uid}`]: 1 } });
            }
        }

        function bar(val, max, color) {
            const pct = max ? Math.max(0, Math.min(100, Math.round((val / max) * 100))) : 0;
            return `<div class="coop-bar"><div style="width:${pct}%;background:${color}"></div></div>`;
        }

        function leaderboard() {
            const hits = state.hits || {}, names = {};
            Object.entries(state.players || {}).forEach(([uid, p]) => { names[uid] = p.name; });
            names[ME.uid] = ME.name;
            const rows = Object.entries(hits).sort((a, b) => b[1] - a[1]);
            if (!rows.length) return '';
            return `<h5 class="fw-bold mt-3">Damage dealt</h5><ol class="text-start d-inline-block mb-0">${rows.map(([uid, n]) => `<li><strong>${esc(names[uid] || 'Player')}</strong>: ${n}</li>`).join('')}</ol>`;
        }

        function render(bossWasHit) {
            const box = ui();
            if (!box || !state) return;
            const players = presentPlayers(state);
            const chips = IN_ROOM ? `<div class="mb-2">${players.map(p => `<span class="coop-chip">${esc(p.name)}</span>`).join('')}</div>` : '';

            if (state.status === 'lobby') {
                box.innerHTML = `<div class="text-center">
                    <p class="text-muted">Work together to defeat the boss! Everyone answers their own questions. <strong>Right answers damage the boss</strong> (3 in a row = double damage). <strong>Wrong answers cost the team a heart</strong>, and that question comes back later so you can get it right.</p>
                    ${IN_ROOM ? `<p class="fw-bold mb-1">In this room (${players.length}):</p>${chips}<p class="small text-muted">The boss gets stronger with more players. Wait for your team, then start.</p>` : ''}
                    <button class="btn btn-danger btn-lg fw-bold mt-2" data-boss="start">⚔️ Start Battle</button></div>`;
                return;
            }
            const boss = state.boss || { name: 'The Boss', emoji: '👾' };
            let html = `<div class="text-center mb-3">
                <div class="boss-emoji ${bossWasHit ? 'hit' : ''}">${boss.emoji}</div>
                <h4 class="fw-bold mb-1">${esc(boss.name)}</h4>
                <div class="d-flex justify-content-between small fw-bold"><span>Boss HP</span><span>${Math.max(0, state.bossHp)} / ${state.bossMax}</span></div>
                ${bar(state.bossHp, state.bossMax, '#dc3545')}
                <div class="d-flex justify-content-between small fw-bold mt-2"><span>Team hearts</span><span>${'❤️'.repeat(Math.max(0, state.teamHp))}${'🤍'.repeat(Math.max(0, state.teamMax - Math.max(0, state.teamHp)))}</span></div>
                ${chips}</div>`;

            if (state.status === 'won' || state.status === 'lost') {
                const won = state.status === 'won';
                html += `<div class="alert ${won ? 'alert-success' : 'alert-danger'} text-center">
                    <div class="fs-4 fw-bold">${won ? `🏆 Victory! ${esc(boss.name)} is defeated!` : `💀 ${esc(boss.name)} wins this time.`}</div>
                    ${leaderboard()}
                    <div class="mt-3"><button class="btn btn-primary fw-bold" data-boss="again">Play again</button></div></div>`;
                box.innerHTML = html;
                return;
            }

            if (!current) {
                html += '<div class="alert alert-warning text-center">No questions are available for this chapter.</div>';
            } else {
                html += `<div class="card border-primary border-3 rounded-4 shadow-sm"><div class="card-body p-4">
                    <div class="d-flex justify-content-between small fw-bold mb-2"><span>Your question</span><span>${streak >= 2 ? `🔥 Streak: ${streak}` : ''}</span></div>
                    <h4 class="fw-bold mb-3">${esc(current.q)}</h4>
                    <div class="row g-2">${current.options.map((o, i) => {
                        let cls = '';
                        if (answered) { if (o === current.answer) cls = 'correct'; else if (i === answered.pick) cls = 'wrongpick'; }
                        return `<div class="col-md-6"><button class="coop-option ${cls}" data-boss-answer="${i}" ${answered ? 'disabled' : ''}>${esc(o)}</button></div>`;
                    }).join('')}</div>
                    ${answered ? (answered.right
                        ? `<div class="text-center text-success fw-bold fs-5 mt-3">⚔️ Hit! ${answered.dmg > 1 ? 'Double damage!' : ''}</div>`
                        : `<div class="text-center mt-3"><div class="text-danger fw-bold fs-5">💔 Ouch! The team lost a heart.</div>
                           <div class="fw-bold">Correct answer: ${esc(current.answer)}</div>
                           <button class="btn btn-primary fw-bold mt-2" data-boss="next">Next question</button></div>`) : ''}
                  </div></div>`;
            }
            html += leaderboard() ? `<div class="text-center">${leaderboard()}</div>` : '';
            box.innerHTML = html;
        }

        document.addEventListener('click', (e) => {
            const a = e.target.closest('[data-boss-answer]');
            if (a) return answer(Number(a.dataset.bossAnswer));
            const b = e.target.closest('[data-boss]');
            if (!b || !store) return;
            if (b.dataset.boss === 'start') start();
            if (b.dataset.boss === 'next') { nextQuestion(); render(false); }
            if (b.dataset.boss === 'again') store.patch({ status: 'lobby', round: Date.now() });
        });

        return { open, close };
    })();

    // =============================================================== WORDLE
    const Wordle = (() => {
        const TRIES = 6;
        let words = [], target = null, guesses = [], typing = '', over = false, hintShown = false, wins = 0, played = 0, message = '';
        const ui = () => document.getElementById('game-wordle-ui');

        // Vocab terms first, then one-word answers from the question bank
        // ("What is bandwidth?" -> BANDWIDTH), with the question as the hint.
        function buildWords() {
            const seen = new Set(), list = [];
            const add = (w, clue) => {
                w = String(w || '').toUpperCase();
                if (!/^[A-Z]{4,9}$/.test(w) || seen.has(w)) return;
                seen.add(w); list.push({ word: w, clue });
            };
            (data().vocabList || []).forEach(v => add(v.word, v.clue));
            (data().millionaireData || []).forEach(m => {
                const a = String(m.answer || '').trim()
                    .replace(/^(who|what|where|when)\s+(is|are|was|were)\s+/i, '')
                    .replace(/^(a|an|the)\s+/i, '')
                    .replace(/[?.!]+$/, '').trim();
                add(a, m.question);
            });
            return shuffle(list);
        }

        function newWord() {
            if (!words.length) words = buildWords();
            target = words.shift() || null;
            guesses = []; typing = ''; over = false; hintShown = false; message = '';
        }

        function score(guess, word) {
            const res = Array(word.length).fill('x');
            const left = {};
            for (let i = 0; i < word.length; i++) {
                if (guess[i] === word[i]) res[i] = 'g';
                else left[word[i]] = (left[word[i]] || 0) + 1;
            }
            for (let i = 0; i < word.length; i++) {
                if (res[i] !== 'g' && left[guess[i]]) { res[i] = 'y'; left[guess[i]]--; }
            }
            return res;
        }

        function keyStates() {
            const rank = { x: 1, y: 2, g: 3 }, out = {};
            guesses.forEach(g => g.res.forEach((r, i) => { const L = g.word[i]; if (!out[L] || rank[r] > rank[out[L]]) out[L] = r; }));
            return out;
        }

        function press(k) {
            if (!target || over) return;
            if (k === 'ENTER') {
                if (typing.length !== target.word.length) { message = `The word has ${target.word.length} letters.`; return render(); }
                const res = score(typing, target.word);
                guesses.push({ word: typing, res });
                typing = ''; message = '';
                if (res.every(r => r === 'g')) { over = true; wins++; played++; message = 'win'; }
                else if (guesses.length >= TRIES) { over = true; played++; message = 'lose'; }
            } else if (k === 'BACK') {
                typing = typing.slice(0, -1);
            } else if (/^[A-Z]$/.test(k) && typing.length < target.word.length) {
                typing += k;
            }
            render();
        }

        function render() {
            const box = ui();
            if (!box) return;
            if (!target) { box.innerHTML = '<div class="alert alert-warning text-center">No vocab words are available for this chapter yet.</div>'; return; }
            const L = target.word.length;
            let grid = '';
            for (let r = 0; r < TRIES; r++) {
                const g = guesses[r];
                for (let c = 0; c < L; c++) {
                    if (g) grid += `<div class="wd-cell ${g.res[c]}">${g.word[c]}</div>`;
                    else if (r === guesses.length && !over) grid += `<div class="wd-cell ${typing[c] ? 'filled' : ''}">${typing[c] || ''}</div>`;
                    else grid += '<div class="wd-cell"></div>';
                }
            }
            const ks = keyStates();
            const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
            const keys = rows.map((row, ri) => `<div class="wd-row">${ri === 2 ? '<button class="wd-key" data-wd-key="ENTER">Enter</button>' : ''}${row.split('').map(k => `<button class="wd-key ${ks[k] || ''}" data-wd-key="${k}">${k}</button>`).join('')}${ri === 2 ? '<button class="wd-key" data-wd-key="BACK">⌫</button>' : ''}</div>`).join('');
            let status = '';
            if (message === 'win') status = `<div class="alert alert-success text-center fw-bold">🎉 You got it in ${guesses.length}! <strong>${target.word}</strong>${target.clue ? `<div class="fw-normal small mt-1">${esc(target.clue)}</div>` : ''}</div>`;
            else if (message === 'lose') status = `<div class="alert alert-danger text-center fw-bold">The word was <strong>${target.word}</strong>.${target.clue ? `<div class="fw-normal small mt-1">${esc(target.clue)}</div>` : ''}</div>`;
            else if (message) status = `<div class="alert alert-warning text-center py-2 fw-bold">${esc(message)}</div>`;
            box.innerHTML = `
              <details class="mb-3"><summary class="fw-bold">How to play</summary>
                <ul class="small mt-2 mb-0">
                  <li>Guess the hidden vocab word in ${TRIES} tries. The boxes show how many letters it has. Type a word and press <strong>Enter</strong>.</li>
                  <li><span class="badge bg-success">Green</span> = right letter in the right spot. <span class="badge bg-warning text-dark">Yellow</span> = the letter is in the word but in a different spot. <span class="badge bg-secondary">Gray</span> = the letter isn't in the word.</li>
                  <li>Use the colors to make a better next guess. Stuck? Tap <strong>Show hint</strong> for the definition.</li>
                </ul></details>
              <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <span class="fw-bold">${L} letters</span>
                <span class="small text-muted fw-bold">Solved ${wins} of ${played}</span>
              </div>
              <div class="text-center mb-2">${hintShown || over ? `<div class="small fst-italic">💡 ${esc(target.clue || 'No hint for this word.')}</div>` : '<button class="btn btn-sm btn-outline-secondary" data-wd="hint">💡 Show hint</button>'}</div>
              <div class="wd-grid" style="grid-template-columns: repeat(${L}, auto)">${grid}</div>
              ${status}
              <div class="wd-keys">${keys}</div>
              <div class="text-center mt-3"><button class="btn ${over ? 'btn-primary' : 'btn-outline-secondary btn-sm'} fw-bold" data-wd="next">${over ? 'Next word' : 'Skip this word'}</button></div>`;
        }

        function open() { if (!target) newWord(); render(); }

        document.addEventListener('click', (e) => {
            const k = e.target.closest('[data-wd-key]');
            if (k) { press(k.dataset.wdKey); return; }
            const b = e.target.closest('[data-wd]');
            if (!b) return;
            if (b.dataset.wd === 'hint') { hintShown = true; render(); }
            if (b.dataset.wd === 'next') { if (!over) played++; newWord(); render(); }
        });
        document.addEventListener('keydown', (e) => {
            const sec = document.getElementById('game-wordle');
            if (!sec || sec.classList.contains('d-none')) return;
            const tag = (document.activeElement && document.activeElement.tagName) || '';
            if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key === 'Enter') { e.preventDefault(); press('ENTER'); }
            else if (e.key === 'Backspace') { e.preventDefault(); press('BACK'); }
            else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
        });

        return { open, close() {} };
    })();

    // ------------------------------------------------------------- wiring
    const GAMES = { 'game-coop-jeopardy': TeamJeopardy, 'game-boss': BossBattle, 'game-wordle': Wordle };
    let openId = null;

    window.CoopGames = {
        sectionIds: Object.keys(GAMES),
        // Called by launchGame() for every game button: closes whichever
        // co-op game was running (stops its polling) and opens the new one.
        onLaunch(gameId) {
            if (openId && openId !== gameId && GAMES[openId]) GAMES[openId].close();
            if (GAMES[gameId] && openId !== gameId) { openId = gameId; GAMES[gameId].open(); }
            else if (!GAMES[gameId]) openId = null;
        }
    };

    injectUI();
})();
