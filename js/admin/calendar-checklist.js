// /js/admin/calendar-checklist.js
(function () {
    'use strict';

    const COLORS = {
        daily:    '#003087',
        weekly:   '#0a58ca',
        monthly:  '#d96a00',
        quarterly:'#b02a37',
        semester: '#5a6268',
    };

    const LABELS = {
        daily:    "Today's Checklist",
        weekly:   "This Week's Checklist",
        monthly:  "This Month's Checklist",
        quarterly:"Quarterly Checklist",
        semester: "Semester Checklist",
    };

    let _tid    = null;
    let _view   = 'view-monthly';
    let _sdCache = null;

    function pad(n) { return String(n).padStart(2, '0'); }

    function todayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }

    function isoWeek(d) {
        const thu = new Date(d);
        thu.setDate(d.getDate() - (d.getDay() + 6) % 7 + 3);
        const jan4 = new Date(thu.getFullYear(), 0, 4);
        return `${thu.getFullYear()}-W${pad(1 + Math.round((thu - jan4) / 604800000))}`;
    }

    function cadencePeriodKey(cadence) {
        const d = new Date();
        if (cadence === 'daily')   return todayStr();
        if (cadence === 'weekly')  return isoWeek(d);
        if (cadence === 'monthly') return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
        return null;
    }

    function getDisplayedMonth() {
        try {
            return {
                year:  parseInt(localStorage.getItem('cal_year'))  || new Date().getFullYear(),
                month: parseInt(localStorage.getItem('cal_month') ?? new Date().getMonth()),
            };
        } catch {
            return { year: new Date().getFullYear(), month: new Date().getMonth() };
        }
    }

    async function fetchSpecialDates() {
        if (_sdCache) return _sdCache;
        try {
            const text = await (await fetch('/special-dates.csv')).text();
            _sdCache = text.split(/\r?\n/)
                .filter(l => l.trim() && !/^date/i.test(l.split(',')[0].trim()))
                .map(l => { const c = l.split(','); return { date: c[0]?.trim(), type: c[1]?.trim(), desc: c.slice(2).join(',').trim() }; })
                .filter(r => r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date));
        } catch { _sdCache = []; }
        return _sdCache;
    }

    function getViewedDate() {
        try {
            const cd = localStorage.getItem('cal_date');
            if (cd && /^\d{4}-\d{2}-\d{2}$/.test(cd)) return cd;
        } catch {}
        return todayStr();
    }

    function isHolidayPeriod(cadence, dates) {
        function isWorkDay(dateStr) {
            const dow = new Date(dateStr + 'T00:00:00').getDay();
            if (dow === 0 || dow === 6) return false;                // weekend
            const row = dates.find(r => r.date === dateStr);
            if (!row) return true;                                    // not in CSV → assume school
            if (row.type !== 'OFF') return true;                      // A/B/C/etc → school day
            // OFF day: teacher work days still count as work days
            const desc = (row.desc || '').toLowerCase();
            return ['teacher work', 'teacher training', 'prof learning'].some(k => desc.includes(k));
        }

        // Use the calendar's currently viewed date, not today
        const viewedStr = getViewedDate();
        const anchor    = new Date(viewedStr + 'T00:00:00');
        const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

        if (cadence === 'daily') return !isWorkDay(viewedStr);

        if (cadence === 'weekly') {
            const mon = new Date(anchor);
            mon.setDate(anchor.getDate() - (anchor.getDay() + 6) % 7);
            for (let i = 0; i < 5; i++) {
                const d = new Date(mon); d.setDate(mon.getDate() + i);
                if (isWorkDay(ds(d))) return false;   // found at least one work day
            }
            return true;  // all 5 weekdays are holidays/off
        }

        return false;  // monthly: always show
    }

    function eventsInMonth(dates, keywords, year, month) {
        const start = `${year}-${pad(month+1)}-01`;
        const end   = `${year}-${pad(month+1)}-${pad(new Date(year, month+1, 0).getDate())}`;
        return dates.filter(r => keywords.some(k => r.desc.includes(k)) && r.date >= start && r.date <= end);
    }

    async function apiGet(cadence, pk) {
        const res = await fetch(
            `/api/admin/checklist?teacher_id=${encodeURIComponent(_tid)}&cadence=${cadence}&period_key=${encodeURIComponent(pk)}`
        );
        return res.json();
    }

    async function apiToggle(cadence, key, pk, val) {
        await fetch('/api/admin/checklist/toggle', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ teacher_id: _tid, cadence, item_key: key, period_key: pk, completed: val }),
        });
    }

    function updateBadge() {
        const all  = [...document.querySelectorAll('#cal-cl-body input[type="checkbox"]')];
        const done = all.filter(c => c.checked).length;
        const el   = document.getElementById('cal-cl-badge');
        if (el) el.textContent = `${done}/${all.length}`;
    }

    function renderSection(cadence, pk, data, container, isExtra) {
        const items = data.items || [];
        const color = COLORS[cadence] || '#555';
        const sec   = document.createElement('div');

        if (isExtra) {
            sec.className = 'mt-3 pt-2 border-top';
            const hdr = document.createElement('div');
            hdr.className = 'd-flex align-items-center gap-2 mb-2';
            const done = items.filter(i => i.completed).length;
            hdr.innerHTML =
                `<span class="fw-semibold small" style="color:${color}">` +
                `<i class="fas fa-flag-checkered me-1"></i>${LABELS[cadence]}</span>` +
                `<span class="badge ms-1" style="background:${color};color:#fff;font-size:.65rem">${done}/${items.length}</span>`;
            sec.appendChild(hdr);
        }

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'd-flex align-items-start gap-2 mb-2';
            row.style.cssText = `border-left:3px solid ${color};padding-left:8px`;

            const cb = document.createElement('input');
            cb.type      = 'checkbox';
            cb.className = 'form-check-input flex-shrink-0';
            cb.style.marginTop = '2px';
            cb.checked   = !!item.completed;

            const lbl = document.createElement('label');
            lbl.className = 'form-check-label small w-100';
            if (item.completed) { lbl.style.textDecoration = 'line-through'; lbl.style.opacity = '.55'; }
            lbl.textContent = item.text;

            cb.addEventListener('change', async () => {
                const v = cb.checked ? 1 : 0;
                lbl.style.textDecoration = v ? 'line-through' : '';
                lbl.style.opacity        = v ? '.55' : '';
                updateBadge();
                await apiToggle(cadence, item.key, pk, v);
            });

            row.appendChild(cb);
            row.appendChild(lbl);
            sec.appendChild(row);
        });

        container.appendChild(sec);
    }

    async function loadView(viewId) {
        _view = viewId;
        const wrap   = document.getElementById('cal-checklist-wrap');
        const body   = document.getElementById('cal-cl-body');
        if (!wrap || !body) return;

        if (viewId === 'view-events') { wrap.classList.add('d-none'); return; }
        wrap.classList.remove('d-none');

        const cadenceMap = { 'view-daily':'daily', 'view-weekly':'weekly', 'view-monthly':'monthly' };
        const cadence    = cadenceMap[viewId] || 'monthly';
        const pk         = cadencePeriodKey(cadence);
        const color      = COLORS[cadence] || '#003087';

        const titleEl = document.getElementById('cal-cl-title');
        const hdrEl   = document.getElementById('cal-cl-header');
        if (titleEl) titleEl.textContent = LABELS[cadence];
        if (hdrEl)   hdrEl.style.background = color;

        body.innerHTML = '<div class="text-center py-2 text-muted small"><span class="spinner-border spinner-border-sm me-1"></span></div>';
        if (!pk) { body.innerHTML = '<p class="text-muted small p-2 fst-italic">Period unavailable.</p>'; return; }

        try {
            // Hide checklist on holidays / non-school weeks
            if (cadence === 'daily' || cadence === 'weekly') {
                const sdates = await fetchSpecialDates();
                if (isHolidayPeriod(cadence, sdates)) {
                    const noun = cadence === 'daily' ? 'today' : 'this week';
                    body.innerHTML = `<p class="text-muted small fst-italic p-1 mb-0">
                        <i class="fas fa-umbrella-beach me-1"></i>No school ${noun} — enjoy the break!
                    </p>`;
                    const badge = document.getElementById('cal-cl-badge');
                    if (badge) badge.textContent = '';
                    return;
                }
            }

            const data = await apiGet(cadence, pk);
            body.innerHTML = '';
            renderSection(cadence, pk, data, body, false);

            if (cadence === 'monthly') {
                const { year, month } = getDisplayedMonth();
                const dates  = await fetchSpecialDates();

                const qRows = eventsInMonth(dates, ['End Q1','End Q3'], year, month);
                for (const r of qRows.slice(0,1)) {
                    const qData = await apiGet('quarterly', `Q-${r.date}`);
                    renderSection('quarterly', `Q-${r.date}`, qData, body, true);
                }

                const sRows = eventsInMonth(dates, ['End S1','Last Day'], year, month);
                for (const r of sRows.slice(0,1)) {
                    const sData = await apiGet('semester', `S-${r.date}`);
                    renderSection('semester', `S-${r.date}`, sData, body, true);
                }
            }

            updateBadge();
        } catch {
            body.innerHTML = '<p class="text-danger small p-2">Could not load checklist.</p>';
        }
    }

    function setup() {
        if (!window.dacAuthData?.isTeacher) return;
        _tid = window.dacAuthData?.user?.student_id;
        if (!_tid) return;

        document.getElementById('cal-cl-mark-all')?.addEventListener('click', () => {
            document.querySelectorAll('#cal-cl-body input[type="checkbox"]:not(:checked)').forEach(cb => {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
            });
        });

        document.getElementById('cal-cl-reset')?.addEventListener('click', async () => {
            const map     = { 'view-daily':'daily','view-weekly':'weekly','view-monthly':'monthly' };
            const cadence = map[_view] || 'monthly';
            const pk      = cadencePeriodKey(cadence);
            if (!pk) return;
            await fetch('/api/admin/checklist/reset', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ teacher_id: _tid, cadence, period_key: pk }),
            });
            loadView(_view);
        });

        // Radio button view switches
        document.querySelectorAll('[name="calendar-view"]').forEach(r => {
            r.addEventListener('change', () => loadView(r.id));
        });

        // Month grid day-click → calendar.js switches to daily view programmatically (no change event)
        document.getElementById('calendar')?.addEventListener('click', e => {
            if (e.target.closest('.calendar-day')) setTimeout(() => loadView('view-daily'), 30);
        });

        // Events-list row click → calendar.js also goes to daily view programmatically
        document.getElementById('events-list-view')?.addEventListener('click', e => {
            if (e.target.closest('.event-list-row')) setTimeout(() => loadView('view-daily'), 30);
        });

        // Month navigation may change which Q/S events are in the displayed month
        ['prev-month','next-month'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                if (_view === 'view-monthly') setTimeout(() => loadView('view-monthly'), 60);
            });
        });

        // Initial load — read whichever view is already active (may be restored from localStorage)
        const active = document.querySelector('[name="calendar-view"]:checked');
        loadView(active?.id || 'view-monthly');
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (window.dacAuthData) { setup(); return; }
        document.addEventListener('authComplete', setup, { once: true });
    });
})();
