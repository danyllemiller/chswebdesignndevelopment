// Scan-station beeps (attendance kiosk, headphone checkout) -- short
// synthesized tones via Web Audio, so the teacher doesn't have to watch the
// screen to know a scan landed (and landed as what).
//
// One shared AudioContext, woken up during the scan's own keystrokes (a
// barcode scanner types the ID and presses Enter). Safari and iPads only let
// sound start inside a key press or tap, and the beep plays after the server
// answers -- too late to start a new context. Each beep used to make its own
// and went silent once answers took longer than about a second.
let ctx = null;

function wake() {
    try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state !== 'running') ctx.resume();
    } catch (e) { /* audio isn't essential */ }
}
for (const type of ['keydown', 'pointerdown', 'touchend']) document.addEventListener(type, wake, { capture: true });

export function beep(freq, ms) {
    try {
        wake();
        const osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime;
        osc.frequency.value = freq; osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.15, t);
        osc.start(t); osc.stop(t + ms / 1000);
    } catch (e) { /* audio isn't essential */ }
}
