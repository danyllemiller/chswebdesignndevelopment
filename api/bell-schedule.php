<?php
require_once __DIR__ . '/db_config.php';
corsHeaders();
handleOptions();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET: return schedule for one type (or all) ────────────────────────────────
if ($method === 'GET') {
    $type = trim($_GET['type'] ?? '');
    if ($type) {
        $stmt = $db->prepare(
            'SELECT id, schedule_type, period_label, sort_order,
                    TIME_FORMAT(start_time,"%H:%i") AS start_time,
                    TIME_FORMAT(end_time,"%H:%i")   AS end_time,
                    section_id, course_name
             FROM bell_schedule WHERE schedule_type = ?
             ORDER BY sort_order ASC, start_time ASC'
        );
        $stmt->bind_param('s', $type);
        $stmt->execute();
        $result = $stmt->get_result();
        $stmt->close();
    } else {
        $result = $db->query(
            'SELECT id, schedule_type, period_label, sort_order,
                    TIME_FORMAT(start_time,"%H:%i") AS start_time,
                    TIME_FORMAT(end_time,"%H:%i")   AS end_time,
                    section_id, course_name
             FROM bell_schedule
             ORDER BY schedule_type ASC, sort_order ASC, start_time ASC'
        );
    }
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    $db->close();
    echo json_encode(['schedule' => $rows]);
    exit;
}

// ── POST: replace entire schedule for one type ────────────────────────────────
if ($method === 'POST') {
    $data      = json_decode(file_get_contents('php://input'), true);
    $teacherId = trim($data['teacher_id']    ?? '');
    $type      = trim($data['schedule_type'] ?? '');
    $periods   = $data['periods']            ?? [];

    if (!$type) {
        http_response_code(400);
        echo json_encode(['error' => 'schedule_type required']);
        $db->close();
        exit;
    }

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

    $del = $db->prepare('DELETE FROM bell_schedule WHERE schedule_type = ?');
    $del->bind_param('s', $type);
    $del->execute();
    $del->close();

    if (!empty($periods)) {
        $ins = $db->prepare(
            'INSERT INTO bell_schedule
               (schedule_type, period_label, sort_order, start_time, end_time, section_id, course_name)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($periods as $i => $p) {
            $label   = trim($p['period_label'] ?? '');
            $start   = $p['start_time'] ?? '08:00';
            $end     = $p['end_time']   ?? '09:00';
            $section = trim($p['section_id']  ?? '') ?: null;
            $course  = trim($p['course_name'] ?? '') ?: null;
            $order   = (int)$i;
            if (!$label || $start >= $end) continue;
            $ins->bind_param('ssissss', $type, $label, $order, $start, $end, $section, $course);
            $ins->execute();
        }
        $ins->close();
    }

    $db->close();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
