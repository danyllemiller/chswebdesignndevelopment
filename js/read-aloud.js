// js/read-aloud.js
// Simple "Read Aloud" button for WD curriculum content pages, using the
// browser's built-in Web Speech API -- no external libraries. Injected
// sitewide by loader.js; self-guards to curriculum pages only (year1/year2
// chapters, computerscience.html) via the URL path, since the shared
// .container-ultrawide wrapper it reads from is also used on ~150 other
// pages (admin tools, student pages) this shouldn't appear on.
//
// The CS side has its own equivalent -- a button built into
// cs-interactive.html's left-pane header bar (js/cs-interactive.js), since
// the 20 CS chapter pages under /compsci/ are loaded inside an iframe
// there and a fixed header button reads better than one embedded in each
// page's scrolling content.

(function () {
  if (!('speechSynthesis' in window)) return; // unsupported browser -- silent no-op

  const CURRICULUM_PATH_PATTERNS = ['/year1/', '/year2/', '/computerscience.html'];
  const path = window.location.pathname.toLowerCase();
  if (!CURRICULUM_PATH_PATTERNS.some(p => path.includes(p))) return;

  const container = document.querySelector('.container-ultrawide');
  if (!container) return;

  let speaking = false;
  let btn = null;

  function getReadableText() {
    // Skip the prev/next chapter nav bar and anything marked no-print --
    // read just the actual lesson content.
    const clone = container.cloneNode(true);
    clone.querySelectorAll('nav, .no-print, script, style, iframe').forEach(el => el.remove());
    return (clone.innerText || clone.textContent || '').trim();
  }

  function updateButton() {
    if (!btn) return;
    btn.textContent = speaking ? '⏹ Stop Reading' : '🔊 Read Aloud';
    btn.classList.toggle('btn-danger', speaking);
    btn.classList.toggle('btn-outline-primary', !speaking);
  }

  function stopReading() {
    window.speechSynthesis.cancel();
    speaking = false;
    updateButton();
  }

  function startReading() {
    const text = getReadableText();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => { speaking = false; updateButton(); };
    utterance.onerror = () => { speaking = false; updateButton(); };
    speaking = true;
    updateButton();
    window.speechSynthesis.speak(utterance);
  }

  function createButton() {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary btn-sm fw-bold ms-3 no-print align-middle';
    btn.setAttribute('aria-label', 'Read this page aloud');
    updateButton();
    btn.addEventListener('click', () => { speaking ? stopReading() : startReading(); });

    // Sits inline at the end of the <h1> itself, rather than as its own
    // centered block below the title -- a full-width row felt awkward and
    // disconnected from the heading it belongs to.
    const h1 = container.querySelector('h1');
    if (h1) h1.appendChild(btn);
    else container.insertBefore(btn, container.firstChild);
  }

  // Speech synthesis doesn't stop on its own when a student navigates away.
  window.addEventListener('pagehide', () => window.speechSynthesis.cancel());

  createButton();
})();
