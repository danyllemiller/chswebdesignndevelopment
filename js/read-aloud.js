// js/read-aloud.js
// "Read Aloud" button for WD curriculum content pages, using the browser's
// built-in Web Speech API -- no external libraries. Injected sitewide by
// loader.js; self-guards to curriculum pages only (year1/year2 chapters,
// computerscience.html) via the URL path, since the shared
// .container-ultrawide wrapper it reads from is also used on ~150 other
// pages (admin tools, student pages) this shouldn't appear on.
//
// Reads sentence-by-sentence rather than as one long utterance so that
// stopping partway through has a real, stable position to remember --
// clicking the button again resumes from that sentence instead of
// starting over from the top. Progress is saved to localStorage per page,
// so it survives a page reload or even coming back a different day.
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

  const PROGRESS_KEY = 'readAloudProgress:' + window.location.pathname;

  function getReadableText() {
    // Skip the prev/next chapter nav bar and anything marked no-print --
    // read just the actual lesson content.
    const clone = container.cloneNode(true);
    clone.querySelectorAll('nav, .no-print, script, style, iframe').forEach(el => el.remove());
    return (clone.innerText || clone.textContent || '').trim();
  }

  // Splits on sentence-ending punctuation (no lookbehind, for broad
  // browser support) so a resume always lands on a clean break instead of
  // mid-sentence, and gives a stable position to persist and show progress
  // against.
  function splitIntoChunks(text) {
    const matches = text.match(/[^.!?]+[.!?]+(?:\s+|$)/g);
    if (matches && matches.length > 0) return matches.map(s => s.trim()).filter(Boolean);
    return text.trim() ? [text.trim()] : [];
  }

  const chunks = splitIntoChunks(getReadableText());
  let chunkIndex = (() => {
    const saved = Number(localStorage.getItem(PROGRESS_KEY));
    return Number.isInteger(saved) && saved > 0 && saved < chunks.length ? saved : 0;
  })();
  let speaking = false;
  let btn = null;
  let progressLabel = null;
  let startOverBtn = null;

  function saveProgress() {
    if (chunkIndex > 0 && chunkIndex < chunks.length) localStorage.setItem(PROGRESS_KEY, String(chunkIndex));
    else localStorage.removeItem(PROGRESS_KEY);
  }

  function updateUi() {
    if (!btn) return;
    const resumable = !speaking && chunkIndex > 0;
    btn.textContent = speaking ? '⏹ Stop Reading' : (resumable ? '▶ Resume Reading' : '🔊 Read Aloud');
    btn.classList.toggle('btn-danger', speaking);
    btn.classList.toggle('btn-outline-primary', !speaking);
    if (progressLabel) {
      if (chunks.length > 1 && (speaking || resumable)) {
        progressLabel.textContent = `Sentence ${Math.min(chunkIndex + 1, chunks.length)} of ${chunks.length}`;
        progressLabel.classList.remove('d-none');
      } else {
        progressLabel.classList.add('d-none');
      }
    }
    if (startOverBtn) startOverBtn.classList.toggle('d-none', chunkIndex === 0);
  }

  function speakNext() {
    if (!speaking) return;
    if (chunkIndex >= chunks.length) {
      speaking = false;
      chunkIndex = 0;
      saveProgress();
      updateUi();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
    utterance.onend = () => {
      if (!speaking) return; // stopped mid-sentence -- index already saved by stopReading()
      chunkIndex++;
      speakNext();
    };
    utterance.onerror = () => { speaking = false; saveProgress(); updateUi(); };
    window.speechSynthesis.speak(utterance);
    updateUi();
  }

  function startReading() {
    if (chunks.length === 0) return;
    speaking = true;
    speakNext();
  }

  function stopReading() {
    speaking = false;
    window.speechSynthesis.cancel();
    saveProgress();
    updateUi();
  }

  function startOver() {
    stopReading();
    chunkIndex = 0;
    saveProgress();
    updateUi();
  }

  function createButton() {
    if (chunks.length === 0) return;

    const wrapper = document.createElement('span');
    wrapper.className = 'no-print d-inline-flex align-items-center gap-2 ms-3';

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary btn-sm fw-bold align-middle';
    btn.setAttribute('aria-label', 'Read this page aloud');
    btn.addEventListener('click', () => { speaking ? stopReading() : startReading(); });

    progressLabel = document.createElement('span');
    progressLabel.className = 'text-muted small d-none';

    startOverBtn = document.createElement('button');
    startOverBtn.type = 'button';
    startOverBtn.className = 'btn btn-link btn-sm p-0 d-none';
    startOverBtn.textContent = 'Start over';
    startOverBtn.addEventListener('click', startOver);

    wrapper.appendChild(btn);
    wrapper.appendChild(progressLabel);
    wrapper.appendChild(startOverBtn);

    // Sits inline at the end of the <h1> itself, rather than as its own
    // centered block below the title -- a full-width row felt awkward and
    // disconnected from the heading it belongs to.
    const h1 = container.querySelector('h1');
    if (h1) h1.appendChild(wrapper);
    else container.insertBefore(wrapper, container.firstChild);

    updateUi();
  }

  // Speech synthesis doesn't stop on its own when a student navigates
  // away -- and if they're mid-sentence when that happens, save wherever
  // they'd gotten to so it's still there next time.
  window.addEventListener('pagehide', () => {
    window.speechSynthesis.cancel();
    if (speaking) saveProgress();
  });

  createButton();
})();
