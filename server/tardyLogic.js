// server/tardyLogic.js
// Single source of truth for tardy consequence policy and the "effective"
// (decayed, quarter-scoped) tardy count shown to teachers, shared by
// server/routes/tardy.js and anything else that needs to know where a
// student actually stands right now.
const fs = require('fs');
const path = require('path');

// Mirrors js/modules/tardy-ladder.js word-for-word (duplicated rather than
// shared via import because that module uses ES module syntax and this
// server runs CommonJS -- same reasoning as the identical copy that used to
// live in server/routes/daily-activity.js, moved here since this is now the
// one place that owns tardy policy on the server side).
const TARDY_LADDER = [
    { count: 1, label: 'First Tardy', consequence: 'Brief private check-in. No further consequence.' },
    { count: 2, label: 'Second Tardy', consequence: 'Five-minute conference and a short written reflection identifying one specific change.' },
    { count: 3, label: 'Third Tardy', consequence: "I'll ask what you think could help your student get to class on time, and we'll build a plan together based on your input." },
    { count: 4, label: 'Fourth Tardy', consequence: "A restorative session is scheduled, the counselor is looped in, and I'll ask what you think could help your student get to class on time." },
    { count: 5, label: 'Fifth Tardy & Beyond', consequence: 'Administrative referral, with a meeting requested including parent/guardian, counselor, and an administrator.' }
];
function getTardyStep(count) {
    if (!count || count < 1) return null;
    return TARDY_LADDER.find(s => s.count === count) || TARDY_LADDER[TARDY_LADDER.length - 1];
}

// Quarter boundaries for the 2026-2027 school year, read directly off
// special-dates.csv's own "End Q1"/"End Q3" markers (Q2 ends at the "End
// S1" semester boundary, Q4 runs to the last day of school -- neither of
// those is separately marked as "End Q2"/"End Q4" in the CSV). Hardcoded
// because there's no quarters table anywhere in this codebase to read from
// instead -- same maintenance model as special-dates.csv itself, which
// already has to be hand-updated every year. Update this array at the start
// of each new school year.
const QUARTER_BOUNDARIES = [
    { start: '2026-08-18', end: '2026-10-16' }, // Q1
    { start: '2026-10-17', end: '2026-12-17' }, // Q2 (12-18 is a teacher work day, not a student day)
    { start: '2027-01-05', end: '2027-03-19' }, // Q3 (01-04 is staff-only professional learning)
    { start: '2027-03-20', end: '2027-06-03' }  // Q4 (last day of school)
];

// Tardies from before the current quarter's start date simply aren't
// included in the meeting-day window computeEffectiveCount() walks over,
// which is what implements "tardies start fresh at 0 each quarter" --
// nothing needs to be deleted or archived, the count is just never asked
// to look further back than this.
function getCurrentQuarterStart(dateStr) {
    const q = QUARTER_BOUNDARIES.find(b => dateStr >= b.start && dateStr <= b.end);
    if (q) return q.start;
    // Outside any defined window (summer, or a date past the last boundary)
    // -- fall back to the most recent quarter that's already started, so
    // this never throws on a school-break date.
    const started = QUARTER_BOUNDARIES.filter(b => dateStr >= b.start);
    return started.length ? started[started.length - 1].start : QUARTER_BOUNDARIES[0].start;
}

const EVENT_TYPE_PRI = { A: 6, B: 5, C: 4, A_MIN: 3, B_MIN: 2, S: 2, OFF: 1, none: 0 };

function getLocalDateStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseSpecialDatesCSV(text) {
    const map = new Map();
    const lines = text.split(/\r?\n/);
    const firstLine = lines.find(l => l.trim());
    const delim = firstLine && firstLine.includes('\t') ? '\t' : ',';
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].trim();
        if (!raw) continue;
        if (i === 0 && /^date/i.test(raw.split(delim)[0].trim())) continue;
        const cols = raw.split(delim);
        const date = cols[0]?.trim();
        const type = cols[1]?.trim();
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && type) map.set(date, { type });
    }
    return map;
}

let dayTypesCache = null;
let dayTypesCacheAt = 0;

async function getDayTypes(connection) {
    if (dayTypesCache && Date.now() - dayTypesCacheAt < 60000) return dayTypesCache;
    let csvText = '';
    try { csvText = fs.readFileSync(path.join(__dirname, '..', 'special-dates.csv'), 'utf8'); } catch (e) { /* fall through with an empty CSV layer */ }
    const dayTypes = parseSpecialDatesCSV(csvText);
    const [events] = await connection.execute('SELECT event_date, type FROM calendar_events');
    events.forEach(ev => {
        const dateStr = getLocalDateStr(new Date(ev.event_date));
        const existing = dayTypes.get(dateStr);
        if (existing) {
            if ((EVENT_TYPE_PRI[ev.type] ?? 0) > (EVENT_TYPE_PRI[existing.type] ?? 0)) existing.type = ev.type;
        } else {
            dayTypes.set(dateStr, { type: ev.type });
        }
    });
    dayTypesCache = dayTypes;
    dayTypesCacheAt = Date.now();
    return dayTypes;
}

function getBellScheduleKeyForDate(dayTypes, dateStr) {
    const info = dayTypes.get(dateStr);
    if (!info || info.type === 'OFF' || info.type === 'none') return null;
    const jsDay = new Date(dateStr + 'T00:00:00').getDay();
    if (jsDay === 0 || jsDay === 6) return null;
    return info.type === 'S' ? 'summer' : info.type;
}

// Every calendar date a given period actually meets between two dates
// (inclusive), per the real bell schedule -- weekends, holidays, and days
// that day-type's schedule doesn't include this period at all are all
// correctly excluded, same as the "minutes late" calculation already does
// in admin/tools/tardy-tracker.html.
async function getMeetingDates(connection, dayTypes, period, fromDateStr, toDateStr) {
    const p = String(period || '').trim().toUpperCase();
    const [bellRows] = await connection.execute('SELECT schedule_type, period_label FROM bell_schedule');
    const meetsOnScheduleKey = (scheduleKey) => bellRows.some(r =>
        r.schedule_type === scheduleKey && (r.period_label === p || p.includes(r.period_label))
    );

    const dates = [];
    const cursor = new Date(fromDateStr + 'T00:00:00');
    const end = new Date(toDateStr + 'T00:00:00');
    while (cursor <= end) {
        const dStr = getLocalDateStr(cursor);
        const scheduleKey = getBellScheduleKeyForDate(dayTypes, dStr);
        if (scheduleKey && meetsOnScheduleKey(scheduleKey)) dates.push(dStr);
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

// The decay rule: walking a student's period's real meeting days in order,
// every tardy adds 1 to both the raw and effective count; every run of 5
// consecutive meetings with no tardy logged subtracts 1 back off the
// effective count (never below 0) and resets the clean streak. rawCount is
// the true historical total (for display/record-keeping); effectiveCount is
// what actually drives the consequence ladder.
function computeDecay(tardyCountByDate, meetingDatesSorted) {
    let rawCount = 0;
    let effectiveCount = 0;
    let cleanStreak = 0;
    for (const d of meetingDatesSorted) {
        const dayTardies = tardyCountByDate.get(d) || 0;
        if (dayTardies > 0) {
            rawCount += dayTardies;
            effectiveCount += dayTardies;
            cleanStreak = 0;
        } else {
            cleanStreak++;
            if (cleanStreak >= 5 && effectiveCount > 0) {
                effectiveCount--;
                cleanStreak = 0;
            }
        }
    }
    return { rawCount, effectiveCount };
}

// Computes { rawCount, effectiveCount, lastTardyDate } for one student's
// period, scoped to the current quarter (tardies before the quarter start
// are outside the meeting-date window entirely, so they simply don't
// factor in -- that's the "reset to 0 each quarter" rule) and decayed per
// computeDecay() above (the "5 clean periods drops one off" rule).
// tardyDates: array of 'YYYY-MM-DD' strings, one per logged tardy, for this
// student+period, in any order.
async function computeEffectiveCount(connection, period, tardyDates, asOfDateStr = getLocalDateStr()) {
    const quarterStart = getCurrentQuarterStart(asOfDateStr);
    const dayTypes = await getDayTypes(connection);
    const meetingDates = await getMeetingDates(connection, dayTypes, period, quarterStart, asOfDateStr);

    const tardyCountByDate = new Map();
    tardyDates.forEach(d => {
        if (d < quarterStart || d > asOfDateStr) return; // outside this quarter's window
        tardyCountByDate.set(d, (tardyCountByDate.get(d) || 0) + 1);
    });

    const { rawCount, effectiveCount } = computeDecay(tardyCountByDate, meetingDates);
    const inWindow = tardyDates.filter(d => d >= quarterStart && d <= asOfDateStr);
    const lastTardyDate = inWindow.length ? inWindow.sort().slice(-1)[0] : null;
    return { rawCount, effectiveCount, lastTardyDate, quarterStart };
}

module.exports = {
    TARDY_LADDER,
    getTardyStep,
    QUARTER_BOUNDARIES,
    getCurrentQuarterStart,
    getLocalDateStr,
    computeEffectiveCount
};
