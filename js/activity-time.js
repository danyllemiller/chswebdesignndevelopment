// Students' active time on the site (teacher request 2026-10-26: "how long does he spend reading
// and taking notes"). A second counts only while the page is in front, the window has focus, and
// the student scrolled, typed, clicked or touched something in the last 2 minutes. Each second goes
// to what they were doing: reading a chapter, notes, activity work, a test, a project, or other.
// Sent once a minute and when the page closes (POST /api/activity/time, server/routes/activityTime.js).
// Loaded from the site footer (includes/site-footer.html) and the CS chapter pages. Runs in the top
// window only, where it also watches the CS workspace's frames (cs-interactive.html: the chapter,
// test and notebook frames), so a chapter open inside the workspace is never counted twice.
(function () {
    if (window.__activityTime || window.self !== window.top) return;
    window.__activityTime = true;
    const IDLE_MS = 120000;
    const pending = new Map();   // "path|cat" -> { path, cat, secs, title }
    let lastInput = 0, lastMark = 0, zone = null;

    const pathOf = w => { try { const p = w && w.location.pathname; return p && p.startsWith('/') ? p : null; } catch (e) { return null; } };
    function pageCategory(p) {
        if (/^\/(exams|quizzes|wpr-practice)\//.test(p) || /^\/student\/wrs-sprint/.test(p)) return 'test';
        if (/^\/notes\//.test(p) || p === '/student/notes.html') return 'notes';
        if (/^\/compsci\/unit\d+-project/.test(p)) return 'project';
        if (/^\/(compsci|year1|year2)\//.test(p)) return 'reading';
        return 'other';
    }
    const frameEl = id => document.getElementById(id);
    const frameDoc = f => { try { return f && f.contentDocument; } catch (e) { return null; } };
    // The chapter open in the CS workspace, if any; notes and activity time is credited to it.
    function chapter() {
        const f = frameEl('curriculum-frame'), p = f && pathOf(f.contentWindow);
        return p ? { path: p, title: frameDoc(f)?.title || '' } : null;
    }
    // Notes, or an activity written in the notebook (its entry's own category says which).
    function notebookCat() {
        const c = String(document.getElementById('note-category')?.value || '').trim().toLowerCase();
        return !c || c === 'notes' ? 'notes' : 'activity';
    }
    function zoneFor(doc, target) {
        const here = { path: location.pathname, cat: pageCategory(location.pathname), title: document.title };
        const ch = chapter(), onChapter = ch ? { path: ch.path, title: ch.title } : here;
        if (doc === document) {
            const view = target && target.closest && target.closest('.workspace-view');
            if (view) return { ...onChapter, cat: view.id === 'view-journal' ? notebookCat() : 'activity' };
            if (target && target.closest && (target.closest('#note-form') || /^note-/.test(target.id || ''))) return { ...onChapter, cat: notebookCat() };
            return ch ? { ...onChapter, cat: pageCategory(ch.path) === 'project' ? 'project' : 'reading' } : here;
        }
        const f = [...document.querySelectorAll('iframe')].find(x => frameDoc(x) === doc), id = f ? f.id : '';
        const p = pathOf(doc.defaultView);
        if (id === 'notebook-frame') return { ...onChapter, cat: notebookCat() };
        if (id === 'assessment-frame') return { path: p || here.path, title: doc.title || '', cat: 'test' };
        if (p) { const c = pageCategory(p); return { path: p, title: doc.title || '', cat: c === 'other' ? 'reading' : c }; }
        return here;
    }
    function mark(doc, e) {
        const now = Date.now();
        if (e.type === 'pointermove' && now - lastMark < 1000) { lastInput = now; return; }
        lastInput = lastMark = now;
        zone = zoneFor(doc, e.target);
    }
    const watched = new WeakSet();
    function watch(doc) {
        if (!doc || watched.has(doc)) return;
        watched.add(doc);
        ['keydown', 'pointerdown', 'pointermove', 'wheel', 'scroll', 'touchstart', 'input'].forEach(t =>
            doc.addEventListener(t, e => mark(doc, e), { capture: true, passive: true }));
    }
    watch(document);

    setInterval(() => {
        document.querySelectorAll('iframe').forEach(f => watch(frameDoc(f)));  // frames that loaded a new page
        if (!zone || document.visibilityState !== 'visible' || !document.hasFocus() || Date.now() - lastInput > IDLE_MS) return;
        const k = zone.path + '|' + zone.cat;
        const it = pending.get(k) || { path: zone.path, cat: zone.cat, secs: 0, title: zone.title };
        it.secs++; if (zone.title) it.title = zone.title;
        pending.set(k, it);
    }, 1000);

    function flush(leaving) {
        const auth = window.dacAuthData;
        if (!pending.size) return;
        // Students only. Pages without the login check (the CS chapter pages) leave it to the server,
        // which goes by the session: signed-out sends are refused and the teacher's are ignored.
        if (auth && (!auth.isAuthenticated || auth.isTeacher)) { pending.clear(); return; }
        const body = JSON.stringify({ entries: [...pending.values()].map(x => ({ path: x.path, cat: x.cat, secs: x.secs, title: String(x.title || '').slice(0, 150) })) });
        pending.clear();
        if (leaving && navigator.sendBeacon) { navigator.sendBeacon('/api/activity/time', new Blob([body], { type: 'application/json' })); return; }
        fetch('/api/activity/time', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: true, body }).catch(() => {});
    }
    setInterval(() => flush(false), 60000);
    addEventListener('pagehide', () => flush(true));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
})();
