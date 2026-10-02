// js/ic-reminder-badge.js
// Nothing in this app talks to Infinite Campus (no API access exists) --
// scanning only updates THIS system. This badge is just a reminder that
// some tardy/absent rows still need the teacher to go re-enter them in IC
// by hand, since otherwise the only record of "I should go do that" was
// whatever she happened to remember after the bell. Teacher-only, same
// sitewide-injection pattern as js/messages-badge.js.
(function () {
  const POLL_INTERVAL_MS = 20000;
  const BADGE_IDS = ['ic-badge-admin', 'ic-badge-admin-item'];

  function setBadges(count) {
    BADGE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = count > 99 ? '99+' : String(count);
      el.classList.toggle('d-none', count <= 0);
    });
  }

  async function poll() {
    try {
      const res = await fetch('/api/admin/attendance/ic-pending');
      if (!res.ok) return;
      const data = await res.json();
      setBadges(data.count || 0);
    } catch (e) { /* stay silent -- this is a background feature, not core to the page */ }
  }

  function start(authData) {
    if (!authData || !authData.isAuthenticated || !authData.isTeacher) return;
    poll();
    setInterval(poll, POLL_INTERVAL_MS);
  }

  if (window.dacAuthData) {
    start(window.dacAuthData);
  } else {
    document.addEventListener('authComplete', () => start(window.dacAuthData));
  }
})();
