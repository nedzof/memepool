import { setupMainWalletEvents, updateBalanceDisplay } from './walletEvents.js';

// Show modal with animation
export function showModal(modalId) {
    console.log('Showing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }

    // Add modal classes from modals.css
    modal.classList.remove('hidden');
    modal.classList.add('modal', 'modal-backdrop', 'neon-border');
    
    // Get the modal content
    const content = modal.querySelector('.modal-content') || modal.firstElementChild;
    if (content) {
        // Prevent event propagation
        content.addEventListener('click', (e) => e.stopPropagation());
        
        // Add animation classes
        content.classList.add('modal-enter');
        
        // Add existing effect classes to elements
        content.querySelectorAll('.wallet-action-btn').forEach(btn => {
            btn.classList.add('neon-button', 'glow');
        });
        
        content.querySelectorAll('.balance-value').forEach(balance => {
            balance.classList.add('neon-text');
        });
        
        // Add card effects
        content.querySelectorAll('[class*="rounded-xl"]').forEach(card => {
            if (!card.classList.contains('neon-button')) {
                card.classList.add('balance-card');
            }
        });
        
        // Trigger animations
        requestAnimationFrame(() => {
            modal.classList.add('open');
            content.classList.add('show');
        });
    }

    // Add click outside to close
    const handleOutsideClick = (e) => {
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            hideModal(modalId);
        }
    };
    
    modal.removeEventListener('click', handleOutsideClick);
    modal.addEventListener('click', handleOutsideClick);
}

// Hide modal with enhanced animation
export function hideModal(modalId) {
    console.log('Hiding modal:', modalId);
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }

    const content = modal.querySelector('.modal-content') || modal.firstElementChild;
    if (content) {
        // Add exit animation class
        content.classList.add('modal-exit');
        content.classList.remove('show');

        // Wait for animation to complete before hiding
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            content.classList.remove('modal-exit');
            modal.classList.remove('modal-overlay', 'neon-border');
            
            // Clean up any added classes
            content.querySelectorAll('.neon-button, .neon-text, .neon-input, .neon-card').forEach(el => {
                el.classList.remove('neon-button', 'neon-text', 'neon-input', 'neon-card');
            });
        }, 300);
    } else {
        // If no content element, just hide the modal
        modal.classList.add('hidden');
        modal.style.display = 'none';
        modal.classList.remove('modal-overlay', 'neon-border');
    }

    // Remove click event listener
    const handleOutsideClick = (e) => {
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            hideModal(modalId);
        }
    };
    modal.removeEventListener('click', handleOutsideClick);
}

// Show main wallet modal with enhanced animations
export function showMainWallet() {
    console.log('Showing main wallet modal...');
    
    const mainWalletModal = document.getElementById('mainWalletModal');
    if (!mainWalletModal) {
        console.error('Main wallet modal not found');
        return;
    }

    // Hide any other open modals first
    const allModals = document.querySelectorAll('[id$="Modal"]');
    allModals.forEach(modal => {
        if (modal.id !== 'mainWalletModal') {
            hideModal(modal.id);
        }
    });

    // Reset modal styles and add proper positioning classes
    mainWalletModal.style.display = 'flex';
    mainWalletModal.style.position = 'fixed';
    mainWalletModal.style.top = '0';
    mainWalletModal.style.left = '0';
    mainWalletModal.style.right = '0';
    mainWalletModal.style.bottom = '0';
    mainWalletModal.style.alignItems = 'center';
    mainWalletModal.style.justifyContent = 'center';
    mainWalletModal.style.zIndex = '9999';
    mainWalletModal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    mainWalletModal.style.backdropFilter = 'blur(8px)';
    
    // Remove any hidden classes
    mainWalletModal.classList.remove('hidden');
    
    // Add modal-overlay class for proper styling
    mainWalletModal.classList.add('modal-overlay', 'neon-border');
    
    // Get the modal content
    const content = mainWalletModal.querySelector('.modal-content') || mainWalletModal.firstElementChild;
    if (content) {
        // Add modal-content class and animation
        content.classList.add('modal-content', 'modal-enter');
        content.classList.remove('modal-exit');
        
        // Prevent event propagation on modal content
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Add Solana-style effects
        content.querySelectorAll('.wallet-action-btn').forEach(btn => {
            btn.classList.add('neon-button', 'ripple');
        });
        
        content.querySelectorAll('.balance-value').forEach(balance => {
            balance.classList.add('neon-text');
        });
        
        // Add glowing effects to cards
        content.querySelectorAll('[class*="rounded-xl"]').forEach(card => {
            if (!card.classList.contains('neon-button')) {
                card.classList.add('neon-card');
            }
        });
    }
    
    // Setup main wallet events
    setupMainWalletEvents();
    
    // Setup modal navigation
    setupModalNavigation();
    
    // Update balance
    updateBalanceDisplay();
    
    // Only add click outside to close if not logged in
    const session = localStorage.getItem('memepire_wallet_session');
    const sessionData = session ? JSON.parse(session) : null;
    const isConnected = sessionData?.isConnected && window.wallet;

    if (!isConnected) {
        const handleOutsideClick = (e) => {
            if (e.target === mainWalletModal) {
                e.preventDefault();
                e.stopPropagation();
                hideModal('mainWalletModal');
            }
        };
        
        // Remove any existing click listeners
        mainWalletModal.removeEventListener('click', handleOutsideClick);
        // Add the click listener
        mainWalletModal.addEventListener('click', handleOutsideClick);
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

// Show wallet selection modal
export function showWalletSelection() {
    console.log('Showing wallet selection modal');
    let walletSelectionModal = document.getElementById('walletSelectionModal');
    
    if (!walletSelectionModal) {
        console.log('Creating wallet selection modal');
        walletSelectionModal = document.createElement('div');
        walletSelectionModal.id = 'walletSelectionModal';
        walletSelectionModal.className = 'modal wallet-modal';
        
        walletSelectionModal.innerHTML = `
            <div class="modal-content">
                <div class="wallet-header">
                    <h2 class="wallet-title">Connect Wallet</h2>
                    <button class="close-modal wallet-close">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="wallet-body">
                    <div class="wallet-options">
                        <button class="wallet-option neon-button glow" onclick="window.connectOKXWallet()">
                            <span>OKX Wallet</span>
                            <img src="/assets/okx-logo.png" alt="OKX" class="wallet-logo">
                        </button>
                        <button class="wallet-option neon-button glow" onclick="window.connectUnisatWallet()">
                            <span>Unisat Wallet</span>
                            <img src="/assets/unisat-logo.png" alt="Unisat" class="wallet-logo">
                        </button>
                        <button class="wallet-option neon-button glow" onclick="window.connectYoursWallet()">
                            <span>Yours Wallet</span>
                            <img src="/assets/yours-logo.png" alt="Yours" class="wallet-logo">
                        </button>
                        <div class="wallet-divider">
                            <span>or</span>
                        </div>
                        <button class="wallet-option neon-button glow" onclick="window.showCreateWalletModal()">
                            <span>Create New Wallet</span>
                            <svg class="wallet-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                        </button>
                        <button class="wallet-option neon-button glow" onclick="window.showImportWalletModal()">
                            <span>Import Existing Wallet</span>
                            <svg class="wallet-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(walletSelectionModal);
    }

    showModal('walletSelectionModal');
} 