<?php
require_once '../config.php';

// Get action from both GET and POST
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if user is admin
if (!isset($_SESSION['user']) || $_SESSION['user']['type'] !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized - Admin access only']);
    exit();
}

switch($action) {
    case 'dashboard_stats':
        getDashboardStats();
        break;
    case 'pending_tutors':
        getPendingTutors();
        break;
    case 'verify_tutor':
        verifyTutor();
        break;
    case 'reject_tutor':
        rejectTutor();
        break;
    case 'all_users':
        getAllUsers();
        break;
    case 'all_sessions':
        getAllSessions();
        break;
    case 'all_transactions':
        getAllTransactions();
        break;
    case 'pending_withdrawals':
        getPendingWithdrawals();
        break;
    case 'process_withdrawal':
        processWithdrawal();
        break;
    case 'reject_withdrawal':
        rejectWithdrawal();
        break;
    case 'pending_reports':
        getPendingReports();
        break;
    case 'resolve_report':
        resolveReport();
        break;
    case 'release_escrow':
        releaseEscrow();
        break;
    case 'refund_payment':
        refundPayment();
        break;
    default:
        echo json_encode([
            'success' => false, 
            'message' => 'Invalid action: ' . $action
        ]);
}

function getDashboardStats() {
    $conn = getDBConnection();
    
    // Total users
    $stmt = $conn->query("SELECT COUNT(*) as total FROM users WHERE type != 'admin'");
    $totalUsers = $stmt->fetch()['total'];
    
    // Total tutors
    $stmt = $conn->query("SELECT COUNT(*) as total FROM tutors");
    $totalTutors = $stmt->fetch()['total'];
    
    // Pending tutor verifications
    $stmt = $conn->query("SELECT COUNT(*) as total FROM users WHERE type = 'tutor' AND verification_status = 'pending'");
    $pendingTutors = $stmt->fetch()['total'];
    
    // Total sessions
    $stmt = $conn->query("SELECT COUNT(*) as total FROM sessions");
    $totalSessions = $stmt->fetch()['total'];
    
    // Total transactions
    $stmt = $conn->query("SELECT SUM(amount) as total FROM transactions");
    $totalRevenue = $stmt->fetch()['total'] ?? 0;
    
    // Admin fees earned
    $stmt = $conn->query("SELECT SUM(admin_fee) as total FROM transactions WHERE status = 'released'");
    $adminFees = $stmt->fetch()['total'] ?? 0;
    
    // Pending withdrawals
    $stmt = $conn->query("SELECT COUNT(*) as total FROM withdrawals WHERE status = 'pending'");
    $pendingWithdrawals = $stmt->fetch()['total'];
    
    // Escrow balance (held payments)
    $stmt = $conn->query("SELECT SUM(amount) as total FROM transactions WHERE status = 'held'");
    $escrowBalance = $stmt->fetch()['total'] ?? 0;
    
    // Pending reports
    $stmt = $conn->query("SELECT COUNT(*) as total FROM reports WHERE status = 'pending'");
    $pendingReports = $stmt->fetch()['total'];
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'total_users' => $totalUsers,
            'total_tutors' => $totalTutors,
            'pending_tutors' => $pendingTutors,
            'total_sessions' => $totalSessions,
            'total_revenue' => $totalRevenue,
            'admin_fees' => $adminFees,
            'pending_withdrawals' => $pendingWithdrawals,
            'escrow_balance' => $escrowBalance,
            'pending_reports' => $pendingReports
        ]
    ]);
}

function getPendingTutors() {
    $conn = getDBConnection();
    $stmt = $conn->query("
        SELECT u.*, t.subject, t.lecturer, t.price 
        FROM users u
        LEFT JOIN tutors t ON u.id = t.user_id
        WHERE u.type = 'tutor' AND u.verification_status = 'pending'
        ORDER BY u.created_at DESC
    ");
    $tutors = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'tutors' => $tutors
    ]);
}

function verifyTutor() {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['user_id'] ?? 0;
    
    $conn = getDBConnection();
    
    // Update user verification
    $stmt = $conn->prepare("UPDATE users SET verified = TRUE, verification_status = 'approved' WHERE id = ?");
    $stmt->execute([$userId]);
    
    // Update tutor verified status
    $stmt = $conn->prepare("UPDATE tutors SET verified = TRUE WHERE user_id = ?");
    $stmt->execute([$userId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Tutor berhasil diverifikasi'
    ]);
}

function rejectTutor() {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['user_id'] ?? 0;
    $reason = $data['reason'] ?? 'Tidak memenuhi persyaratan';
    
    $conn = getDBConnection();
    $stmt = $conn->prepare("UPDATE users SET verification_status = 'rejected' WHERE id = ?");
    $stmt->execute([$userId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Verifikasi tutor ditolak'
    ]);
}

function getAllUsers() {
    $conn = getDBConnection();
    $stmt = $conn->query("
        SELECT * FROM users 
        WHERE type != 'admin'
        ORDER BY created_at DESC
        LIMIT 100
    ");
    $users = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
}

function getAllSessions() {
    $conn = getDBConnection();
    $stmt = $conn->query("
        SELECT s.*, 
               u.name as student_name, u.email as student_email,
               t.name as tutor_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        JOIN tutors t ON s.tutor_id = t.id
        ORDER BY s.created_at DESC
        LIMIT 100
    ");
    $sessions = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'sessions' => $sessions
    ]);
}

function getAllTransactions() {
    $conn = getDBConnection();
    $stmt = $conn->query("
        SELECT t.*, 
               s.date as session_date,
               u.name as student_name,
               tu.name as tutor_name
        FROM transactions t
        JOIN sessions s ON t.session_id = s.id
        JOIN users u ON t.user_id = u.id
        JOIN tutors tu ON t.tutor_id = tu.id
        ORDER BY t.created_at DESC
        LIMIT 100
    ");
    $transactions = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'transactions' => $transactions
    ]);
}

function getPendingWithdrawals() {
    $conn = getDBConnection();
    $stmt = $conn->query("
        SELECT w.*, t.name as tutor_name, t.avatar
        FROM withdrawals w
        JOIN tutors t ON w.tutor_id = t.id
        WHERE w.status = 'pending'
        ORDER BY w.created_at DESC
    ");
    $withdrawals = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'withdrawals' => $withdrawals
    ]);
}

function processWithdrawal() {
    $data = json_decode(file_get_contents('php://input'), true);
    $withdrawalId = $data['withdrawal_id'] ?? 0;
    $adminId = $_SESSION['user']['id'];
    
    $conn = getDBConnection();
    $stmt = $conn->prepare("
        UPDATE withdrawals 
        SET status = 'completed', processed_by = ?, processed_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$adminId, $withdrawalId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Withdrawal berhasil diproses'
    ]);
}

function rejectWithdrawal() {
    $data = json_decode(file_get_contents('php://input'), true);
    $withdrawalId = $data['withdrawal_id'] ?? 0;
    $reason = $data['reason'] ?? '';
    $adminId = $_SESSION['user']['id'];
    
    $conn = getDBConnection();
    $stmt = $conn->prepare("
        UPDATE withdrawals 
        SET status = 'rejected', rejection_reason = ?, processed_by = ?, processed_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$reason, $adminId, $withdrawalId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Withdrawal ditolak'
    ]);
}

function getPendingReports() {
    $conn = getDBConnection();
    $stmt = $conn->query("
        SELECT r.*, 
               u1.name as reporter_name,
               u2.name as reported_name
        FROM reports r
        JOIN users u1 ON r.reporter_id = u1.id
        JOIN users u2 ON r.reported_id = u2.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at DESC
    ");
    $reports = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'reports' => $reports
    ]);
}

function resolveReport() {
    $data = json_decode(file_get_contents('php://input'), true);
    $reportId = $data['report_id'] ?? 0;
    $resolution = $data['resolution'] ?? '';
    $adminId = $_SESSION['user']['id'];
    
    $conn = getDBConnection();
    $stmt = $conn->prepare("
        UPDATE reports 
        SET status = 'resolved', resolution_notes = ?, resolved_by = ?, resolved_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$resolution, $adminId, $reportId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Report berhasil diresolve'
    ]);
}

function releaseEscrow() {
    $data = json_decode(file_get_contents('php://input'), true);
    $transactionId = $data['transaction_id'] ?? 0;
    
    $conn = getDBConnection();
    
    // Get transaction details
    $stmt = $conn->prepare("SELECT * FROM transactions WHERE id = ?");
    $stmt->execute([$transactionId]);
    $transaction = $stmt->fetch();
    
    if (!$transaction) {
        echo json_encode(['success' => false, 'message' => 'Transaction not found']);
        return;
    }
    
    // Release escrow
    $stmt = $conn->prepare("
        UPDATE transactions 
        SET status = 'released', escrow_released_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$transactionId]);
    
    // Update session payment status
    $stmt = $conn->prepare("
        UPDATE sessions 
        SET payment_status = 'released'
        WHERE id = ?
    ");
    $stmt->execute([$transaction['session_id']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Escrow berhasil dirilis ke tutor'
    ]);
}

function refundPayment() {
    $data = json_decode(file_get_contents('php://input'), true);
    $transactionId = $data['transaction_id'] ?? 0;
    $reason = $data['reason'] ?? '';
    
    $conn = getDBConnection();
    
    // Get transaction details
    $stmt = $conn->prepare("SELECT * FROM transactions WHERE id = ?");
    $stmt->execute([$transactionId]);
    $transaction = $stmt->fetch();
    
    if (!$transaction) {
        echo json_encode(['success' => false, 'message' => 'Transaction not found']);
        return;
    }
    
    // Process refund
    $stmt = $conn->prepare("
        UPDATE transactions 
        SET status = 'refunded', notes = ?
        WHERE id = ?
    ");
    $stmt->execute([$reason, $transactionId]);
    
    // Update session status
    $stmt = $conn->prepare("
        UPDATE sessions 
        SET status = 'refunded', payment_status = 'refunded'
        WHERE id = ?
    ");
    $stmt->execute([$transaction['session_id']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Refund berhasil diproses'
    ]);
}
?>