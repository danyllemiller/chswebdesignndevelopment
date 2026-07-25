// /js/wrsLogic.js — Workplace Readiness Skills Assessment Engine
(function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────────
    let _origConfig = null;   // untouched config for re-shuffle on each attempt
    let _exam      = null;
    let _fName     = '';
    let _lName     = '';
    let _sClass    = '';
    let _studentId = '';
    let _gbExamId  = '';

    let _phase     = 'tf';
    let _tfIdx     = 0;
    let _matchSet  = 0;
    let _matchItem = 0;
    let _mcIdx     = 0;
    let _labelIdx  = 0;

    let _answers   = { tf: {}, match: {}, mc: {}, label: {} };

    // calculator/scratchpad persistence across same-question re-renders
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

    function shuffleExam(cfg) {
        return {
            chapterTitle:    cfg.chapterTitle,
            gradebookExamId: cfg.gradebookExamId,
            // shuffle T/F question order
            tfSection: shuffle(cfg.tfSection),
            // shuffle item order within each matching set (choices/letters stay A-F)
            matchSection: cfg.matchSection.map(function (set) {
                return { title: set.title, choices: set.choices, items: shuffle(set.items) };
            }),
            // shuffle question order AND answer-option order for each MC question
            mcSection: shuffle(cfg.mcSection).map(function (q) {
                return { q: q.q, options: shuffle(q.options), answer: q.answer, math: q.math };
            }),
            // label section: keep fixed (SVG regions are numbered 1-6, diagram is spatial)
            labelSection: cfg.labelSection
        };
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
    function totalItems() {
        var tfT = _exam.tfSection.length;
        var mT  = _exam.matchSection.reduce(function (s, st) { return s + st.items.length; }, 0);
        var mcT = _exam.mcSection.length;
        var lT  = (_exam.labelSection || []).reduce(function (s, d) { return s + d.items.length; }, 0);
        return tfT + mT + mcT + lT;
    }

    function answeredCount() {
        var dTF    = Object.keys(_answers.tf).length;
        var dMatch = _exam.matchSection.reduce(function (s, _, si) {
            return s + Object.values(_answers.match[si] || {}).filter(Boolean).length;
        }, 0);
        var dMC    = Object.keys(_answers.mc).length;
        var dLabel = (_exam.labelSection || []).reduce(function (s, _, di) {
            return s + Object.values(_answers.label[di] || {}).filter(Boolean).length;
        }, 0);
        return dTF + dMatch + dMC + dLabel;
    }

    function currentGlobalNum() {
        var tfT     = _exam.tfSection.length;
        var mT      = _exam.matchSection.reduce(function (s, st) { return s + st.items.length; }, 0);
        var mcT     = _exam.mcSection.length;
        var mBefore = _exam.matchSection.slice(0, _matchSet).reduce(function (s, st) { return s + st.items.length; }, 0);
        if (_phase === 'tf')    return _tfIdx + 1;
        if (_phase === 'match') return tfT + mBefore + _matchItem + 1;
        if (_phase === 'mc')    return tfT + mT + _mcIdx + 1;
        if (_phase === 'label') return tfT + mT + mcT + _labelIdx + 1;
        return totalItems();
    }

    function progressBar() {
        var pct = Math.min(100, Math.round(answeredCount() / totalItems() * 100));
        var cur = currentGlobalNum();
        var tot = totalItems();
        return '<div class="d-flex justify-content-between align-items-center mb-1" style="font-size:.8rem;color:#6c757d">'
            + '<span>Question <strong>' + cur + '</strong> of <strong>' + tot + '</strong></span>'
            + '<span><strong>' + pct + '%</strong> complete</span>'
            + '</div>'
            + '<div class="progress mb-4" style="height:6px;border-radius:3px"><div class="progress-bar" style="background:var(--primary-color,#003087);width:' + pct + '%"></div></div>';
    }

    // ── Shared card wrapper ───────────────────────────────────────────────────
    function cardShell(accent, sectionLabel, bodyHtml, footerHtml) {
        return '<div class="card shadow-sm border-0">'
            + '<div class="card-body p-4 p-md-5">'
            + '<div class="d-flex justify-content-between align-items-center mb-1" style="font-size:.8rem;color:#6c757d">'
            + '<span><strong>' + esc(_lName) + ', ' + esc(_fName) + '</strong> &middot; ' + esc(_sClass) + '</span>'
            + '<span class="badge fw-semibold" style="background:' + accent + '">' + sectionLabel + '</span>'
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
        _exam       = config;   // replaced with shuffled copy in wrsStart
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
        var tfCt   = _exam.tfSection.length;
        var mItems = _exam.matchSection.reduce(function (s, st) { return s + st.items.length; }, 0);
        var mcCt   = _exam.mcSection.length;
        var lItems = (_exam.labelSection || []).reduce(function (s, d) { return s + d.items.length; }, 0);
        var total  = tfCt + mItems + mcCt + lItems;

        $c().innerHTML = '<div class="card shadow border-primary mx-auto" style="max-width:580px">'
            + '<div class="card-header text-white text-center py-3" style="background:var(--primary-color,#003087)">'
            + '<h4 class="mb-0 fw-bold">' + esc(_exam.chapterTitle) + '</h4>'
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
            + '<strong>Assessment Breakdown &mdash; ' + total + ' total questions</strong>'
            + '<ul class="mb-0 mt-2">'
            + '<li><strong>Part 1:</strong> True / False (' + tfCt + ' questions)</li>'
            + '<li><strong>Part 2:</strong> Matching (' + mItems + ' questions)</li>'
            + '<li><strong>Part 3:</strong> Multiple Choice (' + mcCt + ' questions)</li>'
            + '<li><strong>Part 4:</strong> Labeling (' + lItems + ' questions)</li>'
            + '</ul>'
            + '<p class="mt-2 mb-0 fst-italic">One question at a time &mdash; no penalty for guessing. Passing score on the real WRS exam is <strong>75%</strong>.</p>'
            + '</div>'
            + '<button onclick="wrsStart()" class="btn btn-lg w-100 fw-bold shadow-sm text-white" style="background:var(--primary-color,#003087)">Begin Assessment</button>'
            + '</div></div>';
    }

    // ── Phase dispatcher ──────────────────────────────────────────────────────
    function renderPhase() {
        if (_phase === 'tf')    { renderTF();       return; }
        if (_phase === 'match') { renderMatchSet(); return; }
        if (_phase === 'mc')    { renderMC();       return; }
        if (_phase === 'label') { renderLabel();    return; }
        renderResults();
    }

    // ── Part 1: True / False — one at a time ─────────────────────────────────
    function renderTF() {
        var items   = _exam.tfSection;
        var item    = items[_tfIdx];
        var sel     = _answers.tf[_tfIdx];
        var isFirst = _tfIdx === 0;
        var isLast  = _tfIdx === items.length - 1;

        var body = '<div class="text-center mb-5">'
            + '<span class="badge mb-3 fw-semibold px-3 py-2" style="background:#003087;font-size:.8rem;letter-spacing:.04em">PART 1 &mdash; TRUE / FALSE</span>'
            + '<h4 class="fw-bold lh-base" style="font-size:1.15rem">' + esc(item.q) + '</h4>'
            + '</div>'
            + '<div class="d-flex justify-content-center gap-3">'
            + '<button onclick="wrsSelectTF(' + _tfIdx + ',\'T\')" class="btn btn-lg px-5 fw-bold ' + (sel === 'T' ? 'btn-primary text-white' : 'btn-outline-secondary') + '" style="min-width:130px">True</button>'
            + '<button onclick="wrsSelectTF(' + _tfIdx + ',\'F\')" class="btn btn-lg px-5 fw-bold ' + (sel === 'F' ? 'btn-danger text-white' : 'btn-outline-secondary') + '" style="min-width:130px">False</button>'
            + '</div>';

        var nextLabel = isLast ? 'Next: Matching &rarr;' : 'Next &rarr;';
        var footer = '<button onclick="wrsPrev()" class="btn btn-outline-secondary fw-bold px-4" ' + (isFirst ? 'disabled' : '') + '>&larr; Back</button>'
            + '<button onclick="wrsNext()" class="btn fw-bold px-5 text-white" style="background:#003087" ' + (sel !== undefined ? '' : 'disabled') + '>' + nextLabel + '</button>';

        $c().innerHTML = cardShell('#003087', 'Part 1 &mdash; True / False', body, footer);
    }

    // ── Part 2: Matching — one item at a time ─────────────────────────────────
    function renderMatchSet() {
        var set        = _exam.matchSection[_matchSet];
        var item       = set.items[_matchItem];
        var setAns     = _answers.match[_matchSet] || {};
        var sel        = setAns[_matchItem] || '';
        var totalSets  = _exam.matchSection.length;
        var totalInSet = set.items.length;
        var isFirstAll = _matchSet === 0 && _matchItem === 0;
        var isLastAll  = _matchSet === totalSets - 1 && _matchItem === totalInSet - 1;

        var choicesHtml = '<div class="p-3 mb-4 rounded border" style="background:#f8f9fa">'
            + '<p class="small fw-bold text-muted mb-2" style="text-transform:uppercase;letter-spacing:.05em">Answer Choices &mdash; ' + esc(set.title) + '</p>'
            + set.choices.map(function (c) {
                var letter = c.split('.')[0].trim();
                var active = sel === letter;
                return '<div class="d-inline-block me-1 mb-1 px-3 py-1 rounded border fw-semibold small" style="background:' + (active ? '#198754' : '#fff') + ';color:' + (active ? '#fff' : '#333') + ';border-color:' + (active ? '#198754' : '#dee2e6') + '!important">' + esc(c) + '</div>';
            }).join('')
            + '</div>';

        var opts = set.choices.map(function (c) {
            var letter = c.split('.')[0].trim();
            return '<option value="' + letter + '"' + (sel === letter ? ' selected' : '') + '>' + esc(c) + '</option>';
        }).join('');

        var body = '<div class="text-center mb-3">'
            + '<span class="badge mb-2 fw-semibold px-3 py-2" style="background:#198754;font-size:.8rem;letter-spacing:.04em">PART 2 &mdash; MATCHING</span>'
            + '<p class="small text-muted mb-0 mt-1">Set ' + (_matchSet + 1) + ' of ' + totalSets + ' &nbsp;&bull;&nbsp; Item ' + (_matchItem + 1) + ' of ' + totalInSet + '</p>'
            + '</div>'
            + choicesHtml
            + '<div class="p-4 rounded border-2 border mb-2" style="background:#f0fff4;border-style:solid;border-width:2px;border-color:#198754">'
            + '<p class="fw-bold mb-3 lh-base">' + esc(item.q) + '</p>'
            + '<select class="form-select fw-bold" style="color:#198754;font-size:1rem" onchange="wrsSelectMatch(' + _matchSet + ',' + _matchItem + ',this.value)">'
            + '<option value="">&mdash; Choose the correct letter &mdash;</option>' + opts
            + '</select>'
            + '</div>';

        var nextLabel = isLastAll ? 'Next: Multiple Choice &rarr;' : 'Next &rarr;';
        var footer = '<button onclick="wrsPrev()" class="btn btn-outline-secondary fw-bold px-4" ' + (isFirstAll ? 'disabled' : '') + '>&larr; Back</button>'
            + '<button onclick="wrsNext()" class="btn fw-bold px-5 text-white" style="background:#198754" ' + (sel ? '' : 'disabled') + '>' + nextLabel + '</button>';

        $c().innerHTML = cardShell('#198754', 'Part 2 &mdash; Matching', body, footer);
    }

    // ── Calculator widget ─────────────────────────────────────────────────────
    function calcWidget() {
        var keys = ['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='];
        var btnHtml = keys.map(function (k) {
            var isOp    = ['÷','×','−','+'].indexOf(k) !== -1;
            var isFn    = ['C','±','%'].indexOf(k) !== -1;
            var isEq    = k === '=';
            var isZero  = k === '0';
            var cls     = isEq    ? 'btn-warning fw-bold'
                        : isOp   ? 'btn-outline-secondary fw-bold'
                        : isFn   ? 'btn-outline-secondary'
                        : 'btn-light border fw-bold';
            var span    = isZero ? 'grid-column:span 2;' : '';
            return '<button onclick="wrsCalc(\'' + k + '\')" class="btn btn-sm ' + cls + '" style="padding:.45rem .2rem;font-size:.9rem;' + span + '">' + k + '</button>';
        }).join('');

        return '<div class="mt-1 mb-4">'
            + '<div class="accordion" id="mathToolsAcc">'
            + '<div class="accordion-item" style="border-color:#ffc107">'
            + '<h2 class="accordion-header">'
            + '<button class="accordion-button ' + (_calcOpen ? '' : 'collapsed') + ' fw-bold py-2" style="background:#fff8e1;color:#7c5700;font-size:.9rem" type="button" data-bs-toggle="collapse" data-bs-target="#mathToolsBody">'
            + '&#x1F9EE; Calculator &amp; Scratch Pad &nbsp;<span class="badge bg-warning text-dark ms-1" style="font-size:.7rem">Math Tool</span>'
            + '</button>'
            + '</h2>'
            + '<div id="mathToolsBody" class="accordion-collapse collapse ' + (_calcOpen ? 'show' : '') + '">'
            + '<div class="accordion-body p-3" style="background:#fffdf0">'
            + '<div class="row g-3 align-items-start">'
            + '<div class="col-md-5">'
            + '<p class="small fw-bold text-muted mb-2" style="text-transform:uppercase;letter-spacing:.05em">Calculator</p>'
            + '<div class="border rounded p-2 bg-white" style="max-width:210px;margin:0 auto">'
            + '<input id="wrs-calc-display" type="text" readonly class="form-control text-end fw-bold mb-2 border-0 bg-light" value="' + esc(_calcDisplay) + '" style="font-size:1.5rem;font-family:monospace;letter-spacing:1px">'
            + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">'
            + btnHtml
            + '</div></div></div>'
            + '<div class="col-md-7">'
            + '<label class="form-label small fw-bold text-muted" style="text-transform:uppercase;letter-spacing:.05em">Scratch Pad</label>'
            + '<textarea id="wrs-scratch" class="form-control" rows="8" placeholder="Work out your math here&#x2026;" style="font-family:monospace;font-size:.9rem;resize:none">' + esc(_scratchText) + '</textarea>'
            + '</div>'
            + '</div>'
            + '</div></div></div></div></div>';
    }

    // ── Part 3: Multiple Choice — one at a time ───────────────────────────────
    function renderMC() {
        var questions = _exam.mcSection;
        var q         = questions[_mcIdx];
        var sel       = _answers.mc[_mcIdx];
        var isFirst   = _mcIdx === 0;
        var isLast    = _mcIdx === questions.length - 1;
        var hasLabel  = _exam.labelSection && _exam.labelSection.length;
        var nextLabel = isLast ? (hasLabel ? 'Next: Labeling &rarr;' : 'Submit Assessment') : 'Next &rarr;';

        var optHtml = q.options.map(function (opt, i) {
            var chosen = sel === i;
            return '<div class="mb-2">'
                + '<div class="p-3 rounded border-2 border d-flex align-items-center gap-3" onclick="wrsSelectMC(' + i + ')" style="cursor:pointer;border-width:2px!important;border-color:' + (chosen ? '#0d6efd' : '#dee2e6') + '!important;background:' + (chosen ? '#e8f0fe' : '#fff') + '">'
                + '<div class="flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center fw-bold" style="width:32px;height:32px;min-width:32px;border:2px solid ' + (chosen ? '#0d6efd' : '#adb5bd') + ';background:' + (chosen ? '#0d6efd' : 'transparent') + ';color:' + (chosen ? '#fff' : '#555') + ';font-size:.85rem">'
                + String.fromCharCode(65 + i)
                + '</div>'
                + '<span class="fw-semibold" style="pointer-events:none;font-size:.95rem">' + esc(opt) + '</span>'
                + '</div></div>';
        }).join('');

        var mathHtml = q.math ? calcWidget() : '';

        var body = '<div class="text-center mb-4">'
            + '<span class="badge mb-3 fw-semibold px-3 py-2" style="background:#003087;font-size:.8rem;letter-spacing:.04em">PART 3 &mdash; MULTIPLE CHOICE</span>'
            + '<h4 class="fw-bold lh-base" style="font-size:1.1rem">' + esc(q.q) + '</h4>'
            + '</div>'
            + mathHtml
            + '<div>' + optHtml + '</div>';

        var footer = '<button onclick="wrsPrev()" class="btn btn-outline-secondary fw-bold px-4" ' + (isFirst ? 'disabled' : '') + '>&larr; Back</button>'
            + '<button onclick="wrsNext()" class="btn fw-bold px-5 text-white" style="background:#003087" ' + (sel !== undefined ? '' : 'disabled') + '>' + nextLabel + '</button>';

        $c().innerHTML = cardShell('#003087', 'Part 3 &mdash; Multiple Choice', body, footer);
    }

    // ── Part 4: Labeling — one region at a time, diagram always visible ───────
    function renderLabel() {
        var diag     = _exam.labelSection[0];
        var diagAns  = _answers.label[0] || {};
        var sel      = diagAns[_labelIdx] || '';
        var isFirst  = _labelIdx === 0;
        var isLast   = _labelIdx === diag.items.length - 1;
        var nextLabel = isLast ? 'Submit Assessment' : 'Next &rarr;';

        var opts = diag.wordBank.map(function (w) {
            return '<option value="' + esc(w) + '"' + (sel === w ? ' selected' : '') + '>' + esc(w) + '</option>';
        }).join('');

        var wbHtml = diag.wordBank.map(function (w) {
            return '<span class="badge bg-white border text-dark me-1 mb-1 fw-normal" style="font-size:.8rem">' + esc(w) + '</span>';
        }).join('');

        var body = '<div class="text-center mb-3">'
            + '<span class="badge mb-2 fw-semibold px-3 py-2" style="background:#fd7e14;font-size:.8rem;letter-spacing:.04em">PART 4 &mdash; LABELING</span>'
            + '<p class="fw-bold mt-1 mb-0" style="font-size:.95rem">' + esc(diag.title) + '</p>'
            + '</div>'
            + '<div class="mb-3">' + diag.svg + '</div>'
            + '<div class="p-3 bg-light rounded border mb-3">'
            + '<p class="small fw-bold text-muted mb-2" style="text-transform:uppercase;letter-spacing:.05em">Word Bank</p>'
            + '<div>' + wbHtml + '</div>'
            + '</div>'
            + '<div class="p-3 rounded" style="background:#fff8f0;border:2px solid #fd7e14">'
            + '<label class="fw-bold mb-2 d-block">'
            + '<span class="badge me-2 fw-bold" style="background:#fd7e14;font-size:.85rem">Region ' + (_labelIdx + 1) + ' of ' + diag.items.length + '</span>'
            + 'What is the section labeled <strong>' + (_labelIdx + 1) + '</strong> on this pay stub?'
            + '</label>'
            + '<select class="form-select fw-bold" style="color:#fd7e14;font-size:1rem" onchange="wrsSelectLabel(0,' + _labelIdx + ',this.value)">'
            + '<option value="">&mdash; select label &mdash;</option>' + opts
            + '</select>'
            + '</div>';

        var footer = '<button onclick="wrsPrev()" class="btn btn-outline-secondary fw-bold px-4" ' + (isFirst ? 'disabled' : '') + '>&larr; Back</button>'
            + '<button onclick="wrsNext()" class="btn fw-bold px-5 ' + (isLast ? 'text-dark' : 'text-white') + '" style="background:' + (isLast ? '#ffc107' : '#fd7e14') + '" ' + (sel ? '' : 'disabled') + '>' + nextLabel + '</button>';

        $c().innerHTML = cardShell('#fd7e14', 'Part 4 &mdash; Labeling', body, footer);
    }

    // ── Grading ───────────────────────────────────────────────────────────────
    function gradeAll() {
        var tfRight = 0, matchRight = 0, mcRight = 0, labelRight = 0;

        _exam.tfSection.forEach(function (item, i) {
            if (_answers.tf[i] === item.a) tfRight++;
        });
        _exam.matchSection.forEach(function (set, s) {
            set.items.forEach(function (item, i) {
                if ((_answers.match[s] || {})[i] === item.answer) matchRight++;
            });
        });
        _exam.mcSection.forEach(function (q, i) {
            var sel = _answers.mc[i];
            if (sel !== undefined && q.options[sel] === q.answer) mcRight++;
        });
        (_exam.labelSection || []).forEach(function (diag, d) {
            diag.items.forEach(function (item, i) {
                if ((_answers.label[d] || {})[i] === item.answer) labelRight++;
            });
        });

        var tfTotal    = _exam.tfSection.length;
        var matchTotal = _exam.matchSection.reduce(function (s, st) { return s + st.items.length; }, 0);
        var mcTotal    = _exam.mcSection.length;
        var labelTotal = (_exam.labelSection || []).reduce(function (s, d) { return s + d.items.length; }, 0);
        var total      = tfTotal + matchTotal + mcTotal + labelTotal;
        var right      = tfRight + matchRight + mcRight + labelRight;

        return { tfRight, tfTotal, matchRight, matchTotal, mcRight, mcTotal, labelRight, labelTotal, total, right };
    }

    // ── Results ───────────────────────────────────────────────────────────────
    async function renderResults() {
        $c().innerHTML = '<div class="text-center p-5 bg-white shadow-sm rounded"><div class="spinner-border text-primary"></div><h3 class="mt-4 text-primary">Calculating results&hellip;</h3></div>';

        var sc   = gradeAll();
        var pct  = Math.round(sc.right / sc.total * 100);
        var pass = pct >= 75;

        var tfRev = _exam.tfSection.map(function (item, i) {
            var got = _answers.tf[i];
            var ok  = got === item.a;
            return '<div class="mb-2 p-2 rounded small ' + (ok ? 'bg-success bg-opacity-10 border border-success' : 'bg-danger bg-opacity-10 border border-danger') + '">'
                + '<p class="mb-1 fw-bold">' + (i + 1) + '. ' + esc(item.q) + '</p>'
                + '<p class="mb-0">Your answer: <strong>' + (got || '&mdash;') + '</strong> &nbsp;&middot;&nbsp; Correct: <strong>' + item.a + '</strong> '
                + (ok ? '<span class="badge bg-success">&#10003;</span>' : '<span class="badge bg-danger">&#10007;</span>')
                + '</p></div>';
        }).join('');

        var matchRev = _exam.matchSection.map(function (set, s) {
            return '<div class="mb-3"><p class="fw-bold small mb-1">' + esc(set.title) + '</p>'
                + set.items.map(function (item, i) {
                    var got = (_answers.match[s] || {})[i] || '&mdash;';
                    var ok  = got === item.answer;
                    return '<div class="mb-1 p-2 rounded small ' + (ok ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10') + '">'
                        + esc(item.q) + ' &rarr; Your: <strong>' + got + '</strong> &nbsp;&middot;&nbsp; Correct: <strong>' + item.answer + '</strong> '
                        + (ok ? '&#10003;' : '&#10007;') + '</div>';
                }).join('') + '</div>';
        }).join('');

        var mcRev = _exam.mcSection.map(function (q, i) {
            var sel    = _answers.mc[i];
            var chosen = sel !== undefined ? q.options[sel] : 'Unanswered';
            var ok     = chosen === q.answer;
            return '<div class="mb-2 p-2 rounded small ' + (ok ? 'bg-success bg-opacity-10 border border-success' : 'bg-danger bg-opacity-10 border border-danger') + '">'
                + '<p class="mb-1 fw-bold">' + (i + 1) + '. ' + esc(q.q) + '</p>'
                + '<p class="mb-0">Your answer: <span class="' + (ok ? 'text-success' : 'text-danger') + ' fw-bold">' + esc(chosen) + '</span>'
                + (!ok ? ' &nbsp;&middot;&nbsp; Correct: <span class="text-success fw-bold">' + esc(q.answer) + '</span>' : '')
                + ' ' + (ok ? '<span class="badge bg-success">&#10003;</span>' : '<span class="badge bg-danger">&#10007;</span>')
                + '</p></div>';
        }).join('');

        var labelRev = (_exam.labelSection || []).map(function (diag, d) {
            return '<div class="mb-2"><p class="fw-bold small mb-1">' + esc(diag.title) + '</p>'
                + diag.items.map(function (item, i) {
                    var got = (_answers.label[d] || {})[i] || '&mdash;';
                    var ok  = got === item.answer;
                    return '<div class="mb-1 p-2 rounded small ' + (ok ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10') + '">'
                        + 'Region ' + (i + 1) + ': Your: <strong>' + esc(got) + '</strong> &nbsp;&middot;&nbsp; Correct: <strong>' + esc(item.answer) + '</strong> '
                        + (ok ? '&#10003;' : '&#10007;') + '</div>';
                }).join('') + '</div>';
        }).join('');

        $c().innerHTML = '<div class="card shadow border-' + (pass ? 'success' : 'warning') + ' mx-auto" style="max-width:760px">'
            + '<div class="card-body p-4 p-md-5">'
            + '<div class="text-center mb-4">'
            + '<h2 class="fw-bold text-' + (pass ? 'success' : 'primary') + ' mb-1">' + (pass ? 'Great Work!' : 'Assessment Complete') + '</h2>'
            + '<p class="text-muted">' + esc(_lName) + ', ' + esc(_fName) + ' &middot; ' + esc(_sClass) + ' &middot; ' + esc(_exam.chapterTitle) + '</p>'
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
            + '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-tf">Part 1 &mdash; True / False (' + sc.tfRight + '/' + sc.tfTotal + ')</button></h2><div id="wrs-rev-tf" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">' + tfRev + '</div></div></div>'
            + '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-match">Part 2 &mdash; Matching (' + sc.matchRight + '/' + sc.matchTotal + ')</button></h2><div id="wrs-rev-match" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">' + matchRev + '</div></div></div>'
            + '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-mc">Part 3 &mdash; Multiple Choice (' + sc.mcRight + '/' + sc.mcTotal + ')</button></h2><div id="wrs-rev-mc" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">' + mcRev + '</div></div></div>'
            + '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-label">Part 4 &mdash; Labeling (' + sc.labelRight + '/' + sc.labelTotal + ')</button></h2><div id="wrs-rev-label" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">' + labelRev + '</div></div></div>'
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
                    body:    JSON.stringify({ student_id: stored.student_id, exam_id: _gbExamId, score: 15, total_points: 15 })
                });
            }
        } catch (e) { console.warn('WRS gradebook sync failed:', e.message); }
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    window.wrsStart = function () {
        _exam   = shuffleExam(_origConfig);   // fresh random order every attempt
        _phase  = 'tf'; _tfIdx = 0; _matchSet = 0; _matchItem = 0; _mcIdx = 0; _labelIdx = 0;
        _answers = { tf: {}, match: {}, mc: {}, label: {} };
        renderPhase();
    };

    window.wrsNext = function () {
        _calcOpen = false; _scratchText = '';
        if (_phase === 'tf') {
            if (_tfIdx < _exam.tfSection.length - 1) { _tfIdx++; }
            else { _phase = 'match'; _matchSet = 0; _matchItem = 0; }
        } else if (_phase === 'match') {
            var setLen = _exam.matchSection[_matchSet].items.length;
            if (_matchItem < setLen - 1) { _matchItem++; }
            else if (_matchSet < _exam.matchSection.length - 1) { _matchSet++; _matchItem = 0; }
            else { _phase = 'mc'; _mcIdx = 0; }
        } else if (_phase === 'mc') {
            if (_mcIdx < _exam.mcSection.length - 1) { _mcIdx++; }
            else { _phase = (_exam.labelSection && _exam.labelSection.length) ? 'label' : 'done'; _labelIdx = 0; }
        } else if (_phase === 'label') {
            if (_labelIdx < _exam.labelSection[0].items.length - 1) { _labelIdx++; }
            else { _phase = 'done'; }
        }
        renderPhase();
    };

    window.wrsPrev = function () {
        _calcOpen = false; _scratchText = '';
        if (_phase === 'label') {
            if (_labelIdx > 0) { _labelIdx--; }
            else { _phase = 'mc'; _mcIdx = _exam.mcSection.length - 1; }
        } else if (_phase === 'mc') {
            if (_mcIdx > 0) { _mcIdx--; }
            else { _phase = 'match'; _matchSet = _exam.matchSection.length - 1; _matchItem = _exam.matchSection[_matchSet].items.length - 1; }
        } else if (_phase === 'match') {
            if (_matchItem > 0) { _matchItem--; }
            else if (_matchSet > 0) { _matchSet--; _matchItem = _exam.matchSection[_matchSet].items.length - 1; }
            else { _phase = 'tf'; _tfIdx = _exam.tfSection.length - 1; }
        } else if (_phase === 'tf') {
            if (_tfIdx > 0) { _tfIdx--; }
        }
        renderPhase();
    };

    window.wrsFinish = function () {
        _phase = 'done';
        renderResults();
    };

    // ── Input handlers ────────────────────────────────────────────────────────
    window.wrsSelectTF = function (i, val) {
        _answers.tf[i] = val;
        renderTF();
    };

    window.wrsSelectMatch = function (setIdx, itemIdx, val) {
        if (!_answers.match[setIdx]) _answers.match[setIdx] = {};
        _answers.match[setIdx][itemIdx] = val || '';
        renderMatchSet();
    };

    window.wrsSelectMC = function (i) {
        // preserve calculator state before re-render
        var calcBody = document.getElementById('mathToolsBody');
        _calcOpen    = !!(calcBody && calcBody.classList.contains('show'));
        var scratch  = document.getElementById('wrs-scratch');
        if (scratch) _scratchText = scratch.value;

        _answers.mc[_mcIdx] = i;
        renderMC();
    };

    window.wrsSelectLabel = function (diagIdx, partIdx, val) {
        if (!_answers.label[diagIdx]) _answers.label[diagIdx] = {};
        _answers.label[diagIdx][partIdx] = val || '';
        renderLabel();
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
                var a = parseFloat(_calcPrev);
                var b = parseFloat(_calcDisplay);
                var r;
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
