// js/student/guided-notebook.js
// The interactive Guided Notebook panel in My Notebook (student/notes.html).
// Follows whichever chapter tab is active; when that chapter has guided
// pages (server/routes/guidedNotebook.js) it shows the day pages with
// drag-and-drop word banks / sorts / ordering, Think-Share, 4-Square and
// project-team boxes (type or use the mic for speech-to-text) and the exit
// ticket. Practice only -- never graded. Everything autosaves per day.
(function () {
    const section = document.getElementById('guided-section');
    if (!section) return;
    const pageBox = document.getElementById('gn-page');
    const dayBox = document.getElementById('gn-days');
    const titleEl = document.getElementById('gn-title');
    const statusEl = document.getElementById('gn-status');
    const tabs = document.getElementById('chapterTabsContainer');

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const user = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null') || {}; } catch (e) { return {}; } })();
    const studentId = user.student_id || user.studentId || '';
    const DAY_KEY = 'guidedNotebookDay';
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    let chapterData = null; // from GET /student/guided-notebook
    let day = null;         // current day object
    let data = null;        // current day's saved responses { blocks: {...} }
    let saveTimer = null;
    let loadSeq = 0;

    function currentChapterNum() {
        const btn = document.querySelector('.chapter-tab-btn.active');
        const n = Number(String(btn?.dataset?.chapter || '').split(':')[0]);
        return Number.isInteger(n) && n > 0 ? n : null;
    }

    async function api(url, body) {
        const res = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
        const out = await res.json().catch(() => ({}));
        if (!res.ok) { const e = new Error(out.error || 'Something went wrong.'); e.status = res.status; throw e; }
        return out;
    }

    async function loadChapter() {
        const n = currentChapterNum();
        const seq = ++loadSeq;
        stopMic();
        flushSave();
        if (!n || !studentId) { section.classList.add('d-none'); return; }
        try {
            const out = await api(`/api/student/guided-notebook?student_id=${encodeURIComponent(studentId)}&chapter=${n}`);
            if (seq !== loadSeq) return;
            flushSave(); // anything typed on the old page while this loaded
            if (!out.available) { chapterData = null; section.classList.add('d-none'); return; }
            chapterData = out;
            section.classList.remove('d-none');
            titleEl.textContent = `Guided Notebook · Ch ${out.chapter}: ${out.title}`;
            let saved = null;
            try { saved = Number(JSON.parse(localStorage.getItem(DAY_KEY) || '{}')[n]); } catch (e) { /* none */ }
            // Open on today's lesson when there is one (once per day; after that, wherever they left off).
            const todayKey = new Date().toDateString();
            let seenToday = false;
            try { seenToday = localStorage.getItem(`${DAY_KEY}_today_${n}`) === todayKey; localStorage.setItem(`${DAY_KEY}_today_${n}`, todayKey); } catch (e) { /* ignore */ }
            if (out.todayDay && !seenToday) saved = out.todayDay;
            showDay(out.days.find(d => d.day === saved) ? saved : (out.todayDay || out.days[0].day));
        } catch (e) {
            if (seq !== loadSeq) return;
            section.classList.add('d-none');
        }
    }

    function renderDayPills() {
        dayBox.innerHTML = chapterData.days.map(d => {
            const r = chapterData.responses[d.day];
            const done = r && r.blocks && r.blocks.exit && r.blocks.exit.rating;
            return `<button type="button" class="btn btn-sm ${d.day === day.day ? 'btn-primary' : 'btn-outline-primary'} fw-bold" data-day="${d.day}" title="${esc(d.title)}">${esc(d.label || 'Day ' + d.day)}${d.day === chapterData.todayDay ? ' · Today' : ''}${done ? ' <i class="fas fa-check"></i>' : ''}</button>`;
        }).join('');
    }

    function showDay(n) {
        flushSave();
        day = chapterData.days.find(d => d.day === n);
        data = JSON.parse(JSON.stringify(chapterData.responses[n] || { blocks: {} }));
        if (!data.blocks) data.blocks = {};
        try {
            const m = JSON.parse(localStorage.getItem(DAY_KEY) || '{}');
            m[chapterData.chapter] = n;
            localStorage.setItem(DAY_KEY, JSON.stringify(m));
        } catch (e) { /* storage blocked -- fine */ }
        renderDayPills();
        renderPage();
        setStatus('');
    }

    // ---------- saving ----------
    function setStatus(t, cls) { statusEl.textContent = t; statusEl.className = 'small fw-bold ' + (cls || 'text-muted'); }
    function blockData(id) { return (data.blocks[id] = data.blocks[id] || {}); }
    function changed() {
        clearTimeout(saveTimer);
        setStatus('Saving…');
        saveTimer = setTimeout(save, 900);
    }
    async function save() {
        saveTimer = null;
        const payload = { student_id: studentId, chapter: chapterData.chapter, day: day.day, data };
        try {
            await api('/api/student/guided-notebook/save', payload);
            chapterData.responses[day.day] = JSON.parse(JSON.stringify(data));
            setStatus('Saved ✓', 'text-success');
            renderDayPills();
        } catch (e) {
            setStatus(e.status === 401 ? 'Not saved: your login expired. Log out and back in.' : 'Not saved. Check your connection.', 'text-danger');
        }
    }
    function flushSave() { if (saveTimer && chapterData && day) { clearTimeout(saveTimer); save(); } }
    window.addEventListener('beforeunload', () => {
        if (!saveTimer || !navigator.sendBeacon) return;
        navigator.sendBeacon('/api/student/guided-notebook/save', new Blob([JSON.stringify({ student_id: studentId, chapter: chapterData.chapter, day: day.day, data })], { type: 'application/json' }));
    });

    // ---------- small builders ----------
    // A textarea bound to data.blocks[id][field], with a mic button for speech-to-text.
    function textBox(id, field, opts = {}) {
        const val = blockData(id)[field] || '';
        return `<div class="gn-text">
            <textarea class="form-control" rows="${opts.rows || 3}" data-bind="${id}.${field}" placeholder="${esc(opts.placeholder || 'Type your answer, or tap the mic and talk.')}">${esc(val)}</textarea>
            ${SpeechRec ? `<button type="button" class="btn btn-sm btn-outline-secondary gn-mic" title="Speak your answer (speech-to-text)"><i class="fas fa-microphone"></i></button>` : ''}
        </div>`;
    }
    function lineInput(id, field, placeholder) {
        return `<input class="form-control form-control-sm" data-bind="${id}.${field}" value="${esc(blockData(id)[field] || '')}" placeholder="${esc(placeholder || '')}">`;
    }
    const hasTurnin = () => day.blocks.some(x => x.type === 'turnin');
    const card = (cls, label, body, title) => `<div class="gn-block ${cls}"><div class="gn-label">${label}</div>${title ? `<div class="gn-block-title">${esc(title)}</div>` : ''}${body}</div>`;
    // Beside a test, My Notebook is loaded in an iframe (js/examLogicWD.js) -- no
    // checking or revealing answers there; saved work still shows.
    let inTest = false;
    try { inTest = window.self !== window.top; } catch (e) { inTest = true; }
    const checkRow = id => inTest ? '<div class="small text-muted fst-italic"><i class="fas fa-lock me-1"></i>Checking answers is off during a test.</div>' : `<div class="gn-check-row"><button type="button" class="btn btn-sm btn-success fw-bold" data-check="${id}"><i class="fas fa-check-double me-1"></i>Check my answers</button>
        <button type="button" class="btn btn-sm btn-outline-secondary d-none" data-reveal="${id}">Show me the answers</button><span class="gn-feedback small fw-bold"></span></div>`;

    function renderBlock(b) {
        const d = blockData(b.id);
        switch (b.type) {
        case 'doNow':
            return card('gn-donow', `Do Now · ${esc(b.label || '')}`, `<p class="fw-semibold mb-2">${esc(b.prompt)}</p>${textBox(b.id, 'text', { rows: 2 })}`);
        case 'discussion':
            return card('gn-disc', b.title ? esc(b.title) : 'Discussion Questions', b.prompts.map((p, i) => `<div class="mb-3"><p class="fw-semibold mb-1">${i + 1}. ${esc(p.q)}</p>${textBox(b.id, 'a' + i, { rows: 2 })}</div>`).join(''));
        case 'fields':
            return card('gn-fields', esc(b.label || ''), `${b.intro ? `<p class="fw-semibold mb-2">${esc(b.intro)}</p>` : ''}
                ${b.fields.map((f, i) => `<div class="mb-2"><label class="small fw-bold text-muted">${esc(f.label)}</label>${textBox(b.id, 'f' + i, { rows: b.rows || 2 })}</div>`).join('')}`, b.title);
        case 'lab':
            return card('gn-lab', `Group Work · Lab Worksheet${b.pts ? ` · ${b.pts} pts` : ''}`,
                `${b.objective ? `<p class="small text-muted mb-2">Objective: ${esc(b.objective)}</p>` : ''}
                ${b.steps.map((s, i) => `<label class="form-check d-block mb-1"><input type="checkbox" class="form-check-input" data-bind-check="${b.id}.s${i}" ${d['s' + i] ? 'checked' : ''}> <span>${i + 1}. ${esc(s)}</span></label>`).join('')}
                ${b.turnIn ? `<p class="small fw-bold text-danger mt-2 mb-1">Turn In: ${esc(b.turnIn)}${hasTurnin() ? ' (upload it below)' : ''}</p>` : ''}
                <div class="mt-2 mb-2"><label class="small fw-bold text-muted">Completed by (4-Square Group or Project Team)</label>${lineInput(b.id, 'by', 'Names')}</div>
                <label class="small fw-bold text-muted">Notes / what we found</label>${textBox(b.id, 'notes')}`, b.title);
        case 'blanks':
            return card('gn-dd', 'Drag &amp; Drop', `<p class="small mb-2">${esc(b.prompt)}</p>
                <div class="gn-bank" data-bank="${b.id}"></div>
                <ol class="gn-lines">${b.lines.map(line => `<li>${line.map(seg => typeof seg === 'string' ? esc(seg) : `<span class="gn-slot" data-block="${b.id}" data-slot="${seg.blank}" tabindex="0"></span>`).join('')}</li>`).join('')}</ol>
                ${checkRow(b.id)}`, b.title);
        case 'sort':
            return card('gn-dd', 'Drag &amp; Drop · Sort', `<p class="small mb-2">${esc(b.prompt)}</p>
                <div class="gn-pool" data-pool="${b.id}"></div>
                <div class="gn-buckets" style="--cols:${Math.min(b.buckets.length, 4)}">${b.buckets.map(k => `<div class="gn-bucket" data-block="${b.id}" data-bucket="${esc(k)}" tabindex="0"><div class="gn-bucket-name">${esc(k)}</div><div class="gn-bucket-items"></div></div>`).join('')}</div>
                ${checkRow(b.id)}`, b.title);
        case 'order':
            return card('gn-dd', 'Drag &amp; Drop · Put in Order', `<p class="small mb-2">${esc(b.prompt)}</p><ol class="gn-order" data-order="${b.id}"></ol>${checkRow(b.id)}`, b.title);
        case 'dok':
            if (b.label) return card('gn-dok', esc(b.label), `<p class="fw-semibold mb-2">${esc(b.prompt)}</p>${textBox(b.id, 'text', { rows: 3 })}`);
            return card('gn-dok', `DOK ${b.level} · ${['', 'Recall', 'Skills &amp; Concepts', 'Strategic Thinking', 'Extended Thinking'][b.level] || ''}`, `<p class="fw-semibold mb-2">${esc(b.prompt)}</p>${textBox(b.id, 'text', { rows: b.level >= 4 ? 5 : 3 })}`);
        case 'thinkShare':
            return card('gn-pair', 'Elbow Partner · Think Alone, Then Share', `<p class="fw-semibold mb-2">${esc(b.prompt)}</p>
                <div class="mb-2"><label class="small fw-bold text-muted">Elbow partner</label>${lineInput(b.id, 'partner', 'Partner name')}</div>
                <label class="small fw-bold text-muted">THINK · on my own first</label>${textBox(b.id, 'think')}
                <label class="small fw-bold text-muted mt-2">SHARE · what my elbow partner said</label>${textBox(b.id, 'share', { placeholder: 'Type what your partner said, or tap the mic while they talk.' })}
                <label class="small fw-bold text-muted mt-2">We agreed / disagreed on</label>${textBox(b.id, 'agree', { rows: 2 })}`);
        case 'fourSquare':
            return card('gn-four', `4-Square Challenge${b.title ? ' · ' + esc(b.title) : ''}`, `<p class="fw-semibold mb-2">${esc(b.prompt)}</p>
                <label class="small fw-bold text-muted">4-Square members</label>
                <div class="row g-2 mb-2">${[0, 1, 2, 3].map(i => `<div class="col-6 col-md-3">${lineInput(b.id, 'm' + i, 'Member ' + (i + 1))}</div>`).join('')}</div>
                <label class="small fw-bold text-muted">Our group's answer / product</label>${textBox(b.id, 'answer', { rows: 5, placeholder: 'Type your group\'s answer, or tap the mic to capture the conversation.' })}
                <label class="small fw-bold text-muted mt-2">One thing I contributed</label>${textBox(b.id, 'contributed', { rows: 2 })}`);
        case 'team': {
            const rows = Array.isArray(d.rows) && d.rows.length ? d.rows : [{}, {}, {}];
            d.rows = rows;
            return card('gn-team', `Project Team · ${esc(b.project || chapterData.project || '')}`, `<p class="fw-semibold mb-2">${esc(b.prompt)}</p>
                <div class="mb-2"><label class="small fw-bold text-muted">Team name</label>${lineInput(b.id, 'teamName', 'Team name')}</div>
                <label class="small fw-bold text-muted">What we decided</label>${textBox(b.id, 'decided', { rows: 4, placeholder: 'Type what your team decided, or tap the mic during the meeting.' })}
                <label class="small fw-bold text-muted mt-2">Who does what</label>
                <div class="table-responsive"><table class="table table-sm gn-team-table mb-1"><thead><tr><th>Team member</th><th>Task</th><th style="width:7rem">Due</th></tr></thead><tbody>
                ${rows.map((r, i) => `<tr>${['member', 'task', 'due'].map(f => `<td><input class="form-control form-control-sm" data-row="${b.id}.${i}.${f}" value="${esc(r[f] || '')}"></td>`).join('')}</tr>`).join('')}
                </tbody></table></div><button type="button" class="btn btn-sm btn-link p-0" data-addrow="${b.id}">+ Add a row</button>`);
        }
        case 'projectSheet': {
            const rows = Array.isArray(d.rows) && d.rows.length ? d.rows : [{}, {}, {}];
            d.rows = rows;
            return card('gn-project', `Project Worksheet${b.pts ? ` · ${b.pts} pts` : ''}`, `
                ${b.brief ? `<div class="small fw-bold text-uppercase text-muted">Project Brief · ${esc(b.brief)}</div>` : ''}
                ${b.objective ? `<p class="small mb-2">Objective: ${esc(b.objective)}</p>` : ''}
                ${b.checklist.map((t, i) => `<label class="form-check d-block mb-1"><input type="checkbox" class="form-check-input" data-bind-check="${b.id}.c${i}" ${d['c' + i] ? 'checked' : ''}> <span>${esc(t)}</span></label>`).join('')}
                ${b.tasks.length ? `<div class="small fw-bold text-muted mt-2">Today's project tasks</div>${b.tasks.map((t, i) => `<label class="form-check d-block mb-1"><input type="checkbox" class="form-check-input" data-bind-check="${b.id}.t${i}" ${d['t' + i] ? 'checked' : ''}> <span>${esc(t)}</span></label>`).join('')}` : ''}
                <div class="mt-2 mb-2"><label class="small fw-bold text-muted">Project Team name</label>${lineInput(b.id, 'teamName', 'Team name')}</div>
                <label class="small fw-bold text-muted">Progress notes · what our team got done</label>${textBox(b.id, 'progress', { rows: 3, placeholder: 'Name what you built (a link, a screenshot, a file), not just "worked on it."' })}
                <label class="small fw-bold text-muted mt-2">Blockers &amp; questions for the team</label>${textBox(b.id, 'blockers', { rows: 2 })}
                <label class="small fw-bold text-muted mt-2">Next step · who owns it · due</label>
                <div class="table-responsive"><table class="table table-sm gn-team-table mb-1"><thead><tr><th>Next step</th><th>Owner</th><th style="width:7rem">Due</th></tr></thead><tbody>
                ${rows.map((r, i) => `<tr>${['step', 'owner', 'due'].map(f => `<td><input class="form-control form-control-sm" data-row="${b.id}.${i}.${f}" value="${esc(r[f] || '')}"></td>`).join('')}</tr>`).join('')}
                </tbody></table></div><button type="button" class="btn btn-sm btn-link p-0" data-addrow="${b.id}">+ Add a row</button>`, b.title);
        }
        case 'turnin': {
            const done = d.turnedIn;
            return card('gn-turnin', 'Turn In', `
                <p class="mb-2"><strong>${esc(b.label)}</strong><br><span class="small">${esc(b.instructions || '')}</span>${b.page && !inTest ? ` <a class="small fw-bold" href="${esc(b.page)}" target="_blank" rel="noopener">Open the chapter page</a>` : ''}</p>
                ${done ? `<div class="alert alert-success py-2 small mb-2"><i class="fas fa-check-circle me-1"></i>Turned in ${esc(new Date(done.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))} (${done.files} file${done.files === 1 ? '' : 's'}). You can upload again to replace or add files.</div>` : ''}
                ${inTest ? '<div class="small text-muted fst-italic"><i class="fas fa-lock me-1"></i>Turning in work is off during a test.</div>' : `
                <div class="btn-group btn-group-sm mb-2" role="group">
                    <input type="radio" class="btn-check" name="tk-${b.id}" id="tk-${b.id}-file" value="file" checked><label class="btn btn-outline-success fw-bold" for="tk-${b.id}-file"><i class="fas fa-file me-1"></i>File(s)</label>
                    <input type="radio" class="btn-check" name="tk-${b.id}" id="tk-${b.id}-folder" value="folder"><label class="btn btn-outline-success fw-bold" for="tk-${b.id}-folder"><i class="fas fa-folder me-1"></i>Whole folder</label>
                </div>
                <input type="file" class="form-control form-control-sm mb-1 gn-file" data-turnin="${b.id}" multiple>
                <input type="file" class="form-control form-control-sm mb-1 gn-folder d-none" data-turnin="${b.id}" webkitdirectory directory multiple>
                <div class="form-text small mb-2 gn-folder-note d-none">Uploads every file and sub-folder inside the folder you pick, so your website links keep working.</div>
                <button type="button" class="btn btn-success btn-sm fw-bold" data-upload="${b.id}"><i class="fas fa-cloud-upload-alt me-1"></i>Upload to Teacher Server</button>
                <div class="progress mt-2 d-none" style="height:18px"><div class="progress-bar progress-bar-striped progress-bar-animated bg-success" style="width:0%"></div></div>
                <div class="gn-upload-status small fw-bold mt-2"></div>`}`);
        }
        case 'exit':
            return card('gn-exit', 'Exit Ticket', `<p class="fw-bold mb-2">${esc(b.statement)}</p>
                <div class="btn-group mb-2" role="group">${['Yes', 'Almost', 'Not yet'].map(o => `<button type="button" class="btn btn-sm ${d.rating === o ? 'btn-dark' : 'btn-outline-dark'} fw-bold" data-rate="${b.id}" data-val="${o}">${o}</button>`).join('')}</div>
                <label class="small fw-bold text-muted d-block">Prove it in one sentence</label>${textBox(b.id, 'sentence', { rows: 2 })}`);
        default:
            return '';
        }
    }

    function renderPage() {
        pageBox.innerHTML = `
            <div class="gn-day-head">
                <div class="small fw-bold text-uppercase text-muted">${day.label ? esc(day.label) : `Day ${day.day} of ${chapterData.days.filter(x => !x.label).length}`}${day.short ? ' · 45-min block' : ''}</div>
                <h3 class="h5 fw-bold mb-1">${esc(day.title)}</h3>
                ${day.due ? `<div class="badge bg-danger mb-2">Project due: ${esc(day.due)}</div>` : ''}
            </div>
            ${day.objectives.length ? `<div class="gn-block gn-goals"><div class="gn-label">Today I will be able to…</div><ul class="mb-0">${day.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}
            ${day.blocks.map(renderBlock).join('')}
            <p class="small text-muted mb-0"><i class="fas fa-info-circle me-1"></i>Practice only, not graded. Everything saves automatically.</p>`;
        day.blocks.forEach(b => {
            if (b.type === 'blanks') paintBlanks(b);
            if (b.type === 'sort') paintSort(b);
            if (b.type === 'order') paintOrder(b);
        });
    }

    // ---------- drag & drop: word bank blanks ----------
    let picked = null; // tap-to-place: { block, word } or { block, item }
    function chip(text, attrs) { return `<span class="gn-chip" draggable="true" ${attrs}>${esc(text)}</span>`; }
    function paintBlanks(b) {
        const values = blockData(b.id).values || {};
        const used = Object.values(values).slice();
        const bankLeft = b.bank.filter(w => { const k = used.indexOf(w); if (k >= 0) { used.splice(k, 1); return false; } return true; });
        pageBox.querySelector(`[data-bank="${b.id}"]`).innerHTML = bankLeft.length ? bankLeft.map(w => chip(w, `data-block="${b.id}" data-word="${esc(w)}"`)).join('') : '<span class="small text-muted">Word bank empty. Tap a filled blank to send a word back.</span>';
        pageBox.querySelectorAll(`.gn-slot[data-block="${b.id}"]`).forEach(s => {
            const v = values[s.dataset.slot];
            s.textContent = v || '';
            s.classList.toggle('filled', !!v);
            s.classList.remove('right', 'wrong');
        });
    }
    function placeWord(blockId, slot, word) {
        const d = blockData(blockId);
        d.values = d.values || {};
        d.values[slot] = word;
        changed();
        paintBlanks(day.blocks.find(x => x.id === blockId));
        clearFeedback(blockId);
    }

    // ---------- drag & drop: sort into buckets ----------
    function paintSort(b) {
        const values = blockData(b.id).values || {};
        const pool = pageBox.querySelector(`[data-pool="${b.id}"]`);
        pool.innerHTML = b.items.filter(it => !values[it.i]).map(it => chip(it.text, `data-block="${b.id}" data-item="${it.i}"`)).join('') || '<span class="small text-muted">All sorted. Tap a card to move it back.</span>';
        pageBox.querySelectorAll(`.gn-bucket[data-block="${b.id}"]`).forEach(bk => {
            bk.querySelector('.gn-bucket-items').innerHTML = b.items.filter(it => values[it.i] === bk.dataset.bucket).map(it => chip(it.text, `data-block="${b.id}" data-item="${it.i}" data-in="1"`)).join('');
        });
    }
    function placeItem(blockId, item, bucket) {
        const d = blockData(blockId);
        d.values = d.values || {};
        if (bucket) d.values[item] = bucket; else delete d.values[item];
        changed();
        paintSort(day.blocks.find(x => x.id === blockId));
        clearFeedback(blockId);
    }

    // ---------- drag & drop: ordering ----------
    function orderOf(b) {
        const saved = blockData(b.id).order;
        const ids = b.items.map(it => it.i);
        return Array.isArray(saved) && saved.length === ids.length && ids.every(i => saved.includes(i)) ? saved : ids;
    }
    function paintOrder(b) {
        const order = orderOf(b);
        pageBox.querySelector(`[data-order="${b.id}"]`).innerHTML = order.map((i, pos) => {
            const it = b.items.find(x => x.i === i);
            return `<li class="gn-order-item" draggable="true" data-block="${b.id}" data-pos="${pos}"><i class="fas fa-grip-vertical text-muted me-2"></i><span class="flex-grow-1">${esc(it.text)}</span>
                <button type="button" class="btn btn-sm btn-light" data-move="-1" ${pos === 0 ? 'disabled' : ''} title="Move up"><i class="fas fa-arrow-up"></i></button>
                <button type="button" class="btn btn-sm btn-light" data-move="1" ${pos === order.length - 1 ? 'disabled' : ''} title="Move down"><i class="fas fa-arrow-down"></i></button></li>`;
        }).join('');
    }
    function moveOrder(blockId, from, to) {
        const b = day.blocks.find(x => x.id === blockId);
        const order = orderOf(b).slice();
        if (to < 0 || to >= order.length || from === to) return;
        const [x] = order.splice(from, 1);
        order.splice(to, 0, x);
        blockData(blockId).order = order;
        changed();
        paintOrder(b);
        clearFeedback(blockId);
    }

    // ---------- checking ----------
    function clearFeedback(blockId) {
        const row = pageBox.querySelector(`[data-check="${blockId}"]`)?.parentElement;
        if (row) row.querySelector('.gn-feedback').textContent = '';
    }
    async function check(blockId, reveal) {
        const b = day.blocks.find(x => x.id === blockId);
        const d = blockData(blockId);
        const values = b.type === 'order' ? { order: orderOf(b) } : (d.values || {});
        const row = pageBox.querySelector(`[data-check="${blockId}"]`).parentElement;
        const fb = row.querySelector('.gn-feedback');
        try {
            const out = await api('/api/student/guided-notebook/check', { student_id: studentId, chapter: chapterData.chapter, day: day.day, block: blockId, values, reveal: !!reveal });
            const right = out.correct.filter(Boolean).length;
            if (b.type === 'blanks') {
                pageBox.querySelectorAll(`.gn-slot[data-block="${blockId}"]`).forEach(s => {
                    const i = Number(s.dataset.slot);
                    s.classList.toggle('right', !!out.correct[i]);
                    s.classList.toggle('wrong', !out.correct[i]);
                    if (reveal && out.answers && !out.correct[i]) s.innerHTML = `${esc(d.values?.[i] || '___')} <span class="gn-answer">→ ${esc(out.answers[i])}</span>`;
                });
            } else if (b.type === 'sort') {
                pageBox.querySelectorAll(`.gn-chip[data-block="${blockId}"][data-in]`).forEach(c => {
                    c.querySelectorAll('.gn-answer').forEach(x => x.remove());
                    const i = Number(c.dataset.item);
                    c.classList.toggle('right', !!out.correct[i]);
                    c.classList.toggle('wrong', !out.correct[i]);
                    if (reveal && out.answers && !out.correct[i]) c.insertAdjacentHTML('beforeend', ` <span class="gn-answer">→ ${esc(out.answers[i])}</span>`);
                });
            } else if (b.type === 'order') {
                pageBox.querySelectorAll(`.gn-order-item[data-block="${blockId}"]`).forEach(li => {
                    const pos = Number(li.dataset.pos);
                    li.classList.toggle('right', !!out.correct[pos]);
                    li.classList.toggle('wrong', !out.correct[pos]);
                });
            }
            const total = out.correct.length;
            fb.className = 'gn-feedback small fw-bold ' + (right === total ? 'text-success' : 'text-danger');
            fb.textContent = right === total ? `All ${total} correct!` : (reveal && b.type === 'order' && out.answers ? `Correct order: ${out.answers.join(' → ')}` : `${right} of ${total} correct. Move the red ones and check again.`);
            row.querySelector('[data-reveal]').classList.toggle('d-none', right === total);
            d.lastCheck = `${right}/${total}`;
            changed();
        } catch (e) { fb.className = 'gn-feedback small fw-bold text-danger'; fb.textContent = e.message; }
    }

    // ---------- turn-ins ----------
    // Same server path as the chapter pages' Assignment Dropbox
    // (js/assignment-uploader.js): files go to the student's folder via
    // /api/upload (folder uploads keep their sub-folders), then the
    // gradebook column is recorded with /api/submit-exam. Interim
    // milestones score full credit for turning in; a "Project:" waits at 0
    // for review -- the same rule the dropbox uses.
    async function uploadTurnin(blockId, blk) {
        const b = day.blocks.find(x => x.id === blockId);
        const folderMode = blk.querySelector(`#tk-${blockId}-folder`).checked;
        const files = [...(folderMode ? blk.querySelector('.gn-folder') : blk.querySelector('.gn-file')).files]
            .filter(f => f.name !== '.DS_Store' && !f.name.startsWith('._') && f.name !== 'Thumbs.db');
        const status = blk.querySelector('.gn-upload-status');
        const bar = blk.querySelector('.progress');
        const btn = blk.querySelector('[data-upload]');
        const say = (msg, cls) => { status.className = 'gn-upload-status small fw-bold mt-2 ' + (cls || ''); status.textContent = msg; };
        if (!files.length) return say('Pick a file or folder first.', 'text-danger');

        let existing = [];
        try {
            const fd = new FormData(); fd.append('action', 'list'); fd.append('studentId', studentId);
            const lj = await (await fetch('/api/manage-files', { method: 'POST', body: fd })).json();
            if (lj.success) { const pre = `uploads/${studentId}/`; existing = lj.files.map(f => f.path.startsWith(pre) ? f.path.slice(pre.length) : f.path); }
        } catch (e) { /* no duplicate check -- upload anyway */ }
        const dupes = files.filter(f => existing.includes(f.webkitRelativePath || f.name));
        let replace = true;
        if (dupes.length) replace = confirm(`${dupes.length === 1 ? `"${dupes[0].webkitRelativePath || dupes[0].name}" is` : `${dupes.length} of these files are`} already on the server.\n\nOK = replace them\nCancel = keep both (save copies)`);

        btn.disabled = true; bar.classList.remove('d-none');
        let ok = 0, lastErr = null;
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            let p = f.webkitRelativePath || f.name;
            if (!replace && existing.includes(p)) {
                const dot = p.lastIndexOf('.'), base = dot > p.lastIndexOf('/') ? p.slice(0, dot) : p, ext = dot > p.lastIndexOf('/') ? p.slice(dot) : '';
                let n = 1, np = `${base} (Copy)${ext}`;
                while (existing.includes(np)) { n++; np = `${base} (Copy ${n})${ext}`; }
                p = np;
            }
            say(`Uploading ${i + 1} of ${files.length}…`);
            const fd = new FormData();
            fd.append('studentId', studentId); fd.append('assignment', b.examId); fd.append('file', f); fd.append('path', p);
            try {
                const resp = await fetch('/api/upload', { method: 'POST', body: fd });
                const r = await resp.json().catch(() => ({}));
                if (r.success) { ok++; existing.push(p); } else lastErr = r.error || `Server returned ${resp.status}`;
            } catch (e) { lastErr = e.message; }
            bar.firstElementChild.style.width = Math.round((i + 1) / files.length * 100) + '%';
        }
        if (ok) {
            const pts = Number((b.label.match(/[\[(](\d+)\s*pts?[\])]/i) || [])[1]) || 25;
            const held = /project|capstone|exam/i.test(b.label);
            try {
                const r = await fetch('/api/submit-exam', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student_id: studentId, exam_id: b.examId, score: held ? 0 : pts, total_points: pts }) });
                if (!r.ok) throw new Error('gradebook');
                blockData(blockId).turnedIn = { at: new Date().toISOString(), files: ok };
                changed();
                say(`✅ Turned in ${ok} file${ok === 1 ? '' : 's'}${lastErr ? ` (some failed: ${lastErr})` : ''}.`, 'text-success');
            } catch (e) { say('⚠️ Files uploaded, but the gradebook did not record it. Tell your teacher.', 'text-warning'); }
        } else {
            say(`❌ Upload failed: ${lastErr || 'unknown error'}. If it says "Not authorized," log out and back in, then try again.`, 'text-danger');
        }
        btn.disabled = false;
        setTimeout(() => bar.classList.add('d-none'), 2500);
    }

    // ---------- speech-to-text ----------
    let rec = null, recBtn = null;
    function stopMic() {
        if (rec) { rec._stopped = true; try { rec.stop(); } catch (e) { /* ignore */ } }
        if (recBtn) { recBtn.classList.remove('btn-danger', 'gn-listening'); recBtn.classList.add('btn-outline-secondary'); recBtn.innerHTML = '<i class="fas fa-microphone"></i>'; }
        rec = null; recBtn = null;
    }
    function startMic(btn) {
        const ta = btn.parentElement.querySelector('textarea');
        stopMic();
        rec = new SpeechRec();
        rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
        recBtn = btn;
        btn.classList.remove('btn-outline-secondary'); btn.classList.add('btn-danger', 'gn-listening');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        const me = rec;
        rec.onresult = ev => {
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
                if (!ev.results[i].isFinal) continue;
                const t = ev.results[i][0].transcript.trim();
                if (!t) continue;
                ta.value = (ta.value && !/\s$/.test(ta.value) ? ta.value + ' ' : ta.value) + t;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };
        rec.onerror = ev => {
            if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
                stopMic();
                alert('Microphone access is blocked. Click the camera/mic icon in the address bar, allow the microphone for this site, and try again. You can always type instead.');
            }
        };
        rec.onend = () => { if (me === rec && !me._stopped) { try { me.start(); } catch (e) { /* restarting */ } } };
        try { rec.start(); } catch (e) { stopMic(); }
    }

    // ---------- events ----------
    pageBox.addEventListener('input', e => {
        const t = e.target;
        if (t.dataset.bind) { const [id, f] = t.dataset.bind.split('.'); blockData(id)[f] = t.value; changed(); }
        else if (t.dataset.row) { const [id, i, f] = t.dataset.row.split('.'); const d = blockData(id); d.rows[i] = d.rows[i] || {}; d.rows[i][f] = t.value; changed(); }
    });
    pageBox.addEventListener('change', e => {
        const t = e.target;
        if (t.classList.contains('btn-check') && t.name.startsWith('tk-')) {
            const blk = t.closest('.gn-block'), folder = t.value === 'folder';
            blk.querySelector('.gn-file').classList.toggle('d-none', folder);
            blk.querySelector('.gn-folder').classList.toggle('d-none', !folder);
            blk.querySelector('.gn-folder-note').classList.toggle('d-none', !folder);
            return;
        }
        if (t.dataset.bindCheck) { const [id, f] = t.dataset.bindCheck.split('.'); blockData(id)[f] = t.checked; changed(); }
    });
    pageBox.addEventListener('click', e => {
        const t = e.target;
        const mic = t.closest('.gn-mic');
        if (mic) { if (mic === recBtn) stopMic(); else startMic(mic); return; }
        const rate = t.closest('[data-rate]');
        if (rate) {
            blockData(rate.dataset.rate).rating = rate.dataset.val; changed();
            rate.parentElement.querySelectorAll('button').forEach(x => { const on = x === rate; x.classList.toggle('btn-dark', on); x.classList.toggle('btn-outline-dark', !on); });
            return;
        }
        const up = t.closest('[data-upload]');
        if (up) { uploadTurnin(up.dataset.upload, up.closest('.gn-block')); return; }
        const add = t.closest('[data-addrow]');
        if (add) { blockData(add.dataset.addrow).rows.push({}); changed(); renderPage(); return; }
        if (inTest && t.closest('[data-check], [data-reveal]')) return;
        const chk = t.closest('[data-check]');
        if (chk) { check(chk.dataset.check, false); return; }
        const rev = t.closest('[data-reveal]');
        if (rev) { check(rev.dataset.reveal, true); return; }
        const mv = t.closest('[data-move]');
        if (mv) { const li = mv.closest('.gn-order-item'); const pos = Number(li.dataset.pos); moveOrder(li.dataset.block, pos, pos + Number(mv.dataset.move)); return; }

        // tap-to-place (works on Chromebook touchscreens and without dragging)
        const c = t.closest('.gn-chip');
        if (c) {
            if (c.dataset.in) { placeItem(c.dataset.block, c.dataset.item, null); picked = null; return; }
            pageBox.querySelectorAll('.gn-chip.picked').forEach(x => x.classList.remove('picked'));
            picked = { block: c.dataset.block, word: c.dataset.word, item: c.dataset.item };
            c.classList.add('picked');
            return;
        }
        const slot = t.closest('.gn-slot');
        if (slot) {
            if (picked && picked.block === slot.dataset.block && picked.word != null) { placeWord(slot.dataset.block, slot.dataset.slot, picked.word); picked = null; }
            else if (slot.classList.contains('filled')) {
                const d = blockData(slot.dataset.block); delete d.values[slot.dataset.slot]; changed();
                paintBlanks(day.blocks.find(x => x.id === slot.dataset.block));
            }
            return;
        }
        const bucket = t.closest('.gn-bucket');
        if (bucket && picked && picked.block === bucket.dataset.block && picked.item != null) { placeItem(bucket.dataset.block, picked.item, bucket.dataset.bucket); picked = null; }
    });

    // HTML5 drag and drop
    let dragging = null;
    pageBox.addEventListener('dragstart', e => {
        const c = e.target.closest('.gn-chip, .gn-order-item');
        if (!c) return;
        dragging = c.classList.contains('gn-order-item')
            ? { block: c.dataset.block, pos: Number(c.dataset.pos) }
            : { block: c.dataset.block, word: c.dataset.word, item: c.dataset.item };
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', c.textContent); } catch (x) { /* ignore */ }
    });
    pageBox.addEventListener('dragend', () => { dragging = null; pageBox.querySelectorAll('.gn-over').forEach(x => x.classList.remove('gn-over')); });
    function dropTarget(e) {
        if (!dragging) return null;
        const el = e.target.closest('.gn-slot, .gn-bucket, .gn-order-item, .gn-pool, .gn-bank');
        return el && (el.dataset.block || el.dataset.pool || el.dataset.bank) === dragging.block ? el : null;
    }
    pageBox.addEventListener('dragover', e => {
        const el = dropTarget(e);
        if (!el) return;
        e.preventDefault();
        pageBox.querySelectorAll('.gn-over').forEach(x => x !== el && x.classList.remove('gn-over'));
        el.classList.add('gn-over');
    });
    pageBox.addEventListener('drop', e => {
        const el = dropTarget(e);
        if (!el) return;
        e.preventDefault();
        el.classList.remove('gn-over');
        const g = dragging; dragging = null;
        if (el.classList.contains('gn-slot') && g.word != null) placeWord(g.block, el.dataset.slot, g.word);
        else if (el.classList.contains('gn-bucket') && g.item != null) placeItem(g.block, g.item, el.dataset.bucket);
        else if (el.classList.contains('gn-pool') && g.item != null) placeItem(g.block, g.item, null);
        else if (el.classList.contains('gn-order-item') && g.pos != null) moveOrder(g.block, g.pos, Number(el.dataset.pos));
    });

    dayBox.addEventListener('click', e => {
        const b = e.target.closest('[data-day]');
        if (b) { stopMic(); showDay(Number(b.dataset.day)); }
    });
    document.getElementById('gn-toggle')?.addEventListener('click', () => {
        const body = document.getElementById('gn-body');
        const hidden = body.classList.toggle('d-none');
        document.getElementById('gn-toggle').textContent = hidden ? 'Show' : 'Hide';
    });

    // Follow the chapter tabs (student-notes.js builds and switches them).
    if (tabs) {
        let last = null;
        const obs = new MutationObserver(() => { const n = currentChapterNum(); if (n && n !== last) { last = n; loadChapter(); } });
        obs.observe(tabs, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    loadChapter();
})();
