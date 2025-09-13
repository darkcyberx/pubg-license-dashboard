// PUBG License Management Dashboard JavaScript
class LicenseManager {
    constructor() {
        this.currentUser = null;
        this.licenses = JSON.parse(localStorage.getItem('licenses') || '[]');
        this.customers = JSON.parse(localStorage.getItem('customers') || '[]');
        this.settings = JSON.parse(localStorage.getItem('settings') || '{"defaultDuration": 30, "maxDevices": 3}');
        
        // SECURE CREDENTIALS - CHANGED FOR PRODUCTION
        this.adminCredentials = {
            username: 'pubg_admin',
            password: 'SecurePUBG2024!@#'
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        // إخفاء الداش بورد وإظهار نافذة تسجيل الدخول فوراً
        document.getElementById('dashboard').classList.add('d-none');
        
        // انتظار تحميل Bootstrap ثم إظهار نافذة تسجيل الدخول
        setTimeout(() => {
            this.showLoginModal();
        }, 100);
        
        this.updateStatistics();
        this.loadTables();
    }
    
    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Tab change events
        document.querySelectorAll('#mainTabs button').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.handleTabChange(e.target.getAttribute('data-bs-target'));
            });
        });
        
        // Refresh buttons
        document.getElementById('refreshLicenses').addEventListener('click', () => {
            this.loadLicensesTable();
        });
        
        document.getElementById('refreshCustomers').addEventListener('click', () => {
            this.loadCustomersTable();
        });
        
        // Create license form
        document.getElementById('createLicenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createLicense();
        });
        
        // Modal forms
        document.getElementById('saveLicense').addEventListener('click', () => {
            this.addLicense();
        });
        
        document.getElementById('saveCustomer').addEventListener('click', () => {
            this.addCustomer();
        });
        
        // Generate license key
        document.getElementById('generateKey').addEventListener('click', () => {
            document.getElementById('modalLicenseKey').value = this.generateLicenseKey();
        });
        
        // Settings
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('importData').addEventListener('click', () => {
            this.importData();
        });
        
        document.getElementById('clearData').addEventListener('click', () => {
            this.clearAllData();
        });
        
        // License type change
        document.getElementById('licenseType').addEventListener('change', (e) => {
            this.updateExpiryDate(e.target.value);
        });
    }
    
    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            // Check credentials
            if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
                this.currentUser = username;
                document.getElementById('currentUser').textContent = username;
                
                // Hide login modal and show dashboard
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (loginModal) {
                    loginModal.hide();
                }
                document.getElementById('dashboard').classList.remove('d-none');
                
                // Clear login form
                document.getElementById('loginForm').reset();
                document.getElementById('loginError').classList.add('d-none');
                
                this.showSuccessMessage('تم تسجيل الدخول بنجاح!');
            } else {
                throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
            }
        } catch (error) {
            this.showLoginError(error.message);
        }
    }
    
    handleLogout() {
        this.currentUser = null;
        document.getElementById('dashboard').classList.add('d-none');
        this.showLoginModal();
    }
    
    showLoginModal() {
        // إخفاء الداش بورد فوراً
        document.getElementById('dashboard').classList.add('d-none');
        
        // إظهار نافذة تسجيل الدخول فوراً
        const loginModalElement = document.getElementById('loginModal');
        
        // إزالة أي مودال موجود مسبقاً
        const existingModal = bootstrap.Modal.getInstance(loginModalElement);
        if (existingModal) {
            existingModal.dispose();
        }
        
        // إنشاء مودال جديد وإظهاره
        const loginModal = new bootstrap.Modal(loginModalElement, {
            backdrop: 'static',
            keyboard: false,
            focus: true
        });
        
        loginModal.show();
        
        // تركيز على حقل اسم المستخدم بعد ظهور المودال
        loginModalElement.addEventListener('shown.bs.modal', () => {
            document.getElementById('username').focus();
        }, { once: true });
        
        // مسح أي رسائل خطأ سابقة
        document.getElementById('loginError').classList.add('d-none');
        document.getElementById('loginForm').reset();
    }
    
    showLoginError(message) {
        document.getElementById('loginErrorMessage').textContent = message;
        document.getElementById('loginError').classList.remove('d-none');
    }
    
    generateLicenseKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 20; i++) {
            if (i > 0 && i % 4 === 0) result += '-';
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    updateStatistics() {
        const activeLicenses = this.licenses.filter(l => l.status === 'active').length;
        const expiringSoon = this.licenses.filter(l => {
            if (l.status !== 'active') return false;
            const expiryDate = new Date(l.expiryDate);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
        }).length;
        
        document.getElementById('totalLicenses').textContent = this.licenses.length;
        document.getElementById('activeLicenses').textContent = activeLicenses;
        document.getElementById('expiringLicenses').textContent = expiringSoon;
        document.getElementById('totalCustomers').textContent = this.customers.length;
    }
    
    loadTables() {
        this.loadLicensesTable();
        this.loadCustomersTable();
        this.populateCustomerDropdowns();
    }
    
    loadLicensesTable() {
        const tbody = document.getElementById('licensesTableBody');
        tbody.innerHTML = '';
        
        this.licenses.forEach(license => {
            const row = document.createElement('tr');
            
            // Determine status class and text
            let statusClass = 'status-active';
            let statusText = 'Active';
            
            if (license.status === 'revoked') {
                statusClass = 'status-revoked';
                statusText = 'Revoked';
            } else {
                const expiryDate = new Date(license.expiryDate);
                const today = new Date();
                if (expiryDate < today) {
                    statusClass = 'status-expired';
                    statusText = 'Expired';
                }
            }
            
            row.innerHTML = `
                <td><code>${license.key}</code></td>
                <td>${license.customerName}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${license.expiryDate}</td>
                <td>
                    <button class="btn btn-info btn-sm action-btn" onclick="licenseManager.editLicense('${license.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-warning btn-sm action-btn" onclick="licenseManager.extendLicense('${license.id}')">
                        <i class="fas fa-clock"></i>
                    </button>
                    <button class="btn btn-danger btn-sm action-btn" onclick="licenseManager.revokeLicense('${license.id}')">
                        <i class="fas fa-ban"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    loadCustomersTable() {
        const tbody = document.getElementById('customersTableBody');
        tbody.innerHTML = '';
        
        this.customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                <td>${customer.whatsapp || '-'}</td>
                <td>${customer.telegram || '-'}</td>
                <td>${customer.discord || '-'}</td>
                <td>
                    <button class="btn btn-info btn-sm action-btn" onclick="licenseManager.editCustomer('${customer.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm action-btn" onclick="licenseManager.deleteCustomer('${customer.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    populateCustomerDropdowns() {
        const selects = [
            document.getElementById('customerSelect'),
            document.getElementById('modalCustomerSelect')
        ];
        
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Select Customer</option>';
                this.customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer.id;
                    option.textContent = customer.name;
                    select.appendChild(option);
                });
            }
        });
    }
    
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }
    
    showErrorMessage(message) {
        this.showToast(message, 'danger');
    }
    
    showInfoMessage(message) {
        this.showToast(message, 'info');
    }
    
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast
        const toastId = `toast_${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const toastInstance = new bootstrap.Toast(toast, { delay: 4000 });
        toastInstance.show();
        
        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
    
    // Add minimal required methods for basic functionality
    handleTabChange(target) { }
    createLicense() { }
    addLicense() { }
    addCustomer() { }
    updateExpiryDate() { }
    editLicense() { }
    extendLicense() { }
    revokeLicense() { }
    editCustomer() { }
    deleteCustomer() { }
    loadSettings() { }
    saveSettings() { }
    exportData() { }
    importData() { }
    clearAllData() { }
    saveLicenses() {
        localStorage.setItem('licenses', JSON.stringify(this.licenses));
    }
    saveCustomers() {
        localStorage.setItem('customers', JSON.stringify(this.customers));
    }
}

// Initialize the license manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.licenseManager = new LicenseManager();
});