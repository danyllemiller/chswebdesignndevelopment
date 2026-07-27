const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

// GET /rank/leaderboard?section_id=XXX
// Returns students ranked by a composite Guild Score:
//   50% grade average (student_grade_log, last 90 days)
//   25% habit consistency (planner_habit_log, last 28 days)
//   25% attendance on-time rate (timesheets, last 90 days)
router.get('/rank/leaderboard', async (req, res) => {
    const { section_id } = req.query;
    try {
        const connection = await getDbConnection();

        const [gradeRows] = await connection.execute(`
            SELECT student_id,
                   ROUND(AVG(score / NULLIF(max_score, 0) * 100), 1) AS grade_score,
                   COUNT(*)                                           AS entry_count
            FROM student_grade_log
            WHERE grade_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
              AND max_score > 0
            GROUP BY student_id
        `);

        const [habitRows] = await connection.execute(`
            SELECT student_id,
                   ROUND(COUNT(DISTINCT log_date) / 28 * 100, 1) AS habit_score,
                   COUNT(DISTINCT log_date)                       AS habit_days
            FROM planner_habit_log
            WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
            GROUP BY student_id
        `);

        const [attendRows] = await connection.execute(`
            SELECT student_id,
                   ROUND(
                       (SUM(CASE WHEN in_answer  = 'On Time' THEN 1 ELSE 0 END) +
                        SUM(CASE WHEN out_answer = 'On Time' THEN 1 ELSE 0 END))
                       / NULLIF(COUNT(*) * 2, 0) * 100, 1
                   ) AS attend_score,
                   COUNT(*) AS shift_count
            FROM timesheets
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
            GROUP BY student_id
        `);

        let studentSql = `
            SELECT student_id, first_name, last_name, section_id
            FROM students
            WHERE (role IS NULL OR LOWER(role) NOT IN ('admin','teacher'))
              AND (section_id IS NULL OR section_id != 'Teacher')
        `;
        const params = [];
        if (section_id) { studentSql += ' AND section_id = ?'; params.push(section_id); }
        studentSql += ' ORDER BY last_name, first_name';
        const [students] = await connection.execute(studentSql, params);
        await connection.end();

        const gradeMap  = {};
        gradeRows.forEach(r  => { gradeMap[r.student_id]  = { score: Number(r.grade_score),  count: Number(r.entry_count) }; });
        const habitMap  = {};
        habitRows.forEach(r  => { habitMap[r.student_id]  = { score: Number(r.habit_score),  days: Number(r.habit_days) }; });
        const attendMap = {};
        attendRows.forEach(r => { attendMap[r.student_id] = { score: Number(r.attend_score), shifts: Number(r.shift_count) }; });

        const scored = students.map(s => {
            const grade  = gradeMap[s.student_id]  || { score: 0, count: 0 };
            const habit  = habitMap[s.student_id]  || { score: 0, days: 0 };
            const attend = attendMap[s.student_id] || { score: 0, shifts: 0 };
            const hasData = grade.count > 0 || habit.days > 0 || attend.shifts > 0;
            const guild_score = hasData
                ? Math.round(grade.score * 0.50 + habit.score * 0.25 + attend.score * 0.25)
                : null;
            return {
                student_id:    s.student_id,
                first_name:    s.first_name,
                last_name:     s.last_name,
                section_id:    s.section_id,
                guild_score,
                grade_score:   grade.score,
                habit_score:   habit.score,
                attend_score:  attend.score,
                grade_entries: grade.count,
                habit_days:    habit.days,
                shift_count:   attend.shifts
            };
        });

        // Students with data rank first (desc score), no-data students append without rank
        scored.sort((a, b) => {
            if (a.guild_score === null && b.guild_score === null) return 0;
            if (a.guild_score === null) return 1;
            if (b.guild_score === null) return -1;
            return b.guild_score - a.guild_score;
        });

        let rank = 1;
        scored.forEach((s, i) => {
            if (s.guild_score !== null) {
                if (i > 0 && scored[i - 1].guild_score === s.guild_score) {
                    s.rank = scored[i - 1].rank;
                } else {
                    s.rank = rank;
                }
                rank = i + 2;
            } else {
                s.rank = null;
            }
        });

        res.json({ leaderboard: scored });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to compute leaderboard' });
    }
});

// GET /rank/sections — distinct section IDs for the filter bar
router.get('/rank/sections', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT DISTINCT section_id FROM students
            WHERE (role IS NULL OR LOWER(role) NOT IN ('admin','teacher'))
              AND section_id IS NOT NULL AND section_id != 'Teacher'
            ORDER BY section_id
        `);
        await connection.end();
        res.json({ sections: rows.map(r => r.section_id) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch sections' });
    }
});

module.exports = router;
