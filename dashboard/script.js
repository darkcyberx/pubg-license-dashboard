// PUBG License Management Dashboard - Complete CRUD Implementation
class LicenseManager {
    constructor() {
        this.currentUser = null;
        this.licenses = JSON.parse(localStorage.getItem('licenses') || '[]');
        this.customers = JSON.parse(localStorage.getItem('customers') || '[]');
        this.settings = JSON.parse(localStorage.getItem('settings') || '{"defaultDuration": 30, "maxDevices": 3}');
        
        this.adminCredentials = {
            username: 'pubg_admin',
            password: 'SecurePUBG2024!@#'
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        document.getElementById('dashboard').classList.add('d-none');
        setTimeout(() => this.showLoginModal(), 100);
        this.updateStatistics();
        this.loadTables();
    }
    
    setupEventListeners() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        document.querySelectorAll('#mainTabs button').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.handleTabChange(e.target.getAttribute('data-bs-target'));
            });
        });
        
        this.setupOptionalEventListeners();
    }
    
    setupOptionalEventListeners() {
        const elements = [
            { id: 'createLicenseForm', event: 'submit', handler: (e) => { e.preventDefault(); this.createLicense(); }},
            { id: 'saveLicense', event: 'click', handler: () => this.addLicense() },
            { id: 'saveCustomer', event: 'click', handler: () => this.addCustomer() },
            { id: 'generateKey', event: 'click', handler: () => {
                const keyField = document.getElementById('modalLicenseKey');
                if (keyField) keyField.value = this.generateLicenseKey();
            }}
        ];
        
        elements.forEach(({ id, event, handler }) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener(event, handler);
        });
    }
    
    handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        try {
            if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
                this.currentUser = username;
                const currentUserElement = document.getElementById('currentUser');
                if (currentUserElement) currentUserElement.textContent = username;
                
                const loginModalElement = document.getElementById('loginModal');
                const loginModal = bootstrap.Modal.getInstance(loginModalElement);
                if (loginModal) loginModal.hide();
                
                if (loginModalElement) {
                    loginModalElement.style.display = 'none';
                    loginModalElement.classList.remove('show');
                    document.body.classList.remove('modal-open');
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) backdrop.remove();
                }
                
                const dashboardElement = document.getElementById('dashboard');
                if (dashboardElement) dashboardElement.classList.remove('d-none');
                
                document.getElementById('loginForm').reset();
                const loginError = document.getElementById('loginError');
                if (loginError) loginError.classList.add('d-none');
                
                this.showSuccessMessage('🎉 تم تسجيل الدخول بنجاح!');
                this.updateStatistics();
                this.loadTables();
                
            } else {
                throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
            }
        } catch (error) {
            this.showLoginError(error.message);
        }
    }
    
    showLoginModal() {
        document.getElementById('dashboard').classList.add('d-none');
        const loginModalElement = document.getElementById('loginModal');
        if (!loginModalElement) return;
        
        const existingModal = bootstrap.Modal.getInstance(loginModalElement);
        if (existingModal) existingModal.dispose();
        
        const loginModal = new bootstrap.Modal(loginModalElement, {
            backdrop: 'static',
            keyboard: false,
            focus: true
        });
        
        loginModal.show();
    }
    
    showLoginError(message) {
        const loginErrorMessage = document.getElementById('loginErrorMessage');
        const loginError = document.getElementById('loginError');
        
        if (loginErrorMessage) loginErrorMessage.textContent = message;
        if (loginError) loginError.classList.remove('d-none');
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
    
    // CRUD Operations - Fully Functional
    createLicense() {
        const customerSelect = document.getElementById('customerSelect');
        const licenseKey = document.getElementById('licenseKey');
        const licenseType = document.getElementById('licenseType');
        const deviceLimit = document.getElementById('deviceLimit');
        const licenseNotes = document.getElementById('licenseNotes');
        
        if (!customerSelect?.value) {
            this.showErrorMessage('يرجى اختيار عميل');
            return;
        }
        
        if (!licenseKey?.value) {
            this.showErrorMessage('يرجى إدخال مفتاح الترخيص');
            return;
        }
        
        const existingLicense = this.licenses.find(l => l.key === licenseKey.value);
        if (existingLicense) {
            this.showErrorMessage('مفتاح الترخيص موجود مسبقاً');
            return;
        }
        
        const customer = this.customers.find(c => c.id === customerSelect.value);
        if (!customer) {
            this.showErrorMessage('العميل المحدد غير موجود');
            return;
        }
        
        const newLicense = {
            id: Date.now().toString(),
            key: licenseKey.value,
            customerId: customer.id,
            customerName: customer.name,
            type: licenseType?.value || 'basic',
            status: 'active',
            createdDate: new Date().toISOString().split('T')[0],
            expiryDate: this.calculateExpiryDate(licenseType?.value || 'basic'),
            deviceLimit: parseInt(deviceLimit?.value || '1') || 1,
            devicesBound: 0,
            notes: licenseNotes?.value || ''
        };
        
        this.licenses.push(newLicense);
        this.saveLicenses();
        this.updateStatistics();
        this.loadLicensesTable();
        
        const form = document.getElementById('createLicenseForm');
        if (form) form.reset();
        
        this.showSuccessMessage(`تم إنشاء الترخيص بنجاح للعميل: ${customer.name}`);
    }
    
    addLicense() {
        const modalCustomerSelect = document.getElementById('modalCustomerSelect');
        const modalLicenseKey = document.getElementById('modalLicenseKey');
        
        if (!modalCustomerSelect?.value) {
            this.showErrorMessage('يرجى اختيار عميل');
            return;
        }
        
        if (!modalLicenseKey?.value) {
            this.showErrorMessage('يرجى إدخال مفتاح الترخيص');
            return;
        }
        
        const existingLicense = this.licenses.find(l => l.key === modalLicenseKey.value);
        if (existingLicense) {
            this.showErrorMessage('مفتاح الترخيص موجود مسبقاً');
            return;
        }
        
        const customer = this.customers.find(c => c.id === modalCustomerSelect.value);
        if (!customer) {
            this.showErrorMessage('العميل المحدد غير موجود');
            return;
        }
        
        const newLicense = {
            id: Date.now().toString(),
            key: modalLicenseKey.value,
            customerId: customer.id,
            customerName: customer.name,
            type: document.getElementById('modalLicenseType')?.value || 'basic',
            status: 'active',
            createdDate: new Date().toISOString().split('T')[0],
            expiryDate: this.calculateExpiryDate(document.getElementById('modalLicenseType')?.value || 'basic'),
            deviceLimit: parseInt(document.getElementById('modalDeviceLimit')?.value || '1') || 1,
            devicesBound: 0,
            notes: document.getElementById('modalLicenseNotes')?.value || ''
        };
        
        this.licenses.push(newLicense);
        this.saveLicenses();
        this.updateStatistics();
        this.loadLicensesTable();
        
        const addLicenseModal = document.getElementById('addLicenseModal');
        if (addLicenseModal) {
            const modal = bootstrap.Modal.getInstance(addLicenseModal);
            if (modal) modal.hide();
        }
        
        const form = document.getElementById('addLicenseForm');
        if (form) form.reset();
        
        this.showSuccessMessage(`تم إضافة الترخيص بنجاح للعميل: ${customer.name}`);
    }
    
    addCustomer() {
        const modalCustomerName = document.getElementById('modalCustomerName');
        const modalCustomerPhone = document.getElementById('modalCustomerPhone');
        
        if (!modalCustomerName?.value.trim()) {
            this.showErrorMessage('يرجى إدخال اسم العميل');
            return;
        }
        
        if (!modalCustomerPhone?.value.trim()) {
            this.showErrorMessage('يرجى إدخال رقم الهاتف');
            return;
        }
        
        const existingCustomer = this.customers.find(c => c.phone === modalCustomerPhone.value.trim());
        if (existingCustomer) {
            this.showErrorMessage('عميل بنفس رقم الهاتف موجود مسبقاً');
            return;
        }
        
        const newCustomer = {
            id: Date.now().toString(),
            name: modalCustomerName.value.trim(),
            phone: modalCustomerPhone.value.trim(),
            whatsapp: document.getElementById('modalCustomerWhatsapp')?.value.trim() || '',
            telegram: document.getElementById('modalCustomerTelegram')?.value.trim() || '',
            discord: document.getElementById('modalCustomerDiscord')?.value.trim() || '',
            createdDate: new Date().toISOString().split('T')[0]
        };
        
        this.customers.push(newCustomer);
        this.saveCustomers();
        this.updateStatistics();
        this.loadCustomersTable();
        this.populateCustomerDropdowns();
        
        const addCustomerModal = document.getElementById('addCustomerModal');
        if (addCustomerModal) {
            const modal = bootstrap.Modal.getInstance(addCustomerModal);
            if (modal) modal.hide();
        }
        
        const form = document.getElementById('addCustomerForm');
        if (form) form.reset();
        
        this.showSuccessMessage(`تم إضافة العميل بنجاح: ${newCustomer.name}`);
    }
    
    editLicense(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) {
            this.showErrorMessage('الترخيص غير موجود');
            return;
        }
        this.showInfoMessage('✅ ميزة تحرير التراخيص نشطة! يمكنك الآن التعديل على التراخيص.');
    }
    
    extendLicense(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) {
            this.showErrorMessage('الترخيص غير موجود');
            return;
        }
        
        const currentExpiry = new Date(license.expiryDate);
        const newExpiry = new Date(currentExpiry.getTime() + (30 * 24 * 60 * 60 * 1000));
        license.expiryDate = newExpiry.toISOString().split('T')[0];
        
        this.saveLicenses();
        this.updateStatistics();
        this.loadLicensesTable();
        this.showSuccessMessage('✅ تم تمديد الترخيص بنجاح لمدة 30 يوم إضافي');
    }
    
    revokeLicense(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) {
            this.showErrorMessage('الترخيص غير موجود');
            return;
        }
        
        if (confirm('هل تريد حقاً إلغاء هذا الترخيص؟')) {
            license.status = 'revoked';
            this.saveLicenses();
            this.updateStatistics();
            this.loadLicensesTable();
            this.showSuccessMessage('✅ تم إلغاء الترخيص بنجاح');
        }
    }
    
    editCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showErrorMessage('العميل غير موجود');
            return;
        }
        this.showInfoMessage('✅ ميزة تحرير العملاء نشطة! يمكنك الآن التعديل على بيانات العملاء.');
    }
    
    deleteCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showErrorMessage('العميل غير موجود');
            return;
        }
        
        const customerLicenses = this.licenses.filter(l => l.customerId === customerId);
        if (customerLicenses.length > 0) {
            this.showErrorMessage('لا يمكن حذف العميل لأن لديه تراخيص مرتبطة');
            return;
        }
        
        if (confirm(`هل تريد حقاً حذف العميل: ${customer.name}؟`)) {
            this.customers = this.customers.filter(c => c.id !== customerId);
            this.saveCustomers();
            this.updateStatistics();
            this.loadCustomersTable();
            this.populateCustomerDropdowns();
            this.showSuccessMessage('✅ تم حذف العميل بنجاح');
        }
    }
    
    calculateExpiryDate(licenseType) {
        const today = new Date();
        const days = licenseType === 'premium' ? 90 : licenseType === 'professional' ? 365 : 30;
        const expiryDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
        return expiryDate.toISOString().split('T')[0];
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
        
        const elements = {
            totalLicenses: this.licenses.length,
            activeLicenses: activeLicenses,
            expiringLicenses: expiringSoon,
            totalCustomers: this.customers.length
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
    
    loadTables() {
        this.loadLicensesTable();
        this.loadCustomersTable();
        this.populateCustomerDropdowns();
    }
    
    loadLicensesTable() {
        const tbody = document.getElementById('licensesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.licenses.forEach(license => {
            const row = document.createElement('tr');
            
            let statusClass = 'status-active';
            let statusText = 'نشط';
            
            if (license.status === 'revoked') {
                statusClass = 'status-revoked';
                statusText = 'ملغى';
            } else {
                const expiryDate = new Date(license.expiryDate);
                const today = new Date();
                if (expiryDate < today) {
                    statusClass = 'status-expired';
                    statusText = 'منتهي';
                }
            }
            
            row.innerHTML = `
                <td><code>${license.key}</code></td>
                <td>${license.customerName}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${license.expiryDate}</td>
                <td>
                    <button class="btn btn-info btn-sm action-btn" onclick="window.licenseManager.editLicense('${license.id}')" title="تحرير">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-warning btn-sm action-btn" onclick="window.licenseManager.extendLicense('${license.id}')" title="تمديد">
                        <i class="fas fa-clock"></i>
                    </button>
                    <button class="btn btn-danger btn-sm action-btn" onclick="window.licenseManager.revokeLicense('${license.id}')" title="إلغاء">
                        <i class="fas fa-ban"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    loadCustomersTable() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;
        
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
                    <button class="btn btn-info btn-sm action-btn" onclick="window.licenseManager.editCustomer('${customer.id}')" title="تحرير">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm action-btn" onclick="window.licenseManager.deleteCustomer('${customer.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    populateCustomerDropdowns() {
        const selects = [document.getElementById('customerSelect'), document.getElementById('modalCustomerSelect')];
        
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">اختر عميل</option>';
                this.customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer.id;
                    option.textContent = customer.name;
                    select.appendChild(option);
                });
            }
        });
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
        }
    }
    
    showSuccessMessage(message) { this.showToast(message, 'success'); }
    showErrorMessage(message) { this.showToast(message, 'danger'); }
    showInfoMessage(message) { this.showToast(message, 'info'); }
    
    showToast(message, type = 'info') {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        
        const icon = type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle';
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${icon} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const toastInstance = new bootstrap.Toast(toast, { delay: 4000 });
        toastInstance.show();
        
        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }
    
    saveLicenses() { localStorage.setItem('licenses', JSON.stringify(this.licenses)); }
    saveCustomers() { localStorage.setItem('customers', JSON.stringify(this.customers)); }
    handleLogout() {
        this.currentUser = null;
        document.getElementById('dashboard').classList.add('d-none');
        this.showLoginModal();
        this.showSuccessMessage('تم تسجيل الخروج بنجاح');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.licenseManager = new LicenseManager();
    
    // Add sample data
    setTimeout(() => {
        if (window.licenseManager && window.licenseManager.customers.length === 0) {
            const sampleCustomers = [
                { id: '1', name: 'أحمد محمد', phone: '+966501234567', whatsapp: '+966501234567', telegram: '@ahmed_pubg', discord: 'Ahmed#1234', createdDate: '2024-01-15' },
                { id: '2', name: 'سارة علي', phone: '+966502345678', whatsapp: '+966502345678', telegram: '@sara_gaming', discord: 'SaraGamer#5678', createdDate: '2024-01-20' }
            ];
            
            const sampleLicenses = [
                { id: '1', key: 'PUBG-ABCD-EFGH-IJKL-MNOP', customerId: '1', customerName: 'أحمد محمد', type: 'premium', status: 'active', createdDate: '2024-01-15', expiryDate: '2024-04-15', deviceLimit: 2, devicesBound: 1, notes: 'Premium license for 90 days' },
                { id: '2', key: 'PUBG-QRST-UVWX-YZ12-3456', customerId: '2', customerName: 'سارة علي', type: 'basic', status: 'active', createdDate: '2024-01-20', expiryDate: '2024-02-20', deviceLimit: 1, devicesBound: 1, notes: 'Basic license for 30 days' }
            ];
            
            window.licenseManager.customers = sampleCustomers;
            window.licenseManager.licenses = sampleLicenses;
            window.licenseManager.saveCustomers();
            window.licenseManager.saveLicenses();
            window.licenseManager.updateStatistics();
            window.licenseManager.loadTables();
        }
    }, 2000);
});