<?php
require_once __DIR__ . '/db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$content = file_get_contents('php://input');
if (!$content) {
    http_response_code(400);
    echo json_encode(['error' => 'No content received']);
    exit;
}

// Validate it looks like a calendar CSV (first non-empty line should have date-like data)
$lines = array_filter(array_map('trim', explode("\n", $content)));
$first = reset($lines);
if (!$first || (!preg_match('/^\d{4}-\d{2}-\d{2}/', $first) && !preg_match('/^date/i', $first))) {
    http_response_code(400);
    echo json_encode(['error' => 'File does not look like a calendar CSV']);
    exit;
}

$target = __DIR__ . '/../special-dates.csv';
$result = file_put_contents($target, $content);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not write file — check server permissions']);
    exit;
}

echo json_encode(['success' => true, 'bytes' => $result]);
