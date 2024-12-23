// Base modal functionality
export class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        if (!this.modal) {
            console.error(`Modal with id ${modalId} not found`);
            return;
        }

        // Create backdrop if it doesn't exist
        this.backdrop = document.querySelector('.modal-backdrop');
        if (!this.backdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'modal-backdrop';
            document.body.appendChild(this.backdrop);
        }

        // Ensure modal is centered
        this.centerModal();
        window.addEventListener('resize', () => this.centerModal());

        // Set up close button handlers
        const closeButtons = this.modal.querySelectorAll('.modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.hide());
        });

        // Close on backdrop click
        this.backdrop.addEventListener('click', (e) => {
            if (e.target === this.backdrop) {
                this.hide();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Handle password visibility toggle
        const toggleButtons = this.modal.querySelectorAll('.password-toggle');
        toggleButtons.forEach(btn => {
            const input = btn.previousElementSibling;
            if (!input) return;

            btn.addEventListener('click', () => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                
                // Update icon
                btn.innerHTML = type === 'password' ? 
                    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>' :
                    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>';
            });
        });
    }

    centerModal() {
        if (!this.modal) return;
        
        // Get viewport height
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        
        // Get modal height
        const modalHeight = this.modal.offsetHeight;
        
        // Calculate top position to center
        const topPosition = Math.max(0, (vh - modalHeight) / 2);
        
        // Apply centering
        this.modal.style.top = `${topPosition}px`;
        this.modal.style.transform = 'translateX(-50%)';
    }

    show() {
        if (!this.modal || !this.backdrop) return;
        
        // Show backdrop
        this.backdrop.classList.add('visible');
        document.body.style.overflow = 'hidden';
        
        // Show and center modal
        this.modal.style.display = 'block';
        this.centerModal();
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.modal.classList.add('visible');
        });
    }

    hide() {
        if (!this.modal || !this.backdrop) return;
        
        this.modal.classList.remove('visible');
        this.backdrop.classList.remove('visible');
        document.body.style.overflow = '';
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (!this.modal.classList.contains('visible')) {
                this.modal.style.display = 'none';
            }
        }, 400);
    }
}

// Modal management
const modals = new Map();

export function initializeModal(modalId) {
    if (!modalId) {
        console.warn('Attempted to initialize modal without ID');
        return null;
    }
    if (!modals.has(modalId)) {
        modals.set(modalId, new Modal(modalId));
    }
    return modals.get(modalId);
}

export function showModal(modalId) {
    if (!modalId) {
        console.warn('Attempted to show modal without ID');
        return;
    }
    const modal = initializeModal(modalId);
    if (modal) {
        modal.show();
    }
}

export function hideModal(modalId) {
    if (!modalId) {
        console.warn('Attempted to hide modal without ID');
        return;
    }
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