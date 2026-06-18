<?php
require_once __DIR__ . '/db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = jsonInput();
$studentId   = trim($body['student_id'] ?? '');
$examId      = trim($body['exam_id'] ?? '');
$score       = $body['score'] ?? 0;
$totalPoints = (int)($body['total_points'] ?? 100);

if (!$studentId || !$examId) {
    http_response_code(400);
    echo json_encode(['error' => 'student_id and exam_id are required']);
    exit;
}

$scoreVal = (string)$score;
$db = getDB();

// Ensure the exam definition exists (auto-create if submitted directly from quiz)
$stmt = $db->prepare(
    'INSERT IGNORE INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?)'
);
$course = 'All';
$stmt->bind_param('ssis', $examId, $examId, $totalPoints, $course);
$stmt->execute();
$stmt->close();

// UPSERT grade — never create duplicates
$stmt = $db->prepare(
    'INSERT INTO grades (student_id, exam_id, score, total_points, timestamp)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()'
);
$stmt->bind_param('sssi', $studentId, $examId, $scoreVal, $totalPoints);

if ($stmt->execute()) {
    echo json_encode(['result' => 'success', 'score' => $scoreVal, 'total_points' => $totalPoints]);
} else {
    http_response_code(500);
    echo json_encode(['error' => $stmt->error]);
}
$stmt->close();
$db->close();
