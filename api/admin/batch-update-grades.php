<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = jsonInput();
$batch = $body['batch'] ?? [];

if (empty($batch) || !is_array($batch)) {
    http_response_code(400);
    echo json_encode(['error' => 'batch array is required']);
    exit;
}

$db = getDB();
$db->begin_transaction();
$saved = 0;
$errors = [];

try {
    foreach ($batch as $entry) {
        $studentId = trim($entry['studentId'] ?? '');
        $updates   = $entry['updates'] ?? [];

        if (!$studentId || !is_array($updates)) continue;

        foreach ($updates as $examId => $gradeData) {
            $examId  = trim($examId);
            $score   = (string)($gradeData['score'] ?? '');
            $maxPts  = (int)($gradeData['max'] ?? 100);

            // Ensure exam row exists
            $stmt = $db->prepare(
                'INSERT IGNORE INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?)'
            );
            $course = 'All';
            $stmt->bind_param('ssis', $examId, $examId, $maxPts, $course);
            $stmt->execute();
            $stmt->close();

            // UPSERT grade
            $stmt = $db->prepare(
                'INSERT INTO grades (student_id, exam_id, score, total_points, timestamp)
                 VALUES (?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()'
            );
            $stmt->bind_param('sssi', $studentId, $examId, $score, $maxPts);
            $stmt->execute();
            $stmt->close();
            $saved++;
        }
    }

    $db->commit();
    echo json_encode(['result' => 'success', 'saved' => $saved]);
} catch (Exception $e) {
    $db->rollback();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$db->close();
