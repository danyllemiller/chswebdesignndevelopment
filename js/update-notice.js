// js/update-notice.js
// Shows "The site was just updated. Refresh" when the site's own JavaScript or
// CSS changes while a page is open (GET /api/site-version). A page loaded
// before an update keeps running the old code: on 2026-10-23 a peer-review
// page opened before that morning's update kept sending reviews the new
// server rejected, and the old page only said "couldn't save." Injected
// sitewide by js/loader.js. It never reloads by itself (a student could lose
// work), and it never shows on a test page or inside an iframe.
(function () {
    if (window.__updateNotice) return;
    window.__updateNotice = true;
    let inFrame = true;
    try { inFrame = window.self !== window.top; } catch (e) {}
    if (inFrame || /\/exams\/|wrs-sprint|wpr-practice/i.test(location.pathname)) return;

    let firstVersion = null;
    async function check() {
        try {
            const res = await fetch('/api/site-version', { cache: 'no-store' });
            if (!res.ok) return;
            const { v } = await res.json();
            if (!v) return;
            if (firstVersion === null) { firstVersion = v; return; }
            if (v !== firstVersion) show();
        } catch (e) { /* offline or server restarting: try again later */ }
    }

    function show() {
        if (document.getElementById('update-notice')) return;
        const bar = document.createElement('div');
        bar.id = 'update-notice';
        bar.setAttribute('role', 'status');
        bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:10000;'
            + 'background:#1f2a44;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.25);'
            + 'display:flex;gap:12px;align-items:center;font:600 14px/1.3 system-ui,sans-serif;max-width:calc(100% - 32px);';
        bar.innerHTML = '<span>The site was just updated.</span>'
            + '<button type="button" style="background:#ffc107;color:#1f2a44;border:0;border-radius:6px;padding:6px 12px;font-weight:800;cursor:pointer;">Refresh</button>'
            + '<button type="button" aria-label="Dismiss" style="background:none;border:0;color:#cbd5e1;font-size:20px;line-height:1;cursor:pointer;">&times;</button>';
        bar.children[1].addEventListener('click', () => location.reload());
        bar.children[2].addEventListener('click', () => bar.remove());
        document.body.appendChild(bar);
    }

    check();
    setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
})();
