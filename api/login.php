<?php
/**
 * POST /api/login
 * Body: { username, password }
 * Returns: { user: {...}, shift: { isRegular: bool } }
 *
 * NOTE: passwords are stored as bcrypt hashes via password_hash().
 * If the existing students table uses a different hash (MD5, SHA1),
 * update the password_verify() call below accordingly.
 */
require_once __DIR__ . '/db_config.php';
session_start();
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body     = jsonInput();
$username = strtolower(trim($body['username'] ?? ''));
$password = $body['password'] ?? '';

if (!$username || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password are required']);
    exit;
}

$db = getDB();
$stmt = $db->prepare(
    'SELECT student_id, username, password_hash, first_name, last_name, section_id, role, must_change_password
     FROM students WHERE username = ?'
);
$stmt->bind_param('s', $username);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();
$db->close();

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid username or password']);
    exit;
}

// Support both bcrypt (password_hash) and legacy plain/MD5
$valid = password_verify($password, $user['password_hash'])
      || $password === $user['password_hash']          // plain-text legacy
      || md5($password) === $user['password_hash'];    // MD5 legacy

if (!$valid) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid username or password']);
    exit;
}

// Store session
$_SESSION['student_id'] = $user['student_id'];
$_SESSION['role']       = $user['role'];
$_SESSION['username']   = $user['username'];

// Regular vs overtime: Mon-Fri 7:00–15:59 Pacific = regular class time
date_default_timezone_set('America/Los_Angeles');
$hour = (int)date('G');
$dow  = (int)date('N'); // 1=Mon … 7=Sun
$isRegular = ($dow >= 1 && $dow <= 5 && $hour >= 7 && $hour < 16);

echo json_encode([
    'user' => [
        'student_id'           => $user['student_id'],
        'username'             => $user['username'],
        'first_name'           => $user['first_name'],
        'last_name'            => $user['last_name'],
        'section_id'           => $user['section_id'],
        'role'                 => $user['role'],
        'must_change_password' => (int)$user['must_change_password'],
    ],
    'shift' => [
        'isRegular' => $isRegular,
    ],
]);
