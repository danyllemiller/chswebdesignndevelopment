// server.js

const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise'); 
const bcrypt = require('bcrypt');
const fs = require('fs'); 

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DIAGNOSTIC REQUEST LOGGER ---
// Prints every incoming request directly to your VS Code terminal
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} request on host "${req.hostname}" for URL: "${req.url}"`);
    next();
});

// --- DATABASE CONFIGURATION ---
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'chs_password',
    database: 'chs_gradebook'
};

/**
 * Smart Database Connection Helper
 * Attempts standard host connection, then automatically falls back to 
 * local UNIX socket connection if running on Linux with root privileges (sudo).
 */
async function getDbConnection() {
    try {
        // Attempt 1: Standard connection (TCP/IP)
        return await mysql.createConnection(dbConfig);
    } catch (err) {
        // Attempt 2: If TCP/IP fails, try local UNIX Socket (typical of Ubuntu/Debian root authenticated with sudo)
        if (process.platform === 'linux') {
            try {
                return await mysql.createConnection({
                    socketPath: '/var/run/mysqld/mysqld.sock',
                    user: 'root',
                    password: '',
                    database: 'chs_gradebook'
                });
            } catch (socketErr) {
                // If both fail, throw the original TCP connection error for clean reporting
                throw err;
            }
        }
        throw err;
    }
}

// Simple diagnostic check on startup
async function testDbConnection() {
    try {
        const connection = await getDbConnection();
        console.log('Database connected successfully to MariaDB: chs_gradebook');
        await connection.end();
    } catch (err) {
        console.error('Warning: Database connection failed on startup. Verify MariaDB is running:', err.message);
    }
}
testDbConnection();

// --- VIRTUAL HOST ROUTING & STATIC FILES ---
// Serves correct static folders based on which domain is accessed
app.use((req, res, next) => {
    const host = (req.hostname || '').toLowerCase();
    if (host.includes('chswebdesignndevelopment')) {
        // Route chswebdesignndevelopment.com to the test-site folder
        express.static(path.join(__dirname, 'test-site'))(req, res, next);
    } else {
        // Route digitalartsclasses.com (and any others) to the live-site folder!
        express.static(path.join(__dirname, 'live-site'))(req, res, next);
    }
});

// Resolves the bare root domain (/) to the appropriate INDEX page
app.get('/', (req, res) => {
    const host = (req.hostname || '').toLowerCase();
    let filePath = '';

    if (host.includes('chswebdesignndevelopment')) {
        filePath = path.join(__dirname, 'test-site', 'index.html');
    } else {
        filePath = path.join(__dirname, 'live-site', 'index.html');
    }

    // Safety Check: Verify the file exists physically on disk before trying to serve it
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.error(`[ROUTING ERROR] Missing Target File: ${filePath}`);
        res.status(404).send(`
            <html>
            <head>
                <title>Server Configuration Guide</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; background-color: #f8f9fa; color: #212529; text-align: center; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-top: 5px solid #dc3545; }
                    h2 { color: #dc3545; margin-top: 0; }
                    code { background: #f1f3f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 0.95em; word-break: break-all; }
                    p { line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Target File Not Found</h2>
                    <p>The Node.js server successfully routed your host <strong>${host}</strong> to the following path:</p>
                    <p><code>${filePath}</code></p>
                    <p>However, this file does not exist on your server. Please check your folder structure and make sure <strong>index.html</strong> is present in that directory.</p>
                </div>
            </body>
            </html>
        `);
    }
});


// --- AUTHENTICATION ENDPOINTS ---

// Register User (updates student record in roster with credentials)
app.post('/api/register', async (req, res) => {
    const { first_name, last_name, student_id, username, password } = req.body;
    if (!username || !password || !student_id) {
        return res.status(400).json({ error: 'Student ID, username, and password are required.' });
    }

    try {
        const connection = await getDbConnection();
        
        // Check if student exists in roster
        const [students] = await connection.execute('SELECT * FROM students WHERE student_id = ?', [student_id]);
        if (students.length === 0) {
            await connection.end();
            return res.status(400).json({ error: 'Your Student ID is not currently on the roster. Please contact your instructor.' });
        }

        const student = students[0];
        if (student.password) {
            await connection.end();
            return res.status(400).json({ error: 'This student ID has already been registered.' });
        }

        // Check if username is already taken by someone else
        const [existing] = await connection.execute('SELECT * FROM students WHERE username = ? AND student_id != ?', [username, student_id]);
        if (existing.length > 0) {
            await connection.end();
            return res.status(400).json({ error: 'Username is taken. Please select a different username.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.execute(
            'UPDATE students SET username = ?, password = ?, first_name = ?, last_name = ? WHERE student_id = ?',
            [username, hashedPassword, first_name, last_name, student_id]
        );
        
        await connection.end();
        res.json({ success: true, message: 'Registration complete!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server database error during registration.' });
    }
});

// Self-Service Reset Password (Student ID + First Name + Last Name + Username validation)
app.post('/api/reset-password', async (req, res) => {
    const { student_id, first_name, last_name, username, new_password } = req.body;
    if (!student_id || !first_name || !last_name || !username || !new_password) {
        return res.status(400).json({ error: 'All fields are required to verify identity.' });
    }

    try {
        const connection = await getDbConnection();
        
        // Verify identity
        const [students] = await connection.execute(
            'SELECT * FROM students WHERE student_id = ? AND LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?) AND LOWER(username) = LOWER(?)',
            [student_id, first_name, last_name, username]
        );

        if (students.length === 0) {
            await connection.end();
            return res.status(400).json({ error: 'Identity verification failed. Information does not match our records.' });
        }

        // Identity confirmed! Hash new password and save.
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await connection.execute(
            'UPDATE students SET password = ? WHERE student_id = ?',
            [hashedPassword, student_id]
        );

        await connection.end();
        res.json({ success: true, message: 'Password reset completed! You can now log in.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error occurred during password reset.' });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const connection = await getDbConnection();
        const [results] = await connection.execute('SELECT * FROM students WHERE username = ?', [username]);

        if (results.length === 0) {
            await connection.end();
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = results[0];
        
        if (!user.password) {
            await connection.end();
            return res.status(401).json({ error: 'Your account has been reset by the instructor. Please register your account.' });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            await connection.end();
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Configure shift details (Regular shift triggers daily prompt)
        const isRegular = true; 
        const shift = { isRegular: isRegular };

        await connection.end();
        res.json({
            success: true,
            user: {
                student_id: user.student_id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                section_id: user.section_id,
                role: user.role || 'student'
            },
            shift
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login engine error' });
    }
});

// Record Clock In
app.post('/api/clockin', async (req, res) => {
    const { student_id, section_id, type, answer } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO clockins (student_id, section_id, type, answer, timestamp) VALUES (?, ?, ?, ?, NOW())',
            [student_id, section_id, type, answer]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Clock in failed to record.' });
    }
});


// ==========================================
// --- NEW: EXAM RUNTIME ENDPOINTS ---
// ==========================================

// 1. Verify User Session for Exam (The Security Guard)
app.post('/api/verify-user', async (req, res) => {
    const { studentEmail } = req.body; // In your DB this matches the 'username' column
    try {
        const connection = await getDbConnection();
        // Check the students table to see if they are a valid rostered student
        const [rows] = await connection.execute('SELECT * FROM students WHERE username = ?', [studentEmail]);
        await connection.end();
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ error: "Unauthorized" });
        }
    } catch (err) {
        console.error("Auth Error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// 2. Submit Exam (The Test Host)
app.post('/api/submit-exam', async (req, res) => {
    const { student_id, exam_id, score, total_points } = req.body;
    try {
        const connection = await getDbConnection();
        // Mimics your save-grade schema exactly to prevent crashes
        await connection.execute(
            'INSERT INTO responses (student_id, exam_id, score, total_points, timestamp) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()',
            [student_id, exam_id, score, total_points || 100]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error("Submission Error:", err);
        res.status(500).json({ error: "Failed to save exam" });
    }
});


// --- PROGRESS & GRADES ROUTES ---

app.get('/api/student/grades', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const [responses] = await connection.execute(
            `SELECT r.*, e.title, e.total_points FROM responses r
             JOIN exams e ON r.exam_id = e.exam_id
             WHERE r.student_id = ?`,
            [student_id]
        );

        let pointsEarned = 0;
        let totalPossible = 0;
        responses.forEach(r => {
            pointsEarned += r.score;
            totalPossible += r.total_points;
        });

        const percent = totalPossible > 0 ? Math.round((pointsEarned / totalPossible) * 100) : 100;

        await connection.end();
        res.json({
            summary: {
                percent,
                completedCount: responses.length,
                pointsEarned
            },
            responses
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch grades.' });
    }
});


// --- EXAM & QUESTION ROUTES ---

// UPDATED for Adaptive Exam Engine
app.get('/api/questions', async (req, res) => {
    const exam_id = req.query.exam_id;
    try {
        const connection = await getDbConnection();
        
        // Fetch the question pool as a flat array
        const [questions] = await connection.execute(
            'SELECT question_text, option_a, option_b, option_c, option_d FROM questions WHERE exam_id = ?',
            [exam_id]
        );
        
        await connection.end();
        res.json(questions); // Returns array directly for the engine
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch questions from database.' });
    }
});


// --- TEACHER ADMIN & ROSTER ROUTES ---

// Fetch full roster list
app.get('/api/admin/roster', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute('SELECT * FROM students ORDER BY last_name ASC, first_name ASC');
        await connection.end();
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch roster.' });
    }
});

// Single or Bulk Roster Entry
app.post('/api/admin/upload-roster', async (req, res) => {
    const students = req.body;
    if (!Array.isArray(students)) {
        return res.status(400).json({ error: 'Invalid roster payload. Array expected.' });
    }

    try {
        const connection = await getDbConnection();
        for (const s of students) {
            await connection.execute(
                `INSERT INTO students (student_id, first_name, last_name, section_id) 
                 VALUES (?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), section_id = VALUES(section_id)`,
                [s.student_id, s.first_name, s.last_name, s.section_id]
            );
        }
        await connection.end();
        res.json({ success: true, message: 'Roster records loaded!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update roster metadata.' });
    }
});

// Wipe registration credentials (keeps them in roster so they can re-register)
app.post('/api/admin/reset-student', async (req, res) => {
    const { student_id } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute('UPDATE students SET username = NULL, password = NULL WHERE student_id = ?', [student_id]);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset student credentials.' });
    }
});

// Delete student from roster
app.delete('/api/admin/delete-student', async (req, res) => {
    const { student_id } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM students WHERE student_id = ?', [student_id]);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete student.' });
    }
});

// ==========================================
// --- NEW MASTER GRADEBOOK API ENDPOINTS ---
// ==========================================

// 1. Fetch Complete Master Gradebook Data
app.get('/api/admin/master-gradebook-data', async (req, res) => {
    try {
        const connection = await getDbConnection();
        
        const [studentRows] = await connection.execute('SELECT * FROM students');
        const [examRows] = await connection.execute('SELECT * FROM exams');
        const [gradeRows] = await connection.execute('SELECT * FROM responses');
        
        let assignments = {};
        examRows.forEach(row => {
            // Convert database DATE representation objects cleanly to safe frontend ISO strings
            let cleanDueDate = row.due_date;
            if (cleanDueDate instanceof Date) {
                cleanDueDate = cleanDueDate.toISOString().split('T')[0];
            }
            assignments[row.exam_id] = {
                maxPoints: row.total_points,
                dueDate: cleanDueDate || "",
                targetCourse: row.course_id || "All",
                instructions: row.instructions || ""
            };
        });

        let grades = {};
        gradeRows.forEach(row => {
            if (!grades[row.student_id]) grades[row.student_id] = {};
            grades[row.student_id][row.exam_id] = {
                score: row.score,
                max: row.total_points,
                timestamp: row.timestamp
            };
        });

        await connection.end();
        res.json({ students: studentRows, assignments: assignments, grades: grades, calendarConfig: null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database fetch failed' });
    }
});

// 2. Save Inline Grade Edit
app.post('/api/admin/save-grade', async (req, res) => {
    const { student_id, exam_id, score, total_points } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO responses (student_id, exam_id, score, total_points, timestamp) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()',
            [student_id, exam_id, score, total_points]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save grade' });
    }
});

// 3. Batch Update Grades (from Google Sheets Sync)
app.post('/api/admin/batch-update-grades', async (req, res) => {
    const { batch } = req.body; 
    try {
        const connection = await getDbConnection();
        for (const record of batch) {
            for (const [exam_id, data] of Object.entries(record.updates)) {
                await connection.execute(
                    'INSERT INTO responses (student_id, exam_id, score, total_points, timestamp) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()',
                    [record.studentId, exam_id, data.score, data.max]
                );
            }
        }
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Batch update failed' });
    }
});

// 4. Create New Assignment Column
app.post('/api/admin/save-assignment', async (req, res) => {
    let { exam_id, title, total_points, due_date, instructions, course_id } = req.body;
    if (!due_date || due_date.trim() === '') due_date = null;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'INSERT INTO exams (exam_id, title, total_points, due_date, instructions, course_id) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), total_points=VALUES(total_points), due_date=VALUES(due_date), instructions=VALUES(instructions), course_id=VALUES(course_id)',
            [exam_id, title, total_points, due_date, instructions, course_id]
        );
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save assignment' });
    }
});

// 5. Edit Assignment Column
app.post('/api/admin/edit-assignment', async (req, res) => {
    let { old_exam_id, exam_id, title, total_points, due_date, instructions, course_id } = req.body;
    if (!due_date || due_date.trim() === '') due_date = null;
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'UPDATE exams SET exam_id=?, title=?, total_points=?, due_date=?, instructions=?, course_id=? WHERE exam_id=?',
            [exam_id, title, total_points, due_date, instructions, course_id, old_exam_id]
        );
        if (old_exam_id !== exam_id) {
            await connection.execute('UPDATE responses SET exam_id=? WHERE exam_id=?', [exam_id, old_exam_id]);
        }
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to edit assignment' });
    }
});

// 6. Delete Assignment Column
app.post('/api/admin/delete-assignment', async (req, res) => {
    const { exam_id } = req.body;
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM exams WHERE exam_id=?', [exam_id]);
        await connection.execute('DELETE FROM responses WHERE exam_id=?', [exam_id]);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete assignment' });
    }
});


// --- GLOBAL 404 FALLBACK ---
app.use((req, res) => {
    res.status(404).send('404 File Not Found on Guild Server');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Guild Server listening on port ${PORT}`);
});