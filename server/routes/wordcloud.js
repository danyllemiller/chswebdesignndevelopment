const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

const CREATE_CLOUDS_SQL = `
  CREATE TABLE IF NOT EXISTS class_wordclouds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id VARCHAR(50) NOT NULL,
    prompt VARCHAR(500) NOT NULL,
    max_words INT NOT NULL DEFAULT 3,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    KEY idx_section_active (section_id, active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const CREATE_ENTRIES_SQL = `
  CREATE TABLE IF NOT EXISTS class_wordcloud_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wordcloud_id INT NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    word VARCHAR(60) NOT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_entry (wordcloud_id, student_id, word),
    KEY idx_wordcloud (wordcloud_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function ensureTables(connection) {
  await connection.execute(CREATE_CLOUDS_SQL);
  await connection.execute(CREATE_ENTRIES_SQL);
}

// Lowercased/trimmed so "Cat", "cat ", and "CAT" all count as the same word
// for sizing purposes -- that's the whole point of a word cloud.
function normalizeWord(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
}

function cloudRowToJson(row) {
  return {
    id: row.id,
    section_id: row.section_id,
    prompt: row.prompt,
    max_words: row.max_words,
    active: !!row.active,
    created_at: row.created_at,
    closed_at: row.closed_at
  };
}

// POST /admin/wordcloud/create — { prompt, section_id, max_words }
router.post('/admin/wordcloud/create', async (req, res) => {
  const { prompt, section_id, max_words } = req.body || {};
  if (!prompt || !section_id) {
    return res.status(400).json({ error: 'prompt and section_id are required' });
  }
  const maxWords = Math.min(Math.max(parseInt(max_words, 10) || 3, 1), 10);
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    // Only one live word cloud per section at a time, same convention as polls.
    await connection.execute(
      'UPDATE class_wordclouds SET active = 0, closed_at = NOW() WHERE section_id = ? AND active = 1',
      [section_id]
    );
    const [result] = await connection.execute(
      'INSERT INTO class_wordclouds (section_id, prompt, max_words, active) VALUES (?, ?, ?, 1)',
      [section_id, String(prompt).trim(), maxWords]
    );
    await connection.end();
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create word cloud' });
  }
});

// POST /admin/wordcloud/close — { id }
router.post('/admin/wordcloud/close', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    await connection.execute('UPDATE class_wordclouds SET active = 0, closed_at = NOW() WHERE id = ?', [id]);
    await connection.end();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to close word cloud' });
  }
});

// POST /admin/wordcloud/clear — { id } — wipes submitted words, session stays live
router.post('/admin/wordcloud/clear', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    await connection.execute('DELETE FROM class_wordcloud_entries WHERE wordcloud_id = ?', [id]);
    await connection.end();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear word cloud' });
  }
});

// GET /admin/wordcloud/results?id=X — live word/frequency tally for the teacher's display
router.get('/admin/wordcloud/results', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    const [cloudRows] = await connection.execute('SELECT * FROM class_wordclouds WHERE id = ? LIMIT 1', [id]);
    if (cloudRows.length === 0) { await connection.end(); return res.status(404).json({ error: 'Word cloud not found' }); }
    const cloud = cloudRowToJson(cloudRows[0]);
    const [wordRows] = await connection.execute(
      'SELECT word, COUNT(*) AS cnt FROM class_wordcloud_entries WHERE wordcloud_id = ? GROUP BY word ORDER BY cnt DESC, word ASC',
      [id]
    );
    const [studentRows] = await connection.execute(
      'SELECT COUNT(DISTINCT student_id) AS cnt FROM class_wordcloud_entries WHERE wordcloud_id = ?',
      [id]
    );
    await connection.end();
    res.json({
      wordcloud: cloud,
      words: wordRows.map(r => ({ word: r.word, count: r.cnt })),
      totalEntries: wordRows.reduce((s, r) => s + r.cnt, 0),
      totalStudents: studentRows[0]?.cnt || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch word cloud results' });
  }
});

// GET /student/wordcloud/active?section_id=X&student_id=Y — what the student overlay polls
router.get('/student/wordcloud/active', async (req, res) => {
  const { section_id, student_id } = req.query;
  if (!section_id) return res.status(400).json({ error: 'section_id is required' });
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    const [rows] = await connection.execute(
      'SELECT * FROM class_wordclouds WHERE section_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1',
      [section_id]
    );
    if (rows.length === 0) { await connection.end(); return res.json({ wordcloud: null }); }
    const cloud = cloudRowToJson(rows[0]);
    let myWords = [];
    if (student_id) {
      const [wordRows] = await connection.execute(
        'SELECT word FROM class_wordcloud_entries WHERE wordcloud_id = ? AND student_id = ? ORDER BY submitted_at ASC',
        [cloud.id, student_id]
      );
      myWords = wordRows.map(r => r.word);
    }
    await connection.end();
    res.json({ wordcloud: cloud, myWords, remaining: Math.max(cloud.max_words - myWords.length, 0) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check active word cloud' });
  }
});

// POST /student/wordcloud/submit — { wordcloud_id, student_id, word }
router.post('/student/wordcloud/submit', async (req, res) => {
  const { wordcloud_id, student_id, word } = req.body || {};
  const normalized = normalizeWord(word);
  if (!wordcloud_id || !student_id || !normalized) {
    return res.status(400).json({ error: 'wordcloud_id, student_id, and word are required' });
  }
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    const [cloudRows] = await connection.execute(
      'SELECT active, max_words FROM class_wordclouds WHERE id = ? LIMIT 1',
      [wordcloud_id]
    );
    if (cloudRows.length === 0 || !cloudRows[0].active) {
      await connection.end();
      return res.status(409).json({ error: 'This word cloud is no longer active' });
    }
    const [countRows] = await connection.execute(
      'SELECT COUNT(*) AS cnt FROM class_wordcloud_entries WHERE wordcloud_id = ? AND student_id = ?',
      [wordcloud_id, student_id]
    );
    if ((countRows[0]?.cnt || 0) >= cloudRows[0].max_words) {
      await connection.end();
      return res.status(409).json({ error: `You've already submitted your ${cloudRows[0].max_words} word(s).` });
    }
    try {
      await connection.execute(
        'INSERT INTO class_wordcloud_entries (wordcloud_id, student_id, word) VALUES (?, ?, ?)',
        [wordcloud_id, student_id, normalized]
      );
    } catch (dupErr) {
      if (dupErr.code === 'ER_DUP_ENTRY') {
        await connection.end();
        return res.status(409).json({ error: 'You already submitted that word' });
      }
      throw dupErr;
    }
    await connection.end();
    res.json({ success: true, word: normalized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

module.exports = router;
