<?php
/**
 * CHS Web Design - HostGator File Manager
 * Handles Listing, Moving, and Deleting files for the Student Workspace
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_POST['action'] ?? 'list';
$studentId = preg_replace('/[^a-zA-Z0-9_]/', '', $_POST['studentId'] ?? '');

if (empty($studentId)) {
    echo json_encode(["success" => false, "message" => "Missing student ID"]);
    exit;
}

// Set base directory to the existing uploads folder
$baseDir = __DIR__ . '/uploads/' . $studentId . '/';

// Helper function to recursively delete a directory and its contents
function deleteDir($dirPath) {
    if (!is_dir($dirPath)) return false;
    if (substr($dirPath, strlen($dirPath) - 1, 1) != '/') $dirPath .= '/';
    $files = glob($dirPath . '*', GLOB_MARK);
    foreach ($files as $file) {
        if (is_dir($file)) deleteDir($file);
        else unlink($file);
    }
    return rmdir($dirPath);
}

if ($action === 'list') {
    if (!is_dir($baseDir)) {
        // Return empty array if folder doesn't exist yet
        echo json_encode(["success" => true, "files" => []]);
        exit;
    }

    $files = [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($baseDir));
    
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $relativePath = str_replace(__DIR__ . '/', '', $file->getPathname());
            $relativePath = str_replace('\\', '/', $relativePath); // Fix slashes
            
            // Generate full public URL for downloading/viewing
            $url = "https://digitalartsclasses.com/" . $relativePath;
            
            // Exclude hidden system files EXCEPT .keep (which tracks empty folders)
            $baseName = basename($relativePath);
            if($baseName[0] === '.' && $baseName !== '.keep') continue;

            $files[] = [
                "name" => $baseName,
                "path" => $relativePath,
                "url" => $url,
                "size" => $file->getSize(),
                "time" => $file->getMTime(),
                "type" => function_exists('mime_content_type') ? @mime_content_type($file->getPathname()) : ''
            ];
        }
    }

    // Sort files so the newest uploads appear at the top
    usort($files, function($a, $b) {
        return $b['time'] - $a['time'];
    });

    echo json_encode(["success" => true, "files" => $files]);
}
elseif ($action === 'move') {
    $oldPath = $_POST['oldPath'] ?? '';
    $newPath = $_POST['newPath'] ?? '';

    // Security: Prevent directory traversal hacking
    if (strpos($oldPath, '..') !== false || strpos($newPath, '..') !== false) {
        echo json_encode(["success" => false, "message" => "Security violation"]);
        exit;
    }

    $fullOldPath = __DIR__ . '/uploads/' . $studentId . '/' . $oldPath;
    $fullNewPath = __DIR__ . '/uploads/' . $studentId . '/' . $newPath;

    if (!file_exists($fullOldPath)) {
        echo json_encode(["success" => false, "message" => "Original file/folder not found"]);
        exit;
    }

    // Automatically create the target folders if they don't exist yet
    $targetDir = dirname($fullNewPath);
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0755, true);
    }

    // Execute the move
    if (rename($fullOldPath, $fullNewPath)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Could not move file/folder"]);
    }
}
elseif ($action === 'delete') {
    $path = $_POST['path'] ?? '';
    
    // Security: Prevent directory traversal
    if (strpos($path, '..') !== false || strpos($path, '/') === 0) {
        echo json_encode(["success" => false, "message" => "Security violation"]);
        exit;
    }
    
    // Security: Ensure path actually belongs to the requesting student
    if (strpos($path, "uploads/{$studentId}/") !== 0) {
        echo json_encode(["success" => false, "message" => "Permission denied"]);
        exit;
    }

    $fullPath = __DIR__ . '/' . $path;
    
    // Check if it's a directory or a file and delete accordingly
    if (is_dir($fullPath)) {
        if (deleteDir($fullPath)) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "message" => "Could not delete folder"]);
        }
    } else if (file_exists($fullPath) && unlink($fullPath)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Could not delete file"]);
    }
}
else {
    echo json_encode(["success" => false, "message" => "Unknown action"]);
}
?>