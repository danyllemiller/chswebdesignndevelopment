// server/lib/clockinDays.js
// Which periods a daily clock-in counts for. A day's clock-in row (exams
// TC-<course>-<date>) is shared by every period of its course: the first
// clock-in of the day creates it (server/routes/timeclock.js). It only
// counts for the periods that actually met that day -- the bell_schedule
// periods of that day's calendar type, the same test tardyLogic's
// getMeetingDates uses -- and a clock-in on a day no period met (a
// Saturday) counts for no one. Teacher report 2026-10-26: B4 students saw
// every A-day clock-in as missing (and a zero in their grade) because an
// A3/A5 clock-in had created that day's row.
const { getDayTypes, getBellScheduleKeyForDate } = require('../tardyLogic');

const TC_DATE = /^TC-[A-Z0-9]+-(\d{4}-\d{2}-\d{2})$/i;

// The date of a clock-in row's exam_id, or null for any other assignment.
const clockinDate = examId => (TC_DATE.exec(String(examId || '')) || [])[1] || null;

async function loadClockinDays(connection) {
    const dayTypes = await getDayTypes(connection);
    const [bellRows] = await connection.execute('SELECT schedule_type, period_label FROM bell_schedule');
    const bySchedule = new Map();
    bellRows.forEach(r => {
        const list = bySchedule.get(r.schedule_type) || [];
        list.push(String(r.period_label || '').trim().toUpperCase());
        bySchedule.set(r.schedule_type, list);
    });
    // The bell periods that met on a date, or null when none did (not a
    // school day). B_MIN has no bell rows of its own, so it falls back to B's.
    const periodsOn = (dateStr) => {
        const key = getBellScheduleKeyForDate(dayTypes, dateStr);
        const list = key && (bySchedule.get(key) || bySchedule.get(key.replace(/_MIN$/, '')));
        return list && list.length ? list : null;
    };
    // AS-B2 meets with B2, as in timeclock's getBellStartTime.
    const meets = (section, dateStr) => {
        const s = String(section || '').trim().toUpperCase();
        const on = periodsOn(dateStr);
        return !!on && on.some(p => s === p || s.includes(p));
    };
    return { periodsOn, meets };
}

module.exports = { clockinDate, loadClockinDays };
