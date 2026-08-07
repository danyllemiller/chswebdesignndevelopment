// js/poll-listener.js
// Watches for a live teacher poll targeting this student's class period and
// throws up a full-screen "vote now" takeover until they respond.
// Injected sitewide by loader.js; no-ops for teachers/unauthenticated visitors.

(function () {
  const POLL_INTERVAL_MS = 4000;
  let checking = false;
  let currentPollId = null;
  let overlayEl = null;

  function ensureStyles() {
    if (document.getElementById('poll-listener-styles')) return;
    const style = document.createElement('style');
    style.id = 'poll-listener-styles';
    style.textContent = `
      #pollTakeover {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(10, 14, 39, .92);
        display: flex; align-items: center; justify-content: center;
        padding: 1.5rem;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      }
      #pollTakeover .poll-card {
        background: #fff; border-radius: 16px; padding: 2rem;
        max-width: 560px; width: 100%; text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,.4);
      }
      #pollTakeover h3 { color: #000099; font-weight: 800; margin-bottom: 1.5rem; font-size: 1.4rem; }
      #pollTakeover .poll-opt-btn {
        display: block; width: 100%; margin-bottom: .75rem;
        padding: .9rem 1rem; font-size: 1.05rem; font-weight: 700;
        border: 2px solid #000099; border-radius: 10px;
        background: #fff; color: #000099; cursor: pointer;
        transition: background .15s, color .15s;
      }
      #pollTakeover .poll-opt-btn:hover { background: #000099; color: #fff; }
      #pollTakeover .poll-status { color: #6c757d; font-size: .9rem; margin-top: 1rem; }
      #pollTakeover .poll-thanks { font-size: 1.15rem; font-weight: 700; color: #198754; }
    `;
    document.head.appendChild(style);
  }

  function removeOverlay() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
  }

  function showPoll(poll, studentId) {
    ensureStyles();
    removeOverlay();
    overlayEl = document.createElement('div');
    overlayEl.id = 'pollTakeover';

    const card = document.createElement('div');
    card.className = 'poll-card';

    const h3 = document.createElement('h3');
    h3.textContent = poll.question;
    card.appendChild(h3);

    poll.options.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'poll-opt-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => submitVote(poll.id, studentId, i));
      card.appendChild(btn);
    });

    const status = document.createElement('div');
    status.className = 'poll-status';
    status.id = 'pollTakeoverStatus';
    status.textContent = 'Your teacher wants to know — tap an answer above.';
    card.appendChild(status);

    overlayEl.appendChild(card);
    document.body.appendChild(overlayEl);
  }

  async function submitVote(pollId, studentId, optionIndex) {
    const status = document.getElementById('pollTakeoverStatus');
    if (status) status.textContent = 'Submitting…';
    try {
      const res = await fetch('/api/student/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: pollId, student_id: studentId, option_index: optionIndex })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (status) status.textContent = data.error || 'Something went wrong — try again.';
        return;
      }
      removeOverlay();
    } catch (e) {
      if (status) status.textContent = 'Network error — try again.';
    }
  }

  async function checkForPoll(studentId, sectionId) {
    if (checking) return;
    checking = true;
    try {
      const params = new URLSearchParams({ section_id: sectionId });
      if (studentId) params.set('student_id', studentId);
      const res = await fetch('/api/student/polls/active?' + params.toString());
      if (!res.ok) return;
      const data = await res.json();
      const poll = data.poll;

      if (!poll || poll.id !== currentPollId) {
        removeOverlay();
        currentPollId = poll ? poll.id : null;
      }

      if (poll && !data.alreadyVoted && !overlayEl) {
        showPoll(poll, studentId);
      } else if (!poll || data.alreadyVoted) {
        removeOverlay();
      }
    } catch (e) { /* stay silent — this is a background feature, not core to the page */ }
    finally { checking = false; }
  }

  function start(authData) {
    if (!authData || !authData.isAuthenticated || authData.isTeacher) return;
    const studentId = authData.user && (authData.user.student_id || authData.user.username);
    const sectionId = authData.section_id;
    if (!sectionId) return;
    checkForPoll(studentId, sectionId);
    setInterval(() => checkForPoll(studentId, sectionId), POLL_INTERVAL_MS);
  }

  if (window.dacAuthData) {
    start(window.dacAuthData);
  } else {
    document.addEventListener('authComplete', () => start(window.dacAuthData));
  }
})();
