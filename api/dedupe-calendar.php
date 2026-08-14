<?php
require_once __DIR__ . '/db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$db = getDB();

// Only removes rows that are exact duplicates across every meaningful column
// (same date, title, type, description, source, course, timing). Two events
// that merely share a date — e.g. two different assignments due the same
// day — are never touched, since they differ in title/description.
$sql = "
    DELETE t1 FROM calendar_events t1
    INNER JOIN calendar_events t2
      ON t1.event_date = t2.event_date
      AND t1.title = t2.title
      AND t1.type = t2.type
      AND COALESCE(t1.description,'') = COALESCE(t2.description,'')
      AND t1.source = t2.source
      AND COALESCE(t1.course_bucket,'') = COALESCE(t2.course_bucket,'')
      AND t1.all_day = t2.all_day
      AND COALESCE(t1.start_time,'') = COALESCE(t2.start_time,'')
      AND COALESCE(t1.end_time,'') = COALESCE(t2.end_time,'')
      AND t1.id > t2.id
";

if (!$db->query($sql)) {
    http_response_code(500);
    echo json_encode(['error' => 'Dedupe failed: ' . $db->error]);
    exit;
}

$deleted = $db->affected_rows;
$db->close();

echo json_encode(['success' => true, 'deleted' => $deleted]);
