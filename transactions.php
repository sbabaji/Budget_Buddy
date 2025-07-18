<?php
// config.php would contain database connection details
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // IMPORTANT: Adjust for production to your frontend URL
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$conn = getDbConnection(); // Function from config.php to get DB connection

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Fetch all transactions
        $sql = "SELECT id, description, amount, type, created_at FROM transactions ORDER BY created_at DESC";
        $stmt = $conn->query($sql);
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($transactions);
        break;

    case 'POST':
        // Add a new transaction
        $data = json_decode(file_get_contents('php://input'), true);
        $description = $data['description'];
        $amount = $data['amount'];
        $type = $data['type'];
        $date = $data['date']; // Assuming YYYY-MM-DD from frontend

        $sql = "INSERT INTO transactions (description, amount, type, created_at) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        if ($stmt->execute([$description, $amount, $type, $date])) {
            $lastId = $conn->lastInsertId();
            echo json_encode([
                'id' => $lastId,
                'description' => $description,
                'amount' => $amount,
                'type' => $type,
                'date' => $date, // Return the date as sent
                'created_at' => date('Y-m-d H:i:s') // Or fetch from DB
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to add transaction']);
        }
        break;

    case 'DELETE':
        // Delete a transaction
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'Transaction ID is required']);
            exit();
        }
        $sql = "DELETE FROM transactions WHERE id = ?";
        $stmt = $conn->prepare($sql);
        if ($stmt->execute([$id])) {
            http_response_code(200);
            echo json_encode(['message' => 'Transaction deleted successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete transaction']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
        break;
}
?>