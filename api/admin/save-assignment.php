<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = jsonInput();
$examId      = trim($body['exam_id'] ?? '');
$title       = trim($body['title'] ?? $examId);
$totalPoints = (int)($body['total_points'] ?? 100);
$dueDate     = $body['due_date'] ?: null;
$instructions = $body['instructions'] ?? '';
$courseId    = $body['course_id'] ?? 'All';
$periodDueDates = isset($body['period_due_dates']) ? json_encode($body['period_due_dates']) : null;

if (!$examId) {
    http_response_code(400);
    echo json_encode(['error' => 'exam_id is required']);
    exit;
}

$db = getDB();
$stmt = $db->prepare(
    'INSERT INTO exams (exam_id, title, total_points, due_date, instructions, course_id, period_due_dates)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       total_points = VALUES(total_points),
       due_date = VALUES(due_date),
       instructions = VALUES(instructions),
       course_id = VALUES(course_id),
       period_due_dates = VALUES(period_due_dates)'
);
$stmt->bind_param('sssisss', $examId, $title, $totalPoints, $dueDate, $instructions, $courseId, $periodDueDates);

if ($stmt->execute()) {
    echo json_encode(['result' => 'success']);
} else {
    http_response_code(500);
    echo json_encode(['error' => $stmt->error]);
}
$stmt->close();
$db->close();
