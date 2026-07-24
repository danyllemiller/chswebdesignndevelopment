// Attendance reminder — shows a banner during the first 10 minutes of each period
// on admin/gradebook.html and admin/roster.html on active rotation days.
(function () {
    function toMinutes(hhmm) {
        if (!hhmm) return 0;
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
    }

    function todayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    async function getRotationType() {
        try {
            const text = await fetch('/special-dates.csv').then(r => r.text());
            const today = todayStr();
            for (const line of text.trim().split('\n').slice(1)) {
                const parts = line.split(',');
                if (parts[0] && parts[0].trim() === today) {
                    return (parts[1] || '').trim();
                }
            }
        } catch (_) {}
        return null;
    }

    function injectBanner(period) {
        const dismissKey = `attn-dismissed-${todayStr()}-${period.period_label}`;
        if (sessionStorage.getItem(dismissKey)) return;

        const div = document.createElement('div');
        div.className = 'alert alert-warning alert-dismissible fade show shadow-sm mx-3 mt-3 d-flex align-items-center gap-2';
        div.setAttribute('role', 'alert');
        div.innerHTML = `
            <i class="fas fa-bell fs-5 text-warning"></i>
            <div>
                <strong>Attendance Reminder:</strong>
                <strong>${period.period_label}</strong> started at <strong>${period.start_time}</strong>
                — submit attendance in Infinite Campus now.
            </div>
            <button type="button" class="btn-close ms-auto" aria-label="Dismiss"></button>`;

        div.querySelector('.btn-close').addEventListener('click', () => {
            sessionStorage.setItem(dismissKey, '1');
            div.remove();
        });

        const target = document.querySelector('.container-fluid.my-4, .container.my-5, .container-fluid, body');
        if (target) target.insertBefore(div, target.firstChild);
    }

    async function check() {
        const rotation = await getRotationType();
        if (!rotation || rotation === 'OFF' || rotation === 'none') return;

        let schedule = [];
        try {
            const data = await fetch(`/api/bell-schedule?type=${encodeURIComponent(rotation)}`).then(r => r.json());
            schedule = data.schedule || [];
        } catch (_) { return; }

        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();

        for (const period of schedule) {
            const start = toMinutes(period.start_time);
            if (nowMin >= start && nowMin < start + 10) {
                injectBanner(period);
            }
        }
    }

    // Run on load, then every 2 minutes to catch period starts mid-session
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', check);
    } else {
        check();
    }
    setInterval(check, 2 * 60 * 1000);
})();
