<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$date = trim($_GET['date'] ?? '');
if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['error' => 'date param required (YYYY-MM-DD)']);
    exit;
}

$db  = getDB();
$dow = (int) date('w', strtotime($date));

// Get ALL office hour windows for this day (supports multiple windows per day)
$ohStmt = $db->prepare(
    'SELECT start_time, end_time, slot_duration FROM office_hours WHERE day_of_week = ? ORDER BY start_time ASC'
);
$ohStmt->bind_param('i', $dow);
$ohStmt->execute();
$windows = $ohStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$ohStmt->close();

if (empty($windows)) {
    $db->close();
    echo json_encode(['slots' => [], 'message' => 'No office hours set for this day.']);
    exit;
}

// Generate slots for every window, collect in a set to avoid duplicates
$slotSet = [];
foreach ($windows as $w) {
    $startTs  = strtotime($date . ' ' . $w['start_time']);
    $endTs    = strtotime($date . ' ' . $w['end_time']);
    $stepSecs = (int) $w['slot_duration'] * 60;
    for ($t = $startTs; $t < $endTs; $t += $stepSecs) {
        $slotSet[date('H:i', $t)] = (int) $w['slot_duration'];
    }
}
ksort($slotSet); // sort by time

// Booked slots for this date (anything not denied counts as taken)
$bkStmt = $db->prepare(
    "SELECT TIME_FORMAT(time,'%H:%i') AS t FROM appointments WHERE date = ? AND status != 'denied'"
);
$bkStmt->bind_param('s', $date);
$bkStmt->execute();
$booked = [];
while ($row = $bkStmt->get_result()->fetch_assoc()) $booked[] = $row['t'];
$bkStmt->close();
$db->close();

$slots = [];
foreach ($slotSet as $time => $dur) {
    $slots[] = ['time' => $time, 'available' => !in_array($time, $booked)];
}

echo json_encode(['slots' => $slots]);
