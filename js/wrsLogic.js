// /js/wrsLogic.js — Workplace Readiness Skills Assessment Engine
(function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────────
    let _exam      = null;
    let _fName     = '';
    let _lName     = '';
    let _sClass    = '';
    let _studentId = '';
    let _gbExamId  = '';

    let _phase     = 'tf';   // 'tf' | 'match' | 'mc' | 'label' | 'done'
    let _matchSet  = 0;
    let _mcIdx     = 0;

    let _answers   = { tf: {}, match: {}, mc: {}, label: {} };

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
    function progressPct() {
        var tfTotal    = _exam.tfSection.length;
        var matchTotal = _exam.matchSection.reduce(function (s, st) { return s + st.items.length; }, 0);
        var mcTotal    = _exam.mcSection.length;
        var labelTotal = (_exam.labelSection || []).reduce(function (s, d) { return s + d.items.length; }, 0);
        var total      = tfTotal + matchTotal + mcTotal + labelTotal;
        if (!total) return 0;

        var dTF    = Object.keys(_answers.tf).length;
        var dMatch = Object.keys(_answers.match).reduce(function (s, k) {
            return s + Object.values(_answers.match[k]).filter(Boolean).length;
        }, 0);
        var dMC    = Object.keys(_answers.mc).length;
        var dLabel = Object.keys(_answers.label).reduce(function (s, k) {
            return s + Object.values(_answers.label[k]).filter(Boolean).length;
        }, 0);

        return Math.min(100, Math.round((dTF + dMatch + dMC + dLabel) / total * 100));
    }

    function progressBar() {
        var pct = progressPct();
        return '<div class="progress mb-3" style="height:8px"><div class="progress-bar bg-primary" style="width:' + pct + '%"></div></div>';
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    async function initWRS(config) {
        _exam     = config;
        _gbExamId = config.gradebookExamId || 'WRS-Practice';

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

    // ── Welcome screen ────────────────────────────────────────────────────────
    function renderStart() {
        var tfCt    = _exam.tfSection.length;
        var mItems  = _exam.matchSection.reduce(function (s, st) { return s + st.items.length; }, 0);
        var mcCt    = _exam.mcSection.length;
        var lItems  = (_exam.labelSection || []).reduce(function (s, d) { return s + d.items.length; }, 0);
        var total   = tfCt + mItems + mcCt + lItems;

        $c().innerHTML = `
        <div class="card shadow border-primary mx-auto" style="max-width:580px">
            <div class="card-header text-white text-center py-3" style="background:var(--primary-color,#003087)">
                <h4 class="mb-0 fw-bold">${esc(_exam.chapterTitle)}</h4>
                <p class="mb-0 opacity-75 small">Nevada WRS Practice Assessment</p>
            </div>
            <div class="card-body p-4">
                <div class="alert border py-3 mb-4" style="background:#f0f4ff">
                    <div class="row align-items-center">
                        <div class="col-8">
                            <span class="text-muted small fw-bold text-uppercase" style="letter-spacing:.05em">Verified Student</span>
                            <div class="h5 mb-0 fw-bold text-dark">${esc(_lName)}, ${esc(_fName)}</div>
                        </div>
                        <div class="col-4 border-start text-center">
                            <span class="text-muted small fw-bold text-uppercase" style="letter-spacing:.05em">Period</span>
                            <div class="h5 mb-0 fw-bold text-primary">${esc(_sClass)}</div>
                        </div>
                    </div>
                </div>
                <div class="alert alert-light border small mb-4">
                    <strong>Assessment Breakdown — ${total} total items</strong>
                    <ul class="mb-0 mt-2">
                        <li><strong>Part 1:</strong> True / False (${tfCt} items)</li>
                        <li><strong>Part 2:</strong> Matching (${mItems} items in ${_exam.matchSection.length} sets)</li>
                        <li><strong>Part 3:</strong> Multiple Choice (${mcCt} items)</li>
                        <li><strong>Part 4:</strong> Labeling (${lItems} items)</li>
                    </ul>
                    <p class="mt-2 mb-0 fst-italic">Answer every item — no penalty for guessing. The passing score on the real WRS exam is <strong>75%</strong>.</p>
                </div>
                <button onclick="wrsStart()" class="btn btn-lg w-100 fw-bold shadow-sm text-white" style="background:var(--primary-color,#003087)">
                    Begin Assessment
                </button>
            </div>
        </div>`;
    }

    // ── Phase dispatcher ──────────────────────────────────────────────────────
    function renderPhase() {
        if (_phase === 'tf')    { renderTF();       return; }
        if (_phase === 'match') { renderMatchSet(); return; }
        if (_phase === 'mc')    { renderMC();       return; }
        if (_phase === 'label') { renderLabel();    return; }
        renderResults();
    }

    // ── Part 1: True / False ──────────────────────────────────────────────────
    function renderTF() {
        var items       = _exam.tfSection;
        var allAnswered = items.every(function (_, i) { return _answers.tf[i] !== undefined; });
        var doneCount   = Object.keys(_answers.tf).length;

        var rows = items.map(function (item, i) {
            var selT = _answers.tf[i] === 'T';
            var selF = _answers.tf[i] === 'F';
            return `<div class="mb-3 p-3 rounded border ${_answers.tf[i] !== undefined ? 'border-primary bg-light' : ''}">
                <p class="fw-semibold mb-2" style="font-size:.95rem">${i + 1}. ${esc(item.q)}</p>
                <div class="d-flex gap-2">
                    <button onclick="wrsSelectTF(${i},'T')" class="btn btn-sm fw-bold px-4 ${selT ? 'btn-primary' : 'btn-outline-secondary'}">True</button>
                    <button onclick="wrsSelectTF(${i},'F')" class="btn btn-sm fw-bold px-4 ${selF ? 'btn-danger' : 'btn-outline-secondary'}">False</button>
                </div>
            </div>`;
        }).join('');

        $c().innerHTML = `
        <div class="card shadow-sm">
            <div class="card-header text-white d-flex justify-content-between align-items-center" style="background:#003087">
                <div>
                    <h5 class="mb-0 fw-bold">Part 1 — True / False</h5>
                    <small class="opacity-75">Select True or False for each statement</small>
                </div>
                <span class="badge bg-white fw-bold" style="color:#003087;font-size:.85rem">${doneCount}/${items.length}</span>
            </div>
            <div class="card-body p-4">
                ${progressBar()}
                ${rows}
            </div>
            <div class="card-footer d-flex justify-content-end p-3">
                <button onclick="wrsNext()" class="btn fw-bold px-5 text-white" style="background:#003087" ${allAnswered ? '' : 'disabled'}>
                    Next: Matching &rarr;
                </button>
            </div>
        </div>`;
    }

    // ── Part 2: Matching ──────────────────────────────────────────────────────
    function renderMatchSet() {
        var set         = _exam.matchSection[_matchSet];
        var setAns      = _answers.match[_matchSet] || {};
        var doneCount   = Object.values(setAns).filter(Boolean).length;
        var allAnswered = set.items.every(function (_, i) { return setAns[i]; });
        var totalSets   = _exam.matchSection.length;
        var isLastSet   = _matchSet === totalSets - 1;

        var choicesHtml = set.choices.map(function (c) {
            return '<span class="badge bg-light text-dark border me-1 mb-1 fw-normal" style="font-size:.8rem">' + esc(c) + '</span>';
        }).join('');

        var rows = set.items.map(function (item, i) {
            var sel = setAns[i] || '';
            var opts = set.choices.map(function (c) {
                var letter = c.split('.')[0].trim();
                return '<option value="' + letter + '"' + (sel === letter ? ' selected' : '') + '>' + letter + '</option>';
            }).join('');
            return `<div class="mb-3 p-3 rounded border ${sel ? 'border-success bg-light' : ''}">
                <div class="d-flex gap-3 align-items-start">
                    <select class="form-select form-select-sm fw-bold text-success flex-shrink-0" style="width:74px" onchange="wrsSelectMatch(${_matchSet},${i},this.value)">
                        <option value="">—</option>${opts}
                    </select>
                    <p class="mb-0 small fw-semibold">${esc(item.q)}</p>
                </div>
            </div>`;
        }).join('');

        $c().innerHTML = `
        <div class="card shadow-sm">
            <div class="card-header text-white d-flex justify-content-between align-items-center" style="background:#198754">
                <div>
                    <h5 class="mb-0 fw-bold">Part 2 — Matching (Set ${_matchSet + 1} of ${totalSets})</h5>
                    <small class="opacity-75">${esc(set.title)}</small>
                </div>
                <span class="badge bg-white fw-bold" style="color:#198754;font-size:.85rem">${doneCount}/${set.items.length}</span>
            </div>
            <div class="card-body p-4">
                ${progressBar()}
                <div class="mb-3 p-3 bg-light rounded border">
                    <p class="small fw-bold text-muted mb-2 text-uppercase" style="letter-spacing:.05em">Answer Choices</p>
                    <div>${choicesHtml}</div>
                </div>
                ${rows}
            </div>
            <div class="card-footer d-flex justify-content-between gap-2 p-3">
                <button onclick="wrsPrev()" class="btn btn-outline-secondary fw-bold px-4">&larr; Back</button>
                <button onclick="wrsNext()" class="btn fw-bold px-5 text-white" style="background:#198754" ${allAnswered ? '' : 'disabled'}>
                    ${isLastSet ? 'Next: Multiple Choice &rarr;' : 'Next Set &rarr;'}
                </button>
            </div>
        </div>`;
    }

    // ── Part 3: Multiple Choice ───────────────────────────────────────────────
    function renderMC() {
        var questions = _exam.mcSection;
        var q         = questions[_mcIdx];
        var sel       = _answers.mc[_mcIdx];
        var isLast    = _mcIdx === questions.length - 1;

        var optHtml = q.options.map(function (opt, i) {
            var chosen = sel === i;
            return `<div class="col-md-6 mb-3">
                <div class="card h-100 ${chosen ? 'border-primary bg-light' : 'border'}" onclick="wrsSelectMC(${i})" style="cursor:pointer;border-width:2px!important">
                    <div class="card-body d-flex align-items-center gap-2">
                        <input type="radio" class="form-check-input flex-shrink-0 mt-0" ${chosen ? 'checked' : ''} style="pointer-events:none">
                        <span class="fw-semibold small" style="pointer-events:none">${esc(opt)}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        $c().innerHTML = `
        <div class="card shadow-sm border-0">
            <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-center mb-1 small text-muted">
                    <span><strong>${esc(_lName)}, ${esc(_fName)}</strong> &middot; ${esc(_sClass)}</span>
                    <span>Part 3 &mdash; Multiple Choice</span>
                </div>
                ${progressBar()}
                <div class="text-center mb-4">
                    <span class="badge mb-2" style="background:#003087;font-size:.8rem">Question ${_mcIdx + 1} of ${questions.length}</span>
                    <h4 class="fw-bold lh-base">${esc(q.q)}</h4>
                </div>
                <div class="row px-1">${optHtml}</div>
            </div>
            <div class="card-footer d-flex justify-content-between p-3">
                <button onclick="wrsPrev()" class="btn btn-outline-secondary fw-bold px-4">&larr; Back</button>
                <button onclick="wrsNext()" class="btn fw-bold px-5 text-white" style="background:#003087" ${sel !== undefined ? '' : 'disabled'}>
                    ${isLast ? 'Next: Labeling &rarr;' : 'Next &rarr;'}
                </button>
            </div>
        </div>`;
    }

    // ── Part 4: Labeling ──────────────────────────────────────────────────────
    function renderLabel() {
        var diag      = _exam.labelSection[0];
        var diagAns   = _answers.label[0] || {};
        var doneCount = Object.values(diagAns).filter(Boolean).length;
        var allDone   = diag.items.every(function (_, i) { return diagAns[i]; });

        var wbHtml = diag.wordBank.map(function (w) {
            return '<span class="badge bg-light text-dark border me-1 mb-1 fw-normal" style="font-size:.8rem">' + esc(w) + '</span>';
        }).join('');

        var labelsHtml = diag.items.map(function (item, i) {
            var sel  = diagAns[i] || '';
            var opts = diag.wordBank.map(function (w) {
                return '<option value="' + esc(w) + '"' + (sel === w ? ' selected' : '') + '>' + esc(w) + '</option>';
            }).join('');
            return `<div class="d-flex align-items-center mb-2 gap-2">
                <span class="badge flex-shrink-0 text-center fw-bold" style="width:28px;height:28px;line-height:20px;background:#fd7e14;font-size:.75rem">${i + 1}</span>
                <select class="form-select form-select-sm fw-semibold" style="color:#fd7e14" onchange="wrsSelectLabel(0,${i},this.value)">
                    <option value="">— select label —</option>${opts}
                </select>
            </div>`;
        }).join('');

        $c().innerHTML = `
        <div class="card shadow-sm">
            <div class="card-header text-dark d-flex justify-content-between align-items-center" style="background:#ffc107">
                <div>
                    <h5 class="mb-0 fw-bold">Part 4 — Labeling</h5>
                    <small>Identify the numbered region in the diagram</small>
                </div>
                <span class="badge bg-white fw-bold" style="color:#fd7e14;font-size:.85rem;border:1px solid #fd7e14">${doneCount}/${diag.items.length}</span>
            </div>
            <div class="card-body p-4">
                ${progressBar()}
                <h6 class="fw-bold mb-3">${esc(diag.title)}</h6>
                <div class="mb-4">${diag.svg}</div>
                <div class="p-3 bg-light rounded border mb-3">
                    <p class="small fw-bold text-muted mb-2 text-uppercase" style="letter-spacing:.05em">Word Bank</p>
                    <div>${wbHtml}</div>
                </div>
                <h6 class="fw-bold mb-2">Match each number to the correct HTML element:</h6>
                ${labelsHtml}
            </div>
            <div class="card-footer d-flex justify-content-between p-3">
                <button onclick="wrsPrev()" class="btn btn-outline-secondary fw-bold px-4">&larr; Back</button>
                <button onclick="wrsFinish()" class="btn fw-bold px-5 text-dark" style="background:#ffc107" ${allDone ? '' : 'disabled'}>
                    Submit Assessment
                </button>
            </div>
        </div>`;
    }

    // ── Grading ───────────────────────────────────────────────────────────────
    function gradeAll() {
        var tfRight    = 0;
        var matchRight = 0;
        var mcRight    = 0;
        var labelRight = 0;

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

        var sc  = gradeAll();
        var pct = Math.round(sc.right / sc.total * 100);
        var pass = pct >= 75;

        // build review sections
        var tfRev = _exam.tfSection.map(function (item, i) {
            var got     = _answers.tf[i];
            var correct = got === item.a;
            return '<div class="mb-2 p-2 rounded small ' + (correct ? 'bg-success bg-opacity-10 border border-success' : 'bg-danger bg-opacity-10 border border-danger') + '">'
                + '<p class="mb-1 fw-bold">' + (i + 1) + '. ' + esc(item.q) + '</p>'
                + '<p class="mb-0">Your answer: <strong>' + (got || '—') + '</strong> &nbsp;·&nbsp; Correct: <strong>' + item.a + '</strong> '
                + (correct ? '<span class="badge bg-success">✓</span>' : '<span class="badge bg-danger">✗</span>')
                + '</p></div>';
        }).join('');

        var matchRev = _exam.matchSection.map(function (set, s) {
            var rows = set.items.map(function (item, i) {
                var got     = (_answers.match[s] || {})[i] || '—';
                var correct = got === item.answer;
                return '<div class="mb-1 p-2 rounded small ' + (correct ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10') + '">'
                    + esc(item.q) + ' &rarr; Your: <strong>' + got + '</strong> &nbsp;·&nbsp; Correct: <strong>' + item.answer + '</strong> '
                    + (correct ? '&#10003;' : '&#10007;') + '</div>';
            }).join('');
            return '<div class="mb-3"><p class="fw-bold small mb-1">' + esc(set.title) + '</p>' + rows + '</div>';
        }).join('');

        var mcRev = _exam.mcSection.map(function (q, i) {
            var sel    = _answers.mc[i];
            var chosen = sel !== undefined ? q.options[sel] : 'Unanswered';
            var correct = chosen === q.answer;
            return '<div class="mb-2 p-2 rounded small ' + (correct ? 'bg-success bg-opacity-10 border border-success' : 'bg-danger bg-opacity-10 border border-danger') + '">'
                + '<p class="mb-1 fw-bold">' + (i + 1) + '. ' + esc(q.q) + '</p>'
                + '<p class="mb-0">Your answer: <span class="' + (correct ? 'text-success' : 'text-danger') + ' fw-bold">' + esc(chosen) + '</span>'
                + (!correct ? ' &nbsp;·&nbsp; Correct: <span class="text-success fw-bold">' + esc(q.answer) + '</span>' : '')
                + ' ' + (correct ? '<span class="badge bg-success">✓</span>' : '<span class="badge bg-danger">✗</span>')
                + '</p></div>';
        }).join('');

        var labelRev = (_exam.labelSection || []).map(function (diag, d) {
            var rows = diag.items.map(function (item, i) {
                var got     = (_answers.label[d] || {})[i] || '—';
                var correct = got === item.answer;
                return '<div class="mb-1 p-2 rounded small ' + (correct ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10') + '">'
                    + 'Region ' + (i + 1) + ': Your: <strong>' + esc(got) + '</strong> &nbsp;·&nbsp; Correct: <strong>' + esc(item.answer) + '</strong> '
                    + (correct ? '&#10003;' : '&#10007;') + '</div>';
            }).join('');
            return '<div class="mb-2"><p class="fw-bold small mb-1">' + esc(diag.title) + '</p>' + rows + '</div>';
        }).join('');

        $c().innerHTML = `
        <div class="card shadow border-${pass ? 'success' : 'warning'} mx-auto" style="max-width:760px">
            <div class="card-body p-4 p-md-5">
                <div class="text-center mb-4">
                    <h2 class="fw-bold text-${pass ? 'success' : 'primary'} mb-1">${pass ? 'Great Work!' : 'Assessment Complete'}</h2>
                    <p class="text-muted">${esc(_lName)}, ${esc(_fName)} &middot; ${esc(_sClass)} &middot; ${esc(_exam.chapterTitle)}</p>
                </div>

                <div class="p-4 rounded border bg-light mb-4 text-center">
                    <div class="display-2 fw-bold text-${pass ? 'success' : 'warning'} mb-1">${pct}%</div>
                    <p class="fw-bold text-dark mb-3">${sc.right} of ${sc.total} correct</p>
                    <div class="row g-2 text-center">
                        <div class="col-3">
                            <div class="fw-bold fs-5 text-primary">${sc.tfRight}/${sc.tfTotal}</div>
                            <div class="small text-muted">True / False</div>
                        </div>
                        <div class="col-3">
                            <div class="fw-bold fs-5 text-success">${sc.matchRight}/${sc.matchTotal}</div>
                            <div class="small text-muted">Matching</div>
                        </div>
                        <div class="col-3">
                            <div class="fw-bold fs-5 text-primary">${sc.mcRight}/${sc.mcTotal}</div>
                            <div class="small text-muted">Mult. Choice</div>
                        </div>
                        <div class="col-3">
                            <div class="fw-bold fs-5 text-warning">${sc.labelRight}/${sc.labelTotal}</div>
                            <div class="small text-muted">Labeling</div>
                        </div>
                    </div>
                    ${pass ? '<div class="alert alert-success mt-3 mb-0 py-2 small">You are on track for the real WRS assessment!</div>' : '<div class="alert alert-warning mt-3 mb-0 py-2 small">Keep reviewing — you need 75% to pass the real assessment.</div>'}
                </div>

                <div class="accordion mb-4" id="wrsReviewAcc">
                    <div class="accordion-item">
                        <h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-tf">Part 1 — True / False (${sc.tfRight}/${sc.tfTotal})</button></h2>
                        <div id="wrs-rev-tf" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">${tfRev}</div></div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-match">Part 2 — Matching (${sc.matchRight}/${sc.matchTotal})</button></h2>
                        <div id="wrs-rev-match" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">${matchRev}</div></div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-mc">Part 3 — Multiple Choice (${sc.mcRight}/${sc.mcTotal})</button></h2>
                        <div id="wrs-rev-mc" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">${mcRev}</div></div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header"><button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#wrs-rev-label">Part 4 — Labeling (${sc.labelRight}/${sc.labelTotal})</button></h2>
                        <div id="wrs-rev-label" class="accordion-collapse collapse" data-bs-parent="#wrsReviewAcc"><div class="accordion-body">${labelRev}</div></div>
                    </div>
                </div>

                <div class="d-flex justify-content-center gap-2 flex-wrap">
                    <button onclick="window.print()" class="btn btn-outline-secondary px-4">Print Report</button>
                    <a href="/index.html" class="btn text-white px-4" style="background:var(--primary-color,#003087)">Return to Dashboard</a>
                </div>
            </div>
        </div>`;

        // Gradebook sync — record 15/15 for completion
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
        _phase = 'tf'; _matchSet = 0; _mcIdx = 0;
        _answers = { tf: {}, match: {}, mc: {}, label: {} };
        renderPhase();
    };

    window.wrsNext = function () {
        if (_phase === 'tf') {
            _phase = 'match'; _matchSet = 0;
        } else if (_phase === 'match') {
            if (_matchSet < _exam.matchSection.length - 1) { _matchSet++; }
            else { _phase = 'mc'; _mcIdx = 0; }
        } else if (_phase === 'mc') {
            if (_mcIdx < _exam.mcSection.length - 1) { _mcIdx++; }
            else { _phase = (_exam.labelSection && _exam.labelSection.length) ? 'label' : 'done'; }
        } else if (_phase === 'label') {
            _phase = 'done';
        }
        renderPhase();
    };

    window.wrsPrev = function () {
        if (_phase === 'match') {
            if (_matchSet > 0) { _matchSet--; }
            else { _phase = 'tf'; }
        } else if (_phase === 'mc') {
            if (_mcIdx > 0) { _mcIdx--; }
            else { _phase = 'match'; _matchSet = _exam.matchSection.length - 1; }
        } else if (_phase === 'label') {
            _phase = 'mc'; _mcIdx = _exam.mcSection.length - 1;
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
        _answers.mc[_mcIdx] = i;
        renderMC();
    };

    window.wrsSelectLabel = function (diagIdx, partIdx, val) {
        if (!_answers.label[diagIdx]) _answers.label[diagIdx] = {};
        _answers.label[diagIdx][partIdx] = val || '';
        renderLabel();
    };

    // ── Public API ────────────────────────────────────────────────────────────
    window.initWRS = initWRS;
})();
