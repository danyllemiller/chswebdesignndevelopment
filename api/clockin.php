<?php
require_once __DIR__ . '/db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body      = jsonInput();
$studentId = trim($body['student_id'] ?? '');
$sectionId = trim($body['section_id'] ?? '');
$type      = trim($body['type'] ?? 'Regular'); // Regular, Overtime
$answer    = trim($body['answer'] ?? 'N/A');

if (!$studentId) {
    http_response_code(400);
    echo json_encode(['error' => 'student_id is required']);
    exit;
}

date_default_timezone_set('America/Los_Angeles');
$db = getDB();

// Log the raw timeclock event
$stmt = $db->prepare(
    'INSERT INTO timeclock_log (student_id, section_id, type, answer, timestamp)
     VALUES (?, ?, ?, ?, NOW())'
);
$stmt->bind_param('ssss', $studentId, $sectionId, $type, $answer);
$stmt->execute();
$stmt->close();

// Create a gradebook attendance entry (TC-In or TC-Out) for non-overtime
if (strtolower($type) !== 'overtime') {
    $date      = date('n/j');             // e.g. 9/15
    $direction = (stripos($type, 'out') !== false) ? 'Out' : 'In';
    $tcExamId  = "TC-{$direction} {$date} [1 pts]";
    $tcTitle   = "TC-{$direction} {$date}";
    $course    = $sectionId ?: 'All';

    // Ensure attendance exam column exists
    $stmt = $db->prepare(
        'INSERT IGNORE INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, 1, ?)'
    );
    $stmt->bind_param('sss', $tcExamId, $tcTitle, $course);
    $stmt->execute();
    $stmt->close();

    // Record attendance grade (1 = present)
    $stmt = $db->prepare(
        'INSERT INTO grades (student_id, exam_id, score, total_points, timestamp)
         VALUES (?, ?, 1, 1, NOW())
         ON DUPLICATE KEY UPDATE score = 1, timestamp = NOW()'
    );
    $stmt->bind_param('ss', $studentId, $tcExamId);
    $stmt->execute();
    $stmt->close();
}

$db->close();
echo json_encode(['result' => 'success']);
