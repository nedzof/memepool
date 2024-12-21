// Base modal functionality
export class Modal {
    constructor(modalId) {
        this.modalId = modalId;
        this.modal = document.getElementById(modalId);
        if (this.modal) {
            this.setupBaseClasses();
            this.setupEventListeners();
        }
    }

    setupBaseClasses() {
        if (!this.modal.classList.contains('modal')) {
            this.modal.classList.add('modal');
        }

        // Setup backdrop if it doesn't exist
        let backdrop = this.modal.querySelector('.modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            this.modal.insertBefore(backdrop, this.modal.firstChild);
        }

        // Setup modal content if it doesn't exist
        let content = this.modal.querySelector('.modal-content');
        if (!content) {
            content = document.createElement('div');
            content.className = 'modal-content';
            
            // Move all other elements into content
            while (this.modal.children.length > 1) {
                content.appendChild(this.modal.children[1]);
            }
            this.modal.appendChild(content);
        }
    }

    setupEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Back button
        const backBtn = this.modal.querySelector('.back-to-menu');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.hide();
                showModal('mainWalletModal');
            });
        }

        // Password visibility toggle
        const toggleBtns = this.modal.querySelectorAll('[id$="PasswordVisibility"]');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => this.togglePasswordVisibility(btn));
        });

        // Handle click outside modal to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    togglePasswordVisibility(btn) {
        const input = btn.parentElement.querySelector('input[type="password"]');
        if (input) {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            
            // Update icon
            btn.innerHTML = type === 'password' ? 
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>' :
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>';
        }
    }

    show() {
        this.modal.classList.remove('hidden');
        this.modal.style.display = 'flex';
        // Use requestAnimationFrame to ensure display change is applied before adding classes
        requestAnimationFrame(() => {
            this.modal.classList.add('open');
            this.modal.classList.remove('modal-exit');
        });
    }

    hide() {
        this.modal.classList.remove('open');
        this.modal.classList.add('modal-exit');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.modal.style.display = 'none';
        }, 300); // Match the CSS transition duration
    }
}

// Modal management
const modals = new Map();

export function initializeModal(modalId) {
    if (!modals.has(modalId)) {
        modals.set(modalId, new Modal(modalId));
    }
    return modals.get(modalId);
}

export function showModal(modalId) {
    const modal = initializeModal(modalId);
    modal.show();
}

export function hideModal(modalId) {
    const modal = modals.get(modalId);
    if (modal) {
        modal.hide();
    }
}

// Error message display
export function showError(message, duration = 3000) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-[100002]';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Animate in
    errorDiv.style.opacity = '0';
    errorDiv.style.transform = 'translateY(-20px)';
    requestAnimationFrame(() => {
        errorDiv.style.transition = 'all 0.3s ease';
        errorDiv.style.opacity = '1';
        errorDiv.style.transform = 'translateY(0)';
    });

    // Remove after duration
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateY(-20px)';
        setTimeout(() => errorDiv.remove(), 300);
    }, duration);
}

// Initialize all modals on page load
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        initializeModal(modal.id);
    });
}); 