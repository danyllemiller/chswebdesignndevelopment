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
// Speed and voice are separate, sitewide preferences (not per-page) --
// once a student picks a comfortable speed/voice it should stay picked
// everywhere, not reset on every chapter.
//
// Voice choice is deliberately limited to English voices: the API can
// only change accent/pronunciation, not translate the underlying text, so
// picking a Spanish or Mandarin voice here would just mispronounce the
// English text rather than actually help a non-English-speaking student.
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
  const RATE_KEY = 'readAloudRate';
  const VOICE_KEY = 'readAloudVoiceName';
  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  function getSavedRate() {
    const r = Number(localStorage.getItem(RATE_KEY));
    return RATES.includes(r) ? r : 1;
  }
  function saveRate(r) { localStorage.setItem(RATE_KEY, String(r)); }
  function getSavedVoiceName() { return localStorage.getItem(VOICE_KEY) || ''; }
  function saveVoiceName(name) { if (name) localStorage.setItem(VOICE_KEY, name); else localStorage.removeItem(VOICE_KEY); }

  let availableVoices = [];
  function getSelectedVoice() {
    const savedName = getSavedVoiceName();
    return savedName ? (availableVoices.find(v => v.name === savedName) || null) : null;
  }

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
  let voiceSelect = null;

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
    utterance.rate = getSavedRate();
    const voice = getSelectedVoice();
    if (voice) utterance.voice = voice;
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

  function populateVoiceSelect() {
    if (!voiceSelect) return;
    availableVoices = window.speechSynthesis.getVoices();
    const savedName = getSavedVoiceName();
    voiceSelect.innerHTML = '<option value="">Default voice</option>';
    availableVoices
      .filter(v => v.lang.toLowerCase().startsWith('en'))
      .forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang})`;
        if (v.name === savedName) opt.selected = true;
        voiceSelect.appendChild(opt);
      });
  }

  function createButton() {
    if (chunks.length === 0) return;

    const wrapper = document.createElement('span');
    wrapper.className = 'no-print d-inline-flex align-items-center gap-2 ms-3 position-relative';

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

    // Speed & voice settings -- a small gear toggle rather than always-on
    // controls, so the default view next to the title stays uncluttered.
    const settingsBtn = document.createElement('button');
    settingsBtn.type = 'button';
    settingsBtn.className = 'btn btn-outline-secondary btn-sm';
    settingsBtn.textContent = '⚙';
    settingsBtn.title = 'Reading speed & voice';
    settingsBtn.setAttribute('aria-label', 'Reading speed and voice settings');

    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'card shadow-sm p-2 d-none text-start';
    settingsPanel.style.cssText = 'position:absolute; top:100%; left:0; z-index:1000; min-width:220px; background:#fff; font-weight:normal;';

    const rateLabel = document.createElement('label');
    rateLabel.className = 'form-label small fw-bold mb-1';
    rateLabel.textContent = 'Speed';
    const rateSelect = document.createElement('select');
    rateSelect.className = 'form-select form-select-sm mb-2';
    RATES.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r + 'x';
      if (r === getSavedRate()) opt.selected = true;
      rateSelect.appendChild(opt);
    });
    rateSelect.addEventListener('change', () => saveRate(Number(rateSelect.value)));

    const voiceLabel = document.createElement('label');
    voiceLabel.className = 'form-label small fw-bold mb-1';
    voiceLabel.textContent = 'Voice';
    voiceSelect = document.createElement('select');
    voiceSelect.className = 'form-select form-select-sm';
    voiceSelect.addEventListener('change', () => saveVoiceName(voiceSelect.value));

    settingsPanel.appendChild(rateLabel);
    settingsPanel.appendChild(rateSelect);
    settingsPanel.appendChild(voiceLabel);
    settingsPanel.appendChild(voiceSelect);

    settingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('d-none'));
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) settingsPanel.classList.add('d-none');
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(progressLabel);
    wrapper.appendChild(startOverBtn);
    wrapper.appendChild(settingsBtn);
    wrapper.appendChild(settingsPanel);

    // On WD1/WD2 chapter pages, every single one follows <h1>ChapterTitle</h1>
    // immediately with a <p> subheading (e.g. "Foundations, Internet
    // Structure & Professionalism | CHS Web Design Track") -- sits there
    // instead of on the chapter title itself, since that's the more
    // natural place for a "read this page" control. computerscience.html
    // doesn't share that exact structure (a wrapping div, not a plain <p>
    // right after the h1), so it keeps the old placement on the h1.
    const h1 = container.querySelector('h1');
    const isWDChapterPage = path.includes('/year1/') || path.includes('/year2/');
    const subheading = isWDChapterPage && h1 && h1.nextElementSibling && h1.nextElementSibling.tagName === 'P'
      ? h1.nextElementSibling : null;
    const anchor = subheading || h1;
    if (anchor) anchor.appendChild(wrapper);
    else container.insertBefore(wrapper, container.firstChild);

    updateUi();
    populateVoiceSelect();
    window.speechSynthesis.addEventListener('voiceschanged', populateVoiceSelect);
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
