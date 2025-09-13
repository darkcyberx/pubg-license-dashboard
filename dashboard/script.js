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
    // Initialize security and check for existing session
    initializeSecurity() {
        // Wait for security manager to be ready
        if (typeof securityManager === 'undefined') {
            setTimeout(() => this.initializeSecurity(), 100);
            return;
        }
        
        // Initialize security features
        this.securityInitialized = true;
    }
    
    checkExistingSession() {
        const sessionId = localStorage.getItem('sessionId');
        const currentUser = localStorage.getItem('currentUser');
        
        if (sessionId && currentUser && this.securityInitialized) {
            // Check if session is still valid
            try {
                securityManager.checkSessionTimeout();
                this.currentUser = currentUser;
                document.getElementById('currentUser').textContent = currentUser;
                document.getElementById('dashboard').classList.remove('d-none');
                this.updateStatistics();
                this.loadTables();
            } catch (error) {
                this.showLoginModal();
            }
        } else {
            this.showLoginModal();
        }
    }
    
    getStoredCredentials() {
        // In production, these should come from environment variables or secure config
        const stored = localStorage.getItem('adminCredentials');
        if (stored) {
            return JSON.parse(stored);
        }
        return this.adminCredentials;
    }
    
    updateCredentials(username, password) {
        // Validate password strength
        const passwordValidation = securityManager.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            throw new Error(`Password is too weak. Requirements: minimum 8 characters, mix of uppercase, lowercase, numbers, and symbols.`);
        }
        
        const newCredentials = { username, password };
        localStorage.setItem('adminCredentials', JSON.stringify(newCredentials));
        this.adminCredentials = newCredentials;
        
        securityManager.logSecurityEvent('CREDENTIALS_UPDATED', { username });
        return true;
    }
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkExistingSession();
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
        const username = securityManager.sanitizeInput(document.getElementById('username').value);
        const password = document.getElementById('password').value;
        const ip = 'localhost'; // In production, get real IP
        
        try {
            // Check rate limiting and login attempts
            securityManager.checkLoginAttempt(username, ip);
            securityManager.checkRateLimit('login', ip);
            
            // Validate input
            if (!securityManager.validateInput(username, 'username')) {
                throw new Error('Invalid username format');
            }
            
            if (!securityManager.validateInput(password, 'password')) {
                throw new Error('Password does not meet security requirements');
            }
            
            // Check credentials (in production, use environment variables)
            const storedCredentials = this.getStoredCredentials();
            if (username === storedCredentials.username && password === storedCredentials.password) {
                this.currentUser = username;
                document.getElementById('currentUser').textContent = username;
                
                // Create secure session
                securityManager.createSession(username);
                securityManager.recordSuccessfulLogin(username, ip);
                securityManager.logSecurityEvent('LOGIN_SUCCESS', { username: username });
                
                // Hide login modal and show dashboard
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                loginModal.hide();
                document.getElementById('dashboard').classList.remove('d-none');
                
                // Clear login form
                document.getElementById('loginForm').reset();
                document.getElementById('loginError').classList.add('d-none');
                
                this.showSuccessMessage('Login successful!');
            } else {
                securityManager.recordFailedAttempt(username, ip);
                securityManager.logSecurityEvent('LOGIN_FAILED', { username: username });
                throw new Error('Invalid username or password');
            }
        } catch (error) {
            this.showLoginError(error.message);
        }
    }
    
    handleLogout() {
        securityManager.logSecurityEvent('LOGOUT', { username: this.currentUser });
        securityManager.clearSession();
        this.currentUser = null;
        document.getElementById('dashboard').classList.add('d-none');
        this.showLoginModal();
    }
    
    showLoginModal() {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }
    
    showLoginError(message) {
        document.getElementById('loginErrorMessage').textContent = message;
        document.getElementById('loginError').classList.remove('d-none');
    }
    
    handleTabChange(target) {
        switch(target) {
            case '#licenses':
                this.loadLicensesTable();
                break;
            case '#customers':
                this.loadCustomersTable();
                break;
            case '#create':
                this.populateCustomerDropdowns();
                break;
            case '#settings':
                this.loadSettings();
                break;
        }
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
    
    createLicense() {
        try {
            // Validate CSRF token
            const csrfToken = document.querySelector('input[name="csrf_token"]').value;
            if (!securityManager.validateCSRFToken(csrfToken)) {
                throw new Error('Security token invalid. Please refresh the page.');
            }
            
            // Get and sanitize form data
            const formData = {
                customerId: securityManager.sanitizeInput(document.getElementById('customerSelect').value),
                licenseType: securityManager.sanitizeInput(document.getElementById('licenseType').value),
                expiryDate: securityManager.sanitizeInput(document.getElementById('expiryDate').value),
                deviceLimit: parseInt(document.getElementById('deviceLimit').value),
                notes: securityManager.sanitizeInput(document.getElementById('licenseNotes').value)
            };
            
            // Validate form data
            const validation = securityManager.validateFormData(formData, {
                customerId: { required: true },
                licenseType: { required: true },
                expiryDate: { required: true },
                deviceLimit: { required: true, minValue: 1, maxValue: 10 }
            });
            
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            const customer = this.customers.find(c => c.id === formData.customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }
            
            const license = {
                id: Date.now().toString(),
                key: this.generateLicenseKey(),
                customerId: formData.customerId,
                customerName: customer.name,
                type: formData.licenseType,
                status: 'active',
                createdDate: new Date().toISOString().split('T')[0],
                expiryDate: formData.expiryDate,
                deviceLimit: formData.deviceLimit,
                devicesBound: 0,
                notes: formData.notes
            };
            
            this.licenses.push(license);
            this.saveLicenses();
            this.updateStatistics();
            
            // Reset form
            document.getElementById('createLicenseForm').reset();
            
            // Log security event
            securityManager.logSecurityEvent('LICENSE_CREATED', {
                licenseId: license.id,
                customerId: formData.customerId
            });
            
            this.showSuccessMessage(`License created successfully! Key: ${license.key}`);
        } catch (error) {
            securityManager.logSecurityEvent('LICENSE_CREATE_FAILED', { error: error.message });
            this.showErrorMessage(error.message);
        }
    }
    
    addLicense() {
        const customerId = document.getElementById('modalCustomerSelect').value;
        const licenseKey = document.getElementById('modalLicenseKey').value;
        const expiryDate = document.getElementById('modalExpiryDate').value;
        
        if (!customerId || !licenseKey || !expiryDate) {
            this.showErrorMessage('Please fill all required fields');
            return;
        }
        
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showErrorMessage('Customer not found');
            return;
        }
        
        // Check if license key already exists
        if (this.licenses.find(l => l.key === licenseKey)) {
            this.showErrorMessage('License key already exists');
            return;
        }
        
        const license = {
            id: Date.now().toString(),
            key: licenseKey,
            customerId: customerId,
            customerName: customer.name,
            type: 'basic',
            status: 'active',
            createdDate: new Date().toISOString().split('T')[0],
            expiryDate: expiryDate,
            deviceLimit: 1,
            devicesBound: 0,
            notes: ''
        };
        
        this.licenses.push(license);
        this.saveLicenses();
        this.updateStatistics();
        this.loadLicensesTable();
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addLicenseModal'));
        modal.hide();
        document.getElementById('addLicenseForm').reset();
        
        this.showSuccessMessage('License added successfully!');
    }
    
    addCustomer() {
        const name = document.getElementById('customerName').value;
        const phone = document.getElementById('customerPhone').value;
        const whatsapp = document.getElementById('customerWhatsApp').value;
        const telegram = document.getElementById('customerTelegram').value;
        const discord = document.getElementById('customerDiscord').value;
        
        if (!name || !phone) {
            this.showErrorMessage('Name and phone are required');
            return;
        }
        
        const customer = {
            id: Date.now().toString(),
            name: name,
            phone: phone,
            whatsapp: whatsapp || '',
            telegram: telegram || '',
            discord: discord || '',
            createdDate: new Date().toISOString().split('T')[0]
        };
        
        this.customers.push(customer);
        this.saveCustomers();
        this.updateStatistics();
        this.loadCustomersTable();
        this.populateCustomerDropdowns();
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCustomerModal'));
        modal.hide();
        document.getElementById('addCustomerForm').reset();
        
        this.showSuccessMessage('Customer added successfully!');
    }
    
    updateExpiryDate(licenseType) {
        const today = new Date();
        let expiryDate = new Date(today);
        
        switch(licenseType) {
            case 'basic':
                expiryDate.setDate(today.getDate() + 30);
                break;
            case 'premium':
                expiryDate.setDate(today.getDate() + 90);
                break;
            case 'professional':
                expiryDate.setDate(today.getDate() + 365);
                break;
            default:
                expiryDate.setDate(today.getDate() + 30);
        }
        
        document.getElementById('expiryDate').value = expiryDate.toISOString().split('T')[0];
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
            select.innerHTML = '<option value="">Select Customer</option>';
            this.customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.name;
                select.appendChild(option);
            });
        });
    }
    
    editLicense(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) return;
        
        // Implementation for edit license modal
        this.showInfoMessage('Edit license functionality coming soon!');
    }
    
    extendLicense(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) return;
        
        const days = prompt('Enter number of days to extend:', '30');
        if (days && !isNaN(days)) {
            const currentExpiry = new Date(license.expiryDate);
            currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));
            license.expiryDate = currentExpiry.toISOString().split('T')[0];
            
            this.saveLicenses();
            this.loadLicensesTable();
            this.updateStatistics();
            
            this.showSuccessMessage(`License extended by ${days} days`);
        }
    }
    
    revokeLicense(licenseId) {
        if (confirm('Are you sure you want to revoke this license?')) {
            const license = this.licenses.find(l => l.id === licenseId);
            if (license) {
                license.status = 'revoked';
                this.saveLicenses();
                this.loadLicensesTable();
                this.updateStatistics();
                this.showSuccessMessage('License revoked successfully');
            }
        }
    }
    
    editCustomer(customerId) {
        // Implementation for edit customer
        this.showInfoMessage('Edit customer functionality coming soon!');
    }
    
    deleteCustomer(customerId) {
        if (confirm('Are you sure you want to delete this customer?')) {
            this.customers = this.customers.filter(c => c.id !== customerId);
            this.saveCustomers();
            this.loadCustomersTable();
            this.populateCustomerDropdowns();
            this.updateStatistics();
            this.showSuccessMessage('Customer deleted successfully');
        }
    }
    
    loadSettings() {
        document.getElementById('defaultLicenseDuration').value = this.settings.defaultDuration;
        document.getElementById('maxDevicesPerLicense').value = this.settings.maxDevices;
    }
    
    saveSettings() {
        this.settings.defaultDuration = parseInt(document.getElementById('defaultLicenseDuration').value);
        this.settings.maxDevices = parseInt(document.getElementById('maxDevicesPerLicense').value);
        
        localStorage.setItem('settings', JSON.stringify(this.settings));
        this.showSuccessMessage('Settings saved successfully!');
    }
    
    exportData() {
        const data = {
            licenses: this.licenses,
            customers: this.customers,
            settings: this.settings,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pubg-licenses-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage('Data exported successfully!');
    }
    
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        
                        if (data.licenses && data.customers) {
                            this.licenses = data.licenses;
                            this.customers = data.customers;
                            if (data.settings) this.settings = data.settings;
                            
                            this.saveLicenses();
                            this.saveCustomers();
                            localStorage.setItem('settings', JSON.stringify(this.settings));
                            
                            this.updateStatistics();
                            this.loadTables();
                            this.loadSettings();
                            
                            this.showSuccessMessage('Data imported successfully!');
                        } else {
                            this.showErrorMessage('Invalid backup file format');
                        }
                    } catch (error) {
                        this.showErrorMessage('Error reading backup file');
                    }
                };
                reader.readAsText(file);
            }
        });
        input.click();
    }
    
    clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
            if (confirm('This will delete all licenses and customers. Type "DELETE" to confirm.')) {
                const confirmation = prompt('Type "DELETE" to confirm:');
                if (confirmation === 'DELETE') {
                    this.licenses = [];
                    this.customers = [];
                    this.settings = { defaultDuration: 30, maxDevices: 3 };
                    
                    localStorage.removeItem('licenses');
                    localStorage.removeItem('customers');
                    localStorage.removeItem('settings');
                    
                    this.updateStatistics();
                    this.loadTables();
                    this.loadSettings();
                    
                    this.showSuccessMessage('All data cleared successfully!');
                }
            }
        }
    }
    
    saveLicenses() {
        localStorage.setItem('licenses', JSON.stringify(this.licenses));
    }
    
    saveCustomers() {
        localStorage.setItem('customers', JSON.stringify(this.customers));
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
}

// Initialize the license manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.licenseManager = new LicenseManager();
});

// Add some sample data for demonstration
document.addEventListener('DOMContentLoaded', () => {
    // Add sample data only if no data exists
    setTimeout(() => {
        if (licenseManager.customers.length === 0) {
            // Add sample customers
            const sampleCustomers = [
                {
                    id: '1',
                    name: 'Ahmed Mohammed',
                    phone: '+966501234567',
                    whatsapp: '+966501234567',
                    telegram: '@ahmed_pubg',
                    discord: 'Ahmed#1234',
                    createdDate: '2024-01-15'
                },
                {
                    id: '2',
                    name: 'Sara Ali',
                    phone: '+966502345678',
                    whatsapp: '+966502345678',
                    telegram: '@sara_gaming',
                    discord: 'SaraGamer#5678',
                    createdDate: '2024-01-20'
                }
            ];
            
            licenseManager.customers = sampleCustomers;
            licenseManager.saveCustomers();
            
            // Add sample licenses
            const sampleLicenses = [
                {
                    id: '1',
                    key: 'PUBG-ABCD-EFGH-IJKL-MNOP',
                    customerId: '1',
                    customerName: 'Ahmed Mohammed',
                    type: 'premium',
                    status: 'active',
                    createdDate: '2024-01-15',
                    expiryDate: '2024-04-15',
                    deviceLimit: 2,
                    devicesBound: 1,
                    notes: 'Premium license for 90 days'
                },
                {
                    id: '2',
                    key: 'PUBG-QRST-UVWX-YZ12-3456',
                    customerId: '2',
                    customerName: 'Sara Ali',
                    type: 'basic',
                    status: 'active',
                    createdDate: '2024-01-20',
                    expiryDate: '2024-02-20',
                    deviceLimit: 1,
                    devicesBound: 1,
                    notes: 'Basic license for 30 days'
                }
            ];
            
            licenseManager.licenses = sampleLicenses;
            licenseManager.saveLicenses();
            
            licenseManager.updateStatistics();
            licenseManager.loadTables();
        }
    }, 1000);
});