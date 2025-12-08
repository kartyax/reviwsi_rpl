let currentAdmin = null;
let stats = null;
const API_URL = 'api/';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard initialized...');
    checkAuth();
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
        if (result.user.type !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
        
        currentAdmin = result.user;
        document.getElementById('admin-name').textContent = currentAdmin.name;
        document.getElementById('admin-avatar').src = currentAdmin.avatar;
        
        loadDashboard();
    } else {
        window.location.href = 'index.html';
    }
}

// ===================================================
// LOAD DATA
// ===================================================
async function loadDashboard() {
    await loadStats();
    updateBadges();
}

async function loadStats() {
    const result = await apiRequest('admin.php?action=dashboard_stats');
    if (result.success) {
        stats = result.stats;
        updateStatsDisplay();
    }
}

function updateStatsDisplay() {
    if (!stats) return;
    
    document.getElementById('stat-users').textContent = stats.total_users;
    document.getElementById('stat-tutors').textContent = stats.total_tutors;
    document.getElementById('stat-pending').textContent = stats.pending_tutors;
    document.getElementById('stat-sessions').textContent = stats.total_sessions;
    document.getElementById('stat-revenue').textContent = 'Rp ' + stats.total_revenue.toLocaleString('id-ID');
    document.getElementById('stat-fees').textContent = 'Rp ' + stats.admin_fees.toLocaleString('id-ID');
    document.getElementById('stat-escrow').textContent = 'Rp ' + stats.escrow_balance.toLocaleString('id-ID');
}

function updateBadges() {
    if (!stats) return;
    
    document.getElementById('pending-tutors-badge').textContent = stats.pending_tutors;
    document.getElementById('pending-withdrawals-badge').textContent = stats.pending_withdrawals;
    document.getElementById('pending-reports-badge').textContent = stats.pending_reports;
}

// ===================================================
// NAVIGATION
// ===================================================
function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-content').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(viewName + '-view').classList.add('active');
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.closest('.nav-link').classList.add('active');
    
    // Update title
    const titles = {
        'dashboard': ['Dashboard', 'Overview sistem TutorHub'],
        'tutors': ['Verifikasi Tutor', 'Kelola verifikasi tutor baru'],
        'users': ['Kelola User', 'Daftar semua pengguna'],
        'sessions': ['Sesi', 'Monitoring semua sesi tutoring'],
        'transactions': ['Transaksi Escrow', 'Kelola pembayaran dan escrow'],
        'withdrawals': ['Withdrawal', 'Proses withdrawal request dari tutor'],
        'reports': ['Reports', 'Handle laporan dari user']
    };
    
    if (titles[viewName]) {
        document.getElementById('page-title').textContent = titles[viewName][0];
        document.getElementById('page-subtitle').textContent = titles[viewName][1];
    }
    
    // Load data for view
    loadViewData(viewName);
}

async function loadViewData(viewName) {
    switch(viewName) {
        case 'tutors':
            await loadPendingTutors();
            break;
        case 'users':
            await loadAllUsers();
            break;
        case 'sessions':
            await loadAllSessions();
            break;
        case 'transactions':
            await loadAllTransactions();
            break;
        case 'withdrawals':
            await loadPendingWithdrawals();
            break;
        case 'reports':
            await loadPendingReports();
            break;
    }
}

// ===================================================
// TUTOR VERIFICATION
// ===================================================
async function loadPendingTutors() {
    const result = await apiRequest('admin.php?action=pending_tutors');
    if (result.success) {
        renderTutorsTable(result.tutors);
    }
}

function renderTutorsTable(tutors) {
    const tbody = document.querySelector('#tutors-table tbody');
    
    if (tutors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Tidak ada tutor yang menunggu verifikasi</td></tr>';
        return;
    }
    
    tbody.innerHTML = tutors.map(tutor => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${tutor.avatar}" class="rounded-circle me-2" width="40" height="40" alt="${tutor.name}">
                    <div>
                        <div class="fw-semibold">${tutor.name}</div>
                        <small class="text-muted">NIM: ${tutor.nim}</small>
                    </div>
                </div>
            </td>
            <td>${tutor.email}</td>
            <td>${tutor.university}</td>
            <td><span class="badge bg-primary">${tutor.subject || '-'}</span></td>
            <td>Rp ${(tutor.price || 0).toLocaleString('id-ID')}</td>
            <td>${new Date(tutor.created_at).toLocaleDateString('id-ID')}</td>
            <td>
                <button class="btn btn-success btn-action btn-sm me-1" onclick="verifyTutor(${tutor.id})">
                    <i class="fas fa-check"></i> Verifikasi
                </button>
                <button class="btn btn-danger btn-action btn-sm" onclick="rejectTutor(${tutor.id})">
                    <i class="fas fa-times"></i> Tolak
                </button>
            </td>
        </tr>
    `).join('');
}

async function verifyTutor(userId) {
    if (confirm('Verifikasi tutor ini?')) {
        const result = await apiRequest('admin.php?action=verify_tutor', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
        
        if (result.success) {
            showNotification('Tutor berhasil diverifikasi!', 'success');
            await refreshData();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

async function rejectTutor(userId) {
    const reason = prompt('Alasan penolakan:');
    if (reason) {
        const result = await apiRequest('admin.php?action=reject_tutor', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, reason })
        });
        
        if (result.success) {
            showNotification('Verifikasi ditolak', 'warning');
            await refreshData();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

// ===================================================
// USERS MANAGEMENT
// ===================================================
async function loadAllUsers() {
    const result = await apiRequest('admin.php?action=all_users');
    if (result.success) {
        renderUsersTable(result.users);
    }
}

function renderUsersTable(users) {
    const tbody = document.querySelector('#users-table tbody');
    
    tbody.innerHTML = users.map(user => {
        const statusClass = user.verified ? 'status-approved' : 
                          user.verification_status === 'pending' ? 'status-pending' : 'status-rejected';
        const statusText = user.verified ? 'Verified' : user.verification_status;
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${user.avatar}" class="rounded-circle me-2" width="35" height="35" alt="${user.name}">
                        <div>
                            <div class="fw-semibold">${user.name}</div>
                            <small class="text-muted">${user.nim}</small>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.university}</td>
                <td><span class="badge ${user.type === 'tutor' ? 'bg-success' : 'bg-primary'}">${user.type}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString('id-ID')}</td>
            </tr>
        `;
    }).join('');
}

// ===================================================
// SESSIONS MANAGEMENT
// ===================================================
async function loadAllSessions() {
    const result = await apiRequest('admin.php?action=all_sessions');
    if (result.success) {
        renderSessionsTable(result.sessions);
    }
}

function renderSessionsTable(sessions) {
    const tbody = document.querySelector('#sessions-table tbody');
    
    tbody.innerHTML = sessions.map(session => {
        const statusClass = `status-${session.status}`;
        return `
            <tr>
                <td>#${session.id}</td>
                <td>${session.student_name}</td>
                <td>${session.tutor_name}</td>
                <td>${new Date(session.date).toLocaleDateString('id-ID')}</td>
                <td>${session.duration}h</td>
                <td>Rp ${session.price.toLocaleString('id-ID')}</td>
                <td><span class="status-badge ${statusClass}">${session.status}</span></td>
            </tr>
        `;
    }).join('');
}

// ===================================================
// TRANSACTIONS & ESCROW
// ===================================================
async function loadAllTransactions() {
    const result = await apiRequest('admin.php?action=all_transactions');
    if (result.success) {
        renderTransactionsTable(result.transactions);
    }
}

function renderTransactionsTable(transactions) {
    const tbody = document.querySelector('#transactions-table tbody');
    
    tbody.innerHTML = transactions.map(tx => {
        const statusClass = `status-${tx.status}`;
        return `
            <tr>
                <td>#${tx.id}</td>
                <td>${tx.student_name}</td>
                <td>${tx.tutor_name}</td>
                <td>Rp ${tx.amount.toLocaleString('id-ID')}</td>
                <td>Rp ${tx.admin_fee.toLocaleString('id-ID')}</td>
                <td>Rp ${tx.tutor_amount.toLocaleString('id-ID')}</td>
                <td><span class="status-badge ${statusClass}">${tx.status}</span></td>
                <td>
                    ${tx.status === 'held' ? `
                        <button class="btn btn-success btn-action btn-sm me-1" onclick="releaseEscrow(${tx.id})">
                            <i class="fas fa-unlock"></i> Release
                        </button>
                        <button class="btn btn-danger btn-action btn-sm" onclick="refundPayment(${tx.id})">
                            <i class="fas fa-undo"></i> Refund
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `;
    }).join('');
}

async function releaseEscrow(transactionId) {
    if (confirm('Release escrow ke tutor?')) {
        const result = await apiRequest('admin.php?action=release_escrow', {
            method: 'POST',
            body: JSON.stringify({ transaction_id: transactionId })
        });
        
        if (result.success) {
            showNotification('Escrow berhasil dirilis!', 'success');
            await loadAllTransactions();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

async function refundPayment(transactionId) {
    const reason = prompt('Alasan refund:');
    if (reason) {
        const result = await apiRequest('admin.php?action=refund_payment', {
            method: 'POST',
            body: JSON.stringify({ transaction_id: transactionId, reason })
        });
        
        if (result.success) {
            showNotification('Refund berhasil diproses', 'success');
            await loadAllTransactions();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

// ===================================================
// WITHDRAWALS
// ===================================================
async function loadPendingWithdrawals() {
    const result = await apiRequest('admin.php?action=pending_withdrawals');
    if (result.success) {
        renderWithdrawalsTable(result.withdrawals);
    }
}

function renderWithdrawalsTable(withdrawals) {
    const tbody = document.querySelector('#withdrawals-table tbody');
    
    if (withdrawals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Tidak ada withdrawal request</td></tr>';
        return;
    }
    
    tbody.innerHTML = withdrawals.map(w => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${w.avatar}" class="rounded-circle me-2" width="35" height="35" alt="${w.tutor_name}">
                    <span class="fw-semibold">${w.tutor_name}</span>
                </div>
            </td>
            <td><strong class="text-success">Rp ${w.amount.toLocaleString('id-ID')}</strong></td>
            <td>
                <div>${w.bank_name}</div>
                <small class="text-muted">${w.bank_account} - ${w.bank_holder}</small>
            </td>
            <td>${new Date(w.created_at).toLocaleDateString('id-ID')}</td>
            <td>
                <button class="btn btn-success btn-action btn-sm me-1" onclick="approveWithdrawal(${w.id})">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-danger btn-action btn-sm" onclick="rejectWithdrawal(${w.id})">
                    <i class="fas fa-times"></i> Reject
                </button>
            </td>
        </tr>
    `).join('');
}

async function approveWithdrawal(withdrawalId) {
    if (confirm('Approve withdrawal ini? Pastikan transfer sudah dilakukan.')) {
        const result = await apiRequest('admin.php?action=process_withdrawal', {
            method: 'POST',
            body: JSON.stringify({ withdrawal_id: withdrawalId })
        });
        
        if (result.success) {
            showNotification('Withdrawal approved!', 'success');
            await refreshData();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

async function rejectWithdrawal(withdrawalId) {
    const reason = prompt('Alasan penolakan:');
    if (reason) {
        const result = await apiRequest('admin.php?action=reject_withdrawal', {
            method: 'POST',
            body: JSON.stringify({ withdrawal_id: withdrawalId, reason })
        });
        
        if (result.success) {
            showNotification('Withdrawal rejected', 'warning');
            await refreshData();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

// ===================================================
// REPORTS
// ===================================================
async function loadPendingReports() {
    const result = await apiRequest('admin.php?action=pending_reports');
    if (result.success) {
        renderReportsTable(result.reports);
    }
}

function renderReportsTable(reports) {
    const tbody = document.querySelector('#reports-table tbody');
    
    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Tidak ada report pending</td></tr>';
        return;
    }
    
    tbody.innerHTML = reports.map(r => `
        <tr>
            <td>${r.reporter_name}</td>
            <td>${r.reported_name}</td>
            <td><span class="badge bg-info">${r.type}</span></td>
            <td>${r.reason}</td>
            <td>${new Date(r.created_at).toLocaleDateString('id-ID')}</td>
            <td>
                <button class="btn btn-primary btn-action btn-sm" onclick="viewReportDetail(${r.id})">
                    <i class="fas fa-eye"></i> Review
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewReportDetail(reportId) {
    const resolution = prompt('Resolution notes:');
    if (resolution) {
        const result = await apiRequest('admin.php?action=resolve_report', {
            method: 'POST',
            body: JSON.stringify({ report_id: reportId, resolution })
        });
        
        if (result.success) {
            showNotification('Report resolved', 'success');
            await loadPendingReports();
        } else {
            showNotification(result.message, 'error');
        }
    }
}

// ===================================================
// UTILITY
// ===================================================
async function refreshData() {
    await loadStats();
    updateBadges();
    
    // Reload current view
    const activeView = document.querySelector('.view-content.active').id.replace('-view', '');
    await loadViewData(activeView);
}

async function logout() {
    if (confirm('Logout dari admin panel?')) {
        const result = await apiRequest('auth.php?action=logout', { method: 'POST' });
        if (result.success) {
            window.location.href = 'index.html';
        }
    }
}

function showNotification(message, type = 'info') {
    const bgColors = {
        'success': '#10b981',
        'error': '#ef4444',
        'info': '#3b82f6',
        'warning': '#f59e0b'
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
        max-width: 400px;
    `;
    notification.innerHTML = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

console.log('%c🛡️ TutorHub - Admin Dashboard', 'font-size: 20px; font-weight: bold; color: #dc2626');
console.log('%cAdmin Mode Active', 'color: #dc2626');