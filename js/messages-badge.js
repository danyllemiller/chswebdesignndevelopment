// js/messages-badge.js
// Unread-message pill in the nav bar, for both students and the teacher.
// Injected sitewide by loader.js; no-ops for unauthenticated visitors.
// Deliberately its own poll interval (20s) -- distinct from poll-listener's
// 4s and the timeclock's 60s, less urgent than either since an unread badge
// isn't time-critical the way a live poll or a clock-in/out window is.

(function () {
  const POLL_INTERVAL_MS = 20000;

  // A student's nav can show any combination of the WD/CS/INTV menu blocks
  // depending on enrollment (see filterNavigation() in loader.js), but
  // there's only one message thread per student regardless of course --
  // simplest to just update all three badges with the same count and let
  // whichever menu block is actually visible show it, rather than
  // duplicating that enrollment logic here.
  // Each course's dropdown TOGGLE gets a badge too (so something's-unread
  // is visible without opening the menu), plus one right next to the
  // actual "Messages" link itself inside that same dropdown.
  const STUDENT_BADGE_IDS = ['msg-badge-wd', 'msg-badge-cs', 'msg-badge-intv', 'msg-badge-wd-item', 'msg-badge-cs-item', 'msg-badge-intv-item'];
  const ADMIN_BADGE_IDS = ['msg-badge-admin', 'msg-badge-admin-item'];

  function setBadges(ids, count) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = count > 99 ? '99+' : String(count);
      el.classList.toggle('d-none', count <= 0);
    });
  }

  async function pollStudent() {
    try {
      const res = await fetch('/api/student/messages/unread-count');
      if (!res.ok) return;
      const data = await res.json();
      setBadges(STUDENT_BADGE_IDS, data.count || 0);
    } catch (e) { /* stay silent -- this is a background feature, not core to the page */ }
  }

  async function pollAdmin() {
    try {
      const res = await fetch('/api/admin/messages/unread-count');
      if (!res.ok) return;
      const data = await res.json();
      setBadges(ADMIN_BADGE_IDS, data.count || 0);
    } catch (e) { /* stay silent -- this is a background feature, not core to the page */ }
  }

  function start(authData) {
    if (!authData || !authData.isAuthenticated) return;
    if (authData.isTeacher) {
      pollAdmin();
      setInterval(pollAdmin, POLL_INTERVAL_MS);
    } else {
      pollStudent();
      setInterval(pollStudent, POLL_INTERVAL_MS);
    }
  }

  if (window.dacAuthData) {
    start(window.dacAuthData);
  } else {
    document.addEventListener('authComplete', () => start(window.dacAuthData));
  }
})();
