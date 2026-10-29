// js/modules/due-extension.js
// Extra school days on assignments for a student whose accommodation plan has them (the teacher's
// Accommodations page; server/lib/accommodations.js has the same rule): an assignment isn't missing or late
// for that student until that many school days after its due date. Tests, pre-work and clock-ins keep their
// dates. Weekends and the school calendar's days off (special-dates.csv) don't count.

export const isShiftable = examId => !/(^|[^a-z])(exam|test|quiz|final)([^a-z]|$)|pre-?scale|pre-?assessment|pre-?test|diagnostic|^TC-|^Unit\d+-Pre/i.test(String(examId || ''));

// A due date (YYYY-MM-DD) moved later by `days` school days
export function shiftDue(due, days, offSet = new Set()) {
    if (!due || !days) return due;
    const d = new Date(`${due}T12:00:00Z`);
    let left = days;
    for (let guard = 0; left > 0 && guard < 60; guard++) {
        d.setUTCDate(d.getUTCDate() + 1);
        const ymd = d.toISOString().slice(0, 10), wd = d.getUTCDay();
        if (wd !== 0 && wd !== 6 && !offSet.has(ymd)) left--;
    }
    return d.toISOString().slice(0, 10);
}

// One student's due date for one assignment
export const dueFor = (due, examId, days, offSet) => (days && due && isShiftable(examId) ? shiftDue(due, days, offSet) : due);
