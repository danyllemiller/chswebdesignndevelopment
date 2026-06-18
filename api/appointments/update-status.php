<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data        = json_decode(file_get_contents('php://input'), true);
$id          = (int) ($data['id']           ?? 0);
$status      = trim($data['status']         ?? '');
$teacherNote = trim($data['teacher_note']   ?? '');
$teacherId   = trim($data['teacher_id']     ?? '');

if (!$id || !in_array($status, ['approved', 'denied', 'pending'])) {
    http_response_code(400);
    echo json_encode(['error' => 'id and valid status required']);
    exit;
}

$db = getDB();

if ($teacherId) {
    $chk = $db->prepare('SELECT role FROM students WHERE student_id = ? LIMIT 1');
    $chk->bind_param('s', $teacherId);
    $chk->execute();
    $row = $chk->get_result()->fetch_assoc();
    $chk->close();
    if (!$row || !in_array($row['role'], ['admin', 'teacher'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        $db->close();
        exit;
    }
}

$stmt = $db->prepare('UPDATE appointments SET status = ?, teacher_note = ? WHERE id = ?');
$stmt->bind_param('ssi', $status, $teacherNote, $id);
$stmt->execute();
$ok = $stmt->affected_rows > 0;
$stmt->close();
$db->close();

echo json_encode(['success' => $ok]);
