const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { sanitizeNotebookHtml } = require('../sanitizeNotebookHtml');
const { requireSelfOrStaff } = require('../helpers');

// Maps a real course_id to the WD1/WD2/CS tag admin-notebooks.js's
// "All Web Design 1/2/Computer Science" filters group by -- same mapping
// used for the due-date calendar sync in gradebook.js.
const COURSE_ID_TO_TAG = { '05254G1S': 'WD1', '05254G2S': 'WD2', '10003GS': 'CS' };

router.get('/admin/notebooks/roster', async (req, res) => {
    try {
        const rows = await withConnection((connection) => connection.execute(
            `SELECT s.student_id, s.first_name, s.last_name, s.username, s.section_id, s.role,
                    COALESCE(s.course_id, cs.course_id) AS course_id
             FROM students s
             LEFT JOIN class_sections cs ON cs.section_id = s.section_id AND s.course_id IS NULL
             WHERE (s.role IS NULL OR LOWER(s.role) <> 'admin')
               AND (s.section_id IS NULL OR s.section_id <> 'Teacher')
             ORDER BY s.section_id ASC, s.last_name ASC, s.first_name ASC`
        ).then(([rows]) => rows));
        const roster = rows.map((r) => ({
            student_id: r.student_id,
            firstName: r.first_name || '',
            lastName: r.last_name || '',
            username: r.username || '',
            period: r.section_id || '',
            course: COURSE_ID_TO_TAG[r.course_id] || null,
            role: r.role || 'student'
        }));
        return res.json({ roster });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Failed to fetch notebook roster' }); }
});

router.get('/admin/notebooks/entries', async (req, res) => {
    const { student_id, chapter_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const rows = await withConnection((connection) => {
            const chapterNum = Number(chapter_id);
            const hasFilter = Number.isInteger(chapterNum) && chapterNum > 0;
            const sql = hasFilter
                ? 'SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at FROM notebook_entries WHERE student_id = ? AND chapter_id = ? ORDER BY updated_at DESC, id DESC'
                : 'SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at FROM notebook_entries WHERE student_id = ? ORDER BY updated_at DESC, id DESC';
            const params = hasFilter ? [student_id, chapterNum] : [student_id];
            return connection.execute(sql, params).then(([rows]) => rows);
        });
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

router.get('/student/notebook', requireSelfOrStaff(), async (req, res) => {
    const { student_id, chapter_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
        const rows = await withConnection((connection) => {
            const chapterNum = Number(chapter_id);
            const hasFilter = Number.isInteger(chapterNum) && chapterNum > 0;
            const sql = hasFilter
                ? 'SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at FROM notebook_entries WHERE student_id = ? AND chapter_id = ? ORDER BY updated_at DESC, id DESC'
                : 'SELECT id, student_id, chapter_id, title, category, content, created_at, updated_at FROM notebook_entries WHERE student_id = ? ORDER BY updated_at DESC, id DESC';
            const params = hasFilter ? [student_id, chapterNum] : [student_id];
            return connection.execute(sql, params).then(([rows]) => rows);
        });
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

router.post('/student/notebook/save', requireSelfOrStaff(), async (req, res) => {
    const { id, student_id, chapter_id, title, category, content } = req.body;
    if (!student_id || !chapter_id || !title)
        return res.status(400).json({ error: 'student_id, chapter_id, and title are required' });
    const cleanContent = sanitizeNotebookHtml(content);
    try {
        const resultId = await withConnection(async (connection) => {
            if (id) {
                await connection.execute(
                    'UPDATE notebook_entries SET chapter_id = ?, title = ?, category = ?, content = ?, updated_at = NOW() WHERE id = ? AND student_id = ?',
                    [Number(chapter_id), title, category || 'Notes', cleanContent, Number(id), student_id]
                );
                return String(id);
            }
            const [result] = await connection.execute(
                'INSERT INTO notebook_entries (student_id, chapter_id, title, category, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                [student_id, Number(chapter_id), title, category || 'Notes', cleanContent]
            );
            return String(result.insertId);
        });
        return res.json({ success: true, id: resultId });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Failed to save notebook entry' }); }
});

router.post('/student/notebook/delete', requireSelfOrStaff(), async (req, res) => {
    const { id, student_id } = req.body;
    if (!id || !student_id) return res.status(400).json({ error: 'id and student_id are required' });
    try {
        await withConnection((connection) => connection.execute(
            'DELETE FROM notebook_entries WHERE id = ? AND student_id = ?',
            [Number(id), student_id]
        ));
        return res.json({ success: true });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Failed to delete notebook entry' }); }
});

module.exports = router;
