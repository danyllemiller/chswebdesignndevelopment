// server/routes/headphones.js
// Headphone checkout kiosk (admin/tools/headphone-checkout.html).
// Each pair has a numbered barcode sticker (HP01-HP30, printed from
// admin/tools/headphone-labels.html). To borrow: scan the headphones, then
// the student ID. To return: scan the headphones (or the student's ID).
// Staff-only: the kiosk runs under the teacher's session, same as the
// attendance scan station.
const express = require('express');
const router = express.Router();
const { withConnection } = require('../db');
const { requireStaff } = require('../helpers');

async function ensureHeadphoneTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS headphone_checkouts (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            student_id       VARCHAR(50) NOT NULL,
            headphone_number INT NULL DEFAULT NULL,
            checked_out_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            returned_at      TIMESTAMP NULL DEFAULT NULL,
            returned_how     VARCHAR(20) NULL DEFAULT NULL,
            INDEX idx_hp_open (returned_at, student_id)
        )
    `);
    await connection.execute(
        'ALTER TABLE headphone_checkouts ADD COLUMN IF NOT EXISTS headphone_number INT NULL DEFAULT NULL AFTER student_id'
    );
}

// The students table and this table can carry different collations
// (the droplet's MariaDB defaults to uca1400), so pin one for the join.
const OPEN_LIST_SQL = `
    SELECT h.id, h.student_id, h.headphone_number, h.checked_out_at, s.first_name, s.last_name, s.section_id,
           DATE(h.checked_out_at) < CURDATE() AS overdue
    FROM headphone_checkouts h JOIN students s ON s.student_id = h.student_id COLLATE utf8mb4_unicode_ci
    WHERE h.returned_at IS NULL
    ORDER BY h.checked_out_at`;

async function findStudent(connection, studentId) {
    const [[student]] = await connection.execute(
        'SELECT student_id, first_name, last_name, section_id FROM students WHERE student_id = ? LIMIT 1',
        [studentId]
    );
    return student;
}

async function markReturned(connection, id, how) {
    await connection.execute(
        'UPDATE headphone_checkouts SET returned_at = CURRENT_TIMESTAMP, returned_how = ? WHERE id = ? AND returned_at IS NULL',
        [how, id]
    );
}

// POST /admin/headphones/scan -- { headphone?, student_id? }
//   headphone only           -> returns that pair if it's out, else asks for the ID
//   headphone + student_id   -> checks that pair out to the student
//   student_id only          -> returns the student's pair if they have one out
router.post('/admin/headphones/scan', requireStaff, async (req, res) => {
    const body = req.body || {};
    const studentId = String(body.student_id || '').trim();
    const headphone = body.headphone == null || body.headphone === '' ? null : Number(body.headphone);
    if (headphone !== null && !(Number.isInteger(headphone) && headphone >= 1 && headphone <= 999)) {
        return res.status(400).json({ error: 'That headphone barcode isn\'t valid.' });
    }
    if (!studentId && headphone === null) return res.status(400).json({ error: 'Scan the headphones or an ID.' });
    try {
        const out = await withConnection(async (connection) => {
            await ensureHeadphoneTable(connection);

            if (headphone !== null && !studentId) {
                const [[open]] = await connection.execute(
                    'SELECT id, student_id FROM headphone_checkouts WHERE headphone_number = ? AND returned_at IS NULL ORDER BY id DESC LIMIT 1',
                    [headphone]
                );
                if (!open) return { status: 200, body: { action: 'need_student', headphone } };
                await markReturned(connection, open.id, 'scan');
                const student = await findStudent(connection, open.student_id);
                return { status: 200, body: { action: 'returned', headphone, student } };
            }

            const student = await findStudent(connection, studentId);
            if (!student) return { status: 404, body: { error: 'Unknown ID -- no student found.' } };
            const [[mine]] = await connection.execute(
                'SELECT id, headphone_number FROM headphone_checkouts WHERE student_id = ? AND returned_at IS NULL ORDER BY id DESC LIMIT 1',
                [studentId]
            );

            if (headphone === null) {
                if (!mine) return { status: 400, body: { error: 'Scan the sticker on the headphones first, then your ID.' } };
                await markReturned(connection, mine.id, 'scan');
                return { status: 200, body: { action: 'returned', headphone: mine.headphone_number, student } };
            }

            if (mine) {
                const which = mine.headphone_number ? `#${mine.headphone_number}` : 'a pair';
                return { status: 409, body: { error: `${student.first_name} already has ${which} checked out. Return those first.` } };
            }
            // Should be rare: this pair is still listed as out to someone else
            // (they never scanned it back in). Close that record first.
            await connection.execute(
                `UPDATE headphone_checkouts SET returned_at = CURRENT_TIMESTAMP, returned_how = 'reissued'
                 WHERE headphone_number = ? AND returned_at IS NULL`,
                [headphone]
            );
            await connection.execute(
                'INSERT INTO headphone_checkouts (student_id, headphone_number) VALUES (?, ?)',
                [studentId, headphone]
            );
            return { status: 200, body: { action: 'checked_out', headphone, student } };
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
            await markReturned(connection, id, 'teacher');
        });
        res.json({ success: true });
    } catch (err) {
        console.error('[headphones] return error:', err);
        res.status(500).json({ error: 'Failed to mark returned.' });
    }
});

module.exports = router;
