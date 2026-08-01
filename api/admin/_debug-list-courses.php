<?php
// TEMPORARY read-only diagnostic — lists every row in `courses` so we can
// confirm which course_id values actually satisfy the exams.course_id FK
// constraint before rewriting the Due Date Manager to use real course codes.
// Delete this file once the mapping decision is confirmed.
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

$db = getDB();
$result = $db->query('SELECT * FROM courses ORDER BY course_id');
$rows = [];
while ($row = $result->fetch_assoc()) $rows[] = $row;
$db->close();
echo json_encode($rows, JSON_PRETTY_PRINT);
