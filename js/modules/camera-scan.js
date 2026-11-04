// "Scan with camera" for the scan stations (attendance kiosk, headphone checkout), so an iPad, iPhone,
// Android phone or laptop camera can read a student ID or headphone sticker barcode. Each read goes to
// the page's own scan handler, exactly like a USB or Bluetooth scanner typing the code and pressing
// Enter. Barcode reading is ZXing (js/vendor/zxing-library-0.23.0.min.js, Apache-2.0), loaded only
// when the camera opens.
const ZXING_SRC = '/js/vendor/zxing-library-0.23.0.min.js';
const SAME_CODE_MS = 10000;   // the same card or sticker held in view counts once (a headphone sticker
                              // read twice would check the headphones out and straight back in)
let reader = null, panel = null, last = '', lastAt = 0;

function loadZXing() {
    if (window.ZXing) return Promise.resolve();
    return new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = ZXING_SRC; s.onload = ok; s.onerror = () => fail(new Error('load'));
        document.head.appendChild(s);
    });
}

function addStyles() {
    if (document.getElementById('camscan-css')) return;
    const css = document.createElement('style');
    css.id = 'camscan-css';
    css.textContent = `
        .camscan { position: fixed; left: 50%; bottom: 1rem; transform: translateX(-50%); z-index: 2500; width: min(480px, 94vw);
            background: #111; border-radius: .8rem; box-shadow: 0 .5rem 2rem rgba(0,0,0,.45); overflow: hidden; }
        .camscan-view { position: relative; aspect-ratio: 4 / 3; max-height: 42vh; margin: 0 auto; background: #000; }
        .camscan video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .camscan-aim { position: absolute; left: 10%; right: 10%; top: 32%; bottom: 32%; border: 3px solid rgba(255,255,255,.85);
            border-radius: .5rem; box-shadow: 0 0 0 999px rgba(0,0,0,.25); transition: border-color .2s; }
        .camscan-aim.hit { border-color: #22c55e; }
        .camscan-bar { display: flex; align-items: center; gap: .75rem; padding: .6rem .8rem; color: #fff; }
        .camscan-status { flex: 1; font-size: .95rem; }`;
    document.head.appendChild(css);
}

function close(input) {
    try { reader && reader.reset(); } catch (e) { /* already stopped */ }
    reader = null;
    if (panel) { panel.remove(); panel = null; }
    input.readOnly = false;
}

async function open(input, onScan) {
    if (panel) return;
    addStyles();
    panel = document.createElement('div');
    panel.className = 'camscan';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Camera scanner');
    panel.innerHTML = `<div class="camscan-view"><video playsinline muted autoplay></video><div class="camscan-aim"></div></div>
        <div class="camscan-bar"><span class="camscan-status">Starting the camera…</span>
        <button type="button" class="btn btn-light btn-sm fw-bold">Close camera</button></div>`;
    document.body.appendChild(panel);
    const status = panel.querySelector('.camscan-status'), aim = panel.querySelector('.camscan-aim');
    panel.querySelector('button').addEventListener('click', () => close(input));
    // a focused scan box would pop the iPad/iPhone keyboard up over the camera; read-only keeps it down
    input.readOnly = true;
    input.blur();

    try {
        await loadZXing();
        const Z = window.ZXing, hints = new Map();
        hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODABAR,
            Z.BarcodeFormat.ITF, Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.QR_CODE]);
        hints.set(Z.DecodeHintType.TRY_HARDER, true);
        reader = new Z.BrowserMultiFormatReader(hints, 150);
        await reader.decodeFromConstraints(
            { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
            panel.querySelector('video'),
            (result) => {
                if (!result) return;
                const code = String(result.getText() || '').trim(), now = Date.now();
                if (!code || (code === last && now - lastAt < SAME_CODE_MS)) return;
                last = code; lastAt = now;
                aim.classList.add('hit'); setTimeout(() => aim.classList.remove('hit'), 600);
                status.textContent = `Read ${code}`;
                onScan(code);
            });
        if (panel) status.textContent = 'Hold the barcode inside the box.';
    } catch (e) {
        if (!panel) return;
        const name = e && e.name;
        status.textContent = name === 'NotAllowedError'
            ? 'The camera is blocked. Allow the camera for this site (on an iPad or iPhone: Settings → Safari → Camera), then try again.'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
                ? 'No camera was found on this device.'
                : 'The camera couldn’t start. Close this and try again.';
        try { reader && reader.reset(); } catch (err) { /* nothing to stop */ }
    }
}

// Puts a "Scan with camera" button under the page's scan box. onScan(code) is the page's own scan handler.
export function addCameraScan(input, onScan) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary btn-sm fw-bold d-block mx-auto mt-2';
    btn.innerHTML = '<i class="fas fa-camera me-1"></i>Scan with camera';
    btn.addEventListener('click', () => (panel ? close(input) : open(input, onScan)));
    input.insertAdjacentElement('afterend', btn);
}
