// Show modal with animation
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Add overlay and backdrop
    modal.classList.remove('hidden');
    modal.classList.add('modal-overlay');
    modal.style.display = 'flex';

    // Get the modal content
    const content = modal.querySelector('.modal-content') || modal.firstElementChild;
    if (content) {
        content.classList.add('modal-enter');
        
        // Add backdrop blur
        modal.classList.add('modal-backdrop');
        
        // Trigger animations
        requestAnimationFrame(() => {
            modal.classList.add('show');
            content.classList.add('show');
            modal.classList.add('show');
        });
    }
}

// Hide modal with animation
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Get the modal content
    const content = modal.querySelector('.modal-content') || modal.firstElementChild;
    if (content) {
        content.classList.remove('show');
        content.classList.add('modal-exit');
        modal.classList.remove('show');

        // Wait for animation to complete
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            content.classList.remove('modal-exit');
            modal.classList.remove('modal-backdrop');
        }, 300);
    } else {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// Show main wallet modal
export function showMainWallet() {
    const mainWalletModal = document.getElementById('mainWalletModal');
    if (mainWalletModal) {
        mainWalletModal.classList.remove('hidden');
        mainWalletModal.style.display = 'flex';
        mainWalletModal.classList.add('modal-enter');
        
        // Setup main wallet events
        setupMainWalletEvents();
        
        // Setup modal navigation
        setupModalNavigation();
        
        // Update balance
        updateBalanceDisplay();
        
        // Set up periodic balance updates
        setInterval(updateBalanceDisplay, 30000); // Update every 30 seconds
        
        // Trigger animation
        requestAnimationFrame(() => {
            mainWalletModal.classList.add('show');
            const content = mainWalletModal.querySelector('.modal-content');
            if (content) {
                content.classList.add('show');
            }
        });
    }
}

// Setup modal navigation
export function setupModalNavigation() {
    // Setup back buttons
    document.querySelectorAll('.back-to-menu').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('[id$="Modal"]');
            if (modal) {
                hideModal(modal.id);
                showModal('mainWalletModal');
            }
        });
    });

    // Setup close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('[id$="Modal"]');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
}

// Show error message
export function showWalletError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
} 