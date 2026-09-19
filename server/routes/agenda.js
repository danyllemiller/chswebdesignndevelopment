// server/routes/agenda.js
// Replaces api/agenda/get.php and api/admin/save-agenda-content.php --
// neither had any auth. get.php only reads lesson-plan text (not student
// PII), but save-agenda-content.php let anyone silently overwrite any
// day's lesson plan/warm-up content with no check at all.
const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { requireStaff } = require('../helpers');

const AGENDA_CONTENT_DDL = `CREATE TABLE IF NOT EXISTS agenda_content (
    course     VARCHAR(20) NOT NULL,
    block_num  INT         NOT NULL,
    content    LONGTEXT    NOT NULL,
    updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (course, block_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const AGENDA_SCHEDULE_DDL = `CREATE TABLE IF NOT EXISTS agenda_schedule (
    course     VARCHAR(20) NOT NULL,
    track      VARCHAR(10) NOT NULL DEFAULT 'main',
    block_num  INT         NOT NULL,
    event_date DATE        NOT NULL,
    PRIMARY KEY (course, track, block_num),
    KEY idx_lookup (course, track, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

// This is the teacher's own daily-planning tool (admin/daily-agenda.html),
// not student-facing, so staff-only rather than merely requireLogin.
router.get('/agenda/get', requireStaff, async (req, res) => {
    const course = String(req.query.course || '').trim();
    if (!course) return res.status(400).json({ error: 'course is required' });
    try {
        const connection = await getDbConnection();
        await connection.execute(AGENDA_CONTENT_DDL);
        await connection.execute(AGENDA_SCHEDULE_DDL);

        const [contentRows] = await connection.execute(
            'SELECT block_num, content FROM agenda_content WHERE course = ? ORDER BY block_num', [course]
        );
        const content = {};
        contentRows.forEach(r => { content[r.block_num] = JSON.parse(r.content); });

        const [scheduleRows] = await connection.execute(
            'SELECT track, block_num, event_date FROM agenda_schedule WHERE course = ? ORDER BY track, block_num', [course]
        );
        const schedule = {};
        scheduleRows.forEach(r => {
            if (!schedule[r.track]) schedule[r.track] = {};
            schedule[r.track][r.block_num] = r.event_date.toISOString().split('T')[0];
        });

        await connection.release();
        res.json({ course, content, schedule });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch agenda' }); }
});

// Under /admin/ -- already covered by the blanket admin gate in server/api.js.
router.post('/admin/save-agenda-content', async (req, res) => {
    const course = String(req.body?.course || '').trim();
    const blockNum = parseInt(req.body?.block_num, 10) || 0;
    const content = req.body?.content;
    if (!course || !blockNum || typeof content !== 'object' || content === null || Array.isArray(content)) {
        return res.status(400).json({ error: 'course, block_num, and content are required' });
    }
    try {
        const connection = await getDbConnection();
        await connection.execute(AGENDA_CONTENT_DDL);
        await connection.execute(
            `INSERT INTO agenda_content (course, block_num, content) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE content = VALUES(content)`,
            [course, blockNum, JSON.stringify(content)]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save agenda content' }); }
});

module.exports = router;
