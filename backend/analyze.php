<?php
// Set JSON content type
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Enable error reporting for debugging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'C:/xampp/htdocs/Plant_Disease_Detection/backend/php_error.log');

// Log function
function log_message($message) {
    file_put_contents('C:/xampp/htdocs/Plant_Disease_Detection/backend/debug.log', date('Y-m-d H:i:s') . ' - ' . $message . PHP_EOL, FILE_APPEND);
}

// Log PHP startup
log_message('PHP script started');

// Check for config.php
if (!file_exists('config.php')) {
    log_message('Error: config.php not found');
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: config.php not found']);
    exit;
}

// Include config.php
try {
    require_once 'config.php';
    log_message('config.php included successfully');
} catch (Exception $e) {
    log_message('Error including config.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: ' . $e->getMessage()]);
    exit;
}

// Verify config variables
if (!isset($servername, $username, $password, $dbname, $api_url)) {
    log_message('Error: One or more config variables missing');
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: Missing config variables']);
    exit;
}
log_message('Config variables verified: servername=' . $servername . ', api_url=' . $api_url);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        log_message('Invalid request method: ' . $_SERVER['REQUEST_METHOD']);
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request method']);
        exit;
    }

    if (!isset($_FILES['image'])) {
        log_message('No image provided in request: ' . json_encode($_FILES));
        http_response_code(400);
        echo json_encode(['error' => 'No image provided']);
        exit;
    }

    log_message('POST request with image received');
    $file = $_FILES['image'];
    $filename = time() . '_' . basename($file['name']);
    $upload_dir = 'Uploads/';
    $upload_path = $upload_dir . $filename;

    log_message("File: $filename, Type: {$file['type']}, Size: {$file['size']}");

    if (!file_exists($upload_dir)) {
        if (!mkdir($upload_dir, 0777, true)) {
            log_message('Failed to create upload directory: ' . $upload_dir);
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create upload directory']);
            exit;
        }
        log_message("Created upload directory: $upload_dir");
    }

    if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
        log_message("File upload failed: " . $file['error']);
        http_response_code(400);
        echo json_encode(['error' => 'File upload failed']);
        exit;
    }

    log_message("File uploaded to: $upload_path");
    $url = $api_url;
    log_message("Sending request to API: $url");

    $ch = curl_init($url);
    $post_data = ['image' => new CURLFile($upload_path, $file['type'], $filename)];

    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    log_message("API response code: $http_code");
    if ($error) {
        log_message("CURL error: $error");
    }
    log_message("API response: " . substr($response, 0, 500));

    if ($http_code !== 200 || !$response) {
        log_message("API request failed. HTTP: $http_code, Error: $error");
        http_response_code(500);
        echo json_encode(['error' => 'Failed to connect to API: ' . $error]);
        exit;
    }

    $result = json_decode($response, true);
    if (!isset($result['prediction']) || !isset($result['confidence'])) {
        log_message("Invalid API response: " . json_encode($result));
        http_response_code(500);
        echo json_encode(['error' => 'Invalid API response']);
        exit;
    }

    // Extract probabilities
    $prob_healthy = isset($result['probabilities']['healthy']) ? $result['probabilities']['healthy'] : ($result['prediction'] === 'healthy' ? $result['confidence'] : 1 - $result['confidence']);
    $prob_diseased = isset($result['probabilities']['diseased']) ? $result['probabilities']['diseased'] : ($result['prediction'] === 'diseased' ? $result['confidence'] : 1 - $result['confidence']);
    log_message("Extracted prob_healthy: $prob_healthy, prob_diseased: $prob_diseased");

    // Connect to database
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        log_message("Database connection failed: " . $conn->connect_error);
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
        exit;
    }

    // Insert into database
    $prediction = $result['prediction'];
    $confidence = $result['confidence'];
    $stmt = $conn->prepare("INSERT INTO predictions (image_name, prediction, confidence, prob_healthy, prob_diseased) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssddd", $filename, $prediction, $confidence, $prob_healthy, $prob_diseased);
    if (!$stmt->execute()) {
        log_message("Database insert failed: " . $stmt->error);
        http_response_code(500);
        echo json_encode(['error' => 'Database insert failed: ' . $stmt->error]);
        $stmt->close();
        $conn->close();
        exit;
    }

    log_message("Prediction saved: $prediction, Confidence: $confidence, Prob_healthy: $prob_healthy, Prob_diseased: $prob_diseased");
    $stmt->close();
    $conn->close();

    // Return structured JSON response
    echo json_encode([
        'image_name' => $filename,
        'prediction' => $prediction,
        'confidence' => $confidence,
        'prob_healthy' => $prob_healthy,
        'prob_diseased' => $prob_diseased
    ]);

} catch (Exception $e) {
    log_message("Exception: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>