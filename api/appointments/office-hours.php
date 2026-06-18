<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET: return all office hours ─────────────────────────────────────────────
if ($method === 'GET') {
    $result = $db->query('SELECT day_of_week, start_time, end_time, slot_duration, is_active FROM office_hours ORDER BY day_of_week');
    $hours  = [];
    while ($row = $result->fetch_assoc()) $hours[] = $row;
    $db->close();
    echo json_encode(['hours' => $hours]);
    exit;
}

// ── POST: save office hours (teacher only) ────────────────────────────────────
if ($method === 'POST') {
    $data      = json_decode(file_get_contents('php://input'), true);
    $teacherId = trim($data['teacher_id'] ?? '');
    $hours     = $data['hours'] ?? [];

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

    $db->query('DELETE FROM office_hours');

    $stmt = $db->prepare(
        'INSERT INTO office_hours (day_of_week, start_time, end_time, slot_duration, is_active)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           start_time    = VALUES(start_time),
           end_time      = VALUES(end_time),
           slot_duration = VALUES(slot_duration),
           is_active     = VALUES(is_active)'
    );

    foreach ($hours as $h) {
        $dow      = (int)($h['day_of_week']   ?? 0);
        $start    = $h['start_time']  ?? '08:00';
        $end      = $h['end_time']    ?? '09:00';
        $duration = (int)($h['slot_duration'] ?? 15);
        $active   = (int)($h['is_active']     ?? 1);
        $stmt->bind_param('issii', $dow, $start, $end, $duration, $active);
        $stmt->execute();
    }
    $stmt->close();
    $db->close();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
