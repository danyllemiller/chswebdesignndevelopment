// js/payroll-print-alert.js
// After the automatic midnight payroll (server/jobs/autoPayroll.js) runs on
// the 1st or 16th, show the teacher a banner on every page until she prints
// the paystubs and clicks "Mark as printed". Teacher-only; silent on errors.
(function () {
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  async function show() {
    let runs = [];
    try {
      const res = await fetch('/api/admin/payroll/print-pending');
      if (!res.ok) return;
      runs = (await res.json()).runs || [];
    } catch (e) { return; }
    if (!runs.length || document.getElementById('payroll-print-alert')) return;

    const bar = document.createElement('div');
    bar.id = 'payroll-print-alert';
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'position:sticky;top:0;z-index:2000;';
    bar.innerHTML = runs.map(r => `
      <div class="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2 mb-0 rounded-0 border-0 border-bottom border-warning shadow-sm py-2 px-3" data-run="${r.id}">
        <div class="fw-bold"><i class="fas fa-print me-2"></i>Paystubs ready to print: ${fmt(r.period_start)} &ndash; ${fmt(r.period_end)} (${r.paystubs} paystubs, ran automatically).</div>
        <div class="d-flex gap-2">
          <a class="btn btn-sm btn-dark fw-bold" href="/admin/tools/print-paystubs.html?run=${r.id}" target="_blank" rel="noopener"><i class="fas fa-print me-1"></i>Print paystubs</a>
          <button type="button" class="btn btn-sm btn-outline-dark fw-bold" data-mark="${r.id}">Mark as printed</button>
        </div>
      </div>`).join('');
    bar.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-mark]');
      if (!btn) return;
      btn.disabled = true;
      try {
        const res = await fetch('/api/admin/payroll/mark-printed', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ run_id: Number(btn.dataset.mark) })
        });
        if (res.ok) {
          const row = bar.querySelector(`[data-run="${btn.dataset.mark}"]`);
          if (row) row.remove();
          if (!bar.children.length) bar.remove();
        } else { btn.disabled = false; }
      } catch (err) { btn.disabled = false; }
    });
    document.body.prepend(bar);
  }

  function start(authData) {
    if (!authData || !authData.isAuthenticated || !authData.isTeacher) return;
    show();
  }
  if (window.dacAuthData) start(window.dacAuthData);
  else document.addEventListener('authComplete', () => start(window.dacAuthData));
})();
