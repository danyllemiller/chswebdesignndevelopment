// /js/wrsLogic.js — Workplace Readiness Skills Assessment Engine
(function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────────
    let _origConfig = null;   // untouched config; re-shuffled on each Begin
    let _flatQ      = [];     // shuffled flat array of all questions
    let _qIdx       = 0;      // current question index in _flatQ
    let _ans        = {};     // _ans[qIdx] = answer value (any type)

    let _fName     = '';
    let _lName     = '';
    let _sClass    = '';
    let _studentId = '';
    let _gbExamId  = '';

    // calculator/scratchpad state — persisted across same-question re-renders
    let _calcOpen    = false;
    let _scratchText = '';
    let _calcDisplay = '0';
    let _calcPrev    = '';
    let _calcOp      = '';
    let _calcNew     = true;

    // ── Shuffle ───────────────────────────────────────────────────────────────
    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    // Flatten config into one shuffled question array.
    // Matching SETs stay together as one unit (type: 'matchSet') with items shuffled internally.
    function buildFlat(cfg) {
        var items = [];

        // T/F — each statement is its own question
        cfg.tfSection.forEach(function (item) {
            items.push({ type: 'tf', q: item.q, a: item.a, hint: item.hint || '' });
        });

        // Matching — each SET is one question; items within the set are shuffled
        cfg.matchSection.forEach(function (set) {
            items.push({
                type:    'matchSet',
                title:   set.title || 'Match each statement to the correct answer.',
                items:   shuffle(set.items.slice()),
                choices: set.choices
            });
        });

        // MC — shuffle each question's answer options independently
        cfg.mcSection.forEach(function (q) {
            items.push({ type: 'mc', q: q.q, options: shuffle(q.options), answer: q.answer,
                         math: !!q.math, hint: q.hint || '' });
        });

        // Label — each numbered region is its own question
        (cfg.labelSection || []).forEach(function (diag) {
            diag.items.forEach(function (item, i) {
                items.push({ type: 'label', regionNum: i + 1, answer: item.answer,
                             svg: diag.svg, wordBank: diag.wordBank, title: diag.title,
                             hint: item.hint || '' });
            });
        });

        return shuffle(items);
    }

    // ── Utilities ─────────────────────────────────────────────────────────────
    function esc(s) {
        if (typeof s !== 'string') return s === undefined ? '' : String(s);
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function $c() { return document.getElementById('exam-container'); }

    // ── Auth ──────────────────────────────────────────────────────────────────
    function waitForAuth(timeout) {
        timeout = timeout || 8000;
        return new Promise(function (resolve) {
            if (window.dacAuthData) { resolve(window.dacAuthData); return; }
            var h = function () { resolve(window.dacAuthData); };
            document.addEventListener('authComplete', h, { once: true });
            setTimeout(function () {
                document.removeEventListener('authComplete', h);
                resolve({ isAuthenticated: false });
            }, timeout);
        });
    }

    // ── Progress ──────────────────────────────────────────────────────────────
    function progressBar() {
        var answered = Object.keys(_ans).length;
        var total    = _flatQ.length;
        var pct      = total ? Math.min(100, Math.round(answered / total * 100)) : 0;
        var cur      = _qIdx + 1;
        return '<div class="d-flex justify-content-between align-items-center mb-1" style="font-size:.8rem;color:#6c757d">'
            + '<span>Question <strong>' + cur + '</strong> of <strong>' + total + '</strong></span>'
            + '<span><strong>' + pct + '%</strong> complete</span>'
            + '</div>'
            + '<div class="progress mb-4" style="height:6px;border-radius:3px">'
            + '<div class="progress-bar" style="background:var(--primary-color,#003087);width:' + pct + '%"></div>'
            + '</div>';
    }

    // ── Card wrapper ──────────────────────────────────────────────────────────
    function cardShell(accent, typeLabel, bodyHtml, footerHtml) {
        return '<div class="card shadow-sm border-0">'
            + '<div class="card-body p-4 p-md-5">'
            + '<div class="d-flex justify-content-between align-items-center mb-1" style="font-size:.8rem;color:#6c757d">'
            + '<span><strong>' + esc(_lName) + ', ' + esc(_fName) + '</strong> &middot; ' + esc(_sClass) + '</span>'
            + '<span class="badge fw-semibold" style="background:' + accent + '">' + typeLabel + '</span>'
            + '</div>'
            + progressBar()
            + bodyHtml
            + '</div>'
            + '<div class="card-footer d-flex justify-content-between gap-2 p-3 bg-white border-top">'
            + footerHtml
            + '</div>'
            + '</div>';
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    async function initWRS(config) {
        _origConfig = config;
        _gbExamId   = config.gradebookExamId || 'WRS-Practice';

        var c = $c();
        if (c) c.innerHTML = '<div class="text-center p-5 bg-white shadow-sm rounded" style="border-top:6px solid var(--primary-color,#003087)"><div class="spinner-border" style="color:var(--primary-color,#003087)"></div><p class="mt-3 fw-bold" style="color:var(--primary-color,#003087)">Loading WRS Assessment&hellip;</p></div>';

        var auth = await waitForAuth();
        if (!auth || !auth.isAuthenticated) {
            window.top.location.replace('/login.html?redirect=' + encodeURIComponent(window.top.location.pathname));
            return;
        }

        var stored = {};
        try { stored = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) {}
        _studentId = stored.student_id || '';
        var username = stored.username;

        if (!username || !_studentId) {
            window.top.location.replace('/login.html?redirect=' + encodeURIComponent(window.top.location.pathname));
            return;
        }

        try {
            var res = await fetch('/api/student/profile?username=' + encodeURIComponent(username));
            if (!res.ok) throw new Error('profile');
            var p = await res.json();
            _fName  = p.first_name || '';
            _lName  = p.last_name  || '';
            _sClass = p.section_id || 'N/A';
        } catch (e) {
            window.top.location.replace('/login.html?redirect=' + encodeURIComponent(window.top.location.pathname));
            return;
        }

        renderStart();
    }

    // ── Welcome ───────────────────────────────────────────────────────────────
    function renderStart() {
        var cfg    = _origConfig;
        var tfCt   = cfg.tfSection.length;
        var mSets  = cfg.matchSection.length;
        var mItems = cfg.matchSection.reduce(function (s, st) { return s + st.items.length; }, 0);
        var mcCt   = cfg.mcSection.length;
        var lItems = (cfg.labelSection || []).reduce(function (s, d) { return s + d.items.length; }, 0);
        var total  = tfCt + mItems + mcCt + lItems;

        $c().innerHTML = '<div class="card shadow border-primary mx-auto" style="max-width:580px">'
            + '<div class="card-header text-white text-center py-3" style="background:var(--primary-color,#003087)">'
            + '<h4 class="mb-0 fw-bold">' + esc(cfg.chapterTitle) + '</h4>'
            + '<p class="mb-0 opacity-75 small">Nevada WRS Practice Assessment</p>'
            + '</div>'
            + '<div class="card-body p-4">'
            + '<div class="alert border py-3 mb-4" style="background:#f0f4ff">'
            + '<div class="row align-items-center">'
            + '<div class="col-8"><span class="text-muted small fw-bold text-uppercase" style="letter-spacing:.05em">Verified Student</span>'
            + '<div class="h5 mb-0 fw-bold text-dark">' + esc(_lName) + ', ' + esc(_fName) + '</div></div>'
            + '<div class="col-4 border-start text-center"><span class="text-muted small fw-bold text-uppercase" style="letter-spacing:.05em">Period</span>'
            + '<div class="h5 mb-0 fw-bold text-primary">' + esc(_sClass) + '</div></div>'
            + '</div></div>'
            + '<div class="alert alert-light border small mb-4">'
            + '<strong>' + total + ' scoreable items &mdash; fully randomized</strong>'
            + '<ul class="mb-0 mt-2">'
            + '<li>' + tfCt + ' True / False</li>'
            + '<li>' + mItems + ' Matching (' + mSets + ' grouped sets of ' + Math.round(mItems / mSets) + ')</li>'
            + '<li>' + mcCt + ' Multiple Choice</li>'
            + '<li>' + lItems + ' Labeling</li>'
            + '</ul>'
            + '<p class="mt-2 mb-0 fst-italic">All question types are mixed and shuffled. No penalty for guessing. Passing score is <strong>75%</strong>.</p>'
            + '</div>'
            + '<button onclick="wrsStart()" class="btn btn-lg w-100 fw-bold shadow-sm text-white" style="background:var(--primary-color,#003087)">Begin Assessment</button>'
            + '</div></div>';
    }

    // ── Render dispatcher ─────────────────────────────────────────────────────
    function renderQuestion() {
        if (_qIdx >= _flatQ.length) { renderResults(); return; }
        var item = _flatQ[_qIdx];
        if      (item.type === 'tf')       renderTF(item);
        else if (item.type === 'matchSet') renderMatchSet(item);
        else if (item.type === 'mc')       renderMC(item);
        else if (item.type === 'label')    renderLabel(item);
    }

    // ── Shared footer ─────────────────────────────────────────────────────────
    // canProceed: boolean — controls whether Next/Submit is enabled
    function navFooter(canProceed, accent) {
        var isFirst   = _qIdx === 0;
        var isLast    = _qIdx === _flatQ.length - 1;
        var nextLabel = isLast ? 'Submit Assessment' : 'Next &rarr;';
        var nextStyle = isLast ? 'background:#ffc107' : 'background:' + accent;
        var nextClass = isLast ? 'text-dark' : 'text-white';
        return '<button onclick="wrsPrev()" class="btn btn-outline-secondary fw-bold px-4" ' + (isFirst ? 'disabled' : '') + '>&larr; Back</button>'
            + '<button onclick="wrsNext()" class="btn fw-bold px-5 ' + nextClass + '" style="' + nextStyle + '" ' + (canProceed ? '' : 'disabled') + '>' + nextLabel + '</button>';
    }

    // ── True / False ──────────────────────────────────────────────────────────
    function renderTF(item) {
        var sel = _ans[_qIdx];
        var body = '<div class="text-center mb-5">'
            + '<span class="badge mb-3 px-3 py-2 fw-semibold" style="background:#003087;font-size:.78rem;letter-spacing:.05em">TRUE / FALSE</span>'
            + '<h4 class="fw-bold lh-base" style="font-size:1.1rem">' + esc(item.q) + '</h4>'
            + '</div>'
            + '<div class="d-flex justify-content-center gap-3">'
            + '<button onclick="wrsSelectTF(\'T\')" class="btn btn-lg px-5 fw-bold ' + (sel === 'T' ? 'btn-primary text-white' : 'btn-outline-secondary') + '" style="min-width:130px">True</button>'
            + '<button onclick="wrsSelectTF(\'F\')" class="btn btn-lg px-5 fw-bold ' + (sel === 'F' ? 'btn-danger text-white' : 'btn-outline-secondary') + '" style="min-width:130px">False</button>'
            + '</div>';
        $c().innerHTML = cardShell('#003087', 'True / False', body, navFooter(sel === 'T' || sel === 'F', '#003087'));
    }

    // ── Matching Set — all items displayed together ────────────────────────────
    function renderMatchSet(item) {
        var selObj   = _ans[_qIdx] || {};
        var answered = Object.keys(selObj).length;
        var allDone  = answered === item.items.length;

        // Choices reference panel
        var choicesHtml = '<div class="p-3 mb-4 rounded border" style="background:#f8f9fa">'
            + '<p class="small fw-bold text-muted mb-2" style="text-transform:uppercase;letter-spacing:.05em">Answer Choices</p>'
            + '<div class="d-flex flex-wrap gap-2">'
            + item.choices.map(function (c) {
                return '<span class="px-3 py-1 rounded border bg-white small fw-semibold">' + esc(c) + '</span>';
            }).join('')
            + '</div></div>';

        // Build rows — one per item in the set
        var rowsHtml = item.items.map(function (mi, j) {
            var picked = selObj[j] || '';
            var opts = item.choices.map(function (c) {
                var letter = c.split('.')[0].trim();
                return '<option value="' + esc(letter) + '"' + (picked === letter ? ' selected' : '') + '>' + esc(c) + '</option>';
            }).join('');
            var rowBg = picked ? '#f0fff4' : '#fff';
            var rowBorder = picked ? '2px solid #198754' : '2px solid #dee2e6';
            return '<div class="mb-3 p-3 rounded d-flex align-items-center gap-3" style="background:' + rowBg + ';border:' + rowBorder + '">'
                + '<div class="flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center fw-bold" style="width:28px;height:28px;min-width:28px;background:#198754;color:#fff;font-size:.8rem">' + (j + 1) + '</div>'
                + '<div class="flex-grow-1 fw-semibold small lh-base">' + esc(mi.q) + '</div>'
                + '<select class="form-select form-select-sm fw-bold flex-shrink-0" style="max-width:220px;color:#198754" onchange="wrsSelectMatchSet(' + j + ',this.value)">'
                + '<option value="">&mdash; choose &mdash;</option>' + opts
                + '</select>'
                + '</div>';
        }).join('');

        var body = '<div class="text-center mb-3">'
            + '<span class="badge mb-2 px-3 py-2 fw-semibold" style="background:#198754;font-size:.78rem;letter-spacing:.05em">MATCHING</span>'
            + '<p class="fw-bold mb-0 lh-base">' + esc(item.title) + '</p>'
            + '<p class="text-muted small mb-0">' + answered + ' of ' + item.items.length + ' matched</p>'
            + '</div>'
            + choicesHtml
            + rowsHtml;

        $c().innerHTML = cardShell('#198754', 'Matching', body, navFooter(allDone, '#198754'));
    }

    // ── Multiple Choice ───────────────────────────────────────────────────────
    function renderMC(item) {
        var sel = _ans[_qIdx];
        var optHtml = item.options.map(function (opt, i) {
            var chosen = sel === i;
            return '<div class="mb-2">'
                + '<div class="p-3 rounded d-flex align-items-center gap-3" onclick="wrsSelectMC(' + i + ')" style="cursor:pointer;border:2px solid ' + (chosen ? '#0d6efd' : '#dee2e6') + ';background:' + (chosen ? '#e8f0fe' : '#fff') + '">'
                + '<div class="flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center fw-bold" style="width:32px;height:32px;min-width:32px;border:2px solid ' + (chosen ? '#0d6efd' : '#adb5bd') + ';background:' + (chosen ? '#0d6efd' : 'transparent') + ';color:' + (chosen ? '#fff' : '#555') + ';font-size:.85rem">'
                + String.fromCharCode(65 + i)
                + '</div>'
                + '<span class="fw-semibold" style="pointer-events:none;font-size:.95rem">' + esc(opt) + '</span>'
                + '</div></div>';
        }).join('');
        var mathHtml = item.math ? calcWidget() : '';
        var body = '<div class="text-center mb-4">'
            + '<span class="badge mb-3 px-3 py-2 fw-semibold" style="background:#003087;font-size:.78rem;letter-spacing:.05em">MULTIPLE CHOICE</span>'
            + '<h4 class="fw-bold lh-base" style="font-size:1.1rem">' + esc(item.q) + '</h4>'
            + '</div>'
            + mathHtml
            + '<div>' + optHtml + '</div>';
        $c().innerHTML = cardShell('#003087', 'Multiple Choice', body, navFooter(sel !== undefined, '#003087'));
    }

    // ── Labeling ──────────────────────────────────────────────────────────────
    function renderLabel(item) {
        var sel  = _ans[_qIdx] || '';
        var opts = item.wordBank.map(function (w) {
            return '<option value="' + esc(w) + '"' + (sel === w ? ' selected' : '') + '>' + esc(w) + '</option>';
        }).join('');
        var wbHtml = item.wordBank.map(function (w) {
            return '<span class="badge bg-white border text-dark me-1 mb-1 fw-normal" style="font-size:.8rem">' + esc(w) + '</span>';
        }).join('');
        var body = '<div class="text-center mb-3">'
            + '<span class="badge mb-2 px-3 py-2 fw-semibold" style="background:#fd7e14;font-size:.78rem;letter-spacing:.05em">LABELING</span>'
            + '<p class="fw-bold mt-1 mb-0" style="font-size:.9rem">' + esc(item.title) + '</p>'
            + '</div>'
            + '<div class="mb-3">' + item.svg + '</div>'
            + '<div class="p-3 bg-light rounded border mb-3">'
            + '<p class="small fw-bold text-muted mb-2" style="text-transform:uppercase;letter-spacing:.05em">Word Bank</p>'
            + '<div>' + wbHtml + '</div>'
            + '</div>'
            + '<div class="p-3 rounded" style="background:#fff8f0;border:2px solid #fd7e14">'
            + '<label class="fw-bold mb-2 d-block">'
            + '<span class="badge me-2 fw-bold" style="background:#fd7e14">Region ' + item.regionNum + '</span>'
            + 'What is the section labeled <strong>' + item.regionNum + '</strong> on this pay stub?'
            + '</label>'
            + '<select class="form-select fw-bold" style="color:#fd7e14;font-size:1rem" onchange="wrsSelectLabel(this.value)">'
            + '<option value="">&mdash; select label &mdash;</option>' + opts
            + '</select>'
            + '</div>';
        $c().innerHTML = cardShell('#fd7e14', 'Labeling', body, navFooter(!!sel, '#fd7e14'));
    }

    // ── Calculator widget ─────────────────────────────────────────────────────
    function calcWidget() {
        var keys    = ['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='];
        var btnHtml = keys.map(function (k) {
            var isOp   = ['÷','×','−','+'].indexOf(k) !== -1;
            var isFn   = ['C','±','%'].indexOf(k) !== -1;
            var isEq   = k === '=';
            var isZero = k === '0';
            var cls    = isEq  ? 'btn-warning fw-bold'
                       : isOp  ? 'btn-outline-secondary fw-bold'
                       : isFn  ? 'btn-outline-secondary'
                       : 'btn-light border fw-bold';
            return '<button onclick="wrsCalc(\'' + k + '\')" class="btn btn-sm ' + cls + '" style="padding:.45rem .2rem;font-size:.9rem;' + (isZero ? 'grid-column:span 2;' : '') + '">' + k + '</button>';
        }).join('');
        return '<div class="mt-1 mb-4">'
            + '<div class="accordion" id="mathToolsAcc">'
            + '<div class="accordion-item" style="border-color:#ffc107">'
            + '<h2 class="accordion-header">'
            + '<button class="accordion-button ' + (_calcOpen ? '' : 'collapsed') + ' fw-bold py-2" style="background:#fff8e1;color:#7c5700;font-size:.9rem" type="button" data-bs-toggle="collapse" data-bs-target="#mathToolsBody">'
            + '&#x1F9EE; Calculator &amp; Scratch Pad &nbsp;<span class="badge bg-warning text-dark ms-1" style="font-size:.7rem">Math Tool</span>'
            + '</button></h2>'
            + '<div id="mathToolsBody" class="accordion-collapse collapse ' + (_calcOpen ? 'show' : '') + '">'
            + '<div class="accordion-body p-3" style="background:#fffdf0">'
            + '<div class="row g-3 align-items-start">'
            + '<div class="col-md-5"><p class="small fw-bold text-muted mb-2" style="text-transform:uppercase;letter-spacing:.05em">Calculator</p>'
            + '<div class="border rounded p-2 bg-white" style="max-width:210px;margin:0 auto">'
            + '<input id="wrs-calc-display" type="text" readonly class="form-control text-end fw-bold mb-2 border-0 bg-light" value="' + esc(_calcDisplay) + '" style="font-size:1.5rem;font-family:monospace">'
            + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">' + btnHtml + '</div>'
            + '</div></div>'
            + '<div class="col-md-7"><label class="form-label small fw-bold text-muted" style="text-transform:uppercase;letter-spacing:.05em">Scratch Pad</label>'
            + '<textarea id="wrs-scratch" class="form-control" rows="8" placeholder="Work out your math here&#x2026;" style="font-family:monospace;font-size:.9rem;resize:none">' + esc(_scratchText) + '</textarea>'
            + '</div></div></div></div></div></div></div>';
    }

    // ── Grading ───────────────────────────────────────────────────────────────
    function gradeAll() {
        var r = { tf: 0, match: 0, mc: 0, label: 0 };
        var t = { tf: 0, match: 0, mc: 0, label: 0 };

        _flatQ.forEach(function (item, i) {
            var ans = _ans[i];
            if (item.type === 'tf') {
                t.tf++;
                if (ans === item.a) r.tf++;
            } else if (item.type === 'matchSet') {
                item.items.forEach(function (mi, j) {
                    t.match++;
                    if ((ans || {})[j] === mi.answer) r.match++;
                });
            } else if (item.type === 'mc') {
                t.mc++;
                if (item.options[ans] === item.answer) r.mc++;
            } else if (item.type === 'label') {
                t.label++;
                if (ans === item.answer) r.label++;
            }
        });

        var total = t.tf + t.match + t.mc + t.label;
        var right = r.tf + r.match + r.mc + r.label;
        return { tfRight: r.tf, tfTotal: t.tf, matchRight: r.match, matchTotal: t.match,
                 mcRight: r.mc, mcTotal: t.mc, labelRight: r.label, labelTotal: t.label,
                 total: total, right: right };
    }

    // ── Results ───────────────────────────────────────────────────────────────
    async function renderResults() {
        $c().innerHTML = '<div class="text-center p-5 bg-white shadow-sm rounded"><div class="spinner-border text-primary"></div><h3 class="mt-4 text-primary">Calculating results&hellip;</h3></div>';

        var sc   = gradeAll();
        var pct  = Math.round(sc.right / sc.total * 100);
        var pass = pct >= 75;

        var hintHtml = function (hint) {
            return hint ? '<div class="mt-2 p-2 rounded" style="background:#fffde7;border-left:3px solid #ffc107"><small>&#x1F4A1; <strong>Study Hint:</strong> ' + esc(hint) + '</small></div>' : '';
        };

        // Build review HTML grouped by type
        var rev = { tf: '', match: '', mc: '', label: '' };

        _flatQ.forEach(function (item, i) {
            var ans = _ans[i];
            var ok, got;

            if (item.type === 'tf') {
                ok  = ans === item.a;
                got = ans || '&mdash;';
                rev.tf += '<div class="mb-2 p-2 rounded small ' + (ok ? 'bg-success bg-opacity-10 border border-success' : 'bg-danger bg-opacity-10 border border-danger') + '">'
                    + '<p class="mb-1 fw-bold">' + esc(item.q) + '</p>'
                    + '<p class="mb-0">Your answer: <strong>' + got + '</strong> &nbsp;&middot;&nbsp; Correct: <strong>' + item.a + '</strong> '
                    + (ok ? '<span class="badge bg-success">&#10003;</span>' : '<span class="badge bg-danger">&#10007;</span>')
                    + '</p>' + (!ok ? hintHtml(item.hint) : '') + '</div>';
            }

            if (item.type === 'matchSet') {
                var setAnswers = ans || {};
                // Find full choice text from letter
                function choiceLabel(letter) {
                    var found = (item.choices || []).filter(function (c) { return c.split('.')[0].trim() === letter; })[0];
                    return found || letter;
                }
                var setRight = 0;
                var setRows = item.items.map(function (mi, j) {
                    var picked = setAnswers[j] || '';
                    var correct = mi.answer;
                    var rowOk = picked === correct;
                    if (rowOk) setRight++;
                    return '<div class="ms-3 mb-2 p-2 rounded small ' + (rowOk ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10') + '">'
                        + '<p class="mb-1 fw-semibold">' + esc(mi.q) + '</p>'
                        + '<p class="mb-0">Your: <strong>' + (picked ? esc(choiceLabel(picked)) : '&mdash;') + '</strong>'
                        + (!rowOk ? ' &nbsp;&middot;&nbsp; Correct: <strong class="text-success">' + esc(choiceLabel(correct)) + '</strong>' : '')
                        + ' ' + (rowOk ? '&#10003;' : '&#10007;')
                        + '</p>' + (!rowOk ? hintHtml(mi.hint) : '') + '</div>';
                }).join('');
                rev.match += '<div class="mb-3 p-2 rounded border ' + (setRight === item.items.length ? 'border-success' : 'border-danger') + '">'
                    + '<p class="mb-2 fw-bold small">' + esc(item.title) + ' <span class="badge ' + (setRight === item.items.length ? 'bg-success' : 'bg-danger') + '">' + setRight + '/' + item.items.length + '</span></p>'
                    + setRows + '</div>';
            }

            if (item.type === 'mc') {
                var chosen = (ans !== undefined) ? item.options[ans] : 'Unanswered';
                ok  = chosen === item.answer;
                rev.mc += '<div class="mb-2 p-2 rounded small ' + (ok ? 'bg-success bg-opacity-10 border border-success' : 'bg-danger bg-opacity-10 border border-danger') + '">'
                    + '<p class="mb-1 fw-bold">' + esc(item.q) + '</p>'
                    + '<p class="mb-0">Your answer: <span class="' + (ok ? 'text-success' : 'text-danger') + ' fw-bold">' + esc(chosen) + '</span>'
                    + (!ok ? ' &nbsp;&middot;&nbsp; Correct: <span class="text-success fw-bold">' + esc(item.answer) + '</span>' : '')
                    + ' ' + (ok ? '<span class="badge bg-success">&#10003;</span>' : '<span class="badge bg-danger">&#10007;</span>')
                    + '</p>' + (!ok ? hintHtml(item.hint) : '') + '</div>';
            }

            if (item.type === 'label') {
                ok  = ans === item.answer;
                got = ans || '&mdash;';
                rev.label += '<div class="mb-2 p-2 rounded small ' + (ok ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10') + '">'
                    + '<p class="mb-1 fw-semibold">Region ' + item.regionNum + '</p>'
                    + '<p class="mb-0">Your: <strong>' + esc(got) + '</strong> &nbsp;&middot;&nbsp; Correct: <strong>' + esc(item.answer) + '</strong> '
                    + (ok ? '&#10003;' : '&#10007;') + '</p>' + (!ok ? hintHtml(item.hint) : '') + '</div>';
            }
        });

        $c().innerHTML = '<div class="card shadow border-' + (pass ? 'success' : 'warning') + ' mx-auto" style="max-width:760px">'
            + '<div class="card-body p-4 p-md-5">'
            + '<div class="text-center mb-4">'
            + '<h2 class="fw-bold text-' + (pass ? 'success' : 'primary') + ' mb-1">' + (pass ? 'Great Work!' : 'Assessment Complete') + '</h2>'
            + '<p class="text-muted">' + esc(_lName) + ', ' + esc(_fName) + ' &middot; ' + esc(_sClass) + ' &middot; ' + esc(_origConfig.chapterTitle) + '</p>'
            + '</div>'
            + '<div class="p-4 rounded border bg-light mb-4 text-center">'
            + '<div class="display-2 fw-bold text-' + (pass ? 'success' : 'warning') + ' mb-1">' + pct + '%</div>'
            + '<p class="fw-bold text-dark mb-3">' + sc.right + ' of ' + sc.total + ' correct</p>'
            + '<div class="row g-2 text-center">'
            + '<div class="col-3"><div class="fw-bold fs-5 text-primary">' + sc.tfRight + '/' + sc.tfTotal + '</div><div class="small text-muted">True / False</div></div>'
            + '<div class="col-3"><div class="fw-bold fs-5 text-success">' + sc.matchRight + '/' + sc.matchTotal + '</div><div class="small text-muted">Matching</div></div>'
            + '<div class="col-3"><div class="fw-bold fs-5 text-primary">' + sc.mcRight + '/' + sc.mcTotal + '</div><div class="small text-muted">Mult. Choice</div></div>'
            + '<div class="col-3"><div class="fw-bold fs-5 text-warning">' + sc.labelRight + '/' + sc.labelTotal + '</div><div class="small text-muted">Labeling</div></div>'
            + '</div>'
            + (pass ? '<div class="alert alert-success mt-3 mb-0 py-2 small">You are on track for the real WRS assessment!</div>' : '<div class="alert alert-warning mt-3 mb-0 py-2 small">Keep reviewing &mdash; you need 75% to pass the real assessment.</div>')
            + '</div>'
            + '<div class="accordion mb-4" id="wrsReviewAcc">'
            + '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-tf">True / False (' + sc.tfRight + '/' + sc.tfTotal + ')</button></h2><div id="wrs-rev-tf" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">' + rev.tf + '</div></div></div>'
            + '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-match">Matching (' + sc.matchRight + '/' + sc.matchTotal + ')</button></h2><div id="wrs-rev-match" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">' + rev.match + '</div></div></div>'
            + '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-mc">Multiple Choice (' + sc.mcRight + '/' + sc.mcTotal + ')</button></h2><div id="wrs-rev-mc" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">' + rev.mc + '</div></div></div>'
            + '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-label">Labeling (' + sc.labelRight + '/' + sc.labelTotal + ')</button></h2><div id="wrs-rev-label" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">' + rev.label + '</div></div></div>'
            + '</div>'
            + '<div class="d-flex justify-content-center gap-2 flex-wrap">'
            + '<button onclick="window.print()" class="btn btn-outline-secondary px-4">Print Report</button>'
            + '<a href="/index.html" class="btn text-white px-4" style="background:var(--primary-color,#003087)">Return to Dashboard</a>'
            + '</div></div></div>';

        try {
            var stored = JSON.parse(localStorage.getItem('user') || '{}');
            if (stored.student_id && _gbExamId) {
                await fetch('/api/submit-exam', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ student_id: stored.student_id, exam_id: _gbExamId, score: sc.right, total_points: sc.total })
                });
            }
        } catch (e) { console.warn('WRS gradebook sync failed:', e.message); }
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    window.wrsStart = function () {
        _flatQ = buildFlat(_origConfig);
        _qIdx  = 0;
        _ans   = {};
        _calcOpen = false; _scratchText = '';
        _calcDisplay = '0'; _calcPrev = ''; _calcOp = ''; _calcNew = true;
        renderQuestion();
    };

    window.wrsNext = function () {
        _calcOpen = false; _scratchText = '';
        _calcDisplay = '0'; _calcPrev = ''; _calcOp = ''; _calcNew = true;
        _qIdx++;
        renderQuestion();
    };

    window.wrsPrev = function () {
        _calcOpen = false; _scratchText = '';
        _calcDisplay = '0'; _calcPrev = ''; _calcOp = ''; _calcNew = true;
        if (_qIdx > 0) _qIdx--;
        renderQuestion();
    };

    // ── Input handlers ────────────────────────────────────────────────────────
    window.wrsSelectTF = function (val) {
        _ans[_qIdx] = val;
        renderTF(_flatQ[_qIdx]);
    };

    // matchSet: itemIdx = row index within the set, val = letter chosen
    window.wrsSelectMatchSet = function (itemIdx, val) {
        if (!_ans[_qIdx]) _ans[_qIdx] = {};
        _ans[_qIdx][itemIdx] = val;
        renderMatchSet(_flatQ[_qIdx]);
    };

    window.wrsSelectMC = function (i) {
        var calcBody = document.getElementById('mathToolsBody');
        _calcOpen    = !!(calcBody && calcBody.classList.contains('show'));
        var scratch  = document.getElementById('wrs-scratch');
        if (scratch) _scratchText = scratch.value;
        _ans[_qIdx] = i;
        renderMC(_flatQ[_qIdx]);
    };

    window.wrsSelectLabel = function (val) {
        _ans[_qIdx] = val || '';
        renderLabel(_flatQ[_qIdx]);
    };

    // ── Calculator ────────────────────────────────────────────────────────────
    window.wrsCalc = function (key) {
        var d = document.getElementById('wrs-calc-display');
        if (!d) return;

        if (key === 'C') {
            _calcDisplay = '0'; _calcPrev = ''; _calcOp = ''; _calcNew = true;
        } else if (key === '±') {
            _calcDisplay = String(-parseFloat(_calcDisplay || '0'));
        } else if (key === '%') {
            _calcDisplay = String(parseFloat(_calcDisplay || '0') / 100);
        } else if (key === '=') {
            if (_calcOp && _calcPrev !== '') {
                var a = parseFloat(_calcPrev), b = parseFloat(_calcDisplay), r;
                if      (_calcOp === '+') r = a + b;
                else if (_calcOp === '−') r = a - b;
                else if (_calcOp === '×') r = a * b;
                else if (_calcOp === '÷') r = b !== 0 ? a / b : 'Error';
                _calcDisplay = typeof r === 'number' ? String(Math.round(r * 1e10) / 1e10) : r;
                _calcPrev = ''; _calcOp = ''; _calcNew = true;
            }
        } else if (['÷','×','−','+'].indexOf(key) !== -1) {
            _calcPrev = _calcDisplay; _calcOp = key; _calcNew = true;
        } else if (key === '.') {
            if (_calcNew) { _calcDisplay = '0.'; _calcNew = false; }
            else if (_calcDisplay.indexOf('.') === -1) { _calcDisplay += '.'; }
        } else {
            if (_calcNew || _calcDisplay === '0') { _calcDisplay = key; _calcNew = false; }
            else if (_calcDisplay.length < 12)    { _calcDisplay += key; }
        }

        d.value = _calcDisplay;
    };

    // ── Public API ────────────────────────────────────────────────────────────
    window.initWRS = initWRS;
})();
