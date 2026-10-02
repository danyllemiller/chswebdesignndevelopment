// server/lib/attendanceStore.js
// Shared by server/routes/attendance.js (the scan/tardy-form API) and
// server/jobs/attendanceSweep.js (the daily absent sweep) -- kept out of
// the route file itself so the job doesn't have to import a router.
const GRACE_MINUTES = 3; // scan at/before period start + this many minutes still counts as present

async function ensureAttendanceTables(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(50) NOT NULL,
            section_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            status ENUM('present','tardy','absent') NOT NULL,
            scanned_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_attendance (student_id, section_id, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    // Nothing here ever touches Infinite Campus (the school's actual system
    // of record) -- no API access to it exists. This just tracks which
    // tardy/absent rows the teacher has NOT yet manually re-entered there
    // yet, so the reminder badge has something to count down from. Present
    // isn't tracked here since IC defaults everyone to present already --
    // only the exceptions need a manual IC edit.
    const [col] = await connection.execute(`SHOW COLUMNS FROM attendance LIKE 'ic_synced'`);
    if (col.length === 0) {
        await connection.execute(`ALTER TABLE attendance ADD COLUMN ic_synced TINYINT(1) DEFAULT 0`);
    }
    // Links a tardy attendance row to the exact tardy_passes row it created,
    // so a staff correction (e.g. a scan line that ran past the grace
    // window through no fault of the student's) can delete that specific
    // consequence-ladder entry instead of leaving a phantom tardy behind
    // after the attendance status itself gets fixed.
    const [col2] = await connection.execute(`SHOW COLUMNS FROM attendance LIKE 'tardy_pass_id'`);
    if (col2.length === 0) {
        await connection.execute(`ALTER TABLE attendance ADD COLUMN tardy_pass_id INT NULL`);
    }
    // One active "I'm late, here's why" claim per student per day -- a late
    // scan consumes it (sets consumed_at) so it can't cover a second late
    // scan to a different class the same day without refilling the form.
    // Rows are never deleted after being consumed either -- this doubles as
    // the permanent record of what the student actually wrote, since
    // tardy_passes.reason (VARCHAR(255)) only ever gets the short "reason
    // for being late" line, not the full form.
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS tardy_form_pending (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            reason TEXT,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            consumed_at TIMESTAMP NULL,
            UNIQUE KEY unique_pending (student_id, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    // had_pass: 'yes'/'no'. notes: the optional "anything I should know"
    // field. reflection_1-4: only required (both client- and server-side)
    // once this is the student's 2nd+ effective tardy this quarter -- same
    // threshold the existing TARDY_LADDER's step-2 "written reflection"
    // consequence already uses, computeEffectiveCount() in tardyLogic.js.
    const tardyFormCols = ['had_pass VARCHAR(10) NULL', 'notes TEXT NULL',
        'reflection_1 TEXT NULL', 'reflection_2 TEXT NULL', 'reflection_3 TEXT NULL', 'reflection_4 TEXT NULL'];
    for (const colDef of tardyFormCols) {
        const colName = colDef.split(' ')[0];
        const [col] = await connection.execute(`SHOW COLUMNS FROM tardy_form_pending LIKE '${colName}'`);
        if (col.length === 0) {
            await connection.execute(`ALTER TABLE tardy_form_pending ADD COLUMN ${colDef}`);
        }
    }
}

// AS students carry "AS-B2" (the real B2 period, tracked separately for
// grading) -- same stripping payroll.js/paystubs.js/autoClockout.js already
// use, so "enrolled in B2" correctly includes them instead of only matching
// students whose section_id is the literal string "B2".
function realPeriod(sectionId) {
    return String(sectionId || '').replace(/^AS-/, '');
}

async function getEnrolledStudents(connection, periodLabel) {
    const [rows] = await connection.execute(
        `SELECT DISTINCT s.student_id, s.first_name, s.last_name, s.section_id
         FROM students s
         LEFT JOIN student_additional_sections a ON a.student_id = s.student_id
         WHERE (s.archived IS NULL OR s.archived = 0)
           AND (REPLACE(s.section_id, 'AS-', '') = ? OR REPLACE(a.section_id, 'AS-', '') = ?)`,
        [periodLabel, periodLabel]
    );
    return rows;
}

module.exports = { GRACE_MINUTES, ensureAttendanceTables, realPeriod, getEnrolledStudents };
