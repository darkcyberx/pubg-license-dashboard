// Enhanced Security Configuration for PUBG License Dashboard
class SecurityManager {
    constructor() {
        this.config = {
            // Security settings
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000, // 15 minutes
            sessionTimeout: 60 * 60 * 1000, // 1 hour
            passwordMinLength: 8,
            
            // Rate limiting
            apiCallLimit: 100,
            apiTimeWindow: 60 * 1000, // 1 minute
            
            // Security headers
            enableCSP: true,
            enableXSSProtection: true,
            enableFrameOptions: true
        };
        
        this.failedAttempts = new Map();
        this.sessionData = new Map();
        this.apiCalls = new Map();
        
        this.init();
    }
    
    init() {
        this.setupSecurityHeaders();
        this.setupInputSanitization();
        this.setupSessionManagement();
        this.setupCSRFProtection();
        this.loadSecurityState();
    }
    
    // Setup security headers
    setupSecurityHeaders() {
        if (this.config.enableCSP) {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = "default-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
                          "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
                          "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
                          "img-src 'self' data: https:; " +
                          "font-src 'self' https://cdnjs.cloudflare.com; " +
                          "connect-src 'self';";
            document.head.appendChild(meta);
        }
        
        if (this.config.enableXSSProtection) {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'X-XSS-Protection';
            meta.content = '1; mode=block';
            document.head.appendChild(meta);
        }
        
        if (this.config.enableFrameOptions) {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'X-Frame-Options';
            meta.content = 'DENY';
            document.head.appendChild(meta);
        }
    }
    
    // Input sanitization
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    }
    
    // Validate input patterns
    validateInput(input, type) {
        const patterns = {
            username: /^[a-zA-Z0-9_-]{3,20}$/,
            password: /^.{8,}$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[+]?[\d\s-()]{10,20}$/,
            licenseKey: /^[A-Z0-9-]{20,25}$/,
            customerName: /^[a-zA-Z\s\u0600-\u06FF]{2,50}$/ // Supports Arabic
        };
        
        return patterns[type] ? patterns[type].test(input) : true;
    }
    
    // Enhanced authentication with rate limiting
    checkLoginAttempt(username, ip = 'unknown') {
        const key = `${username}_${ip}`;
        const now = Date.now();
        
        // Check if user is locked out
        const attempts = this.failedAttempts.get(key);
        if (attempts && attempts.count >= this.config.maxLoginAttempts) {
            const timeSinceLastAttempt = now - attempts.lastAttempt;
            if (timeSinceLastAttempt < this.config.lockoutDuration) {
                const remainingTime = Math.ceil((this.config.lockoutDuration - timeSinceLastAttempt) / 60000);
                throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
            } else {
                // Reset attempts after lockout period
                this.failedAttempts.delete(key);
            }
        }
        
        return true;
    }
    
    recordFailedAttempt(username, ip = 'unknown') {
        const key = `${username}_${ip}`;
        const now = Date.now();
        const attempts = this.failedAttempts.get(key) || { count: 0, lastAttempt: 0 };
        
        attempts.count++;
        attempts.lastAttempt = now;
        this.failedAttempts.set(key, attempts);
        
        // Save to localStorage for persistence
        this.saveSecurityState();
        
        console.warn(`Failed login attempt for ${username} from ${ip}. Count: ${attempts.count}`);
    }
    
    recordSuccessfulLogin(username, ip = 'unknown') {
        const key = `${username}_${ip}`;
        this.failedAttempts.delete(key);
        this.saveSecurityState();
    }
    
    // Session management
    setupSessionManagement() {
        // Check for existing session
        const sessionId = localStorage.getItem('sessionId');
        const sessionStart = localStorage.getItem('sessionStart');
        
        if (sessionId && sessionStart) {
            const elapsed = Date.now() - parseInt(sessionStart);
            if (elapsed > this.config.sessionTimeout) {
                this.clearSession();
            }
        }
        
        // Setup session timeout check
        setInterval(() => {
            this.checkSessionTimeout();
        }, 60000); // Check every minute
    }
    
    createSession(username) {
        const sessionId = this.generateSecureToken();
        const sessionStart = Date.now().toString();
        
        localStorage.setItem('sessionId', sessionId);
        localStorage.setItem('sessionStart', sessionStart);
        localStorage.setItem('currentUser', username);
        
        return sessionId;
    }
    
    checkSessionTimeout() {
        const sessionStart = localStorage.getItem('sessionStart');
        if (sessionStart) {
            const elapsed = Date.now() - parseInt(sessionStart);
            if (elapsed > this.config.sessionTimeout) {
                this.clearSession();
                if (window.licenseManager) {
                    window.licenseManager.handleLogout();
                    window.licenseManager.showToast('Session expired. Please login again.', 'warning');
                }
            }
        }
    }
    
    clearSession() {
        localStorage.removeItem('sessionId');
        localStorage.removeItem('sessionStart');
        localStorage.removeItem('currentUser');
    }
    
    // CSRF Protection
    setupCSRFProtection() {
        this.csrfToken = this.generateSecureToken();
        
        // Add CSRF token to all forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = this.csrfToken;
            form.appendChild(csrfInput);
        });
    }
    
    validateCSRFToken(token) {
        return token === this.csrfToken;
    }
    
    // Rate limiting for API calls
    checkRateLimit(endpoint, ip = 'unknown') {
        const key = `${endpoint}_${ip}`;
        const now = Date.now();
        const calls = this.apiCalls.get(key) || [];
        
        // Remove old calls outside time window
        const validCalls = calls.filter(timestamp => now - timestamp < this.config.apiTimeWindow);
        
        if (validCalls.length >= this.config.apiCallLimit) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        validCalls.push(now);
        this.apiCalls.set(key, validCalls);
        
        return true;
    }
    
    // Secure token generation
    generateSecureToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const randomArray = new Uint8Array(length);
        crypto.getRandomValues(randomArray);
        
        randomArray.forEach(byte => {
            result += chars[byte % chars.length];
        });
        
        return result;
    }
    
    // Password security
    validatePasswordStrength(password) {
        const checks = {
            length: password.length >= this.config.passwordMinLength,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const score = Object.values(checks).filter(Boolean).length;
        
        return {
            isValid: checks.length && score >= 3,
            score: score,
            checks: checks,
            strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'
        };
    }
    
    // Hash password (simple client-side hashing)
    async hashPassword(password, salt = null) {
        if (!salt) {
            salt = this.generateSecureToken(16);
        }
        
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return { hash: hashHex, salt: salt };
    }
    
    // Data encryption for sensitive information
    async encryptData(data, key = null) {
        if (!key) {
            key = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
        }
        
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encodedData
        );
        
        return {
            encrypted: Array.from(new Uint8Array(encryptedData)),
            iv: Array.from(iv),
            key: await crypto.subtle.exportKey('raw', key)
        };
    }
    
    // Input validation middleware
    validateFormData(formData, rules) {
        const errors = [];
        
        for (const [field, value] of Object.entries(formData)) {
            const rule = rules[field];
            if (!rule) continue;
            
            // Required field check
            if (rule.required && (!value || value.trim() === '')) {
                errors.push(`${field} is required`);
                continue;
            }
            
            // Pattern validation
            if (value && rule.pattern && !this.validateInput(value, rule.pattern)) {
                errors.push(`${field} format is invalid`);
            }
            
            // Length validation
            if (value && rule.minLength && value.length < rule.minLength) {
                errors.push(`${field} must be at least ${rule.minLength} characters`);
            }
            
            if (value && rule.maxLength && value.length > rule.maxLength) {
                errors.push(`${field} must be no more than ${rule.maxLength} characters`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // Security state persistence
    saveSecurityState() {
        const state = {
            failedAttempts: Array.from(this.failedAttempts.entries()),
            timestamp: Date.now()
        };
        
        localStorage.setItem('securityState', JSON.stringify(state));
    }
    
    loadSecurityState() {
        try {
            const state = JSON.parse(localStorage.getItem('securityState') || '{}');
            if (state.failedAttempts) {
                this.failedAttempts = new Map(state.failedAttempts);
            }
        } catch (error) {
            console.warn('Failed to load security state:', error);
        }
    }
    
    // Security audit logging
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.log('Security Event:', logEntry);
        
        // Store in localStorage for audit trail
        const auditLog = JSON.parse(localStorage.getItem('securityAuditLog') || '[]');
        auditLog.push(logEntry);
        
        // Keep only last 100 entries
        if (auditLog.length > 100) {
            auditLog.splice(0, auditLog.length - 100);
        }
        
        localStorage.setItem('securityAuditLog', JSON.stringify(auditLog));
    }
    
    // Get security audit log
    getAuditLog() {
        return JSON.parse(localStorage.getItem('securityAuditLog') || '[]');
    }
    
    // Clear audit log
    clearAuditLog() {
        localStorage.removeItem('securityAuditLog');
    }
}

// Initialize security manager
window.securityManager = new SecurityManager();