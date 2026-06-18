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

$db = getDB();

// Day of week for requested date (0 = Sun, 6 = Sat)
$dow = (int) date('w', strtotime($date));

$ohStmt = $db->prepare(
    'SELECT start_time, end_time, slot_duration FROM office_hours WHERE day_of_week = ? AND is_active = 1 LIMIT 1'
);
$ohStmt->bind_param('i', $dow);
$ohStmt->execute();
$oh = $ohStmt->get_result()->fetch_assoc();
$ohStmt->close();

if (!$oh) {
    $db->close();
    echo json_encode(['slots' => [], 'message' => 'No office hours set for this day.']);
    exit;
}

// Generate slot list
$startTs  = strtotime($date . ' ' . $oh['start_time']);
$endTs    = strtotime($date . ' ' . $oh['end_time']);
$stepSecs = (int) $oh['slot_duration'] * 60;

$slotTimes = [];
for ($t = $startTs; $t < $endTs; $t += $stepSecs) {
    $slotTimes[] = date('H:i', $t);
}

// Booked slots for this date (anything not denied counts as taken)
$bkStmt = $db->prepare(
    "SELECT TIME_FORMAT(time,'%H:%i') AS t FROM appointments WHERE date = ? AND status != 'denied'"
);
$bkStmt->bind_param('s', $date);
$bkStmt->execute();
$bkResult = $bkStmt->get_result();
$booked   = [];
while ($row = $bkResult->fetch_assoc()) $booked[] = $row['t'];
$bkStmt->close();
$db->close();

$slots = array_map(fn($s) => ['time' => $s, 'available' => !in_array($s, $booked)], $slotTimes);
echo json_encode(['slots' => $slots]);
