<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$username = trim($_GET['username'] ?? '');

if (!$username) {
    http_response_code(400);
    echo json_encode(['error' => 'username parameter is required']);
    exit;
}

$db = getDB();
$stmt = $db->prepare(
    'SELECT student_id, username, first_name, last_name, section_id, role
     FROM students WHERE username = ?'
);
$stmt->bind_param('s', $username);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();
$db->close();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

echo json_encode($user);
