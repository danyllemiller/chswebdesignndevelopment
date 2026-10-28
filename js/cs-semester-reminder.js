// End-of-semester "save your work" reminder (teacher request 2026-10-28): a bar under the menu on every page
// for Computer Science students during their class's last 5 meetings of the semester, linking to the
// "Download all my files" card on My Files. The dates come from special-dates.csv, so a calendar fix moves
// them too: a semester ends on its "End S1" / "Last Day of School" row, A-day classes meet on A and A_MIN
// days, B-day classes on B and B_MIN days, and every class meets on C (all-period) days. The teacher account
// sees it as well, with both rotations' last days. Injected on every page by js/loader.js (the CS chapter and
// project pages have no site footer).
(function () {
    if (window.self !== window.top || /wrs-sprint|\/exams\//i.test(location.pathname)) return;
    const MEETINGS = 5;
    const HIDE_KEY = 'cs-save-reminder-hidden';
    const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const longDay = s => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    // CS sections per PERIOD_COURSE_MAP (js/modules/grade-weights.js), plus hyphenated codes like CS-B8
    const isCsSection = s => /^(A3|A5|B4|B6|B8)$/.test(s) || /(^|-)CS(-|$)/.test(s);
    const rotationOf = s => (/(?:^|-)([AB])\d/.exec(s) || [])[1] || null;

    // Which rotation(s) this person's CS class meets on, or null if they aren't in CS
    async function rotations(auth) {
        if (auth.isTeacher) return ['A', 'B'];
        if (!auth.isCSStudent) return null;
        const section = String(auth.section_id || auth.studentClass || '').toUpperCase();
        if (isCsSection(section) && rotationOf(section)) return [rotationOf(section)];
        // In CS through a second section (student_additional_sections)
        try {
            const id = auth.user && auth.user.student_id;
            const extra = await (await fetch(`/api/admin/student-sections?student_id=${encodeURIComponent(id)}`, { credentials: 'same-origin' })).json();
            const cs = (Array.isArray(extra) ? extra : []).map(x => String(x.section_id || '').toUpperCase()).find(isCsSection);
            if (cs && rotationOf(cs)) return [rotationOf(cs)];
        } catch (e) { /* fall through: remind about both last days */ }
        return ['A', 'B'];
    }

    let started = false;
    async function start(auth) {
        if (started || !auth || !auth.isAuthenticated) return;
        started = true;
        try {
            const today = ymd(new Date());
            try { if (localStorage.getItem(HIDE_KEY) === today) return; } catch (e) { /* no storage: just show it */ }
            const days = await rotations(auth);
            if (!days) return;
            const csv = await (await fetch('/special-dates.csv')).text();
            const rows = csv.trim().split('\n').slice(1).map(line => {
                const [d, t, desc] = line.split(',');
                return { d: (d || '').trim(), t: (t || '').trim().toUpperCase(), desc: (desc || '').trim() };
            });
            // The semester that ends today or later
            const end = rows.filter(r => /End S1|End S2|Last Day of School/i.test(r.desc) && r.d >= today).map(r => r.d).sort()[0];
            if (!end) return;
            // Each rotation's last 5 class meetings up to the end of the semester
            const windows = days.map(day => {
                const meets = [...new Set(rows.filter(r => r.d <= end && (r.t === 'C' || r.t === day || r.t === day + '_MIN')).map(r => r.d))].sort().slice(-MEETINGS);
                return { day, meets, last: meets[meets.length - 1] };
            }).filter(w => w.meets.length && today >= w.meets[0] && today <= w.last);
            if (!windows.length) return;

            let text;
            if (auth.isTeacher) {
                text = 'Teacher view: CS students see this bar during their last 5 classes of the semester. Last class: '
                    + windows.map(w => `${w.day}-day ${longDay(w.last)}`).join(', ') + '.';
            } else if (windows.length > 1) {
                text = `The semester is almost over. Your last CS class is ${windows.map(w => longDay(w.last)).join(' or ')}. Save your work: download all your files and put them in your Google Drive.`;
            } else {
                const w = windows[0];
                const left = w.meets.filter(d => d >= today).length;
                text = today === w.last
                    ? 'Today is your LAST Computer Science class this semester. Save your work now: download all your files and put them in your Google Drive.'
                    : `The semester is almost over. Your last CS class is ${longDay(w.last)} (${left} class${left === 1 ? '' : 'es'} left${w.meets.includes(today) ? ', counting today' : ''}). Save your work: download all your files and put them in your Google Drive.`;
            }
            const bar = document.createElement('div');
            bar.id = 'cs-semester-reminder';
            bar.className = 'alert alert-success rounded-0 border-0 mb-0 py-2 px-3 d-flex flex-wrap justify-content-center align-items-center gap-2 fw-bold';
            bar.innerHTML = '<span><i class="fas fa-box-archive me-1"></i></span><span class="js-text"></span>'
                + '<a class="btn btn-sm btn-success fw-bold" href="/student/files.html#save-to-drive">Save my files now</a>'
                + '<button type="button" class="btn btn-sm btn-outline-dark">Hide until tomorrow</button>';
            bar.querySelector('.js-text').textContent = text;
            bar.querySelector('button').addEventListener('click', () => {
                try { localStorage.setItem(HIDE_KEY, today); } catch (e) { /* hides for this page only */ }
                bar.remove();
            });
            if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
            const nav = document.getElementById('nav-placeholder');
            if (nav) nav.after(bar); else document.body.prepend(bar);
        } catch (e) { /* the reminder is extra; never break the page over it */ }
    }
    if (window.dacAuthData) start(window.dacAuthData);
    else document.addEventListener('authComplete', () => start(window.dacAuthData));
})();
