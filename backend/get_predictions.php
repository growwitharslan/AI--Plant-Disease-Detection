<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'plant_disease_results';

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}

$where = [];
$params = [];
$types = '';

if (isset($_GET['start_date']) && !empty($_GET['start_date'])) {
    $where[] = 'created_at >= ?';
    $params[] = $_GET['start_date'];
    $types .= 's';
}

if (isset($_GET['end_date']) && !empty($_GET['end_date'])) {
    $where[] = 'created_at <= ?';
    $params[] = $_GET['end_date'];
    $types .= 's';
}

if (isset($_GET['prediction']) && !empty($_GET['prediction'])) {
    $where[] = 'prediction = ?';
    $params[] = $_GET['prediction'];
    $types .= 's';
}

$query = "SELECT * FROM predictions";
if (!empty($where)) {
    $query .= " WHERE " . implode(' AND ', $where);
}
$query .= " ORDER BY created_at DESC";

$stmt = $conn->prepare($query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$predictions = [];
while ($row = $result->fetch_assoc()) {
    $predictions[] = [
        'id' => $row['id'],
        'image_name' => $row['image_name'],
        'prediction' => $row['prediction'],
        'confidence' => $row['confidence'],
        'prob_healthy' => $row['prob_healthy'],
        'prob_diseased' => $row['prob_diseased'],
        'created_at' => $row['created_at']
    ];
}

$stmt->close();
$conn->close();
echo json_encode($predictions);
?>