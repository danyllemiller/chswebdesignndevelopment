const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { resolveCourseId, clampScore } = require('../helpers');

router.get('/student/assignments-visible', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute(
            'SELECT student_id, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        if (students.length === 0) { await connection.end(); return res.status(404).json({ error: 'Student not found' }); }
        const courseCode = await resolveCourseId(connection, students[0].section_id);
        if (!courseCode) { await connection.end(); return res.status(400).json({ error: 'Unable to resolve course for student section' }); }
        const [assignments] = await connection.execute(
            'SELECT exam_id, title, total_points, course_id FROM exams WHERE course_id = ? ORDER BY title ASC, exam_id ASC',
            [courseCode]
        );
        await connection.end();
        res.json({ student_id, course_id: courseCode, assignments });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch visible assignments' }); }
});

router.post('/admin/project-spec', async (req, res) => {
    const {
        chapter_id, chapter_title, course_id, exam_id, project_title, project_spec_html,
        self_reflection_weight, peer_review_weight, auto_grade_weight, is_active
    } = req.body;
    if (!chapter_id || !course_id || !exam_id || !project_title)
        return res.status(400).json({ error: 'chapter_id, course_id, exam_id, and project_title are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            `INSERT INTO chapter_projects
             (chapter_id, chapter_title, course_id, exam_id, project_title, project_spec_html,
              self_reflection_weight, peer_review_weight, auto_grade_weight, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               chapter_title = VALUES(chapter_title), project_title = VALUES(project_title),
               project_spec_html = VALUES(project_spec_html),
               self_reflection_weight = VALUES(self_reflection_weight),
               peer_review_weight = VALUES(peer_review_weight),
               auto_grade_weight = VALUES(auto_grade_weight),
               is_active = VALUES(is_active)`,
            [
                chapter_id, chapter_title || chapter_id, course_id, exam_id, project_title,
                project_spec_html || '', Number(self_reflection_weight ?? 33.33),
                Number(peer_review_weight ?? 33.33), Number(auto_grade_weight ?? 33.34),
                Number(is_active ?? 1)
            ]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save project spec' }); }
});

router.get('/projects/specs', async (req, res) => {
    const { course_id } = req.query;
    if (!course_id) return res.status(400).json({ error: 'course_id is required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT id, chapter_id, chapter_title, course_id, exam_id, project_title, project_spec_html,
                    self_reflection_weight, peer_review_weight, auto_grade_weight, is_active, updated_at
             FROM chapter_projects
             WHERE course_id = ? AND is_active = 1
             ORDER BY chapter_id ASC`,
            [course_id]
        );
        await connection.end();
        res.json({ specs: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch project specs' }); }
});

router.post('/student/project-submission', async (req, res) => {
    const { student_id, chapter_project_id, exam_id, original_filename, stored_path, file_hash, submission_mode, overwrite_of_submission_id } = req.body;
    if (!student_id || !chapter_project_id || !exam_id || !original_filename || !stored_path)
        return res.status(400).json({ error: 'Missing required submission fields' });
    const mode = ['new', 'overwrite', 'new_version'].includes(submission_mode) ? submission_mode : 'new';
    try {
        const connection = await getDbConnection();
        const [versionRows] = await connection.execute(
            'SELECT COALESCE(MAX(version_no), 0) AS max_version FROM project_submissions WHERE student_id = ? AND chapter_project_id = ?',
            [student_id, chapter_project_id]
        );
        const nextVersion = Number(versionRows[0]?.max_version || 0) + 1;
        await connection.execute(
            `INSERT INTO project_submissions
             (student_id, chapter_project_id, exam_id, original_filename, stored_path, file_hash, submission_mode, version_no, overwrite_of_submission_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, chapter_project_id, exam_id, original_filename, stored_path, file_hash || null, mode, nextVersion, overwrite_of_submission_id || null]
        );
        await connection.end();
        res.json({ success: true, version_no: nextVersion });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save project submission metadata' }); }
});

router.post('/student/project-evaluation', async (req, res) => {
    const { chapter_project_id, exam_id, student_id, evaluator_student_id, evaluator_type, score, max_score, rubric_json, feedback } = req.body;
    if (!chapter_project_id || !exam_id || !student_id || !evaluator_type)
        return res.status(400).json({ error: 'chapter_project_id, exam_id, student_id, evaluator_type are required' });
    if (!['self', 'peer', 'auto'].includes(evaluator_type))
        return res.status(400).json({ error: 'evaluator_type must be one of self|peer|auto' });
    try {
        const connection = await getDbConnection();
        const normalizedScore = clampScore(score, Number(max_score || 100));
        const normalizedMax = Number(max_score || 100);
        const rubricStr = rubric_json ? JSON.stringify(rubric_json) : null;

        if (evaluator_type === 'peer') {
            await connection.execute(
                `INSERT INTO project_evaluations
                 (chapter_project_id, exam_id, student_id, evaluator_student_id, evaluator_type, score, max_score, rubric_json, feedback)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [chapter_project_id, exam_id, student_id, evaluator_student_id || null, evaluator_type, normalizedScore, normalizedMax, rubricStr, feedback || null]
            );
        } else {
            await connection.execute(
                `INSERT INTO project_evaluations
                 (chapter_project_id, exam_id, student_id, evaluator_student_id, evaluator_type, score, max_score, rubric_json, feedback)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE score = VALUES(score), max_score = VALUES(max_score),
                   rubric_json = VALUES(rubric_json), feedback = VALUES(feedback), updated_at = CURRENT_TIMESTAMP`,
                [chapter_project_id, exam_id, student_id, evaluator_student_id || null, evaluator_type, normalizedScore, normalizedMax, rubricStr, feedback || null]
            );
        }

        const [[selfRows], [autoRows], [peerRows]] = await Promise.all([
            connection.execute(`SELECT score, max_score FROM project_evaluations WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ? AND evaluator_type = 'self' ORDER BY id DESC LIMIT 1`, [chapter_project_id, exam_id, student_id]),
            connection.execute(`SELECT score, max_score FROM project_evaluations WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ? AND evaluator_type = 'auto' ORDER BY id DESC LIMIT 1`, [chapter_project_id, exam_id, student_id]),
            connection.execute(`SELECT AVG(score) AS avg_score, AVG(max_score) AS avg_max FROM project_evaluations WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ? AND evaluator_type = 'peer'`, [chapter_project_id, exam_id, student_id])
        ]);

        const selfScore = selfRows.length ? Number(selfRows[0].score) : null;
        const peerScore = peerRows.length && peerRows[0].avg_score !== null ? Number(peerRows[0].avg_score) : null;
        const autoScore = autoRows.length ? Number(autoRows[0].score) : null;
        const components = [selfScore, peerScore, autoScore].filter(v => v !== null);
        const aggregate = components.length ? Number((components.reduce((a, b) => a + b, 0) / components.length).toFixed(2)) : 0;
        const status = components.length === 3 ? 'complete' : 'partial';

        await connection.execute(
            `INSERT INTO project_grade_aggregates
             (chapter_project_id, exam_id, student_id, self_score, peer_score, auto_score, aggregate_score, max_score, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE self_score = VALUES(self_score), peer_score = VALUES(peer_score),
               auto_score = VALUES(auto_score), aggregate_score = VALUES(aggregate_score),
               max_score = VALUES(max_score), status = VALUES(status), computed_at = CURRENT_TIMESTAMP`,
            [chapter_project_id, exam_id, student_id, selfScore, peerScore, autoScore, aggregate, 100, status]
        );
        await connection.execute(
            `INSERT INTO responses (student_id, exam_id, score, total_points, timestamp) VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()`,
            [student_id, exam_id, aggregate, 100]
        );
        await connection.end();
        res.json({ success: true, aggregate: { self_score: selfScore, peer_score: peerScore, auto_score: autoScore, aggregate_score: aggregate, status } });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save evaluation/aggregate' }); }
});

router.get('/student/project-aggregate', async (req, res) => {
    const { chapter_project_id, exam_id, student_id } = req.query;
    if (!chapter_project_id || !exam_id || !student_id)
        return res.status(400).json({ error: 'chapter_project_id, exam_id, student_id required' });
    try {
        const connection = await getDbConnection();
        const [aggregateRows] = await connection.execute(
            'SELECT * FROM project_grade_aggregates WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ? LIMIT 1',
            [chapter_project_id, exam_id, student_id]
        );
        const [evalRows] = await connection.execute(
            `SELECT id, evaluator_type, evaluator_student_id, score, max_score, feedback, created_at, updated_at
             FROM project_evaluations WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ?
             ORDER BY created_at DESC`,
            [chapter_project_id, exam_id, student_id]
        );
        await connection.end();
        res.json({ aggregate: aggregateRows[0] || null, evaluations: evalRows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch project aggregate' }); }
});

module.exports = router;
