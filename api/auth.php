<?php
require_once '../config.php';

$action = $_GET['action'] ?? '';

switch($action) {
    case 'login':
        login();
        break;
    case 'register':
        register();
        break;
    case 'logout':
        logout();
        break;
    case 'check':
        checkAuth();
        break;
    case 'quick_login':
        quickLogin();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function login() {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !str_ends_with($email, '.ac.id')) {
        echo json_encode([
            'success' => false,
            'message' => 'Email harus menggunakan domain universitas (.ac.id)'
        ]);
        return;
    }
    
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        unset($user['password']);
        $_SESSION['user'] = $user;
        
        echo json_encode([
            'success' => true,
            'message' => 'Login berhasil',
            'user' => $user
        ]);
    } else {
        // For demo: create user if not exists
        $name = explode('@', $email)[0];
        $name = ucwords(str_replace('.', ' ', $name));
        $nim = '19' . rand(10000000, 99999999);
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $avatar = "https://ui-avatars.com/api/?name=" . urlencode($name) . "&size=150&background=random";
        
        $stmt = $conn->prepare("INSERT INTO users (name, email, password, nim, university, type, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $email, $hashedPassword, $nim, 'Universitas Indonesia', 'student', $avatar]);
        
        $user = [
            'id' => $conn->lastInsertId(),
            'name' => $name,
            'email' => $email,
            'nim' => $nim,
            'university' => 'Universitas Indonesia',
            'type' => 'student',
            'avatar' => $avatar
        ];
        
        $_SESSION['user'] = $user;
        
        echo json_encode([
            'success' => true,
            'message' => 'Login berhasil',
            'user' => $user
        ]);
    }
}

function register() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $nim = $data['nim'] ?? '';
    $university = $data['university'] ?? '';
    $password = $data['password'] ?? '';
    $password_confirm = $data['password_confirm'] ?? '';
    $role = $data['role'] ?? 'student';
    
    // Validation
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !str_ends_with($email, '.ac.id')) {
        echo json_encode([
            'success' => false,
            'message' => 'Email harus menggunakan domain universitas (.ac.id)'
        ]);
        return;
    }
    
    if ($password !== $password_confirm) {
        echo json_encode([
            'success' => false,
            'message' => 'Password tidak cocok'
        ]);
        return;
    }
    
    if (strlen($password) < 8) {
        echo json_encode([
            'success' => false,
            'message' => 'Password minimal 8 karakter'
        ]);
        return;
    }
    
    $conn = getDBConnection();
    
    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'Email sudah terdaftar'
        ]);
        return;
    }
    
    // Insert new user
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $avatar = "https://ui-avatars.com/api/?name=" . urlencode($name) . "&size=150&background=random";
    
    $stmt = $conn->prepare("INSERT INTO users (name, email, password, nim, university, type, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hashedPassword, $nim, $university, $role, $avatar]);
    
    // ========================================
    // SOLUSI: Jika registrasi sebagai tutor, buat entri di tabel tutors
    // ========================================
    if ($role === 'tutor') {
        // Default values untuk tutor baru
        $defaultSubject = 'Umum'; // Bisa diupdate nanti oleh tutor
        $defaultLecturer = 'Belum diset'; // Tutor bisa update nanti
        $defaultPrice = 75000; // Harga default Rp 75.000
        $defaultBio = 'Tutor berpengalaman siap membantu pembelajaran Anda.';
        
        $stmt = $conn->prepare("
            INSERT INTO tutors (name, university, subject, lecturer, rating, reviews, sessions_completed, price, avatar, bio) 
            VALUES (?, ?, ?, ?, 0.0, 0, 0, ?, ?, ?)
        ");
        $stmt->execute([
            $name,
            $university,
            $defaultSubject,
            $defaultLecturer,
            $defaultPrice,
            $avatar,
            $defaultBio
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Registrasi berhasil! Silakan login.'
    ]);
}

function logout() {
    session_destroy();
    echo json_encode([
        'success' => true,
        'message' => 'Logout berhasil'
    ]);
}

function checkAuth() {
    if (isset($_SESSION['user'])) {
        echo json_encode([
            'success' => true,
            'authenticated' => true,
            'user' => $_SESSION['user']
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'authenticated' => false
        ]);
    }
}

function quickLogin() {
    $data = json_decode(file_get_contents('php://input'), true);
    $type = $data['type'] ?? 'student';
    
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT * FROM users WHERE type = ? LIMIT 1");
    $stmt->execute([$type]);
    $user = $stmt->fetch();
    
    if ($user) {
        unset($user['password']);
        $_SESSION['user'] = $user;
        
        echo json_encode([
            'success' => true,
            'message' => 'Quick login berhasil',
            'user' => $user
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Demo user not found'
        ]);
    }
}
?>