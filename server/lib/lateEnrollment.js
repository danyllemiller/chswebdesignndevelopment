// server/lib/lateEnrollment.js
// Late enrollees (teacher 2026-11-06, for every semester from now on): a student who joins a class more than two
// weeks after its semester started is excused from every assignment, clock-in and project that came due before they
// joined. Their Pre-Scales, Pre-Assessments (pre-tests) and unit/chapter exams are not excused: they still take
// them. And nothing from before they joined is ever marked missing, those owed tests included, so their grade
// counts only what they've done and what came due after they joined.
//
// The day a student joined each course is kept in course_enrollments (student, the course's course_id, day): the
// day a roster upload or the roster page first put them in that course, or the day a roster upload brought back a
// student who had been archived. Moving periods within a course isn't a new enrollment. Semesters come from
// special-dates.csv: the first starts on "First Day of School", the second on the first school day after "End S1".
//
// Excusing writes an EX for each of those (marked entered in IC, like the teacher's own EX marks), only where the
// student has no score yet; it runs after a roster change and every few hours, so assignments whose due dates move
// are caught too. Not-missing is applied where due dates are judged: server/gradeCalc.js, the student's grades page
// and the gradebook (server/routes/gradebook.js, js/admin/gradebook.js), and the payroll missing list.
const fs = require('fs');
const path = require('path');

const LATE_AFTER_DAYS = 14;
// Not excused: the student still takes these (their due date just doesn't make them missing)
const STILL_OWED = /pre-?scale|pre-?assessment|pre-?test|diagnostic|-Pre$|-Pre-Score$|(^|[^a-z])(exam|final)([^a-z]|$)/i;

async function ensureTable(c) {
    await c.execute(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
            student_id VARCHAR(50) NOT NULL,
            course_id  VARCHAR(50) NOT NULL,
            joined_on  DATE NOT NULL,
            source     VARCHAR(20) NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (student_id, course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = d => (d instanceof Date ? ymd(d) : String(d || '').slice(0, 10));

// Semester start days from the school calendar (re-read when it changes)
const CSV = path.join(__dirname, '..', '..', 'special-dates.csv');
let sem = { mtime: 0, starts: [] };
function semesterStarts() {
    try {
        const { mtimeMs } = fs.statSync(CSV);
        if (mtimeMs !== sem.mtime) {
            const rows = fs.readFileSync(CSV, 'utf8').split('\n').slice(1)
                .map(l => l.split(',').map(x => (x || '').trim())).filter(r => /^\d{4}-\d\d-\d\d$/.test(r[0]));
            const starts = [];
            rows.forEach((r, i) => {
                if (/first day of school/i.test(r[2] || '')) starts.push(r[0]);
                if (/end s1\b/i.test(r[2] || '')) {
                    const next = rows.slice(i + 1).find(x => !/^(OFF|S|none)$/i.test(x[1]));
                    if (next) starts.push(next[0]);
                }
            });
            sem = { mtime: mtimeMs, starts: starts.sort() };
        }
    } catch (e) { /* no calendar: nobody counts as late */ }
    return sem.starts;
}

// Whether joining on this day (YYYY-MM-DD) is more than two weeks into its semester
function isLateJoin(day) {
    const start = semesterStarts().filter(s => s <= day).pop();
    if (!start) return false;
    const cutoff = new Date(`${start}T12:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() + LATE_AFTER_DAYS);
    return day > cutoff.toISOString().slice(0, 10);
}

// student_id -> { course_id: joined day } for every late enrollment (cached briefly)
let cache = { at: 0, map: null };
async function lateMap(c) {
    if (cache.map && Date.now() - cache.at < 60000) return cache.map;
    await ensureTable(c);
    const [rows] = await c.execute('SELECT student_id, course_id, joined_on FROM course_enrollments');
    const map = new Map();
    rows.forEach(r => {
        const day = fmt(r.joined_on);
        if (!isLateJoin(day)) return;
        const id = String(r.student_id);
        if (!map.has(id)) map.set(id, {});
        map.get(id)[r.course_id] = day;
    });
    cache = { at: Date.now(), map };
    return map;
}
const clearCache = () => { cache = { at: 0, map: null }; };

// One student's due date for one item of one course: none at all if it came due before they joined that course
function dueAfterJoin(due, joined) {
    return joined && due && fmt(due) < joined ? '' : due;
}

// Records the day each student joined each of their courses, the first time it's seen. `returning` students (back
// from archived) count as joining again today. `pairs` is [{ student_id, section_id }].
async function recordJoins(c, pairs, { returning = new Set(), source = 'roster' } = {}) {
    await ensureTable(c);
    const [secs] = await c.execute('SELECT section_id, course_id FROM class_sections WHERE course_id IS NOT NULL');
    const courseOf = new Map(secs.map(s => [String(s.section_id), String(s.course_id)]));
    const today = ymd(new Date());
    for (const p of pairs) {
        const course = courseOf.get(String(p.section_id));
        if (!course || /^(TEST|99999999)/.test(course)) continue;
        const again = returning.has(String(p.student_id));
        await c.execute(
            `INSERT INTO course_enrollments (student_id, course_id, joined_on, source) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE ${again ? 'joined_on = VALUES(joined_on), source = VALUES(source)' : 'student_id = student_id'}`,
            [String(p.student_id), course, today, again ? 'returned' : source]);
    }
    clearCache();
}

// Writes the EX marks for late enrollees (one student, or all of them). Returns how many were added.
async function excuseBeforeJoining(c, studentId) {
    const map = await lateMap(c);
    let added = 0;
    for (const [sid, courses] of map) {
        if (studentId && sid !== String(studentId)) continue;
        const [[st]] = await c.execute('SELECT section_id FROM students WHERE student_id = ? AND COALESCE(archived, 0) = 0', [sid]);
        if (!st) continue;
        for (const [course, joined] of Object.entries(courses)) {
            const [rows] = await c.execute(
                `SELECT e.exam_id, e.total_points, e.due_date, e.period_due_dates FROM exams e
                 WHERE e.course_id = ? AND NOT EXISTS (SELECT 1 FROM responses r WHERE r.student_id = ? AND r.exam_id = e.exam_id)`,
                [course, sid]);
            for (const r of rows) {
                if (STILL_OWED.test(r.exam_id)) continue;
                let due = fmt(r.due_date);
                try {
                    const pd = r.period_due_dates ? (typeof r.period_due_dates === 'string' ? JSON.parse(r.period_due_dates) : r.period_due_dates) : {};
                    if (pd && pd[st.section_id]) due = fmt(pd[st.section_id]);
                } catch (e) { /* malformed override: the base due date */ }
                if (!due || due >= joined) continue;
                const [res] = await c.execute(
                    "INSERT IGNORE INTO responses (student_id, exam_id, score, total_points, timestamp, entered_in_ic) VALUES (?, ?, 'EX', ?, NOW(), 1)",
                    [sid, r.exam_id, r.total_points || 0]);
                added += res.affectedRows || 0;
            }
        }
    }
    return added;
}

module.exports = { ensureTable, lateMap, clearCache, isLateJoin, semesterStarts, dueAfterJoin, recordJoins, excuseBeforeJoining, STILL_OWED };
