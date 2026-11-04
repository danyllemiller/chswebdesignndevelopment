// server/lib/accommodations.js
// Students' accommodation plans (IEP / 504), entered on the teacher's Accommodations page
// (admin/accommodations.html, server/routes/accommodations.js), and the three things the class site does
// about them on its own:
//   extra_days  -- extra SCHOOL days on assignments: an assignment isn't missing (a zero) or late for that
//                  student until that many school days after its due date (tests, pre-tests and clock-ins
//                  keep their dates; see isShiftable)
//   test_time_x -- more time on timed tests (1, 1.5 or 2): the Monday WRS Sprint
//   read_aloud  -- the Read aloud button on timed tests: the Monday WRS Sprint
// Everything else in a plan is a reminder for the teacher. Students never see the plan, only their own due
// dates and test time. School days come from special-dates.csv (weekends and OFF days don't count).
const fs = require('fs');
const path = require('path');

async function ensureTable(c) {
    await c.execute(`
        CREATE TABLE IF NOT EXISTS student_accommodations (
            student_id  VARCHAR(50) NOT NULL PRIMARY KEY,
            plan_type   VARCHAR(10) NOT NULL DEFAULT 'IEP',
            plan_start  DATE NULL,
            plan_end    DATE NULL,
            extra_days  TINYINT UNSIGNED NOT NULL DEFAULT 0,
            test_time_x DECIMAL(3,2) NOT NULL DEFAULT 1.00,
            read_aloud  TINYINT(1) NOT NULL DEFAULT 0,
            items_json  MEDIUMTEXT NULL,
            notes       VARCHAR(2000) NULL,
            updated_by  VARCHAR(100) NULL,
            updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

// Every student's automatic settings, cached for a minute (saving on the Accommodations page clears it)
let cache = null, cachedAt = 0;
async function settingsMap(c) {
    if (cache && Date.now() - cachedAt < 60000) return cache;
    await ensureTable(c);
    const [rows] = await c.execute('SELECT student_id, extra_days, test_time_x, read_aloud FROM student_accommodations');
    cache = new Map(rows.map(r => [String(r.student_id), { extraDays: Number(r.extra_days) || 0, testTimeX: Number(r.test_time_x) || 1, readAloud: !!r.read_aloud }]));
    cachedAt = Date.now();
    return cache;
}
const clearCache = () => { cache = null; };
async function settingsFor(c, studentId) {
    return (await settingsMap(c)).get(String(studentId)) || { extraDays: 0, testTimeX: 1, readAloud: false };
}

// Days with no school, from special-dates.csv (re-read when it changes)
const CSV = path.join(__dirname, '..', '..', 'special-dates.csv');
let off = { mtime: 0, set: new Set() };
function offDays() {
    try {
        const { mtimeMs } = fs.statSync(CSV);
        if (mtimeMs !== off.mtime) {
            const set = new Set();
            fs.readFileSync(CSV, 'utf8').split('\n').slice(1).forEach(line => {
                const [d, t] = line.split(',').map(x => (x || '').trim());
                if (/^\d{4}-\d\d-\d\d$/.test(d) && /^(OFF|S)$/i.test(t)) set.add(d);
            });
            off = { mtime: mtimeMs, set };
        }
    } catch (e) { /* no calendar: weekends only */ }
    return off.set;
}

// Tests, pre-work and clock-ins keep their dates; everything else is an assignment that gets extra days
const isShiftable = examId => !/(^|[^a-z])(exam|test|quiz|final)([^a-z]|$)|pre-?scale|pre-?assessment|pre-?test|diagnostic|^TC-|^Unit\d+-Pre/i.test(String(examId || ''));

// A due date (YYYY-MM-DD) moved later by `days` school days
function shiftDue(due, days, offSet = offDays()) {
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
const dueFor = (due, examId, extraDays) => (extraDays && isShiftable(examId) ? shiftDue(due, extraDays) : due);

module.exports = { ensureTable, settingsMap, settingsFor, clearCache, offDays, isShiftable, shiftDue, dueFor };
