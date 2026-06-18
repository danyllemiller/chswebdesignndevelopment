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
    echo json_encode(['error' => 'student_id required']);
    exit;
}

$db = getDB();
$stmt = $db->prepare(
    'SELECT exam_id, score, total_points, timestamp
     FROM grades WHERE student_id = ? ORDER BY timestamp DESC'
);
$stmt->bind_param('s', $studentId);
$stmt->execute();
$result = $stmt->get_result();
$stmt->close();

$responses = [];
while ($row = $result->fetch_assoc()) {
    $responses[] = $row;
}
$db->close();

echo json_encode(['responses' => $responses]);
