<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$studentId = trim($_GET['student_id'] ?? '');

if (!$studentId) {
    http_response_code(400);
    echo json_encode(['error' => 'student_id is required']);
    exit;
}

$db = getDB();

// Get student's section so the client can determine course/period
$stu = $db->prepare('SELECT section_id FROM students WHERE student_id = ? LIMIT 1');
$stu->bind_param('s', $studentId);
$stu->execute();
$stuRow = $stu->get_result()->fetch_assoc();
$stu->close();
$sectionId = $stuRow['section_id'] ?? '';

// All exam definitions — client filters by course
$examsResult = $db->query(
    'SELECT exam_id, title, total_points, due_date, instructions, course_id, period_due_dates
     FROM exams ORDER BY created_at ASC'
);

// This student's grades indexed by exam_id for fast lookup
$gradesStmt = $db->prepare(
    'SELECT exam_id, score, total_points, timestamp FROM grades WHERE student_id = ?'
);
$gradesStmt->bind_param('s', $studentId);
$gradesStmt->execute();
$gradesResult = $gradesStmt->get_result();
$gradesMap = [];
while ($g = $gradesResult->fetch_assoc()) {
    $gradesMap[$g['exam_id']] = $g;
}
$gradesStmt->close();

// Merge exams with grades; only include assignments that have a due date
// for this student's section (or a global due date). Always include anything
// the student already has a grade for so they can see submitted work.
$assignments = [];
while ($row = $examsResult->fetch_assoc()) {
    $eid         = $row['exam_id'];
    $grade       = $gradesMap[$eid] ?? null;
    $periodDates = $row['period_due_dates'] ? json_decode($row['period_due_dates'], true) : [];

    // Pick the most specific due date for this student
    if ($sectionId && isset($periodDates[$sectionId]) && $periodDates[$sectionId]) {
        $effectiveDue = $periodDates[$sectionId];
    } elseif ($row['due_date']) {
        $effectiveDue = $row['due_date'];
    } else {
        $effectiveDue = null;
    }

    // Skip assignments with no due date unless the student already submitted it
    if (!$effectiveDue && !$grade) continue;

    $assignments[] = [
        'exam_id'          => $eid,
        'title'            => $row['title'],
        'total_points'     => $row['total_points'],
        'due_date'         => $effectiveDue,
        'instructions'     => $row['instructions'],
        'course_id'        => $row['course_id'],
        'period_due_dates' => $row['period_due_dates'],
        'score'            => $grade ? $grade['score']     : null,
        'timestamp'        => $grade ? $grade['timestamp'] : null,
    ];
}

// Also include any grade-only entries (grades with no matching exam row)
// These are auto-created by submit-exam.php; show them so the student can see them.
foreach ($gradesMap as $eid => $grade) {
    $alreadyIncluded = false;
    foreach ($assignments as $a) {
        if ($a['exam_id'] === $eid) { $alreadyIncluded = true; break; }
    }
    if (!$alreadyIncluded) {
        $assignments[] = [
            'exam_id'      => $eid,
            'title'        => $eid,   // fall back to exam_id as title
            'total_points' => $grade['total_points'],
            'due_date'     => null,
            'instructions' => '',
            'course_id'    => 'All',
            'period_due_dates' => null,
            'score'        => $grade['score'],
            'timestamp'    => $grade['timestamp'],
        ];
    }
}

$db->close();

echo json_encode([
    'section_id'  => $sectionId,
    'assignments' => $assignments,
]);
