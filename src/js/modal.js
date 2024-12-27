// Base modal functionality
export class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.isTransitioning = false;
        this.transitionTimeout = null;
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

        // Set up close button handlers
        this.closeButtons = this.modal.querySelectorAll('.modal-close');
        this.closeHandler = () => this.hide();
        this.closeButtons.forEach(button => {
            button.addEventListener('click', this.closeHandler);
        });

        // Close on backdrop click
        this.backdropHandler = (e) => {
            if (e.target === this.backdrop) {
                this.hide();
            }
        };
        this.backdrop.addEventListener('click', this.backdropHandler);

        // Close on escape key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);

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

    show() {
        if (!this.modal || this.isTransitioning) return;
        
        // Clear any existing transition timeout
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        
        this.isTransitioning = true;
        
        // Show backdrop
        this.backdrop.classList.add('visible');
        
        // Show modal
        this.modal.style.display = 'block';
        
        // Dispatch show event before animation
        const showEvent = new Event('show', { bubbles: true });
        this.modal.dispatchEvent(showEvent);
        
        // Use requestAnimationFrame to ensure display change is applied before adding classes
        requestAnimationFrame(() => {
            this.modal.classList.add('open');
            this.modal.classList.remove('modal-exit');
            this.modal.classList.remove('hidden');
            
            // Reset transitioning state after animation
            this.transitionTimeout = setTimeout(() => {
                this.isTransitioning = false;
                this.transitionTimeout = null;
            }, 300);
        });
    }

    hide() {
        if (!this.modal || this.isTransitioning) return;
        
        // Don't hide the main wallet modal if it's being shown
        if (this.modal.id === 'mainWalletModal' && !this.modal.classList.contains('hidden')) {
            console.log('Preventing main wallet modal from being hidden');
            return;
        }
        
        // Clear any existing transition timeout
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        
        this.isTransitioning = true;
        
        // Hide modal with animation
        this.modal.classList.remove('open');
        this.modal.classList.add('modal-exit');
        this.modal.classList.add('hidden');
        
        // Hide backdrop if no other modals are visible
        const visibleModals = document.querySelectorAll('.modal:not(.hidden)');
        if (visibleModals.length <= 1) {
            this.backdrop.classList.remove('visible');
        }
        
        // Wait for animation to complete before hiding
        this.transitionTimeout = setTimeout(() => {
            this.modal.style.display = 'none';
            this.isTransitioning = false;
            this.transitionTimeout = null;
            
            // Dispatch hide event after animation
            const hideEvent = new Event('hide', { bubbles: true });
            this.modal.dispatchEvent(hideEvent);
        }, 300); // Match the CSS transition duration
    }

    destroy() {
        // Clear any pending transition timeout
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        
        // Reset transition state
        this.isTransitioning = false;
        
        // Remove event listeners
        this.closeButtons.forEach(button => {
            button.removeEventListener('click', this.closeHandler);
        });
        this.backdrop.removeEventListener('click', this.backdropHandler);
        document.removeEventListener('keydown', this.escapeHandler);
        
        // Remove backdrop if no other modals are using it
        if (!document.querySelector('.modal[style*="display: block"]')) {
            this.backdrop.remove();
        }
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

// Show a modal
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with ID ${modalId} not found`);
        return;
    }
    console.log(`Showing modal: ${modalId}`);
    
    // Initialize modal if not already initialized
    let modalInstance = modals.get(modalId);
    if (!modalInstance) {
        modalInstance = initializeModal(modalId);
    }
    
    // Show the modal using the Modal class
    if (modalInstance) {
        modalInstance.show();
    }
}

// Hide a modal
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with ID ${modalId} not found`);
        return;
    }
    console.log(`Hiding modal: ${modalId}`);
    
    // Get modal instance
    const modalInstance = modals.get(modalId);
    if (modalInstance) {
        modalInstance.hide();
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