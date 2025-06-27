// Global App Functions
class NanoChipApp {
    constructor() {
        this.currentUser = null;
        this.data = { clients: [], expenses: [], revenues: [] };
        this.init();
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
        this.updateActiveNavigation();
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/user');
            if (response.ok) {
                this.currentUser = await response.json();
                this.updateUserInfo();
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات المستخدم:', error);
        }
    }

    async loadData() {
        try {
            const response = await fetch('/api/data');
            if (response.ok) {
                this.data = await response.json();
                return this.data;
            }
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            return { clients: [], expenses: [], revenues: [] };
        }
    }

    updateUserInfo() {
        const userNameElements = document.querySelectorAll('.user-name');
        const userAvatarElements = document.querySelectorAll('.user-avatar');
        
        if (this.currentUser) {
            userNameElements.forEach(el => {
                el.textContent = this.currentUser.name || 'المستخدم';
            });
            
            userAvatarElements.forEach(el => {
                el.textContent = (this.currentUser.name || 'المستخدم').charAt(0);
            });
        }
    }

    setupEventListeners() {
        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                sidebarOverlay.classList.toggle('active');
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.logout.bind(this));
        }

        // Close sidebar on navigation
        const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }
            });
        });
    }

    updateActiveNavigation() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.sidebar-nav a, .bottom-nav-item');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === currentPath || (currentPath === '/' && href === '/dashboard')) {
                link.classList.add('active');
            }
        });
    }

    async logout() {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
    }

    showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} fade-in`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Find a container to append the alert
        const container = document.querySelector('.main-content') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    getClientName(clientId) {
        const client = this.data.clients.find(c => c.clientId === clientId);
        return client ? client.name : 'عميل غير معروف';
    }

    // Form validation helpers
    validateForm(formElement) {
        const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                this.showFieldError(input, 'هذا الحقل مطلوب');
                isValid = false;
            } else {
                this.clearFieldError(input);
            }
        });
        
        return isValid;
    }

    showFieldError(input, message) {
        this.clearFieldError(input);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = 'color: var(--danger-color); font-size: 0.8rem; margin-top: 5px;';
        errorDiv.textContent = message;
        
        input.style.borderColor = 'var(--danger-color)';
        input.parentNode.appendChild(errorDiv);
    }

    clearFieldError(input) {
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        input.style.borderColor = '';
    }

    // Loading states
    showLoading(button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="loading"></div>';
        button.disabled = true;
        button.dataset.originalText = originalText;
    }

    hideLoading(button) {
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        button.disabled = false;
    }

    // Local storage helpers
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('خطأ في حفظ البيانات محلياً:', error);
        }
    }

    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('خطأ في تحميل البيانات محلياً:', error);
            return null;
        }
    }

    // Animation helpers
    animateValue(element, start, end, duration = 1000) {
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (end - start) * this.easeOutCubic(progress);
            element.textContent = Math.round(current).toLocaleString('ar-EG');
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Search and filter helpers
    filterTable(tableId, searchTerm, columns = []) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr');
        const term = searchTerm.toLowerCase();
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let found = false;
            
            if (columns.length === 0) {
                // Search all columns
                found = Array.from(cells).some(cell => 
                    cell.textContent.toLowerCase().includes(term)
                );
            } else {
                // Search specific columns
                found = columns.some(colIndex => 
                    cells[colIndex] && cells[colIndex].textContent.toLowerCase().includes(term)
                );
            }
            
            row.style.display = found ? '' : 'none';
        });
    }

    // Date range helpers
    getDateRange(period) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (period) {
            case 'today':
                return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
            case 'week':
                const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                return { start: weekStart, end: now };
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return { start: monthStart, end: now };
            case 'year':
                const yearStart = new Date(now.getFullYear(), 0, 1);
                return { start: yearStart, end: now };
            default:
                return { start: new Date(0), end: now };
        }
    }

    filterDataByDateRange(data, dateRange) {
        return data.filter(item => {
            const itemDate = new Date(item.createdAt);
            return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });
    }

    // Professional Confirmation Dialog
    showConfirmationDialog(options) {
        return new Promise((resolve) => {
            // Create dialog HTML
            const dialogHTML = `
                <div class="confirmation-dialog-overlay" id="confirmationDialog">
                    <div class="confirmation-dialog">
                        <div class="confirmation-dialog-header ${options.type === 'success' ? 'confirmation-dialog-success' : ''}">
                            <div class="confirmation-dialog-icon">
                                <i class="fas fa-${options.icon || 'exclamation-triangle'}"></i>
                            </div>
                            <div class="confirmation-dialog-title">${options.title}</div>
                            <div class="confirmation-dialog-subtitle">${options.subtitle || ''}</div>
                        </div>
                        <div class="confirmation-dialog-body">
                            <div class="confirmation-dialog-message">${options.message}</div>
                            ${options.itemInfo ? `
                                <div class="confirmation-dialog-item-info">
                                    <div class="confirmation-dialog-item-name">${options.itemInfo.name}</div>
                                    <div class="confirmation-dialog-item-details">${options.itemInfo.details}</div>
                                </div>
                            ` : ''}
                            <div class="confirmation-dialog-actions">
                                <button class="confirmation-dialog-btn confirmation-dialog-btn-cancel" id="confirmDialogCancel">
                                    <i class="fas fa-times"></i>
                                    ${options.cancelText || 'إلغاء'}
                                </button>
                                <button class="confirmation-dialog-btn confirmation-dialog-btn-confirm" id="confirmDialogConfirm">
                                    <i class="fas fa-${options.confirmIcon || 'trash'}"></i>
                                    ${options.confirmText || 'تأكيد'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add to DOM
            document.body.insertAdjacentHTML('beforeend', dialogHTML);
            const overlay = document.getElementById('confirmationDialog');
            const cancelBtn = document.getElementById('confirmDialogCancel');
            const confirmBtn = document.getElementById('confirmDialogConfirm');

            // Show dialog with animation
            setTimeout(() => {
                overlay.classList.add('active');
            }, 10);

            // Handle cancel
            const handleCancel = () => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                    resolve(false);
                }, 300);
            };

            // Handle confirm
            const handleConfirm = async () => {
                confirmBtn.classList.add('loading');
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحذف...';
                
                try {
                    const result = await options.onConfirm();
                    
                    if (result) {
                        // Success animation
                        const header = overlay.querySelector('.confirmation-dialog-header');
                        const icon = overlay.querySelector('.confirmation-dialog-icon i');
                        const title = overlay.querySelector('.confirmation-dialog-title');
                        
                        header.classList.add('confirmation-dialog-success');
                        icon.className = 'fas fa-check';
                        title.textContent = 'تم الحذف بنجاح!';
                        
                        confirmBtn.classList.remove('loading');
                        confirmBtn.innerHTML = '<i class="fas fa-check"></i> تم!';
                        confirmBtn.style.background = 'var(--gradient-success)';
                        
                        setTimeout(() => {
                            overlay.classList.remove('active');
                            setTimeout(() => {
                                overlay.remove();
                                resolve(true);
                            }, 300);
                        }, 1500);
                    } else {
                        confirmBtn.classList.remove('loading');
                        confirmBtn.innerHTML = `<i class="fas fa-${options.confirmIcon || 'trash'}"></i> ${options.confirmText || 'تأكيد'}`;
                        resolve(false);
                    }
                } catch (error) {
                    confirmBtn.classList.remove('loading');
                    confirmBtn.innerHTML = `<i class="fas fa-${options.confirmIcon || 'trash'}"></i> ${options.confirmText || 'تأكيد'}`;
                    console.error('خطأ في الحذف:', error);
                    resolve(false);
                }
            };

            // Event listeners
            cancelBtn.addEventListener('click', handleCancel);
            confirmBtn.addEventListener('click', handleConfirm);
            
            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    handleCancel();
                }
            });

            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NanoChipApp();
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}