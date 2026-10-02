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
    // One active "I'm late, here's why" claim per student per day -- a late
    // scan consumes it (sets consumed_at) so it can't cover a second late
    // scan to a different class the same day without refilling the form.
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
