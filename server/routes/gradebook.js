const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { resolveCourseId } = require('../helpers');

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

router.post('/submit-exam', async (req, res) => {
    const { student_id, exam_id, score, total_points, title, course_id } = req.body;
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
             FROM students ORDER BY last_name ASC, first_name ASC`
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

module.exports = router;
