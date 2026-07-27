const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

const ON_TIME_BONUS = 5.00;

async function ensurePaystubTables() {
    let connection;
    try {
        connection = await getDbConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS payroll_runs (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                period_start DATE NOT NULL,
                period_end   DATE NOT NULL,
                run_by       VARCHAR(100),
                notes        TEXT,
                is_finalized TINYINT(1) DEFAULT 1,
                run_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_period (period_start, period_end)
            )
        `);
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_paystubs (
                id               INT AUTO_INCREMENT PRIMARY KEY,
                payroll_run_id   INT NOT NULL,
                student_id       VARCHAR(50) NOT NULL,
                role_title       VARCHAR(100),
                hourly_rate      DECIMAL(8,2) DEFAULT 0,
                regular_hours    DECIMAL(10,4) DEFAULT 0,
                bonus_count      INT DEFAULT 0,
                bonus_rate       DECIMAL(8,2) DEFAULT 5.00,
                gross_pay        DECIMAL(10,2) DEFAULT 0,
                fed_tax          DECIMAL(10,2) DEFAULT 0,
                ss_tax           DECIMAL(10,2) DEFAULT 0,
                med_tax          DECIMAL(10,2) DEFAULT 0,
                total_deductions DECIMAL(10,2) DEFAULT 0,
                net_pay          DECIMAL(10,2) DEFAULT 0,
                ytd_gross        DECIMAL(10,2) DEFAULT 0,
                generated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_stub (payroll_run_id, student_id),
                FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id)
            )
        `);
    } catch (e) {
        console.error('[paystubs] Migration error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
}

ensurePaystubTables();

// GET /paystubs/my?student_id=X — all finalized paystubs for a student
router.get('/paystubs/my', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT sp.*, pr.period_start, pr.period_end, pr.is_finalized, pr.run_by, pr.run_at
            FROM student_paystubs sp
            JOIN payroll_runs pr ON sp.payroll_run_id = pr.id
            WHERE sp.student_id = ?
            ORDER BY pr.period_end DESC
        `, [student_id]);
        await connection.end();
        res.json({ paystubs: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch paystubs' });
    }
});

// GET /paystubs/ytd?student_id=X&year=2026 — year-end tax summary
router.get('/paystubs/ytd', async (req, res) => {
    const { student_id, year } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    const targetYear = Number(year) || new Date().getFullYear();
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT
                COALESCE(SUM(sp.gross_pay), 0)        AS total_gross,
                COALESCE(SUM(sp.fed_tax), 0)          AS total_fed_tax,
                COALESCE(SUM(sp.ss_tax), 0)           AS total_ss_tax,
                COALESCE(SUM(sp.med_tax), 0)          AS total_med_tax,
                COALESCE(SUM(sp.total_deductions), 0) AS total_deductions,
                COALESCE(SUM(sp.net_pay), 0)          AS total_net_pay,
                COALESCE(SUM(sp.regular_hours), 0)    AS total_hours,
                COALESCE(SUM(sp.bonus_count), 0)      AS total_bonuses,
                MAX(sp.role_title)                    AS role_title,
                MAX(sp.hourly_rate)                   AS hourly_rate,
                COUNT(*)                              AS period_count
            FROM student_paystubs sp
            JOIN payroll_runs pr ON sp.payroll_run_id = pr.id
            WHERE sp.student_id = ? AND YEAR(pr.period_end) = ?
        `, [student_id, targetYear]);
        await connection.end();
        res.json({ ytd: rows[0] || null, year: targetYear });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch YTD data' });
    }
});

// GET /admin/payroll/runs — all payroll runs for admin dashboard
router.get('/admin/payroll/runs', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [runs] = await connection.execute(`
            SELECT pr.*, COUNT(sp.id) AS stub_count,
                   COALESCE(SUM(sp.gross_pay), 0) AS total_gross,
                   COALESCE(SUM(sp.net_pay), 0)   AS total_net
            FROM payroll_runs pr
            LEFT JOIN student_paystubs sp ON pr.id = sp.payroll_run_id
            GROUP BY pr.id
            ORDER BY pr.period_end DESC
        `);
        await connection.end();
        res.json({ runs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch payroll runs' });
    }
});

// GET /admin/payroll/run-detail/:id — all paystubs in a specific run
router.get('/admin/payroll/run-detail/:id', async (req, res) => {
    const runId = Number(req.params.id);
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute(`
            SELECT sp.*, s.first_name, s.last_name, s.section_id
            FROM student_paystubs sp
            JOIN students s ON sp.student_id = s.student_id
            WHERE sp.payroll_run_id = ?
            ORDER BY s.last_name, s.first_name
        `, [runId]);
        await connection.end();
        res.json({ stubs: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch run detail' });
    }
});

// POST /admin/payroll/run — run payroll for a pay period
router.post('/admin/payroll/run', async (req, res) => {
    const { period_start, period_end, run_by, notes } = req.body;
    if (!period_start || !period_end) return res.status(400).json({ error: 'period_start and period_end required' });

    try {
        const connection = await getDbConnection();

        // Create or update payroll run record
        await connection.execute(
            `INSERT INTO payroll_runs (period_start, period_end, run_by, notes, is_finalized)
             VALUES (?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE run_by = VALUES(run_by), notes = VALUES(notes),
               is_finalized = 1, run_at = CURRENT_TIMESTAMP`,
            [period_start, period_end, (run_by || 'teacher').substring(0, 100), notes || null]
        );
        const [[runRow]] = await connection.execute(
            'SELECT id FROM payroll_runs WHERE period_start = ? AND period_end = ?',
            [period_start, period_end]
        );
        const runId = runRow.id;

        // All students (excluding teacher/admin)
        const [students] = await connection.execute(`
            SELECT s.student_id, s.first_name, s.last_name,
                   COALESCE(r.title, 'Web Developer')                         AS role_title,
                   COALESCE(CAST(r.hourly_rate AS DECIMAL(8,2)), 35.00)       AS hourly_rate
            FROM students s
            LEFT JOIN pay_roles r ON s.role_id = r.id
            WHERE (s.role IS NULL OR LOWER(s.role) NOT IN ('admin','teacher'))
              AND (s.section_id IS NULL OR s.section_id != 'Teacher')
        `);

        // Timesheets for this period
        const [timesheets] = await connection.execute(
            'SELECT * FROM timesheets WHERE date >= ? AND date <= ?',
            [period_start, period_end]
        );
        const tsMap = {};
        timesheets.forEach(t => {
            if (!tsMap[t.student_id]) tsMap[t.student_id] = [];
            tsMap[t.student_id].push(t);
        });

        // Prior-period YTD gross (same calendar year, before this period)
        const [ytdPrior] = await connection.execute(`
            SELECT sp.student_id, COALESCE(SUM(sp.gross_pay), 0) AS prior_gross
            FROM student_paystubs sp
            JOIN payroll_runs pr ON sp.payroll_run_id = pr.id
            WHERE YEAR(pr.period_end) = YEAR(?) AND pr.period_end < ?
              AND sp.payroll_run_id != ?
            GROUP BY sp.student_id
        `, [period_end, period_end, runId]);
        const ytdMap = {};
        ytdPrior.forEach(r => { ytdMap[r.student_id] = Number(r.prior_gross); });

        let generated = 0;
        for (const s of students) {
            const shifts = tsMap[s.student_id] || [];
            const rate   = Number(s.hourly_rate) || 35;
            let totalMins = 0;
            let bonusCount = 0;

            for (const t of shifts) {
                if (t.clock_in && t.clock_out) {
                    const start = new Date(`${t.date}T${t.clock_in}`);
                    const end   = new Date(`${t.date}T${t.clock_out}`);
                    const mins  = Math.round((end - start) / 60000);
                    if (mins > 0) totalMins += mins;
                }
                if (t.in_answer  === 'On Time') bonusCount++;
                if (t.out_answer === 'On Time') bonusCount++;
            }

            const regularHours = totalMins / 60;
            const gross        = Number((regularHours * rate + bonusCount * ON_TIME_BONUS).toFixed(2));
            const fedTax       = Number((gross * 0.10).toFixed(2));
            const ssTax        = Number((gross * 0.062).toFixed(2));
            const medTax       = Number((gross * 0.0145).toFixed(2));
            const totalDed     = Number((fedTax + ssTax + medTax).toFixed(2));
            const net          = Number((gross - totalDed).toFixed(2));
            const ytdGross     = Number(((ytdMap[s.student_id] || 0) + gross).toFixed(2));

            await connection.execute(`
                INSERT INTO student_paystubs
                  (payroll_run_id, student_id, role_title, hourly_rate, regular_hours,
                   bonus_count, bonus_rate, gross_pay, fed_tax, ss_tax, med_tax,
                   total_deductions, net_pay, ytd_gross)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  role_title = VALUES(role_title), hourly_rate = VALUES(hourly_rate),
                  regular_hours = VALUES(regular_hours), bonus_count = VALUES(bonus_count),
                  gross_pay = VALUES(gross_pay), fed_tax = VALUES(fed_tax),
                  ss_tax = VALUES(ss_tax), med_tax = VALUES(med_tax),
                  total_deductions = VALUES(total_deductions), net_pay = VALUES(net_pay),
                  ytd_gross = VALUES(ytd_gross), generated_at = CURRENT_TIMESTAMP
            `, [runId, s.student_id, s.role_title, rate, regularHours.toFixed(4),
                bonusCount, ON_TIME_BONUS, gross, fedTax, ssTax, medTax, totalDed, net, ytdGross]);

            generated++;
        }

        await connection.end();
        res.json({ success: true, payroll_run_id: runId, paystubs_generated: generated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to run payroll' });
    }
});

module.exports = router;
