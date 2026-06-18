<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$db        = getDB();
$studentId = trim($_GET['student_id'] ?? '');
$role      = trim($_GET['role']       ?? 'student');

if (in_array($role, ['teacher', 'admin'])) {
    $result = $db->query(
        "SELECT a.id, a.student_id,
                COALESCE(CONCAT(s.first_name,' ',s.last_name), a.student_id) AS student_name,
                s.section_id,
                DATE_FORMAT(a.date,'%Y-%m-%d') AS date,
                TIME_FORMAT(a.time,'%H:%i')    AS time,
                a.reason, a.status, a.teacher_note,
                DATE_FORMAT(a.created_at,'%Y-%m-%d %H:%i') AS created_at
         FROM appointments a
         LEFT JOIN students s ON s.student_id = a.student_id
         ORDER BY a.date ASC, a.time ASC"
    );
} else {
    if (!$studentId) {
        http_response_code(400);
        echo json_encode(['error' => 'student_id required']);
        $db->close();
        exit;
    }
    $stmt = $db->prepare(
        "SELECT id, student_id,
                DATE_FORMAT(date,'%Y-%m-%d') AS date,
                TIME_FORMAT(time,'%H:%i')    AS time,
                reason, status, teacher_note,
                DATE_FORMAT(created_at,'%Y-%m-%d %H:%i') AS created_at
         FROM appointments WHERE student_id = ? ORDER BY date ASC, time ASC"
    );
    $stmt->bind_param('s', $studentId);
    $stmt->execute();
    $result = $stmt->get_result();
}

$rows = [];
while ($row = $result->fetch_assoc()) $rows[] = $row;
$db->close();

echo json_encode(['appointments' => $rows]);
