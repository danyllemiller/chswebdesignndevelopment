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

$lines = array_values(array_filter(explode("\n", $content), fn($l) => trim($l) !== ''));
$first = trim($lines[0] ?? '');

if (!preg_match('/^\d{4}-\d{2}-\d{2}/', $first) && !preg_match('/^date/i', $first)) {
    http_response_code(400);
    echo json_encode(['error' => 'File does not look like a calendar CSV']);
    exit;
}

$delim = str_contains($first, "\t") ? "\t" : ",";

$typeLabels = [
    'A' => 'A Day', 'B' => 'B Day',
    'A_MIN' => 'A Min Day', 'B_MIN' => 'B Min Day',
    'OFF' => 'No School', 'C' => 'All Periods',
];
$validTypes = array_merge(array_keys($typeLabels), ['none']);

$db = getDB();

// Ensure source column exists (no-op if already added)
$db->query("ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual'");

// Replace all previously-imported CSV rows
$db->query("DELETE FROM calendar_events WHERE source = 'csv'");

$ins = $db->prepare(
    "INSERT INTO calendar_events (event_date, title, type, description, all_day, source)
     VALUES (?, ?, ?, ?, 1, 'csv')"
);

$count = 0;
foreach ($lines as $i => $line) {
    $trimmed = trim($line);
    if (!$trimmed) continue;

    $cols = explode($delim, $trimmed);

    // Skip header row
    if ($i === 0 && preg_match('/^date/i', trim($cols[0] ?? ''))) continue;

    $date = trim($cols[0] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) continue;

    $type = trim($cols[1] ?? '') ?: 'none';
    if (!in_array($type, $validTypes)) $type = 'none';

    $desc = $delim === "\t"
        ? trim($cols[2] ?? '')
        : trim(implode(',', array_slice($cols, 2)));

    // Skip rows with no meaningful content
    if ($type === 'none' && $desc === '') continue;

    // Title: use description if present, otherwise the type label
    $title = $desc ?: ($typeLabels[$type] ?? 'Event');

    $ins->bind_param('ssss', $date, $title, $type, $desc);
    $ins->execute();
    $count++;
}

$ins->close();
$db->close();

echo json_encode(['success' => true, 'count' => $count]);
