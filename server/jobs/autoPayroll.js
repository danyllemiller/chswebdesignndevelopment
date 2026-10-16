// server/jobs/autoPayroll.js
// Runs payroll automatically at 12:00 AM on the 1st and the 16th for the pay
// period that just ended (16th-end of last month, or 1st-15th of this month),
// so paychecks are waiting when students arrive. Web Design only: per the
// teacher, Computer Science shifts never earn pay, and dual-enrolled students
// are paid only for their WD shifts (computePayrollForPeriod's course_ids
// filter drops non-WD shifts).
//
// Safe by construction:
//   - only ever looks at the single most recently ENDED period, so it can
//     never run a period early (the 2026-10-16 mistake) or back-fill old ones;
//   - skips a period that already has a proper run, and re-runs one that was
//     run before the period ended (it would be missing most shifts);
//   - checks every 5 minutes, so if the server was down at midnight it
//     catches up as soon as it's back instead of skipping payday.
// Automatic runs are left "unprinted" (printed_at NULL), which shows the
// teacher a "Paystubs ready to print" banner (js/payroll-print-alert.js).
const { withConnection } = require('../db');
const { getLocalDateStr } = require('../tardyLogic');
const { runPayroll } = require('../routes/paystubs');

// Periods ending before this are never touched (they predate this job).
const FIRST_AUTO_PERIOD_END = '2026-10-31';

const pad = n => String(n).padStart(2, '0');

function mostRecentlyEndedPeriod(todayStr) {
    const [y, m, d] = todayStr.split('-').map(Number);
    if (d >= 16) return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-15` };
    const prev = new Date(y, m - 2, 1);              // first day of last month
    const py = prev.getFullYear(), pm = prev.getMonth() + 1;
    const lastDay = new Date(py, pm, 0).getDate();
    return { start: `${py}-${pad(pm)}-16`, end: `${py}-${pad(pm)}-${pad(lastDay)}` };
}

async function runAutoPayroll(now = new Date()) {
    const todayStr = getLocalDateStr(now);
    const { start, end } = mostRecentlyEndedPeriod(todayStr);
    if (end < FIRST_AUTO_PERIOD_END) return { ran: false, reason: `Period ${start}..${end} predates auto payroll.` };

    const { existing, courseIds } = await withConnection(async (connection) => {
        const [[existing]] = await connection.execute(
            `SELECT id, DATE_FORMAT(run_at, '%Y-%m-%d') AS run_date FROM payroll_runs WHERE period_start = ? AND period_end = ?`,
            [start, end]
        );
        // Same default the Run Payroll page uses: every Web Design course.
        const [courses] = await connection.execute(
            `SELECT course_id FROM courses WHERE course_name LIKE 'WEB DESIGN%' AND course_id NOT LIKE 'TEST-%'`
        );
        return { existing, courseIds: courses.map(c => c.course_id) };
    });

    if (existing && existing.run_date > end) {
        return { ran: false, reason: `Payroll for ${start}..${end} already ran (run #${existing.id}).` };
    }
    if (courseIds.length === 0) return { ran: false, reason: 'No Web Design courses found.' };

    const { runId, generated } = await runPayroll({
        period_start: start, period_end: end, run_by: 'auto-payroll',
        notes: existing ? 'Re-run automatically (original run happened before the period ended).' : 'Ran automatically at 12:00 AM.',
        course_ids: courseIds
    });
    await withConnection(c => c.execute('UPDATE payroll_runs SET printed_at = NULL WHERE id = ?', [runId]));
    return { ran: true, runId, period: `${start}..${end}`, paystubs: generated, rerun: !!existing };
}

function scheduleAutoPayroll() {
    let running = false;
    async function tick() {
        if (running) return;
        running = true;
        try {
            const result = await runAutoPayroll();
            if (result.ran) console.log('[autoPayroll]', result);
        } catch (err) {
            console.error('[autoPayroll] failed (will retry next tick):', err);
        } finally {
            running = false;
        }
    }
    setTimeout(tick, 30 * 1000);          // shortly after boot (tables are ready by then)
    setInterval(tick, 5 * 60 * 1000);
}

module.exports = { runAutoPayroll, scheduleAutoPayroll, mostRecentlyEndedPeriod };
