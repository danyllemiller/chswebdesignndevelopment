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

$stmt = $db->prepare(
    'SELECT chapter_id, level, mode, updated_at FROM self_assessments WHERE student_id = ? ORDER BY chapter_id ASC'
);
$stmt->bind_param('s', $studentId);
$stmt->execute();
$result = $stmt->get_result();

$rows = [];
while ($row = $result->fetch_assoc()) {
    $rows[] = $row;
}
$stmt->close();
$db->close();

echo json_encode(['responses' => $rows]);
