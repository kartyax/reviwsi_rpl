let currentUser = null;
let tutors = [];
let sessions = [];
let selectedTutor = null;

// API Base URL
const API_URL = 'api/';

document.addEventListener('DOMContentLoaded', function() {
    console.log('TutorHub initialized (Dynamic Mode with PHP Backend)...');
    
    // Check authentication
    checkAuth();
    
    // Form handlers
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('bookingForm').addEventListener('submit', handleBooking);
    document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
    
    // Price slider
    const priceSlider = document.getElementById('filter-price');
    if (priceSlider) {
        priceSlider.addEventListener('input', function() {
            document.getElementById('price-display').textContent = 
                parseInt(this.value).toLocaleString('id-ID');
        });
    }
    
    // Set minimum datetime for booking
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const dateInput = document.querySelector('input[type="datetime-local"]');
    if (dateInput) {
        dateInput.min = now.toISOString().slice(0, 16);
    }
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
        currentUser = result.user;
        updateUIAfterLogin();
        document.getElementById('demo-badge').style.display = 'block';
        loadTutors();
    } else {
        loadTutors();
    }
}

async function loadTutors(sortBy = 'rating') {
    const result = await apiRequest(`tutors.php?action=list&sort=${sortBy}`);
    if (result.success) {
        tutors = result.tutors;
        renderTutorList();
    }
}

async function loadSessions() {
    if (!currentUser) return;
    
    if (currentUser.type === 'tutor') {
        // Load tutor sessions (booking requests from students)
        const result = await apiRequest('tutor_sessions.php?action=list');
        if (result.success) {
            sessions = result.sessions.map(s => ({
                ...s,
                date: new Date(s.date)
            }));
            renderTutorSessions();
        }
    } else {
        // Load student sessions
        const result = await apiRequest('sessions.php?action=list');
        if (result.success) {
            sessions = result.sessions.map(s => ({
                ...s,
                date: new Date(s.date)
            }));
            renderSessions();
        }
    }
}

async function loadProfileStats() {
    if (!currentUser) return;
    
    if (currentUser.type === 'tutor') {
        // Load tutor stats
        const result = await apiRequest('tutor_sessions.php?action=stats');
        if (result.success) {
            document.getElementById('stats-sessions').textContent = result.stats.total;
            document.getElementById('stats-completed').textContent = result.stats.completed;
            document.getElementById('stats-pending').textContent = result.stats.pending;
            
            // Add earnings info for tutor
            const statsContainer = document.querySelector('.card-body .row.text-center');
            if (statsContainer && !document.getElementById('stats-earnings')) {
                const earningsCol = document.createElement('div');
                earningsCol.className = 'col-md-4';
                earningsCol.innerHTML = `
                    <h3 class="text-success" id="stats-earnings">Rp ${result.stats.earnings.toLocaleString('id-ID')}</h3>
                    <p class="text-muted">Total Pendapatan</p>
                `;
                statsContainer.appendChild(earningsCol);
            } else if (document.getElementById('stats-earnings')) {
                document.getElementById('stats-earnings').textContent = 'Rp ' + result.stats.earnings.toLocaleString('id-ID');
            }
        }
    } else {
        // Load student stats
        const result = await apiRequest('profile.php?action=stats');
        if (result.success) {
            document.getElementById('stats-sessions').textContent = result.stats.total;
            document.getElementById('stats-completed').textContent = result.stats.completed;
            document.getElementById('stats-pending').textContent = result.stats.pending;
        }
    }
}

// ===================================================
// PAGE NAVIGATION
// ===================================================
function showPage(pageName) {
    // Redirect based on user type if accessing landing
    if (pageName === 'landing' && currentUser) {
        if (currentUser.type === 'tutor') {
            pageName = 'sessions'; // Tutor ke jadwal mengajar
        } else {
            pageName = 'search'; // Student ke cari tutor
        }
    }
    
    // Fade out current page
    const currentPage = document.querySelector('.page-content.active');
    if (currentPage) {
        currentPage.style.opacity = '0';
    }
    
    setTimeout(() => {
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        
        const newPage = document.getElementById(pageName + '-page');
        newPage.classList.add('active');
        
        // Fade in new page
        setTimeout(() => {
            newPage.style.opacity = '1';
        }, 50);
        
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Refresh data on page load
        if (pageName === 'sessions' && currentUser) {
            loadSessions();
        } else if (pageName === 'profile' && currentUser) {
            loadProfileStats();
            loadSessions(); // For profile sessions display
        } else if (pageName === 'search') {
            loadTutors();
        }
    }, 300);
}

// ===================================================
// QUICK LOGIN (FOR DEMO)
// ===================================================
async function quickLogin(type) {
    const result = await apiRequest('auth.php?action=quick_login', {
        method: 'POST',
        body: JSON.stringify({ type })
    });
    
    if (result.success) {
        currentUser = result.user;
        updateUIAfterLogin();
        closeModal('loginModal');
        showPage('search');
        showNotification(`Login sebagai ${type} berhasil!`, 'success');
        document.getElementById('demo-badge').style.display = 'block';
        loadTutors();
    } else {
        showNotification(result.message, 'error');
    }
}

// ===================================================
// LOGIN HANDLER
// ===================================================
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const email = formData.get('email');
    const password = formData.get('password');
    
    if (!email.endsWith('.ac.id')) {
        showNotification('Email harus menggunakan domain universitas (.ac.id)', 'error');
        return;
    }
    
    const result = await apiRequest('auth.php?action=login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    if (result.success) {
        currentUser = result.user;
        updateUIAfterLogin();
        closeModal('loginModal');
        showPage('search');
        showNotification('Login berhasil! Selamat datang, ' + currentUser.name + ' ', 'success');
        document.getElementById('demo-badge').style.display = 'block';
        loadTutors();
    } else {
        showNotification(result.message, 'error');
    }
}

// ===================================================
// REGISTER HANDLER
// ===================================================
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        nim: formData.get('nim'),
        university: formData.get('university'),
        password: formData.get('password'),
        password_confirm: formData.get('password_confirm'),
        role: formData.get('role')
    };
    
    if (!data.email.endsWith('.ac.id')) {
        showNotification('Email harus menggunakan domain universitas (.ac.id)', 'error');
        return;
    }
    
    if (data.password !== data.password_confirm) {
        showNotification('Password tidak cocok', 'error');
        return;
    }
    
    if (data.password.length < 8) {
        showNotification('Password minimal 8 karakter', 'error');
        return;
    }
    
    if (!data.role) {
        showNotification('Silakan pilih tipe akun', 'error');
        return;
    }
    
    const result = await apiRequest('auth.php?action=register', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    if (result.success) {
        showNotification('Registrasi berhasil! Silakan login. ✅', 'success');
        closeModal('registerModal');
        
        setTimeout(() => {
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        }, 500);
    } else {
        showNotification(result.message, 'error');
    }
}

// ===================================================
// UPDATE UI AFTER LOGIN
// ===================================================
function updateUIAfterLogin() {
    document.getElementById('nav-login').style.display = 'none';
    document.getElementById('nav-logout').style.display = 'block';
    document.getElementById('nav-profile').style.display = 'block';
    
    // Hide Beranda menu when logged in (optional)
    const homeNav = document.getElementById('nav-home');
    if (homeNav) {
        homeNav.style.display = 'none';
    }
    
    // Show different menu based on user type
    if (currentUser.type === 'tutor') {
        // Tutor menu
        document.getElementById('nav-search').style.display = 'none';
        document.getElementById('nav-sessions').style.display = 'block';
        
        // Update session label for tutor
        const sessionsLink = document.querySelector('#nav-sessions .nav-link');
        if (sessionsLink) {
            sessionsLink.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Jadwal Mengajar';
        }
    } else {
        // Student menu
        document.getElementById('nav-search').style.display = 'block';
        document.getElementById('nav-sessions').style.display = 'block';
        
        // Update session label for student
        const sessionsLink = document.querySelector('#nav-sessions .nav-link');
        if (sessionsLink) {
            sessionsLink.innerHTML = 'Sesi Saya';
        }
    }
    
    // Update profile page
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-university').textContent = currentUser.university;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-nim').textContent = currentUser.nim;
    document.getElementById('profile-avatar').src = currentUser.avatar;
    
    // Update edit form
    document.getElementById('edit-name').value = currentUser.name;
    document.getElementById('edit-email').value = currentUser.email;
    document.getElementById('edit-university').value = currentUser.university;
    document.getElementById('edit-nim').value = currentUser.nim;
    
    // Add user type badge
    updateUserTypeBadge();
}


// ===================================================
// LOGOUT
// ===================================================
async function logout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        const result = await apiRequest('auth.php?action=logout', { method: 'POST' });
        
        if (result.success) {
            currentUser = null;
            
            document.getElementById('nav-login').style.display = 'block';
            document.getElementById('nav-logout').style.display = 'none';
            document.getElementById('nav-search').style.display = 'none';
            document.getElementById('nav-sessions').style.display = 'none';
            document.getElementById('nav-profile').style.display = 'none';
            document.getElementById('demo-badge').style.display = 'none';
            
            // Show Beranda menu again
            const homeNav = document.getElementById('nav-home');
            if (homeNav) {
                homeNav.style.display = 'block';
            }
            
            showPage('landing');
            showNotification('Logout berhasil', 'success');
        }
    }
}

// ===================================================
// RENDER TUTOR LIST
// ===================================================
function renderTutorList(filteredTutors = null) {
    const container = document.getElementById('tutor-list');
    if (!container) return;
    
    const tutorsToRender = filteredTutors || tutors;
    container.innerHTML = '';
    
    if (tutorsToRender.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info text-center"><i class="fas fa-info-circle"></i> Tidak ada tutor ditemukan dengan filter tersebut</div></div>';
        document.getElementById('tutor-count').textContent = '0';
        return;
    }
    
    document.getElementById('tutor-count').textContent = tutorsToRender.length;
    
    tutorsToRender.forEach(tutor => {
        const card = `
            <div class="col-md-6 col-lg-4">
                <div class="tutor-card bg-white">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <img src="${tutor.avatar}" class="tutor-avatar me-3" alt="${tutor.name}" loading="lazy">
                            <div>
                                <h5 class="mb-1">${tutor.name}</h5>
                                <small class="text-muted">${tutor.university}</small>
                            </div>
                        </div>
                        <div class="mb-2">
                            <span class="badge bg-primary">${tutor.subject}</span>
                        </div>
                        <p class="text-muted small mb-2">
                            <i class="fas fa-chalkboard-teacher"></i> ${tutor.lecturer}
                        </p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="rating-stars">
                                <i class="fas fa-star"></i> ${tutor.rating} (${tutor.reviews})
                            </div>
                            <small class="text-muted">${tutor.sessions} sesi</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <strong class="text-primary">Rp ${tutor.price.toLocaleString('id-ID')}</strong>
                            <button class="btn btn-sm btn-primary" onclick="viewTutorDetail(${tutor.id})">
                                Lihat Profil
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// ===================================================
// VIEW TUTOR DETAIL
// ===================================================
function viewTutorDetail(tutorId) {
    const tutor = tutors.find(t => t.id === tutorId);
    if (!tutor) return;
    
    selectedTutor = tutor;
    
    document.getElementById('detail-avatar').src = tutor.avatar;
    document.getElementById('detail-name').textContent = tutor.name;
    document.getElementById('detail-university').textContent = tutor.university;
    document.getElementById('detail-rating').textContent = tutor.rating;
    document.getElementById('detail-reviews').textContent = tutor.reviews;
    document.getElementById('detail-sessions').textContent = tutor.sessions;
    document.getElementById('detail-subject').textContent = tutor.subject;
    document.getElementById('detail-lecturer').textContent = tutor.lecturer;
    document.getElementById('detail-price').textContent = 'Rp ' + tutor.price.toLocaleString('id-ID') + '/sesi';
    document.getElementById('detail-bio').textContent = tutor.bio;
    
    const modal = new bootstrap.Modal(document.getElementById('tutorDetailModal'));
    modal.show();
}

// ===================================================
// BOOK SESSION
// ===================================================
function bookSession() {
    if (!currentUser) {
        showNotification('Silakan login terlebih dahulu untuk booking sesi', 'error');
        closeModal('tutorDetailModal');
        setTimeout(() => {
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        }, 300);
        return;
    }
    
    if (!selectedTutor) return;
    
    document.getElementById('booking-tutor-id').value = selectedTutor.id;
    document.getElementById('booking-tutor-name').value = selectedTutor.name;
    document.getElementById('booking-subject').value = selectedTutor.subject;
    document.getElementById('booking-total').textContent = selectedTutor.price.toLocaleString('id-ID');
    
    closeModal('tutorDetailModal');
    setTimeout(() => {
        const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
        bookingModal.show();
    }, 300);
}

function updateBookingTotal() {
    if (!selectedTutor) return;
    const duration = parseFloat(document.getElementById('booking-duration').value);
    const total = selectedTutor.price * duration;
    document.getElementById('booking-total').textContent = total.toLocaleString('id-ID');
}

// ===================================================
// HANDLE BOOKING
// ===================================================
async function handleBooking(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const tutorId = document.getElementById('booking-tutor-id').value;
    const startTime = formData.get('start_time');
    const duration = parseFloat(formData.get('duration'));
    const method = formData.get('method');
    const notes = formData.get('notes');
    const paymentMethod = formData.get('payment_method');
    
    const bookingDate = new Date(startTime);
    if (bookingDate < new Date()) {
        showNotification('Tanggal booking harus di masa depan', 'error');
        return;
    }
    
    const result = await apiRequest('sessions.php?action=create', {
        method: 'POST',
        body: JSON.stringify({
            tutor_id: tutorId,
            start_time: startTime,
            duration,
            method,
            notes,
            payment_method: paymentMethod
        })
    });
    
    if (result.success) {
        closeModal('bookingModal');
        showNotification('Booking berhasil! Menunggu konfirmasi tutor. 🎉', 'success');
        
        setTimeout(() => {
            showPage('sessions');
        }, 1000);
    } else {
        showNotification(result.message, 'error');
    }
}

// ===================================================
// RENDER SESSIONS
// ===================================================
function renderSessions() {
    if (!currentUser) return;
    
    const now = new Date();
    const upcoming = sessions.filter(s => 
        (s.status === 'pending' || s.status === 'confirmed') && s.date >= now
    );
    const history = sessions.filter(s => 
        s.status === 'completed' || s.status === 'cancelled' || s.date < now
    );
    
    const upcomingContainer = document.getElementById('upcoming-sessions');
    if (upcoming.length === 0) {
        upcomingContainer.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle"></i> Belum ada sesi mendatang. Yuk book sesi pertamamu!</div>';
    } else {
        upcomingContainer.innerHTML = upcoming.map(session => createSessionCard(session)).join('');
    }
    
    const historyContainer = document.getElementById('history-sessions');
    if (history.length === 0) {
        historyContainer.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle"></i> Belum ada riwayat sesi</div>';
    } else {
        historyContainer.innerHTML = history.map(session => createSessionCard(session)).join('');
    }
    
    // Update profile sessions if on profile page
    const profileSessions = document.getElementById('profile-sessions');
    if (profileSessions && sessions.length > 0) {
        const latestSessions = sessions.slice(-5).reverse();
        profileSessions.innerHTML = latestSessions.map(session => createSessionCard(session)).join('');
    }
}

function renderTutorSessions() {
    if (!currentUser || currentUser.type !== 'tutor') return;
    
    const now = new Date();
    const pending = sessions.filter(s => s.status === 'pending');
    const upcoming = sessions.filter(s => 
        s.status === 'confirmed' && s.date >= now
    );
    const history = sessions.filter(s => 
        s.status === 'completed' || s.status === 'cancelled' || (s.status === 'confirmed' && s.date < now)
    );
    
    const upcomingContainer = document.getElementById('upcoming-sessions');
    const pendingHtml = pending.length > 0 ? `
        <div class="alert alert-warning">
            <h5><i class="fas fa-clock"></i> Permintaan Booking Baru (${pending.length})</h5>
            <p class="mb-0">Anda memiliki ${pending.length} permintaan booking yang menunggu konfirmasi</p>
        </div>
        ${pending.map(session => createTutorSessionCard(session)).join('')}
    ` : '';
    
    const upcomingHtml = upcoming.length > 0 ? `
        <h5 class="mt-4 mb-3">Jadwal Terkonfirmasi</h5>
        ${upcoming.map(session => createTutorSessionCard(session)).join('')}
    ` : '<div class="alert alert-info mt-3"><i class="fas fa-info-circle"></i> Belum ada jadwal mengajar terkonfirmasi</div>';
    
    upcomingContainer.innerHTML = pendingHtml + upcomingHtml;
    
    const historyContainer = document.getElementById('history-sessions');
    if (history.length === 0) {
        historyContainer.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle"></i> Belum ada riwayat mengajar</div>';
    } else {
        historyContainer.innerHTML = history.map(session => createTutorSessionCard(session)).join('');
    }
    
    // Update profile sessions
    const profileSessions = document.getElementById('profile-sessions');
    if (profileSessions && sessions.length > 0) {
        const latestSessions = sessions.slice(-5).reverse();
        profileSessions.innerHTML = latestSessions.map(session => createTutorSessionCard(session)).join('');
    }
}

function createSessionCard(session) {
    const statusClass = `status-${session.status}`;
    const statusText = {
        'pending': 'Menunggu Konfirmasi',
        'confirmed': 'Terkonfirmasi',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan'
    };
    
    const dateStr = session.date.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    const timeStr = session.date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="card session-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center flex-grow-1">
                        <img src="${session.tutor.avatar}" class="rounded-circle me-3" width="50" height="50" alt="${session.tutor.name}">
                        <div>
                            <h5 class="mb-1">${session.tutor.name}</h5>
                            <small class="text-muted">${session.tutor.subject}</small>
                        </div>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText[session.status]}</span>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <p class="mb-2"><i class="fas fa-calendar text-primary"></i> ${dateStr}</p>
                        <p class="mb-2"><i class="fas fa-clock text-primary"></i> ${timeStr} (${session.duration} jam)</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-2"><i class="fas fa-${session.method === 'online' ? 'video' : 'map-marker-alt'} text-primary"></i> ${session.method === 'online' ? 'Online' : 'Offline'}</p>
                        <p class="mb-2"><i class="fas fa-money-bill-wave text-success"></i> Rp ${session.price.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                ${session.notes ? `<p class="text-muted small mt-2 mb-0"><i class="fas fa-sticky-note"></i> ${session.notes}</p>` : ''}
                <div class="mt-3 d-flex gap-2">
                    ${session.status === 'pending' ? 
                        `<button class="btn btn-sm btn-danger" onclick="cancelSession(${session.id})">
                            <i class="fas fa-times"></i> Batalkan
                        </button>` : ''}
                    ${session.status === 'completed' ? 
                        `<button class="btn btn-sm btn-primary" onclick="writeReview(${session.id})">
                            <i class="fas fa-star"></i> Tulis Review
                        </button>` : ''}
                    ${session.status === 'confirmed' ? 
                        `<button class="btn btn-sm btn-success" onclick="viewSessionDetail(${session.id})">
                            <i class="fas fa-info-circle"></i> Detail
                        </button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function createTutorSessionCard(session) {
    const statusClass = `status-${session.status}`;
    const statusText = {
        'pending': 'Menunggu Konfirmasi',
        'confirmed': 'Terkonfirmasi',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan'
    };
    
    const dateStr = session.date.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    const timeStr = session.date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="card session-card ${session.status === 'pending' ? 'border-warning' : ''}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center flex-grow-1">
                        <img src="${session.student.avatar}" class="rounded-circle me-3" width="50" height="50" alt="${session.student.name}">
                        <div>
                            <h5 class="mb-1">${session.student.name}</h5>
                            <small class="text-muted">${session.student.university} - ${session.student.nim}</small>
                        </div>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText[session.status]}</span>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <p class="mb-2"><i class="fas fa-book text-primary"></i> ${session.subject}</p>
                        <p class="mb-2"><i class="fas fa-calendar text-primary"></i> ${dateStr}</p>
                        <p class="mb-2"><i class="fas fa-clock text-primary"></i> ${timeStr} (${session.duration} jam)</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-2"><i class="fas fa-${session.method === 'online' ? 'video' : 'map-marker-alt'} text-primary"></i> ${session.method === 'online' ? 'Online' : 'Offline'}</p>
                        <p class="mb-2"><i class="fas fa-money-bill-wave text-success"></i> Rp ${session.price.toLocaleString('id-ID')}</p>
                        <p class="mb-2"><i class="fas fa-envelope text-primary"></i> ${session.student.email}</p>
                    </div>
                </div>
                ${session.notes ? `<p class="text-muted small mt-2 mb-0"><i class="fas fa-sticky-note"></i> ${session.notes}</p>` : ''}
                <div class="mt-3 d-flex gap-2">
                    ${session.status === 'pending' ? 
                        `<button class="btn btn-sm btn-success" onclick="confirmTutorSession(${session.id})">
                            <i class="fas fa-check"></i> Konfirmasi
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectTutorSession(${session.id})">
                            <i class="fas fa-times"></i> Tolak
                        </button>` : ''}
                    ${session.status === 'confirmed' ? 
                        `<button class="btn btn-sm btn-primary" onclick="completeTutorSession(${session.id})">
                            <i class="fas fa-check-circle"></i> Tandai Selesai
                        </button>` : ''}
                </div>
            </div>
        </div>
    `;
}

// ===================================================
// FILTER & SORT FUNCTIONS
// ===================================================
async function applyFilters() {
    const subject = document.getElementById('filter-subject').value;
    const university = document.getElementById('filter-university').value;
    const rating = document.getElementById('filter-rating').value;
    const price = parseInt(document.getElementById('filter-price').value);
    
    const result = await apiRequest('tutors.php?action=filter', {
        method: 'POST',
        body: JSON.stringify({ subject, university, rating, price })
    });
    
    if (result.success) {
        tutors = result.tutors;
        renderTutorList();
        showNotification(`Ditemukan ${result.count} tutor sesuai filter 🔍`, 'success');
    }
}

function resetFilters() {
    document.getElementById('filter-subject').value = '';
    document.getElementById('filter-university').value = '';
    document.getElementById('filter-rating').value = '';
    document.getElementById('filter-price').value = '500000';
    document.getElementById('price-display').textContent = '500.000';
    loadTutors();
    showNotification('Filter direset', 'info');
}

async function sortTutors() {
    const sortBy = document.getElementById('sort-select').value;
    await loadTutors(sortBy);
}

// ===================================================
// USER PROFILE FUNCTIONS
// ===================================================
async function handleEditProfile(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const result = await apiRequest('profile.php?action=update', {
        method: 'POST',
        body: JSON.stringify({
            name: formData.get('name'),
            university: formData.get('university'),
            nim: formData.get('nim')
        })
    });
    
    if (result.success) {
        currentUser = result.user;
        updateUIAfterLogin();
        closeModal('editProfileModal');
        showNotification('Profil berhasil diperbarui ✅', 'success');
    } else {
        showNotification(result.message, 'error');
    }
}

function updateProfileStats() {
    loadProfileStats();
}

// ===================================================
// SESSION ACTIONS
// ===================================================
async function cancelSession(sessionId) {
    if (confirm('Apakah Anda yakin ingin membatalkan sesi ini?')) {
        const result = await apiRequest('sessions.php?action=cancel', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
        
        if (result.success) {
            await loadSessions();
            showNotification('Sesi berhasil dibatalkan', 'warning');
        } else {
            showNotification(result.message, 'error');
        }
    }
}

async function confirmTutorSession(sessionId) {
    if (confirm('Konfirmasi sesi ini?')) {
        const result = await apiRequest('tutor_sessions.php?action=confirm', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
        
        if (result.success) {
            await loadSessions();
            showNotification('Sesi berhasil dikonfirmasi! ✅', 'success');
        } else {
            showNotification(result.message, 'error');
        }
    }
}

async function rejectTutorSession(sessionId) {
    if (confirm('Tolak sesi ini?')) {
        const result = await apiRequest('tutor_sessions.php?action=reject', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
        
        if (result.success) {
            await loadSessions();
            showNotification('Sesi ditolak', 'warning');
        } else {
            showNotification(result.message, 'error');
        }
    }
}

async function completeTutorSession(sessionId) {
    if (confirm('Tandai sesi ini sebagai selesai?')) {
        const result = await apiRequest('tutor_sessions.php?action=complete', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
        
        if (result.success) {
            await loadSessions();
            await loadProfileStats(); // Refresh earnings
            showNotification('Sesi berhasil diselesaikan! 🎉', 'success');
        } else {
            showNotification(result.message, 'error');
        }
    }
}

function writeReview(sessionId) {
    showNotification('Fitur review akan segera hadir! 🌟', 'info');
}

function viewSessionDetail(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        const dateStr = session.date.toLocaleString('id-ID');
        alert(`Detail Sesi\n\nTutor: ${session.tutor.name}\nMata Kuliah: ${session.tutor.subject}\nTanggal: ${dateStr}\nDurasi: ${session.duration} jam\nMetode: ${session.method}\nStatus: ${session.status}\nHarga: Rp ${session.price.toLocaleString('id-ID')}\n\nCatatan: ${session.notes}`);
    }
}

// ===================================================
// DEMO TOUR
// ===================================================
function startTour() {
    const intro = introJs();
    intro.setOptions({
        steps: [
            {
                intro: "👋 Selamat datang di TutorHub! Platform tutoring untuk mahasiswa Indonesia. Mari kita kenali fitur-fiturnya."
            },
            {
                element: document.querySelector('.navbar-brand'),
                intro: "Ini adalah TutorHub - platform yang menghubungkan mahasiswa dengan senior berpengalaman."
            },
            {
                intro: "Pertama, mari kita login untuk mengakses semua fitur."
            }
        ],
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        doneLabel: 'Selesai',
        nextLabel: 'Lanjut',
        prevLabel: 'Kembali'
    });
    
    intro.oncomplete(function() {
        if (!currentUser) {
            setTimeout(() => {
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            }, 500);
        } else {
            showPage('search');
            setTimeout(() => {
                const searchTour = introJs();
                searchTour.setOptions({
                    steps: [
                        {
                            element: document.querySelector('.filter-sidebar'),
                            intro: "🔍 Gunakan filter untuk mencari tutor sesuai kebutuhan Anda."
                        },
                        {
                            element: document.querySelector('#tutor-list'),
                            intro: "📋 Daftar tutor akan tampil di sini. Klik 'Lihat Profil' untuk detail."
                        },
                        {
                            element: document.querySelector('#nav-sessions'),
                            intro: "📅 Di menu 'Sesi Saya', Anda bisa kelola jadwal tutoring."
                        },
                        {
                            element: document.querySelector('#nav-profile'),
                            intro: "👤 Menu 'Profil' untuk melihat statistik dan riwayat pembelajaran Anda."
                        }
                    ],
                    doneLabel: 'Mengerti!',
                    nextLabel: 'Lanjut',
                    prevLabel: 'Kembali'
                });
                searchTour.start();
            }, 500);
        }
    });
    
    intro.start();
}

function populateSampleData() {
    showNotification('Fitur ini tidak tersedia dalam versi dinamis. Data sudah tersedia di database!', 'info');
}

// ===================================================
// UTILITY FUNCTIONS
// ===================================================
function updateUserTypeBadge() {
    // Add badge to demo badge
    const demoBadge = document.getElementById('demo-badge');
    if (currentUser && currentUser.type === 'tutor') {
        demoBadge.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> TUTOR';
        demoBadge.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else {
        demoBadge.innerHTML = '<i class="fas fa-user-graduate"></i> STUDENT';
        demoBadge.style.background = 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)';
    }
}

function closeModal(modalId) {
    const modalElement = document.getElementById(modalId);
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
        modalInstance.hide();
    }
    
    setTimeout(() => {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }, 300);
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

// ===================================================
// CONSOLE INFO
// ===================================================
console.log('%c🎓 TutorHub - Dynamic Mode with PHP Backend', 'font-size: 20px; font-weight: bold; color: #4F46E5');
console.log('%cTips:', 'font-size: 14px; font-weight: bold;');
console.log('- Data disimpan di MySQL Database');
console.log('- Session menggunakan PHP Session');
console.log('- API: auth.php, tutors.php, sessions.php, profile.php');
console.log('\n%cDeveloped for Academic Presentation', 'color: #10b981');