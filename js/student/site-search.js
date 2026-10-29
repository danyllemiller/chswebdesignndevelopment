// Search page (student/search.html; students asked 2026-10-29): every chapter, section by section
// (/api/search/chapters), and the student's own notes (/api/student/search-notes) at the same time, as they
// type. "My class" searches the chapters of the student's own course(s); "All classes" searches every one.
// A note can be shown whole right here (/api/student/search-note; the server cleans its HTML), so nobody has
// to open notes one at a time.
(function () {
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const COURSE = { WD1: ['Web Design 1', 'bg-primary'], WD2: ['Web Design 2', 'bg-info text-dark'], CS: ['Computer Science', 'bg-success'] };
    let studentId = '', scope = 'mine', mine = [], timer = null, seq = 0, lastTerms = [];

    const snip = s => (!s ? '' : `${s.before ? '…' : ''}${s.parts.map(p => (p.hit ? `<mark>${esc(p.t)}</mark>` : esc(p.t))).join('')}${s.after ? '…' : ''}`);
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

    function setScope(s) {
        scope = s;
        document.querySelectorAll('[data-scope]').forEach(b => { const on = b.dataset.scope === s; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    }

    async function run() {
        const q = $('q').value.trim();
        const url = new URL(location.href);
        if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
        history.replaceState(null, '', url);
        if (q.length < 2) {
            ['chapResults', 'noteResults'].forEach(id => { $(id).innerHTML = ''; });
            $('chapCount').textContent = ''; $('noteCount').textContent = '';
            $('startHint').classList.remove('d-none');
            return;
        }
        $('startHint').classList.add('d-none');
        const my = ++seq;
        ['chapResults', 'noteResults'].forEach(id => {
            if (!$(id).children.length) $(id).innerHTML = '<div class="text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Searching…</div>';
            $(id).style.opacity = '.55';
        });
        const courses = scope === 'mine' ? mine.join(',') : '';
        const get = u => fetch(u).then(r => (r.ok ? r.json() : { error: true })).catch(() => ({ error: true }));
        const [chap, notes] = await Promise.all([
            get(`/api/search/chapters?q=${encodeURIComponent(q)}&courses=${encodeURIComponent(courses)}`),
            studentId ? get(`/api/student/search-notes?student_id=${encodeURIComponent(studentId)}&q=${encodeURIComponent(q)}`) : Promise.resolve({ results: [], noStudent: true })
        ]);
        if (my !== seq) return;   // a newer search has started
        lastTerms = chap.terms || notes.terms || [];
        ['chapResults', 'noteResults'].forEach(id => { $(id).style.opacity = ''; });
        renderChapters(chap, q);
        renderNotes(notes, q);
    }

    function renderChapters(data, q) {
        const box = $('chapResults');
        if (data.error) { box.innerHTML = '<div class="alert alert-warning">Could not search the chapters. Check your internet, then try again.</div>'; $('chapCount').textContent = ''; return; }
        $('chapCount').textContent = data.pages ? plural(data.pages, 'chapter') : '';
        if (!data.results.length) {
            const wider = scope === 'mine' && mine.length ? ' Try <button type="button" class="btn btn-link btn-sm p-0 align-baseline fw-bold" data-scope-link="all">All classes</button>, a shorter word, or check the spelling.' : ' Try a shorter word, or check the spelling.';
            box.innerHTML = `<div class="alert alert-light border">No chapter has <b>${esc(q)}</b>.${wider}</div>`;
            return;
        }
        box.innerHTML = data.results.map(p => {
            const [label, cls] = COURSE[p.course] || [p.course, 'bg-secondary'];
            return `<div class="sr-card">
                <div class="d-flex flex-wrap align-items-center gap-2">
                  <span class="badge sr-badge ${cls}">${esc(label)}</span>
                  <a class="fw-bold fs-6" href="${esc(p.url)}">${esc(p.title)}</a>
                  <span class="small text-muted">${plural(p.matches, 'matching section')}</span>
                </div>
                ${p.sections.map(s => `<div class="sr-sec"><a href="${esc(s.url)}">${esc(s.heading || 'Top of the page')}</a><p class="sr-snip mb-0">${snip(s.snippet)}</p></div>`).join('')}
              </div>`;
        }).join('');
    }

    function renderNotes(data, q) {
        const box = $('noteResults');
        $('noteCount').textContent = '';
        if (data.noStudent) { box.innerHTML = '<div class="alert alert-light border">Log in with your student account to search your notes.</div>'; return; }
        if (data.error) { box.innerHTML = '<div class="alert alert-warning">Could not search your notes. Check your internet, then try again.</div>'; return; }
        $('noteCount').textContent = data.total ? (data.total > data.results.length ? `${data.results.length} of ${data.total}` : String(data.total)) : '';
        if (!data.results.length) { box.innerHTML = `<div class="alert alert-light border">None of your notes have <b>${esc(q)}</b>.</div>`; return; }
        box.innerHTML = data.results.map(n => `<div class="sr-card" data-source="${esc(n.source)}" data-id="${esc(n.id)}">
            <div class="fw-bold">${esc(n.title)}</div>
            <div class="small text-muted mb-1">${esc(n.where)}${n.category ? ` · <span class="badge bg-light text-dark border">${esc(n.category)}</span>` : ''}${n.date ? ` · ${esc(new Date(n.date).toLocaleDateString([], { month: 'short', day: 'numeric' }))}` : ''}</div>
            <p class="sr-snip">${snip(n.snippet)}</p>
            <div class="d-flex flex-wrap gap-2">
              <button type="button" class="btn btn-sm btn-outline-success fw-bold" data-show-note>Show the whole note</button>
              ${n.open ? `<a class="btn btn-sm btn-outline-secondary fw-bold" href="${esc(n.open)}">Open it where you wrote it</a>` : ''}
            </div>
            <div class="sr-note-full d-none"></div>
          </div>`).join('');
    }

    // Marks the search words inside a whole note
    function markTerms(root) {
        if (!lastTerms.length) return;
        let re;
        try { re = new RegExp(`(?<![a-z0-9])(${lastTerms.join('|')})[a-z0-9]*`, 'gi'); } catch (e) { return; }   // older Safari: show it unmarked
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            const text = node.nodeValue; re.lastIndex = 0;
            if (!re.test(text)) return;
            re.lastIndex = 0;
            const frag = document.createDocumentFragment(); let at = 0, m;
            while ((m = re.exec(text))) {
                if (m.index > at) frag.appendChild(document.createTextNode(text.slice(at, m.index)));
                const mark = document.createElement('mark'); mark.textContent = m[0]; frag.appendChild(mark); at = m.index + m[0].length;
            }
            if (at < text.length) frag.appendChild(document.createTextNode(text.slice(at)));
            node.parentNode.replaceChild(frag, node);
        });
    }

    async function toggleNote(btn) {
        const card = btn.closest('[data-source]'), full = card.querySelector('.sr-note-full');
        if (!full.classList.contains('d-none')) { full.classList.add('d-none'); btn.textContent = 'Show the whole note'; return; }
        full.classList.remove('d-none'); btn.textContent = 'Hide the whole note';
        if (full.dataset.loaded) return;
        full.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Opening…';
        try {
            const r = await fetch(`/api/student/search-note?student_id=${encodeURIComponent(studentId)}&source=${encodeURIComponent(card.dataset.source)}&id=${encodeURIComponent(card.dataset.id)}`);
            const note = await r.json();
            if (!r.ok) throw new Error(note.error || 'Could not open that note.');
            if (note.html !== undefined) full.innerHTML = note.html || '<em class="text-muted">This note is empty.</em>';   // cleaned on the server
            else full.innerHTML = `<p class="mb-0">${esc(note.text || '')}</p>`;
            markTerms(full);
            full.dataset.loaded = '1';
        } catch (e) {
            full.innerHTML = `<span class="text-danger fw-bold">${esc(e.message)}</span>`;
        }
    }

    // Which classes' chapters "My class" means: the student's course(s); Web Design students get both years,
    // since Web Design 2 builds on Web Design 1. The teacher account searches every class.
    function coursesFor(auth) {
        if (!auth || auth.isTeacher) return [];
        const c = [];
        if (auth.isCSStudent) c.push('CS');
        if (auth.isWDStudent) c.push('WD1', 'WD2');
        return c;
    }

    function start(auth) {
        let stored = {};
        try { stored = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { /* none */ }
        studentId = String((auth && auth.user && auth.user.student_id) || stored.student_id || '');
        mine = coursesFor(auth);
        setScope(mine.length ? 'mine' : 'all');
        const q = new URLSearchParams(location.search).get('q') || '';
        $('q').value = q;
        if (q) run(); else $('q').focus();
    }

    $('searchForm').addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); run(); });
    $('q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 300); });
    document.addEventListener('click', e => {
        const s = e.target.closest('[data-scope], [data-scope-link]');
        if (s) { setScope(s.dataset.scope || s.dataset.scopeLink); run(); return; }
        const b = e.target.closest('[data-show-note]');
        if (b) toggleNote(b);
    });
    if (window.dacAuthData) start(window.dacAuthData);
    else document.addEventListener('authComplete', () => start(window.dacAuthData), { once: true });
})();
