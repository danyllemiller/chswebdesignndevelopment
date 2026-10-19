// server/routes/headphones.js
// Headphone checkout by ID scan (admin/tools/headphone-checkout.html).
// One scan checks a pair out; the same student scanning again returns it.
// Staff-only: the kiosk runs under the teacher's session, same as the
// attendance scan station.
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { requireStaff } = require('../helpers');

async function ensureHeadphoneTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS headphone_checkouts (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            student_id     VARCHAR(50) NOT NULL,
            checked_out_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            returned_at    TIMESTAMP NULL DEFAULT NULL,
            returned_how   VARCHAR(20) NULL DEFAULT NULL,
            INDEX idx_hp_open (returned_at, student_id)
        )
    `);
}

const OPEN_LIST_SQL = `
    SELECT h.id, h.student_id, h.checked_out_at, s.first_name, s.last_name, s.section_id,
           DATE(h.checked_out_at) < CURDATE() AS overdue
    FROM headphone_checkouts h JOIN students s ON s.student_id = h.student_id
    WHERE h.returned_at IS NULL
    ORDER BY h.checked_out_at`;

// POST /admin/headphones/scan -- { student_id } -> checks out, or returns if already out
router.post('/admin/headphones/scan', requireStaff, async (req, res) => {
    const studentId = String((req.body && req.body.student_id) || '').trim();
    if (!studentId) return res.status(400).json({ error: 'student_id is required' });
    try {
        const out = await withConnection(async (connection) => {
            await ensureHeadphoneTable(connection);
            const [[student]] = await connection.execute(
                'SELECT student_id, first_name, last_name, section_id FROM students WHERE student_id = ? LIMIT 1',
                [studentId]
            );
            if (!student) return { status: 404, body: { error: 'Unknown ID -- no student found.' } };

            const [[open]] = await connection.execute(
                'SELECT id, checked_out_at FROM headphone_checkouts WHERE student_id = ? AND returned_at IS NULL ORDER BY id DESC LIMIT 1',
                [studentId]
            );
            if (open) {
                await connection.execute(
                    `UPDATE headphone_checkouts SET returned_at = CURRENT_TIMESTAMP, returned_how = 'scan' WHERE id = ?`,
                    [open.id]
                );
                return { status: 200, body: { action: 'returned', student, checked_out_at: open.checked_out_at } };
            }
            await connection.execute('INSERT INTO headphone_checkouts (student_id) VALUES (?)', [studentId]);
            return { status: 200, body: { action: 'checked_out', student } };
        });
        res.status(out.status).json(out.body);
    } catch (err) {
        console.error('[headphones] scan error:', err);
        res.status(500).json({ error: 'Scan failed -- try again.' });
    }
});

// GET /admin/headphones/out -- everyone who currently has a pair
router.get('/admin/headphones/out', requireStaff, async (req, res) => {
    try {
        const rows = await withConnection(async (connection) => {
            await ensureHeadphoneTable(connection);
            const [rows] = await connection.execute(OPEN_LIST_SQL);
            return rows;
        });
        res.json({ out: rows });
    } catch (err) {
        console.error('[headphones] list error:', err);
        res.status(500).json({ error: 'Failed to load checkouts.' });
    }
});

// POST /admin/headphones/return -- { id } teacher marks a pair returned by hand
router.post('/admin/headphones/return', requireStaff, async (req, res) => {
    const id = Number(req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
        await withConnection(async (connection) => {
            await ensureHeadphoneTable(connection);
            await connection.execute(
                `UPDATE headphone_checkouts SET returned_at = CURRENT_TIMESTAMP, returned_how = 'teacher' WHERE id = ? AND returned_at IS NULL`,
                [id]
            );
        });
        res.json({ success: true });
    } catch (err) {
        console.error('[headphones] return error:', err);
        res.status(500).json({ error: 'Failed to mark returned.' });
    }
});

module.exports = router;
