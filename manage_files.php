<?php
// Lists, moves, and deletes files under /uploads/{studentId}/ -- the
// counterpart to upload.php. Every path coming from the client may be either
// relative to the student's folder ("notes.html") or already prefixed with
// "uploads/{studentId}/" (both conventions are used by different callers in
// the front-end), so paths are normalized by stripping that prefix if present
// before being resolved and validated.
require_once __DIR__ . '/api/db_config.php';
corsHeaders();
handleOptions();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$action    = $_POST['action'] ?? '';
$studentId = preg_replace('/[^A-Za-z0-9_-]/', '', $_POST['studentId'] ?? '');

if ($studentId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'studentId is required']);
    exit;
}

$uploadsRoot = __DIR__ . '/uploads';
if (!is_dir($uploadsRoot)) mkdir($uploadsRoot, 0755, true);
$studentRoot = $uploadsRoot . '/' . $studentId;
if (!is_dir($studentRoot)) mkdir($studentRoot, 0755, true);
$studentRoot = realpath($studentRoot);

// Strips an optional "uploads/{studentId}/" prefix, blocks ../ traversal,
// and resolves to an absolute path guaranteed to sit inside the student's
// own folder. Returns null if the path is invalid or escapes the folder.
function resolveStudentPath($raw, $studentRoot, $studentId) {
    $p = str_replace('\\', '/', (string)$raw);
    $prefix = "uploads/$studentId/";
    if (strpos($p, $prefix) === 0) $p = substr($p, strlen($prefix));
    $p = ltrim($p, '/');
    $parts = array_filter(explode('/', $p), function ($seg) { return $seg !== '' && $seg !== '.' && $seg !== '..'; });
    if (empty($parts)) return null;
    $safeRel = implode('/', $parts);
    $full = $studentRoot . '/' . $safeRel;
    // Can't realpath() a not-yet-existing destination (e.g. move target), so
    // validate the parent directory chain instead when the path itself
    // doesn't exist yet.
    $checkBase = file_exists($full) ? $full : dirname($full);
    $checkReal = realpath($checkBase);
    if ($checkReal === false || strpos($checkReal, $studentRoot) !== 0) return null;
    return ['full' => $full, 'rel' => $safeRel];
}

function rrmdir($dir) {
    if (!is_dir($dir)) { @unlink($dir); return; }
    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . '/' . $item;
        is_dir($path) ? rrmdir($path) : unlink($path);
    }
    rmdir($dir);
}

function rcopyOrMove($src, $dest, $move) {
    if (is_dir($src)) {
        if (!is_dir($dest)) mkdir($dest, 0755, true);
        foreach (scandir($src) as $item) {
            if ($item === '.' || $item === '..') continue;
            rcopyOrMove($src . '/' . $item, $dest . '/' . $item, $move);
        }
        if ($move) rmdir($src);
    } else {
        $destDir = dirname($dest);
        if (!is_dir($destDir)) mkdir($destDir, 0755, true);
        $move ? rename($src, $dest) : copy($src, $dest);
    }
}

if ($action === 'list') {
    $files = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($studentRoot, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isFile()) continue;
        $relPath = ltrim(str_replace($studentRoot, '', $fileInfo->getPathname()), '/');
        $files[] = [
            'path' => "uploads/$studentId/$relPath",
            'name' => $fileInfo->getFilename(),
            'url'  => "/uploads/$studentId/$relPath",
            'size' => $fileInfo->getSize(),
            'mtime' => $fileInfo->getMTime()
        ];
    }
    echo json_encode(['success' => true, 'files' => $files]);
    exit;
}

if ($action === 'move') {
    $old = resolveStudentPath($_POST['oldPath'] ?? '', $studentRoot, $studentId);
    $new = resolveStudentPath($_POST['newPath'] ?? '', $studentRoot, $studentId);
    if (!$old || !$new || !file_exists($old['full'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid source or destination path']);
        exit;
    }
    rcopyOrMove($old['full'], $new['full'], true);
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'delete') {
    $target = resolveStudentPath($_POST['path'] ?? '', $studentRoot, $studentId);
    if (!$target || !file_exists($target['full'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid path']);
        exit;
    }
    if (is_dir($target['full'])) rrmdir($target['full']);
    else unlink($target['full']);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Unknown action']);
