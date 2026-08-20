// js/wordcloud-listener.js
// Watches for a live teacher word cloud targeting this student's class period
// and throws up a takeover where they can type in their word(s) until they've
// used up their allotted submissions. Injected sitewide by loader.js; no-ops
// for teachers/unauthenticated visitors.

(function () {
  const POLL_INTERVAL_MS = 4000;
  let checking = false;
  let currentCloudId = null;
  let overlayEl = null;

  function ensureStyles() {
    if (document.getElementById('wordcloud-listener-styles')) return;
    const style = document.createElement('style');
    style.id = 'wordcloud-listener-styles';
    style.textContent = `
      #wordCloudTakeover {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(10, 14, 39, .92);
        display: flex; align-items: center; justify-content: center;
        padding: 1.5rem;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      }
      #wordCloudTakeover .wc-card {
        background: #fff; border-radius: 16px; padding: 2rem;
        max-width: 480px; width: 100%; text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,.4);
      }
      #wordCloudTakeover h3 { color: #000099; font-weight: 800; margin-bottom: .5rem; font-size: 1.3rem; }
      #wordCloudTakeover .wc-sub { color: #6c757d; font-size: .85rem; margin-bottom: 1.25rem; }
      #wordCloudTakeover .wc-input-row { display: flex; gap: .5rem; margin-bottom: 1rem; }
      #wordCloudTakeover .wc-input {
        flex: 1; padding: .75rem 1rem; font-size: 1.05rem; font-weight: 600;
        border: 2px solid #000099; border-radius: 10px;
      }
      #wordCloudTakeover .wc-submit-btn {
        padding: .75rem 1.25rem; font-weight: 800; border: none; border-radius: 10px;
        background: #000099; color: #fff; cursor: pointer;
      }
      #wordCloudTakeover .wc-submit-btn:disabled { opacity: .5; cursor: default; }
      #wordCloudTakeover .wc-chip {
        display: inline-block; background: #e9ecff; color: #000099; font-weight: 700;
        padding: .3rem .75rem; border-radius: 999px; margin: .2rem; font-size: .9rem;
      }
      #wordCloudTakeover .wc-status { color: #6c757d; font-size: .85rem; margin-top: 1rem; }
      #wordCloudTakeover .wc-done-btn {
        margin-top: 1rem; padding: .6rem 1.5rem; font-weight: 700; border-radius: 10px;
        border: 2px solid #198754; background: #fff; color: #198754; cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function removeOverlay() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
  }

  function renderChips(container, words) {
    container.innerHTML = '';
    words.forEach(w => {
      const chip = document.createElement('span');
      chip.className = 'wc-chip';
      chip.textContent = w;
      container.appendChild(chip);
    });
  }

  function showCloud(cloud, studentId, myWords, remaining) {
    ensureStyles();
    removeOverlay();
    overlayEl = document.createElement('div');
    overlayEl.id = 'wordCloudTakeover';

    const card = document.createElement('div');
    card.className = 'wc-card';

    const h3 = document.createElement('h3');
    h3.textContent = cloud.prompt;
    card.appendChild(h3);

    const sub = document.createElement('div');
    sub.className = 'wc-sub';
    sub.id = 'wcSub';
    sub.textContent = remaining > 0
      ? `Type up to ${remaining} more word${remaining === 1 ? '' : 's'}`
      : "You're all set!";
    card.appendChild(sub);

    const chips = document.createElement('div');
    chips.id = 'wcChips';
    renderChips(chips, myWords);
    card.appendChild(chips);

    const inputRow = document.createElement('div');
    inputRow.className = 'wc-input-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'wc-input';
    input.placeholder = 'Type a word…';
    input.maxLength = 60;
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'wc-submit-btn';
    submitBtn.textContent = 'Add';
    inputRow.append(input, submitBtn);
    card.appendChild(inputRow);

    const status = document.createElement('div');
    status.className = 'wc-status';
    status.id = 'wcStatus';
    card.appendChild(status);

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'wc-done-btn';
    doneBtn.textContent = "I'm done";
    doneBtn.addEventListener('click', removeOverlay);
    card.appendChild(doneBtn);

    if (remaining <= 0) {
      input.disabled = true;
      submitBtn.disabled = true;
    }

    const submit = () => submitWord(cloud.id, studentId, input.value);
    submitBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

    overlayEl.appendChild(card);
    document.body.appendChild(overlayEl);
    input.focus();
  }

  async function submitWord(cloudId, studentId, rawWord) {
    const word = rawWord.trim();
    const status = document.getElementById('wcStatus');
    if (!word) return;
    if (status) status.textContent = 'Submitting…';
    try {
      const res = await fetch('/api/student/wordcloud/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordcloud_id: cloudId, student_id: studentId, word })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (status) status.textContent = data.error || 'Something went wrong — try again.';
        return;
      }
      if (status) status.textContent = '';
      const input = overlayEl && overlayEl.querySelector('.wc-input');
      if (input) { input.value = ''; input.focus(); }
      // Re-check immediately so the chip list / remaining count refreshes
      // without waiting for the next poll interval.
      checkForCloud(studentId, lastSectionId, true);
    } catch (e) {
      if (status) status.textContent = 'Network error — try again.';
    }
  }

  let lastSectionId = null;

  async function checkForCloud(studentId, sectionId, force) {
    if (checking && !force) return;
    checking = true;
    lastSectionId = sectionId;
    try {
      const params = new URLSearchParams({ section_id: sectionId });
      if (studentId) params.set('student_id', studentId);
      const res = await fetch('/api/student/wordcloud/active?' + params.toString());
      if (!res.ok) return;
      const data = await res.json();
      const cloud = data.wordcloud;

      if (!cloud || cloud.id !== currentCloudId) {
        removeOverlay();
        currentCloudId = cloud ? cloud.id : null;
      }

      if (cloud && data.remaining > 0 && !overlayEl) {
        showCloud(cloud, studentId, data.myWords || [], data.remaining);
      } else if (cloud && overlayEl) {
        // Live-refresh the chip list / remaining count on an already-open overlay
        const sub = document.getElementById('wcSub');
        const chips = document.getElementById('wcChips');
        if (sub) sub.textContent = data.remaining > 0
          ? `Type up to ${data.remaining} more word${data.remaining === 1 ? '' : 's'}`
          : "You're all set!";
        if (chips) renderChips(chips, data.myWords || []);
        const input = overlayEl.querySelector('.wc-input');
        const btn = overlayEl.querySelector('.wc-submit-btn');
        if (input && btn && data.remaining <= 0) { input.disabled = true; btn.disabled = true; }
      } else if (!cloud) {
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
    checkForCloud(studentId, sectionId);
    setInterval(() => checkForCloud(studentId, sectionId), POLL_INTERVAL_MS);
  }

  if (window.dacAuthData) {
    start(window.dacAuthData);
  } else {
    document.addEventListener('authComplete', () => start(window.dacAuthData));
  }
})();
