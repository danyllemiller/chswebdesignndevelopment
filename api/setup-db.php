<?php
/**
 * ONE-TIME DATABASE SETUP SCRIPT
 *
 * Run this once on the server by visiting /api/setup-db.php in a browser
 * (or via CLI: php api/setup-db.php).
 * DELETE or RENAME this file after running it.
 *
 * Creates the tables needed for the gradebook system.
 * Uses CREATE TABLE IF NOT EXISTS — safe to run even if some tables exist.
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'digartcl_danylle');
define('DB_PASS', 'k@T1e!2503!$');
define('DB_NAME', 'digartcl_students');

$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    die('DB connection failed: ' . $conn->connect_error);
}
$conn->set_charset('utf8mb4');

$tables = [];

// --- students -----------------------------------------------------------
// May already exist on the server. IF NOT EXISTS keeps it safe.
$tables['students'] = "CREATE TABLE IF NOT EXISTS `students` (
  `id`                  INT AUTO_INCREMENT PRIMARY KEY,
  `student_id`          VARCHAR(50)  NOT NULL,
  `username`            VARCHAR(100) NOT NULL,
  `password_hash`       VARCHAR(255) NOT NULL,
  `first_name`          VARCHAR(100) NOT NULL DEFAULT '',
  `last_name`           VARCHAR(100) NOT NULL DEFAULT '',
  `section_id`          VARCHAR(50)  NOT NULL DEFAULT 'Unassigned',
  `role`                VARCHAR(20)  NOT NULL DEFAULT 'student',
  `must_change_password` TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_student_id` (`student_id`),
  UNIQUE KEY `uq_username`   (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

// --- exams --------------------------------------------------------------
$tables['exams'] = "CREATE TABLE IF NOT EXISTS `exams` (
  `exam_id`          VARCHAR(250) NOT NULL,
  `title`            VARCHAR(250) NOT NULL,
  `total_points`     INT          NOT NULL DEFAULT 100,
  `due_date`         DATE                  DEFAULT NULL,
  `instructions`     TEXT,
  `course_id`        VARCHAR(50)           DEFAULT 'All',
  `period_due_dates` TEXT,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`exam_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

// --- grades -------------------------------------------------------------
$tables['grades'] = "CREATE TABLE IF NOT EXISTS `grades` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `student_id`   VARCHAR(50)  NOT NULL,
  `exam_id`      VARCHAR(250) NOT NULL,
  `score`        VARCHAR(50)           DEFAULT NULL,
  `total_points` INT                   DEFAULT 100,
  `timestamp`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_student_exam` (`student_id`, `exam_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_exam_id`    (`exam_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

// --- exam_progress ------------------------------------------------------
$tables['exam_progress'] = "CREATE TABLE IF NOT EXISTS `exam_progress` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `student_id`    VARCHAR(50)  NOT NULL,
  `exam_id`       VARCHAR(250) NOT NULL,
  `answers`       TEXT,
  `current_index` INT          NOT NULL DEFAULT 0,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_progress` (`student_id`, `exam_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

// --- timeclock_log -------------------------------------------------------
$tables['timeclock_log'] = "CREATE TABLE IF NOT EXISTS `timeclock_log` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50)  NOT NULL,
  `section_id` VARCHAR(50)           DEFAULT NULL,
  `type`       VARCHAR(20)  NOT NULL,
  `answer`     VARCHAR(500)          DEFAULT NULL,
  `timestamp`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_student_time` (`student_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

// --- cs_questions -------------------------------------------------------
$tables['cs_questions'] = "CREATE TABLE IF NOT EXISTS `cs_questions` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `unit`      VARCHAR(10)  NOT NULL,
  `question`  TEXT         NOT NULL,
  `options`   TEXT         NOT NULL,
  `answer`    VARCHAR(500) NOT NULL,
  `course_id` VARCHAR(50)           DEFAULT 'CS',
  KEY `idx_unit` (`unit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

// Run all table creations
$results = [];
foreach ($tables as $name => $sql) {
    if ($conn->query($sql)) {
        $results[] = "✅ $name — OK";
    } else {
        $results[] = "❌ $name — " . $conn->error;
    }
}

$conn->close();
?>
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>DB Setup</title></head>
<body style="font-family:monospace;padding:2em;">
<h2>Database Setup Results</h2>
<ul>
<?php foreach ($results as $r): ?>
  <li><?= htmlspecialchars($r) ?></li>
<?php endforeach; ?>
</ul>
<p style="color:red;font-weight:bold;">DELETE this file from the server now that setup is complete.</p>
</body>
</html>
