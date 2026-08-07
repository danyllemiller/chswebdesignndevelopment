const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS student_stickers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    sticker_name VARCHAR(100) NOT NULL,
    awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_student (student_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

// GET /admin/stickers — every awarded sticker, for client-side grouping by student
router.get('/admin/stickers', async (req, res) => {
  try {
    const connection = await getDbConnection();
    await connection.execute(CREATE_TABLE_SQL);
    const [rows] = await connection.execute(
      'SELECT id, student_id, sticker_name, awarded_at FROM student_stickers ORDER BY awarded_at DESC'
    );
    await connection.end();
    res.json({ stickers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stickers' });
  }
});

// POST /admin/award-sticker — { student_id, sticker_name }
router.post('/admin/award-sticker', async (req, res) => {
  const { student_id, sticker_name } = req.body || {};
  if (!student_id || !sticker_name) {
    return res.status(400).json({ error: 'student_id and sticker_name are required' });
  }
  try {
    const connection = await getDbConnection();
    await connection.execute(CREATE_TABLE_SQL);
    const [result] = await connection.execute(
      'INSERT INTO student_stickers (student_id, sticker_name) VALUES (?, ?)',
      [String(student_id).trim(), String(sticker_name).trim()]
    );
    await connection.end();
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to award sticker' });
  }
});

// DELETE /admin/remove-sticker — { id }
router.delete('/admin/remove-sticker', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    const connection = await getDbConnection();
    await connection.execute(CREATE_TABLE_SQL);
    const [result] = await connection.execute('DELETE FROM student_stickers WHERE id = ?', [id]);
    await connection.end();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Sticker award not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove sticker' });
  }
});

module.exports = router;
