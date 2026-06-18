// server/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getDbConnection } = require('./db');

// LOGIN
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const connection = await getDbConnection();
        const [results] = await connection.execute('SELECT * FROM students WHERE username = ?', [username]);
        await connection.end();

        if (results.length === 0) return res.status(401).json({ error: 'Invalid login' });

        const user = results[0];
        // Checking your schema columns
        const dbPassword = user.password || user.password_hash;
        
        if (!dbPassword) return res.status(401).json({ error: 'No password set' });

        const match = await bcrypt.compare(password, dbPassword);
        if (!match) return res.status(401).json({ error: 'Invalid login' });

        req.session.regenerate((err) => {
            if (err) return res.status(500).json({ error: 'Session error' });
            req.session.user = {
                student_id: user.student_id,
                username: user.username,
                section_id: String(user.section_id || user.sectionId || user.section || '').trim(),
                role: user.role,
                must_change_password: Number(user.must_change_password || 0)
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

    try {
        const connection = await getDbConnection();
        const [students] = await connection.execute('SELECT * FROM students WHERE student_id = ?', [student_id]);
        if (students.length === 0) { await connection.end(); return res.status(400).json({ error: 'ID not on roster.' }); }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.execute('UPDATE students SET username = ?, password = ?, first_name = ?, last_name = ? WHERE student_id = ?',
            [username, hashedPassword, first_name, last_name, student_id]);
        await connection.end();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Database error.' }); }
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

    if (String(new_password).length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT student_id, password, password_hash FROM students WHERE student_id = ?', [sessionUser.student_id]);

        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Student account not found.' });
        }

        const student = rows[0];
        const existingHash = student.password || student.password_hash;
        if (!existingHash) {
            await connection.end();
            return res.status(400).json({ error: 'No current password is set for this account.' });
        }

        const isMatch = await bcrypt.compare(current_password, existingHash);
        if (!isMatch) {
            await connection.end();
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const nextHash = await bcrypt.hash(new_password, 10);
        await connection.execute(
            'UPDATE students SET password = ?, must_change_password = 0, password_updated_at = NOW() WHERE student_id = ?',
            [nextHash, sessionUser.student_id]
        );
        await connection.end();

        if (req.session?.user) {
            req.session.user.must_change_password = 0;
        }

        return res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to change password.' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { first_name, last_name, student_id, username } = req.body;

    if (!first_name || !last_name || !student_id || !username) {
        return res.status(400).json({ error: 'First name, last name, student ID, and username are required.' });
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
            await connection.end();
            return res.status(404).json({ error: 'No matching student record found. Verify enrollment details.' });
        }

        const defaultResetPassword = String(student_id).trim();
        if (!defaultResetPassword) {
            await connection.end();
            return res.status(400).json({ error: 'Invalid student ID for reset.' });
        }

        const resetHash = await bcrypt.hash(defaultResetPassword, 10);
        await connection.execute(
            'UPDATE students SET password = ?, password_hash = ?, must_change_password = 1, password_updated_at = NOW() WHERE student_id = ?',
            [resetHash, resetHash, student_id]
        );
        await connection.end();

        return res.json({
            success: true,
            message: 'Password reset successful. Your temporary password is your Student ID. You must change it immediately after login.'
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
            await connection.end();
            return res.status(404).json({ error: 'Student not found.' });
        }

        const resetHash = await bcrypt.hash(resetValue, 10);
        await connection.execute(
            'UPDATE students SET password = ?, password_hash = ?, must_change_password = 1, password_updated_at = NOW() WHERE student_id = ?',
            [resetHash, resetHash, student_id]
        );
        await connection.end();

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
