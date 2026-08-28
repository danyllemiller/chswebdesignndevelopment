const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { resolveCourseId, getCurrentSchoolYear } = require('../helpers');
const { computeStudentGrade } = require('../gradeCalc');

const ON_TIME_BONUS = 5.00;
// Backfill baseline for students.role_history -- safely before any shift
// this school year, so date-based rate lookups always have a row to fall
// back on even for a student who's never had an explicit role change.
const HISTORY_BACKFILL_DATE = '2026-07-01';

// mysql2 returns DATE columns as JS Date objects (local-timezone fields set
// to match the stored date exactly) -- reading fields directly avoids the
// UTC-conversion day-shift .toISOString() would introduce. Same helper as
// server/routes/gradebook.js.
function formatDbDate(d) {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0].split(' ')[0];
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// mysql2 returns TIME columns as JS Date objects too (confirmed live --
// timesheets.clock_in/clock_out come back as full Date objects, not "HH:MM:SS"
// strings). The old `${t.date}T${t.clock_in}` string-concat pattern silently
// produced "Invalid Date" every time as a result (Date.toString() output
// doesn't combine into a parseable ISO string), which would have zeroed out
// every student's hours the first time payroll was actually run. Extracting
// minutes-since-midnight directly sidesteps string parsing entirely.
function timeToMinutes(t) {
    if (!t) return null;
    if (t instanceof Date) return t.getHours() * 60 + t.getMinutes() + t.getSeconds() / 60;
    const [h, m, s] = String(t).split(':').map(Number);
    if (Number.isNaN(h)) return null;
    return h * 60 + (m || 0) + (s || 0) / 60;
}

// Semi-monthly pay date: whichever comes first, the 1st or the 15th, on or
// after the day payroll is actually run -- not the period's own end date.
// Running payroll on 8/28 for a period that ended 8/22 pays out 9/1, the
// next payday after processing, matching how a real semi-monthly payroll
// calendar works. Computed once per run (same for every student in it) and
// frozen on payroll_runs so it doesn't drift if viewed/printed later.
function getLocalDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeNextPayDate(fromDateStr) {
    const [y, m, d] = fromDateStr.split('-').map(Number);
    const target = d <= 1 ? 1 : (d <= 15 ? 15 : 1);
    const targetMonth = (d <= 15) ? m : (m === 12 ? 1 : m + 1);
    const targetYear = (d <= 15) ? y : (m === 12 ? y + 1 : y);
    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(target).padStart(2, '0')}`;
}

// students.course_id is NULL for a lot of legacy-enrolled students (confirmed
// live -- WD1-B4/WD1-B6/WD2-A3/CS-B8 etc. all rely on section_id resolution
// instead), so filtering/grouping payroll by the raw column would silently
// drop them. Resolve through the same class_sections/legacy-prefix lookup
// gradebook.js already uses for grades, once per distinct section_id.
async function resolveEffectiveCourseIds(connection, students) {
    const bySection = new Map();
    for (const s of students) {
        const key = s.section_id || '';
        if (!bySection.has(key)) bySection.set(key, await resolveCourseId(connection, key));
    }
    return students.map(s => ({ ...s, effective_course_id: bySection.get(s.section_id || '') }));
}

async function ensurePaystubTables() {
    let connection;
    try {
        connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS payroll_runs (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                period_start DATE NOT NULL,
                period_end   DATE NOT NULL,
                pay_date     DATE NULL,
                run_by       VARCHAR(100),
                notes        TEXT,
                is_finalized TINYINT(1) DEFAULT 1,
                run_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_period (period_start, period_end)
            )
        `);
        const [payDateCols] = await connection.execute(`SHOW COLUMNS FROM payroll_runs LIKE 'pay_date'`);
        if (payDateCols.length === 0) {
            await connection.execute(`ALTER TABLE payroll_runs ADD COLUMN pay_date DATE NULL`);
        }
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_paystubs (
                id               INT AUTO_INCREMENT PRIMARY KEY,
                payroll_run_id   INT NOT NULL,
                student_id       VARCHAR(50) NOT NULL,
                role_title       VARCHAR(100),
                hourly_rate      DECIMAL(8,2) DEFAULT 0,
                regular_hours    DECIMAL(10,4) DEFAULT 0,
                bonus_count      INT DEFAULT 0,
                bonus_rate       DECIMAL(8,2) DEFAULT 5.00,
                gross_pay        DECIMAL(10,2) DEFAULT 0,
                fed_tax          DECIMAL(10,2) DEFAULT 0,
                ss_tax           DECIMAL(10,2) DEFAULT 0,
                med_tax          DECIMAL(10,2) DEFAULT 0,
                total_deductions DECIMAL(10,2) DEFAULT 0,
                net_pay          DECIMAL(10,2) DEFAULT 0,
                ytd_gross        DECIMAL(10,2) DEFAULT 0,
                generated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_stub (payroll_run_id, student_id),
                FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id)
            )
        `);
        // Marks which run (if any) has already paid a given shift, so the
        // same hours can never be counted into two different payroll runs.
        // Re-running the SAME run releases its own claims first (see the
        // /admin/payroll/run handler), so this only blocks a DIFFERENT run
        // from re-claiming hours, not a legitimate re-run of one period.
        const [cols] = await connection.execute(`SHOW COLUMNS FROM timesheets LIKE 'paid_run_id'`);
        if (cols.length === 0) {
            await connection.execute(`ALTER TABLE timesheets ADD COLUMN paid_run_id INT NULL`);
        }

        // students.role_id is only ever "the role right now" -- no memory of
        // when it changed. That's not good enough for payroll: a rate change
        // mid-pay-period needs the OLD rate applied to shifts before the
        // change and the NEW rate after, within the same run. This table is
        // the source of truth for "which role was this student under on a
        // given date"; students.role_id stays as a plain current-state
        // convenience pointer for the many places that already read it.
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_role_history (
                id             INT AUTO_INCREMENT PRIMARY KEY,
                student_id     VARCHAR(50) NOT NULL,
                role_id        INT NOT NULL,
                effective_date DATE NOT NULL,
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_student_date (student_id, effective_date)
            )
        `);
        const [[{ cnt }]] = await connection.execute('SELECT COUNT(*) AS cnt FROM student_role_history');
        if (cnt === 0) {
            // One-time backfill: give every student with a role_id today a
            // starting history row, so nobody's rate lookup comes up empty.
            await connection.execute(
                `INSERT INTO student_role_history (student_id, role_id, effective_date)
                 SELECT student_id, role_id, ? FROM students WHERE role_id IS NOT NULL`,
                [HISTORY_BACKFILL_DATE]
            );
        }

        const [ptCols] = await connection.execute(`SHOW COLUMNS FROM student_paystubs LIKE 'earnings_lines'`);
        if (ptCols.length === 0) {
            await connection.execute(`ALTER TABLE student_paystubs ADD COLUMN earnings_lines TEXT NULL`);
        }
        const [tardyCols] = await connection.execute(`SHOW COLUMNS FROM student_paystubs LIKE 'tardy_count'`);
        if (tardyCols.length === 0) {
            await connection.execute(`ALTER TABLE student_paystubs ADD COLUMN tardy_count INT DEFAULT 0`);
        }
    } catch (e) {
        console.error('[paystubs] Migration error:', e.message);
    } finally {
        if (connection) await connection.release();
    }
}

// Sorted (oldest-first) per-student role history, joined to pay_roles for
// the title/rate that was actually in effect at each point.
async function getRoleHistoryByStudent(connection, studentIds) {
    if (studentIds.length === 0) return {};
    const [rows] = await connection.execute(`
        SELECT h.student_id, h.effective_date, r.id AS role_id, r.title, r.hourly_rate
        FROM student_role_history h
        JOIN pay_roles r ON h.role_id = r.id
        WHERE h.student_id IN (${studentIds.map(() => '?').join(',')})
        ORDER BY h.student_id, h.effective_date ASC
    `, studentIds);
    const byStudent = {};
    rows.forEach(r => {
        if (!byStudent[r.student_id]) byStudent[r.student_id] = [];
        byStudent[r.student_id].push({ ...r, effective_date: formatDbDate(r.effective_date) });
    });
    return byStudent;
}

// Which role was in effect on a given shift date -- the latest history row
// whose effective_date is on or before that date. If a shift somehow
// predates every history row (shouldn't happen once backfilled), falls
// back to the earliest known row rather than silently dropping the shift.
function resolveRoleForDate(historyRows, dateStr) {
    if (!historyRows || historyRows.length === 0) return null;
    let match = null;
    for (const h of historyRows) {
        if (h.effective_date <= dateStr) match = h;
        else break;
    }
    return match || historyRows[0];
}

// Shared by the preview (dry run) and run (persists) endpoints so preview
// numbers are always exactly what a run will actually charge. Only sums
// timesheet rows no other payroll run has already claimed (paid_run_id IS
// NULL) -- callers that are about to persist a run are responsible for
// releasing that run's own prior claims first so re-running one period
// stays idempotent instead of finding zero unpaid hours the second time.
//
// Rate is resolved PER SHIFT from student_role_history, not once per
// student -- a mid-period role change (e.g. promoted from Intern to Web
// Developer partway through a pay period) correctly pays the old rate for
// shifts before the change and the new rate after, in the same run.
async function computePayrollForPeriod(connection, { period_start, period_end, course_ids }) {
    // Same current-year + not-archived scoping as the tardy tracker
    // (server/routes/tardy.js) -- this query had neither, so a payroll run
    // pulled in every student ever enrolled, prior years and archived
    // students included, not just the currently-rostered ones.
    // Also scoped to real, current bell-schedule periods (A1, A3, A5, B2,
    // B4, B6, B8, INTV, ...) -- some students still carry stale legacy
    // section_id labels ("WD1-A1", "WD1-B4", "T1", etc.) left over from a
    // previous section-naming scheme. Those aren't real current periods,
    // but they were still passing the archived/school_year check above,
    // so a payroll run was sweeping in every one of them as extra
    // students who don't actually belong on this pay period.
    const [allStudents] = await connection.execute(`
        SELECT s.student_id, s.first_name, s.last_name, s.section_id, s.course_id,
               COALESCE(r.title, 'Web Developer')                   AS role_title,
               COALESCE(CAST(r.hourly_rate AS DECIMAL(8,2)), 35.00) AS hourly_rate
        FROM students s
        LEFT JOIN pay_roles r ON s.role_id = r.id
        WHERE (s.role IS NULL OR LOWER(s.role) NOT IN ('admin','teacher'))
          AND (s.section_id IS NULL OR s.section_id != 'Teacher')
          AND (s.archived IS NULL OR s.archived = 0)
          AND s.school_year = ?
          AND s.section_id IN (SELECT DISTINCT period_label FROM bell_schedule)`, [getCurrentSchoolYear()]);
    const resolved = await resolveEffectiveCourseIds(connection, allStudents);
    const students = (Array.isArray(course_ids) && course_ids.length > 0)
        ? resolved.filter(s => course_ids.includes(s.effective_course_id))
        : resolved;

    const [timesheets] = await connection.execute(
        'SELECT * FROM timesheets WHERE date >= ? AND date <= ? AND paid_run_id IS NULL',
        [period_start, period_end]
    );
    const tsMap = {};
    timesheets.forEach(t => {
        if (!tsMap[t.student_id]) tsMap[t.student_id] = [];
        tsMap[t.student_id].push(t);
    });

    const historyByStudent = await getRoleHistoryByStudent(connection, students.map(s => s.student_id));

    const studentIds = students.map(s => s.student_id);
    let tardyMap = {};
    if (studentIds.length > 0) {
        const [tardyRows] = await connection.execute(
            `SELECT student_id, COUNT(*) AS tardy_count FROM tardy_passes
             WHERE student_id IN (${studentIds.map(() => '?').join(',')})
               AND DATE(created_at) BETWEEN ? AND ?
             GROUP BY student_id`,
            [...studentIds, period_start, period_end]
        );
        tardyRows.forEach(r => { tardyMap[r.student_id] = r.tardy_count; });
    }

    // Prior-period YTD gross (same calendar year, before this period)
    const [ytdPrior] = await connection.execute(`
        SELECT sp.student_id, COALESCE(SUM(sp.gross_pay), 0) AS prior_gross
        FROM student_paystubs sp
        JOIN payroll_runs pr ON sp.payroll_run_id = pr.id
        WHERE YEAR(pr.period_end) = YEAR(?) AND pr.period_end < ?
        GROUP BY sp.student_id
    `, [period_end, period_end]);
    const ytdMap = {};
    ytdPrior.forEach(r => { ytdMap[r.student_id] = Number(r.prior_gross); });

    return students.map(s => {
        const shifts = tsMap[s.student_id] || [];
        const history = historyByStudent[s.student_id] || [];
        const fallbackRate = Number(s.hourly_rate) || 35;
        const timesheetIds = [];
        let bonusCount = 0;

        // One bucket per distinct role that actually applied to a shift in
        // this period -- usually just one, but a mid-period rate change
        // produces two (or more) lines, each at its own correct rate.
        const buckets = new Map(); // role_id -> { role_title, rate, mins }
        for (const t of shifts) {
            timesheetIds.push(t.id);
            const role = resolveRoleForDate(history, t.date instanceof Date ? formatDbDate(t.date) : String(t.date).split('T')[0])
                || { role_id: 'fallback', title: s.role_title, hourly_rate: fallbackRate };
            if (!buckets.has(role.role_id)) buckets.set(role.role_id, { role_title: role.title, rate: Number(role.hourly_rate), mins: 0 });

            const inMin = timeToMinutes(t.clock_in);
            const outMin = timeToMinutes(t.clock_out);
            if (inMin !== null && outMin !== null) {
                const mins = outMin - inMin;
                if (mins > 0) buckets.get(role.role_id).mins += mins;
            }
            if (t.in_answer === 'On Time') bonusCount++;
            if (t.out_answer === 'On Time') bonusCount++;
        }

        const earningsLines = [...buckets.values()]
            .filter(b => b.mins > 0)
            .map(b => ({ role_title: b.role_title, rate: b.rate, hours: Number((b.mins / 60).toFixed(4)) }));

        const regularHours = earningsLines.reduce((sum, l) => sum + l.hours, 0);
        const regularPay = earningsLines.reduce((sum, l) => sum + l.hours * l.rate, 0);
        const gross = Number((regularPay + bonusCount * ON_TIME_BONUS).toFixed(2));
        const fedTax = Number((gross * 0.10).toFixed(2));
        const ssTax = Number((gross * 0.062).toFixed(2));
        const medTax = Number((gross * 0.0145).toFixed(2));
        const totalDed = Number((fedTax + ssTax + medTax).toFixed(2));
        const net = Number((gross - totalDed).toFixed(2));
        const ytdGross = Number(((ytdMap[s.student_id] || 0) + gross).toFixed(2));
        // Header/summary role shown on the stub -- the role effective at
        // period end (most recent), since that's "who they are now" even
        // if earlier shifts in the same period paid at an older rate.
        const currentRole = resolveRoleForDate(history, period_end) || { title: s.role_title, hourly_rate: fallbackRate };

        return {
            student_id: s.student_id, first_name: s.first_name, last_name: s.last_name,
            section_id: s.section_id, course_id: s.effective_course_id,
            role_title: currentRole.title, hourly_rate: Number(currentRole.hourly_rate),
            shifts: shifts.length, regular_hours: regularHours, bonus_count: bonusCount,
            bonus_rate: ON_TIME_BONUS, gross_pay: gross, fed_tax: fedTax, ss_tax: ssTax,
            med_tax: medTax, total_deductions: totalDed, net_pay: net, ytd_gross: ytdGross,
            timesheet_ids: timesheetIds, earnings_lines: earningsLines,
            tardy_count: tardyMap[s.student_id] || 0
        };
    });
}

ensurePaystubTables();

// GET /paystubs/my?student_id=X — all finalized paystubs for a student
router.get('/paystubs/my', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT sp.*, pr.period_start, pr.period_end, pr.pay_date, pr.is_finalized, pr.run_by, pr.run_at
            FROM student_paystubs sp
            JOIN payroll_runs pr ON sp.payroll_run_id = pr.id
            WHERE sp.student_id = ?
            ORDER BY pr.period_end DESC
        `, [student_id]);
        await connection.release();
        res.json({ paystubs: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch paystubs' });
    }
});

// GET /paystubs/ytd?student_id=X&year=2026 — year-end tax summary
router.get('/paystubs/ytd', async (req, res) => {
    const { student_id, year } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    const targetYear = Number(year) || new Date().getFullYear();
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT
                COALESCE(SUM(sp.gross_pay), 0)        AS total_gross,
                COALESCE(SUM(sp.fed_tax), 0)          AS total_fed_tax,
                COALESCE(SUM(sp.ss_tax), 0)           AS total_ss_tax,
                COALESCE(SUM(sp.med_tax), 0)          AS total_med_tax,
                COALESCE(SUM(sp.total_deductions), 0) AS total_deductions,
                COALESCE(SUM(sp.net_pay), 0)          AS total_net_pay,
                COALESCE(SUM(sp.regular_hours), 0)    AS total_hours,
                COALESCE(SUM(sp.bonus_count), 0)      AS total_bonuses,
                MAX(sp.role_title)                    AS role_title,
                MAX(sp.hourly_rate)                   AS hourly_rate,
                COUNT(*)                              AS period_count
            FROM student_paystubs sp
            JOIN payroll_runs pr ON sp.payroll_run_id = pr.id
            WHERE sp.student_id = ? AND YEAR(pr.period_end) = ?
        `, [student_id, targetYear]);
        await connection.release();
        res.json({ ytd: rows[0] || null, year: targetYear });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch YTD data' });
    }
});

// Pre-Test/Pre-Scale items are diagnostic and prone to the CS mastery
// exemption (js/student/dashboard.js) -- replicating that 80%-unit-exam
// conditional here would couple this report tightly to grading internals
// for little benefit, so they're simply excluded from "missing" by name
// instead (matches the exam_id conventions in js/quizLogic.js/prof-scales.js:
// "Unit{N}-Pre", "Ch{N} Pre-Assessment...", "...{N} Pre-Scale").
function isExemptFromMissingList(examId, title) {
    const t = `${examId || ''} ${title || ''}`;
    return /-pre$/i.test(examId || '') || /pre-scale/i.test(t) || /pre-assessment/i.test(t);
}

// GET /admin/payroll/missing-assignments?student_ids=1,2,3 — for each given
// student, every assignment whose (possibly per-section-overridden) due
// date has passed with no submission on record. Built for the pay-stub
// print view but scoped by explicit ids so it works for any small batch.
router.get('/admin/payroll/missing-assignments', async (req, res) => {
    const studentIds = String(req.query.student_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (studentIds.length === 0) return res.json({ missing: {} });
    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute(
            `SELECT student_id, section_id FROM students WHERE student_id IN (${studentIds.map(() => '?').join(',')})`,
            studentIds
        );
        const resolved = await resolveEffectiveCourseIds(connection, students);

        const courseIds = [...new Set(resolved.map(s => s.effective_course_id).filter(Boolean))];
        let exams = [];
        if (courseIds.length > 0) {
            const [examRows] = await connection.execute(
                `SELECT exam_id, TRIM(title) AS title, course_id, due_date, period_due_dates
                 FROM exams WHERE course_id IN (${courseIds.map(() => '?').join(',')})`,
                courseIds
            );
            exams = examRows;
        }

        const [responses] = await connection.execute(
            `SELECT student_id, exam_id, score FROM responses WHERE student_id IN (${studentIds.map(() => '?').join(',')})`,
            studentIds
        );
        const responded = new Set(responses.map(r => `${r.student_id}::${r.exam_id}`));

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const missing = {};
        for (const s of resolved) {
            missing[s.student_id] = [];
            for (const e of exams) {
                if (e.course_id !== s.effective_course_id) continue;
                if (isExemptFromMissingList(e.exam_id, e.title)) continue;
                if (responded.has(`${s.student_id}::${e.exam_id}`)) continue;

                let periodDueDates = {};
                try { periodDueDates = e.period_due_dates ? JSON.parse(e.period_due_dates) : {}; } catch { /* malformed override, fall back to base due_date */ }
                const dueDateRaw = periodDueDates[s.section_id] || e.due_date;
                if (!dueDateRaw) continue;
                const dueDate = formatDbDate(dueDateRaw);
                if (new Date(dueDate + 'T00:00:00') >= today) continue;

                missing[s.student_id].push({ exam_id: e.exam_id, title: e.title, due_date: dueDate });
            }
        }

        await connection.release();
        res.json({ missing });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to compute missing assignments' });
    }
});

// GET /admin/payroll/grade-summary?student_ids=1,2,3 — current overall
// grade % + letter for each given student, computed the exact same way
// their own dashboard computes it (see server/gradeCalc.js). Built for the
// parent-newsletter feature, batched by explicit ids like the
// missing-assignments endpoint above.
router.get('/admin/payroll/grade-summary', async (req, res) => {
    const studentIds = String(req.query.student_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (studentIds.length === 0) return res.json({ grades: {} });
    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute(
            `SELECT student_id, section_id FROM students WHERE student_id IN (${studentIds.map(() => '?').join(',')})`,
            studentIds
        );
        const grades = {};
        for (const s of students) {
            grades[s.student_id] = await computeStudentGrade(connection, s.student_id, s.section_id);
        }
        await connection.release();
        res.json({ grades });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to compute grade summaries' });
    }
});

// GET /admin/payroll/runs — all payroll runs for admin dashboard
router.get('/admin/payroll/runs', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [runs] = await connection.execute(`
            SELECT pr.*, COUNT(sp.id) AS stub_count,
                   COALESCE(SUM(sp.gross_pay), 0) AS total_gross,
                   COALESCE(SUM(sp.net_pay), 0)   AS total_net
            FROM payroll_runs pr
            LEFT JOIN student_paystubs sp ON pr.id = sp.payroll_run_id
            GROUP BY pr.id
            ORDER BY pr.period_end DESC
        `);
        await connection.release();
        res.json({ runs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch payroll runs' });
    }
});

// GET /admin/payroll/run-detail/:id — all paystubs in a specific run
router.get('/admin/payroll/run-detail/:id', async (req, res) => {
    const runId = Number(req.params.id);
    try {
        const connection = await getDbConnection();
        // Was missing the payroll_runs join entirely -- period_start/end/
        // pay_date/run_by never actually came back, so every printed stub's
        // "Pay Period" and "Pay Date" silently rendered blank.
        const [rows] = await connection.execute(`
            SELECT sp.*, s.first_name, s.last_name, s.section_id,
                   pr.period_start, pr.period_end, pr.pay_date, pr.run_by, pr.run_at
            FROM student_paystubs sp
            JOIN students s ON sp.student_id = s.student_id
            JOIN payroll_runs pr ON sp.payroll_run_id = pr.id
            WHERE sp.payroll_run_id = ?
            ORDER BY s.last_name, s.first_name
        `, [runId]);
        await connection.release();
        res.json({ stubs: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch run detail' });
    }
});

// GET /admin/payroll/preview — dry run: same math as /admin/payroll/run,
// nothing written. Lets the teacher sanity-check hours/gross before issuing.
router.get('/admin/payroll/preview', async (req, res) => {
    const { period_start, period_end } = req.query;
    const course_ids = req.query.course_ids ? String(req.query.course_ids).split(',').filter(Boolean) : [];
    if (!period_start || !period_end) return res.status(400).json({ error: 'period_start and period_end required' });
    try {
        const connection = await getDbConnection();
        const rows = await computePayrollForPeriod(connection, { period_start, period_end, course_ids });
        await connection.release();
        res.json({ rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to compute preview' });
    }
});

// POST /admin/payroll/run — run payroll for a pay period
router.post('/admin/payroll/run', async (req, res) => {
    const { period_start, period_end, run_by, notes, course_ids } = req.body;
    if (!period_start || !period_end) return res.status(400).json({ error: 'period_start and period_end required' });

    try {
        const connection = await getDbConnection();

        // Create or update payroll run record. pay_date is recomputed on
        // every run (including a re-run of the same period) since it's
        // tied to when payroll actually gets processed, not the period
        // itself -- a re-run today should show today's next payday, not
        // the one from whenever it was first run.
        const payDate = computeNextPayDate(getLocalDateStr());
        await connection.execute(
            `INSERT INTO payroll_runs (period_start, period_end, pay_date, run_by, notes, is_finalized)
             VALUES (?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE pay_date = VALUES(pay_date), run_by = VALUES(run_by), notes = VALUES(notes),
               is_finalized = 1, run_at = CURRENT_TIMESTAMP`,
            [period_start, period_end, payDate, (run_by || 'teacher').substring(0, 100), notes || null]
        );
        const [[runRow]] = await connection.execute(
            'SELECT id FROM payroll_runs WHERE period_start = ? AND period_end = ?',
            [period_start, period_end]
        );
        const runId = runRow.id;

        // Release this run's own prior claims (if re-running the same
        // period) so computePayrollForPeriod sees those hours as unpaid
        // again instead of finding nothing the second time.
        await connection.execute('UPDATE timesheets SET paid_run_id = NULL WHERE paid_run_id = ?', [runId]);

        const rows = await computePayrollForPeriod(connection, {
            period_start, period_end,
            course_ids: Array.isArray(course_ids) ? course_ids : []
        });

        // Re-running a period only ever inserted/updated rows for students
        // in the current result -- a student who no longer belongs (wrong
        // course scoping, now-excluded legacy section, etc.) kept their
        // stale stub from a prior run instead of being removed. Purge
        // anyone not in this run's fresh computation before inserting it.
        const keepIds = rows.map(s => s.student_id);
        if (keepIds.length > 0) {
            await connection.execute(
                `DELETE FROM student_paystubs WHERE payroll_run_id = ? AND student_id NOT IN (${keepIds.map(() => '?').join(',')})`,
                [runId, ...keepIds]
            );
        } else {
            await connection.execute('DELETE FROM student_paystubs WHERE payroll_run_id = ?', [runId]);
        }

        let generated = 0;
        for (const s of rows) {
            await connection.execute(`
                INSERT INTO student_paystubs
                  (payroll_run_id, student_id, role_title, hourly_rate, regular_hours,
                   bonus_count, bonus_rate, gross_pay, fed_tax, ss_tax, med_tax,
                   total_deductions, net_pay, ytd_gross, earnings_lines, tardy_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  role_title = VALUES(role_title), hourly_rate = VALUES(hourly_rate),
                  regular_hours = VALUES(regular_hours), bonus_count = VALUES(bonus_count),
                  gross_pay = VALUES(gross_pay), fed_tax = VALUES(fed_tax),
                  ss_tax = VALUES(ss_tax), med_tax = VALUES(med_tax),
                  total_deductions = VALUES(total_deductions), net_pay = VALUES(net_pay),
                  ytd_gross = VALUES(ytd_gross), earnings_lines = VALUES(earnings_lines),
                  tardy_count = VALUES(tardy_count), generated_at = CURRENT_TIMESTAMP
            `, [runId, s.student_id, s.role_title, s.hourly_rate, s.regular_hours.toFixed(4),
                s.bonus_count, ON_TIME_BONUS, s.gross_pay, s.fed_tax, s.ss_tax, s.med_tax,
                s.total_deductions, s.net_pay, s.ytd_gross, JSON.stringify(s.earnings_lines), s.tardy_count]);

            if (s.timesheet_ids.length > 0) {
                await connection.execute(
                    `UPDATE timesheets SET paid_run_id = ? WHERE id IN (${s.timesheet_ids.map(() => '?').join(',')})`,
                    [runId, ...s.timesheet_ids]
                );
            }
            generated++;
        }

        await connection.release();
        res.json({ success: true, payroll_run_id: runId, paystubs_generated: generated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to run payroll' });
    }
});

module.exports = router;
