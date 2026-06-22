<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

$db = getDB();

$result = $db->query(
    "SELECT exam_id, title, total_points, course_id, due_date, period_due_dates
     FROM exams ORDER BY exam_id"
);
$exams = [];
while ($row = $result->fetch_assoc()) {
    $row['period_due_dates'] = $row['period_due_dates']
        ? json_decode($row['period_due_dates'], true)
        : (object)[];
    $exams[$row['exam_id']] = $row;
}

// Distinct class periods from roster
$sections = [];
$sr = $db->query(
    "SELECT DISTINCT section_id FROM students
     WHERE section_id IS NOT NULL AND section_id != ''
     ORDER BY section_id"
);
if ($sr) {
    while ($row = $sr->fetch_assoc()) $sections[] = $row['section_id'];
}

$db->close();
echo json_encode(['exams' => $exams, 'sections' => $sections]);
