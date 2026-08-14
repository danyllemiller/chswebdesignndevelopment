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

// Parse every valid row first, so we know exactly which dates this import
// touches before deleting anything.
$rows = [];
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

    $rows[] = ['date' => $date, 'title' => $title, 'type' => $type, 'desc' => $desc];
}

// Only clear out previously-imported CSV rows on the dates this file actually
// covers — everything imported in earlier uploads, on other dates, is left alone.
if ($rows) {
    $dates = array_values(array_unique(array_column($rows, 'date')));
    $placeholders = implode(',', array_fill(0, count($dates), '?'));
    $del = $db->prepare("DELETE FROM calendar_events WHERE source = 'csv' AND event_date IN ($placeholders)");
    $del->bind_param(str_repeat('s', count($dates)), ...$dates);
    $del->execute();
    $del->close();
}

$ins = $db->prepare(
    "INSERT INTO calendar_events (event_date, title, type, description, all_day, source)
     VALUES (?, ?, ?, ?, 1, 'csv')"
);

$count = 0;
foreach ($rows as $row) {
    $ins->bind_param('ssss', $row['date'], $row['title'], $row['type'], $row['desc']);
    $ins->execute();
    $count++;
}

$ins->close();
$db->close();

echo json_encode(['success' => true, 'count' => $count]);
