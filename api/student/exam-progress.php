<?php
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

if ($method === 'GET') {
    $studentId = trim($_GET['student_id'] ?? '');
    $examId    = trim($_GET['exam_id'] ?? '');

    if (!$studentId || !$examId) {
        http_response_code(400);
        echo json_encode(['error' => 'student_id and exam_id required']);
        $db->close();
        exit;
    }

    $stmt = $db->prepare(
        'SELECT answers, current_index, updated_at FROM exam_progress WHERE student_id = ? AND exam_id = ?'
    );
    $stmt->bind_param('ss', $studentId, $examId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $db->close();

    if (!$row) {
        echo json_encode(['found' => false]);
    } else {
        echo json_encode([
            'found'         => true,
            'answers'       => json_decode($row['answers'], true),
            'current_index' => (int)$row['current_index'],
            'updated_at'    => $row['updated_at'],
        ]);
    }

} elseif ($method === 'POST') {
    $body      = jsonInput();
    $studentId = trim($body['student_id'] ?? '');
    $examId    = trim($body['exam_id'] ?? '');
    $answers   = $body['answers'] ?? [];
    $index     = (int)($body['current_index'] ?? 0);

    if (!$studentId || !$examId) {
        http_response_code(400);
        echo json_encode(['error' => 'student_id and exam_id required']);
        $db->close();
        exit;
    }

    $answersJson = json_encode($answers);
    $stmt = $db->prepare(
        'INSERT INTO exam_progress (student_id, exam_id, answers, current_index)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE answers = VALUES(answers), current_index = VALUES(current_index), updated_at = NOW()'
    );
    $stmt->bind_param('sssi', $studentId, $examId, $answersJson, $index);

    if ($stmt->execute()) {
        echo json_encode(['result' => 'success']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $stmt->error]);
    }
    $stmt->close();
    $db->close();

} elseif ($method === 'DELETE') {
    $studentId = trim($_GET['student_id'] ?? '');
    $examId    = trim($_GET['exam_id'] ?? '');

    if (!$studentId || !$examId) {
        http_response_code(400);
        echo json_encode(['error' => 'student_id and exam_id required']);
        $db->close();
        exit;
    }

    $stmt = $db->prepare('DELETE FROM exam_progress WHERE student_id = ? AND exam_id = ?');
    $stmt->bind_param('ss', $studentId, $examId);
    $stmt->execute();
    $stmt->close();
    $db->close();

    echo json_encode(['result' => 'success']);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    $db->close();
}
