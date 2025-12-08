-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Dec 09, 2025 at 12:24 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tutorhub`
--

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tutor_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tutor_id` int(11) NOT NULL,
  `date` datetime NOT NULL,
  `duration` decimal(3,1) NOT NULL,
  `method` enum('online','offline') NOT NULL,
  `status` enum('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `price` int(11) NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tutors`
--

CREATE TABLE `tutors` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `university` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `lecturer` varchar(255) NOT NULL,
  `rating` decimal(2,1) DEFAULT 0.0,
  `reviews` int(11) DEFAULT 0,
  `sessions_completed` int(11) DEFAULT 0,
  `price` int(11) NOT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tutors`
--

INSERT INTO `tutors` (`id`, `name`, `university`, `subject`, `lecturer`, `rating`, `reviews`, `sessions_completed`, `price`, `avatar`, `bio`, `created_at`, `updated_at`) VALUES
(1, 'Ahmad Rizki', 'Universitas Indonesia', 'Kalkulus I', 'Prof. Dr. Ir. Rina Melati, M.Kom', 4.8, 45, 120, 75000, 'https://ui-avatars.com/api/?name=Ahmad+Rizki&size=120&background=random', 'Lulusan Cum Laude IPK 3.95. Spesialisasi Algoritma dan Struktur Data. Telah membimbing 100+ mahasiswa dengan success rate tinggi.', '2025-12-07 19:58:08', '2025-12-07 19:58:08'),
(2, 'Siti Nurhaliza', 'ITB', 'Algoritma & Pemrograman', 'Dr. Bambang Subagyo, M.Sc', 4.9, 67, 185, 80000, 'https://ui-avatars.com/api/?name=Siti+Nurhaliza&size=120&background=random', 'Mahasiswa S2 dengan passion dalam mengajar. Metode pembelajaran interaktif dan mudah dipahami. Patient dan friendly.', '2025-12-07 19:58:08', '2025-12-07 19:58:08'),
(3, 'Budi Hartono', 'UGM', 'Basis Data', 'Dr. Citra Dewi, M.Math', 4.7, 34, 95, 70000, 'https://ui-avatars.com/api/?name=Budi+Hartono&size=120&background=random', 'Ex-Asisten Dosen dengan pengalaman 3 tahun. Detail oriented dan sabar membimbing dari basic hingga advanced level.', '2025-12-07 19:58:08', '2025-12-07 19:58:08'),
(4, 'Dewi Lestari', 'ITS', 'Struktur Data', 'Prof. Dewi Sartika, Ph.D', 4.6, 52, 140, 85000, 'https://ui-avatars.com/api/?name=Dewi+Lestari&size=120&background=random', 'Sangat passionate dalam mengajar. Success rate 95% mahasiswa mendapat nilai A/B. Flexible dengan jadwal.', '2025-12-07 19:58:08', '2025-12-07 19:58:08');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nim` varchar(50) NOT NULL,
  `university` varchar(255) NOT NULL,
  `type` enum('student','tutor','admin') DEFAULT 'student',
  `avatar` varchar(500) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `verified` tinyint(1) DEFAULT 0,
  `verification_status` enum('pending','approved','rejected') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `nim`, `university`, `type`, `avatar`, `bio`, `created_at`, `updated_at`, `verified`, `verification_status`) VALUES
(1, 'Budi Santoso', 'budi@ui.ac.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '1906123456', 'Universitas Indonesia', 'student', 'https://ui-avatars.com/api/?name=Budi+Santoso&size=150&background=4F46E5&color=fff', NULL, '2025-12-07 19:58:08', '2025-12-08 23:19:10', 1, 'approved'),
(2, 'Anisa Putri', 'anisa@ui.ac.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '1806123456', 'Universitas Indonesia', 'tutor', 'https://ui-avatars.com/api/?name=Anisa+Putri&size=150&background=10b981&color=fff', NULL, '2025-12-07 19:58:08', '2025-12-08 23:19:10', 1, 'approved'),
(9, 'Kevin Artya Christian', 'dinus@dinus.ac.id', '$2y$10$O.tVK3fIL/Sb58tu7mw04uwKjXTkoza0vuBtePesixzcsMfUn8ds.', 'A11.2024.15945', 'Universitas Dian Nuswantoro', 'tutor', 'https://ui-avatars.com/api/?name=Kevin+Artya+Christian&size=150&background=random', NULL, '2025-12-08 01:03:16', '2025-12-08 23:19:10', 1, 'approved'),
(10, 'Admin TutorHub', 'admin@tutorhub.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN001', 'TutorHub', 'admin', 'https://ui-avatars.com/api/?name=Admin&size=150&background=dc2626&color=fff', NULL, '2025-12-08 23:19:10', '2025-12-08 23:19:10', 1, 'approved');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `tutor_id` (`tutor_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sessions_user` (`user_id`),
  ADD KEY `idx_sessions_tutor` (`tutor_id`),
  ADD KEY `idx_sessions_date` (`date`),
  ADD KEY `idx_sessions_status` (`status`);

--
-- Indexes for table `tutors`
--
ALTER TABLE `tutors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tutors_subject` (`subject`),
  ADD KEY `idx_tutors_university` (`university`),
  ADD KEY `idx_tutors_rating` (`rating`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sessions`
--
ALTER TABLE `sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tutors`
--
ALTER TABLE `tutors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`tutor_id`) REFERENCES `tutors` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sessions_ibfk_2` FOREIGN KEY (`tutor_id`) REFERENCES `tutors` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
