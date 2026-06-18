<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$db = getDB();
$db->begin_transaction();

try {
    $db->query('DELETE FROM grades');
    $db->query('DELETE FROM exams');
    $db->commit();
    echo json_encode(['result' => 'success']);
} catch (Exception $e) {
    $db->rollback();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$db->close();
