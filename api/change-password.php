<?php
/**
 * POST /api/change-password
 * Body: { current_password, new_password }
 *
 * Called during forced-change flow. current_password = student's temp password (their Student ID).
 * Uses the PHP session (set by login.php) if available; otherwise falls back to matching
 * current_password against the student_id column directly.
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

$body       = jsonInput();
$currentPw  = trim($body['current_password'] ?? '');
$newPw      = $body['new_password'] ?? '';

if (!$currentPw || !$newPw) {
    http_response_code(400);
    echo json_encode(['error' => 'current_password and new_password are required']);
    exit;
}
if (strlen($newPw) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'New password must be at least 6 characters']);
    exit;
}

$db = getDB();

// Prefer session-stored identity; fall back to treating current_password as the student_id
$sessionId = $_SESSION['student_id'] ?? null;
$lookupId  = $sessionId ?: $currentPw;

$stmt = $db->prepare('SELECT student_id, password_hash FROM students WHERE student_id = ?');
$stmt->bind_param('s', $lookupId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user) {
    $db->close();
    http_response_code(401);
    echo json_encode(['error' => 'Account not found']);
    exit;
}

// Verify: bcrypt match, plain-text match (legacy), or temp-password equals student_id
$valid = password_verify($currentPw, $user['password_hash'])
      || $currentPw === $user['password_hash']
      || $currentPw === $user['student_id'];

if (!$valid) {
    $db->close();
    http_response_code(401);
    echo json_encode(['error' => 'Current password is incorrect']);
    exit;
}

$hash = password_hash($newPw, PASSWORD_DEFAULT);
$stmt = $db->prepare('UPDATE students SET password_hash = ?, must_change_password = 0 WHERE student_id = ?');
$stmt->bind_param('ss', $hash, $user['student_id']);
$stmt->execute();
$stmt->close();
$db->close();

echo json_encode(['result' => 'success', 'message' => 'Password changed successfully']);
