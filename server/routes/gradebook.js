const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { resolveCourseId, getCurrentSchoolYear } = require('../helpers');

// mysql2 returns DATE columns as JS Date objects (local-timezone fields set to
// match the stored date exactly), not strings. Reading those fields directly
// avoids the UTC-conversion day-shift .toISOString() can introduce.
function formatDbDate(d) {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0].split(' ')[0];
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

router.get('/student/course-gradebook', async (req, res) => {
    const { student_id, section_id: sectionOverride } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute(
            'SELECT student_id, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        if (students.length === 0) {
            await connection.release();
            return res.status(404).json({ error: 'Student not found' });
        }
        // Lets a student pull their grades scoped to an additional (non-primary)
        // section they're also enrolled in — e.g. a CS-primary student who's
        // also in WD1 viewing their WD1-weighted grades specifically.
        const sectionId = (sectionOverride && String(sectionOverride).trim()) || students[0].section_id || '';
        const courseCode = await resolveCourseId(connection, sectionId);
        if (!courseCode) {
            await connection.release();
            return res.status(400).json({ error: 'Unable to resolve course for student section' });
        }
        const [rows] = await connection.execute(
            `SELECT e.exam_id, TRIM(e.title) AS title, e.total_points, e.course_id,
                    e.due_date, e.instructions, e.period_due_dates,
                    r.score, r.timestamp
             FROM exams e
             LEFT JOIN responses r ON e.exam_id = r.exam_id AND r.student_id = ?
             WHERE e.course_id = ?
             ORDER BY e.title ASC, e.exam_id ASC`,
            [student_id, courseCode]
        );
        rows.forEach(r => { r.due_date = formatDbDate(r.due_date); });
        await connection.release();
        res.json({ student_id, section_id: sectionId, course_id: courseCode, assignments: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch student course gradebook.' }); }
});

// Units 1-7 are the real sequential CS curriculum (CS_MAP in
// admin/due-dates.html); Unit 0 is a standalone intro with no prerequisite
// and Unit 8 is an orphaned, unlinked page, so neither is gated here.
async function checkUnitPrerequisite(connection, studentId, examId) {
    const m = /^Unit(\d+)-Exam$/i.exec(examId || '');
    if (!m) return { ok: true };
    const unitNum = parseInt(m[1], 10);
    if (unitNum < 2 || unitNum > 7) return { ok: true };

    const prevExamId = `Unit${unitNum - 1}-Exam`;
    const [rows] = await connection.execute(
        'SELECT score, total_points FROM responses WHERE student_id = ? AND exam_id = ?',
        [studentId, prevExamId]
    );
    if (rows.length === 0) return { ok: false, prevExamId };
    const pct = Number(rows[0].total_points) > 0 ? (Number(rows[0].score) / Number(rows[0].total_points)) * 100 : 0;
    return { ok: pct >= 60, prevExamId, pct };
}

// Matches unit-test/exam and pre-test exam_ids specifically (CS: "Unit3-Exam",
// "Unit3-Pre", "Unit3-Pre-Score"; WD: "Ch5-Exam", "Ch5 Pre-Assessment [15
// pts]", "...-Score") -- deliberately narrow so regular assignments,
// projects, timeclock grading, etc. (which never match this) keep working
// even while this is on.
const TEST_EXAM_ID_PATTERN = /-Exam$|-Pre$|-Pre-Score$|Pre-Assessment/i;

router.post('/submit-exam', async (req, res) => {
    const { student_id, exam_id, score, total_points, title, course_id } = req.body;

    // Env-var gated so this can be flipped on/off per-server (e.g. only on
    // the droplet while it's standing in during a home-server outage)
    // without a code change or redeploy -- see OUTAGE-RUNBOOK.md.
    if (process.env.BLOCK_EXAM_SUBMISSIONS === 'true' && TEST_EXAM_ID_PATTERN.test(exam_id || '')) {
        return res.status(503).json({
            error: 'Unit tests and pre-tests are temporarily paused while the class database is being kept in sync. Please wait for your teacher to say it\'s okay to test, then try again.',
            testingPaused: true
        });
    }

    try {
        const connection = await getDbConnection();

        const prereq = await checkUnitPrerequisite(connection, student_id, exam_id);
        if (!prereq.ok) {
            await connection.release();
            return res.status(403).json({
                error: `${exam_id} is locked — a score of at least 60% on ${prereq.prevExamId} is required first.`
            });
        }

        const examTitle = title || exam_id.replace(/-/g, ' ').replace(/cs unit \d+/i, (m) => m.toUpperCase());
        const examCourse = course_id || '10003GS';
        await connection.execute(
            'INSERT INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = COALESCE(VALUES(title), title), total_points = COALESCE(VALUES(total_points), total_points)',
            [exam_id, examTitle, total_points || 100, examCourse]
        );
        // Log every submission as its own attempt, in addition to the
        // keep-highest "current best" logic below — responses only ever
        // keeps one row per (student, exam_id), so this is the only place
        // attempt-by-attempt history (1st vs 2nd vs 3rd attempt) survives.
        const [attemptCountRows] = await connection.execute(
            'SELECT COUNT(*) AS n FROM exam_attempts WHERE student_id = ? AND exam_id = ?',
            [student_id, exam_id]
        );
        await connection.execute(
            'INSERT INTO exam_attempts (student_id, exam_id, attempt_number, score, total_points, timestamp) VALUES (?, ?, ?, ?, ?, NOW())',
            [student_id, exam_id, attemptCountRows[0].n + 1, score, total_points || 100]
        );

        const [existingRows] = await connection.execute(
            'SELECT score FROM responses WHERE student_id = ? AND exam_id = ?',
            [student_id, exam_id]
        );
        let shouldUpdate = true;
        if (existingRows.length > 0) {
            const existingScore = Number(existingRows[0].score) || 0;
            const newScore = Number(score) || 0;
            if (newScore <= existingScore) {
                shouldUpdate = false;
                console.log('[submit-exam] Keeping higher existing score:', existingScore, 'vs new:', newScore);
            }
        }
        if (shouldUpdate) {
            await connection.execute(
                'INSERT INTO responses (student_id, exam_id, score, total_points, timestamp) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()',
                [student_id, exam_id, score, total_points || 100]
            );
        }
        await connection.release();
        res.json({ success: true, keptHigher: !shouldUpdate });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save exam' }); }
});

router.get('/student/grades', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT r.exam_id, r.score, r.timestamp, TRIM(e.title) AS title, e.total_points
             FROM responses r
             LEFT JOIN exams e ON r.exam_id = e.exam_id
             WHERE r.student_id = ?`,
            [student_id]
        );
        await connection.release();
        res.json({ responses: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch grades.' }); }
});

router.post('/admin/clear-all-assignments', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM responses');
        await connection.execute('DELETE FROM exams');
        await connection.release();
        res.json({ success: true, message: 'All assignments and grades cleared.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to clear assignments.' }); }
});

router.post('/admin/save-assignment', async (req, res) => {
    const { exam_id, title, total_points, course_id } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), total_points=VALUES(total_points), course_id=VALUES(course_id)',
            [exam_id, title, total_points, course_id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save assignment' }); }
});

router.post('/admin/edit-assignment', async (req, res) => {
    const { old_exam_id, exam_id, title, total_points, course_id } = req.body;
    if (!old_exam_id || !exam_id) return res.status(400).json({ error: 'old_exam_id and exam_id are required' });
    try {
        const connection = await getDbConnection();
        if (old_exam_id !== exam_id) {
            await connection.execute('UPDATE responses SET exam_id = ? WHERE exam_id = ?', [exam_id, old_exam_id]);
            await connection.execute('UPDATE exams SET exam_id = ?, title = ?, total_points = ?, course_id = ? WHERE exam_id = ?',
                [exam_id, title, total_points, course_id, old_exam_id]);
        } else {
            await connection.execute('UPDATE exams SET title = ?, total_points = ?, course_id = ? WHERE exam_id = ?',
                [title, total_points, course_id, exam_id]);
        }
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to edit assignment' }); }
});

router.post('/admin/delete-assignment', async (req, res) => {
    const { exam_id } = req.body;
    if (!exam_id || !String(exam_id).trim()) return res.status(400).json({ error: 'exam_id is required' });
    try {
        const connection = await getDbConnection();
        const examKey = String(exam_id).trim();
        await connection.execute('DELETE FROM exams WHERE exam_id = ?', [examKey]);
        await connection.execute('DELETE FROM responses WHERE exam_id = ?', [examKey]);
        await connection.release();
        res.json({ success: true, exam_id: examKey });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete assignment' }); }
});

router.get('/admin/master-gradebook-data', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute(
            `SELECT student_id, first_name, last_name, username, section_id
             FROM students
             WHERE (archived IS NULL OR archived = 0) AND school_year = ?
             ORDER BY last_name ASC, first_name ASC`,
            [getCurrentSchoolYear()]
        );

        // Attach each student's additional (non-primary) sections — e.g. a
        // student whose primary period is CS but who's also enrolled in
        // Intervention or a second real class — so the gradebook can show
        // and correctly weight them under each course they're actually in,
        // not just their primary one.
        const [extra] = await connection.execute(`
            SELECT sas.student_id, sas.section_id, COALESCE(c.course_name, '') AS course_name
            FROM student_additional_sections sas
            LEFT JOIN class_sections cs ON sas.section_id = cs.section_id
            LEFT JOIN courses c ON cs.course_id = c.course_id
        `);
        const extraByStudent = {};
        extra.forEach(r => {
            if (!extraByStudent[r.student_id]) extraByStudent[r.student_id] = [];
            extraByStudent[r.student_id].push({ section_id: r.section_id, course_name: r.course_name });
        });
        students.forEach(s => { s.additional_sections = extraByStudent[s.student_id] || []; });

        const [exams] = await connection.execute(
            `SELECT exam_id, TRIM(title) AS title, total_points, course_id, due_date, instructions, period_due_dates FROM exams`
        );
        const [grades] = await connection.execute(
            `SELECT student_id, exam_id, score, total_points, timestamp FROM responses`
        );
        const registry = {};
        exams.forEach(e => {
            let periodDueDates = {};
            if (e.period_due_dates) {
                try {
                    periodDueDates = typeof e.period_due_dates === 'string'
                        ? JSON.parse(e.period_due_dates) : e.period_due_dates;
                } catch (_) { periodDueDates = {}; }
            }
            registry[e.exam_id] = {
                title: e.title, maxPoints: e.total_points,
                dueDate: formatDbDate(e.due_date), instructions: e.instructions || '',
                targetCourse: e.course_id || 'All', periodDueDates
            };
        });
        await connection.release();
        res.json({ students, assignments: registry, grades });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch gradebook' }); }
});

router.post('/admin/save-grade', async (req, res) => {
    const { student_id, exam_id, score, total_points } = req.body;
    if (!student_id || !exam_id) return res.status(400).json({ error: 'student_id and exam_id are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT IGNORE INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?)',
            [exam_id, exam_id, Number(total_points) || 100, 'All']
        );
        await connection.execute(
            `INSERT INTO responses (student_id, exam_id, score, total_points, timestamp)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()`,
            [student_id, exam_id, score !== undefined ? String(score) : '', Number(total_points) || 100]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save grade' }); }
});

router.post('/admin/batch-update-grades', async (req, res) => {
    const { batch } = req.body;
    if (!Array.isArray(batch) || batch.length === 0) {
        return res.status(400).json({ error: 'batch array is required' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        await connection.beginTransaction();
        let saved = 0;
        for (const entry of batch) {
            const studentId = String(entry.studentId || '').trim();
            const updates = entry.updates || {};
            if (!studentId) continue;
            for (const [examId, gradeData] of Object.entries(updates)) {
                const score = gradeData.score !== undefined ? String(gradeData.score) : '';
                const maxPts = Number(gradeData.max) || 100;
                await connection.execute(
                    'INSERT IGNORE INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?)',
                    [examId, examId, maxPts, 'All']
                );
                await connection.execute(
                    `INSERT INTO responses (student_id, exam_id, score, total_points, timestamp)
                     VALUES (?, ?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()`,
                    [studentId, examId, score, maxPts]
                );
                saved++;
            }
        }
        await connection.commit();
        await connection.release();
        res.json({ result: 'success', saved });
    } catch (err) {
        if (connection) { try { await connection.rollback(); await connection.release(); } catch (_) {} }
        console.error(err);
        res.status(500).json({ error: 'Failed to batch update grades' });
    }
});

// ========================================================
// PRE-TEST / EXAM ATTEMPT ANALYTICS
// ========================================================
const ATTEMPT_ANALYTICS_CONFIG = {
    CS: {
        courseId: '10003GS',
        chapters: [1, 2, 3, 4, 5, 6, 7],
        label: (n) => `Unit ${n}`,
        preExamId: (n) => `Unit${n}-Pre-Score`,
        examExamId: (n) => `Unit${n}-Exam`,
        periods: ['A3', 'A5', 'B4', 'B6', 'B8']
    },
    WD1: {
        courseId: '05254G1S',
        chapters: [1, 2, 3, 4, 5, 6, 7, 8],
        label: (n) => `Chapter ${n}`,
        preExamId: (n) => `Ch${n} Pre-Assessment [15 pts]-Score`,
        examExamId: (n) => `Ch${n}-Exam`,
        periods: ['A1']
    },
    WD2: {
        courseId: '05254G2S',
        chapters: [9, 10, 11, 12, 13, 14, 15, 16],
        label: (n) => `Chapter ${n}`,
        preExamId: (n) => `Ch${n} Pre-Assessment [15 pts]-Score`,
        examExamId: (n) => `Ch${n}-Exam`,
        periods: ['B2']
    }
};

function summarizeAttempts(rows) {
    const pcts = rows.filter(r => Number(r.total_points) > 0).map(r => (Number(r.score) / Number(r.total_points)) * 100);
    if (pcts.length === 0) return { count: 0, avgPercent: null, masteryPercent: null };
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const masteryCount = pcts.filter(p => p >= 80).length;
    return {
        count: pcts.length,
        avgPercent: Math.round(avg * 10) / 10,
        masteryPercent: Math.round((masteryCount / pcts.length) * 1000) / 10
    };
}

router.get('/admin/attempt-analytics', async (req, res) => {
    const courseKey = String(req.query.course || '').toUpperCase();
    const config = ATTEMPT_ANALYTICS_CONFIG[courseKey];
    if (!config) return res.status(400).json({ error: 'course must be CS, WD1, or WD2' });

    try {
        const connection = await getDbConnection();

        // Active, current-year students in this course, with their period --
        // every row below is scoped to only these students, "All Periods"
        // included, so stray/other-course/other-year data never leaks in.
        const [students] = await connection.execute(
            `SELECT student_id, section_id FROM students
             WHERE (archived IS NULL OR archived = 0) AND school_year = ? AND section_id IN (${config.periods.map(() => '?').join(',')})`,
            [getCurrentSchoolYear(), ...config.periods]
        );
        const periodByStudent = {};
        students.forEach(s => { periodByStudent[s.student_id] = s.section_id; });
        const showAllRow = config.periods.length > 1;

        const units = [];
        for (const n of config.chapters) {
            const preExamId = config.preExamId(n);
            const examExamId = config.examExamId(n);

            const [preAttemptRows] = await connection.execute(
                'SELECT student_id, attempt_number, score, total_points FROM exam_attempts WHERE exam_id = ?',
                [preExamId]
            );
            const [preResponseRows] = await connection.execute(
                'SELECT student_id, score, total_points FROM responses WHERE exam_id = ?',
                [preExamId]
            );
            const [examAttemptRows] = await connection.execute(
                'SELECT student_id, attempt_number, score, total_points FROM exam_attempts WHERE exam_id = ?',
                [examExamId]
            );
            const [examResponseRows] = await connection.execute(
                'SELECT student_id, score, total_points FROM responses WHERE exam_id = ?',
                [examExamId]
            );

            // Pretest attempt 1: use the logged attempt when one exists;
            // otherwise backfill from the student's current gradebook score
            // (everything taken before attempt logging went live has no
            // logged attempt at all, so this is the only data available).
            const preAttempt1 = {};
            preAttemptRows.filter(r => r.attempt_number === 1).forEach(r => { preAttempt1[r.student_id] = r; });
            preResponseRows.forEach(r => { if (!preAttempt1[r.student_id]) preAttempt1[r.student_id] = r; });

            // Cumulative, not siloed: only students who scored low enough to
            // need a retake show up in a raw "2nd attempt" bucket, so
            // comparing that group's average against everyone's 1st-attempt
            // average makes retaking look like it hurts, when it's really
            // just measuring a different (weaker) subgroup. Instead, track
            // each student's BEST score so far through attempt 1, through
            // attempt 2, and through attempt 3+ -- the same population every
            // time, carried forward when they didn't retake, so the number
            // can only hold steady or improve as more attempts are allowed.
            const attemptsByStudent = {};
            examAttemptRows.forEach(r => {
                if (!attemptsByStudent[r.student_id]) attemptsByStudent[r.student_id] = [];
                attemptsByStudent[r.student_id].push(r);
            });
            examResponseRows.forEach(r => {
                if (!attemptsByStudent[r.student_id]) attemptsByStudent[r.student_id] = [{ attempt_number: 1, score: r.score, total_points: r.total_points }];
            });

            const cumulativeByStudent = {};
            Object.entries(attemptsByStudent).forEach(([sid, attempts]) => {
                let through1 = null, through2 = null, through3 = null;
                attempts.forEach(a => {
                    if (!(Number(a.total_points) > 0)) return;
                    const p = (Number(a.score) / Number(a.total_points)) * 100;
                    if (a.attempt_number <= 1) through1 = through1 === null ? p : Math.max(through1, p);
                    if (a.attempt_number <= 2) through2 = through2 === null ? p : Math.max(through2, p);
                    through3 = through3 === null ? p : Math.max(through3, p);
                });
                if (through2 === null) through2 = through1;
                if (through3 === null) through3 = through2;
                cumulativeByStudent[sid] = { through1, through2, through3 };
            });

            function summarizeCumulative(vals) {
                const pcts = vals.filter(v => v !== null);
                if (pcts.length === 0) return { count: 0, avgPercent: null, masteryPercent: null };
                const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
                const masteryCount = pcts.filter(p => p >= 80).length;
                return {
                    count: pcts.length,
                    avgPercent: Math.round(avg * 10) / 10,
                    masteryPercent: Math.round((masteryCount / pcts.length) * 1000) / 10
                };
            }

            const periodsToShow = showAllRow ? [...config.periods, 'All'] : [...config.periods];
            const periodRows = periodsToShow.map(period => {
                const inScope = (studentId) => periodByStudent[studentId] !== undefined && (period === 'All' || periodByStudent[studentId] === period);

                const preRowsForPeriod = Object.entries(preAttempt1).filter(([sid]) => inScope(sid)).map(([, r]) => r);
                const pretest = summarizeAttempts(preRowsForPeriod);

                const relevantCumulative = Object.entries(cumulativeByStudent).filter(([sid]) => inScope(sid)).map(([, v]) => v);
                const examAttemptsForPeriod = {
                    '1': summarizeCumulative(relevantCumulative.map(v => v.through1)),
                    '2': summarizeCumulative(relevantCumulative.map(v => v.through2)),
                    '3+': summarizeCumulative(relevantCumulative.map(v => v.through3))
                };

                return { period, pretest: { count: pretest.count, avgPercent: pretest.avgPercent }, examAttempts: examAttemptsForPeriod };
            });

            units.push({ unit: n, label: config.label(n), periods: periodRows });
        }

        await connection.release();
        res.json({ course: courseKey, units });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to compute attempt analytics' }); }
});

module.exports = router;
