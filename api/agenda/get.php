<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

$db = getDB();

$db->query("CREATE TABLE IF NOT EXISTS `agenda_content` (
  `course`     VARCHAR(20)  NOT NULL,
  `block_num`  INT          NOT NULL,
  `content`    LONGTEXT     NOT NULL,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`course`, `block_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$db->query("CREATE TABLE IF NOT EXISTS `agenda_schedule` (
  `course`     VARCHAR(20) NOT NULL,
  `track`      VARCHAR(10) NOT NULL DEFAULT 'main',
  `block_num`  INT         NOT NULL,
  `event_date` DATE        NOT NULL,
  PRIMARY KEY (`course`, `track`, `block_num`),
  KEY `idx_lookup` (`course`, `track`, `event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$course = trim($_GET['course'] ?? '');
if (!$course) {
    http_response_code(400);
    echo json_encode(['error' => 'course is required']);
    exit;
}

$content = [];
$stmt = $db->prepare("SELECT block_num, content FROM agenda_content WHERE course = ? ORDER BY block_num");
$stmt->bind_param('s', $course);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $content[$row['block_num']] = json_decode($row['content'], true);
}
$stmt->close();

$schedule = [];
$stmt = $db->prepare("SELECT track, block_num, event_date FROM agenda_schedule WHERE course = ? ORDER BY track, block_num");
$stmt->bind_param('s', $course);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $schedule[$row['track']][$row['block_num']] = $row['event_date'];
}
$stmt->close();

$db->close();
echo json_encode(['course' => $course, 'content' => $content, 'schedule' => $schedule]);
