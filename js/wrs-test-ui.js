/**
 * wrs-test-ui.js -- the timed WRS test screen shared by the Monday WRS Sprint
 * (student/wrs-sprint.html) and the WPR Practice Test other teachers give
 * (wpr-practice/index.html). Laid out like a secure state test: one question
 * per screen, lettered choices, Previous/Next, Flag for Review, a question
 * navigator, on-screen Calculator and Scratch Paper, and a Review screen.
 *
 * Lockdown: a web page can't truly stop a student from switching tabs (only
 * a kiosk/lockdown browser can), so this runs full screen, hides all site
 * navigation, blocks right-click/copy/paste, and DETECTS leaving: the first
 * time a student leaves the tab or full screen the test locks behind a
 * warning; the second time it submits automatically.
 *
 * Usage:
 *   WrsTestUI.enterFullscreen();               // synchronously, inside the Start click
 *   WrsTestUI.run({ mount, questions, answers, secondsLeft,
 *                   save(answers), saveBeacon(answers),
 *                   submit(answers, reason) -> Promise,   // reason: 'student' | 'time' | 'left-test'
 *                   onViolation(count),
 *                   clock() -> Promise<{ secondsLeft }>,  // optional: checked every 15 s, for a time limit the teacher changes
 *                   noTranslate });                       // true: translating the page counts as leaving
 *   WrsTestUI.reviewHtml(result)                // results + every answered question
 *   WrsTestUI.scoreHtml(result)                 // just the score (answers held until the teacher ends the test)
 */
(function () {
    if (window.WrsTestUI) return;
    const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const CSS = `
      .wt-bar { position: sticky; top: 0; z-index: 20; background: #1f2a44; color: #fff; border-radius: .8rem; padding: .7rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: .75rem; flex-wrap: wrap; margin-bottom: 1rem; }
      .wt-timer { font-size: 1.8rem; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: .03em; }
      .wt-timer.low { color: #ff8b8b; }
      .wt-meta { font-size: .85rem; font-weight: 700; color: #6c757d; text-transform: uppercase; letter-spacing: .05em; }
      .wt-q { font-size: 1.25rem; font-weight: 700; margin: .4rem 0 1rem; }
      .wt-opt { display: flex; align-items: center; gap: .75rem; width: 100%; text-align: left; border: 2px solid #ced4da; background: #fff; border-radius: .6rem; padding: .7rem 1rem; margin-bottom: .5rem; font-weight: 600; }
      .wt-opt:hover { border-color: #0d6efd; }
      .wt-opt.sel { border-color: #0d6efd; background: #e7f1ff; }
      .wt-opt .letter { flex: 0 0 2rem; height: 2rem; border-radius: 50%; border: 2px solid #6c757d; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #495057; }
      .wt-opt.sel .letter { background: #0d6efd; border-color: #0d6efd; color: #fff; }
      .wt-tool { background: rgba(255,255,255,.12); color: #fff; font-weight: 700; border: 1px solid rgba(255,255,255,.35); }
      .wt-tool.on, .wt-tool:hover { background: #fff; color: #1f2a44; }
      .wt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(34px, 1fr)); gap: 4px; }
      .wt-grid button { position: relative; border: 1px solid #ced4da; background: #fff; border-radius: 4px; font-size: .75rem; font-weight: 700; padding: 4px 0; font-variant-numeric: tabular-nums; }
      .wt-grid button.ans { background: #198754; border-color: #198754; color: #fff; }
      .wt-grid button.cur { outline: 3px solid #0d6efd; outline-offset: 1px; }
      .wt-grid button.flag::after { content: ''; position: absolute; top: 0; right: 0; border-top: 9px solid #ffc107; border-left: 9px solid transparent; }
      .wt-key { display: inline-block; width: 12px; height: 12px; border-radius: 2px; vertical-align: -1px; }
      .wt-num { font-size: 1.6rem; font-weight: 800; font-variant-numeric: tabular-nums; }
      .wt-panel { position: fixed; right: 18px; bottom: 18px; z-index: 1050; width: 250px; background: #fff; border-radius: .8rem; box-shadow: 0 .8rem 2rem rgba(0,0,0,.35); overflow: hidden; }
      .wt-panel.scratch { width: 320px; right: 284px; }
      @media (max-width: 700px) { .wt-panel.scratch { right: 18px; bottom: 330px; } }
      .wt-head { background: #1f2a44; color: #fff; font-weight: 700; padding: .45rem .7rem; display: flex; justify-content: space-between; align-items: center; }
      .wt-keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
      .wt-keys button { border: 1px solid #ced4da; background: #f8f9fa; border-radius: .4rem; padding: .5rem 0; font-weight: 700; font-size: 1.05rem; }
      .wt-keys button.op { background: #e7f1ff; color: #0d6efd; }
      .wt-keys button.eq { background: #0d6efd; color: #fff; }
      #wtCalcDisplay { font-size: 1.4rem; font-family: ui-monospace, Menlo, Consolas, monospace; }
      .wt-lock { position: fixed; inset: 0; z-index: 2000; background: rgba(17,24,39,.97); color: #fff; display: flex; align-items: center; justify-content: center; padding: 1.5rem; text-align: center; }
      .wt-lock .box { max-width: 520px; }
      body.wt-locked #nav-placeholder, body.wt-locked #footer-placeholder, body.wt-locked nav, body.wt-locked footer { display: none !important; }
      body.wt-locked { user-select: none; -webkit-user-select: none; }
      body.wt-locked textarea { user-select: text; -webkit-user-select: text; }
      .wt-got, .wt-missed { border-radius: 0 .5rem .5rem 0; padding: .7rem 1rem; margin-bottom: .6rem; }
      .wt-got { border-left: 4px solid #198754; background: #f1faf4; }
      .wt-missed { border-left: 4px solid #dc3545; background: #fdf3f4; }
      .wt-big { font-size: 3rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
    `;
    const PANELS = `
      <div id="wtCalc" class="wt-panel" hidden>
        <div class="wt-head"><span><i class="fas fa-calculator me-1"></i>Calculator</span><button type="button" class="btn-close btn-close-white" data-wt-close="wtCalc" aria-label="Close calculator"></button></div>
        <div class="p-2">
          <input id="wtCalcDisplay" class="form-control text-end fw-bold mb-2" readonly value="0" aria-label="Calculator display">
          <div id="wtCalcKeys" class="wt-keys">
            <button data-k="C">C</button><button data-k="⌫">⌫</button><button data-k="%">%</button><button data-k="÷" class="op">÷</button>
            <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button><button data-k="×" class="op">×</button>
            <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button><button data-k="−" class="op">−</button>
            <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button><button data-k="+" class="op">+</button>
            <button data-k="±">±</button><button data-k="0">0</button><button data-k=".">.</button><button data-k="=" class="eq">=</button>
          </div>
        </div>
      </div>
      <div id="wtScratch" class="wt-panel scratch" hidden>
        <div class="wt-head"><span><i class="fas fa-pen-to-square me-1"></i>Scratch Paper</span><button type="button" class="btn-close btn-close-white" data-wt-close="wtScratch" aria-label="Close scratch paper"></button></div>
        <textarea id="wtScratchText" class="form-control border-0" rows="9" placeholder="Work things out here. This is not graded." aria-label="Scratch paper"></textarea>
      </div>
      <div id="wtLock" class="wt-lock" hidden>
        <div class="box">
          <div style="font-size:3rem"><i class="fas fa-triangle-exclamation text-warning"></i></div>
          <h2 class="fw-bold" id="wtLockTitle">You left the test</h2>
          <p class="fs-5" id="wtLockWhy">Leaving the test screen, switching tabs, or exiting full screen is not allowed.</p>
          <p class="fs-5 fw-bold text-warning" id="wtLockWarn">This is your only warning. If you leave again, your test will be submitted.</p>
          <p class="small opacity-75">Your teacher can see that this happened. The clock is still running.</p>
          <button id="wtReturn" class="btn btn-warning btn-lg fw-bold mt-2">Return to the test</button>
        </div>
      </div>`;

    let installed = false;
    function install() {
        if (installed) return;
        installed = true;
        const st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);
        const div = document.createElement('div');
        div.innerHTML = PANELS;
        document.body.appendChild(div);
    }

    function fullscreenSupported() { return !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen); }
    function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
    function enterFullscreen() {
        const el = document.documentElement;
        try {
            const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : (el.webkitRequestFullscreen && el.webkitRequestFullscreen());
            if (p && p.catch) p.catch(() => {});
        } catch (e) { /* not supported (e.g. iPhone) -- tab-leave detection still applies */ }
    }
    function exitFullscreen() {
        try { if (isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
    }

    function run(opts) {
        install();
        const mount = opts.mount;
        const questions = opts.questions;
        const answers = opts.answers || {};
        let endAt = Date.now() + opts.secondsLeft * 1000;
        const flagKey = opts.flagKey || 'wt_flags';
        let flags = new Set();
        try { flags = new Set(JSON.parse(sessionStorage.getItem(flagKey) || '[]')); } catch (e) {}
        let cur = 0, showNav = false, submitting = false, dirty = false, onReview = false;
        let violations = 0, away = false;
        const calcPanel = document.getElementById('wtCalc');
        const scratchPanel = document.getElementById('wtScratch');
        const lock = document.getElementById('wtLock');
        const answered = () => Object.keys(answers).length;
        const saveFlags = () => { try { sessionStorage.setItem(flagKey, JSON.stringify([...flags])); } catch (e) {} };

        document.body.classList.add('wt-locked');

        function timerText() {
            const s = Math.max(0, Math.round((endAt - Date.now()) / 1000));
            const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
            return { s, text: h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}` };
        }
        function tickNow() {
            const t = timerText();
            const el = document.getElementById('wtTimer');
            if (el) { el.textContent = t.text; el.classList.toggle('low', t.s <= 60); }
            if (t.s <= 0) finish('time');
        }
        const tick = setInterval(tickNow, 250);
        const autosave = setInterval(() => { if (dirty) { dirty = false; Promise.resolve(opts.save(answers)).catch(() => { dirty = true; }); } }, 10000);
        // The teacher can change a student's time limit mid-test; the clock catches up here.
        const clockCheck = opts.clock ? setInterval(() => {
            Promise.resolve(opts.clock()).then(r => {
                const left = r && r.secondsLeft;
                if (Number.isFinite(left) && Math.abs(Date.now() + left * 1000 - endAt) > 3000) { endAt = Date.now() + left * 1000; tickNow(); }
            }).catch(() => {});
        }, 15000) : null;

        function bar(title) {
            return `<div class="wt-bar">
                <div class="d-flex align-items-center gap-3">
                  <div><div class="small opacity-75 fw-bold">TIME REMAINING</div><div id="wtTimer" class="wt-timer">--:--</div></div>
                  <div class="fw-bold d-none d-sm-block">${title}</div>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm wt-tool ${calcPanel.hidden ? '' : 'on'}" data-wt-tool="calc"><i class="fas fa-calculator me-1"></i>Calculator</button>
                  <button class="btn btn-sm wt-tool ${scratchPanel.hidden ? '' : 'on'}" data-wt-tool="scratch"><i class="fas fa-pen-to-square me-1"></i>Scratch Paper</button>
                  ${onReview ? '' : '<button class="btn btn-sm btn-warning fw-bold" data-wt="review"><i class="fas fa-list-check me-1"></i>Review &amp; Submit</button>'}
                </div>
              </div>`;
        }

        function renderQuestion() {
            onReview = false;
            const q = questions[cur];
            const kind = (q.kind === 'tf' ? 'True or False' : 'Multiple Choice') + (q.topic === 'safety' ? ' · Workplace Safety' : '');
            const flagged = flags.has(cur);
            mount.innerHTML = `${bar(`Question ${cur + 1} of ${questions.length}`)}
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div class="wt-meta">Question ${cur + 1} of ${questions.length} · ${kind}</div>
                <button class="btn btn-sm ${flagged ? 'btn-warning' : 'btn-outline-warning'} fw-bold" data-wt="flag"><i class="fas fa-flag me-1"></i>${flagged ? 'Flagged for review' : 'Flag for review'}</button>
              </div>
              ${q.prompt && q.kind !== 'tf' ? `<div class="small fw-bold text-primary mt-2">${esc(q.prompt)}</div>` : ''}
              <div class="wt-q">${esc(q.q)}</div>
              <div role="radiogroup">${q.options.map((o, i) => `<button class="wt-opt ${answers[cur] === i ? 'sel' : ''}" role="radio" aria-checked="${answers[cur] === i}" data-opt="${i}"><span class="letter">${LETTERS[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
              <div class="d-flex justify-content-between align-items-center my-3 gap-2">
                <button class="btn btn-outline-secondary fw-bold" data-wt="prev" ${cur === 0 ? 'disabled' : ''}><i class="fas fa-arrow-left me-1"></i>Previous</button>
                <button class="btn btn-link btn-sm fw-bold text-decoration-none" data-wt="nav">${showNav ? 'Hide' : 'Show'} question navigator</button>
                <button class="btn btn-primary fw-bold" data-wt="next" ${cur === questions.length - 1 ? 'disabled' : ''}>Next<i class="fas fa-arrow-right ms-1"></i></button>
              </div>
              ${showNav ? `<div class="small text-muted mb-1"><span class="wt-key" style="background:#198754"></span> answered &nbsp; <span class="wt-key" style="background:#ffc107"></span> flagged &nbsp; <span class="wt-key" style="outline:2px solid #0d6efd"></span> current</div>
              <div class="wt-grid">${questions.map((_, i) => `<button class="${answers[i] !== undefined ? 'ans' : ''} ${i === cur ? 'cur' : ''} ${flags.has(i) ? 'flag' : ''}" data-go="${i}">${i + 1}</button>`).join('')}</div>` : ''}
              <div class="small text-muted mt-2">Shortcuts: A–D or 1–4 choose · ← → move · F flag</div>`;
            tickNow();
        }

        function renderReview() {
            onReview = true;
            const unanswered = questions.map((_, i) => i).filter(i => answers[i] === undefined);
            const flagged = [...flags].sort((a, b) => a - b);
            const cell = i => `<button class="${answers[i] !== undefined ? 'ans' : ''} ${flags.has(i) ? 'flag' : ''}" data-go="${i}">${i + 1}</button>`;
            mount.innerHTML = `${bar('Review')}
              <h2 class="h5 fw-bold">Review your answers</h2>
              <div class="d-flex gap-4 flex-wrap mb-3">
                <div><span class="wt-num">${answered()}</span> answered</div>
                <div><span class="wt-num">${unanswered.length}</span> unanswered</div>
                <div><span class="wt-num text-warning">${flagged.length}</span> flagged</div>
              </div>
              ${flagged.length ? `<div class="fw-bold small mb-1"><i class="fas fa-flag text-warning me-1"></i>Flagged for review</div><div class="wt-grid mb-3">${flagged.map(cell).join('')}</div>` : ''}
              <div class="fw-bold small mb-1">All questions (click one to go back to it)</div>
              <div class="wt-grid mb-3">${questions.map((_, i) => cell(i)).join('')}</div>
              <div class="d-flex justify-content-between gap-2 flex-wrap">
                <button class="btn btn-outline-secondary fw-bold" data-wt="back"><i class="fas fa-arrow-left me-1"></i>Return to the test</button>
                <button class="btn btn-success fw-bold" data-wt="submit">Submit test${unanswered.length ? ` (${unanswered.length} unanswered)` : ''}</button>
              </div>`;
            tickNow();
        }

        const go = i => { if (i >= 0 && i < questions.length) { cur = i; renderQuestion(); } };
        const toggleFlag = () => { flags.has(cur) ? flags.delete(cur) : flags.add(cur); saveFlags(); renderQuestion(); };

        function onClick(e) {
            if (submitting) return;
            const o = e.target.closest('[data-opt]'); if (o) { answers[cur] = Number(o.dataset.opt); dirty = true; return renderQuestion(); }
            const g = e.target.closest('[data-go]'); if (g) return go(Number(g.dataset.go));
            const t = e.target.closest('[data-wt-tool]');
            if (t) { const p = t.dataset.wtTool === 'calc' ? calcPanel : scratchPanel; p.hidden = !p.hidden; return onReview ? renderReview() : renderQuestion(); }
            const b = e.target.closest('[data-wt]'); if (!b) return;
            const a = b.dataset.wt;
            if (a === 'prev') go(cur - 1);
            else if (a === 'next') go(cur + 1);
            else if (a === 'nav') { showNav = !showNav; renderQuestion(); }
            else if (a === 'flag') toggleFlag();
            else if (a === 'review') renderReview();
            else if (a === 'back') renderQuestion();
            else if (a === 'submit') finish('student');
        }
        function onKey(e) {
            if (submitting || !lock.hidden || onReview || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
            const q = questions[cur];
            const k = e.key.toUpperCase();
            const idx = /^[1-6]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k);
            if (k === 'F') toggleFlag();
            else if (k.length === 1 && idx >= 0 && idx < q.options.length) { e.preventDefault(); answers[cur] = idx; dirty = true; renderQuestion(); }
            else if (e.key === 'ArrowRight') go(cur + 1);
            else if (e.key === 'ArrowLeft') go(cur - 1);
        }
        mount.addEventListener('click', onClick);
        document.addEventListener('keydown', onKey);

        // ---- Calculator
        let calc = { display: '0', prev: null, op: null, fresh: true };
        const disp = document.getElementById('wtCalcDisplay');
        const compute = (a, b, op) => {
            const r = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : op === '÷' ? (b === 0 ? NaN : a / b) : b;
            return Number.isFinite(r) ? String(Math.round(r * 1e10) / 1e10) : 'Error';
        };
        function onCalc(e) {
            const k = e.target.closest('[data-k]'); if (!k) return;
            const v = k.dataset.k;
            if (/^[0-9]$/.test(v)) { calc.display = calc.fresh || calc.display === '0' ? v : calc.display + v; calc.fresh = false; }
            else if (v === '.') { if (calc.fresh) { calc.display = '0.'; calc.fresh = false; } else if (!calc.display.includes('.')) calc.display += '.'; }
            else if (v === 'C') calc = { display: '0', prev: null, op: null, fresh: true };
            else if (v === '⌫') calc.display = calc.display.length > 1 ? calc.display.slice(0, -1) : '0';
            else if (v === '±') calc.display = calc.display.startsWith('-') ? calc.display.slice(1) : (calc.display === '0' ? '0' : '-' + calc.display);
            else if (v === '%') calc.display = String(Number(calc.display) / 100);
            else if (v === '=') { if (calc.op !== null) { calc.display = compute(Number(calc.prev), Number(calc.display), calc.op); calc.op = null; calc.prev = null; calc.fresh = true; } }
            else { if (calc.op !== null && !calc.fresh) calc.display = compute(Number(calc.prev), Number(calc.display), calc.op); calc.prev = calc.display; calc.op = v; calc.fresh = true; }
            disp.value = calc.display;
        }
        document.getElementById('wtCalcKeys').addEventListener('click', onCalc);
        function onClose(e) { const c = e.target.closest('[data-wt-close]'); if (c) { document.getElementById(c.dataset.wtClose).hidden = true; onReview ? renderReview() : renderQuestion(); } }
        document.addEventListener('click', onClose);

        // ---- Lockdown
        const block = e => { if (!(e.target && e.target.id === 'wtScratchText' && e.type !== 'paste')) e.preventDefault(); };
        ['contextmenu', 'copy', 'cut', 'paste', 'dragstart'].forEach(ev => document.addEventListener(ev, block));
        const LOCK = {
            leave: ['You left the test', 'Leaving the test screen, switching tabs, or exiting full screen is not allowed.', 'This is your only warning. If you leave again, your test will be submitted.'],
            translate: ['Translating is not allowed', 'The state test is only in English, so this practice test is too. Turn the translator off and switch the page back to English, then return to the test.', 'This is your only warning. If the test is translated again, it will be submitted.'],
            still: ['The translator is still on', 'Turn the translator off and switch the page back to English first, then return to the test.', 'This is your only warning. If the test is translated again, it will be submitted.']
        };
        function showLock(kind) {
            const [title, why, warn] = LOCK[kind];
            document.getElementById('wtLockTitle').textContent = title;
            document.getElementById('wtLockWhy').textContent = why;
            document.getElementById('wtLockWarn').textContent = warn;
            lock.hidden = false;
        }
        function leftTest(kind) {
            if (submitting || away) return;
            away = true;
            violations++;
            Promise.resolve(opts.onViolation && opts.onViolation(violations)).catch(() => {});
            if (violations >= 2) { finish('left-test'); return; }
            showLock(kind === 'translate' ? 'translate' : 'leave');
        }
        const onVis = () => { if (document.visibilityState === 'hidden') leftTest(); };
        const onBlur = () => setTimeout(() => { if (!document.hasFocus()) leftTest(); }, 150);
        const onFs = () => { if (fullscreenSupported() && !isFullscreen()) leftTest(); };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('blur', onBlur);
        document.addEventListener('fullscreenchange', onFs);
        document.addEventListener('webkitfullscreenchange', onFs);
        // No translating (opts.noTranslate), like the state test. The page itself asks browsers not to translate
        // it (translate="no"); if a translator does it anyway, that counts as leaving the test.
        const translated = () => {
            const html = document.documentElement;
            return /\btranslated-(ltr|rtl)\b/.test(html.className)            // Chrome / Google Translate
                || (!!html.lang && !/^en\b/i.test(html.lang))                   // translators relabel the page's language
                || !!document.querySelector('font[style*="vertical-align"], [_msttexthash], [_msthash]');   // Google's and Edge's markers
        };
        const watch = opts.noTranslate ? new MutationObserver(() => { if (translated()) leftTest('translate'); }) : null;
        if (watch) {
            watch.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['lang', 'class'] });
            if (translated()) leftTest('translate');
        }
        document.getElementById('wtReturn').onclick = () => {
            if (watch && translated()) { showLock('still'); return; }
            enterFullscreen(); lock.hidden = true; away = false;
        };
        const onUnload = e => {
            if (submitting) return;
            try { opts.saveBeacon && opts.saveBeacon(answers); } catch (err) {}
            e.preventDefault(); e.returnValue = '';
        };
        window.addEventListener('beforeunload', onUnload);

        function teardown() {
            clearInterval(tick); clearInterval(autosave); clearInterval(clockCheck);
            mount.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onKey);
            document.getElementById('wtCalcKeys').removeEventListener('click', onCalc);
            document.removeEventListener('click', onClose);
            ['contextmenu', 'copy', 'cut', 'paste', 'dragstart'].forEach(ev => document.removeEventListener(ev, block));
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('fullscreenchange', onFs);
            document.removeEventListener('webkitfullscreenchange', onFs);
            window.removeEventListener('beforeunload', onUnload);
            if (watch) watch.disconnect();
            calcPanel.hidden = true; scratchPanel.hidden = true; lock.hidden = true;
            document.body.classList.remove('wt-locked');
            try { sessionStorage.removeItem(flagKey); } catch (e) {}
            exitFullscreen();
        }

        async function finish(reason) {
            if (submitting) return;
            submitting = true;
            teardown();
            const msg = reason === 'time' ? "Time's up! " : reason === 'left-test' ? 'You left the test a second time, so it was submitted. ' : '';
            mount.innerHTML = `<p class="text-center fw-bold my-4">${msg}Scoring your test…</p>`;
            for (let attempt = 0; attempt < 3; attempt++) {
                try { await opts.submit(answers, reason, violations); return; }
                catch (e) { await new Promise(r => setTimeout(r, 1500)); }
            }
            mount.innerHTML = '<div class="alert alert-danger">Your test could not be submitted. Tell your teacher. Your answers were saved as you went.</div>';
        }

        renderQuestion();
    }

    // The score: how it ended, then correct / answered / accuracy.
    function scoreHtml(r, reason) {
        const acc = r.answered ? Math.round((r.correct / r.answered) * 100) : 0;
        const note = reason === 'time' ? '<div class="alert alert-warning py-2 fw-bold">Time\'s up! Your answers were submitted automatically.</div>'
            : reason === 'left-test' ? '<div class="alert alert-danger py-2 fw-bold">You left the test a second time, so it was submitted automatically.</div>'
            : reason === 'ended' ? '<div class="alert alert-warning py-2 fw-bold">Your teacher ended the test, so your saved answers were scored.</div>' : '';
        return `${note}
          <div class="d-flex flex-wrap gap-4 align-items-end mb-3">
            <div><div class="wt-big text-success">${r.correct}</div><div class="fw-bold text-muted">correct</div></div>
            <div><div class="wt-big">${r.answered}</div><div class="fw-bold text-muted">answered of ${r.total}</div></div>
            <div><div class="wt-big">${acc}%</div><div class="fw-bold text-muted">accuracy</div></div>
          </div>`;
    }
    // Score summary + every answered question (right or wrong, with the
    // correct answer for misses), with an All / Wrong-only filter.
    function reviewHtml(r, reason) {
        const list = r.review || r.missed || [];
        const wrong = list.filter(m => !m.right).length;
        const html = `${scoreHtml(r, reason)}
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4 mb-2">
            <h2 class="h6 fw-bold mb-0">Every question you answered (${list.length})</h2>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-secondary fw-bold active" data-wt-filter="all">All</button>
              <button class="btn btn-outline-danger fw-bold" data-wt-filter="wrong">Wrong only (${wrong})</button>
            </div>
          </div>
          <div class="wt-review">${list.map(m => `<div class="${m.right ? 'wt-got' : 'wt-missed'}" data-right="${m.right ? 1 : 0}">
              <div class="small fw-bold ${m.right ? 'text-success' : 'text-danger'}"><i class="fas ${m.right ? 'fa-circle-check' : 'fa-circle-xmark'} me-1"></i>Question ${m.n} · ${m.right ? 'Right' : 'Wrong'}${m.topic === 'safety' ? ' · Workplace safety' : m.topic === 'worklife' ? ' · Work &amp; personal life' : ''}</div>
              ${m.prompt && m.prompt !== 'True or false?' ? `<div class="small text-muted fw-bold">${esc(m.prompt)}</div>` : ''}
              <div class="fw-bold">${esc(m.q)}</div>
              <div class="small mt-1"><span class="fw-bold ${m.right ? 'text-success' : 'text-danger'}">Your answer:</span> ${esc(m.yours)}</div>
              ${m.right ? '' : `<div class="small"><span class="text-success fw-bold">Correct answer:</span> ${esc(m.answer)}</div>`}
              ${(!m.right || m.topic === 'worklife') && m.hint ? `<div class="small text-muted mt-1">${esc(m.hint)}</div>` : ''}
            </div>`).join('')}</div>`;
        return html;
    }
    document.addEventListener('click', (e) => {
        const f = e.target.closest('[data-wt-filter]'); if (!f) return;
        const root = f.closest('.btn-group').parentElement.parentElement;
        root.querySelectorAll('[data-wt-filter]').forEach(b => b.classList.toggle('active', b === f));
        root.querySelectorAll('.wt-review [data-right]').forEach(el => { el.hidden = f.dataset.wtFilter === 'wrong' && el.dataset.right === '1'; });
    });

    window.WrsTestUI = { install, run, reviewHtml, scoreHtml, enterFullscreen, esc };
})();
