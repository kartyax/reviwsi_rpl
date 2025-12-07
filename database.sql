-- Database TutorHub
CREATE DATABASE IF NOT EXISTS tutorhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tutorhub;

-- Table: users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nim VARCHAR(50) NOT NULL,
    university VARCHAR(255) NOT NULL,
    type ENUM('student', 'tutor') DEFAULT 'student',
    avatar VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: tutors
CREATE TABLE tutors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    university VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    lecturer VARCHAR(255) NOT NULL,
    rating DECIMAL(2,1) DEFAULT 0.0,
    reviews INT DEFAULT 0,
    sessions_completed INT DEFAULT 0,
    price INT NOT NULL,
    avatar VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: sessions
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tutor_id INT NOT NULL,
    date DATETIME NOT NULL,
    duration DECIMAL(3,1) NOT NULL,
    method ENUM('online', 'offline') NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    price INT NOT NULL,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE
);

-- Table: reviews
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    tutor_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE
);

-- Insert dummy tutors data
INSERT INTO tutors (name, university, subject, lecturer, rating, reviews, sessions_completed, price, avatar, bio) VALUES
('Ahmad Rizki', 'Universitas Indonesia', 'Kalkulus I', 'Prof. Dr. Ir. Rina Melati, M.Kom', 4.8, 45, 120, 75000, 'https://ui-avatars.com/api/?name=Ahmad+Rizki&size=120&background=random', 'Lulusan Cum Laude IPK 3.95. Spesialisasi Algoritma dan Struktur Data. Telah membimbing 100+ mahasiswa dengan success rate tinggi.'),
('Siti Nurhaliza', 'ITB', 'Algoritma & Pemrograman', 'Dr. Bambang Subagyo, M.Sc', 4.9, 67, 185, 80000, 'https://ui-avatars.com/api/?name=Siti+Nurhaliza&size=120&background=random', 'Mahasiswa S2 dengan passion dalam mengajar. Metode pembelajaran interaktif dan mudah dipahami. Patient dan friendly.'),
('Budi Hartono', 'UGM', 'Basis Data', 'Dr. Citra Dewi, M.Math', 4.7, 34, 95, 70000, 'https://ui-avatars.com/api/?name=Budi+Hartono&size=120&background=random', 'Ex-Asisten Dosen dengan pengalaman 3 tahun. Detail oriented dan sabar membimbing dari basic hingga advanced level.'),
('Dewi Lestari', 'ITS', 'Struktur Data', 'Prof. Dewi Sartika, Ph.D', 4.6, 52, 140, 85000, 'https://ui-avatars.com/api/?name=Dewi+Lestari&size=120&background=random', 'Sangat passionate dalam mengajar. Success rate 95% mahasiswa mendapat nilai A/B. Flexible dengan jadwal.');

-- Insert demo users
INSERT INTO users (name, email, password, nim, university, type, avatar, bio) VALUES
('Budi Santoso', 'budi@ui.ac.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '1906123456', 'Universitas Indonesia', 'student', 'https://ui-avatars.com/api/?name=Budi+Santoso&size=150&background=4F46E5&color=fff', NULL),
('Anisa Putri', 'anisa@ui.ac.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '1806123456', 'Universitas Indonesia', 'tutor', 'https://ui-avatars.com/api/?name=Anisa+Putri&size=150&background=10b981&color=fff', 'Tutor berpengalaman di bidang Pemrograman Web');

-- Link tutor user to tutors table
UPDATE tutors SET name = 'Anisa Putri' WHERE id = 1;

-- Create indexes for better performance
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_tutor ON sessions(tutor_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_tutors_subject ON tutors(subject);
CREATE INDEX idx_tutors_university ON tutors(university);
CREATE INDEX idx_tutors_rating ON tutors(rating);