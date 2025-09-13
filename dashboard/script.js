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
        
        // Refresh buttons with null checks
        const refreshLicenses = document.getElementById('refreshLicenses');
        if (refreshLicenses) {
            refreshLicenses.addEventListener('click', () => {
                this.loadLicensesTable();
            });
        }
        
        const refreshCustomers = document.getElementById('refreshCustomers');
        if (refreshCustomers) {
            refreshCustomers.addEventListener('click', () => {
                this.loadCustomersTable();
            });
        }
        
        // Setup optional event listeners for elements that may not exist
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
            }},
            { id: 'saveSettings', event: 'click', handler: () => this.saveSettings() },
            { id: 'exportData', event: 'click', handler: () => this.exportData() },
            { id: 'importData', event: 'click', handler: () => this.importData() },
            { id: 'clearData', event: 'click', handler: () => this.clearAllData() },
            { id: 'licenseType', event: 'change', handler: (e) => this.updateExpiryDate(e.target.value) }
        ];
        
        elements.forEach(({ id, event, handler }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            }
        });
    }
    
    handleLogin() {
        console.log('🔐 محاولة تسجيل دخول جديدة'); // Debug log
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        console.log('👤 اسم المستخدم المدخل:', username);
        console.log('🔑 اسم المستخدم المطلوب:', this.adminCredentials.username);
        
        try {
            // التحقق من صحة بيانات الدخول
            if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
                console.log('✅ بيانات الدخول صحيحة، جاري تسجيل الدخول...');
                
                this.currentUser = username;
                const currentUserElement = document.getElementById('currentUser');
                if (currentUserElement) {
                    currentUserElement.textContent = username;
                }
                
                // إخفاء نافذة تسجيل الدخول
                const loginModalElement = document.getElementById('loginModal');
                const loginModal = bootstrap.Modal.getInstance(loginModalElement);
                if (loginModal) {
                    loginModal.hide();
                }
                
                // إخفاء النافذة بالقوة في حالة عدم عمل الطريقة العادية
                if (loginModalElement) {
                    loginModalElement.style.display = 'none';
                    loginModalElement.classList.remove('show');
                    document.body.classList.remove('modal-open');
                    
                    // إزالة الخلفية المعتمة
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) {
                        backdrop.remove();
                    }
                }
                
                // إظهار لوحة التحكم
                const dashboardElement = document.getElementById('dashboard');
                if (dashboardElement) {
                    dashboardElement.classList.remove('d-none');
                    console.log('🎯 تم إظهار لوحة التحكم بنجاح');
                }
                
                // مسح نموذج تسجيل الدخول
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.reset();
                }
                
                const loginError = document.getElementById('loginError');
                if (loginError) {
                    loginError.classList.add('d-none');
                }
                
                this.showSuccessMessage('🎉 تم تسجيل الدخول بنجاح!');
                
                // تحديث البيانات
                this.updateStatistics();
                this.loadTables();
                
            } else {
                console.log('❌ بيانات دخول خاطئة');
                throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
            }
        } catch (error) {
            console.error('🚫 خطأ في تسجيل الدخول:', error);
            this.showLoginError(error.message);
        }
    }
    
    handleLogout() {
        this.currentUser = null;
        document.getElementById('dashboard').classList.add('d-none');
        this.showLoginModal();
        this.showSuccessMessage('تم تسجيل الخروج بنجاح');
    }
    
    showLoginModal() {
        console.log('🔓 إظهار نافذة تسجيل الدخول');
        
        // إخفاء الداش بورد فوراً
        const dashboardElement = document.getElementById('dashboard');
        if (dashboardElement) {
            dashboardElement.classList.add('d-none');
        }
        
        // إظهار نافذة تسجيل الدخول فوراً
        const loginModalElement = document.getElementById('loginModal');
        if (!loginModalElement) {
            console.error('❌ عنصر نافذة تسجيل الدخول غير موجود');
            return;
        }
        
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
            const usernameField = document.getElementById('username');
            if (usernameField) {
                usernameField.focus();
            }
        }, { once: true });
        
        // مسح أي رسائل خطأ سابقة
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.classList.add('d-none');
        }
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.reset();
        }
        
        console.log('✅ تم إظهار نافذة تسجيل الدخول');
    }
    
    showLoginError(message) {
        const loginErrorMessage = document.getElementById('loginErrorMessage');
        const loginError = document.getElementById('loginError');
        
        if (loginErrorMessage) {
            loginErrorMessage.textContent = message;
        }
        if (loginError) {
            loginError.classList.remove('d-none');
        }
        
        console.log('🚫 عرض رسالة خطأ:', message);
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
        
        const elements = {
            totalLicenses: this.licenses.length,
            activeLicenses: activeLicenses,
            expiringLicenses: expiringSoon,
            totalCustomers: this.customers.length
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
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
            
            // تحديد حالة الترخيص
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
                    <button class="btn btn-info btn-sm action-btn" onclick="alert('تحرير الترخيص قريباً')" title="تحرير">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-warning btn-sm action-btn" onclick="alert('تمديد الترخيص قريباً')" title="تمديد">
                        <i class="fas fa-clock"></i>
                    </button>
                    <button class="btn btn-danger btn-sm action-btn" onclick="alert('إلغاء الترخيص قريباً')" title="إلغاء">
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
                    <button class="btn btn-info btn-sm action-btn" onclick="alert('تحرير العميل قريباً')" title="تحرير">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm action-btn" onclick="alert('حذف العميل قريباً')" title="حذف">
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
        // إنشاء حاوية الإشعارات إذا لم تكن موجودة
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        // إنشاء الإشعار
        const toastId = `toast_${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = toastId;
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
        
        // إزالة الإشعار بعد إخفائه
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
    
    saveLicenses() {
        localStorage.setItem('licenses', JSON.stringify(this.licenses));
    }
    
    saveCustomers() {
        localStorage.setItem('customers', JSON.stringify(this.customers));
    }
    
    // وظائف أساسية للتبويبات والمميزات
    handleTabChange(target) {
        console.log('📋 تغيير التبويب إلى:', target);
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
            default:
                break;
        }
    }
    
    // وظائف مؤقتة للمميزات المستقبلية
    createLicense() { this.showInfoMessage('ميزة إنشاء التراخيص ستكون متاحة قريباً'); }
    addLicense() { this.showInfoMessage('ميزة إضافة التراخيص ستكون متاحة قريباً'); }
    addCustomer() { this.showInfoMessage('ميزة إضافة العملاء ستكون متاحة قريباً'); }
    updateExpiryDate() { console.log('تحديث تاريخ انتهاء الصلاحية'); }
    editLicense() { this.showInfoMessage('ميزة تحرير التراخيص ستكون متاحة قريباً'); }
    extendLicense() { this.showInfoMessage('ميزة تمديد التراخيص ستكون متاحة قريباً'); }
    revokeLicense() { this.showInfoMessage('ميزة إلغاء التراخيص ستكون متاحة قريباً'); }
    editCustomer() { this.showInfoMessage('ميزة تحرير العملاء ستكون متاحة قريباً'); }
    deleteCustomer() { this.showInfoMessage('ميزة حذف العملاء ستكون متاحة قريباً'); }
    loadSettings() { console.log('تحميل الإعدادات'); }
    saveSettings() { this.showInfoMessage('ميزة حفظ الإعدادات ستكون متاحة قريباً'); }
    exportData() { this.showInfoMessage('ميزة تصدير البيانات ستكون متاحة قريباً'); }
    importData() { this.showInfoMessage('ميزة استيراد البيانات ستكون متاحة قريباً'); }
    clearAllData() { this.showInfoMessage('ميزة مسح جميع البيانات ستكون متاحة قريباً'); }
}

// تهيئة مدير التراخيص عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 بدء تحميل نظام إدارة تراخيص PUBG');
    window.licenseManager = new LicenseManager();
    
    // إضافة بيانات تجريبية بعد فترة قصيرة
    setTimeout(() => {
        if (window.licenseManager && window.licenseManager.customers.length === 0) {
            console.log('📦 إضافة بيانات تجريبية...');
            
            // إضافة عملاء تجريبيين
            const sampleCustomers = [
                {
                    id: '1',
                    name: 'أحمد محمد',
                    phone: '+966501234567',
                    whatsapp: '+966501234567',
                    telegram: '@ahmed_pubg',
                    discord: 'Ahmed#1234',
                    createdDate: '2024-01-15'
                },
                {
                    id: '2',
                    name: 'سارة علي',
                    phone: '+966502345678',
                    whatsapp: '+966502345678',
                    telegram: '@sara_gaming',
                    discord: 'SaraGamer#5678',
                    createdDate: '2024-01-20'
                },
                {
                    id: '3',
                    name: 'محمد خالد',
                    phone: '+966503456789',
                    whatsapp: '+966503456789',
                    telegram: '@mohamed_pubg',
                    discord: 'Mohamed#9876',
                    createdDate: '2024-02-01'
                }
            ];
            
            window.licenseManager.customers = sampleCustomers;
            window.licenseManager.saveCustomers();
            
            // إضافة تراخيص تجريبية
            const sampleLicenses = [
                {
                    id: '1',
                    key: 'PUBG-ABCD-EFGH-IJKL-MNOP',
                    customerId: '1',
                    customerName: 'أحمد محمد',
                    type: 'premium',
                    status: 'active',
                    createdDate: '2024-01-15',
                    expiryDate: '2024-04-15',
                    deviceLimit: 2,
                    devicesBound: 1,
                    notes: 'ترخيص مميز لمدة 90 يوم'
                },
                {
                    id: '2',
                    key: 'PUBG-QRST-UVWX-YZ12-3456',
                    customerId: '2',
                    customerName: 'سارة علي',
                    type: 'basic',
                    status: 'active',
                    createdDate: '2024-01-20',
                    expiryDate: '2024-02-20',
                    deviceLimit: 1,
                    devicesBound: 1,
                    notes: 'ترخيص أساسي لمدة 30 يوم'
                },
                {
                    id: '3',
                    key: 'PUBG-WXYZ-1234-ABCD-5678',
                    customerId: '3',
                    customerName: 'محمد خالد',
                    type: 'professional',
                    status: 'active',
                    createdDate: '2024-02-01',
                    expiryDate: '2025-02-01',
                    deviceLimit: 5,
                    devicesBound: 3,
                    notes: 'ترخيص احترافي لمدة سنة كاملة'
                }
            ];
            
            window.licenseManager.licenses = sampleLicenses;
            window.licenseManager.saveLicenses();
            
            window.licenseManager.updateStatistics();
            window.licenseManager.loadTables();
            
            console.log('✅ تم تحميل البيانات التجريبية بنجاح');
        }
    }, 2000);
});