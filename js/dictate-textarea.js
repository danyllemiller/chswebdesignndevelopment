// js/dictate-textarea.js
// Reusable "Dictate" mic button for any plain <textarea> -- e.g. the
// clock-out journal reflection (timeclock.js) and chapter worksheet
// reflections (studyGuides/*.html). Same Web Speech API
// (SpeechRecognition) approach as js/read-aloud.js's text-to-speech,
// reversed direction: for a student whose IEP allows speaking notes
// instead of typing them.
//
// The contenteditable/iframe-based notebook editors (cs-notebook.html,
// cs-interactive.js, student-notes.js) each wire dictation directly into
// their own rich-text toolbar instead of using this file, since they
// insert via execCommand('insertText') into an iframe document rather
// than a plain textarea's value -- different enough mechanics that
// sharing one helper would need as much branching as just having two
// small, clear implementations.
(function () {
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

    const style = document.createElement('style');
    style.textContent = `
        .dictate-textarea-btn.dictating-textarea { background: #dc3545; border-color: #dc3545; color: #fff; animation: dictate-textarea-pulse 1.4s ease-in-out infinite; }
        @keyframes dictate-textarea-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220,53,69,.5); } 50% { box-shadow: 0 0 0 6px rgba(220,53,69,0); } }
    `;
    document.head.appendChild(style);

    // opts.onInsert(newValue) fires after each inserted chunk, e.g. for a
    // caller that needs to mirror the textarea into a character counter
    // or a separate autosave path instead of relying on the 'input' event.
    window.attachDictateToTextarea = function (textarea, opts) {
        opts = opts || {};
        if (!textarea || textarea.dataset.dictateAttached) return null;
        textarea.dataset.dictateAttached = '1';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-outline-secondary dictate-textarea-btn mt-1';
        btn.innerHTML = '<i class="fas fa-microphone"></i> <span>Dictate</span>';
        textarea.insertAdjacentElement('afterend', btn);

        if (!SpeechRecognitionImpl) {
            btn.disabled = true;
            btn.title = "Speech-to-text isn't supported in this browser -- try Chrome.";
            return btn;
        }

        const label = btn.querySelector('span');
        let recognition = null;
        let listening = false;
        let userStopped = false;

        function insertTranscript(text) {
            if (!text) return;
            const start = textarea.selectionStart ?? textarea.value.length;
            const end = textarea.selectionEnd ?? textarea.value.length;
            textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
            const pos = start + text.length;
            textarea.setSelectionRange(pos, pos);
            textarea.focus();
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            if (opts.onInsert) opts.onInsert(textarea.value);
        }

        function setListeningUI(isListening) {
            listening = isListening;
            btn.classList.toggle('dictating-textarea', isListening);
            label.textContent = isListening ? 'Listening…' : 'Dictate';
            btn.querySelector('i').className = isListening ? 'fas fa-stop' : 'fas fa-microphone';
        }

        function startRecognition() {
            recognition = new SpeechRecognitionImpl();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (ev) => {
                for (let i = ev.resultIndex; i < ev.results.length; i++) {
                    if (ev.results[i].isFinal) {
                        const t = ev.results[i][0].transcript.trim();
                        if (t) insertTranscript(t + ' ');
                    }
                }
            };
            recognition.onerror = (ev) => {
                console.error('Dictation error:', ev.error);
                if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
                    userStopped = true;
                    setListeningUI(false);
                    alert('Microphone access was blocked. Allow microphone access for this site to use Dictate.');
                }
            };
            recognition.onend = () => {
                // The browser also ends a session on its own after a pause
                // even with continuous:true -- restart seamlessly unless
                // the student actually clicked Stop.
                if (!userStopped) { try { recognition.start(); } catch (err) { /* already starting */ } }
                else setListeningUI(false);
            };

            userStopped = false;
            setListeningUI(true);
            recognition.start();
        }

        function stopRecognition() {
            userStopped = true;
            if (recognition) recognition.stop();
            setListeningUI(false);
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (listening) stopRecognition(); else startRecognition();
        });

        return btn;
    };
})();
