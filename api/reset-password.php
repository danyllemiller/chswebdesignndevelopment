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
$firstName = trim($body['first_name'] ?? '');
$lastName  = trim($body['last_name'] ?? '');
$studentId = trim($body['student_id'] ?? '');
$username  = strtolower(trim($body['username'] ?? ''));

if (!$firstName || !$lastName || !$studentId || !$username) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required']);
    exit;
}

$db = getDB();
$stmt = $db->prepare(
    'SELECT id FROM students WHERE student_id = ? AND username = ? AND first_name = ? AND last_name = ?'
);
$stmt->bind_param('ssss', $studentId, $username, $firstName, $lastName);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    $db->close();
    http_response_code(404);
    echo json_encode(['error' => 'No matching account found. Check your information.']);
    exit;
}

// Reset password to student_id and require change on next login
$hash = password_hash($studentId, PASSWORD_DEFAULT);
$stmt = $db->prepare('UPDATE students SET password_hash = ?, must_change_password = 1 WHERE student_id = ?');
$stmt->bind_param('ss', $hash, $studentId);
$stmt->execute();
$stmt->close();
$db->close();

echo json_encode([
    'result'  => 'success',
    'message' => 'Password reset to your Student ID. Log in with it and you will be prompted to set a new one.',
]);
