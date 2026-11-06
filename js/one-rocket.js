// /js/one-rocket.js
// Only one back-to-top rocket (teacher 2026-11-06: the CS Workspace showed two, its own and the chapter's inside its
// frame). When a frame on this page shows a page that has its own rocket, this page's rocket hides, so the one left
// is the one that scrolls what you're reading; it comes back when the frame shows something without one (the
// notebook, say). Loaded from includes/site-footer.html (and compSciFinalEmbeded.html, which has no footer).
(function () {
    if (window.self !== window.top) return;   // the page inside the frame keeps its rocket
    function sync() {
        const framed = [...document.querySelectorAll('iframe')].some(f => {
            if (f.offsetParent === null) return false;   // a frame that isn't showing
            try { return !!(f.contentDocument && f.contentDocument.querySelector('.back-to-top')); } catch (e) { return false; }
        });
        document.querySelectorAll('.back-to-top').forEach(a => { a.style.display = framed ? 'none' : ''; });
    }
    function watch() {
        document.querySelectorAll('iframe').forEach(f => {
            if (f.dataset.oneRocket) return;
            f.dataset.oneRocket = '1';
            f.addEventListener('load', sync);
        });
        sync();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
    setInterval(watch, 2000);   // the page's own tabs show, hide, or swap frames
})();
