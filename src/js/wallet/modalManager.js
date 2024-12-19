import { setupMainWalletEvents, updateBalanceDisplay } from './walletEvents.js';

// Show modal with animation
export function showModal(modalId) {
    console.log('Showing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }

    // Add overlay and backdrop with enhanced animations
    modal.classList.remove('hidden');
    modal.classList.add('modal-overlay', 'neon-border');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '50';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.backdropFilter = 'blur(8px)';
    console.log('Modal base styles applied');

    // Get the modal content
    const content = modal.querySelector('.modal-content') || modal.firstElementChild;
    if (content) {
        // Prevent event propagation on modal content
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        content.classList.add('modal-enter');
        console.log('Modal content found and enter animation added');
        
        // Add Solana-style effects
        content.querySelectorAll('.wallet-action-btn').forEach(btn => {
            btn.classList.add('neon-button', 'ripple');
        });
        
        content.querySelectorAll('input').forEach(input => {
            input.classList.add('neon-input');
        });
        
        content.querySelectorAll('.balance-value').forEach(balance => {
            balance.classList.add('neon-text');
        });
        
        // Add glowing effects to cards
        content.querySelectorAll('[class*="rounded-xl"]').forEach(card => {
            if (!card.classList.contains('neon-button')) {
                card.classList.add('balance-card');
            }
        });
        
        // Add backdrop blur with animation
        modal.classList.add('modal-backdrop');
        console.log('Solana effects applied');
        
        // Trigger animations
        requestAnimationFrame(() => {
            modal.classList.add('show');
            content.classList.add('show');
            console.log('Show animations triggered');
        });
    } else {
        console.error('No modal content found');
    }

    // Add click outside to close
    const handleOutsideClick = (e) => {
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            hideModal(modalId);
        }
    };
    
    // Remove any existing click listeners
    modal.removeEventListener('click', handleOutsideClick);
    // Add the click listener
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
    
    // Create modal if it doesn't exist
    if (!walletSelectionModal) {
        console.log('Creating wallet selection modal');
        walletSelectionModal = document.createElement('div');
        walletSelectionModal.id = 'walletSelectionModal';
        walletSelectionModal.className = 'modal';
        
        // Create modal content
        walletSelectionModal.innerHTML = `
            <div class="modal-content bg-black/90 rounded-xl p-6 max-w-md w-full mx-4 relative">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-white">Connect Wallet</h2>
                    <button class="close-modal text-gray-400 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="space-y-4">
                    <button class="wallet-option w-full p-4 rounded-xl bg-black/50 border border-[#00ffa3]/20 hover:border-[#00ffa3] flex items-center justify-between group transition-all duration-300" onclick="window.connectOKXWallet()">
                        <span class="text-white font-medium">OKX Wallet</span>
                        <img src="/assets/okx-logo.png" alt="OKX" class="w-8 h-8">
                    </button>
                    <button class="wallet-option w-full p-4 rounded-xl bg-black/50 border border-[#00ffa3]/20 hover:border-[#00ffa3] flex items-center justify-between group transition-all duration-300" onclick="window.connectUnisatWallet()">
                        <span class="text-white font-medium">Unisat Wallet</span>
                        <img src="/assets/unisat-logo.png" alt="Unisat" class="w-8 h-8">
                    </button>
                    <button class="wallet-option w-full p-4 rounded-xl bg-black/50 border border-[#00ffa3]/20 hover:border-[#00ffa3] flex items-center justify-between group transition-all duration-300" onclick="window.connectYoursWallet()">
                        <span class="text-white font-medium">Yours Wallet</span>
                        <img src="/assets/yours-logo.png" alt="Yours" class="w-8 h-8">
                    </button>
                    <div class="relative">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-800"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 text-gray-500 bg-black">or</span>
                        </div>
                    </div>
                    <button class="wallet-option w-full p-4 rounded-xl bg-black/50 border border-[#00ffa3]/20 hover:border-[#00ffa3] flex items-center justify-between group transition-all duration-300" onclick="window.showCreateWalletModal()">
                        <span class="text-white font-medium">Create New Wallet</span>
                        <svg class="w-6 h-6 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                    </button>
                    <button class="wallet-option w-full p-4 rounded-xl bg-black/50 border border-[#00ffa3]/20 hover:border-[#00ffa3] flex items-center justify-between group transition-all duration-300" onclick="window.showImportWalletModal()">
                        <span class="text-white font-medium">Import Existing Wallet</span>
                        <svg class="w-6 h-6 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(walletSelectionModal);
        console.log('Wallet selection modal created and added to DOM');
    }

    // Add overlay and backdrop with enhanced animations
    walletSelectionModal.classList.remove('hidden');
    walletSelectionModal.classList.add('modal-overlay', 'neon-border');
    walletSelectionModal.style.display = 'flex';
    walletSelectionModal.style.alignItems = 'center';
    walletSelectionModal.style.justifyContent = 'center';
    walletSelectionModal.style.position = 'fixed';
    walletSelectionModal.style.inset = '0';
    walletSelectionModal.style.zIndex = '50';
    walletSelectionModal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    walletSelectionModal.style.backdropFilter = 'blur(8px)';
    console.log('Modal base styles applied');

    // Get the modal content
    const content = walletSelectionModal.querySelector('.modal-content');
    if (content) {
        // Prevent event propagation on modal content
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        content.classList.add('modal-enter');
        console.log('Modal content found and enter animation added');
        
        // Add Solana-style effects
        content.querySelectorAll('.wallet-option').forEach(option => {
            option.classList.add('neon-button', 'ripple');
        });
        
        // Add backdrop blur with animation
        walletSelectionModal.classList.add('modal-backdrop');
        console.log('Solana effects applied');
        
        // Trigger animations
        requestAnimationFrame(() => {
            walletSelectionModal.classList.add('show');
            content.classList.add('show');
            console.log('Show animations triggered');
        });

        // Setup close button
        const closeBtn = content.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                hideModal('walletSelectionModal');
            };
        }
    } else {
        console.error('No modal content found');
    }

    // Add click outside to close
    const handleOutsideClick = (e) => {
        if (e.target === walletSelectionModal) {
            e.preventDefault();
            e.stopPropagation();
            hideModal('walletSelectionModal');
        }
    };
    
    // Remove any existing click listeners
    walletSelectionModal.removeEventListener('click', handleOutsideClick);
    // Add the click listener
    walletSelectionModal.addEventListener('click', handleOutsideClick);
} 