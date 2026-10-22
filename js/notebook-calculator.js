// js/notebook-calculator.js
// On-screen calculator for My Notebook (student/notes.html): a "Calculator"
// button opens a small floating panel. Same keys and math as the WRS test's
// calculator (js/wrs-test-ui.js) so students only learn one. Typing works
// while the panel has focus, and Copy puts the result on the clipboard to
// paste into an answer box.
(function () {
    const css = `
      .nbc-btn { position: fixed; right: 18px; bottom: 18px; z-index: 1040; border-radius: 2rem; box-shadow: 0 .4rem 1rem rgba(0,0,0,.25); }
      .nbc-panel { position: fixed; right: 18px; bottom: 70px; z-index: 1050; width: 250px; background: #fff; border-radius: .8rem; box-shadow: 0 .8rem 2rem rgba(0,0,0,.35); overflow: hidden; }
      .nbc-panel:focus { outline: 3px solid #0d6efd; }
      .nbc-head { background: #1f2a44; color: #fff; font-weight: 700; padding: .45rem .7rem; display: flex; justify-content: space-between; align-items: center; }
      .nbc-keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
      .nbc-keys button { border: 1px solid #ced4da; background: #f8f9fa; border-radius: .4rem; padding: .5rem 0; font-weight: 700; font-size: 1.05rem; }
      .nbc-keys button.op { background: #e7f1ff; color: #0d6efd; }
      .nbc-keys button.eq { background: #0d6efd; color: #fff; }
      .nbc-display { font-size: 1.4rem; font-family: ui-monospace, Menlo, Consolas, monospace; }
      .nbc-expr { min-height: 1.1rem; font-family: ui-monospace, Menlo, Consolas, monospace; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-dark fw-bold nbc-btn';
    btn.innerHTML = '<i class="fas fa-calculator me-1"></i>Calculator';
    btn.setAttribute('aria-expanded', 'false');

    const panel = document.createElement('div');
    panel.className = 'nbc-panel';
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Calculator');
    panel.innerHTML = `
      <div class="nbc-head"><span><i class="fas fa-calculator me-1"></i>Calculator</span><button type="button" class="btn-close btn-close-white" data-nbc-close aria-label="Close calculator"></button></div>
      <div class="p-2">
        <div class="nbc-expr small text-muted text-end"></div>
        <input class="form-control text-end fw-bold mb-2 nbc-display" readonly value="0" aria-label="Calculator display">
        <div class="nbc-keys">
          <button data-k="C">C</button><button data-k="⌫">⌫</button><button data-k="%">%</button><button data-k="÷" class="op">÷</button>
          <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button><button data-k="×" class="op">×</button>
          <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button><button data-k="−" class="op">−</button>
          <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button><button data-k="+" class="op">+</button>
          <button data-k="±">±</button><button data-k="0">0</button><button data-k=".">.</button><button data-k="=" class="eq">=</button>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary w-100 mt-2 fw-bold" data-nbc-copy><i class="fas fa-copy me-1"></i>Copy result</button>
      </div>`;

    function mount() {
        document.body.appendChild(btn);
        document.body.appendChild(panel);
    }
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

    const disp = panel.querySelector('.nbc-display');
    const expr = panel.querySelector('.nbc-expr');
    let calc = { display: '0', prev: null, op: null, fresh: true };
    const compute = (a, b, op) => {
        const r = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : op === '÷' ? (b === 0 ? NaN : a / b) : b;
        return Number.isFinite(r) ? String(Math.round(r * 1e10) / 1e10) : 'Error';
    };
    function press(v) {
        if (calc.display === 'Error' && v !== 'C') calc = { display: '0', prev: null, op: null, fresh: true };
        if (/^[0-9]$/.test(v)) { calc.display = calc.fresh || calc.display === '0' ? v : calc.display + v; calc.fresh = false; }
        else if (v === '.') { if (calc.fresh) { calc.display = '0.'; calc.fresh = false; } else if (!calc.display.includes('.')) calc.display += '.'; }
        else if (v === 'C') calc = { display: '0', prev: null, op: null, fresh: true };
        else if (v === '⌫') calc.display = calc.display.length > 1 ? calc.display.slice(0, -1) : '0';
        else if (v === '±') calc.display = calc.display.startsWith('-') ? calc.display.slice(1) : (calc.display === '0' ? '0' : '-' + calc.display);
        else if (v === '%') calc.display = String(Number(calc.display) / 100);
        else if (v === '=') { if (calc.op !== null) { calc.display = compute(Number(calc.prev), Number(calc.display), calc.op); calc.op = null; calc.prev = null; calc.fresh = true; } }
        else { if (calc.op !== null && !calc.fresh) calc.display = compute(Number(calc.prev), Number(calc.display), calc.op); calc.prev = calc.display; calc.op = v; calc.fresh = true; }
        disp.value = calc.display;
        expr.textContent = calc.op !== null ? `${calc.prev} ${calc.op}` : '';
    }

    function setOpen(open) {
        panel.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        if (open) panel.focus();
    }
    btn.addEventListener('click', () => setOpen(panel.hidden));
    panel.addEventListener('click', (e) => {
        const k = e.target.closest('[data-k]');
        if (k) { press(k.dataset.k); panel.focus(); return; }
        if (e.target.closest('[data-nbc-close]')) { setOpen(false); btn.focus(); return; }
        const copy = e.target.closest('[data-nbc-copy]');
        if (copy) {
            const done = () => { copy.innerHTML = '<i class="fas fa-check me-1"></i>Copied ' + calc.display; setTimeout(() => { copy.innerHTML = '<i class="fas fa-copy me-1"></i>Copy result'; }, 1500); };
            if (navigator.clipboard) navigator.clipboard.writeText(calc.display).then(done, () => { disp.select(); });
            else disp.select();
        }
    });
    // Keyboard typing only while the calculator itself has focus, so it never
    // steals keys from a notebook answer box.
    const KEYMAP = { '/': '÷', '*': '×', 'x': '×', '-': '−', '+': '+', 'Enter': '=', '=': '=', 'Backspace': '⌫', 'Escape': 'C', 'Delete': 'C', '%': '%', '.': '.' };
    panel.addEventListener('keydown', (e) => {
        if (e.target.closest('button') && (e.key === 'Enter' || e.key === ' ')) return; // let a focused key button click itself
        const v = /^[0-9]$/.test(e.key) ? e.key : KEYMAP[e.key];
        if (!v) return;
        e.preventDefault();
        press(v);
    });
})();
