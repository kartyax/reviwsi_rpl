let currentUser = null;
let sessions = [];
let stats = null;

const API_URL = 'api/';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Tutor Dashboard initialized...');
    
    // Check authentication
    checkAuth();
    
    // Update time
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000); // Update every minute
});

// ===================================================
// API FUNCTIONS
// ===================================================
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(API_URL + endpoint, {
            ...options,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error occurred' };
    }
}

async function checkAuth() {
    const result = await apiRequest('auth.php?action=check');
    if (result.success && result.authenticated) {
        if (result.user.type !== 'tutor') {
            // Redirect to student page if not tutor
            window.location.href = 'student.html';
            return;
        }
        
        currentUser = result.user;
        updateUserInfo();
        loadDashboardData();
        document.getElementById('demo-badge').style.display = 'block';
    } else {
        // Not logged in, redirect to index
        window.location.href = 'index.html';
    }
}

function updateUserInfo() {
    document.getElementById('sidebar-name').textContent = currentUser.name;
    document.getElementById('sidebar-avatar').src = currentUser.avatar;
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-university').textContent = currentUser.university;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-nim').textContent = currentUser.nim;
    document.getElementById('profile-avatar').src = currentUser.avatar;
    document.getElementById('profile-bio').textContent = currentUser.bio || 'Belum ada bio';
}

// ===================================================
// LOAD DATA
// ===================================================
async function loadDashboardData() {
    await loadStats();
    await loadSessions();
    renderDashboard();
}

async function loadStats() {
    const result = await apiRequest('tutor_sessions.php?action=stats');
    if (result.success) {
        stats = result.stats;
        updateStatsDisplay();
    }
}

async function loadSessions() {
    const result = await apiRequest('tutor_sessions.php?action=list');
    if (result.success) {
        sessions = result.sessions.map(s => ({
            ...s,
            date: new Date(s.date)
        }));
    }
}

function updateStatsDisplay() {
    if (!stats) return;
    
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-completed').textContent = stats.completed;
    document.getElementById('stat-earnings').textContent = 'Rp ' + stats.earnings.toLocaleString('id-ID');
    document.getElementById('pending-badge').textContent = stats.pending;
    document.getElementById('tutor-rating').textContent = stats.rating;
    document.getElementById('tutor-reviews').textContent = stats.reviews;
    document.getElementById('total-earnings-display').textContent = 'Rp ' + stats.earnings.toLocaleString('id-ID');
    
    // Profile stats
    document.getElementById('profile-stat-total').textContent = stats.total;
    document.getElementById('profile-stat-completed').textContent = stats.completed;
    document.getElementById('profile-stat-pending').textContent = stats.pending;
}

// ===================================================
// NAVIGATION
// ===================================================
function showDashboard() {
    hideAllViews();
    document.getElementById('dashboard-view').style.display = 'block';
    updatePageTitle('Dashboard', 'Kelola sesi mengajar Anda');
    setActiveNav(0);
    renderDashboard();
}

function showBookingRequests() {
    hideAllViews();
    document.getElementById('booking-requests-view').style.display = 'block';
    updatePageTitle('Booking Request', 'Konfirmasi atau tolak booking dari mahasiswa');
    setActiveNav(1);
    renderBookingRequests();
}

function showSchedule() {
    hideAllViews();
    document.getElementById('schedule-view').style.display = 'block';
    updatePageTitle('Jadwal Mengajar', 'Lihat jadwal sesi yang sudah terkonfirmasi');
    setActiveNav(2);
    renderSchedule();
}

function showEarnings() {
    hideAllViews();
    document.getElementById('earnings-view').style.display = 'block';
    updatePageTitle('Pendapatan', 'Riwayat pendapatan dari sesi mengajar');
    setActiveNav(3);
    renderEarnings();
}

function showProfile() {
    hideAllViews();
    document.getElementById('profile-view').style.display = 'block';
    updatePageTitle('Profil', 'Kelola profil dan informasi tutor Anda');
    setActiveNav(4);
}

function hideAllViews() {
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('booking-requests-view').style.display = 'none';
    document.getElementById('schedule-view').style.display = 'none';
    document.getElementById('earnings-view').style.display = 'none';
    document.getElementById('profile-view').style.display = 'none';
}

function updatePageTitle(title, subtitle) {
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = subtitle;
}

function setActiveNav(index) {
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach((link, i) => {
        if (i === index) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ===================================================
// RENDER FUNCTIONS
// ===================================================
function renderDashboard() {
    renderRecentActivities();
}

function renderRecentActivities() {
    const container = document.getElementById('recent-activities');
    const recentSessions = sessions.slice(0, 5);
    
    if (recentSessions.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">Belum ada aktivitas</p>';
        return;
    }
    
    container.innerHTML = recentSessions.map(session => {
        const dateStr = session.date.toLocaleDateString('id-ID', { 
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const timeStr = session.date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const statusColor = {
            'pending': 'warning',
            'confirmed': 'success',
            'completed': 'info',
            'cancelled': 'danger'
        };
        
        const statusText = {
            'pending': 'Menunggu Konfirmasi',
            'confirmed': 'Terkonfirmasi',
            'completed': 'Selesai',
            'cancelled': 'Dibatalkan'
        };
        
        return `
            <div class="d-flex align-items-center border-bottom pb-3 mb-3">
                <img src="${session.student.avatar}" class="rounded-circle me-3" width="50" height="50" alt="${session.student.name}">
                <div class="flex-grow-1">
                    <div class="fw-bold">${session.student.name}</div>
                    <small class="text-muted">${session.subject} • ${dateStr} ${timeStr}</small>
                </div>
                <span class="badge bg-${statusColor[session.status]}">${statusText[session.status]}</span>
            </div>
        `;
    }).join('');
}

function renderBookingRequests() {
    const container = document.getElementById('booking-requests-list');
    const pending = sessions.filter(s => s.status === 'pending');
    
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-inbox fa-4x text-muted mb-3"></i>
                <p class="text-muted">Tidak ada booking request baru</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pending.map(session => createBookingRequestCard(session)).join('');
}

function createBookingRequestCard(session) {
    const dateStr = session.date.toLocaleDateString('id-ID', { 
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const timeStr = session.date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="card booking-card pending mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center">
                        <img src="${session.student.avatar}" class="rounded-circle me-3" width="60" height="60" alt="${session.student.name}">
                        <div>
                            <h5 class="mb-1">${session.student.name}</h5>
                            <small class="text-muted">${session.student.university} • NIM: ${session.student.nim}</small><br>
                            <small class="text-muted"><i class="fas fa-envelope"></i> ${session.student.email}</small>
                        </div>
                    </div>
                    <span class="status-badge status-pending">
                        <i class="fas fa-clock"></i> Pending
                    </span>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p class="mb-2"><i class="fas fa-book text-primary"></i> <strong>${session.subject}</strong></p>
                        <p class="mb-2"><i class="fas fa-calendar text-primary"></i> ${dateStr}</p>
                        <p class="mb-2"><i class="fas fa-clock text-primary"></i> ${timeStr} (${session.duration} jam)</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-2"><i class="fas fa-${session.method === 'online' ? 'video' : 'map-marker-alt'} text-primary"></i> ${session.method === 'online' ? 'Online' : 'Offline'}</p>
                        <p class="mb-2"><i class="fas fa-money-bill-wave text-success"></i> Rp ${session.price.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                ${session.notes ? `<div class="alert alert-light mb-3"><i class="fas fa-sticky-note"></i> <strong>Catatan:</strong> ${session.notes}</div>` : ''}
                <div class="d-flex gap-2">
                    <button class="btn btn-success flex-fill" onclick="confirmBooking(${session.id})">
                        <i class="fas fa-check"></i> Konfirmasi
                    </button>
                    <button class="btn btn-danger flex-fill" onclick="rejectBooking(${session.id})">
                        <i class="fas fa-times"></i> Tolak
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderSchedule() {
    const container = document.getElementById('schedule-list');
    const confirmed = sessions.filter(s => s.status === 'confirmed').sort((a, b) => a.date - b.date);
    
    if (confirmed.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-calendar-times fa-4x text-muted mb-3"></i>
                <p class="text-muted">Belum ada jadwal terkonfirmasi</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = confirmed.map(session => createScheduleCard(session)).join('');
}

function createScheduleCard(session) {
    const dateStr = session.date.toLocaleDateString('id-ID', { 
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const timeStr = session.date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="card booking-card confirmed mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center">
                        <img src="${session.student.avatar}" class="rounded-circle me-3" width="50" height="50" alt="${session.student.name}">
                        <div>
                            <h6 class="mb-1">${session.student.name}</h6>
                            <small class="text-muted">${session.student.email}</small>
                        </div>
                    </div>
                    <span class="status-badge status-confirmed">
                        <i class="fas fa-check-circle"></i> Confirmed
                    </span>
                </div>
                <div class="row">
                    <div class="col-md-8">
                        <p class="mb-2"><i class="fas fa-book text-primary"></i> ${session.subject}</p>
                        <p class="mb-2"><i class="fas fa-calendar text-primary"></i> ${dateStr}</p>
                        <p class="mb-2"><i class="fas fa-clock text-primary"></i> ${timeStr} (${session.duration} jam)</p>
                        <p class="mb-2"><i class="fas fa-${session.method === 'online' ? 'video' : 'map-marker-alt'} text-primary"></i> ${session.method === 'online' ? 'Online' : 'Offline'}</p>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-primary btn-sm w-100" onclick="completeSession(${session.id})">
                            <i class="fas fa-check-circle"></i> Tandai Selesai
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderEarnings() {
    const container = document.getElementById('earnings-history');
    const completed = sessions.filter(s => s.status === 'completed' || s.status === 'confirmed');
    
    if (completed.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-wallet fa-4x text-muted mb-3"></i>
                <p class="text-muted">Belum ada riwayat pendapatan</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Mahasiswa</th>
                        <th>Mata Kuliah</th>
                        <th>Durasi</th>
                        <th>Status</th>
                        <th class="text-end">Pendapatan</th>
                    </tr>
                </thead>
                <tbody>
                    ${completed.map(session => {
                        const dateStr = session.date.toLocaleDateString('id-ID', { 
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        });
                        
                        return `
                            <tr>
                                <td>${dateStr}</td>
                                <td>${session.student.name}</td>
                                <td>${session.subject}</td>
                                <td>${session.duration} jam</td>
                                <td><span class="badge bg-${session.status === 'completed' ? 'success' : 'primary'}">${session.status === 'completed' ? 'Selesai' : 'Terkonfirmasi'}</span></td>
                                <td class="text-end fw-bold text-success">Rp ${session.price.toLocaleString('id-ID')}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===================================================
// ACTIONS
// ===================================================
async function confirmBooking(sessionId) {
    if (confirm('Konfirmasi booking ini?')) {
        const result = await apiRequest('tutor_sessions.php?action=confirm', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
        
        if (result.success) {
            showNotification('Booking berhasil dikonfirmasi! ✅', 'success');
            await refreshData();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

async function rejectBooking(sessionId) {
    if (confirm('Tolak booking ini?')) {
        const result = await apiRequest('tutor_sessions.php?action=reject', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
        
        if (result.success) {
            showNotification('Booking ditolak', 'warning');
            await refreshData();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

async function completeSession(sessionId) {
    if (confirm('Tandai sesi ini sebagai selesai?')) {
        const result = await apiRequest('tutor_sessions.php?action=complete', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
        
        if (result.success) {
            showNotification('Sesi berhasil diselesaikan! 🎉', 'success');
            await refreshData();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

async function refreshData() {
    showNotification('Memuat ulang data...', 'info');
    await loadDashboardData();
    
    // Re-render current view
    const activeNav = document.querySelector('.sidebar .nav-link.active');
    if (activeNav) {
        activeNav.click();
    }
}

async function logout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        const result = await apiRequest('auth.php?action=logout', { method: 'POST' });
        
        if (result.success) {
            window.location.href = 'index.html';
        }
    }
}

function editProfile() {
    showNotification('Fitur edit profil akan segera hadir! 🔧', 'info');
}

// ===================================================
// UTILITY FUNCTIONS
// ===================================================
function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleString('id-ID', { 
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = timeStr;
    }
}

function showNotification(message, type = 'info') {
    const bgColors = {
        'success': '#10b981',
        'error': '#ef4444',
        'info': '#3b82f6',
        'warning': '#f59e0b'
    };
    
    const icons = {
        'success': '✓',
        'error': '✕',
        'info': 'ℹ',
        'warning': '⚠'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColors[type]};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.innerHTML = `<strong>${icons[type]}</strong> ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

console.log('%c🎓 TutorHub - Tutor Dashboard', 'font-size: 20px; font-weight: bold; color: #667eea');
console.log('%cDashboard Mode Active', 'color: #10b981');