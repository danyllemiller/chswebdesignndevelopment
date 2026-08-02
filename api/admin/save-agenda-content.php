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
$blockNum = isset($body['block_num']) ? (int)$body['block_num'] : 0;
$content  = $body['content'] ?? null;

if (!$course || !$blockNum || !is_array($content)) {
    http_response_code(400);
    echo json_encode(['error' => 'course, block_num, and content are required']);
    exit;
}

$db = getDB();

$db->query("CREATE TABLE IF NOT EXISTS `agenda_content` (
  `course`     VARCHAR(20)  NOT NULL,
  `block_num`  INT          NOT NULL,
  `content`    LONGTEXT     NOT NULL,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`course`, `block_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$json = json_encode($content);
$stmt = $db->prepare(
    "INSERT INTO agenda_content (course, block_num, content)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)"
);
$stmt->bind_param('sis', $course, $blockNum, $json);
$stmt->execute();
$stmt->close();
$db->close();

echo json_encode(['success' => true]);
