const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const fs   = require('fs').promises;
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');

router.post('/save-csv.php', express.text({ type: '*/*', limit: '10mb' }), async (req, res) => {
    try {
        const text = typeof req.body === 'string' ? req.body : '';
        await fs.writeFile(path.join(REPO_ROOT, 'special-dates.csv'), text, 'utf8');
        const count = text.split(/\r?\n/)
            .filter(l => l.trim() && !/^date/i.test(l.split(',')[0].trim())).length;
        res.json({ success: true, count });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

const SHARED_FILES_DDL = `
    CREATE TABLE IF NOT EXISTS shared_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_student_id VARCHAR(50) NOT NULL,
        sender_name VARCHAR(100),
        file_name VARCHAR(255),
        url TEXT,
        is_folder TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_recipient (recipient_student_id)
    )`;

router.get('/student/shared-files', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(SHARED_FILES_DDL);
        const [rows] = await connection.execute(
            'SELECT * FROM shared_files WHERE recipient_student_id = ? ORDER BY created_at DESC',
            [student_id]
        );
        await connection.end();
        res.json({ files: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch shared files' }); }
});

router.post('/student/share-file', async (req, res) => {
    const { recipient_student_id, sender_name, file_name, url, is_folder } = req.body;
    if (!recipient_student_id || !file_name || !url)
        return res.status(400).json({ error: 'recipient_student_id, file_name, and url are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(SHARED_FILES_DDL);
        const [checkRows] = await connection.execute(
            'SELECT student_id FROM students WHERE student_id = ?', [recipient_student_id]
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
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to share file' }); }
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
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete shared file' }); }
});

module.exports = router;
