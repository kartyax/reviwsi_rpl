<?php
require_once '../config.php';

// Get action from both GET and POST
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

switch($action) {
    case 'list':
        getSessions();
        break;
    case 'create':
        createSession();
        break;
    case 'cancel':
        cancelSession();
        break;
    case 'detail':
        getSessionDetail();
        break;
    default:
        echo json_encode([
            'success' => false, 
            'message' => 'Invalid action: ' . $action,
            'debug' => [
                'method' => $_SERVER['REQUEST_METHOD'],
                'get' => $_GET,
                'post' => $_POST
            ]
        ]);
}

function getSessions() {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $userId = $_SESSION['user']['id'];
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("
        SELECT s.*, 
               t.name as tutor_name,
               t.university as tutor_university,
               t.subject as tutor_subject,
               t.avatar as tutor_avatar,
               t.lecturer as tutor_lecturer,
               t.rating as tutor_rating,
               t.reviews as tutor_reviews,
               t.sessions_completed as tutor_sessions
        FROM sessions s
        JOIN tutors t ON s.tutor_id = t.id
        WHERE s.user_id = ?
        ORDER BY s.date DESC
    ");
    $stmt->execute([$userId]);
    $sessions = $stmt->fetchAll();
    
    // Format data for compatibility with frontend
    $formattedSessions = [];
    foreach ($sessions as $session) {
        $formattedSessions[] = [
            'id' => $session['id'],
            'tutor' => [
                'id' => $session['tutor_id'],
                'name' => $session['tutor_name'],
                'university' => $session['tutor_university'],
                'subject' => $session['tutor_subject'],
                'avatar' => $session['tutor_avatar'],
                'lecturer' => $session['tutor_lecturer'],
                'rating' => $session['tutor_rating'],
                'reviews' => $session['tutor_reviews'],
                'sessions' => $session['tutor_sessions'],
                'price' => $session['price'] / $session['duration']
            ],
            'date' => $session['date'],
            'duration' => $session['duration'],
            'method' => $session['method'],
            'status' => $session['status'],
            'notes' => $session['notes'],
            'price' => $session['price'],
            'paymentMethod' => $session['payment_method']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'sessions' => $formattedSessions
    ]);
}

function createSession() {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    // Read JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode([
            'success' => false, 
            'message' => 'Invalid JSON',
            'debug' => [
                'input' => $input,
                'error' => json_last_error_msg()
            ]
        ]);
        return;
    }
    
    $userId = $_SESSION['user']['id'];
    $tutorId = $data['tutor_id'] ?? 0;
    $date = $data['start_time'] ?? '';
    $duration = $data['duration'] ?? 1;
    $method = $data['method'] ?? 'online';
    $notes = $data['notes'] ?? '';
    $paymentMethod = $data['payment_method'] ?? 'gopay';
    
    // Validate required fields
    if (empty($tutorId) || empty($date)) {
        echo json_encode([
            'success' => false, 
            'message' => 'Tutor ID and date are required',
            'debug' => $data
        ]);
        return;
    }
    
    // Get tutor price
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT price FROM tutors WHERE id = ?");
    $stmt->execute([$tutorId]);
    $tutor = $stmt->fetch();
    
    if (!$tutor) {
        echo json_encode(['success' => false, 'message' => 'Tutor not found']);
        return;
    }
    
    $totalPrice = $tutor['price'] * $duration;
    
    // Create session
    try {
        $stmt = $conn->prepare("
            INSERT INTO sessions (user_id, tutor_id, date, duration, method, status, notes, price, payment_method)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $userId,
            $tutorId,
            $date,
            $duration,
            $method,
            $notes,
            $totalPrice,
            $paymentMethod
        ]);
        
        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => 'Booking berhasil!',
                'session_id' => $conn->lastInsertId()
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to create session',
                'error' => $stmt->errorInfo()
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
}

function cancelSession() {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $sessionId = $data['session_id'] ?? 0;
    $userId = $_SESSION['user']['id'];
    
    $conn = getDBConnection();
    
    // Verify session belongs to user
    $stmt = $conn->prepare("SELECT id FROM sessions WHERE id = ? AND user_id = ?");
    $stmt->execute([$sessionId, $userId]);
    
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Session not found']);
        return;
    }
    
    // Update session status
    $stmt = $conn->prepare("UPDATE sessions SET status = 'cancelled' WHERE id = ?");
    $stmt->execute([$sessionId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Sesi berhasil dibatalkan'
    ]);
}

function getSessionDetail() {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $sessionId = $_GET['id'] ?? 0;
    $userId = $_SESSION['user']['id'];
    
    $conn = getDBConnection();
    $stmt = $conn->prepare("
        SELECT s.*, 
               t.name as tutor_name,
               t.university as tutor_university,
               t.subject as tutor_subject,
               t.avatar as tutor_avatar
        FROM sessions s
        JOIN tutors t ON s.tutor_id = t.id
        WHERE s.id = ? AND s.user_id = ?
    ");
    $stmt->execute([$sessionId, $userId]);
    $session = $stmt->fetch();
    
    if ($session) {
        echo json_encode([
            'success' => true,
            'session' => $session
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Session not found'
        ]);
    }
}
?>