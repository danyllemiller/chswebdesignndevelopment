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
$examId = trim($body['exam_id'] ?? '');

if (!$examId) {
    http_response_code(400);
    echo json_encode(['error' => 'exam_id is required']);
    exit;
}

$db = getDB();
$db->begin_transaction();

try {
    $stmt = $db->prepare('DELETE FROM grades WHERE exam_id = ?');
    $stmt->bind_param('s', $examId);
    $stmt->execute();
    $stmt->close();

    $stmt = $db->prepare('DELETE FROM exams WHERE exam_id = ?');
    $stmt->bind_param('s', $examId);
    $stmt->execute();
    $stmt->close();

    $db->commit();
    echo json_encode(['result' => 'success']);
} catch (Exception $e) {
    $db->rollback();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$db->close();
