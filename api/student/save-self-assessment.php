<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body      = jsonInput();
$studentId = trim($body['student_id'] ?? '');
$chapterId = (int)($body['chapter_id'] ?? 0);
$level     = (float)($body['level'] ?? 0);
$mode      = trim($body['mode'] ?? 'pre');

if (!$studentId || !$chapterId) {
    http_response_code(400);
    echo json_encode(['error' => 'student_id and chapter_id are required']);
    exit;
}

$db = getDB();

$stmt = $db->prepare(
    'INSERT INTO self_assessments (student_id, chapter_id, level, mode, updated_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE level = VALUES(level), mode = VALUES(mode), updated_at = NOW()'
);
$stmt->bind_param('sids', $studentId, $chapterId, $level, $mode);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => $stmt->error]);
}
$stmt->close();
$db->close();
