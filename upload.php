<?php
// Handles student assignment file uploads. Files land under
// /uploads/{studentId}/{path} and are served back out by the Node server's
// static file middleware (no separate nginx alias needed on this domain).
require_once __DIR__ . '/api/db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$studentId = preg_replace('/[^A-Za-z0-9_-]/', '', $_POST['studentId'] ?? '');
$relPath   = $_POST['path'] ?? '';

if ($studentId === '' || $relPath === '' || !isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'studentId, path, and file are required']);
    exit;
}

if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Upload error code: ' . $_FILES['file']['error']]);
    exit;
}

$uploadsRoot = realpath(__DIR__ . '/uploads');
if ($uploadsRoot === false) {
    // First upload ever -- uploads/ doesn't exist yet.
    mkdir(__DIR__ . '/uploads', 0755, true);
    $uploadsRoot = realpath(__DIR__ . '/uploads');
}

$studentRoot = $uploadsRoot . '/' . $studentId;
if (!is_dir($studentRoot)) {
    mkdir($studentRoot, 0755, true);
}
$studentRoot = realpath($studentRoot);

// Normalize the relative path and reject anything that tries to climb out
// of the student's own folder (../, absolute paths, etc.).
$relPath = str_replace('\\', '/', $relPath);
$relPath = ltrim($relPath, '/');
$parts = array_filter(explode('/', $relPath), function ($p) { return $p !== '' && $p !== '.' && $p !== '..'; });
if (empty($parts)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid path']);
    exit;
}
$safeRelPath = implode('/', $parts);
$destPath = $studentRoot . '/' . $safeRelPath;

$destDir = dirname($destPath);
if (!is_dir($destDir)) {
    mkdir($destDir, 0755, true);
}

// Re-verify the final destination is still inside the student's folder
// (defends against symlink tricks / edge cases the part-filtering above
// might miss).
$destDirReal = realpath($destDir);
if ($destDirReal === false || strpos($destDirReal, $studentRoot) !== 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid path']);
    exit;
}

if (!move_uploaded_file($_FILES['file']['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save file']);
    exit;
}
chmod($destPath, 0644);

echo json_encode(['success' => true, 'path' => "uploads/$studentId/$safeRelPath"]);
