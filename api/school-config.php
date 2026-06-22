<?php
require_once __DIR__ . '/db_config.php';
corsHeaders();
handleOptions();

$db = getDB();
$db->query("CREATE TABLE IF NOT EXISTS school_config (
    config_key   VARCHAR(50) NOT NULL PRIMARY KEY,
    config_value VARCHAR(20) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $result = $db->query("SELECT config_key, config_value FROM school_config");
    $config = [];
    while ($row = $result->fetch_assoc()) $config[$row['config_key']] = $row['config_value'];
    $db->close();
    echo json_encode([
        'regular_start' => $config['regular_start'] ?? '',
        'regular_end'   => $config['regular_end']   ?? '',
        'summer_start'  => $config['summer_start']  ?? '',
        'summer_end'    => $config['summer_end']    ?? '',
    ]);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $db->prepare(
        "INSERT INTO school_config (config_key, config_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)"
    );
    foreach (['regular_start','regular_end','summer_start','summer_end'] as $key) {
        if (!array_key_exists($key, $data)) continue;
        $val = trim($data[$key] ?? '');
        $stmt->bind_param('ss', $key, $val);
        $stmt->execute();
    }
    $stmt->close();
    $db->close();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
