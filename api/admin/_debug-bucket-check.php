<?php
// TEMPORARY read-only diagnostic -- checking why course_bucket filtering
// isn't discriminating between WD1/WD2/CS on the live calendar_events table.
// Delete once the root cause is confirmed.
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

$db = getDB();

$out = [];

// 1. Distinct course_bucket values actually stored, with counts
$r = $db->query("SELECT course_bucket, COUNT(*) AS n FROM calendar_events WHERE source='due_date' GROUP BY course_bucket");
$out['course_bucket_counts'] = [];
while ($row = $r->fetch_assoc()) $out['course_bucket_counts'][] = $row;

// 2. Distinct course_id values currently in exams (what the bucket mapping reads from)
$r = $db->query("SELECT course_id, COUNT(*) AS n FROM exams GROUP BY course_id");
$out['exams_course_id_counts'] = [];
while ($row = $r->fetch_assoc()) $out['exams_course_id_counts'][] = $row;

// 3. Confirm the course_bucket column actually exists with the right type
$r = $db->query("SHOW COLUMNS FROM calendar_events LIKE 'course_bucket'");
$out['course_bucket_column'] = $r->fetch_assoc();

$db->close();
echo json_encode($out, JSON_PRETTY_PRINT);
