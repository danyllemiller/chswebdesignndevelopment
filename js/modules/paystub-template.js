// Shared pay-stub "earnings statement" markup -- used by the student-facing
// view (student/paystubs.html) and the admin print view
// (admin/tools/print-paystubs.html) so a printed check always looks
// identical to what the student sees on their own page.

// DATE columns (period_start/end, pay_date) come back from the server as
// full ISO timestamps -- mysql2 returns them as Date objects, and
// JSON-serializing a Date always calls .toISOString(), so this receives
// "2026-09-01T07:00:00.000Z", not a plain "2026-09-01". Appending
// 'T12:00:00' to that (the old behavior) produced a malformed
// double-timestamp string and Date parsed it as Invalid Date on every
// check. Only the date portion before 'T' is ever meaningful here.
function fmtDate(d) {
    if (!d) return '—';
    const dateOnly = d instanceof Date
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        : String(d).split('T')[0];
    return new Date(dateOnly + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtMoney(n) { return '$' + Number(n || 0).toFixed(2); }

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function threeDigitsToWords(n) {
    let str = '';
    if (n >= 100) { str += ONES[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n >= 20) { str += TENS[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) str += ONES[n] + ' ';
    return str.trim();
}

// Standard check-writing convention: dollars spelled out, cents as a
// fraction ("and 45/100"), good up to the low millions -- far more than
// any classroom paycheck will ever need.
function amountToWords(amount) {
    let dollars = Math.floor(Number(amount) || 0);
    const cents = Math.round((Number(amount) - dollars) * 100);
    if (dollars === 0) return `Zero and ${String(cents).padStart(2, '0')}/100`;
    const groups = ['', ' Thousand', ' Million'];
    let str = '', i = 0;
    while (dollars > 0) {
        const chunk = dollars % 1000;
        if (chunk > 0) str = threeDigitsToWords(chunk) + groups[i] + ' ' + str;
        dollars = Math.floor(dollars / 1000);
        i++;
    }
    return `${str.trim()} and ${String(cents).padStart(2, '0')}/100`;
}
function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Same semi-monthly rule as server/routes/paystubs.js computeNextPayDate --
// whichever comes first, the 1st or the 15th, on or after the given date.
// Used as a live fallback for "estimated" stubs, which don't have a real,
// frozen pay_date yet since payroll hasn't actually been run for them.
function computeNextPayDate(fromDateStr) {
    const [y, m, d] = fromDateStr.split('-').map(Number);
    const target = d <= 1 ? 1 : (d <= 15 ? 15 : 1);
    const targetMonth = (d <= 15) ? m : (m === 12 ? 1 : m + 1);
    const targetYear = (d <= 15) ? y : (m === 12 ? y + 1 : y);
    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(target).padStart(2, '0')}`;
}

// stub: the paystub row (period_start/end, role_title, hourly_rate,
// regular_hours, bonus_count, bonus_rate, gross_pay, fed_tax, ss_tax,
// med_tax, total_deductions, net_pay, ytd_gross, run_by, and either
// employeeName directly or first_name/last_name to build it from).
// missingAssignments: optional array of {title, due_date}.
export function renderPaystubHtml(stub, missingAssignments) {
    const isEstimated = !stub.run_by;
    const employeeName = stub.employeeName
        || `${stub.first_name || ''} ${stub.last_name || ''}`.trim()
        || stub.student_id || '';
    const missing = missingAssignments || [];
    // Finalized stubs carry a real, frozen pay_date (computed once when
    // payroll was actually run, tied to period_end not run time); estimated
    // stubs never had a run, so fall back to computing it live the same way.
    const payDate = stub.pay_date || (stub.period_end ? computeNextPayDate(String(stub.period_end).split('T')[0]) : null);

    // Finalized stubs carry a per-role earnings breakdown (a mid-period
    // promotion pays the old rate before the change and the new rate
    // after, as separate lines) -- estimated stubs computed live client-
    // side don't have this, so fall back to one line from the flat fields.
    let earningsLines = [];
    try {
        const parsed = typeof stub.earnings_lines === 'string' ? JSON.parse(stub.earnings_lines) : stub.earnings_lines;
        if (Array.isArray(parsed) && parsed.length > 0) earningsLines = parsed;
    } catch { /* malformed/absent -- use the single-line fallback below */ }
    if (earningsLines.length === 0) {
        earningsLines = [{ role_title: stub.role_title, rate: stub.hourly_rate, hours: stub.regular_hours }];
    }
    const regularPayRows = earningsLines.map(l => `
        <tr>
          <td>Regular Pay${earningsLines.length > 1 ? ` <span class="text-muted fw-normal">(${escHtml(l.role_title)})</span>` : ''}</td>
          <td class="text-center">${fmtMoney(l.rate)}</td>
          <td class="text-center">${Number(l.hours).toFixed(2)}</td>
          <td class="text-end">${fmtMoney(Number(l.hours) * Number(l.rate))}</td>
        </tr>`).join('');

    const missingBlock = missing.length === 0 ? '' : `
        <div class="missing-block">
          <div class="fw-bold text-danger small text-decoration-underline mb-1">MISSING ASSIGNMENTS (${missing.length})</div>
          <table class="table table-sm table-borderless small mb-0">
            <tbody>
              ${missing.map(m => `
                <tr>
                  <td>${escHtml(m.title)}</td>
                  <td class="text-end text-muted">Due ${fmtDate(m.due_date)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

    // Deterministic per-stub check number and fake account digits (stable
    // across re-renders of the same stub, not just random noise) --
    // finalized stubs use their real DB id; estimated ones (no id yet)
    // derive one from student_id + period so it's still stable per period.
    const checkSeed = stub.id || `${stub.student_id || ''}${stub.period_end || ''}`;
    let seedNum = 0;
    for (const ch of String(checkSeed)) seedNum = (seedNum * 31 + ch.charCodeAt(0)) >>> 0;
    const checkNumber = String(1000 + (seedNum % 9000));
    const acctNumber = String(100000000 + (seedNum % 900000000));

    const fakeCheck = `
    <div class="fake-check">
      <div class="check-top">
        <div>
          <div class="check-bank-name">First Classroom Bank &amp; Trust <span class="check-fake-tag">(not a real bank)</span></div>
          <div class="check-bank-addr">CHS Web Design Studio · 1111 N Saliman Rd · Carson City, NV 89701</div>
        </div>
        <div class="text-end">
          <div class="check-number">No. ${checkNumber}</div>
          <div class="check-date">${fmtDate(payDate)}</div>
        </div>
      </div>
      <div class="check-payline">
        <span class="check-label">PAY TO THE&nbsp;ORDER&nbsp;OF</span>
        <span class="check-payee">${escHtml(employeeName)}</span>
        <span class="check-amount-box">$ ${Number(stub.net_pay || 0).toFixed(2)}</span>
      </div>
      <div class="check-words">
        <span>${amountToWords(stub.net_pay)} Dollars</span>
      </div>
      <div class="check-bottom">
        <div class="check-memo">MEMO: Classroom pay simulation — not negotiable</div>
        <div class="check-signature">
          <div class="sig-line"></div>
          <div class="sig-label">Authorized Signature — CHS Web Design Studio</div>
        </div>
      </div>
      <div class="check-micr">⑈${acctNumber}⑈ ${checkNumber}⑈</div>
      <div class="check-disclaimer">NOT A REAL CHECK · CLASSROOM SIMULATION ONLY · NO MONETARY VALUE · CANNOT BE DEPOSITED OR CASHED</div>
    </div>`;

    const stubDoc = `
    <div class="paystub-doc">
      <div class="stub-header">
        <div class="row align-items-start">
          <div class="col-7">
            <div class="fw-bold fs-5 text-uppercase" style="letter-spacing:-1px">CHS Web Design Studio</div>
            <div class="small">1111 N Saliman Rd · Carson City, NV 89701</div>
          </div>
          <div class="col-5 text-end">
            <div class="fw-bold fs-5 text-success">${isEstimated ? 'ESTIMATED STATEMENT' : 'EARNINGS STATEMENT'}</div>
            <div class="small fw-bold">Pay Period: ${fmtDate(stub.period_start)} – ${fmtDate(stub.period_end)}</div>
            <div class="small fw-bold">Pay Date: ${fmtDate(payDate)}</div>
          </div>
        </div>
      </div>
      <div class="stub-body">
        <div class="border border-dark p-2 mb-3">
          <div class="row small fw-bold">
            <div class="col-5 border-end border-dark">EMPLOYEE: <span class="text-primary">${escHtml(employeeName)}</span></div>
            <div class="col-4 border-end border-dark">TITLE: <span class="text-primary">${escHtml(stub.role_title)}</span></div>
            <div class="col-3">TARDIES: <span class="${Number(stub.tardy_count) > 0 ? 'text-danger' : 'text-primary'}">${stub.tardy_count === undefined ? '—' : stub.tardy_count}</span></div>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-7 mb-3 mb-md-0">
            <div class="fw-bold text-decoration-underline mb-2 small">EARNINGS</div>
            <table class="table table-sm table-borderless small fw-bold mb-0">
              <thead class="border-bottom border-dark">
                <tr><th>Description</th><th class="text-center">Rate</th><th class="text-center">Hrs/Qty</th><th class="text-end">Total</th></tr>
              </thead>
              <tbody>
                ${regularPayRows}
                <tr>
                  <td>Performance Bonus</td>
                  <td class="text-center">${fmtMoney(stub.bonus_rate || 5)}</td>
                  <td class="text-center">${stub.bonus_count}</td>
                  <td class="text-end">${fmtMoney(Number(stub.bonus_count) * Number(stub.bonus_rate || 5))}</td>
                </tr>
              </tbody>
              <tfoot class="border-top border-dark">
                <tr><td colspan="3"><strong>GROSS PAY</strong></td><td class="text-end text-success fs-6">${fmtMoney(stub.gross_pay)}</td></tr>
              </tfoot>
            </table>
          </div>
          <div class="col-5">
            <div class="fw-bold text-decoration-underline mb-2 small">TAXES &amp; WITHHOLDINGS</div>
            <table class="table table-sm table-borderless small fw-bold text-danger mb-0">
              <thead class="border-bottom border-dark">
                <tr><th>Description</th><th class="text-end">Amount</th></tr>
              </thead>
              <tbody>
                <tr><td>Federal Income Tax</td><td class="text-end">−${fmtMoney(stub.fed_tax)}</td></tr>
                <tr><td>Social Security (FICA)</td><td class="text-end">−${fmtMoney(stub.ss_tax)}</td></tr>
                <tr><td>Medicare (FICA)</td><td class="text-end">−${fmtMoney(stub.med_tax)}</td></tr>
              </tbody>
              <tfoot class="border-top border-dark">
                <tr><td><strong>TOTAL DEDUCTIONS</strong></td><td class="text-end">−${fmtMoney(stub.total_deductions)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div class="row bg-light border border-2 border-dark p-2 align-items-center mx-0">
          <div class="col-6 small fw-bold text-muted">YTD GROSS: ${stub.ytd_gross !== '—' && stub.ytd_gross !== undefined ? fmtMoney(stub.ytd_gross) : '—'}</div>
          <div class="col-6 text-end"><strong>NET PAY:</strong> <span class="text-success fs-4 fw-bold">${fmtMoney(stub.net_pay)}</span></div>
        </div>
        <div class="text-center mt-3 text-muted" style="font-size:.65rem;">
          ${isEstimated ? 'ESTIMATED — ' : ''}SIMULATED EARNINGS STATEMENT FOR EDUCATIONAL PURPOSES ONLY. NO REAL CURRENCY IS EXCHANGED.
        </div>
      </div>
    </div>`;

    // The check and stub are fixed-height and always kept together (see
    // .fake-check/.paystub-doc page-break-inside:avoid in each consuming
    // page's CSS) -- missing assignments is the one section that can grow
    // without bound, so it's a separate sibling block, deliberately placed
    // LAST and outside both bordered boxes, so a long list overflows onto
    // its own next page instead of dragging the check down with it.
    return `${fakeCheck}${stubDoc}${missingBlock}`;
}
