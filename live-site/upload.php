<?php
/**
 * CHS Web Design - HostGator Upload Handler
 * Receives files from the Student Portal and recreates their exact folder structure
 * so that uploaded websites function live.
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 1. Get the Student ID and the exact File Path
$studentId = preg_replace('/[^a-zA-Z0-9_]/', '', $_POST['studentId'] ?? '');
$path = $_POST['path'] ?? '';

// 2. Validate the request
if (empty($studentId) || empty($_FILES['file'])) {
    echo json_encode(["success" => false, "message" => "Missing student ID or file."]);
    exit;
}

// 3. Security: Clean the path so they can't hack out of their assigned folder
// Removes any "../" attempts to traverse directories
$path = str_replace(['../', '..\\'], '', $path);
$path = ltrim($path, '/');

// If no path was provided, just use the file's name
if (empty($path)) {
    $path = basename($_FILES['file']['name']);
}

// 4. Build the final destination route
$targetFile = __DIR__ . '/uploads/' . $studentId . '/' . $path;
$targetDir = dirname($targetFile);

// 5. Create the student's sub-folders if they don't exist yet!
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

// 6. Move the file into its new live home
if (move_uploaded_file($_FILES['file']['tmp_name'], $targetFile)) {
    echo json_encode(["success" => true, "path" => $path]);
} else {
    echo json_encode(["success" => false, "message" => "Server failed to save the file."]);
}
?>