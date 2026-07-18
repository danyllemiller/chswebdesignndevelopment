<?php
/**
 * /api/admin/sections
 * GET    — list all sections (joined with courses)
 * POST   — add a section  { section_id, course_id }
 * DELETE — remove a section  /api/admin/sections/{section_id}
 */
require_once __DIR__ . '/../db_config.php';
corsHeaders();
handleOptions();

$method = $_SERVER['REQUEST_METHOD'];

// Extract optional trailing path segment: /api/admin/sections/{section_id}
$pathInfo = trim($_SERVER['PATH_INFO'] ?? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts    = explode('/', $pathInfo);
$targetId = count($parts) > 0 ? urldecode(end($parts)) : null;
// Only treat it as a target if it's not "sections" itself
if ($targetId === 'sections') $targetId = null;

$db = getDB();

// ── GET ──────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $result = $db->query(
        'SELECT cs.section_id, cs.course_id, c.course_name, c.department
           FROM class_sections cs
           LEFT JOIN courses c ON cs.course_id = c.course_id
          ORDER BY cs.section_id'
    );
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    $db->close();
    echo json_encode($rows);
    exit;
}

// ── POST ─────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $body      = jsonInput();
    $sectionId = trim($body['section_id'] ?? '');
    $courseId  = trim($body['course_id']  ?? '');

    if (!$sectionId || !$courseId) {
        http_response_code(400);
        echo json_encode(['error' => 'section_id and course_id are required']);
        $db->close(); exit;
    }

    $stmt = $db->prepare('INSERT INTO class_sections (section_id, course_id) VALUES (?, ?)');
    $stmt->bind_param('ss', $sectionId, $courseId);
    if (!$stmt->execute()) {
        http_response_code(409);
        echo json_encode(['error' => 'Section already exists or invalid course_id']);
        $stmt->close(); $db->close(); exit;
    }
    $stmt->close();
    $db->close();
    echo json_encode(['result' => 'created', 'section_id' => $sectionId]);
    exit;
}

// ── DELETE ───────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    if (!$targetId) {
        http_response_code(400);
        echo json_encode(['error' => 'section_id required in URL']);
        $db->close(); exit;
    }

    $stmt = $db->prepare('DELETE FROM class_sections WHERE section_id = ?');
    $stmt->bind_param('s', $targetId);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();
    $db->close();

    if ($affected === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Section not found']);
        exit;
    }
    echo json_encode(['result' => 'deleted', 'section_id' => $targetId]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
$db->close();
