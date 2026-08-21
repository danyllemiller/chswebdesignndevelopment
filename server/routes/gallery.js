const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

const VALID_VIS = ['public', 'classmates', 'private'];

async function ensureGalleryTable() {
    let connection;
    try {
        connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS gallery_items (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                student_id    VARCHAR(50) NOT NULL,
                title         VARCHAR(255) NOT NULL,
                description   TEXT,
                project_url   VARCHAR(500),
                thumbnail_url VARCHAR(500),
                tech_tags     VARCHAR(255),
                section_id    VARCHAR(50),
                school_year   VARCHAR(10),
                visibility    ENUM('public','classmates','private') DEFAULT 'classmates',
                is_approved   TINYINT(1) DEFAULT 0,
                approved_by   VARCHAR(100),
                approved_at   TIMESTAMP NULL DEFAULT NULL,
                featured      TINYINT(1) DEFAULT 0,
                submitted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Migrate existing rows that used the old is_public column
        await connection.execute(`
            ALTER TABLE gallery_items
              ADD COLUMN IF NOT EXISTS visibility ENUM('public','classmates','private') DEFAULT 'classmates'
        `).catch(() => {});
        // If the old is_public column exists, seed visibility from it
        await connection.execute(`
            UPDATE gallery_items SET visibility = 'public' WHERE visibility = 'classmates' AND is_public = 1
        `).catch(() => {});
    } catch (e) {
        console.error('[gallery] Migration error:', e.message);
    } finally {
        if (connection) await connection.release();
    }
}

ensureGalleryTable();

// ── Helper: resolve viewer role from student_id ─────────────────────
async function resolveViewer(connection, student_id) {
    if (!student_id) return { isTeacher: false, isWD: false, section_id: null };
    const [rows] = await connection.execute(
        'SELECT section_id, role FROM students WHERE student_id = ? LIMIT 1',
        [student_id]
    );
    if (!rows.length) return { isTeacher: false, isWD: false, section_id: null };
    const { section_id, role } = rows[0];
    const isTeacher = role === 'admin' || section_id === 'Teacher';
    const isWD      = !isTeacher && section_id && !section_id.toUpperCase().startsWith('CS');
    return { isTeacher, isWD, section_id };
}

// ── GET /gallery/feed?student_id=X
// Visibility rules (approval required for all):
//   'public'     → visible to everyone (including anonymous)
//   'classmates' → visible to WD students (non-CS enrolled) when logged in
//   'private'    → visible only to submitter and teacher
router.get('/gallery/feed', async (req, res) => {
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        const viewer = await resolveViewer(connection, student_id);

        let query, params = [];

        if (viewer.isTeacher) {
            // Teacher sees all approved items regardless of visibility
            query = `
                SELECT g.id, g.title, g.description, g.project_url, g.thumbnail_url,
                       g.tech_tags, g.section_id, g.school_year, g.featured, g.submitted_at,
                       g.visibility, g.student_id, s.first_name
                FROM gallery_items g
                JOIN students s ON g.student_id = s.student_id
                WHERE g.is_approved = 1
                ORDER BY g.featured DESC, g.submitted_at DESC
            `;
        } else if (student_id) {
            // Logged-in student: public + (classmates if WD) + their own private
            const visibilities = viewer.isWD ? ['public', 'classmates'] : ['public'];
            const placeholders = visibilities.map(() => '?').join(',');
            query = `
                SELECT g.id, g.title, g.description, g.project_url, g.thumbnail_url,
                       g.tech_tags, g.section_id, g.school_year, g.featured, g.submitted_at,
                       g.visibility, g.student_id, s.first_name
                FROM gallery_items g
                JOIN students s ON g.student_id = s.student_id
                WHERE g.is_approved = 1
                  AND (g.visibility IN (${placeholders}) OR g.student_id = ?)
                ORDER BY g.featured DESC, g.submitted_at DESC
            `;
            params = [...visibilities, student_id];
        } else {
            // Anonymous: public only
            query = `
                SELECT g.id, g.title, g.description, g.project_url, g.thumbnail_url,
                       g.tech_tags, g.section_id, g.school_year, g.featured, g.submitted_at,
                       g.visibility, g.student_id, s.first_name
                FROM gallery_items g
                JOIN students s ON g.student_id = s.student_id
                WHERE g.is_approved = 1 AND g.visibility = 'public'
                ORDER BY g.featured DESC, g.submitted_at DESC
            `;
        }

        const [rows] = await connection.execute(query, params);
        await connection.release();
        res.json({ items: rows, viewer: { isTeacher: viewer.isTeacher, isWD: viewer.isWD } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch gallery' });
    }
});

// ── GET /gallery/my?student_id=X — a student's own submissions (all visibilities)
router.get('/gallery/my', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM gallery_items WHERE student_id = ? ORDER BY submitted_at DESC',
            [student_id]
        );
        await connection.release();
        res.json({ items: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// ── POST /gallery/submit — student submits a new project
router.post('/gallery/submit', async (req, res) => {
    const { student_id, title, description, project_url, thumbnail_url, tech_tags, section_id, school_year, visibility } = req.body;
    if (!student_id || !title) return res.status(400).json({ error: 'student_id and title are required' });
    const vis          = VALID_VIS.includes(visibility) ? visibility : 'classmates';
    const sanitizedUrl = project_url   ? project_url.replace(/[<>"']/g, '')   : null;
    const sanitizedThumb = thumbnail_url ? thumbnail_url.replace(/[<>"']/g, '') : null;
    try {
        const connection = await getDbConnection();
        const [result] = await connection.execute(
            `INSERT INTO gallery_items
             (student_id, title, description, project_url, thumbnail_url, tech_tags, section_id, school_year, visibility)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, title.substring(0, 255), (description || '').substring(0, 1000),
             sanitizedUrl, sanitizedThumb,
             (tech_tags || '').substring(0, 255), section_id || null, school_year || null, vis]
        );
        await connection.release();
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit project' });
    }
});

// ── PUT /gallery/my/:id/visibility — student changes visibility on their own item
router.put('/gallery/my/:id/visibility', async (req, res) => {
    const id = Number(req.params.id);
    const { student_id, visibility } = req.body;
    if (!id || !student_id || !VALID_VIS.includes(visibility))
        return res.status(400).json({ error: 'id, student_id, and valid visibility are required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(
            'UPDATE gallery_items SET visibility = ? WHERE id = ? AND student_id = ?',
            [visibility, id, student_id]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update visibility' });
    }
});

// ── PUT /admin/gallery/:id — approve, set visibility, feature (admin only)
router.put('/admin/gallery/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { is_approved, visibility, featured, approved_by } = req.body;
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
        if (visibility && VALID_VIS.includes(visibility)) {
            setParts.push('visibility = ?');
            vals.push(visibility);
        }
        if (featured !== undefined) { setParts.push('featured = ?'); vals.push(featured ? 1 : 0); }
        if (!setParts.length) return res.status(400).json({ error: 'Nothing to update' });
        vals.push(id);
        await connection.execute(`UPDATE gallery_items SET ${setParts.join(', ')} WHERE id = ?`, vals);
        await connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// ── DELETE /gallery/:id — admin removes any; student removes their own
router.delete('/gallery/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { student_id } = req.query;
    try {
        const connection = await getDbConnection();
        let query = 'DELETE FROM gallery_items WHERE id = ?';
        const params = [id];
        if (student_id) { query += ' AND student_id = ?'; params.push(student_id); }
        await connection.execute(query, params);
        await connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// ── GET /admin/gallery — all items for admin review panel
router.get('/admin/gallery', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT g.*, s.first_name, s.last_name
            FROM gallery_items g
            JOIN students s ON g.student_id = s.student_id
            ORDER BY g.is_approved ASC, g.submitted_at DESC
        `);
        await connection.release();
        res.json({ items: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch admin gallery' });
    }
});

module.exports = router;
