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
$oldExamId   = trim($body['old_exam_id'] ?? '');
$newExamId   = trim($body['exam_id'] ?? $oldExamId);
$title       = trim($body['title'] ?? $newExamId);
$totalPoints = (int)($body['total_points'] ?? 100);
$dueDate     = $body['due_date'] ?: null;
$instructions = $body['instructions'] ?? '';
$courseId    = $body['course_id'] ?? 'All';
$periodDueDates = isset($body['period_due_dates']) ? json_encode($body['period_due_dates']) : null;

if (!$oldExamId || !$newExamId) {
    http_response_code(400);
    echo json_encode(['error' => 'old_exam_id and exam_id are required']);
    exit;
}

$db = getDB();

if ($oldExamId !== $newExamId) {
    // exam_id is the PK — rename requires insert + remap grades + delete old
    $db->begin_transaction();
    try {
        // Insert new exam row
        $stmt = $db->prepare(
            'INSERT INTO exams (exam_id, title, total_points, due_date, instructions, course_id, period_due_dates)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('sssisss', $newExamId, $title, $totalPoints, $dueDate, $instructions, $courseId, $periodDueDates);
        $stmt->execute();
        $stmt->close();

        // Remap grades to new exam_id
        $stmt = $db->prepare('UPDATE grades SET exam_id = ? WHERE exam_id = ?');
        $stmt->bind_param('ss', $newExamId, $oldExamId);
        $stmt->execute();
        $stmt->close();

        // Delete old exam row
        $stmt = $db->prepare('DELETE FROM exams WHERE exam_id = ?');
        $stmt->bind_param('s', $oldExamId);
        $stmt->execute();
        $stmt->close();

        $db->commit();
        echo json_encode(['result' => 'success']);
    } catch (Exception $e) {
        $db->rollback();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    // Just update the fields in place
    $stmt = $db->prepare(
        'UPDATE exams SET title = ?, total_points = ?, due_date = ?, instructions = ?, course_id = ?, period_due_dates = ?
         WHERE exam_id = ?'
    );
    $stmt->bind_param('sisssss', $title, $totalPoints, $dueDate, $instructions, $courseId, $periodDueDates, $oldExamId);

    if ($stmt->execute()) {
        echo json_encode(['result' => 'success']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
}

$db->close();
