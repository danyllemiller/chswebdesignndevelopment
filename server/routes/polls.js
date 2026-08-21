const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

const CREATE_POLLS_SQL = `
  CREATE TABLE IF NOT EXISTS class_polls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id VARCHAR(50) NOT NULL,
    question VARCHAR(500) NOT NULL,
    options_json TEXT NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    KEY idx_section_active (section_id, active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const CREATE_VOTES_SQL = `
  CREATE TABLE IF NOT EXISTS class_poll_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    option_index INT NOT NULL,
    voted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_vote (poll_id, student_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function ensureTables(connection) {
  await connection.execute(CREATE_POLLS_SQL);
  await connection.execute(CREATE_VOTES_SQL);
}

function pollRowToJson(row) {
  return {
    id: row.id,
    section_id: row.section_id,
    question: row.question,
    options: JSON.parse(row.options_json),
    active: !!row.active,
    created_at: row.created_at,
    closed_at: row.closed_at
  };
}

// POST /admin/polls/create — { question, options: [...], section_id }
router.post('/admin/polls/create', async (req, res) => {
  const { question, options, section_id } = req.body || {};
  if (!question || !Array.isArray(options) || options.length < 2 || !section_id) {
    return res.status(400).json({ error: 'question, section_id, and at least 2 options are required' });
  }
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    await connection.execute(
      'UPDATE class_polls SET active = 0, closed_at = NOW() WHERE section_id = ? AND active = 1',
      [section_id]
    );
    const [result] = await connection.execute(
      'INSERT INTO class_polls (section_id, question, options_json, active) VALUES (?, ?, ?, 1)',
      [section_id, String(question).trim(), JSON.stringify(options.map(o => String(o).trim()))]
    );
    await connection.release();
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// POST /admin/polls/close — { id }
router.post('/admin/polls/close', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    await connection.execute('UPDATE class_polls SET active = 0, closed_at = NOW() WHERE id = ?', [id]);
    await connection.release();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to close poll' });
  }
});

// GET /admin/polls/results?id=X — live vote tally for the teacher's view
router.get('/admin/polls/results', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    const [pollRows] = await connection.execute('SELECT * FROM class_polls WHERE id = ? LIMIT 1', [id]);
    if (pollRows.length === 0) { await connection.release(); return res.status(404).json({ error: 'Poll not found' }); }
    const poll = pollRowToJson(pollRows[0]);
    const [voteRows] = await connection.execute(
      'SELECT option_index, COUNT(*) AS cnt FROM class_poll_votes WHERE poll_id = ? GROUP BY option_index',
      [id]
    );
    await connection.release();
    const counts = poll.options.map((_, i) => {
      const found = voteRows.find(r => r.option_index === i);
      return found ? found.cnt : 0;
    });
    res.json({ poll, counts, total: counts.reduce((a, b) => a + b, 0) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch poll results' });
  }
});

// GET /student/polls/active?section_id=X&student_id=Y — what the student overlay polls
router.get('/student/polls/active', async (req, res) => {
  const { section_id, student_id } = req.query;
  if (!section_id) return res.status(400).json({ error: 'section_id is required' });
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    const [rows] = await connection.execute(
      'SELECT * FROM class_polls WHERE section_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1',
      [section_id]
    );
    if (rows.length === 0) { await connection.release(); return res.json({ poll: null }); }
    const poll = pollRowToJson(rows[0]);
    let alreadyVoted = false, votedOption = null;
    if (student_id) {
      const [voteRows] = await connection.execute(
        'SELECT option_index FROM class_poll_votes WHERE poll_id = ? AND student_id = ? LIMIT 1',
        [poll.id, student_id]
      );
      if (voteRows.length > 0) { alreadyVoted = true; votedOption = voteRows[0].option_index; }
    }
    await connection.release();
    res.json({ poll, alreadyVoted, votedOption });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check active poll' });
  }
});

// POST /student/polls/vote — { poll_id, student_id, option_index }
router.post('/student/polls/vote', async (req, res) => {
  const { poll_id, student_id, option_index } = req.body || {};
  if (!poll_id || !student_id || option_index === undefined) {
    return res.status(400).json({ error: 'poll_id, student_id, and option_index are required' });
  }
  try {
    const connection = await getDbConnection();
    await ensureTables(connection);
    const [pollRows] = await connection.execute('SELECT active FROM class_polls WHERE id = ? LIMIT 1', [poll_id]);
    if (pollRows.length === 0 || !pollRows[0].active) {
      await connection.release();
      return res.status(409).json({ error: 'This poll is no longer active' });
    }
    try {
      await connection.execute(
        'INSERT INTO class_poll_votes (poll_id, student_id, option_index) VALUES (?, ?, ?)',
        [poll_id, student_id, option_index]
      );
    } catch (dupErr) {
      if (dupErr.code === 'ER_DUP_ENTRY') {
        await connection.release();
        return res.status(409).json({ error: 'You already voted on this poll' });
      }
      throw dupErr;
    }
    await connection.release();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

module.exports = router;
