<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body     = jsonInput();
$course   = trim($body['course'] ?? '');
$track    = trim($body['track'] ?? 'main');
$blockNum = isset($body['block_num']) ? (int)$body['block_num'] : 0;
$date     = trim($body['date'] ?? '');

if (!$course || !$blockNum || !$date) {
    http_response_code(400);
    echo json_encode(['error' => 'course, block_num, and date are required']);
    exit;
}

$db = getDB();

$db->query("CREATE TABLE IF NOT EXISTS `agenda_schedule` (
  `course`     VARCHAR(20) NOT NULL,
  `track`      VARCHAR(10) NOT NULL DEFAULT 'main',
  `block_num`  INT         NOT NULL,
  `event_date` DATE        NOT NULL,
  PRIMARY KEY (`course`, `track`, `block_num`),
  KEY `idx_lookup` (`course`, `track`, `event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$stmt = $db->prepare(
    "INSERT INTO agenda_schedule (course, track, block_num, event_date)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE event_date = VALUES(event_date)"
);
$stmt->bind_param('ssis', $course, $track, $blockNum, $date);
$stmt->execute();
$stmt->close();
$db->close();

echo json_encode(['success' => true]);
