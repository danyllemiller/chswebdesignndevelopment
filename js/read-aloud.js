// js/read-aloud.js
// Simple "Read Aloud" button for curriculum content pages, using the
// browser's built-in Web Speech API -- no external libraries. Injected
// sitewide by loader.js; self-guards to curriculum pages only (year1/year2
// chapters, computerscience.html, and the /compsci/ CS chapter pages) via
// the URL path, since the shared .container-ultrawide wrapper it reads
// from on WD/computerscience.html pages is also used on ~150 other pages
// (admin tools, student pages) this shouldn't appear on.
//
// The 20 CS chapter pages under /compsci/ are loaded inside an iframe by
// cs-interactive.js and don't include loader.js -- this file is added to
// each of them directly (they don't use .container-ultrawide either, so
// the container/anchor logic below falls back to their own
// .chapter-header/.sticky-toc layout).

(function () {
  if (!('speechSynthesis' in window)) return; // unsupported browser -- silent no-op

  const CURRICULUM_PATH_PATTERNS = ['/year1/', '/year2/', '/computerscience.html', '/compsci/'];
  const path = window.location.pathname.toLowerCase();
  if (!CURRICULUM_PATH_PATTERNS.some(p => path.includes(p))) return;

  const container = document.querySelector('.container-ultrawide') || document.body;
  if (!container) return;

  let speaking = false;
  let btn = null;

  function getReadableText() {
    // Skip the prev/next chapter nav bar, the CS chapter pages' own
    // "in this chapter" jump-link bar, and anything marked no-print --
    // read just the actual lesson content.
    const clone = container.cloneNode(true);
    clone.querySelectorAll('nav, .no-print, .sticky-toc, script, style, iframe').forEach(el => el.remove());
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
    const wrapper = document.createElement('div');
    wrapper.className = 'text-center mb-4 no-print';

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary btn-sm fw-bold';
    btn.setAttribute('aria-label', 'Read this page aloud');
    updateButton();
    btn.addEventListener('click', () => { speaking ? stopReading() : startReading(); });

    wrapper.appendChild(btn);
    // On CS chapter pages, sit below the "in this chapter" jump-link bar
    // rather than between it and the title. Elsewhere, sit right below the
    // page's <h1>.
    const anchor = container.querySelector('.sticky-toc') || container.querySelector('h1');
    if (anchor) anchor.insertAdjacentElement('afterend', wrapper);
    else container.insertBefore(wrapper, container.firstChild);
  }

  // Speech synthesis doesn't stop on its own when a student navigates away.
  window.addEventListener('pagehide', () => window.speechSynthesis.cancel());

  createButton();
})();
