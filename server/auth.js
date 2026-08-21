// server/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getDbConnection } = require('./db');
const { validatePassword } = require('./helpers');

// LOGIN
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const connection = await getDbConnection();
        const [results] = await connection.execute('SELECT * FROM students WHERE username = ?', [username]);

        if (results.length === 0) { await connection.release(); return res.status(401).json({ error: 'Invalid login' }); }

        const user = results[0];
        const dbPassword = user.password || user.password_hash;
        if (!dbPassword) { await connection.release(); return res.status(401).json({ error: 'No password set' }); }

        const match = await bcrypt.compare(password, dbPassword);
        if (!match) { await connection.release(); return res.status(401).json({ error: 'Invalid login' }); }

        // Look up course info via section → class_sections → courses
        const sectionId = String(user.section_id || user.sectionId || user.section || '').trim();
        let courseInfo = {};
        if (sectionId) {
            const [courseRows] = await connection.execute(
                `SELECT cs.course_id, c.course_name
                 FROM class_sections cs
                 LEFT JOIN courses c ON cs.course_id = c.course_id
                 WHERE cs.section_id = ?`,
                [sectionId]
            );
            courseInfo = courseRows[0] || {};
        }
        await connection.release();

        req.session.regenerate((err) => {
            if (err) return res.status(500).json({ error: 'Session error' });
            req.session.user = {
                student_id: user.student_id,
                username: user.username,
                section_id: sectionId,
                role: user.role,
                must_change_password: Number(user.must_change_password || 0),
                course_id: courseInfo.course_id || null,
                course_name: courseInfo.course_name || null
            };
            res.json({ success: true, user: req.session.user, must_change_password: Number(user.must_change_password || 0) });
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Login error' }); }
});

// REGISTER
router.post('/register', async (req, res) => {
    const { first_name, last_name, student_id, username, password } = req.body;

    if (!first_name || !last_name || !student_id || !username || !password) {
        return res.status(400).json({ error: 'First name, last name, student ID, username, and password are required.' });
    }

    if (!/^[a-z0-9]+$/.test(String(username))) {
        return res.status(400).json({ error: 'Username may only contain lowercase letters and numbers.' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
    }

    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute('SELECT * FROM students WHERE student_id = ?', [student_id]);
        if (students.length === 0) { await connection.release(); return res.status(400).json({ error: 'ID not on roster.' }); }

        const [taken] = await connection.execute('SELECT student_id FROM students WHERE username = ? AND student_id != ?', [username, student_id]);
        if (taken.length > 0) {
            await connection.release();
            return res.status(400).json({ error: 'That username is already taken. Please choose another.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.execute('UPDATE students SET username = ?, password = ?, first_name = ?, last_name = ? WHERE student_id = ?',
            [username, hashedPassword, first_name, last_name, student_id]);
        await connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error('[register] Database error:', err);
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'That username is already taken. Please choose another.' });
        }
        res.status(500).json({ error: 'Database error.' });
    }
});

// LOGOUT
router.post('/change-password', async (req, res) => {
    const { current_password, new_password } = req.body;
    const sessionUser = req.session?.user;

    if (!sessionUser?.student_id) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const passwordError = validatePassword(new_password);
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
    }

    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT student_id, password, password_hash FROM students WHERE student_id = ?', [sessionUser.student_id]);

        if (rows.length === 0) {
            await connection.release();
            return res.status(404).json({ error: 'Student account not found.' });
        }

        const student = rows[0];
        const existingHash = student.password || student.password_hash;
        if (!existingHash) {
            await connection.release();
            return res.status(400).json({ error: 'No current password is set for this account.' });
        }

        const isMatch = await bcrypt.compare(current_password, existingHash);
        if (!isMatch) {
            await connection.release();
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const nextHash = await bcrypt.hash(new_password, 10);
        await connection.execute(
            'UPDATE students SET password = ?, must_change_password = 0, password_updated_at = NOW() WHERE student_id = ?',
            [nextHash, sessionUser.student_id]
        );
        await connection.release();

        if (req.session?.user) {
            req.session.user.must_change_password = 0;
        }

        return res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to change password.' });
    }
});

// Self-service username lookup -- same identity-verification fields as
// reset-password (first name, last name, student ID), minus username since
// that's what's being looked up. Returns only the matched username, never
// any other student data.
router.post('/lookup-username', async (req, res) => {
    const { first_name, last_name, student_id } = req.body;

    if (!first_name || !last_name || !student_id) {
        return res.status(400).json({ error: 'First name, last name, and student ID are required.' });
    }

    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT username FROM students
             WHERE student_id = ? AND LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)
             LIMIT 1`,
            [student_id, first_name, last_name]
        );
        await connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No matching student record found. Verify your enrollment details.' });
        }
        if (!rows[0].username) {
            return res.status(404).json({ error: 'No account found yet for this student — use the Register tab to create one.' });
        }

        return res.json({ success: true, username: rows[0].username });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to look up username.' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { first_name, last_name, student_id, username, new_password } = req.body;

    if (!first_name || !last_name || !student_id || !username) {
        return res.status(400).json({ error: 'First name, last name, student ID, and username are required.' });
    }

    if (!new_password) {
        return res.status(400).json({ error: 'A new password is required.' });
    }

    const passwordError = validatePassword(new_password);
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
    }

    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            `SELECT student_id, first_name, last_name, username
             FROM students
             WHERE student_id = ? AND LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?) AND LOWER(username) = LOWER(?)
             LIMIT 1`,
            [student_id, first_name, last_name, username]
        );

        if (rows.length === 0) {
            await connection.release();
            return res.status(404).json({ error: 'No matching student record found. Verify enrollment details.' });
        }

        // Student chose their own compliant password directly -- no forced
        // change-on-next-login needed (that flow is for the teacher/admin
        // default-password reset path in /admin/reset-password-default,
        // which is unrelated to this self-service route).
        const resetHash = await bcrypt.hash(new_password, 10);
        await connection.execute(
            'UPDATE students SET password = ?, password_hash = ?, must_change_password = 0, password_updated_at = NOW() WHERE student_id = ?',
            [resetHash, resetHash, student_id]
        );
        await connection.release();

        return res.json({
            success: true,
            message: 'Password reset successful. You can now log in with your new password.'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to reset password.' });
    }
});

router.post('/admin/reset-password-default', async (req, res) => {
    const { student_id, default_password } = req.body;

    if (!student_id) {
        return res.status(400).json({ error: 'student_id is required.' });
    }

    let resetValue = String(default_password || '').trim();
    if (resetValue.length < 6) {
        resetValue = String(student_id || '').trim();
    }

    if (!resetValue) {
        return res.status(400).json({ error: 'Invalid default password or student_id.' });
    }

    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT student_id FROM students WHERE student_id = ?', [student_id]);

        if (rows.length === 0) {
            await connection.release();
            return res.status(404).json({ error: 'Student not found.' });
        }

        const resetHash = await bcrypt.hash(resetValue, 10);
        await connection.execute(
            'UPDATE students SET password = ?, password_hash = ?, must_change_password = 1, password_updated_at = NOW() WHERE student_id = ?',
            [resetHash, resetHash, student_id]
        );
        await connection.release();

        return res.json({ success: true, message: 'Password reset to default. Student must change password at next login.' });
    } catch (err) {
        console.error('RESET PASSWORD DEFAULT ERROR', err && err.stack ? err.stack : err);
        return res.status(500).json({ error: 'Failed to reset password.', details: String(err.message || err) });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ success: true }); });
});

module.exports = router;
