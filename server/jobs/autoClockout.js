// server/jobs/autoClockout.js
// Closes out any shift a student clocked into but never clocked out of, so a
// forgotten punch doesn't sit open forever (invisible to payroll -- a shift
// with no clock_out contributes zero minutes, server/routes/paystubs.js's
// computePayrollForPeriod) or quietly undercount a student who was actually
// there the whole period.
//
// The clock_out it fills in is that PERIOD's real scheduled end time for
// that calendar date (same bell-schedule resolution server/tardyLogic.js and
// server/routes/interviews.js already use for tardy tracking and interview
// windows), never "whenever this job happened to run" -- so a late pm2
// restart or a manually-triggered catch-up run still produces the correct
// historical timestamp instead of an inflated one.
//
// Rows this closes are flagged (auto_clocked_out = 1) rather than made to
// look like a real punch -- a teacher reviewing timesheets (admin/payroll.html)
// still needs to be able to tell "the system guessed this" from "the student
// actually tapped out," since the guess is always a same-period estimate,
// not a measurement.
const { getDbConnection } = require('../db');
const { getDayTypes, getBellScheduleKeyForDate, getLocalDateStr } = require('../tardyLogic');

async function ensureAutoClockoutColumn(connection) {
    const [cols] = await connection.execute(`SHOW COLUMNS FROM timesheets LIKE 'auto_clocked_out'`);
    if (cols.length === 0) {
        await connection.execute(`ALTER TABLE timesheets ADD COLUMN auto_clocked_out TINYINT(1) DEFAULT 0`);
    }
}

// Runs for one calendar date (defaults to today). Returns a summary instead
// of throwing on a no-school day / a period with no bell-schedule row --
// both are expected, routine outcomes, not failures.
async function runAutoClockout(dateStr = getLocalDateStr()) {
    const connection = await getDbConnection();
    try {
        await ensureAutoClockoutColumn(connection);

        const dayTypes = await getDayTypes(connection);
        const scheduleKey = getBellScheduleKeyForDate(dayTypes, dateStr);
        if (!scheduleKey) return { date: dateStr, ran: false, reason: 'No school this date.', closed: 0, skipped: 0 };

        const [openShifts] = await connection.execute(
            `SELECT id, section_id FROM timesheets WHERE date = ? AND clock_in IS NOT NULL AND clock_out IS NULL`,
            [dateStr]
        );
        if (openShifts.length === 0) return { date: dateStr, ran: true, scheduleKey, closed: 0, skipped: 0 };

        let closed = 0, skipped = 0;
        for (const shift of openShifts) {
            // AS students carry "AS-B2" (the real B2 period, tracked
            // separately for grading) -- not itself a bell_schedule
            // period_label, same stripping payroll.js/paystubs.js use.
            const periodLabel = String(shift.section_id || '').replace(/^AS-/, '');
            const [[period]] = await connection.execute(
                `SELECT end_time FROM bell_schedule WHERE schedule_type = ? AND period_label = ? LIMIT 1`,
                [scheduleKey, periodLabel]
            );
            if (!period) { skipped++; continue; }
            await connection.execute(
                `UPDATE timesheets SET clock_out = ?, auto_clocked_out = 1 WHERE id = ?`,
                [`${dateStr} ${period.end_time}`, shift.id]
            );
            closed++;
        }
        return { date: dateStr, ran: true, scheduleKey, closed, skipped, totalOpen: openShifts.length };
    } finally {
        await connection.release();
    }
}

const AUTO_CLOCKOUT_TIME = { hour: 14, minute: 30 }; // 2:30 PM -- after the latest real period end (2:07 PM) on any known schedule type (A/B/C), with margin.
let lastRunDate = null;

// Fires once a day at AUTO_CLOCKOUT_TIME, local time (this server's process
// TZ is already America/Los_Angeles -- confirmed via `date`/Intl at the OS
// level, so plain Date getHours()/getMinutes() is the school's real local
// time, no manual TZ conversion needed). Also catches up immediately on
// boot if the server was down or mid-restart when today's slot passed, so a
// deploy around 2:30 doesn't just silently skip the day.
function scheduleDailyAutoClockout() {
    async function tick() {
        const now = new Date();
        const todayStr = getLocalDateStr(now);
        const pastTriggerTime = now.getHours() > AUTO_CLOCKOUT_TIME.hour ||
            (now.getHours() === AUTO_CLOCKOUT_TIME.hour && now.getMinutes() >= AUTO_CLOCKOUT_TIME.minute);
        if (pastTriggerTime && lastRunDate !== todayStr) {
            lastRunDate = todayStr;
            try {
                const result = await runAutoClockout(todayStr);
                console.log('[autoClockout] daily sweep:', result);
            } catch (err) {
                console.error('[autoClockout] daily sweep failed:', err);
                lastRunDate = null; // allow a retry on the next tick instead of silently giving up for the day
            }
        }
    }
    tick();
    setInterval(tick, 60 * 1000);
}

module.exports = { runAutoClockout, scheduleDailyAutoClockout };
