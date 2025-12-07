<?php
require_once '../config.php';

$action = $_GET['action'] ?? '';

switch($action) {
    case 'list':
        getTutors();
        break;
    case 'detail':
        getTutorDetail();
        break;
    case 'filter':
        filterTutors();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getTutors() {
    $conn = getDBConnection();
    
    $sortBy = $_GET['sort'] ?? 'rating';
    $orderClause = match($sortBy) {
        'rating' => 'ORDER BY rating DESC',
        'price-low' => 'ORDER BY price ASC',
        'price-high' => 'ORDER BY price DESC',
        'sessions' => 'ORDER BY sessions_completed DESC',
        default => 'ORDER BY rating DESC'
    };
    
    $stmt = $conn->query("SELECT * FROM tutors $orderClause");
    $tutors = $stmt->fetchAll();
    
    // Format data for compatibility
    foreach ($tutors as &$tutor) {
        $tutor['sessions'] = $tutor['sessions_completed'];
    }
    
    echo json_encode([
        'success' => true,
        'tutors' => $tutors
    ]);
}

function getTutorDetail() {
    $id = $_GET['id'] ?? 0;
    
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT * FROM tutors WHERE id = ?");
    $stmt->execute([$id]);
    $tutor = $stmt->fetch();
    
    if ($tutor) {
        $tutor['sessions'] = $tutor['sessions_completed'];
        
        echo json_encode([
            'success' => true,
            'tutor' => $tutor
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Tutor not found'
        ]);
    }
}

function filterTutors() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $subject = $data['subject'] ?? '';
    $university = $data['university'] ?? '';
    $rating = $data['rating'] ?? 0;
    $maxPrice = $data['price'] ?? 500000;
    
    $conn = getDBConnection();
    
    $where = ['price <= ?'];
    $params = [$maxPrice];
    
    if (!empty($subject)) {
        $where[] = 'subject LIKE ?';
        $params[] = "%$subject%";
    }
    
    if (!empty($university)) {
        $where[] = 'university = ?';
        $params[] = $university;
    }
    
    if ($rating > 0) {
        $where[] = 'rating >= ?';
        $params[] = $rating;
    }
    
    $whereClause = implode(' AND ', $where);
    
    $stmt = $conn->prepare("SELECT * FROM tutors WHERE $whereClause ORDER BY rating DESC");
    $stmt->execute($params);
    $tutors = $stmt->fetchAll();
    
    // Format data for compatibility
    foreach ($tutors as &$tutor) {
        $tutor['sessions'] = $tutor['sessions_completed'];
    }
    
    echo json_encode([
        'success' => true,
        'tutors' => $tutors,
        'count' => count($tutors)
    ]);
}
?>