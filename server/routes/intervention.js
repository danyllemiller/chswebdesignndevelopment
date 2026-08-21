const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── User sticker upload ───────────────────────────────────────────────────────
const STICKERS_ROOT = path.join(__dirname, '../../images/stickers');

const stickerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sid = req.query.student_id;
        if (!sid) return cb(new Error('student_id required'));
        const dir = path.join(STICKERS_ROOT, `user_${sid}`);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
        // Avoid collisions with a short timestamp prefix
        cb(null, `${Date.now()}_${base}${ext}`);
    }
});

const stickerUpload = multer({
    storage: stickerStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /\.(png|jpe?g|gif|webp|svg)$/i.test(path.extname(file.originalname));
        cb(null, ok);
    }
});

// GET  /api/intervention/stickers?student_id=xxx  — list uploaded stickers
router.get('/intervention/stickers', (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    const dir = path.join(STICKERS_ROOT, `user_${student_id}`);
    if (!fs.existsSync(dir)) return res.json({ stickers: [] });
    try {
        const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));
        res.json({ stickers: files.map(f => ({ filename: f, url: `/images/stickers/user_${student_id}/${f}` })) });
    } catch { res.json({ stickers: [] }); }
});

// POST /api/intervention/stickers/upload?student_id=xxx  — upload a sticker
router.post('/intervention/stickers/upload', (req, res) => {
    stickerUpload.single('sticker')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const sid = req.query.student_id;
        if (!sid) return res.status(400).json({ error: 'student_id required' });
        res.json({ success: true, filename: req.file.filename, url: `/images/stickers/user_${sid}/${req.file.filename}` });
    });
});

// DELETE /api/intervention/stickers/:filename?student_id=xxx  — remove a sticker
router.delete('/intervention/stickers/:filename', (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    const filePath = path.join(STICKERS_ROOT, `user_${student_id}`, req.params.filename);
    // Prevent path traversal
    if (!filePath.startsWith(STICKERS_ROOT)) return res.status(400).json({ error: 'Invalid path' });
    try { fs.unlinkSync(filePath); } catch { /* already gone */ }
    res.json({ success: true });
});

// ── Built-in growth mindset prompts, one per scheduled intervention day ──────
const BUILT_IN_PROMPTS = [
    "What's one thing you've been avoiding because you're afraid of being bad at it? What's one small step you could take toward it today?",
    "Describe a time you struggled with something and kept going anyway. What kept you going?",
    "Every time you practice something difficult, your brain physically grows new connections. What hard thing are you going to practice today?",
    "What's the difference between 'I'm not good at this' and 'I'm not good at this yet'? How does one word change your thinking?",
    "Name one person you know who has a growth mindset. What do they do that someone with a fixed mindset wouldn't?",
    "When you get a bad grade, what's your first instinct? What would a growth mindset response look like instead?",
    "What's something you've gotten better at — even if you're still not great at it? What did that progress actually take?",
    "Describe a mistake you made recently. What did it teach you?",
    "What's harder for you: asking for help or admitting you don't understand something? Why?",
    "Every expert was once a beginner. Who is someone you look up to who had to work hard to get where they are?",
    "What's one class where you feel like you've hit a wall? Name one strategy you haven't tried yet.",
    "Think about feedback you received that stung at first. Looking back, was any of it useful? What made it hard to hear?",
    "When something gets really hard, what do you actually do? List three strategies — 'give up' can't be one of them.",
    "Is there a difference between being smart and working smart? What does each one look like in real life?",
    "Describe your ideal environment for learning. What would make it easier for you to focus and grow?",
    "What's a goal you haven't made much progress on? Be honest — what's actually getting in the way?",
    "Failure is not the opposite of success — it's part of it. Do you agree? Give a real example from your own life.",
    "When someone is better than you at something you care about, does it motivate you or deflate you? Why?",
    "What's a subject you feel like you have zero talent for? What would happen if you spent 20 extra minutes a week on it for a month?",
    "Describe a time a teacher's feedback actually helped you improve. What made that feedback land differently?",
    "What story do you tell yourself when things get hard? ('I can't do this,' 'this is boring,' 'I'm just not good at it.') Is that story actually true?",
    "What one habit — good or bad — has the biggest impact on your grades right now? What would you change if you could?",
    "Picture yourself 10 years from now. What kind of work are they doing? What skills does that person have that you're still building today?",
    "Do you tend to avoid challenges or lean into them? Give a specific example from this school year.",
    "What's the best advice anyone has given you about school or learning? Did you actually take it?",
    "Describe a moment this year where you surprised yourself — either by doing better than you expected or by how hard you tried.",
    "You don't have to be great to start, but you have to start to be great. What have you been waiting to feel ready for?",
    "How do you define success? Has your definition changed since you started high school?",
    "What's a class where you feel genuinely confident? What did it take to get there? Can you apply that same process somewhere harder?",
    "If your effort level this week were a letter grade, what grade would you give yourself? What would it take to move it up one letter?",
    "What do you enjoy learning about outside of school? What makes that feel different from learning inside a classroom?",
    "Who in your life makes you feel like you can do hard things? What do they say or do that actually helps?",
    "What does 'doing your best' mean to you? Is there a gap between what your best looks like and what you actually bring most days?",
    "Think about a time you helped someone else understand something. What did explaining it teach you about your own understanding?",
    "What's one thing you'd do differently if you could start this school year over? What does that tell you about next year?",
    "What's one mindset or habit you want to carry into next year? How will you make sure you actually follow through?",
    "You showed up 37 times. That's not nothing. What do you know about yourself as a learner that you didn't know at the start of this class?"
];

// ── DDL helpers (created on first request) ───────────────────────────────────
const DDL = `
CREATE TABLE IF NOT EXISTS intervention_enrollments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    student_id  VARCHAR(50) NOT NULL,
    section_id  VARCHAR(50) NOT NULL DEFAULT 'INTV',
    school_year VARCHAR(20),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_enroll (student_id, section_id)
);
CREATE TABLE IF NOT EXISTS intervention_assignments (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    day_number   INT NOT NULL COMMENT '1-37',
    title        VARCHAR(255) NOT NULL,
    instructions TEXT,
    due_date     DATE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS intervention_submissions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    student_id    VARCHAR(50) NOT NULL,
    assignment_id INT NOT NULL,
    response_text TEXT,
    submitted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    passed        TINYINT(1) DEFAULT 1,
    UNIQUE KEY uq_sub (student_id, assignment_id)
);
CREATE TABLE IF NOT EXISTS intervention_goals (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    student_id  VARCHAR(50) NOT NULL,
    cadence     ENUM('daily','weekly','unit','yearly') NOT NULL,
    title       VARCHAR(255) NOT NULL,
    notes       TEXT,
    target_date DATE,
    achieved_at TIMESTAMP NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS intervention_journal (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    prompt     TEXT,
    content    TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_journal (student_id, entry_date)
);
CREATE TABLE IF NOT EXISTS intervention_prompt_overrides (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    day_number INT NOT NULL UNIQUE COMMENT '1-37',
    prompt     TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS student_grade_log (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    student_id   VARCHAR(50) NOT NULL,
    period_label VARCHAR(50),
    class_name   VARCHAR(100),
    assignment   VARCHAR(255),
    category     VARCHAR(100),
    score        DECIMAL(6,2),
    max_score    DECIMAL(6,2) DEFAULT 100,
    grade_date   DATE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

async function ensureTables(connection) {
    for (const stmt of DDL.split(';').map(s => s.trim()).filter(Boolean)) {
        await connection.execute(stmt);
    }
    // Migrations for existing tables
    await connection.execute(
        `ALTER TABLE student_grade_log ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT NULL`
    ).catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function promptForDay(dayNumber, override) {
    if (override) return override;
    const idx = Math.max(0, Math.min(36, (dayNumber || 1) - 1));
    return BUILT_IN_PROMPTS[idx];
}

// ════════════════════════════════════════════════════════════════════════════
// STUDENT ROUTES
// ════════════════════════════════════════════════════════════════════════════

// Is this student enrolled in intervention?
router.get('/intervention/status', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            'SELECT id, section_id, school_year FROM intervention_enrollments WHERE student_id = ? LIMIT 1',
            [student_id]
        );
        await connection.release();
        res.json({ enrolled: rows.length > 0, enrollment: rows[0] || null });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to check enrollment' }); }
});

// Today's growth mindset prompt
router.get('/intervention/prompt', async (req, res) => {
    const { day_number } = req.query;
    const dayNum = parseInt(day_number, 10) || 1;
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [overrides] = await connection.execute(
            'SELECT prompt FROM intervention_prompt_overrides WHERE day_number = ? LIMIT 1', [dayNum]
        );
        await connection.release();
        const override = overrides.length ? overrides[0].prompt : null;
        res.json({ day_number: dayNum, prompt: promptForDay(dayNum, override), is_override: !!override });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch prompt' }); }
});

// All 37 prompts (for the planner calendar)
router.get('/intervention/prompts-all', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [overrides] = await connection.execute('SELECT day_number, prompt FROM intervention_prompt_overrides');
        await connection.release();
        const overrideMap = {};
        overrides.forEach(r => { overrideMap[r.day_number] = r.prompt; });
        const prompts = BUILT_IN_PROMPTS.map((p, i) => ({
            day_number: i + 1,
            prompt: overrideMap[i + 1] || p,
            is_override: !!(overrideMap[i + 1])
        }));
        res.json({ prompts });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch prompts' }); }
});

// Student's assignments + completion status
router.get('/intervention/assignments', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [assignments] = await connection.execute(
            'SELECT * FROM intervention_assignments ORDER BY day_number ASC'
        );
        const [submissions] = await connection.execute(
            'SELECT assignment_id, submitted_at, passed FROM intervention_submissions WHERE student_id = ?',
            [student_id]
        );
        await connection.release();
        const subMap = {};
        submissions.forEach(s => { subMap[s.assignment_id] = s; });
        const result = assignments.map(a => ({
            ...a,
            submitted: !!subMap[a.id],
            submitted_at: subMap[a.id]?.submitted_at || null,
            passed: subMap[a.id]?.passed ?? null
        }));
        res.json({ assignments: result });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch assignments' }); }
});

// Submit / complete an assignment (auto-passes)
router.post('/intervention/submit', async (req, res) => {
    const { student_id, assignment_id, response_text } = req.body;
    if (!student_id || !assignment_id) return res.status(400).json({ error: 'student_id and assignment_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute(
            `INSERT INTO intervention_submissions (student_id, assignment_id, response_text, passed)
             VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE response_text = VALUES(response_text), submitted_at = NOW(), passed = 1`,
            [student_id, assignment_id, response_text || '']
        );
        await connection.release();
        res.json({ success: true, passed: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to submit assignment' }); }
});

// Journal — get entries (all or for a specific date)
router.get('/intervention/journal', async (req, res) => {
    const { student_id, date } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        let rows;
        if (date) {
            [rows] = await connection.execute(
                'SELECT * FROM intervention_journal WHERE student_id = ? AND entry_date = ?',
                [student_id, date]
            );
        } else {
            [rows] = await connection.execute(
                'SELECT * FROM intervention_journal WHERE student_id = ? ORDER BY entry_date DESC',
                [student_id]
            );
        }
        await connection.release();
        res.json({ entries: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch journal' }); }
});

// Journal — save/update an entry
router.post('/intervention/journal', async (req, res) => {
    const { student_id, date, content, prompt } = req.body;
    if (!student_id || !date) return res.status(400).json({ error: 'student_id and date required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute(
            `INSERT INTO intervention_journal (student_id, entry_date, prompt, content)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE content = VALUES(content), prompt = COALESCE(VALUES(prompt), prompt), updated_at = NOW()`,
            [student_id, date, prompt || null, content || '']
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save journal entry' }); }
});

// Goals — get all goals for a student
router.get('/intervention/goals', async (req, res) => {
    const { student_id, cadence } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        let rows;
        if (cadence) {
            [rows] = await connection.execute(
                'SELECT * FROM intervention_goals WHERE student_id = ? AND cadence = ? ORDER BY created_at DESC',
                [student_id, cadence]
            );
        } else {
            [rows] = await connection.execute(
                'SELECT * FROM intervention_goals WHERE student_id = ? ORDER BY cadence ASC, created_at DESC',
                [student_id]
            );
        }
        await connection.release();
        res.json({ goals: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch goals' }); }
});

// Goals — create
router.post('/intervention/goals', async (req, res) => {
    const { student_id, cadence, title, notes, target_date } = req.body;
    if (!student_id || !cadence || !title) return res.status(400).json({ error: 'student_id, cadence, and title required' });
    if (!['daily','weekly','unit','yearly'].includes(cadence)) return res.status(400).json({ error: 'Invalid cadence' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [result] = await connection.execute(
            'INSERT INTO intervention_goals (student_id, cadence, title, notes, target_date) VALUES (?, ?, ?, ?, ?)',
            [student_id, cadence, title, notes || null, target_date || null]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create goal' }); }
});

// Goals — mark achieved / unachieved
router.put('/intervention/goals/:id', async (req, res) => {
    const { id } = req.params;
    const { student_id, achieved } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute(
            'UPDATE intervention_goals SET achieved_at = ? WHERE id = ? AND student_id = ?',
            [achieved ? new Date() : null, id, student_id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update goal' }); }
});

// Goals — delete
router.delete('/intervention/goals/:id', async (req, res) => {
    const { id } = req.params;
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute(
            'DELETE FROM intervention_goals WHERE id = ? AND student_id = ?', [id, student_id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete goal' }); }
});

// Grade log — get all self-reported grades
router.get('/intervention/grade-log', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            'SELECT * FROM student_grade_log WHERE student_id = ? ORDER BY grade_date DESC, class_name ASC',
            [student_id]
        );
        await connection.release();
        res.json({ grades: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch grade log' }); }
});

// Grade log — add or update an entry
router.post('/intervention/grade-log', async (req, res) => {
    const { student_id, period_label, class_name, assignment, category, score, max_score, grade_date } = req.body;
    if (!student_id || !period_label) return res.status(400).json({ error: 'student_id and period_label required' });
    // Class name is optional metadata on top of the period -- fall back to the
    // period code itself so the row always has a readable label either way.
    const resolvedClassName = (class_name && String(class_name).trim()) || period_label;
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [result] = await connection.execute(
            `INSERT INTO student_grade_log (student_id, period_label, class_name, assignment, category, score, max_score, grade_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, period_label, resolvedClassName, assignment || null, category || null,
             score != null ? parseFloat(score) : null, max_score != null ? parseFloat(max_score) : 100,
             grade_date || new Date().toISOString().split('T')[0]]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save grade entry' }); }
});

// Grade log — delete an entry
router.delete('/intervention/grade-log/:id', async (req, res) => {
    const { id } = req.params;
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute(
            'DELETE FROM student_grade_log WHERE id = ? AND student_id = ?', [id, student_id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete grade entry' }); }
});

// ── Test / Exam tracker (DB-backed so it survives device changes) ─────────────

const TESTS_DDL = `
CREATE TABLE IF NOT EXISTS intervention_tests (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    student_id   VARCHAR(50) NOT NULL,
    class_name   VARCHAR(100) NOT NULL,
    test_type    ENUM('test','quiz','project','presentation','AP','SAT','ACT','other') DEFAULT 'test',
    title        VARCHAR(255),
    test_date    DATE NOT NULL,
    studied      TINYINT(1) DEFAULT 0,
    notes        TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_date (student_id, test_date)
)`;

// Get upcoming (and recent) tests for a student
router.get('/intervention/tests', async (req, res) => {
    const { student_id, all } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(TESTS_DDL);
        const cutoff = all ? '1970-01-01' : new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const [rows] = await connection.execute(
            'SELECT * FROM intervention_tests WHERE student_id = ? AND test_date >= ? ORDER BY test_date ASC',
            [student_id, cutoff]
        );
        await connection.release();
        res.json({ tests: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch tests' }); }
});

// Add a test/quiz
router.post('/intervention/tests', async (req, res) => {
    const { student_id, class_name, test_type, title, test_date, notes } = req.body;
    if (!student_id || !class_name || !test_date) return res.status(400).json({ error: 'student_id, class_name, and test_date required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(TESTS_DDL);
        const [result] = await connection.execute(
            'INSERT INTO intervention_tests (student_id, class_name, test_type, title, test_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [student_id, class_name, test_type || 'test', title || null, test_date, notes || null]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to add test' }); }
});

// Toggle studied / update notes
router.put('/intervention/tests/:id', async (req, res) => {
    const { id } = req.params;
    const { student_id, studied, notes, class_name, test_type, title, test_date } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(TESTS_DDL);
        if (class_name !== undefined || test_type !== undefined || title !== undefined || test_date !== undefined) {
            // Full edit
            await connection.execute(
                `UPDATE intervention_tests SET
                    class_name = COALESCE(?, class_name),
                    test_type  = COALESCE(?, test_type),
                    title      = COALESCE(?, title),
                    test_date  = COALESCE(?, test_date),
                    studied    = COALESCE(?, studied),
                    notes      = COALESCE(?, notes)
                 WHERE id = ? AND student_id = ?`,
                [class_name ?? null, test_type ?? null, title ?? null, test_date ?? null,
                 studied != null ? (studied ? 1 : 0) : null, notes ?? null, id, student_id]
            );
        } else {
            // Toggle-only (studied/notes)
            await connection.execute(
                'UPDATE intervention_tests SET studied = COALESCE(?, studied), notes = COALESCE(?, notes) WHERE id = ? AND student_id = ?',
                [studied != null ? (studied ? 1 : 0) : null, notes ?? null, id, student_id]
            );
        }
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update test' }); }
});

// Delete a test
router.delete('/intervention/tests/:id', async (req, res) => {
    const { id } = req.params;
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(TESTS_DDL);
        await connection.execute('DELETE FROM intervention_tests WHERE id = ? AND student_id = ?', [id, student_id]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete test' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════════════════════════════════════════

// Enrolled students with completion stats.
// Uses LEFT JOIN on students so intervention-only students (section_id='INTV') are included
// even if they are not in any WD/CS section.
router.get('/admin/intervention/roster', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(`
            SELECT
                ie.student_id,
                COALESCE(s.first_name, ie.student_id) AS first_name,
                COALESCE(s.last_name,  '')             AS last_name,
                s.username,
                s.section_id AS primary_section,
                ie.section_id AS intv_section,
                ie.school_year,
                ie.enrolled_at,
                COUNT(DISTINCT isub.assignment_id)  AS submissions_count,
                COUNT(DISTINCT ij.id)               AS journal_count,
                COUNT(DISTINCT ig.id)               AS goal_count
            FROM intervention_enrollments ie
            LEFT JOIN students s ON ie.student_id = s.student_id
            LEFT JOIN intervention_submissions isub ON isub.student_id = ie.student_id AND isub.passed = 1
            LEFT JOIN intervention_journal ij ON ij.student_id = ie.student_id
            LEFT JOIN intervention_goals   ig ON ig.student_id = ie.student_id
            GROUP BY ie.student_id, s.first_name, s.last_name, s.username,
                     s.section_id, ie.section_id, ie.school_year, ie.enrolled_at
            ORDER BY last_name ASC, first_name ASC
        `);
        await connection.release();
        res.json({ students: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch intervention roster' }); }
});

// Enroll a student. Accepts optional first_name/last_name/password so that
// intervention-only students (who have no WD/CS enrollment) can be created
// in the students table at the same time with section_id = 'INTV'.
router.post('/admin/intervention/enroll', async (req, res) => {
    const { student_id, section_id, school_year, first_name, last_name, username, password } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);

        // Check if the student exists in the main roster
        const [existing] = await connection.execute(
            'SELECT student_id FROM students WHERE student_id = ?', [student_id]
        );

        if (existing.length === 0) {
            // Intervention-only student — create a minimal row in students table
            // so they can log in and the roster query finds them
            const bcrypt = require('bcrypt');
            const rawPwd = password || student_id; // default password = their ID
            const hash = await bcrypt.hash(rawPwd, 10);
            const uname = username || student_id;
            await connection.execute(
                `INSERT IGNORE INTO students (student_id, first_name, last_name, username, password_hash, section_id)
                 VALUES (?, ?, ?, ?, ?, 'INTV')`,
                [student_id, first_name || '', last_name || '', uname, hash]
            );
        }

        await connection.execute(
            `INSERT INTO intervention_enrollments (student_id, section_id, school_year) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE school_year = VALUES(school_year)`,
            [student_id, section_id || 'INTV', school_year || null]
        );
        await connection.release();
        res.json({ success: true, created_student: existing.length === 0 });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to enroll student' }); }
});

// Unenroll a student
router.delete('/admin/intervention/enroll', async (req, res) => {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute(
            'DELETE FROM intervention_enrollments WHERE student_id = ?', [student_id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to unenroll student' }); }
});

// List all assignments
router.get('/admin/intervention/assignments', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            'SELECT * FROM intervention_assignments ORDER BY day_number ASC'
        );
        await connection.release();
        res.json({ assignments: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch assignments' }); }
});

// Create or update an assignment
router.post('/admin/intervention/assignments', async (req, res) => {
    const { id, day_number, title, instructions, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        if (id) {
            await connection.execute(
                'UPDATE intervention_assignments SET day_number=?, title=?, instructions=?, due_date=? WHERE id=?',
                [day_number || null, title, instructions || null, due_date || null, id]
            );
            await connection.release();
            return res.json({ success: true, id });
        }
        const [result] = await connection.execute(
            'INSERT INTO intervention_assignments (day_number, title, instructions, due_date) VALUES (?, ?, ?, ?)',
            [day_number || null, title, instructions || null, due_date || null]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save assignment' }); }
});

// Update an existing assignment
router.put('/admin/intervention/assignments/:id', async (req, res) => {
    const { id } = req.params;
    const { day_number, title, instructions, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute(
            'UPDATE intervention_assignments SET day_number=?, title=?, instructions=?, due_date=? WHERE id=?',
            [day_number || null, title, instructions || null, due_date || null, id]
        );
        await connection.release();
        res.json({ success: true, id: Number(id) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update assignment' }); }
});

// Bulk import assignments from CSV/text (array of objects)
router.post('/admin/intervention/assignments/import', async (req, res) => {
    const { assignments } = req.body;
    if (!Array.isArray(assignments) || assignments.length === 0)
        return res.status(400).json({ error: 'assignments array required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        let count = 0;
        for (const a of assignments) {
            if (!a.title) continue;
            await connection.execute(
                'INSERT INTO intervention_assignments (day_number, title, instructions, due_date) VALUES (?, ?, ?, ?)',
                [a.day_number || null, a.title, a.instructions || null, a.due_date || null]
            );
            count++;
        }
        await connection.release();
        res.json({ success: true, imported: count });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to import assignments' }); }
});

// Delete an assignment
router.delete('/admin/intervention/assignments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute('DELETE FROM intervention_assignments WHERE id = ?', [id]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete assignment' }); }
});

// Who completed what — completion matrix
router.get('/admin/intervention/submissions', async (req, res) => {
    const { assignment_id, student_id } = req.query;
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        let rows;
        if (assignment_id) {
            [rows] = await connection.execute(
                `SELECT isub.*, s.first_name, s.last_name, s.section_id
                 FROM intervention_submissions isub
                 JOIN students s ON isub.student_id = s.student_id
                 WHERE isub.assignment_id = ? ORDER BY s.last_name ASC`,
                [assignment_id]
            );
        } else if (student_id) {
            [rows] = await connection.execute(
                `SELECT isub.*, ia.title, ia.day_number
                 FROM intervention_submissions isub
                 JOIN intervention_assignments ia ON isub.assignment_id = ia.id
                 WHERE isub.student_id = ? ORDER BY ia.day_number ASC`,
                [student_id]
            );
        } else {
            [rows] = await connection.execute(
                `SELECT isub.*, s.first_name, s.last_name, ia.title, ia.day_number
                 FROM intervention_submissions isub
                 JOIN students s ON isub.student_id = s.student_id
                 JOIN intervention_assignments ia ON isub.assignment_id = ia.id
                 ORDER BY ia.day_number ASC, s.last_name ASC`
            );
        }
        await connection.release();
        res.json({ submissions: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch submissions' }); }
});

// Read a student's journal entries (teacher view)
router.get('/admin/intervention/journal/:student_id', async (req, res) => {
    const { student_id } = req.params;
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            'SELECT * FROM intervention_journal WHERE student_id = ? ORDER BY entry_date DESC',
            [student_id]
        );
        await connection.release();
        res.json({ entries: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch journal' }); }
});

// Read a student's goals (teacher view)
router.get('/admin/intervention/goals/:student_id', async (req, res) => {
    const { student_id } = req.params;
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            'SELECT * FROM intervention_goals WHERE student_id = ? ORDER BY cadence ASC, created_at DESC',
            [student_id]
        );
        await connection.release();
        res.json({ goals: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch goals' }); }
});

// Get all 37 prompts with override status (for admin prompt editor)
router.get('/admin/intervention/prompts', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [overrides] = await connection.execute(
            'SELECT day_number, prompt FROM intervention_prompt_overrides'
        );
        await connection.release();
        const overrideMap = {};
        overrides.forEach(r => { overrideMap[r.day_number] = r.prompt; });
        const prompts = BUILT_IN_PROMPTS.map((p, i) => ({
            day_number: i + 1,
            built_in: p,
            override: overrideMap[i + 1] || null,
            active: overrideMap[i + 1] || p
        }));
        res.json({ prompts });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch prompts' }); }
});

// Set or clear a prompt override for a specific day
router.post('/admin/intervention/prompts/:day_number', async (req, res) => {
    const dayNum = parseInt(req.params.day_number, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 37)
        return res.status(400).json({ error: 'day_number must be 1-37' });
    const { prompt } = req.body;
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        if (prompt && String(prompt).trim()) {
            await connection.execute(
                `INSERT INTO intervention_prompt_overrides (day_number, prompt) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE prompt = VALUES(prompt), updated_at = NOW()`,
                [dayNum, String(prompt).trim()]
            );
        } else {
            await connection.execute(
                'DELETE FROM intervention_prompt_overrides WHERE day_number = ?', [dayNum]
            );
        }
        await connection.release();
        res.json({ success: true, reverted_to_built_in: !prompt });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update prompt' }); }
});


// ════════════════════════════════════════════════════════════════════════════
// PLANNER SYNC — preferences, todos, habits
// ════════════════════════════════════════════════════════════════════════════

const PLANNER_DDL = [
`CREATE TABLE IF NOT EXISTS planner_preferences (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    student_id     VARCHAR(50) NOT NULL UNIQUE,
    schedule_json  TEXT,
    colors_json    TEXT,
    stickers_json  TEXT,
    decor_json     TEXT,
    countdowns_json TEXT,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student (student_id)
)`,
`CREATE TABLE IF NOT EXISTS planner_todos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    student_id  VARCHAR(50) NOT NULL,
    todo_id     VARCHAR(80) NOT NULL,
    text_val    TEXT NOT NULL,
    due_date    DATE,
    priority    VARCHAR(20) DEFAULT 'normal',
    item_type   VARCHAR(20) DEFAULT 'todo',
    done        TINYINT(1) DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_todo (student_id, todo_id),
    INDEX idx_student (student_id)
)`,
`CREATE TABLE IF NOT EXISTS planner_habits (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    student_id  VARCHAR(50) NOT NULL,
    habit_id    VARCHAR(80) NOT NULL,
    text_val    VARCHAR(255) NOT NULL,
    color       VARCHAR(30),
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_habit (student_id, habit_id),
    INDEX idx_student (student_id)
)`,
`CREATE TABLE IF NOT EXISTS planner_habit_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    student_id  VARCHAR(50) NOT NULL,
    habit_id    VARCHAR(80) NOT NULL,
    log_date    DATE NOT NULL,
    UNIQUE KEY uq_log (student_id, habit_id, log_date),
    INDEX idx_student (student_id)
)`
];

async function ensurePlannerTables(connection) {
    for (const stmt of PLANNER_DDL) {
        await connection.execute(stmt);
    }
    // Add item_type column to planner_todos if it doesn't exist yet (migration for existing tables)
    await connection.execute(`
        ALTER TABLE planner_todos ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'todo'
    `).catch(() => {});
    // Add grade_categories_json column to planner_preferences if it doesn't exist yet
    await connection.execute(`
        ALTER TABLE planner_preferences ADD COLUMN IF NOT EXISTS grade_categories_json LONGTEXT DEFAULT NULL
    `).catch(() => {});
    // Add period_labels_json column to planner_preferences if it doesn't exist yet
    await connection.execute(`
        ALTER TABLE planner_preferences ADD COLUMN IF NOT EXISTS period_labels_json LONGTEXT DEFAULT NULL
    `).catch(() => {});
}

// ── Preferences (schedule, colors, stickers, decor, countdowns) ───────────

router.get('/intervention/planner-prefs', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        const [rows] = await connection.execute(
            'SELECT * FROM planner_preferences WHERE student_id = ? LIMIT 1', [student_id]
        );
        await connection.release();
        if (!rows.length) return res.json({ prefs: null });
        const r = rows[0];
        res.json({ prefs: {
            schedule:         r.schedule_json         ? JSON.parse(r.schedule_json)         : {},
            colors:           r.colors_json           ? JSON.parse(r.colors_json)           : {},
            stickers:         r.stickers_json         ? JSON.parse(r.stickers_json)         : {},
            decor:            r.decor_json            ? JSON.parse(r.decor_json)            : {},
            countdowns:       r.countdowns_json       ? JSON.parse(r.countdowns_json)       : [],
            gradeCategories:  r.grade_categories_json ? JSON.parse(r.grade_categories_json) : {},
            periodLabels:     r.period_labels_json    ? JSON.parse(r.period_labels_json)    : {}
        }});
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch prefs' }); }
});

router.put('/intervention/planner-prefs', async (req, res) => {
    const { student_id, schedule, colors, stickers, decor, countdowns, gradeCategories, periodLabels } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        await connection.execute(
            `INSERT INTO planner_preferences (student_id, schedule_json, colors_json, stickers_json, decor_json, countdowns_json, grade_categories_json, period_labels_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               schedule_json          = COALESCE(VALUES(schedule_json),          schedule_json),
               colors_json            = COALESCE(VALUES(colors_json),            colors_json),
               stickers_json          = COALESCE(VALUES(stickers_json),          stickers_json),
               decor_json             = COALESCE(VALUES(decor_json),             decor_json),
               countdowns_json        = COALESCE(VALUES(countdowns_json),        countdowns_json),
               grade_categories_json  = COALESCE(VALUES(grade_categories_json),  grade_categories_json),
               period_labels_json     = COALESCE(VALUES(period_labels_json),     period_labels_json)`,
            [
                student_id,
                schedule         !== undefined ? JSON.stringify(schedule)         : null,
                colors           !== undefined ? JSON.stringify(colors)           : null,
                stickers         !== undefined ? JSON.stringify(stickers)         : null,
                decor            !== undefined ? JSON.stringify(decor)            : null,
                countdowns       !== undefined ? JSON.stringify(countdowns)       : null,
                gradeCategories  !== undefined ? JSON.stringify(gradeCategories)  : null,
                periodLabels     !== undefined ? JSON.stringify(periodLabels)     : null
            ]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save prefs' }); }
});

// ── To-dos ────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return String(d).split('T')[0];
};

router.get('/intervention/todos', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        const [rows] = await connection.execute(
            'SELECT todo_id AS id, text_val AS text, due_date AS date, priority, item_type AS itemType, done FROM planner_todos WHERE student_id = ? ORDER BY due_date ASC, created_at ASC',
            [student_id]
        );
        await connection.release();
        res.json({ todos: rows.map(r => ({ ...r, date: fmtDate(r.date), done: !!r.done, itemType: r.itemType || 'todo' })) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch todos' }); }
});

// Upsert all todos at once (client sends full list)
router.put('/intervention/todos', async (req, res) => {
    const { student_id, todos } = req.body;
    if (!student_id || !Array.isArray(todos)) return res.status(400).json({ error: 'student_id and todos[] required' });
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        // Delete todos no longer in list
        const ids = todos.map(t => t.id).filter(Boolean);
        if (ids.length) {
            const placeholders = ids.map(() => '?').join(',');
            await connection.execute(
                `DELETE FROM planner_todos WHERE student_id = ? AND todo_id NOT IN (${placeholders})`,
                [student_id, ...ids]
            );
        } else {
            await connection.execute('DELETE FROM planner_todos WHERE student_id = ?', [student_id]);
        }
        // Upsert each
        for (const t of todos) {
            if (!t.id || !t.text) continue;
            const dueDate = t.date ? String(t.date).split('T')[0] : null;
            await connection.execute(
                `INSERT INTO planner_todos (student_id, todo_id, text_val, due_date, priority, item_type, done)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE text_val = VALUES(text_val), due_date = VALUES(due_date),
                   priority = VALUES(priority), item_type = VALUES(item_type), done = VALUES(done)`,
                [student_id, t.id, t.text, dueDate, t.priority || 'normal', t.itemType || 'todo', t.done ? 1 : 0]
            );
        }
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save todos' }); }
});

// ── Habits ────────────────────────────────────────────────────────────────

router.get('/intervention/habits', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        const [habits] = await connection.execute(
            'SELECT habit_id AS id, text_val AS text, color, sort_order FROM planner_habits WHERE student_id = ? ORDER BY sort_order, created_at',
            [student_id]
        );
        const [logs] = await connection.execute(
            'SELECT habit_id, log_date FROM planner_habit_log WHERE student_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)',
            [student_id]
        );
        await connection.release();
        // Build log map: {habitId: {ymd: true}}
        const logMap = {};
        logs.forEach(l => {
            const ymd = l.log_date instanceof Date ? l.log_date.toISOString().split('T')[0] : String(l.log_date).split('T')[0];
            if (!logMap[l.habit_id]) logMap[l.habit_id] = {};
            logMap[l.habit_id][ymd] = true;
        });
        res.json({ habits, log: logMap });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch habits' }); }
});

// Upsert full habits list
router.put('/intervention/habits', async (req, res) => {
    const { student_id, habits } = req.body;
    if (!student_id || !Array.isArray(habits)) return res.status(400).json({ error: 'student_id and habits[] required' });
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        const ids = habits.map(h => h.id).filter(Boolean);
        if (ids.length) {
            const ph = ids.map(() => '?').join(',');
            await connection.execute(`DELETE FROM planner_habits WHERE student_id = ? AND habit_id NOT IN (${ph})`, [student_id, ...ids]);
        } else {
            await connection.execute('DELETE FROM planner_habits WHERE student_id = ?', [student_id]);
        }
        for (let i = 0; i < habits.length; i++) {
            const h = habits[i];
            if (!h.id || !h.text) continue;
            await connection.execute(
                `INSERT INTO planner_habits (student_id, habit_id, text_val, color, sort_order)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE text_val = VALUES(text_val), color = VALUES(color), sort_order = VALUES(sort_order)`,
                [student_id, h.id, h.text, h.color || null, i]
            );
        }
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save habits' }); }
});

// Toggle a habit log entry for a date
router.post('/intervention/habits/log', async (req, res) => {
    const { student_id, habit_id, log_date, done } = req.body;
    if (!student_id || !habit_id || !log_date) return res.status(400).json({ error: 'student_id, habit_id, log_date required' });
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        if (done) {
            await connection.execute(
                `INSERT IGNORE INTO planner_habit_log (student_id, habit_id, log_date) VALUES (?, ?, ?)`,
                [student_id, habit_id, log_date]
            );
        } else {
            await connection.execute(
                `DELETE FROM planner_habit_log WHERE student_id = ? AND habit_id = ? AND log_date = ?`,
                [student_id, habit_id, log_date]
            );
        }
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to log habit' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// TEACHER VIEW — read any enrolled student's planner data
// ════════════════════════════════════════════════════════════════════════════

router.get('/teacher/planner/students', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(`
            SELECT ie.student_id,
                   COALESCE(s.first_name, ie.student_id) AS first_name,
                   COALESCE(s.last_name, '')              AS last_name,
                   ie.section_id
            FROM intervention_enrollments ie
            LEFT JOIN students s ON ie.student_id = s.student_id
            ORDER BY last_name ASC, first_name ASC
        `);
        await connection.release();
        res.json({ students: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch students' }); }
});

router.get('/teacher/planner/:student_id/prefs', async (req, res) => {
    const { student_id } = req.params;
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        const [rows] = await connection.execute(
            'SELECT * FROM planner_preferences WHERE student_id = ? LIMIT 1', [student_id]
        );
        await connection.release();
        if (!rows.length) return res.json({ prefs: null });
        const r = rows[0];
        res.json({ prefs: {
            schedule:     r.schedule_json      ? JSON.parse(r.schedule_json)      : {},
            colors:       r.colors_json        ? JSON.parse(r.colors_json)        : {},
            stickers:     r.stickers_json      ? JSON.parse(r.stickers_json)      : {},
            decor:        r.decor_json         ? JSON.parse(r.decor_json)         : {},
            countdowns:   r.countdowns_json    ? JSON.parse(r.countdowns_json)    : [],
            periodLabels: r.period_labels_json ? JSON.parse(r.period_labels_json) : {}
        }});
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch prefs' }); }
});

router.get('/teacher/planner/:student_id/todos', async (req, res) => {
    const { student_id } = req.params;
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        const [rows] = await connection.execute(
            'SELECT todo_id AS id, text_val AS text, due_date AS date, priority, item_type AS itemType, done FROM planner_todos WHERE student_id = ? ORDER BY due_date ASC, created_at ASC',
            [student_id]
        );
        await connection.release();
        res.json({ todos: rows.map(r => ({ ...r, date: fmtDate(r.date), done: !!r.done, itemType: r.itemType || 'todo' })) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch todos' }); }
});

router.get('/teacher/planner/:student_id/habits', async (req, res) => {
    const { student_id } = req.params;
    try {
        const connection = await getDbConnection();
        await ensurePlannerTables(connection);
        const [habits] = await connection.execute(
            'SELECT habit_id AS id, text_val AS text, color, sort_order FROM planner_habits WHERE student_id = ? ORDER BY sort_order, created_at',
            [student_id]
        );
        const [logs] = await connection.execute(
            'SELECT habit_id, log_date FROM planner_habit_log WHERE student_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)',
            [student_id]
        );
        await connection.release();
        const logMap = {};
        logs.forEach(l => {
            const ymd = l.log_date instanceof Date ? l.log_date.toISOString().split('T')[0] : String(l.log_date).split('T')[0];
            if (!logMap[l.habit_id]) logMap[l.habit_id] = {};
            logMap[l.habit_id][ymd] = true;
        });
        res.json({ habits, log: logMap });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch habits' }); }
});

router.get('/teacher/planner/:student_id/tests', async (req, res) => {
    const { student_id } = req.params;
    try {
        const connection = await getDbConnection();
        await connection.execute(TESTS_DDL);
        const [rows] = await connection.execute(
            'SELECT * FROM intervention_tests WHERE student_id = ? ORDER BY test_date ASC',
            [student_id]
        );
        await connection.release();
        res.json({ tests: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch tests' }); }
});

module.exports = router;
