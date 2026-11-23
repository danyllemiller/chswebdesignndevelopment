// server/routes/needsGrading.js
// GET /admin/needs-grading -- everything turned in that has no real grade
// yet (teacher 2026-11-23), for admin/needs-grading.html:
//   1. pending: CS unit projects and WD chapter projects under the upload +
//      peer review gate (server/lib/csProjectGate.js) that a student has
//      started but that have no gradebook score. Each row says what's
//      missing (file, self-assessment, peer review). A grade typed into
//      the gradebook by hand always stays, so the teacher can also just
//      grade it.
//   2. placeholder: other turn-ins (a Guided Notebook upload labeled
//      project, capstone, or exam) that write a 0 placeholder until the
//      teacher grades them. Tests and quizzes are left out: their 0 is real.
// Only current (not archived) students. /admin/ routes are staff-only (api.js).
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { GATED_PROJECT_SQL } = require('../lib/csProjectGate');

const TEST_LIKE_SQL = '(Exam|Test|Quiz|Pre-?Assess|Pre-?Test|Pre-?Scale|Post-?Scale|Final|Sprint|WPR|Clock)';

router.get('/admin/needs-grading', async (req, res) => {
    try {
        const data = await withConnection(async (c) => {
            const [pending] = await c.execute(
                `SELECT p.student_id, p.exam_id, s.first_name, s.last_name, s.section_id,
                        (SELECT TRIM(title) FROM exams WHERE exam_id = p.exam_id ORDER BY title LIMIT 1) AS title,
                        (SELECT MAX(total_points) FROM exams WHERE exam_id = p.exam_id) AS total_points,
                        (SELECT MIN(ea.timestamp) FROM exam_attempts ea WHERE ea.student_id = p.student_id AND ea.exam_id = p.exam_id) AS uploaded_at,
                        (SELECT MAX(pe.updated_at) FROM project_evaluations pe WHERE pe.student_id = p.student_id AND pe.exam_id = p.exam_id) AS last_review_at,
                        EXISTS (SELECT 1 FROM project_evaluations pe WHERE pe.student_id = p.student_id AND pe.exam_id = p.exam_id AND pe.evaluator_type = 'self') AS has_self,
                        EXISTS (SELECT 1 FROM project_grade_aggregates g WHERE g.student_id = p.student_id AND g.exam_id = p.exam_id AND g.peer_score IS NOT NULL) AS has_peer,
                        (SELECT g.self_score FROM project_grade_aggregates g WHERE g.student_id = p.student_id AND g.exam_id = p.exam_id ORDER BY g.id DESC LIMIT 1) AS self_score,
                        (SELECT g.max_score FROM project_grade_aggregates g WHERE g.student_id = p.student_id AND g.exam_id = p.exam_id ORDER BY g.id DESC LIMIT 1) AS max_score
                 FROM (
                     SELECT student_id, exam_id FROM exam_attempts WHERE exam_id REGEXP ?
                     UNION SELECT student_id, exam_id FROM project_grade_aggregates WHERE exam_id REGEXP ?
                 ) p
                 JOIN students s ON s.student_id = p.student_id AND (s.archived IS NULL OR s.archived = 0)
                 LEFT JOIN responses r ON r.student_id = p.student_id AND r.exam_id = p.exam_id
                 WHERE r.id IS NULL`,
                [GATED_PROJECT_SQL, GATED_PROJECT_SQL]);

            const [placeholder] = await c.execute(
                `SELECT r.student_id, r.exam_id, r.timestamp AS turned_in_at, s.first_name, s.last_name, s.section_id,
                        (SELECT TRIM(title) FROM exams WHERE exam_id = r.exam_id ORDER BY title LIMIT 1) AS title,
                        COALESCE(r.total_points, (SELECT MAX(total_points) FROM exams WHERE exam_id = r.exam_id)) AS total_points
                 FROM responses r
                 JOIN students s ON s.student_id = r.student_id AND (s.archived IS NULL OR s.archived = 0)
                 WHERE CAST(r.score AS DECIMAL(10,2)) = 0 AND TRIM(r.score) <> ''
                   AND r.exam_id NOT REGEXP ? AND r.exam_id NOT REGEXP ?
                   AND EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.student_id = r.student_id AND ea.exam_id = r.exam_id AND CAST(ea.score AS DECIMAL(10,2)) = 0)`,
                [GATED_PROJECT_SQL, TEST_LIKE_SQL]);
            return { pending, placeholder };
        });

        const name = (r) => `${r.last_name || ''}${r.first_name ? ', ' + r.first_name : ''}`.trim() || r.student_id;
        const items = [
            ...data.pending.map(r => {
                const missing = [];
                if (!r.uploaded_at) missing.push('file');
                if (!r.has_self) missing.push('self-assessment');
                if (!r.has_peer) missing.push('peer review');
                return {
                    kind: 'pending', student_id: r.student_id, name: name(r), period: r.section_id || '',
                    exam_id: r.exam_id, title: r.title || r.exam_id, total_points: r.total_points,
                    since: r.uploaded_at || r.last_review_at, missing,
                    self_score: r.self_score, max_score: r.max_score,
                };
            }),
            ...data.placeholder.map(r => ({
                kind: 'placeholder', student_id: r.student_id, name: name(r), period: r.section_id || '',
                exam_id: r.exam_id, title: r.title || r.exam_id, total_points: r.total_points,
                since: r.turned_in_at, missing: [],
            })),
        ].sort((a, b) => String(a.period).localeCompare(String(b.period)) || new Date(a.since || 0) - new Date(b.since || 0));
        res.json({ items });
    } catch (e) {
        console.error('[needs-grading]', e);
        res.status(500).json({ error: 'Could not load the needs-grading list.' });
    }
});

module.exports = router;
