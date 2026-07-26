const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

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
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Failed to fetch notebook roster' }); }
});

router.get('/admin/notebooks/entries', async (req, res) => {
    const { student_id, chapter_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        const chapterNum = Number(chapter_id);
        const hasFilter = Number.isInteger(chapterNum) && chapterNum > 0;
        const sql = hasFilter
            ? 'SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at FROM notebook_entries WHERE student_id = ? AND chapter_id = ? ORDER BY updated_at DESC, id DESC'
            : 'SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at FROM notebook_entries WHERE student_id = ? ORDER BY updated_at DESC, id DESC';
        const params = hasFilter ? [student_id, chapterNum] : [student_id];
        const [rows] = await connection.execute(sql, params);
        await connection.end();
        const entries = rows.map((row) => ({
            id: String(row.id), student_id: row.student_id,
            chapter: `Chapter ${row.chapter_id}`, chapter_id: row.chapter_id,
            title: row.title || 'Untitled Note', category: row.category || 'Notes',
            content: row.content || '',
            timestamp: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
        }));
        return res.json({ entries });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Failed to fetch notebook entries' }); }
});

router.get('/student/notebook', async (req, res) => {
    const { student_id, chapter_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const connection = await getDbConnection();
        const chapterNum = Number(chapter_id);
        const hasFilter = Number.isInteger(chapterNum) && chapterNum > 0;
        const sql = hasFilter
            ? 'SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at FROM notebook_entries WHERE student_id = ? AND chapter_id = ? ORDER BY updated_at DESC, id DESC'
            : 'SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at FROM notebook_entries WHERE student_id = ? ORDER BY updated_at DESC, id DESC';
        const params = hasFilter ? [student_id, chapterNum] : [student_id];
        const [rows] = await connection.execute(sql, params);
        await connection.end();
        const entries = rows.map((row) => ({
            id: String(row.id), student_id: row.student_id,
            chapter: `Chapter ${row.chapter_id}`, chapter_id: row.chapter_id,
            title: row.title || 'Untitled Note', category: row.category || 'Notes',
            content: row.content || '',
            timestamp: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
        }));
        return res.json({ entries });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Failed to fetch notebook entries' }); }
});

router.post('/student/notebook/save', async (req, res) => {
    const { id, student_id, chapter_id, title, category, content } = req.body;
    if (!student_id || !chapter_id || !title)
        return res.status(400).json({ error: 'student_id, chapter_id, and title are required' });
    try {
        const connection = await getDbConnection();
        if (id) {
            await connection.execute(
                'UPDATE notebook_entries SET chapter_id = ?, title = ?, category = ?, content = ?, updated_at = NOW() WHERE id = ? AND student_id = ?',
                [Number(chapter_id), title, category || 'Notes', content || '', Number(id), student_id]
            );
            await connection.end();
            return res.json({ success: true, id: String(id) });
        }
        const [result] = await connection.execute(
            'INSERT INTO notebook_entries (student_id, chapter_id, title, category, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [student_id, Number(chapter_id), title, category || 'Notes', content || '']
        );
        await connection.end();
        return res.json({ success: true, id: String(result.insertId) });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Failed to save notebook entry' }); }
});

router.post('/student/notebook/delete', async (req, res) => {
    const { id, student_id } = req.body;
    if (!id || !student_id) return res.status(400).json({ error: 'id and student_id are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'DELETE FROM notebook_entries WHERE id = ? AND student_id = ?',
            [Number(id), student_id]
        );
        await connection.end();
        return res.json({ success: true });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Failed to delete notebook entry' }); }
});

module.exports = router;
