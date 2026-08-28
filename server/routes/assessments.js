const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { sanitizeNotebookHtml } = require('../sanitizeNotebookHtml');

const EXAM_PROGRESS_DDL = `CREATE TABLE IF NOT EXISTS exam_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    exam_id VARCHAR(200) NOT NULL,
    progress_json MEDIUMTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_progress (student_id, exam_id)
)`;

const RUBRICS_DDL = `CREATE TABLE IF NOT EXISTS rubrics (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    course VARCHAR(100),
    enable_self_grade TINYINT(1) DEFAULT 0,
    enable_peer_grade TINYINT(1) DEFAULT 0,
    criteria_json TEXT,
    total_points INT DEFAULT 0,
    last_updated BIGINT
)`;

const REVIEW_QUESTIONS_DDL = `CREATE TABLE IF NOT EXISTS review_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chapter VARCHAR(200),
    grade VARCHAR(100),
    cat VARCHAR(100),
    val INT,
    q TEXT NOT NULL,
    a VARCHAR(1000),
    d JSON,
    INDEX idx_chapter (chapter),
    INDEX idx_grade (grade)
)`;

// --- SELF-ASSESSMENTS ---
router.get('/student/self-assessments', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT * FROM self_assessments WHERE student_id = ?', [student_id]);
        await connection.release();
        res.json({ assessments: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch assessments' }); }
});

router.post('/student/save-self-assessment', async (req, res) => {
    const { student_id, chapter_id, level } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO self_assessments (student_id, chapter_id, level) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE level = VALUES(level)',
            [student_id, chapter_id, level]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save assessment' }); }
});

// --- TURN-INS ---
router.post('/student/submit-turnin', async (req, res) => {
    const { student_id, assignment_name, note } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO turnins (student_id, assignment_name, note, timestamp) VALUES (?, ?, ?, NOW())',
            [student_id, assignment_name, note]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save turn-in' }); }
});

// --- STUDENT PROFILE ---
router.get('/student/profile', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username is required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT student_id, first_name, last_name, section_id, username, role FROM students WHERE username = ?',
            [username.toLowerCase()]
        );
        await connection.release();
        if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        res.json(rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch student profile' }); }
});

// --- HELP REQUEST ---
router.post('/student/help-request', async (req, res) => {
    const { student_id, requested } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'ALTER TABLE students ADD COLUMN IF NOT EXISTS help_requested TINYINT(1) DEFAULT 0'
        );
        await connection.execute(
            'UPDATE students SET help_requested = ? WHERE student_id = ?',
            [requested ? 1 : 0, student_id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update help request' }); }
});

// --- CS EXAM QUESTIONS ---
router.get('/cs-exam-questions', async (req, res) => {
    const { unit } = req.query;
    let unitNum = 0;
    let examIds = [];

    if (unit === 'a' || unit === 'A') {
        examIds = ['cs-unit-a', 'cs-u-a-exam', 'cs-unit-0', 'cs-u0-exam', 'unit-0', 'unit-a'];
        unitNum = 0;
    } else {
        const parsed = parseInt(unit, 10);
        if (isNaN(parsed) || parsed < 0 || parsed > 8)
            return res.status(400).json({ error: 'Valid unit number (0-8) or "a" required' });
        unitNum = parsed;
        examIds = [`cs-unit-${unitNum}`, `cs-u${unitNum}-exam`, `unit-${unitNum}`];
    }

    try {
        const connection = await getDbConnection();
        let questions = [];

        if (examIds.length > 0) {
            const placeholders = examIds.map(() => '?').join(', ');
            const [rows] = await connection.execute(
                `SELECT question_id AS id, question_text AS question,
                        option_a, option_b, option_c, option_d,
                        correct_answer AS answer, study_hint AS hint, chapter_number AS chapter
                 FROM questions WHERE exam_id IN (${placeholders})
                 ORDER BY chapter_number, RAND()`,
                examIds
            );
            questions = rows.map(row => ({
                question: row.question,
                options: [row.option_a, row.option_b, row.option_c, row.option_d],
                answer: row.answer, hint: row.hint || '',
                chapter: row.chapter !== null ? row.chapter : unitNum
            }));
        }

        if (questions.length === 0) {
            const [fallbackRows] = await connection.execute(
                `SELECT question_id AS id, question_text AS question,
                        option_a, option_b, option_c, option_d,
                        correct_answer AS answer, study_hint AS hint, chapter_number AS chapter
                 FROM questions WHERE chapter_number = ? ORDER BY RAND()`,
                [unitNum]
            );
            questions = fallbackRows.map(row => ({
                question: row.question,
                options: [row.option_a, row.option_b, row.option_c, row.option_d],
                answer: row.answer, hint: row.hint || '',
                chapter: row.chapter !== null ? row.chapter : unitNum
            }));
        }

        await connection.release();
        res.json({ unit: unitNum, count: questions.length, questions });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch exam questions' }); }
});

// --- WD EXAM QUESTIONS ---
router.get('/wd-exam-questions', async (req, res) => {
    const { chapter } = req.query;
    const chapterNum = parseInt(chapter, 10);
    if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > 16) {
        return res.status(400).json({ error: 'Valid chapter number (1-16) required' });
    }
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT question_id AS id, question_text AS question,
                    option_a, option_b, option_c, option_d,
                    correct_answer AS answer, chapter_number AS chapter
             FROM wd_questions WHERE chapter_number = ? ORDER BY RAND()`,
            [chapterNum]
        );
        const questions = rows.map(row => ({
            question: row.question,
            options: [row.option_a, row.option_b, row.option_c, row.option_d],
            answer: row.answer, chapter: row.chapter
        }));
        await connection.release();
        res.json({ chapter: chapterNum, count: questions.length, questions });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch WD exam questions' }); }
});

// --- CS NOTEBOOK (turnins table) ---
router.get('/student/cs-notebook', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT id, chapter, title, category, content, is_submitted, timestamp FROM turnins WHERE student_id = ? ORDER BY timestamp DESC',
            [student_id]
        );
        await connection.release();
        res.json({ notes: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load notebook entries' }); }
});

router.post('/student/cs-notebook', async (req, res) => {
    const { id, student_id, chapter, title, category, content, is_submitted } = req.body;
    if (!student_id || !chapter) return res.status(400).json({ error: 'student_id and chapter required' });
    const cleanContent = sanitizeNotebookHtml(content);
    try {
        const connection = await getDbConnection();

        // turnins has no unique constraint tying a chapter to one row per
        // student, so the old INSERT ... ON DUPLICATE KEY never actually
        // triggered -- every autosave (every 1.5s while editing) created a
        // brand-new row instead of updating the one already in progress,
        // which is why some students had 50+ "notes" that were really just
        // repeated autosaves of the same session. Update by id once a row
        // exists, same pattern as /student/notebook/save.
        if (id) {
            await connection.execute(
                `UPDATE turnins SET chapter = ?, title = ?, category = ?, content = ?, is_submitted = ?, timestamp = NOW()
                 WHERE id = ? AND student_id = ?`,
                [chapter, title || '', category || 'Reflection', cleanContent, is_submitted ? 1 : 0, id, student_id]
            );
            await connection.release();
            return res.json({ success: true, id: Number(id) });
        }

        const [result] = await connection.execute(
            `INSERT INTO turnins (student_id, chapter, title, category, content, is_submitted, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [student_id, chapter, title || '', category || 'Reflection', cleanContent, is_submitted ? 1 : 0]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save notebook entry' }); }
});

// --- EXAM PROGRESS ---
router.get('/student/exam-progress', async (req, res) => {
    const { student_id, exam_id } = req.query;
    if (!student_id || !exam_id) return res.status(400).json({ error: 'student_id and exam_id required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(EXAM_PROGRESS_DDL);
        const [rows] = await connection.execute(
            'SELECT progress_json FROM exam_progress WHERE student_id = ? AND exam_id = ?',
            [student_id, exam_id]
        );
        await connection.release();
        if (rows.length === 0) return res.json({ found: false });
        res.json({ found: true, ...JSON.parse(rows[0].progress_json || '{}') });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load progress' }); }
});

router.post('/student/exam-progress', async (req, res) => {
    const { student_id, exam_id, ...progressData } = req.body;
    if (!student_id || !exam_id) return res.status(400).json({ error: 'student_id and exam_id required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(EXAM_PROGRESS_DDL);
        await connection.execute(
            `INSERT INTO exam_progress (student_id, exam_id, progress_json) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE progress_json = VALUES(progress_json)`,
            [student_id, exam_id, JSON.stringify(progressData)]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save progress' }); }
});

router.delete('/student/exam-progress', async (req, res) => {
    const { student_id, exam_id } = req.query;
    if (!student_id || !exam_id) return res.status(400).json({ error: 'student_id and exam_id required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'DELETE FROM exam_progress WHERE student_id = ? AND exam_id = ?',
            [student_id, exam_id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete progress' }); }
});

// --- RUBRICS ---
router.get('/admin/rubrics', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await connection.execute(RUBRICS_DDL);
        const [rows] = await connection.execute('SELECT * FROM rubrics ORDER BY title ASC');
        await connection.release();
        const rubrics = rows.map(r => ({
            id: r.id, title: r.title, course: r.course,
            enableSelfGrade: !!r.enable_self_grade, enablePeerGrade: !!r.enable_peer_grade,
            criteria: JSON.parse(r.criteria_json || '[]'),
            totalPoints: r.total_points, lastUpdated: r.last_updated
        }));
        res.json({ rubrics });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load rubrics' }); }
});

router.post('/admin/rubrics/save', async (req, res) => {
    const { id, title, course, enableSelfGrade, enablePeerGrade, criteria, totalPoints, lastUpdated } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'id and title are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(RUBRICS_DDL);
        await connection.execute(
            `INSERT INTO rubrics (id, title, course, enable_self_grade, enable_peer_grade, criteria_json, total_points, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title), course = VALUES(course),
               enable_self_grade = VALUES(enable_self_grade), enable_peer_grade = VALUES(enable_peer_grade),
               criteria_json = VALUES(criteria_json), total_points = VALUES(total_points), last_updated = VALUES(last_updated)`,
            [id, title, course || '', enableSelfGrade ? 1 : 0, enablePeerGrade ? 1 : 0,
             JSON.stringify(criteria || []), totalPoints || 0, lastUpdated || Date.now()]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save rubric' }); }
});

router.delete('/admin/rubrics/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM rubrics WHERE id = ?', [id]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete rubric' }); }
});

// --- REVIEW GAME QUESTIONS ---
router.get('/review-questions', async (req, res) => {
    const { chapter } = req.query;
    try {
        const connection = await getDbConnection();
        await connection.execute(REVIEW_QUESTIONS_DDL);
        let sql = 'SELECT id, chapter, grade, cat, val, q, a, d FROM review_questions';
        const params = [];
        if (chapter && chapter !== 'Ultimate Review') {
            if (chapter === 'Year 1 Review')      { sql += ' WHERE grade = ?'; params.push('Web Design 1'); }
            else if (chapter === 'Year 2 Review') { sql += ' WHERE grade = ?'; params.push('Web Design 2'); }
            else                                   { sql += ' WHERE chapter = ?'; params.push(chapter); }
        }
        const [rows] = await connection.execute(sql, params);
        await connection.release();
        const questions = rows.map(r => ({ ...r, d: typeof r.d === 'string' ? JSON.parse(r.d) : (r.d || []) }));
        res.json({ questions });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch review questions' }); }
});

router.post('/admin/review-questions/seed', async (req, res) => {
    const { questions, truncate = false } = req.body;
    if (!Array.isArray(questions) || questions.length === 0)
        return res.status(400).json({ error: 'questions array required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(REVIEW_QUESTIONS_DDL);
        if (truncate) await connection.execute('TRUNCATE TABLE review_questions');
        const placeholders = questions.map(() => '(?,?,?,?,?,?,?)').join(',');
        const values = [];
        questions.forEach(q => {
            values.push(q.chapter || null, q.grade || null, q.cat || null,
                q.val != null ? Number(q.val) : null, q.q, q.a || null,
                JSON.stringify(Array.isArray(q.d) ? q.d : []));
        });
        await connection.execute(
            `INSERT INTO review_questions (chapter, grade, cat, val, q, a, d) VALUES ${placeholders}`, values
        );
        await connection.release();
        res.json({ success: true, count: questions.length });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to seed review questions' }); }
});

router.delete('/admin/review-questions', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await connection.execute(REVIEW_QUESTIONS_DDL);
        await connection.execute('TRUNCATE TABLE review_questions');
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to clear review questions' }); }
});

module.exports = router;
