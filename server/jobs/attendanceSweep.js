// server/jobs/attendanceSweep.js
// Scanning only ever produces "present" or "tardy" rows -- nobody scans
// themselves in as absent. This fills in "absent" at the end of the day for
// every student enrolled in a period that actually met today who never got
// an attendance row at all, so a day the teacher takes attendance by
// scanning still ends with exactly one row per enrolled student per period,
// same end goal as server/jobs/autoClockout.js for missed clock-outs.
const { getDbConnection } = require('../db');
const { getDayTypes, getBellScheduleKeyForDate, getLocalDateStr } = require('../tardyLogic');
const { ensureAttendanceTables, getEnrolledStudents } = require('../lib/attendanceStore');

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
            const roster = await getEnrolledStudents(connection, period_label);
            if (roster.length === 0) continue;
            const [existingRows] = await connection.execute(
                `SELECT student_id FROM attendance WHERE section_id = ? AND date = ?`,
                [period_label, dateStr]
            );
            const already = new Set(existingRows.map(r => r.student_id));
            for (const s of roster) {
                if (already.has(s.student_id)) continue;
                await connection.execute(
                    `INSERT INTO attendance (student_id, section_id, date, status) VALUES (?, ?, ?, 'absent')`,
                    [s.student_id, period_label, dateStr]
                );
                marked++;
            }
        }
        return { date: dateStr, ran: true, scheduleKey, marked };
    } finally {
        await connection.release();
    }
}

const SWEEP_TIME = { hour: 14, minute: 35 }; // 5 min after autoClockout's 2:30 sweep, same safety margin reasoning
let lastRunDate = null;

function scheduleDailyAttendanceSweep() {
    async function tick() {
        const now = new Date();
        const todayStr = getLocalDateStr(now);
        const pastTriggerTime = now.getHours() > SWEEP_TIME.hour ||
            (now.getHours() === SWEEP_TIME.hour && now.getMinutes() >= SWEEP_TIME.minute);
        if (pastTriggerTime && lastRunDate !== todayStr) {
            lastRunDate = todayStr;
            try {
                const result = await runAttendanceSweep(todayStr);
                console.log('[attendanceSweep] daily sweep:', result);
            } catch (err) {
                console.error('[attendanceSweep] daily sweep failed:', err);
                lastRunDate = null;
            }
        }
    }
    tick();
    setInterval(tick, 60 * 1000);
}

module.exports = { runAttendanceSweep, scheduleDailyAttendanceSweep };
