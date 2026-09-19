// Shared utilities used across multiple route modules

function getCurrentSchoolYear() {
    const now = new Date();
    const y = now.getFullYear();
    return (now.getMonth() + 1) >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function normalizeCourseCodeLegacy(sectionId = '') {
    const s = String(sectionId).toUpperCase();
    if (s.startsWith('WD1')) return '05254G1S';
    if (s.startsWith('WD2')) return '05254G2S';
    if (s.startsWith('AS'))  return '05254EF-201';
    if (s.startsWith('CS'))  return '10003GS';
    return null;
}

async function resolveCourseId(connection, sectionId) {
    const [rows] = await connection.execute(
        'SELECT course_id FROM class_sections WHERE section_id = ?',
        [sectionId]
    );
    if (rows.length && rows[0].course_id) return rows[0].course_id;
    return normalizeCourseCodeLegacy(sectionId);
}

function clampScore(score, max = 100) {
    const n = Number(score);
    if (Number.isNaN(n)) return 0;
    if (n < 0) return 0;
    if (n > max) return max;
    return n;
}

// Returns null if pw satisfies the password rule, otherwise a specific
// message naming the first unmet requirement. Only for password *creation*
// (register, change-password, self-service reset) -- never call this from
// /login, since existing accounts predate this rule and must still be able
// to authenticate.
//
// Special characters are restricted to standard printable ASCII punctuation
// (no whitespace, no Unicode/emoji/accented letters/smart quotes) -- those
// can be invisible, look identical to their ASCII counterparts, or be
// impossible to retype consistently across a school Chromebook vs. a phone.
function validatePassword(pw) {
    const s = String(pw || '');
    if (s.length < 8) return 'Password must be at least 8 characters.';
    if (/\s/.test(s)) return 'Password cannot contain spaces.';
    if (!/^[\x21-\x7E]+$/.test(s)) return 'Password can only contain standard keyboard letters, numbers, and symbols.';
    if (!/[A-Z]/.test(s)) return 'Password needs at least one uppercase letter.';
    if (!/[a-z]/.test(s)) return 'Password needs at least one lowercase letter.';
    if (!/[0-9]/.test(s)) return 'Password needs at least one number.';
    if (!/[^A-Za-z0-9]/.test(s)) return 'Password needs at least one special character.';
    return null;
}

async function ensureOffDaysTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS school_off_days (
            off_date DATE PRIMARY KEY,
            label VARCHAR(100)
        )
    `);
}

// Tests (unit exams/pre-tests specifically -- see TEST_EXAM_ID_PATTERN in
// gradebook.js) are only allowed 7am-4pm on an actual school day: not a
// weekend, not a listed holiday/teacher-workday. Off days are whatever's in
// school_off_days -- a small admin-maintained list (admin/tools/off-days.html),
// since there's no real school calendar data source in the app to check
// against instead.
async function isTestingWindowOpen(connection) {
    await ensureOffDaysTable(connection);
    const now = new Date();
    const dow = now.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) return { ok: false, reason: 'weekend' };

    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [offRows] = await connection.execute('SELECT label FROM school_off_days WHERE off_date = ?', [dateStr]);
    if (offRows.length > 0) return { ok: false, reason: 'holiday', label: offRows[0].label || 'No school today' };

    const hour = now.getHours();
    if (hour < 7 || hour >= 16) return { ok: false, reason: 'after_hours' };

    return { ok: true };
}

// --- Shared auth checks -----------------------------------------------
// Every /admin/* route already gets a blanket staff-only gate in
// server/api.js, added after that prefix's own auth was found to be
// entirely client-side/advisory. The much larger set of non-admin routes
// (student_id-scoped reads/writes like /student/grades, /student/messages,
// /tardy/*, /teacher/planner/*, etc.) never got the same treatment and had
// no server-side check of their own -- these three helpers are the shared,
// consistent version of the isSelf/isStaff check already written inline
// for each route added this session (server/routes/projects.js,
// server/routes/practicum.js, the new endpoints in gradebook.js), used
// as real Express middleware everywhere else so 100+ routes don't each
// hand-roll a slightly different copy of the same three lines.
function isStaffSession(req) {
    const u = req.session && req.session.user;
    return !!(u && (u.role === 'admin' || u.section_id === 'Teacher'));
}

function isSelfOrStaffSession(req, studentId) {
    const u = req.session && req.session.user;
    if (!u) return false;
    if (isStaffSession(req)) return true;
    return u.student_id && studentId && String(u.student_id) === String(studentId);
}

// Requires the caller to be logged in as the student named by
// req.query[field]/req.body[field]/req.params[field] (checked in that
// order), or staff. Use on any route that takes a student_id and only
// that student (or a teacher) should be able to read/write it.
function requireSelfOrStaff(field = 'student_id') {
    return (req, res, next) => {
        const studentId = req.query?.[field] ?? req.body?.[field] ?? req.params?.[field];
        if (!isSelfOrStaffSession(req, studentId)) return res.status(401).json({ error: 'Not authorized.' });
        next();
    };
}

// Staff (admin or Teacher section) only -- for routes that aren't under
// /admin/* by naming convention but are staff-facing in practice (tardy
// logs, the teacher planner view of a student, roster/payroll data).
function requireStaff(req, res, next) {
    if (!isStaffSession(req)) return res.status(401).json({ error: 'Not authorized.' });
    next();
}

// Any authenticated account, student or staff -- for routes that are
// real reference data (bell schedule, song catalog) rather than any one
// person's private data, but still shouldn't be answering to a logged-out
// request off the open internet.
function requireLogin(req, res, next) {
    if (!(req.session && req.session.user)) return res.status(401).json({ error: 'Not authorized.' });
    next();
}

module.exports = {
    getCurrentSchoolYear, resolveCourseId, clampScore, validatePassword, ensureOffDaysTable, isTestingWindowOpen,
    isStaffSession, isSelfOrStaffSession, requireSelfOrStaff, requireStaff, requireLogin
};
