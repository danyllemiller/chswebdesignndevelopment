const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getDbConnection } = require('../db');
const { resolveCourseId, clampScore } = require('../helpers');

// Same students.section_id -> uploads/<student_id>/ layout roster.js already
// creates on account setup (PHP's upload.php/manage_files.php write there).
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

router.get('/student/section-classmates', async (req, res) => {
    const { section_id, exclude_student_id } = req.query;
    if (!section_id) return res.status(400).json({ error: 'section_id is required' });
    try {
        const connection = await getDbConnection();
        // An "AS-<section>" aide section (e.g. AS-B2) sits alongside the
        // section it aides -- those aides can also peer-grade that section's
        // students, so pull both rosters instead of just the aide's own.
        const sections = section_id.startsWith('AS-') ? [section_id, section_id.slice(3)] : [section_id];
        const placeholders = sections.map(() => '?').join(', ');
        const [rows] = await connection.execute(
            `SELECT student_id, first_name, last_name FROM students
             WHERE section_id IN (${placeholders}) AND (archived IS NULL OR archived = 0) AND student_id != ?
             ORDER BY last_name ASC, first_name ASC`,
            [...sections, exclude_student_id || '']
        );
        await connection.release();
        res.json(rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch classmates' }); }
});

// Shared by the manual (self/peer) evaluation route and the auto-grader --
// both need the exact same insert-then-recompute-aggregate-then-writeback
// behavior, so it only lives in one place.
async function saveEvaluationAndAggregate(connection, { chapter_project_id, exam_id, student_id, evaluator_student_id, evaluator_type, score, max_score, rubric_json, feedback }) {
    const normalizedScore = clampScore(score, Number(max_score || 100));
    const normalizedMax = Number(max_score || 100);
    const rubricStr = rubric_json ? JSON.stringify(rubric_json) : null;

    // evaluator_student_id is part of the unique key as '' (not NULL --
    // MySQL treats every NULL as distinct, which would let duplicate
    // self/auto rows pile up instead of updating in place) so each peer
    // reviewer gets their own row for the same student's project, while a
    // reviewer -- or self/auto -- resubmitting updates their existing row.
    await connection.execute(
        `INSERT INTO project_evaluations
         (chapter_project_id, exam_id, student_id, evaluator_student_id, evaluator_type, score, max_score, rubric_json, feedback)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE score = VALUES(score), max_score = VALUES(max_score),
           rubric_json = VALUES(rubric_json), feedback = VALUES(feedback), updated_at = CURRENT_TIMESTAMP`,
        [chapter_project_id, exam_id, student_id, evaluator_student_id || '', evaluator_type, normalizedScore, normalizedMax, rubricStr, feedback || null]
    );

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

    return { self_score: selfScore, peer_score: peerScore, auto_score: autoScore, aggregate_score: aggregate, status };
}

// Recursively collects readable-as-text source files (HTML/JS/CSS) from a
// student's upload folder for a static code-pattern check. Caps both file
// count and total bytes read so a student who uploads something huge or
// unexpected (a video, a zipped folder, etc.) can't make this scan hang or
// blow up memory -- it's a best-effort heuristic, not a build step.
function collectSourceFiles(dir, depth = 0) {
    const results = [];
    if (depth > 4 || results.length > 200) return results;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return results; }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectSourceFiles(full, depth + 1));
        } else if (/\.(js|html|htm|css)$/i.test(entry.name)) {
            results.push(full);
        }
        if (results.length > 200) break;
    }
    return results;
}

function readCombinedSource(studentId) {
    const dir = path.join(UPLOADS_ROOT, String(studentId));
    const files = collectSourceFiles(dir);
    let combined = '';
    let bytesRead = 0;
    const MAX_BYTES = 2_000_000; // 2MB combined cap
    for (const file of files) {
        if (bytesRead >= MAX_BYTES) break;
        try {
            const content = fs.readFileSync(file, 'utf8');
            combined += '\n' + content;
            bytesRead += content.length;
        } catch (e) { /* unreadable file (binary, permissions) -- skip it */ }
    }
    return { combined, fileCount: files.length };
}

// Ch9 "Profile App Assembly" auto-grade criteria -- static presence checks
// against the student's own uploaded source, mirroring the 5 rubric
// criteria used for self/peer review. This is a heuristic (does the
// required pattern appear at all?), not real execution -- feedback spells
// out exactly what was and wasn't found so it's never a black box.
// level4_challenge is a stretch goal beyond the assignment's core 3-step
// requirement (assemble, logic, QA), not something every student needs to
// attempt to fully meet the standard -- it's scored separately as bonus
// points on top of the core score, not as a 5th equal-weight criterion,
// so skipping it can't cap a student who nailed the actual requirements
// below 100%.
const CH9_AUTO_CRITERIA = [
    { key: 'event_listener', label: 'Event Listener Setup', checks: ['addEventListener', 'click'] },
    { key: 'prevent_default_inputs', label: 'Prevent Default & Input Capture', checks: ['preventDefault', '.value'] },
    { key: 'render_output', label: 'renderProfile Function & Output', checks: ['renderProfile', 'innerText'] },
    { key: 'qa_case', label: 'QA: Case-Insensitive Logic', checks: ['toLowerCase'] }
];
const CH9_BONUS_CRITERION = { key: 'level4_challenge', label: 'Level 4.0 Challenge: Dynamic Elements (Bonus)', checks: ['createElement', 'appendChild'] };
const BONUS_MAX_POINTS = 10;

router.post('/student/project-auto-grade', async (req, res) => {
    const { chapter_project_id, exam_id, student_id } = req.body;
    if (!chapter_project_id || !exam_id || !student_id)
        return res.status(400).json({ error: 'chapter_project_id, exam_id, student_id required' });
    try {
        const { combined, fileCount } = readCombinedSource(student_id);
        if (fileCount === 0) {
            return res.status(404).json({ error: 'No uploaded files found for this student yet -- submit your project before running the auto-grade check.' });
        }

        const rubric = CH9_AUTO_CRITERIA.map(c => {
            const found = c.checks.filter(pattern => combined.includes(pattern));
            const pct = found.length / c.checks.length; // 0, 0.5, or 1
            return { key: c.key, label: c.label, checksLookedFor: c.checks, checksFound: found, score4: Math.round(pct * 4), bonus: false };
        });
        const bonusFound = CH9_BONUS_CRITERION.checks.filter(pattern => combined.includes(pattern));
        const bonusEntry = {
            key: CH9_BONUS_CRITERION.key, label: CH9_BONUS_CRITERION.label,
            checksLookedFor: CH9_BONUS_CRITERION.checks, checksFound: bonusFound, bonus: true,
            bonusPoints: Math.round((bonusFound.length / CH9_BONUS_CRITERION.checks.length) * BONUS_MAX_POINTS)
        };
        rubric.push(bonusEntry);

        const baseScore = Math.round((rubric.filter(c => !c.bonus).reduce((sum, c) => sum + c.score4, 0) / (CH9_AUTO_CRITERIA.length * 4)) * 100);
        const scoreOutOf100 = Math.min(100, baseScore + bonusEntry.bonusPoints);
        const feedback = [
            ...rubric.filter(c => !c.bonus).map(c => `${c.label}: ${c.checksFound.length}/${c.checksLookedFor.length} expected pattern(s) found (${c.checksFound.join(', ') || 'none'})`),
            `${bonusEntry.label}: ${bonusEntry.checksFound.length}/${bonusEntry.checksLookedFor.length} found, +${bonusEntry.bonusPoints} bonus pts`
        ].join(' | ');

        const connection = await getDbConnection();
        const result = await saveEvaluationAndAggregate(connection, {
            chapter_project_id, exam_id, student_id, evaluator_student_id: null, evaluator_type: 'auto',
            score: scoreOutOf100, max_score: 100, rubric_json: rubric, feedback
        });
        await connection.release();
        res.json({ success: true, rubric, score: scoreOutOf100, aggregate: result });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to run auto-grade check' }); }
});

router.get('/student/assignments-visible', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute(
            'SELECT student_id, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        if (students.length === 0) { await connection.release(); return res.status(404).json({ error: 'Student not found' }); }
        const courseCode = await resolveCourseId(connection, students[0].section_id);
        if (!courseCode) { await connection.release(); return res.status(400).json({ error: 'Unable to resolve course for student section' }); }
        const [assignments] = await connection.execute(
            'SELECT exam_id, title, total_points, course_id FROM exams WHERE course_id = ? ORDER BY title ASC, exam_id ASC',
            [courseCode]
        );
        await connection.release();
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
        await connection.release();
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
        await connection.release();
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
        await connection.release();
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
        const result = await saveEvaluationAndAggregate(connection, { chapter_project_id, exam_id, student_id, evaluator_student_id, evaluator_type, score, max_score, rubric_json, feedback });
        await connection.release();
        res.json({ success: true, aggregate: result });
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
            `SELECT pe.id, pe.evaluator_type, pe.evaluator_student_id, s.first_name AS evaluator_first_name,
                    s.last_name AS evaluator_last_name, pe.score, pe.max_score, pe.feedback, pe.created_at, pe.updated_at
             FROM project_evaluations pe
             LEFT JOIN students s ON s.student_id = pe.evaluator_student_id
             WHERE pe.chapter_project_id = ? AND pe.exam_id = ? AND pe.student_id = ?
             ORDER BY pe.created_at DESC`,
            [chapter_project_id, exam_id, student_id]
        );
        await connection.release();
        res.json({ aggregate: aggregateRows[0] || null, evaluations: evalRows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch project aggregate' }); }
});

module.exports = router;
