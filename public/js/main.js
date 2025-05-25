/**
 * TikTok Downloader Pro - Main JavaScript
 * ============================================================================
 */

// Global configuration
const AppConfig = {
    apiBaseUrl: '/api',
    authBaseUrl: '/auth',
    maxRetries: 3,
    retryDelay: 1000,
    defaultTimeout: 30000
};

// Global utilities
const Utils = {
    // Show loading overlay
    showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        if (overlay) {
            if (loadingText) loadingText.textContent = text;
            overlay.classList.remove('d-none');
        }
    },

    // Hide loading overlay
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('d-none');
        }
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Format number with commas
    formatNumber(num) {
        if (!num) return '0';
        return new Intl.NumberFormat().format(num);
    },

    // Format date
    formatDate(date, options = {}) {
        if (!date) return '';
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    },

    // Format duration
    formatDuration(seconds) {
        if (!seconds) return '00:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    // Truncate text
    truncateText(text, maxLength = 100) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Get CSRF token
    getCSRFToken() {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    },

    // Validate TikTok URL
    isValidTikTokUrl(url) {
        const patterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
            /https?:\/\/(?:www\.)?tiktok\.com\/t\/(\w+)/,
            /https?:\/\/vm\.tiktok\.com\/(\w+)/,
            /https?:\/\/(?:www\.)?tiktok\.com\/\S+/
        ];
        return patterns.some(pattern => pattern.test(url));
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
            return true;
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            this.showToast('Failed to copy to clipboard', 'error');
            return false;
        }
    },

    // Show toast notification
    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = this.getOrCreateToastContainer();
        const toast = this.createToast(message, type);
        toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // Get or create toast container
    getOrCreateToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        return container;
    },

    // Create toast element
    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${this.getBootstrapColorClass(type)} border-0`;
        toast.setAttribute('role', 'alert');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas ${this.getIconClass(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        return toast;
    },

    // Get Bootstrap color class
    getBootstrapColorClass(type) {
        const colorMap = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'info'
        };
        return colorMap[type] || 'info';
    },

    // Get icon class
    getIconClass(type) {
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return iconMap[type] || 'fa-info-circle';
    }
};

// HTTP Client with retry logic
const HttpClient = {
    async request(url, options = {}) {
        const defaultOptions = {
            timeout: AppConfig.defaultTimeout,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': Utils.getCSRFToken()
            }
        };

        const config = { ...defaultOptions, ...options };
        
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        config.signal = controller.signal;

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    },

    async post(url, data, options = {}) {
        const config = { ...options, method: 'POST' };
        
        if (data instanceof FormData) {
            // Don't set Content-Type for FormData, let browser handle it
            const headers = { ...config.headers };
            delete headers['Content-Type'];
            config.headers = headers;
            config.body = data;
        } else {
            config.body = JSON.stringify(data);
        }
        
        return this.request(url, config);
    },

    async put(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }
};

// Authentication Manager
const AuthManager = {
    currentUser: null,

    async checkAuth() {
        try {
            const response = await HttpClient.get(`${AppConfig.authBaseUrl}/check`);
            if (response.authenticated) {
                this.currentUser = response.user;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    },

    async logout() {
        try {
            await HttpClient.post(`${AppConfig.authBaseUrl}/logout`);
            this.currentUser = null;
            window.location.href = '/auth/login';
        } catch (error) {
            console.error('Logout failed:', error);
            Utils.showToast('Logout failed', 'error');
        }
    },

    isAuthenticated() {
        return !!this.currentUser;
    },

    isAdmin() {
        return this.currentUser?.role === 'admin';
    }
};

// Profile Manager
const ProfileManager = {
    async loadProfile() {
        try {
            const response = await HttpClient.get(`${AppConfig.authBaseUrl}/profile`);
            if (response.success) {
                return response.data;
            }
            throw new Error(response.message);
        } catch (error) {
            console.error('Failed to load profile:', error);
            throw error;
        }
    },

    async updateProfile(profileData) {
        try {
            const response = await HttpClient.put(`${AppConfig.authBaseUrl}/profile`, profileData);
            if (response.success) {
                Utils.showToast('Profile updated successfully', 'success');
                return true;
            }
            throw new Error(response.message);
        } catch (error) {
            console.error('Failed to update profile:', error);
            Utils.showToast(error.message || 'Failed to update profile', 'error');
            return false;
        }
    },

    async changePassword(passwordData) {
        try {
            const response = await HttpClient.post(`${AppConfig.authBaseUrl}/change-password`, passwordData);
            if (response.success) {
                Utils.showToast('Password changed successfully', 'success');
                return true;
            }
            throw new Error(response.message);
        } catch (error) {
            console.error('Failed to change password:', error);
            Utils.showToast(error.message || 'Failed to change password', 'error');
            return false;
        }
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('TikTok Downloader Pro - Initializing...');
    
    // Check authentication
    await AuthManager.checkAuth();
    
    // Initialize global event listeners
    initializeGlobalEventListeners();
    
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize modals
    initializeModals();
    
    console.log('TikTok Downloader Pro - Ready!');
});

function initializeGlobalEventListeners() {
    // Logout buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('[href="/auth/logout"]') || e.target.closest('[href="/auth/logout"]')) {
            e.preventDefault();
            confirmLogout();
        }
    });

    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => showProfileModal());
    }

    // Change password button
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => showChangePasswordModal());
    }

    // Auto-dismiss alerts after 5 seconds
    document.querySelectorAll('.alert-dismissible').forEach(alert => {
        setTimeout(() => {
            const closeBtn = alert.querySelector('.btn-close');
            if (closeBtn) closeBtn.click();
        }, 5000);
    });

    // Form validation
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.classList.contains('needs-validation')) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        }
    });
}

function initializeTooltips() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function initializeModals() {
    // Profile modal form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }

    // Change password modal form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePasswordSubmit);
    }
}

function confirmLogout() {
    Swal.fire({
        title: 'Logout Confirmation',
        text: 'Are you sure you want to log out?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            AuthManager.logout();
        }
    });
}

async function showProfileModal() {
    try {
        Utils.showLoading('Loading profile...');
        const profileData = await ProfileManager.loadProfile();
        
        // Populate form
        document.getElementById('profileUsername').value = profileData.user.username;
        document.getElementById('profileEmail').value = profileData.user.email;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('profileModal'));
        modal.show();
        
    } catch (error) {
        Utils.showToast('Failed to load profile', 'error');
    } finally {
        Utils.hideLoading();
    }
}

function showChangePasswordModal() {
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modal.show();
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = {
        username: formData.get('username'),
        email: formData.get('email')
    };
    
    const success = await ProfileManager.updateProfile(profileData);
    if (success) {
        bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
        // Refresh page to update navbar
        setTimeout(() => window.location.reload(), 1000);
    }
}

async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const passwordData = {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmNewPassword')
    };
    
    // Validate password confirmation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        Utils.showToast('New passwords do not match', 'error');
        return;
    }
    
    const success = await ProfileManager.changePassword(passwordData);
    if (success) {
        bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
        e.target.reset();
    }
}

// Export globals
window.Utils = Utils;
window.HttpClient = HttpClient;
window.AuthManager = AuthManager;
window.ProfileManager = ProfileManager;