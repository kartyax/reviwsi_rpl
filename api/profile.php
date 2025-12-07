<?php
require_once '../config.php';

$action = $_GET['action'] ?? '';

switch($action) {
    case 'get':
        getProfile();
        break;
    case 'update':
        updateProfile();
        break;
    case 'stats':
        getStats();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getProfile() {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'user' => $_SESSION['user']
    ]);
}

function updateProfile() {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $_SESSION['user']['id'];
    
    $name = $data['name'] ?? $_SESSION['user']['name'];
    $university = $data['university'] ?? $_SESSION['user']['university'];
    $nim = $data['nim'] ?? $_SESSION['user']['nim'];
    
    $conn = getDBConnection();
    $stmt = $conn->prepare("UPDATE users SET name = ?, university = ?, nim = ? WHERE id = ?");
    $stmt->execute([$name, $university, $nim, $userId]);
    
    // Update session
    $_SESSION['user']['name'] = $name;
    $_SESSION['user']['university'] = $university;
    $_SESSION['user']['nim'] = $nim;
    
    echo json_encode([
        'success' => true,
        'message' => 'Profil berhasil diperbarui',
        'user' => $_SESSION['user']
    ]);
}

function getStats() {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    $userId = $_SESSION['user']['id'];
    $conn = getDBConnection();
    
    // Get total sessions
    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM sessions WHERE user_id = ?");
    $stmt->execute([$userId]);
    $total = $stmt->fetch()['total'];
    
    // Get completed sessions
    $stmt = $conn->prepare("SELECT COUNT(*) as completed FROM sessions WHERE user_id = ? AND status = 'completed'");
    $stmt->execute([$userId]);
    $completed = $stmt->fetch()['completed'];
    
    // Get pending sessions
    $stmt = $conn->prepare("SELECT COUNT(*) as pending FROM sessions WHERE user_id = ? AND status = 'pending'");
    $stmt->execute([$userId]);
    $pending = $stmt->fetch()['pending'];
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'total' => $total,
            'completed' => $completed,
            'pending' => $pending
        ]
    ]);
}
?>