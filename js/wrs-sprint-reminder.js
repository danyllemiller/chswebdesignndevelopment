// Monday WRS Sprint reminder (teacher request 2026-10-26): a bar under the
// menu on every page for Web Design 2 students while that day's Sprint is
// open and not finished (server/routes/wrsSprint.js decides). Loaded by
// includes/site-footer.html, which js/loader.js fetches fresh on every page.
(function () {
    if (window.self !== window.top || /wrs-sprint|\/exams\//i.test(location.pathname)) return;
    let checked = false;
    async function check(auth) {
        if (checked || !auth || !auth.isAuthenticated || auth.isTeacher) return;
        const section = String(auth.studentClass || auth.section_id || '').toUpperCase();
        if (!(section === 'B2' || section === 'AS-B2' || section.startsWith('WD2'))) return;
        checked = true;
        try {
            const res = await fetch('/api/wrs-sprint/status', { credentials: 'same-origin' });
            if (!res.ok) return;
            const st = await res.json();
            // A beta tester's state stays "open" after finishing, so today's
            // history entry counts as done too.
            const doneToday = st.state === 'done' || (st.history || []).some(h => h.week === st.today);
            if (st.preview || doneToday || !['open', 'in-progress'].includes(st.state) || !(st.isMonday || st.practice)) return;
            const bar = document.createElement('div');
            bar.id = 'wrs-sprint-reminder';
            bar.className = 'alert alert-warning rounded-0 border-0 mb-0 py-2 px-3 d-flex flex-wrap justify-content-center align-items-center gap-2 fw-bold';
            bar.innerHTML = '<span><i class="fas fa-bolt me-1"></i>Monday WRS Sprint is open today: 10 minutes, one try.</span>'
                + `<a class="btn btn-sm btn-dark fw-bold" href="/student/wrs-sprint.html">${st.state === 'in-progress' ? 'Finish it now' : 'Take it now'}</a>`;
            const nav = document.getElementById('nav-placeholder');
            if (nav) nav.after(bar); else document.body.prepend(bar);
        } catch (e) { /* the reminder is extra; never break the page over it */ }
    }
    if (window.dacAuthData) check(window.dacAuthData);
    else document.addEventListener('authComplete', () => check(window.dacAuthData));
})();
