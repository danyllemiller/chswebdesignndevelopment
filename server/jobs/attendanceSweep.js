// server/jobs/attendanceSweep.js
// Scanning only ever produces "present" or "tardy" rows -- nobody scans
// themselves in as absent. This fills in "absent" for every student
// enrolled in a period that actually met today who never got an
// attendance row at all, same end goal as server/jobs/autoClockout.js for
// missed clock-outs.
const { getDbConnection } = require('../db');
const { getDayTypes, getBellScheduleKeyForDate, getLocalDateStr } = require('../tardyLogic');
const { ensureAttendanceTables, getEnrolledStudents } = require('../lib/attendanceStore');

// Marks absent every enrolled student in ONE period who has no attendance
// row yet for dateStr. Shared by the full-day catch-up sweep below and the
// per-period scheduler further down, so there's one real implementation
// instead of two copies that could drift.
async function sweepOnePeriod(connection, periodLabel, dateStr) {
    const roster = await getEnrolledStudents(connection, periodLabel);
    if (roster.length === 0) return 0;
    const [existingRows] = await connection.execute(
        `SELECT student_id FROM attendance WHERE section_id = ? AND date = ?`,
        [periodLabel, dateStr]
    );
    const already = new Set(existingRows.map(r => r.student_id));
    let marked = 0;
    for (const s of roster) {
        if (already.has(s.student_id)) continue;
        await connection.execute(
            `INSERT INTO attendance (student_id, section_id, date, status) VALUES (?, ?, ?, 'absent')`,
            [s.student_id, periodLabel, dateStr]
        );
        marked++;
    }
    return marked;
}

// Full-day catch-up sweep -- every period that met on dateStr, regardless
// of what time it is now. Still useful on demand (e.g. the server was down
// for a stretch and missed several periods' own sweeps below, or fixing a
// past date), so this stays exported and unchanged in what it does.
async function runAttendanceSweep(dateStr = getLocalDateStr()) {
    const connection = await getDbConnection();
    try {
        await ensureAttendanceTables(connection);

        const dayTypes = await getDayTypes(connection);
        const scheduleKey = getBellScheduleKeyForDate(dayTypes, dateStr);
        if (!scheduleKey) return { date: dateStr, ran: false, reason: 'No school this date.', marked: 0 };

        const [periods] = await connection.execute(
            `SELECT DISTINCT period_label FROM bell_schedule WHERE schedule_type = ?`,
            [scheduleKey]
        );

        let marked = 0;
        for (const { period_label } of periods) {
            marked += await sweepOnePeriod(connection, period_label, dateStr);
        }
        return { date: dateStr, ran: true, scheduleKey, marked };
    } finally {
        await connection.release();
    }
}

// Sweeps each period shortly after ITS OWN end time today, instead of
// waiting for one fixed end-of-day time to cover every period at once --
// a period that ends at 10am (e.g. A3) used to sit unmarked for hours
// until the old single 2:35pm sweep finally got to it. Same safety
// margin reasoning as autoClockout.js's grace window: wait a few minutes
// past the bell so a student mid-scan right at the end of class isn't
// marked absent out from under them.
const SWEEP_GRACE_MINUTES = 5;

// `${dateStr}:${period_label}` -> true once that period's sweep has run
// today. Reset implicitly: a key from a prior date just never matches
// again, so this never needs an explicit clear and can't leak across days.
const sweptKeys = new Set();

function scheduleDailyAttendanceSweep() {
    let cachedDate = null;
    let cachedPeriods = null; // [{period_label, end_time}] for today, or [] if no school

    async function loadTodaysPeriods(connection, dateStr) {
        const dayTypes = await getDayTypes(connection);
        const scheduleKey = getBellScheduleKeyForDate(dayTypes, dateStr);
        if (!scheduleKey) return [];
        const [rows] = await connection.execute(
            `SELECT period_label, end_time FROM bell_schedule WHERE schedule_type = ?`,
            [scheduleKey]
        );
        return rows;
    }

    async function tick() {
        const now = new Date();
        const todayStr = getLocalDateStr(now);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        const connection = await getDbConnection();
        try {
            await ensureAttendanceTables(connection);

            if (cachedDate !== todayStr) {
                cachedPeriods = await loadTodaysPeriods(connection, todayStr);
                cachedDate = todayStr;
            }
            if (!cachedPeriods || cachedPeriods.length === 0) return; // no school today

            for (const { period_label, end_time } of cachedPeriods) {
                const key = `${todayStr}:${period_label}`;
                if (sweptKeys.has(key)) continue;

                const [h, m] = String(end_time).split(':').map(Number);
                const dueMinutes = h * 60 + m + SWEEP_GRACE_MINUTES;
                if (nowMinutes < dueMinutes) continue;

                sweptKeys.add(key); // claim it before the async work so a slow sweep can't double-fire
                try {
                    const marked = await sweepOnePeriod(connection, period_label, todayStr);
                    console.log(`[attendanceSweep] ${period_label} swept for ${todayStr}: marked ${marked} absent`);
                } catch (err) {
                    sweptKeys.delete(key); // let it retry next tick instead of silently never sweeping this period
                    console.error(`[attendanceSweep] ${period_label} sweep failed:`, err);
                }
            }
        } finally {
            await connection.release();
        }
    }

    tick();
    setInterval(tick, 60 * 1000);
}

module.exports = { runAttendanceSweep, scheduleDailyAttendanceSweep };
