<?php
require_once __DIR__ . '/db_config.php';
corsHeaders();
handleOptions();

$db = getDB();

// Auto-create table on first use
$db->query("CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `event_date`  DATE         NOT NULL,
  `title`       VARCHAR(255) NOT NULL,
  `type`        VARCHAR(20)  NOT NULL DEFAULT 'none',
  `description` TEXT,
  `all_day`     TINYINT(1)   NOT NULL DEFAULT 1,
  `start_time`  TIME                  DEFAULT NULL,
  `end_time`    TIME                  DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_date` (`event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: return all events ────────────────────────────────────────────────────
if ($method === 'GET') {
    $result = $db->query(
        'SELECT id, DATE_FORMAT(event_date,"%Y-%m-%d") AS event_date,
                title, type, description, all_day,
                TIME_FORMAT(start_time,"%H:%i") AS start_time,
                TIME_FORMAT(end_time,"%H:%i")   AS end_time
         FROM calendar_events ORDER BY event_date ASC'
    );
    $events = [];
    while ($row = $result->fetch_assoc()) $events[] = $row;
    $db->close();
    echo json_encode(['events' => $events]);
    exit;
}

// ── DELETE: remove an event by id ─────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }
    $del = $db->prepare('DELETE FROM calendar_events WHERE id = ?');
    $del->bind_param('i', $id);
    $del->execute();
    $del->close();
    $db->close();
    echo json_encode(['success' => true]);
    exit;
}

// ── POST: add a new event ─────────────────────────────────────────────────────
if ($method === 'POST') {
    $data  = json_decode(file_get_contents('php://input'), true);
    $date  = trim($data['event_date']  ?? '');
    $title = trim($data['title']       ?? '');
    $type  = trim($data['type']        ?? 'none');
    $desc  = trim($data['description'] ?? '');
    $allDay = !empty($data['all_day']) ? 1 : 0;
    $start = $allDay ? null : (trim($data['start_time'] ?? '') ?: null);
    $end   = $allDay ? null : (trim($data['end_time']   ?? '') ?: null);

    if (!$date || !$title) {
        http_response_code(400);
        echo json_encode(['error' => 'event_date and title are required']);
        $db->close();
        exit;
    }

    $ins = $db->prepare(
        'INSERT INTO calendar_events (event_date, title, type, description, all_day, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->bind_param('ssssiss', $date, $title, $type, $desc, $allDay, $start, $end);
    $ins->execute();
    $id = $db->insert_id;
    $ins->close();
    $db->close();
    echo json_encode(['success' => true, 'id' => $id]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
