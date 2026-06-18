<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data      = json_decode(file_get_contents('php://input'), true);
$studentId = trim($data['student_id'] ?? '');
$date      = trim($data['date']       ?? '');
$time      = trim($data['time']       ?? '');
$reason    = trim($data['reason']     ?? '');

if (!$studentId || !$date || !$time) {
    http_response_code(400);
    echo json_encode(['error' => 'student_id, date, and time are required']);
    exit;
}

$db = getDB();

// Verify student exists
$chk = $db->prepare('SELECT student_id FROM students WHERE student_id = ? LIMIT 1');
$chk->bind_param('s', $studentId);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid student']);
    $db->close();
    exit;
}
$chk->close();

// Insert — UNIQUE (date, time) prevents double-booking
$stmt = $db->prepare(
    "INSERT INTO appointments (student_id, date, time, reason, status) VALUES (?, ?, ?, ?, 'pending')"
);
$stmt->bind_param('ssss', $studentId, $date, $time, $reason);

if ($stmt->execute()) {
    $id = $db->insert_id;
    $stmt->close();
    $db->close();
    echo json_encode(['success' => true, 'appointment_id' => $id]);
} else {
    $stmt->close();
    $db->close();
    http_response_code(409);
    echo json_encode(['error' => 'That time slot is already booked. Please pick another.']);
}
