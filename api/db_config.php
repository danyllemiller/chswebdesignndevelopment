<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'digartcl_danylle');
define('DB_PASS', 'k@T1e!2503!$');
define('DB_NAME', 'digartcl_students');

function getDB() {
    $conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
        exit;
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

function jsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

function corsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json; charset=utf-8');
}

function handleOptions() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
