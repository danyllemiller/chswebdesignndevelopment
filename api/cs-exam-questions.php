<?php
require_once __DIR__ . '/db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$unit = trim($_GET['unit'] ?? '');

$db = getDB();

if ($unit !== '') {
    $stmt = $db->prepare(
        'SELECT unit, question, options, answer FROM cs_questions WHERE unit = ? ORDER BY RAND()'
    );
    $stmt->bind_param('s', $unit);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();
} else {
    $result = $db->query('SELECT unit, question, options, answer FROM cs_questions ORDER BY unit, RAND()');
}

$questions = [];
while ($row = $result->fetch_assoc()) {
    $questions[] = [
        'chapter' => $row['unit'],
        'question' => $row['question'],
        'options'  => is_string($row['options']) ? json_decode($row['options'], true) : $row['options'],
        'answer'   => $row['answer'],
    ];
}
$db->close();

echo json_encode($questions);
