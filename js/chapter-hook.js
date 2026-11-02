// /js/chapter-hook.js
// The chapter's (or CS unit's) Hook, Line & Sinker at the top of its page, from
// /data/chapter-hooks.json. A page opts in with a placeholder and this script:
//   <div id="chapter-hook"></div>
//   <script src="/js/chapter-hook.js?v=1" data-hook="wd1-3" defer></script>
// HOOK grabs attention, LINE says what the chapter teaches and why it matters,
// SINKER is the challenge students commit to. Nothing shows if the key has no hook.
(function () {
    const me = document.currentScript;
    const key = me && me.dataset.hook;
    if (!key) return;
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function show(h) {
        const box = document.getElementById('chapter-hook');
        if (!box || !h) return;
        const part = (label, text, color) => `<div style="display:flex;gap:.75rem;align-items:baseline;margin:.35rem 0">
            <span style="flex:none;min-width:5.2rem;font-weight:800;letter-spacing:.06em;font-size:.8rem;color:#fff;background:${color};border-radius:.4rem;padding:.15rem .5rem;text-align:center">${label}</span>
            <span style="color:#1d1d1f;font-size:1.02rem;line-height:1.45">${esc(text)}</span></div>`;
        box.innerHTML = `<div style="max-width:1100px;margin:0 auto 2rem;background:#fffdf5;border:2px solid #1f246b;border-radius:14px;padding:1rem 1.25rem;box-shadow:0 .25rem .75rem rgba(0,0,0,.08)">
            <div style="font-weight:800;color:#1f246b;margin-bottom:.25rem"><i class="fas fa-fish me-2"></i>Hook, Line &amp; Sinker</div>
            ${part('HOOK', h.hook, '#b03a12')}${part('LINE', h.line, '#1f246b')}${part('SINKER', h.sinker, '#2b6a2f')}</div>`;
    }
    fetch('/data/chapter-hooks.json', { cache: 'no-cache' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { const h = d && d.hooks && d.hooks[key]; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => show(h)); else show(h); })
        .catch(() => { /* no hook card is fine */ });
})();
