<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$db = getDB();

// Students (exclude Teacher-role accounts from the student list)
$studentsResult = $db->query(
    "SELECT student_id, username, first_name, last_name, section_id, role
     FROM students
     WHERE role != 'admin'
     ORDER BY section_id, last_name, first_name"
);
$students = [];
while ($row = $studentsResult->fetch_assoc()) {
    $students[] = $row;
}

// Exam definitions
$examsResult = $db->query(
    "SELECT exam_id, title, total_points, due_date, instructions, course_id, period_due_dates
     FROM exams
     ORDER BY exam_id ASC"
);
$assignments = [];
while ($row = $examsResult->fetch_assoc()) {
    $assignments[] = $row;
}

// All grades
$gradesResult = $db->query(
    "SELECT student_id, exam_id, score, total_points, timestamp
     FROM grades
     ORDER BY timestamp ASC"
);
$grades = [];
while ($row = $gradesResult->fetch_assoc()) {
    $grades[] = $row;
}

$db->close();

echo json_encode([
    'students'       => $students,
    'assignments'    => $assignments,
    'grades'         => $grades,
    'calendarConfig' => null,
]);
