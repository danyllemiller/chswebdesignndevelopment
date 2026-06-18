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
$password  = $body['password'] ?? '';

if (!$firstName || !$lastName || !$studentId || !$username || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required']);
    exit;
}
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters']);
    exit;
}

$db = getDB();

// Reject duplicate username or student_id
$stmt = $db->prepare('SELECT id FROM students WHERE username = ? OR student_id = ? LIMIT 1');
$stmt->bind_param('ss', $username, $studentId);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    $db->close();
    http_response_code(409);
    echo json_encode(['error' => 'Username or Student ID already exists']);
    exit;
}
$stmt->close();

$hash    = password_hash($password, PASSWORD_DEFAULT);
$section = 'Unassigned';
$role    = 'student';
$stmt = $db->prepare(
    'INSERT INTO students (student_id, username, password_hash, first_name, last_name, section_id, role, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
);
$stmt->bind_param('sssssss', $studentId, $username, $hash, $firstName, $lastName, $section, $role);

if ($stmt->execute()) {
    echo json_encode(['result' => 'success', 'message' => 'Account created successfully']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed: ' . $stmt->error]);
}
$stmt->close();
$db->close();
