// js/help-button.js
// Private "I'm stuck" help requests (teacher 2026-11-23), injected sitewide by loader.js.
//  - Students: a small "I'm stuck" button in the bottom-right corner of lesson pages, above the
//    Clock In / Clock Out buttons
//    (not on tests or the login page). Only the teacher sees the request; nobody in
//    class can tell. Optional note. The button shows "Help is on the way" until the
//    teacher marks it done or the student cancels.
//  - Teacher: a red "N stuck" alert on every page with each student's name, period,
//    page, and note, and a Done button. API: server/routes/helpRequests.js.
(function () {
  if (window.__helpButtonLoaded) return;
  window.__helpButtonLoaded = true;

  const HIDE_ON = /(exam|final|quiz|test|pre-?assess|wpr-practice|login|logout|passwordre|register|sprint)/i;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pageTitle = () => (document.querySelector('h1')?.textContent || document.title || location.pathname).replace(/\s+/g, ' ').trim().slice(0, 200);

  function css() {
    if (document.getElementById('help-btn-css')) return;
    const st = document.createElement('style');
    st.id = 'help-btn-css';
    st.textContent = `
      .hb-wrap { position: fixed; right: 24px; bottom: 100px; z-index: 1045; font-family: inherit; }
      .hb-wrap.raised { bottom: 150px; }
      .hb-btn { border-radius: 2rem; font-weight: 700; box-shadow: 0 .4rem 1rem rgba(0,0,0,.22); padding: .45rem 1rem; }
      .hb-panel { position: absolute; right: 0; bottom: 3.2rem; width: min(320px, calc(100vw - 36px)); background: #fff; color: #212529; border-radius: .8rem;
        box-shadow: 0 .8rem 2rem rgba(0,0,0,.3); padding: 1rem; border: 2px solid #0d6efd; }
      .hb-panel textarea { width: 100%; font-size: .9rem; }
      .hb-list { max-height: 55vh; overflow-y: auto; }
      .hb-item { border-bottom: 1px solid #e9ecef; padding: .55rem 0; font-size: .88rem; }
      .hb-item:last-child { border-bottom: 0; }
      .hb-pulse { animation: hbpulse 1s ease-in-out 6; }
      @keyframes hbpulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
      @media print { .hb-wrap { display: none !important; } }`;
    document.head.appendChild(st);
  }

  function mount() {
    css();
    const wrap = document.createElement('div');
    wrap.className = 'hb-wrap';
    document.body.appendChild(wrap);
    // Sits above the Clock In/Out buttons (js/student/timeclock.js), and higher still when a page
    // also has the notebook calculator button.
    const raise = () => wrap.classList.toggle('raised', !!document.querySelector('.nbc-btn'));
    raise(); setTimeout(raise, 1500); setTimeout(raise, 4000);
    return wrap;
  }

  async function api(url, body) {
    const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Something went wrong.');
    return j;
  }

  // ---------------- Student ----------------
  function student() {
    if (HIDE_ON.test(location.pathname)) return;
    const wrap = mount();
    let open = null, panelOpen = false;

    function render() {
      if (document.fullscreenElement) { wrap.style.display = 'none'; return; }
      wrap.style.display = '';
      const btn = open
        ? `<button type="button" class="btn btn-success hb-btn" data-hb="toggle" aria-expanded="${panelOpen}"><i class="fas fa-hand me-1"></i>Help is on the way</button>`
        : `<button type="button" class="btn btn-light border border-primary text-primary hb-btn" data-hb="toggle" aria-expanded="${panelOpen}"><i class="fas fa-hand me-1"></i>I'm stuck</button>`;
      let panel = '';
      if (panelOpen && !open) panel = `<div class="hb-panel" role="dialog" aria-label="Ask for help">
          <p class="fw-bold mb-1">Ask your teacher for help</p>
          <p class="small text-muted mb-2">Only your teacher sees this. Nobody else will know.</p>
          <label class="small fw-bold mb-1" for="hbNote">What are you stuck on? (optional)</label>
          <textarea id="hbNote" class="form-control mb-2" rows="2" maxlength="300" placeholder="Like: step 3, my image won't show"></textarea>
          <div class="d-flex gap-2"><button type="button" class="btn btn-primary btn-sm fw-bold" data-hb="send">Send</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-hb="close">Never mind</button></div>
          <p class="hb-msg small text-danger mt-2 mb-0"></p></div>`;
      if (panelOpen && open) panel = `<div class="hb-panel" role="dialog" aria-label="Your help request">
          <p class="fw-bold mb-1">Your teacher knows you're stuck.</p>
          <p class="small text-muted mb-2">Keep trying what you can while you wait. If you figure it out, cancel your request.</p>
          <div class="d-flex gap-2"><button type="button" class="btn btn-outline-danger btn-sm fw-bold" data-hb="cancel">I figured it out</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-hb="close">Close</button></div>
          <p class="hb-msg small text-danger mt-2 mb-0"></p></div>`;
      wrap.innerHTML = panel + btn;
      if (panelOpen && !open) wrap.querySelector('#hbNote')?.focus();
    }

    async function refresh() {
      try { open = (await api('/api/student/stuck')).open; } catch (e) { /* background check; stay quiet */ }
      render();
    }

    wrap.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-hb]')?.dataset.hb;
      if (!act) return;
      const msg = (t) => { const m = wrap.querySelector('.hb-msg'); if (m) m.textContent = t; };
      if (act === 'toggle') { panelOpen = !panelOpen; render(); }
      if (act === 'close') { panelOpen = false; render(); }
      if (act === 'send') {
        try {
          await api('/api/student/stuck', { page_path: location.pathname + location.search, page_title: pageTitle(), note: wrap.querySelector('#hbNote')?.value || '' });
          panelOpen = false; await refresh();
        } catch (err) { msg(err.message); }
      }
      if (act === 'cancel') {
        try { await api('/api/student/stuck/cancel', {}); open = null; panelOpen = false; render(); }
        catch (err) { msg(err.message); }
      }
    });
    document.addEventListener('fullscreenchange', render);
    refresh();
    setInterval(() => { if (!document.hidden && !panelOpen) refresh(); }, 30000);
  }

  // ---------------- Teacher ----------------
  function teacher() {
    if (/\/login|\/logout/i.test(location.pathname)) return;
    const wrap = mount();
    let list = [], panelOpen = false, seen = new Set(), first = true;

    function ago(min) { return min < 1 ? 'just now' : min === 1 ? '1 min ago' : min < 60 ? `${min} min ago` : `${Math.floor(min / 60)} hr ${min % 60} min ago`; }

    function render(pulse) {
      if (!list.length) { wrap.innerHTML = ''; panelOpen = false; return; }
      const items = list.map(r => `<div class="hb-item">
          <div class="d-flex justify-content-between gap-2"><span class="fw-bold">${esc(r.first_name || '')} ${esc(r.last_name || r.student_id)}</span><span class="text-muted small text-nowrap">${esc(r.section_id || '')} · ${ago(Number(r.minutes) || 0)}</span></div>
          <div class="small"><a href="${esc(r.page_path)}" target="_blank" rel="noopener">${esc(r.page_title || r.page_path)}</a></div>
          ${r.note ? `<div class="small fst-italic">"${esc(r.note)}"</div>` : ''}
          <button type="button" class="btn btn-sm btn-outline-success fw-bold mt-1" data-done="${r.id}"><i class="fas fa-check me-1"></i>Done</button></div>`).join('');
      const panel = panelOpen ? `<div class="hb-panel"><div class="d-flex justify-content-between align-items-center mb-1"><span class="fw-bold">Students who are stuck</span>
          <button type="button" class="btn-close" data-hb="close" aria-label="Close"></button></div>
          <p class="small text-muted mb-1">Only you can see this. Oldest first.</p><div class="hb-list">${items}</div></div>` : '';
      wrap.innerHTML = panel + `<button type="button" class="btn btn-danger hb-btn ${pulse ? 'hb-pulse' : ''}" data-hb="toggle" aria-expanded="${panelOpen}"><i class="fas fa-hand me-1"></i>${list.length} stuck</button>`;
    }

    async function poll() {
      try {
        list = (await api('/api/admin/stuck')).requests || [];
        const fresh = list.some(r => !seen.has(r.id));
        list.forEach(r => seen.add(r.id));
        render(fresh && !first);
        first = false;
      } catch (e) { /* background; stay quiet */ }
    }

    wrap.addEventListener('click', async (e) => {
      const done = e.target.closest('[data-done]');
      if (done) {
        done.disabled = true;
        try { await api(`/api/admin/stuck/${done.dataset.done}/resolve`, {}); list = list.filter(r => String(r.id) !== done.dataset.done); render(); }
        catch (err) { done.disabled = false; alert(err.message); }
        return;
      }
      const act = e.target.closest('[data-hb]')?.dataset.hb;
      if (act === 'toggle') { panelOpen = !panelOpen; render(); }
      if (act === 'close') { panelOpen = false; render(); }
    });
    poll();
    setInterval(() => { if (!document.hidden) poll(); }, 15000);
  }

  function start(auth) {
    if (!auth || !auth.isAuthenticated) return;
    if (auth.isTeacher) teacher(); else student();
  }
  const go = () => { if (window.dacAuthData) start(window.dacAuthData); else document.addEventListener('authComplete', () => start(window.dacAuthData), { once: true }); };
  if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
})();
