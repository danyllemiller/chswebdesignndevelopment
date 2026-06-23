// /srv/chswebdesignndevelopment/server/api.js
const express = require('express');
const router = express.Router();
const { getDbConnection } = require('./db');
const bcrypt = require('bcrypt');

const COURSE_CODE_MAP = {
    WD1: '05254G1S',
    WD2: '05254G2S',
    AS: '05254ES',
    CS: '10003GS'
};

function normalizeCourseCode(sectionId = '') {
    const s = String(sectionId).toUpperCase();
    if (s.startsWith('WD1')) return COURSE_CODE_MAP.WD1;
    if (s.startsWith('WD2')) return COURSE_CODE_MAP.WD2;
    if (s.startsWith('AS')) return COURSE_CODE_MAP.AS;
    if (s.startsWith('CS')) return COURSE_CODE_MAP.CS;
    return null;
}

function clampScore(score, max = 100) {
    const n = Number(score);
    if (Number.isNaN(n)) return 0;
    if (n < 0) return 0;
    if (n > max) return max;
    return n;
}

// --- STUDENT COURSE GRADEBOOK ---
router.get('/student/course-gradebook', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });

    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute(
            'SELECT student_id, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );

        if (students.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Student not found' });
        }

        const sectionId = students[0].section_id || '';
        const courseCode = normalizeCourseCode(sectionId);
        if (!courseCode) {
            await connection.end();
            return res.status(400).json({ error: 'Unable to resolve course for student section' });
        }

        const [rows] = await connection.execute(
            `SELECT e.exam_id, TRIM(e.title) AS title, e.total_points, e.course_id,
                    r.score, r.timestamp
             FROM exams e
             LEFT JOIN responses r ON e.exam_id = r.exam_id AND r.student_id = ?
             WHERE e.course_id = ?
             ORDER BY e.title ASC, e.exam_id ASC`,
            [student_id, courseCode]
        );

        await connection.end();
        res.json({
            student_id,
            section_id: sectionId,
            course_id: courseCode,
            assignments: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch student course gradebook.' });
    }
});

// --- CLOCK-IN ---
router.post('/clockin', async (req, res) => {
    const { student_id, section_id, type, answer } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute('INSERT INTO clockins (student_id, section_id, type, answer, timestamp) VALUES (?, ?, ?, ?, NOW())',
            [student_id, section_id, type, answer]);
        await connection.end();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Clock in failed.' }); }
});

// --- CLOCK STATUS ---
router.get('/timeclock/status', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM clockins WHERE student_id = ? ORDER BY timestamp DESC LIMIT 1',
            [student_id]
        );
        await connection.end();
        res.json(rows.length > 0 ? rows[0] : { status: 'out' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch status' }); }
});

// --- SUBMIT EXAM ---
router.post('/submit-exam', async (req, res) => {
    const { student_id, exam_id, score, total_points, title, course_id } = req.body;
    try {
        const connection = await getDbConnection();
        
        // Auto-create exam entry if it doesn't exist
        const examTitle = title || exam_id.replace(/-/g, ' ').replace(/cs unit \d+/i, (m) => m.toUpperCase());
        const examCourse = course_id || '10003GS'; // Default to CS course
        
        await connection.execute(
            'INSERT INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = COALESCE(VALUES(title), title), total_points = COALESCE(VALUES(total_points), total_points)',
            [exam_id, examTitle, total_points || 100, examCourse]
        );
        
        // KEEP HIGHEST: Only update score if new score is higher than existing score
        // First check if there's an existing score for this student+exam
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
            // Save/update the grade (only if new score is higher)
            await connection.execute(
                'INSERT INTO responses (student_id, exam_id, score, total_points, timestamp) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()',
                [student_id, exam_id, score, total_points || 100]
            );
        }
        
        await connection.end();
        res.json({ success: true, keptHigher: !shouldUpdate });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save exam' }); }
});

// --- GET GRADES ---
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
        await connection.end();
        res.json({ responses: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch grades.' }); }
});

// --- SELF-ASSESSMENTS ---
router.get('/student/self-assessments', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT * FROM self_assessments WHERE student_id = ?', [student_id]);
        await connection.end();
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
        await connection.end();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save assessment' }); }
});

// --- SUBMIT TURN-IN ---
router.post('/student/submit-turnin', async (req, res) => {
    const { student_id, assignment_name, note } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO turnins (student_id, assignment_name, note, timestamp) VALUES (?, ?, ?, NOW())',
            [student_id, assignment_name, note]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save turn-in' }); }
});

// --- ADMIN ROSTER ---
router.get('/admin/roster', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute('SELECT * FROM students ORDER BY last_name ASC, first_name ASC');
        await connection.end();
        res.json(students);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch roster.' }); }
});

// --- ADMIN CLASS SECTIONS LIST ---
router.get('/admin/sections', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [sections] = await connection.execute(
            `SELECT cs.section_id, cs.course_id, COALESCE(c.course_name, '') AS course_name, COALESCE(c.department, '') AS department
             FROM class_sections cs
             LEFT JOIN courses c ON cs.course_id = c.course_id
             ORDER BY c.department ASC, c.course_name ASC, cs.section_id ASC`
        );
        await connection.end();
        res.json(sections);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch class section catalog.' });
    }
});

// --- ADMIN ADD SECTION ---
router.post('/admin/sections', async (req, res) => {
    const { section_id, course_id } = req.body || {};
    if (!section_id) return res.status(400).json({ error: 'section_id is required' });
    const sid = String(section_id).trim();
    const cid = course_id ? String(course_id).trim() : null;

    let connection;
    try {
        connection = await getDbConnection();
        await connection.execute(`CREATE TABLE IF NOT EXISTS courses (
            course_id   VARCHAR(50) PRIMARY KEY,
            course_name VARCHAR(100) NOT NULL DEFAULT '',
            department  VARCHAR(100) NOT NULL DEFAULT ''
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        await connection.execute(`CREATE TABLE IF NOT EXISTS class_sections (
            section_id VARCHAR(50) PRIMARY KEY,
            course_id  VARCHAR(50) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

        // Ensure the course row exists
        if (cid) {
            const COURSE_NAMES = {
                '10003GS': 'Computer Science', '05254G1S': 'Web Design 1',
                '05254G2S': 'Web Design 2',    '05254ES':  'Applied Science'
            };
            const cname = COURSE_NAMES[cid] || cid;
            await connection.execute(
                'INSERT IGNORE INTO courses (course_id, course_name, department) VALUES (?, ?, ?)',
                [cid, cname, '']
            );
        }
        await connection.execute(
            'INSERT INTO class_sections (section_id, course_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE course_id = VALUES(course_id)',
            [sid, cid]
        );
        await connection.end();
        res.json({ success: true, section_id: sid });
    } catch (err) {
        if (connection) try { await connection.end(); } catch(_) {}
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN DELETE SECTION ---
router.delete('/admin/sections/:section_id', async (req, res) => {
    const sid = String(req.params.section_id || '').trim();
    if (!sid) return res.status(400).json({ error: 'section_id required' });

    let connection;
    try {
        connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT COUNT(*) AS cnt FROM students WHERE section_id = ?', [sid]
        );
        if (rows[0].cnt > 0) {
            await connection.end();
            return res.status(409).json({ error: `Cannot delete — ${rows[0].cnt} student(s) still enrolled in this section.` });
        }
        await connection.execute('DELETE FROM class_sections WHERE section_id = ?', [sid]);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        if (connection) try { await connection.end(); } catch(_) {}
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN UPLOAD ROSTER ---
router.post('/admin/upload-roster', async (req, res) => {
    let students = req.body;
    if (!students) {
        return res.status(400).json({ error: 'Roster payload is required.' });
    }

    if (!Array.isArray(students)) {
        students = [students];
    }

    const cleaned = students
        .map((student) => ({
            student_id: String(student.student_id || student.studentId || '').trim(),
            first_name: String(student.first_name || student.firstName || '').trim() || null,
            last_name: String(student.last_name || student.lastName || '').trim() || null,
            section_id: String(student.section_id || student.sectionId || student.section || student.period || '').trim() || null
        }))
        .filter((student) => student.student_id);

    if (cleaned.length === 0) {
        return res.status(400).json({ error: 'At least one student record with student_id is required.' });
    }

    let connection;
    try {
        connection = await getDbConnection();

        // Validate provided section_id values against catalog
        const [sectionsRows] = await connection.execute('SELECT section_id FROM class_sections');
        const validSections = new Set((sectionsRows || []).map(r => String(r.section_id).trim()));
        const invalidSections = Array.from(new Set(cleaned
            .map(s => s.section_id || '')
            .map(s => String(s).trim())
            .filter(s => s.length > 0 && !validSections.has(s))
        ));

        if (invalidSections.length > 0) {
            await connection.end();
            return res.status(400).json({ error: 'Invalid section_id values in payload', invalid: invalidSections });
        }

        await connection.beginTransaction();

        const stmt = `INSERT INTO students (student_id, first_name, last_name, section_id, role)
                      VALUES (?, ?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE
                        first_name = VALUES(first_name),
                        last_name = VALUES(last_name),
                        section_id = VALUES(section_id),
                        role = VALUES(role)`;

        for (const student of cleaned) {
            const role = student.section_id === 'Teacher' ? 'teacher' : 'student';
            await connection.execute(stmt, [
                student.student_id,
                student.first_name,
                student.last_name,
                student.section_id,
                role
            ]);
        }

        await connection.commit();
        await connection.end();
        res.json({ success: true, count: cleaned.length });
    } catch (err) {
        console.error(err && err.stack ? err.stack : err);
        try {
            if (connection) {
                await connection.rollback();
                await connection.end();
            }
        } catch (rollbackErr) {
            console.error('Rollback failed:', rollbackErr && rollbackErr.stack ? rollbackErr.stack : rollbackErr);
        }
        res.status(500).json({ error: 'Failed to upload roster.' });
    }
});

router.post('/admin/reset-student', async (req, res) => {
    const { student_id } = req.body;
    if (!student_id) {
        return res.status(400).json({ error: 'student_id is required.' });
    }

    try {
        const connection = await getDbConnection();
        const [result] = await connection.execute(
            'UPDATE students SET username = NULL, password = NULL, password_hash = NULL WHERE student_id = ?',
            [student_id]
        );
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset student.' });
    }
});

// --- ADMIN GET SINGLE STUDENT ---
router.get('/admin/student', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });

    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT student_id, first_name, last_name, username, section_id, role FROM students WHERE student_id = ? LIMIT 1', [student_id]);
        await connection.end();
        if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

// --- ADMIN SAVE/UPDATE SINGLE STUDENT ---
router.post('/admin/save-student', async (req, res) => {
    const { student_id, first_name, last_name, username, section_id, role, password } = req.body || {};
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });

    try {
        const connection = await getDbConnection();

        // validate section_id if provided and not empty
        if (section_id && String(section_id).trim().length > 0) {
            const [sections] = await connection.execute('SELECT section_id FROM class_sections WHERE section_id = ?', [section_id]);
            if (sections.length === 0) {
                await connection.end();
                return res.status(400).json({ error: 'Invalid section_id' });
            }
        }

        // ensure student exists
        const [existing] = await connection.execute('SELECT student_id FROM students WHERE student_id = ?', [student_id]);
        if (existing.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Student not found' });
        }

        // build update parts
        const updates = [];
        const params = [];
        if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
        if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
        if (username !== undefined) { updates.push('username = ?'); params.push(username || null); }
        if (section_id !== undefined) { updates.push('section_id = ?'); params.push(section_id || null); }
        if (role !== undefined) { updates.push('role = ?'); params.push(role); }

// handle password separately if provided
        if (password !== undefined && password !== null && String(password).length > 0) {
            const hash = await bcrypt.hash(String(password), 10);
            updates.push('password = ?', 'password_hash = ?');
            params.push(hash, hash);
        }

        if (updates.length === 0) {
            await connection.end();
            return res.status(400).json({ error: 'No update fields provided' });
        }

        params.push(student_id);
        const sql = `UPDATE students SET ${updates.join(', ')} WHERE student_id = ?`;
        const [result] = await connection.execute(sql, params);
        await connection.end();

        res.json({ success: true, affectedRows: result.affectedRows });
    } catch (err) {
        console.error(err && err.stack ? err.stack : err);
        res.status(500).json({ error: 'Failed to save student' });
    }
});

router.delete('/admin/delete-student', async (req, res) => {
    const { student_id } = req.body;
    if (!student_id) {
        return res.status(400).json({ error: 'student_id is required.' });
    }

    try {
        const connection = await getDbConnection();
        const [result] = await connection.execute('DELETE FROM students WHERE student_id = ?', [student_id]);
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete student.' });
    }
});

// --- ADMIN DELETE MULTIPLE STUDENTS (Bulk Delete) ---
router.post('/admin/delete-multiple-students', async (req, res) => {
    const { student_ids } = req.body;
    
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: 'student_ids array is required.' });
    }

    try {
        const connection = await getDbConnection();
        
        // Build placeholders for bulk delete: student_id IN (?, ?, ?, ...)
        const placeholders = student_ids.map(() => '?').join(', ');
        const [result] = await connection.execute(
            `DELETE FROM students WHERE student_id IN (${placeholders})`,
            student_ids
        );
        
        await connection.end();
        res.json({ success: true, deletedCount: result.affectedRows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete students.' });
    }
});

// --- ADMIN CLEAR ALL ASSIGNMENTS & GRADES (Fresh Start) ---
router.post('/admin/clear-all-assignments', async (req, res) => {
    try {
        const connection = await getDbConnection();
        
        // Delete all responses first (foreign key constraint)
        await connection.execute('DELETE FROM responses');
        // Delete all exams
        await connection.execute('DELETE FROM exams');
        
        await connection.end();
        res.json({ success: true, message: 'All assignments and grades cleared.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to clear assignments.' });
    }
});

// --- ADMIN SAVE ASSIGNMENT ---
router.post('/admin/save-assignment', async (req, res) => {
    let { exam_id, title, total_points, course_id } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), total_points=VALUES(total_points), course_id=VALUES(course_id)',
            [exam_id, title, total_points, course_id]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save assignment' }); }
});

// --- ADMIN DELETE ASSIGNMENT ---
router.post('/admin/delete-assignment', async (req, res) => {
    const { exam_id } = req.body;

    if (!exam_id || !String(exam_id).trim()) {
        return res.status(400).json({ error: 'exam_id is required' });
    }

    try {
        const connection = await getDbConnection();
        const examKey = String(exam_id).trim();

        await connection.execute('DELETE FROM exams WHERE exam_id = ?', [examKey]);
        await connection.execute('DELETE FROM responses WHERE exam_id = ?', [examKey]);

        await connection.end();
        res.json({ success: true, exam_id: examKey });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete assignment' }); }
});

// --- ADMIN MASTER GRADEBOOK DATA ---
router.get('/admin/master-gradebook-data', async (req, res) => {
    try {
        const connection = await getDbConnection();

        const [students] = await connection.execute(
            `SELECT student_id, first_name, last_name, username, section_id
             FROM students
             ORDER BY last_name ASC, first_name ASC`
        );

        const [exams] = await connection.execute(
            `SELECT exam_id, TRIM(title) AS title, total_points, course_id
             FROM exams`
        );

        const [grades] = await connection.execute(
            `SELECT student_id, exam_id, score, total_points, timestamp
             FROM responses`
        );

        const registry = {};
        exams.forEach(e => {
            registry[e.exam_id] = {
                title: e.title,
                maxPoints: e.total_points,
                dueDate: '',
                instructions: '',
                targetCourse: e.course_id || 'All'
            };
        });

        await connection.end();
        res.json({
            students,
            assignments: registry,
            grades
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch gradebook' }); }
});

// --- PROJECT WORKFLOW API (MariaDB) ---

// Student-visible assignments filtered by their roster section/course
router.get('/student/assignments-visible', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });

    try {
        const connection = await getDbConnection();

        const [students] = await connection.execute(
            'SELECT student_id, section_id FROM students WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        if (students.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Student not found' });
        }

        const courseCode = normalizeCourseCode(students[0].section_id);
        if (!courseCode) {
            await connection.end();
            return res.status(400).json({ error: 'Unable to resolve course for student section' });
        }

        const [assignments] = await connection.execute(
            'SELECT exam_id, title, total_points, course_id FROM exams WHERE course_id = ? ORDER BY title ASC, exam_id ASC',
            [courseCode]
        );

        await connection.end();
        res.json({ student_id, course_id: courseCode, assignments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch visible assignments' });
    }
});

// Admin create/update chapter project spec
router.post('/admin/project-spec', async (req, res) => {
    const {
        chapter_id, chapter_title, course_id, exam_id,
        project_title, project_spec_html,
        self_reflection_weight, peer_review_weight, auto_grade_weight,
        is_active
    } = req.body;

    if (!chapter_id || !course_id || !exam_id || !project_title) {
        return res.status(400).json({ error: 'chapter_id, course_id, exam_id, and project_title are required' });
    }

    try {
        const connection = await getDbConnection();
        await connection.execute(
            `INSERT INTO chapter_projects
            (chapter_id, chapter_title, course_id, exam_id, project_title, project_spec_html,
             self_reflection_weight, peer_review_weight, auto_grade_weight, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               chapter_title = VALUES(chapter_title),
               project_title = VALUES(project_title),
               project_spec_html = VALUES(project_spec_html),
               self_reflection_weight = VALUES(self_reflection_weight),
               peer_review_weight = VALUES(peer_review_weight),
               auto_grade_weight = VALUES(auto_grade_weight),
               is_active = VALUES(is_active)`,
            [
                chapter_id,
                chapter_title || chapter_id,
                course_id,
                exam_id,
                project_title,
                project_spec_html || '',
                Number(self_reflection_weight ?? 33.33),
                Number(peer_review_weight ?? 33.33),
                Number(auto_grade_weight ?? 33.34),
                Number(is_active ?? 1)
            ]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save project spec' });
    }
});

// List active project specs by course
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch project specs' });
    }
});

// Track project submission metadata (upload file transport may remain in PHP endpoint)
router.post('/student/project-submission', async (req, res) => {
    const {
        student_id, chapter_project_id, exam_id,
        original_filename, stored_path, file_hash,
        submission_mode, overwrite_of_submission_id
    } = req.body;

    if (!student_id || !chapter_project_id || !exam_id || !original_filename || !stored_path) {
        return res.status(400).json({ error: 'Missing required submission fields' });
    }

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
            [
                student_id, chapter_project_id, exam_id, original_filename, stored_path,
                file_hash || null, mode, nextVersion, overwrite_of_submission_id || null
            ]
        );

        await connection.end();
        res.json({ success: true, version_no: nextVersion });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save project submission metadata' });
    }
});

// Upsert evaluator score (self/peer/auto) and recompute aggregate + gradebook writeback
router.post('/student/project-evaluation', async (req, res) => {
    const {
        chapter_project_id, exam_id, student_id,
        evaluator_student_id, evaluator_type, score, max_score,
        rubric_json, feedback
    } = req.body;

    if (!chapter_project_id || !exam_id || !student_id || !evaluator_type) {
        return res.status(400).json({ error: 'chapter_project_id, exam_id, student_id, evaluator_type are required' });
    }
    if (!['self', 'peer', 'auto'].includes(evaluator_type)) {
        return res.status(400).json({ error: 'evaluator_type must be one of self|peer|auto' });
    }

    try {
        const connection = await getDbConnection();

        const normalizedScore = clampScore(score, Number(max_score || 100));
        const normalizedMax = Number(max_score || 100);

        if (evaluator_type === 'peer') {
            await connection.execute(
                `INSERT INTO project_evaluations
                 (chapter_project_id, exam_id, student_id, evaluator_student_id, evaluator_type, score, max_score, rubric_json, feedback)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    chapter_project_id, exam_id, student_id, evaluator_student_id || null, evaluator_type,
                    normalizedScore, normalizedMax, rubric_json ? JSON.stringify(rubric_json) : null, feedback || null
                ]
            );
        } else {
            await connection.execute(
                `INSERT INTO project_evaluations
                 (chapter_project_id, exam_id, student_id, evaluator_student_id, evaluator_type, score, max_score, rubric_json, feedback)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    score = VALUES(score),
                    max_score = VALUES(max_score),
                    rubric_json = VALUES(rubric_json),
                    feedback = VALUES(feedback),
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    chapter_project_id, exam_id, student_id, evaluator_student_id || null, evaluator_type,
                    normalizedScore, normalizedMax, rubric_json ? JSON.stringify(rubric_json) : null, feedback || null
                ]
            );
        }

        // Gather scores for aggregation
        const [selfRows] = await connection.execute(
            `SELECT score, max_score FROM project_evaluations
             WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ? AND evaluator_type = 'self'
             ORDER BY id DESC LIMIT 1`,
            [chapter_project_id, exam_id, student_id]
        );
        const [autoRows] = await connection.execute(
            `SELECT score, max_score FROM project_evaluations
             WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ? AND evaluator_type = 'auto'
             ORDER BY id DESC LIMIT 1`,
            [chapter_project_id, exam_id, student_id]
        );
        const [peerRows] = await connection.execute(
            `SELECT AVG(score) AS avg_score, AVG(max_score) AS avg_max
             FROM project_evaluations
             WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ? AND evaluator_type = 'peer'`,
            [chapter_project_id, exam_id, student_id]
        );

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
             ON DUPLICATE KEY UPDATE
               self_score = VALUES(self_score),
               peer_score = VALUES(peer_score),
               auto_score = VALUES(auto_score),
               aggregate_score = VALUES(aggregate_score),
               max_score = VALUES(max_score),
               status = VALUES(status),
               computed_at = CURRENT_TIMESTAMP`,
            [chapter_project_id, exam_id, student_id, selfScore, peerScore, autoScore, aggregate, 100, status]
        );

        // Write through to gradebook responses
        await connection.execute(
            `INSERT INTO responses (student_id, exam_id, score, total_points, timestamp)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               score = VALUES(score),
               total_points = VALUES(total_points),
               timestamp = NOW()`,
            [student_id, exam_id, aggregate, 100]
        );

        await connection.end();
        res.json({
            success: true,
            aggregate: {
                self_score: selfScore,
                peer_score: peerScore,
                auto_score: autoScore,
                aggregate_score: aggregate,
                status
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save evaluation/aggregate' });
    }
});

// Get current project aggregate and evaluations for a student/project
router.get('/student/project-aggregate', async (req, res) => {
    const { chapter_project_id, exam_id, student_id } = req.query;
    if (!chapter_project_id || !exam_id || !student_id) {
        return res.status(400).json({ error: 'chapter_project_id, exam_id, student_id required' });
    }

    try {
        const connection = await getDbConnection();
        const [aggregateRows] = await connection.execute(
            `SELECT * FROM project_grade_aggregates
             WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ?
             LIMIT 1`,
            [chapter_project_id, exam_id, student_id]
        );
        const [evalRows] = await connection.execute(
            `SELECT id, evaluator_type, evaluator_student_id, score, max_score, feedback, created_at, updated_at
             FROM project_evaluations
             WHERE chapter_project_id = ? AND exam_id = ? AND student_id = ?
             ORDER BY created_at DESC`,
            [chapter_project_id, exam_id, student_id]
        );
        await connection.end();
        res.json({ aggregate: aggregateRows[0] || null, evaluations: evalRows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch project aggregate' });
    }
});

// --- PAYROLL API ENDPOINTS ---

router.get('/payroll/roster', async (req, res) => {
    const { username } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT s.*, r.title, r.hourly_rate 
            FROM students s 
            LEFT JOIN pay_roles r ON s.role_id = r.id 
            WHERE s.username = ?`, [username]);
        await connection.end();
        res.json(rows.length > 0 ? rows[0] : {});
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch payroll roster' }); }
});

router.get('/payroll/timesheets', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT * FROM timesheets WHERE student_id = ?', [student_id]);
        await connection.end();
        res.json({ timesheets: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch timesheets' }); }
});
// --- ADMIN: UPDATE STUDENT ROLE ---
router.post('/admin/update-student-role', async (req, res) => {
    const { student_id, role_id } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'UPDATE students SET role_id = ? WHERE student_id = ?',
            [role_id, student_id]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) { 
        console.error(err); 
        res.status(500).json({ error: 'Failed to update student role' }); 
    }
});
// --- CALENDAR SETTINGS API ---

// GET: Retrieve the calendar configuration
router.get('/admin/calendar-settings', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT config_json FROM calendar_settings WHERE id = 1');
        await connection.end();
        
        if (rows.length > 0) {
            res.json(rows[0].config_json);
        } else {
            res.status(404).json({ error: 'Configuration not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch calendar settings' });
    }
});

// POST: Save the calendar configuration (the entire JSON object)
router.post('/admin/calendar-settings', async (req, res) => {
    const config = req.body;
    try {
        const connection = await getDbConnection();
        // Uses JSON.stringify to turn your JS object into a JSON string for the DB
        await connection.execute(
            'INSERT INTO calendar_settings (id, config_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)',
            [JSON.stringify(config)]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save calendar settings' });
    }
});

/**
 * --- ADMIN NOTEBOOKS API (MariaDB migration) ---
 * Replaces Firebase-backed teacher notebook viewer queries.
 */

// Teacher/admin roster for notebook dashboard (excludes Teacher/admin accounts)
router.get('/admin/notebooks/roster', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT student_id, first_name, last_name, username, section_id, role
             FROM students
             WHERE (role IS NULL OR LOWER(role) <> 'admin')
               AND (section_id IS NULL OR section_id <> 'Teacher')
             ORDER BY section_id ASC, last_name ASC, first_name ASC`
        );
        await connection.end();

        const roster = rows.map((r) => ({
            student_id: r.student_id,
            firstName: r.first_name || '',
            lastName: r.last_name || '',
            username: r.username || '',
            period: r.section_id || '',
            role: r.role || 'student'
        }));

        return res.json({ roster });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch notebook roster' });
    }
});

// Notebook entries for a specific student, optionally filtered by chapter_id
router.get('/admin/notebooks/entries', async (req, res) => {
    const { student_id, chapter_id } = req.query;
    if (!student_id) {
        return res.status(400).json({ error: 'student_id is required' });
    }

    try {
        const connection = await getDbConnection();

        const chapterNum = Number(chapter_id);
        const hasChapterFilter = Number.isInteger(chapterNum) && chapterNum > 0;

        const sql = hasChapterFilter
            ? `SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at
               FROM notebook_entries
               WHERE student_id = ? AND chapter_id = ?
               ORDER BY updated_at DESC, id DESC`
            : `SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at
               FROM notebook_entries
               WHERE student_id = ?
               ORDER BY updated_at DESC, id DESC`;

        const params = hasChapterFilter ? [student_id, chapterNum] : [student_id];
        const [rows] = await connection.execute(sql, params);
        await connection.end();

        const entries = rows.map((row) => ({
            id: String(row.id),
            student_id: row.student_id,
            chapter: `Chapter ${row.chapter_id}`,
            chapter_id: row.chapter_id,
            title: row.title || 'Untitled Note',
            category: row.category || 'Notes',
            content: row.content || '',
            timestamp: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
        }));

        return res.json({ entries });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch notebook entries' });
    }
});

// --- STUDENT NOTEBOOK API (MariaDB) ---

// Student notebook entries
router.get('/student/notebook', async (req, res) => {
    const { student_id, chapter_id } = req.query;
    if (!student_id) {
        return res.status(400).json({ error: 'student_id is required' });
    }

    try {
        const connection = await getDbConnection();
        const chapterNum = Number(chapter_id);
        const hasChapterFilter = Number.isInteger(chapterNum) && chapterNum > 0;

        const sql = hasChapterFilter
            ? `SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at
               FROM notebook_entries
               WHERE student_id = ? AND chapter_id = ?
               ORDER BY updated_at DESC, id DESC`
            : `SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at
               FROM notebook_entries
               WHERE student_id = ?
               ORDER BY updated_at DESC, id DESC`;

        const params = hasChapterFilter ? [student_id, chapterNum] : [student_id];
        const [rows] = await connection.execute(sql, params);
        await connection.end();

        const entries = rows.map((row) => ({
            id: String(row.id),
            student_id: row.student_id,
            chapter: `Chapter ${row.chapter_id}`,
            chapter_id: row.chapter_id,
            title: row.title || 'Untitled Note',
            category: row.category || 'Notes',
            content: row.content || '',
            timestamp: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
        }));

        return res.json({ entries });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch notebook entries' });
    }
});

// Student notebook save (insert/update)
router.post('/student/notebook/save', async (req, res) => {
    const { id, student_id, chapter_id, title, category, content } = req.body;

    if (!student_id || !chapter_id || !title) {
        return res.status(400).json({ error: 'student_id, chapter_id, and title are required' });
    }

    try {
        const connection = await getDbConnection();

        if (id) {
            await connection.execute(
                `UPDATE notebook_entries
                 SET chapter_id = ?, title = ?, category = ?, content = ?, updated_at = NOW()
                 WHERE id = ? AND student_id = ?`,
                [Number(chapter_id), title, category || 'Notes', content || '', Number(id), student_id]
            );
            await connection.end();
            return res.json({ success: true, id: String(id) });
        }

        const [result] = await connection.execute(
            `INSERT INTO notebook_entries
             (student_id, chapter_id, title, category, content, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [student_id, Number(chapter_id), title, category || 'Notes', content || '']
        );
        await connection.end();

        return res.json({ success: true, id: String(result.insertId) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to save notebook entry' });
    }
});

// Student notebook delete
router.post('/student/notebook/delete', async (req, res) => {
    const { id, student_id } = req.body;

    if (!id || !student_id) {
        return res.status(400).json({ error: 'id and student_id are required' });
    }

    try {
        const connection = await getDbConnection();
        await connection.execute(
            'DELETE FROM notebook_entries WHERE id = ? AND student_id = ?',
            [Number(id), student_id]
        );
        await connection.end();
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to delete notebook entry' });
    }
});

// --- PAYROLL: FULL ROSTER WITH PAY ROLES ---
router.get('/admin/payroll/roster', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT s.student_id, s.first_name, s.last_name, s.section_id, s.username,
                   COALESCE(pr.title, 'Web Developer') AS pay_role_title,
                   COALESCE(pr.hourly_rate, 35.00) AS hourly_rate
            FROM students s
            LEFT JOIN pay_roles pr ON s.role_id = pr.id
            WHERE (s.role IS NULL OR LOWER(s.role) NOT IN ('admin', 'teacher'))
              AND (s.section_id IS NULL OR s.section_id != 'Teacher')
            ORDER BY s.last_name ASC, s.first_name ASC
        `);
        await connection.end();
        res.json({ roster: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch payroll roster' });
    }
});

// --- PAYROLL: ALL TIMESHEETS FOR A SPECIFIC DATE ---
router.get('/admin/payroll/timesheets-daily', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM timesheets WHERE date = ? ORDER BY student_id',
            [date]
        );
        await connection.end();
        res.json({ timesheets: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch daily timesheets' });
    }
});

// --- PAYROLL: ALL TIMESHEETS FOR A DATE RANGE ---
router.get('/admin/payroll/timesheets-period', async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM timesheets WHERE date >= ? AND date <= ? ORDER BY student_id, date ASC',
            [from, to]
        );
        await connection.end();
        res.json({ timesheets: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch period timesheets' });
    }
});

// --- TEACHER DAILY QUESTIONS (per date) ---
router.get('/admin/daily-questions', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS teacher_daily_questions (
                date DATE NOT NULL PRIMARY KEY,
                wd_question TEXT,
                cs_question TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        const [rows] = await connection.execute(
            'SELECT wd_question, cs_question FROM teacher_daily_questions WHERE date = ?',
            [date]
        );
        await connection.end();
        res.json(rows.length > 0
            ? { wdQuestion: rows[0].wd_question || '', csQuestion: rows[0].cs_question || '' }
            : { wdQuestion: '', csQuestion: '' }
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch daily questions' });
    }
});

router.post('/admin/daily-questions', async (req, res) => {
    const { date, wdQuestion, csQuestion } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS teacher_daily_questions (
                date DATE NOT NULL PRIMARY KEY,
                wd_question TEXT,
                cs_question TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await connection.execute(
            `INSERT INTO teacher_daily_questions (date, wd_question, cs_question) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE wd_question = VALUES(wd_question), cs_question = VALUES(cs_question)`,
            [date, wdQuestion || '', csQuestion || '']
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save daily questions' });
    }
});

// --- INJECT FAKE TIMESHEETS (admin testing tool) ---
router.post('/admin/inject-timesheets', async (req, res) => {
    const { student_id, timesheets } = req.body;
    if (!student_id || !Array.isArray(timesheets)) {
        return res.status(400).json({ error: 'student_id and timesheets array are required' });
    }
    try {
        const connection = await getDbConnection();
        let count = 0;
        for (const ts of timesheets) {
            // Delete existing record for this student+date to avoid duplicates
            await connection.execute(
                'DELETE FROM timesheets WHERE student_id = ? AND date = ?',
                [student_id, ts.date]
            );
            await connection.execute(
                `INSERT INTO timesheets (student_id, date, clock_in, clock_out, in_answer, out_answer)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [student_id, ts.date, ts.clock_in, ts.clock_out, ts.in_answer || 'Simulated Answer', ts.out_answer || 'Simulated Reflection']
            );
            count++;
        }
        await connection.end();
        res.json({ success: true, count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to inject timesheets' });
    }
});

// --- STUDENT PROFILE (by username) ---
router.get('/student/profile', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username is required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT student_id, first_name, last_name, section_id, username, role FROM students WHERE username = ?',
            [username.toLowerCase()]
        );
        await connection.end();
        if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch student profile' });
    }
});

// --- STUDENT HELP REQUEST ---
router.post('/student/help-request', async (req, res) => {
    const { student_id, requested } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        // Add column if it doesn't exist (safe to run repeatedly)
        await connection.execute(
            'ALTER TABLE students ADD COLUMN IF NOT EXISTS help_requested TINYINT(1) DEFAULT 0'
        );
        await connection.execute(
            'UPDATE students SET help_requested = ? WHERE student_id = ?',
            [requested ? 1 : 0, student_id]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update help request' });
    }
});

// --- STUDENT SHARED FILES (peer-to-peer sharing inbox) ---
router.get('/student/shared-files', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS shared_files (
                id INT AUTO_INCREMENT PRIMARY KEY,
                recipient_student_id VARCHAR(50) NOT NULL,
                sender_name VARCHAR(100),
                file_name VARCHAR(255),
                url TEXT,
                is_folder TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_recipient (recipient_student_id)
            )
        `);
        const [rows] = await connection.execute(
            'SELECT * FROM shared_files WHERE recipient_student_id = ? ORDER BY created_at DESC',
            [student_id]
        );
        await connection.end();
        res.json({ files: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch shared files' });
    }
});

router.post('/student/share-file', async (req, res) => {
    const { recipient_student_id, sender_name, file_name, url, is_folder } = req.body;
    if (!recipient_student_id || !file_name || !url) {
        return res.status(400).json({ error: 'recipient_student_id, file_name, and url are required' });
    }
    try {
        const connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS shared_files (
                id INT AUTO_INCREMENT PRIMARY KEY,
                recipient_student_id VARCHAR(50) NOT NULL,
                sender_name VARCHAR(100),
                file_name VARCHAR(255),
                url TEXT,
                is_folder TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_recipient (recipient_student_id)
            )
        `);
        // Verify recipient exists
        const [checkRows] = await connection.execute(
            'SELECT student_id FROM students WHERE student_id = ?',
            [recipient_student_id]
        );
        if (checkRows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Recipient student ID not found on roster' });
        }
        await connection.execute(
            'INSERT INTO shared_files (recipient_student_id, sender_name, file_name, url, is_folder) VALUES (?, ?, ?, ?, ?)',
            [recipient_student_id, sender_name || 'Unknown', file_name, url, is_folder ? 1 : 0]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to share file' });
    }
});

router.delete('/student/shared-file/:id', async (req, res) => {
    const { id } = req.params;
    const { student_id } = req.query;
    if (!id || !student_id) return res.status(400).json({ error: 'id and student_id are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'DELETE FROM shared_files WHERE id = ? AND recipient_student_id = ?',
            [Number(id), student_id]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete shared file' });
    }
});

// ==========================================
// CS EXAM QUESTIONS (fetch from questions table)
// ==========================================
router.get('/cs-exam-questions', async (req, res) => {
    const { unit } = req.query;
    
    // FIX: Handle unit "a" for chapter 0 (special basic computer knowledge)
    // Also allow numeric units 0-8
    let unitNum = 0;
    let examIds = [];
    
    // Handle "a" as a special case (Unit 0 - Basic Computer Knowledge)
    if (unit === 'a' || unit === 'A') {
        // Support MULTIPLE exam_id formats for unit "a" (unit 0)
        examIds = [
            'cs-unit-a',      // legacy format
            'cs-u-a-exam',    // alternate format  
            'cs-unit-0',      // numeric 0 format
            'cs-u0-exam',    // numeric 0 alternate
            'unit-0',         // simple format
            'unit-a'          // another variant
        ];
        unitNum = 0; // treat as unit 0 internally
    } else {
        // Try parsing as numeric
        const parsed = parseInt(unit, 10);
        if (isNaN(parsed) || parsed < 0 || parsed > 8) {
            return res.status(400).json({ error: 'Valid unit number (0-8) or "a" required' });
        }
        unitNum = parsed;
        
        // Support MULTIPLE exam_id formats:
        // - 'cs-unit-0' through 'cs-unit-8' (manual imports)
        // - 'cs-u0-exam' through 'cs-u8-exam' (import script format)
        // - 'unit-0' through 'unit-8' (simple format)
examIds = [
            `cs-unit-${unitNum}`,
            `cs-u${unitNum}-exam`,
            `unit-${unitNum}`
        ];
    }

    try {
        const connection = await getDbConnection();
        
        // Build dynamic query with proper number of placeholders
        // Use OR to support multiple exam_id formats
        let questions = [];
        let queryParams = [];
        
        if (examIds.length > 0) {
            // Create IN clause with proper placeholders: exam_id IN (?, ?, ?, ...)
            const placeholders = examIds.map(() => '?').join(', ');
            const query = `SELECT question_id AS id, question_text AS question, 
                    option_a, option_b, option_c, option_d, 
                    correct_answer AS answer, study_hint AS hint, 
                    chapter_number AS chapter
             FROM questions 
             WHERE exam_id IN (${placeholders})
             ORDER BY chapter_number, RAND()`;
            
            queryParams = examIds;
            const [rows] = await connection.execute(query, queryParams);
            
            questions = rows.map(row => ({
                question: row.question,
                options: [row.option_a, row.option_b, row.option_c, row.option_d],
                answer: row.answer,
                hint: row.hint || '',
                // FIX: Ensure chapter is never null - default to the unit number for unit 0
                chapter: row.chapter !== null ? row.chapter : unitNum
            }));
        }

        // If still no questions found, try fallback: look for questions by chapter_number
        // This handles legacy data where exam_id might not be set correctly
        if (questions.length === 0) {
            console.log('[CS Exam API] No questions found with exam_ids:', examIds, '- trying chapter fallback');
            
            const [fallbackRows] = await connection.execute(
                `SELECT question_id AS id, question_text AS question, 
                        option_a, option_b, option_c, option_d, 
                        correct_answer AS answer, study_hint AS hint, 
                        chapter_number AS chapter
                 FROM questions 
                 WHERE chapter_number = ?
                 ORDER BY RAND()`,
                [unitNum]
            );
            
            questions = fallbackRows.map(row => ({
                question: row.question,
                options: [row.option_a, row.option_b, row.option_c, row.option_d],
                answer: row.answer,
                hint: row.hint || '',
                chapter: row.chapter !== null ? row.chapter : unitNum
            }));
        }
        
        await connection.end();

        res.json({ 
            unit: unitNum,
            count: questions.length,
            questions: questions
        });
    } catch (err) {
        console.error('Error fetching CS exam questions:', err);
        res.status(500).json({ error: 'Failed to fetch exam questions' });
    }
});

// ==========================================
// STUDENT CS NOTEBOOK
// ==========================================

router.get('/student/cs-notebook', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT id, chapter, title, category, content, is_submitted, timestamp FROM turnins WHERE student_id = ? ORDER BY timestamp DESC',
            [student_id]
        );
        await connection.end();
        res.json({ notes: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load notebook entries' });
    }
});

router.post('/student/cs-notebook', async (req, res) => {
    const { student_id, chapter, title, category, content, is_submitted } = req.body;
    if (!student_id || !chapter) return res.status(400).json({ error: 'student_id and chapter required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            `INSERT INTO turnins (student_id, chapter, title, category, content, is_submitted, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               title = VALUES(title),
               category = VALUES(category),
               content = VALUES(content),
               is_submitted = VALUES(is_submitted),
               timestamp = NOW()`,
            [student_id, chapter, title || '', category || 'Reflection', content || '', is_submitted ? 1 : 0]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save notebook entry' });
    }
});

// ==========================================
// STUDENT EXAM PROGRESS (resume-on-refresh)
// ==========================================
const EXAM_PROGRESS_DDL = `CREATE TABLE IF NOT EXISTS exam_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    exam_id VARCHAR(200) NOT NULL,
    progress_json MEDIUMTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_progress (student_id, exam_id)
)`;

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
        await connection.end();
        if (rows.length === 0) return res.json({ found: false });
        res.json({ found: true, ...JSON.parse(rows[0].progress_json || '{}') });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load progress' });
    }
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
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save progress' });
    }
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
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete progress' });
    }
});

// ==========================================
// ADMIN RUBRICS
// ==========================================
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

router.get('/admin/rubrics', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await connection.execute(RUBRICS_DDL);
        const [rows] = await connection.execute('SELECT * FROM rubrics ORDER BY title ASC');
        await connection.end();
        const rubrics = rows.map(r => ({
            id: r.id,
            title: r.title,
            course: r.course,
            enableSelfGrade: !!r.enable_self_grade,
            enablePeerGrade: !!r.enable_peer_grade,
            criteria: JSON.parse(r.criteria_json || '[]'),
            totalPoints: r.total_points,
            lastUpdated: r.last_updated
        }));
        res.json({ rubrics });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load rubrics' });
    }
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
             ON DUPLICATE KEY UPDATE
               title = VALUES(title),
               course = VALUES(course),
               enable_self_grade = VALUES(enable_self_grade),
               enable_peer_grade = VALUES(enable_peer_grade),
               criteria_json = VALUES(criteria_json),
               total_points = VALUES(total_points),
               last_updated = VALUES(last_updated)`,
            [id, title, course || '', enableSelfGrade ? 1 : 0, enablePeerGrade ? 1 : 0,
             JSON.stringify(criteria || []), totalPoints || 0, lastUpdated || Date.now()]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save rubric' });
    }
});

router.delete('/admin/rubrics/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM rubrics WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete rubric' });
    }
});

// ======================================================
// REVIEW GAME QUESTIONS
// ======================================================
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

// GET /api/review-questions?chapter=Chapter+5
// Returns all questions matching the chapter/grade filter
router.get('/review-questions', async (req, res) => {
    const { chapter } = req.query;
    try {
        const connection = await getDbConnection();
        await connection.execute(REVIEW_QUESTIONS_DDL);

        let sql = 'SELECT id, chapter, grade, cat, val, q, a, d FROM review_questions';
        const params = [];

        if (chapter && chapter !== 'Ultimate Review') {
            if (chapter === 'Year 1 Review') {
                sql += ' WHERE grade = ?';
                params.push('Web Design 1');
            } else if (chapter === 'Year 2 Review') {
                sql += ' WHERE grade = ?';
                params.push('Web Design 2');
            } else {
                sql += ' WHERE chapter = ?';
                params.push(chapter);
            }
        }

        const [rows] = await connection.execute(sql, params);
        await connection.end();

        const questions = rows.map(r => ({
            ...r,
            d: typeof r.d === 'string' ? JSON.parse(r.d) : (r.d || [])
        }));
        res.json({ questions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch review questions' });
    }
});

// POST /api/admin/review-questions/seed
// Accepts { questions: [...], truncate: bool }
// truncate=true wipes the table first (used on first batch); subsequent batches pass truncate=false
router.post('/admin/review-questions/seed', async (req, res) => {
    const { questions, truncate = false } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'questions array required' });
    }
    try {
        const connection = await getDbConnection();
        await connection.execute(REVIEW_QUESTIONS_DDL);

        if (truncate) {
            await connection.execute('TRUNCATE TABLE review_questions');
        }

        // Bulk-insert the entire batch in one statement
        const placeholders = questions.map(() => '(?,?,?,?,?,?,?)').join(',');
        const values = [];
        questions.forEach(q => {
            values.push(
                q.chapter || null,
                q.grade   || null,
                q.cat     || null,
                q.val     != null ? Number(q.val) : null,
                q.q,
                q.a       || null,
                JSON.stringify(Array.isArray(q.d) ? q.d : [])
            );
        });
        await connection.execute(
            `INSERT INTO review_questions (chapter, grade, cat, val, q, a, d) VALUES ${placeholders}`,
            values
        );

        await connection.end();
        res.json({ success: true, count: questions.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to seed review questions' });
    }
});

// DELETE /api/admin/review-questions — wipe the table
router.delete('/admin/review-questions', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await connection.execute(REVIEW_QUESTIONS_DDL);
        await connection.execute('TRUNCATE TABLE review_questions');
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to clear review questions' });
    }
});

module.exports = router;
