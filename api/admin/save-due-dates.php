<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body        = jsonInput();
$assignments = $body['assignments'] ?? [];
$doCalSync   = isset($body['sync_calendar']) ? (bool)$body['sync_calendar'] : true;

if (!is_array($assignments)) {
    http_response_code(400);
    echo json_encode(['error' => 'assignments must be an array']);
    exit;
}
if (count($assignments) === 0) {
    echo json_encode(['success' => true, 'exams_saved' => 0, 'calendar_synced' => 0]);
    exit;
}

$db = getDB();

// ── 1. Upsert each assignment into exams table ────────────────────────────────
$saved = 0;
$stmt  = $db->prepare(
    'INSERT INTO exams (exam_id, title, total_points, due_date, course_id, period_due_dates)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title            = VALUES(title),
       total_points     = VALUES(total_points),
       due_date         = VALUES(due_date),
       course_id        = VALUES(course_id),
       period_due_dates = VALUES(period_due_dates)'
);

foreach ($assignments as $a) {
    $examId     = trim($a['exam_id']      ?? '');
    if (!$examId) continue;
    $title      = trim($a['title']        ?? $examId);
    $pts        = (int)($a['total_points'] ?? 100);
    $dueDate    = !empty($a['due_date'])  ? $a['due_date']  : null;
    $courseId   = trim($a['course_id']    ?? 'cs');
    $pdd        = !empty($a['period_due_dates']) ? json_encode($a['period_due_dates']) : null;

    $stmt->bind_param('ssisss', $examId, $title, $pts, $dueDate, $courseId, $pdd);
    $stmt->execute();
    $saved++;
}
$stmt->close();

// ── 2. Sync to calendar_events (source = 'due_date') ─────────────────────────
$calSynced = 0;
if ($doCalSync) {
    // Ensure source column exists
    $db->query("ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual'");

    // Wipe old due-date events and rebuild from scratch
    $db->query("DELETE FROM calendar_events WHERE source = 'due_date'");

    $ins = $db->prepare(
        "INSERT INTO calendar_events (event_date, title, type, description, all_day, source)
         VALUES (?, ?, 'none', ?, 1, 'due_date')"
    );

    foreach ($assignments as $a) {
        $course = strtoupper(trim($a['course_id'] ?? 'CS'));
        $title  = trim($a['title'] ?? ($a['exam_id'] ?? ''));
        $desc   = $course . ' – ' . $title;

        // Default due date
        if (!empty($a['due_date'])) {
            $calTitle = $title . ' Due';
            $ins->bind_param('sss', $a['due_date'], $calTitle, $desc);
            $ins->execute();
            $calSynced++;
        }

        // Period-specific due dates
        if (!empty($a['period_due_dates']) && is_array($a['period_due_dates'])) {
            foreach ($a['period_due_dates'] as $period => $pDate) {
                if (empty($pDate)) continue;
                $pTitle = $title . ' Due – Period ' . $period;
                $pDesc  = $course . ' – ' . $title . ' [Period ' . $period . ']';
                $ins->bind_param('sss', $pDate, $pTitle, $pDesc);
                $ins->execute();
                $calSynced++;
            }
        }
    }
    $ins->close();
}

$db->close();
echo json_encode([
    'success'          => true,
    'exams_saved'      => $saved,
    'calendar_synced'  => $calSynced
]);
