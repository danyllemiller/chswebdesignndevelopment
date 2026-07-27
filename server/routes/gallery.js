const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

async function ensureGalleryTable() {
    let connection;
    try {
        connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS gallery_items (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                student_id   VARCHAR(50) NOT NULL,
                title        VARCHAR(255) NOT NULL,
                description  TEXT,
                project_url  VARCHAR(500),
                thumbnail_url VARCHAR(500),
                tech_tags    VARCHAR(255),
                section_id   VARCHAR(50),
                school_year  VARCHAR(10),
                is_public    TINYINT(1) DEFAULT 0,
                is_approved  TINYINT(1) DEFAULT 0,
                approved_by  VARCHAR(100),
                approved_at  TIMESTAMP NULL DEFAULT NULL,
                featured     TINYINT(1) DEFAULT 0,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        console.error('[gallery] Migration error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
}

ensureGalleryTable();

// GET approved public gallery items — no auth required
router.get('/gallery/public', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT g.id, g.title, g.description, g.project_url, g.thumbnail_url,
                   g.tech_tags, g.section_id, g.school_year, g.featured, g.submitted_at,
                   s.first_name
            FROM gallery_items g
            JOIN students s ON g.student_id = s.student_id
            WHERE g.is_approved = 1 AND g.is_public = 1
            ORDER BY g.featured DESC, g.submitted_at DESC
        `);
        await connection.end();
        res.json({ items: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch gallery' });
    }
});

// GET a student's own submissions
router.get('/gallery/my', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM gallery_items WHERE student_id = ? ORDER BY submitted_at DESC',
            [student_id]
        );
        await connection.end();
        res.json({ items: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// POST submit a new gallery item
router.post('/gallery/submit', async (req, res) => {
    const { student_id, title, description, project_url, thumbnail_url, tech_tags, section_id, school_year } = req.body;
    if (!student_id || !title) return res.status(400).json({ error: 'student_id and title are required' });
    const sanitizedUrl = project_url ? project_url.replace(/[<>"']/g, '') : null;
    const sanitizedThumb = thumbnail_url ? thumbnail_url.replace(/[<>"']/g, '') : null;
    try {
        const connection = await getDbConnection();
        const [result] = await connection.execute(
            `INSERT INTO gallery_items
             (student_id, title, description, project_url, thumbnail_url, tech_tags, section_id, school_year)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, title.substring(0, 255), (description || '').substring(0, 1000),
             sanitizedUrl, sanitizedThumb,
             (tech_tags || '').substring(0, 255), section_id || null, school_year || null]
        );
        await connection.end();
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit project' });
    }
});

// PUT approve / toggle public / feature (admin only)
router.put('/admin/gallery/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { is_approved, is_public, featured, approved_by } = req.body;
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const connection = await getDbConnection();
        const setParts = [];
        const vals = [];
        if (is_approved !== undefined) {
            setParts.push('is_approved = ?');
            vals.push(is_approved ? 1 : 0);
            if (is_approved) {
                setParts.push('approved_by = ?', 'approved_at = NOW()');
                vals.push((approved_by || 'teacher').substring(0, 100));
            }
        }
        if (is_public !== undefined) { setParts.push('is_public = ?'); vals.push(is_public ? 1 : 0); }
        if (featured !== undefined)   { setParts.push('featured = ?');   vals.push(featured ? 1 : 0); }
        if (!setParts.length) return res.status(400).json({ error: 'Nothing to update' });
        vals.push(id);
        await connection.execute(`UPDATE gallery_items SET ${setParts.join(', ')} WHERE id = ?`, vals);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// DELETE a gallery item (admin removes any; student removes their own)
router.delete('/gallery/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        let query = 'DELETE FROM gallery_items WHERE id = ?';
        const params = [id];
        if (student_id) { query += ' AND student_id = ?'; params.push(student_id); }
        await connection.execute(query, params);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// GET all items for admin review panel
router.get('/admin/gallery', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT g.*, s.first_name, s.last_name
            FROM gallery_items g
            JOIN students s ON g.student_id = s.student_id
            ORDER BY g.is_approved ASC, g.submitted_at DESC
        `);
        await connection.end();
        res.json({ items: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch admin gallery' });
    }
});

module.exports = router;
