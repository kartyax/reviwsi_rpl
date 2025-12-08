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
        getTutorSessions();
        break;
    case 'confirm':
        confirmSession();
        break;
    case 'reject':
        rejectSession();
        break;
    case 'complete':
        completeSession();
        break;
    case 'stats':
        getTutorStats();
        break;
    default:
        echo json_encode([
            'success' => false, 
            'message' => 'Invalid action: ' . $action
        ]);
}

function getTutorSessions() {
    if (!isset($_SESSION['user']) || $_SESSION['user']['type'] !== 'tutor') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $tutorName = $_SESSION['user']['name'];
    $conn = getDBConnection();
    
    // Get tutor_id from tutors table based on name
    $stmt = $conn->prepare("SELECT id FROM tutors WHERE name = ?");
    $stmt->execute([$tutorName]);
    $tutor = $stmt->fetch();
    
    if (!$tutor) {
        echo json_encode(['success' => true, 'sessions' => []]);
        return;
    }
    
    $tutorId = $tutor['id'];
    
    $stmt = $conn->prepare("
        SELECT s.*, 
               u.name as student_name,
               u.email as student_email,
               u.university as student_university,
               u.nim as student_nim,
               u.avatar as student_avatar,
               t.subject as tutor_subject,
               t.price as tutor_price
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        JOIN tutors t ON s.tutor_id = t.id
        WHERE s.tutor_id = ?
        ORDER BY s.date DESC
    ");
    $stmt->execute([$tutorId]);
    $sessions = $stmt->fetchAll();
    
    // Format data for compatibility with frontend
    $formattedSessions = [];
    foreach ($sessions as $session) {
        $formattedSessions[] = [
            'id' => $session['id'],
            'student' => [
                'name' => $session['student_name'],
                'email' => $session['student_email'],
                'university' => $session['student_university'],
                'nim' => $session['student_nim'],
                'avatar' => $session['student_avatar']
            ],
            'subject' => $session['tutor_subject'],
            'date' => $session['date'],
            'duration' => $session['duration'],
            'method' => $session['method'],
            'status' => $session['status'],
            'notes' => $session['notes'],
            'price' => $session['price'],
            'payment_method' => $session['payment_method']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'sessions' => $formattedSessions
    ]);
}

function confirmSession() {
    if (!isset($_SESSION['user']) || $_SESSION['user']['type'] !== 'tutor') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $sessionId = $data['session_id'] ?? 0;
    
    $conn = getDBConnection();
    
    // Verify session belongs to this tutor
    $tutorName = $_SESSION['user']['name'];
    $stmt = $conn->prepare("SELECT id FROM tutors WHERE name = ?");
    $stmt->execute([$tutorName]);
    $tutor = $stmt->fetch();
    
    if (!$tutor) {
        echo json_encode(['success' => false, 'message' => 'Tutor profile not found']);
        return;
    }
    
    $stmt = $conn->prepare("SELECT id FROM sessions WHERE id = ? AND tutor_id = ?");
    $stmt->execute([$sessionId, $tutor['id']]);
    
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Session not found']);
        return;
    }
    
    // Update session status
    $stmt = $conn->prepare("UPDATE sessions SET status = 'confirmed' WHERE id = ?");
    $stmt->execute([$sessionId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Sesi berhasil dikonfirmasi'
    ]);
}

function rejectSession() {
    if (!isset($_SESSION['user']) || $_SESSION['user']['type'] !== 'tutor') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $sessionId = $data['session_id'] ?? 0;
    
    $conn = getDBConnection();
    
    // Verify session belongs to this tutor
    $tutorName = $_SESSION['user']['name'];
    $stmt = $conn->prepare("SELECT id FROM tutors WHERE name = ?");
    $stmt->execute([$tutorName]);
    $tutor = $stmt->fetch();
    
    if (!$tutor) {
        echo json_encode(['success' => false, 'message' => 'Tutor profile not found']);
        return;
    }
    
    $stmt = $conn->prepare("SELECT id FROM sessions WHERE id = ? AND tutor_id = ?");
    $stmt->execute([$sessionId, $tutor['id']]);
    
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Session not found']);
        return;
    }
    
    // Update session status
    $stmt = $conn->prepare("UPDATE sessions SET status = 'cancelled' WHERE id = ?");
    $stmt->execute([$sessionId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Sesi berhasil ditolak'
    ]);
}

function completeSession() {
    if (!isset($_SESSION['user']) || $_SESSION['user']['type'] !== 'tutor') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $sessionId = $data['session_id'] ?? 0;
    
    $conn = getDBConnection();
    
    // Verify session belongs to this tutor
    $tutorName = $_SESSION['user']['name'];
    $stmt = $conn->prepare("SELECT id FROM tutors WHERE name = ?");
    $stmt->execute([$tutorName]);
    $tutor = $stmt->fetch();
    
    if (!$tutor) {
        echo json_encode(['success' => false, 'message' => 'Tutor profile not found']);
        return;
    }
    
    $stmt = $conn->prepare("SELECT id FROM sessions WHERE id = ? AND tutor_id = ?");
    $stmt->execute([$sessionId, $tutor['id']]);
    
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Session not found']);
        return;
    }
    
    // Update session status
    $stmt = $conn->prepare("UPDATE sessions SET status = 'completed' WHERE id = ?");
    $stmt->execute([$sessionId]);
    
    // Update tutor's completed sessions count
    $stmt = $conn->prepare("UPDATE tutors SET sessions_completed = sessions_completed + 1 WHERE id = ?");
    $stmt->execute([$tutor['id']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Sesi berhasil diselesaikan'
    ]);
}

function getTutorStats() {
    if (!isset($_SESSION['user']) || $_SESSION['user']['type'] !== 'tutor') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $tutorName = $_SESSION['user']['name'];
    $conn = getDBConnection();
    
    // Get tutor_id from tutors table
    $stmt = $conn->prepare("SELECT id, rating, reviews, sessions_completed, price FROM tutors WHERE name = ?");
    $stmt->execute([$tutorName]);
    $tutor = $stmt->fetch();
    
    if (!$tutor) {
        echo json_encode([
            'success' => true,
            'stats' => [
                'total' => 0,
                'pending' => 0,
                'confirmed' => 0,
                'completed' => 0,
                'rating' => 0,
                'reviews' => 0,
                'earnings' => 0
            ]
        ]);
        return;
    }
    
    $tutorId = $tutor['id'];
    
    // Get total sessions
    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM sessions WHERE tutor_id = ?");
    $stmt->execute([$tutorId]);
    $total = $stmt->fetch()['total'];
    
    // Get pending sessions
    $stmt = $conn->prepare("SELECT COUNT(*) as pending FROM sessions WHERE tutor_id = ? AND status = 'pending'");
    $stmt->execute([$tutorId]);
    $pending = $stmt->fetch()['pending'];
    
    // Get confirmed sessions
    $stmt = $conn->prepare("SELECT COUNT(*) as confirmed FROM sessions WHERE tutor_id = ? AND status = 'confirmed'");
    $stmt->execute([$tutorId]);
    $confirmed = $stmt->fetch()['confirmed'];
    
    // Get completed sessions
    $stmt = $conn->prepare("SELECT COUNT(*) as completed FROM sessions WHERE tutor_id = ? AND status = 'completed'");
    $stmt->execute([$tutorId]);
    $completed = $stmt->fetch()['completed'];
    
    // Calculate earnings
    $stmt = $conn->prepare("SELECT SUM(price) as earnings FROM sessions WHERE tutor_id = ? AND status IN ('confirmed', 'completed')");
    $stmt->execute([$tutorId]);
    $earnings = $stmt->fetch()['earnings'] ?? 0;
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'total' => $total,
            'pending' => $pending,
            'confirmed' => $confirmed,
            'completed' => $completed,
            'rating' => $tutor['rating'],
            'reviews' => $tutor['reviews'],
            'earnings' => $earnings
        ]
    ]);
}
?>