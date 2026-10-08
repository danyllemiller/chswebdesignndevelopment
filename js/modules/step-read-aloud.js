// js/modules/step-read-aloud.js
// Click-to-advance read-aloud for exam questions (js/examLogicWD.js and
// js/examLogicCS.js) -- reads the question, then waits for an explicit
// "Next" click before reading the first answer choice, then waits again
// before each following choice. Deliberately never auto-advances: a
// student who needs read-aloud for a test often needs their own pace for
// each answer choice too, not one continuous narration.
//
// Plain global script (not an ES module) -- examLogicWD.js/examLogicCS.js
// are loaded as plain <script> tags with onclick="..." attributes
// expecting global functions, so this attaches to window instead of using
// import/export to match. Injected sitewide by loader.js (same pattern as
// js/read-aloud.js and js/student/timeclock.js), so it's already loaded
// by the time an exam page's own render logic needs it.
//
// Each exam page gets its own instance via createStepReadAloud() -- state
// (which step it's on) must never leak between questions or between a
// WD and a CS page that happen to share a session.
window.createStepReadAloud = function createStepReadAloud() {
    const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    function getSavedRate() {
        // Shares the sitewide speed preference js/read-aloud.js already
        // saves, so a rate picked on a chapter page carries over here too.
        const r = Number(localStorage.getItem('readAloudRate'));
        return RATES.includes(r) ? r : 1;
    }
    function getSavedVoice() {
        if (!('speechSynthesis' in window)) return null;
        const name = localStorage.getItem('readAloudVoiceName');
        if (!name) return null;
        return window.speechSynthesis.getVoices().find(v => v.name === name) || null;
    }

    let queue = [];
    let step = -1; // -1 = not started
    let active = false;

    function speakCurrent(onDone) {
        if (!('speechSynthesis' in window) || step < 0 || step >= queue.length) { if (onDone) onDone(); return; }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(queue[step]);
        utterance.rate = getSavedRate();
        const voice = getSavedVoice();
        if (voice) utterance.voice = voice;
        if (onDone) { utterance.onend = onDone; utterance.onerror = onDone; }
        window.speechSynthesis.speak(utterance);
    }

    return {
        // texts: [questionText, option1, option2, ...] in read order.
        start(texts, onUpdate) {
            if (!('speechSynthesis' in window)) return;
            queue = texts;
            step = 0;
            active = true;
            speakCurrent();
            if (onUpdate) onUpdate();
        },
        // Advances to the next item and speaks it; stops itself once past
        // the last item in the queue.
        next(onUpdate) {
            if (!active) return;
            step++;
            if (step >= queue.length) {
                this.stop();
            } else {
                speakCurrent();
            }
            if (onUpdate) onUpdate();
        },
        stop() {
            active = false;
            step = -1;
            queue = [];
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        },
        isActive() { return active; },
        currentStep() { return step; },
        totalSteps() { return queue.length; },
        isLastStep() { return active && step >= queue.length - 1; },
        stepLabel() {
            if (!active) return '';
            if (step === 0) return 'Reading the question…';
            return `Reading answer ${step} of ${queue.length - 1}…`;
        }
    };
};
