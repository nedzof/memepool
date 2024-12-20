import { setupMainWalletEvents, updateBalanceDisplay } from './walletEvents.js';

// Show modal with animation
export function showModal(modalId) {
    console.log('=== SHOW MODAL START ===');
    console.log('Showing modal:', modalId);
    const modal = document.getElementById(modalId);
    console.log('Modal element:', modal);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }

    console.log('Initial state:', {
        classes: modal.className,
        display: modal.style.display,
        opacity: modal.style.opacity,
        visibility: modal.style.visibility
    });
    
    // Set initial display state
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    
    // Force a reflow to ensure the transition works
    console.log('Forcing reflow...');
    modal.offsetHeight;
    
    // Add open class to trigger animation
    console.log('Adding open class and setting opacity...');
    requestAnimationFrame(() => {
        modal.classList.add('open');
        modal.style.opacity = '1';
        console.log('Final state:', {
            classes: modal.className,
            display: modal.style.display,
            opacity: modal.style.opacity,
            visibility: modal.style.visibility
        });
    });

    // Add click outside to close
    console.log('Adding click outside handler...');
    const handleOutsideClick = (e) => {
        if (e.target === modal) {
            console.log('Outside click detected, closing modal');
            hideModal(modalId);
        }
    };
    modal.addEventListener('click', handleOutsideClick);
    console.log('=== SHOW MODAL END ===');
}

// Hide modal with enhanced animation
export function hideModal(modalId) {
    console.log('=== HIDE MODAL START ===');
    console.log('Hiding modal:', modalId);
    const modal = document.getElementById(modalId);
    console.log('Modal element:', modal);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }

    console.log('Initial state:', {
        classes: modal.className,
        display: modal.style.display,
        opacity: modal.style.opacity,
        visibility: modal.style.visibility
    });

    // Start animation
    console.log('Starting hide animation...');
    modal.classList.remove('open');
    modal.style.opacity = '0';

    // Wait for animation to complete before hiding
    console.log('Starting hide timeout...');
    setTimeout(() => {
        console.log('Hide timeout triggered');
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        console.log('Final state:', {
            classes: modal.className,
            display: modal.style.display,
            opacity: modal.style.opacity,
            visibility: modal.style.visibility
        });
    }, 300);

    // Remove click outside event listener
    console.log('Removing click outside handler...');
    modal.removeEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal(modalId);
        }
    });
    console.log('=== HIDE MODAL END ===');
}

// Show main wallet modal with enhanced animations
export function showMainWallet() {
    const modal = document.getElementById('mainWalletModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.opacity = '1';
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
    }
}

export function hideMainWallet() {
    const modal = document.getElementById('mainWalletModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.opacity = '0';
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
    }
}

// Setup modal navigation
export function setupModalNavigation() {
    // Setup back buttons
    document.querySelectorAll('.back-to-menu').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                hideModal(modal.id);
                showModal('mainWalletModal');
            }
        });
    });

    // Setup close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
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
        walletSelectionModal.className = 'modal fixed inset-0 flex items-center justify-center';
        
        walletSelectionModal.innerHTML = `
            <div class="modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-lg"></div>
            <div class="modal-content border border-[#00ffa3]/30 rounded-2xl max-w-md w-full relative backdrop-blur-xl"
                 style="background: linear-gradient(180deg, rgba(18, 12, 52, 0.95) 0%, rgba(26, 17, 71, 0.95) 100%);
                        box-shadow: 0 0 40px rgba(0, 255, 163, 0.2);">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-white">Connect Wallet</h2>
                        <button class="close-modal text-white/70 hover:text-white transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="space-y-4">
                        <button class="wallet-option w-full p-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group" onclick="window.connectOKXWallet()">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00ffa3] to-[#00ffff] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div class="relative z-10 flex items-center justify-between">
                                <span>OKX Wallet</span>
                                <img src="/assets/okx-logo.png" alt="OKX" class="w-8 h-8">
                            </div>
                        </button>
                        <button class="wallet-option w-full p-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group" onclick="window.connectUnisatWallet()">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00ffa3] to-[#00ffff] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div class="relative z-10 flex items-center justify-between">
                                <span>Unisat Wallet</span>
                                <img src="/assets/unisat-logo.png" alt="Unisat" class="w-8 h-8">
                            </div>
                        </button>
                        <button class="wallet-option w-full p-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group" onclick="window.connectYoursWallet()">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00ffa3] to-[#00ffff] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div class="relative z-10 flex items-center justify-between">
                                <span>Yours Wallet</span>
                                <img src="/assets/yours-logo.png" alt="Yours" class="w-8 h-8">
                            </div>
                        </button>
                        <div class="relative py-4">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-[#00ffa3]/20"></div>
                            </div>
                            <div class="relative flex justify-center">
                                <span class="px-4 text-sm text-gray-400 bg-[#120c34]">or</span>
                            </div>
                        </div>
                        <button class="wallet-option w-full p-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group" onclick="window.showCreateWalletModal()">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00ffa3] to-[#00ffff] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div class="relative z-10 flex items-center justify-between">
                                <span>Create New Wallet</span>
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                            </div>
                        </button>
                        <button class="wallet-option w-full p-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 text-white relative overflow-hidden group" onclick="window.showImportWalletModal()">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00ffa3] to-[#00ffff] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div class="relative z-10 flex items-center justify-between">
                                <span>Import Existing Wallet</span>
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                                </svg>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(walletSelectionModal);
        
        // Setup close button
        const closeButton = walletSelectionModal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                hideModal('walletSelectionModal');
            });
        }
    }

    showModal('walletSelectionModal');
}

export function showSeedPhraseModal() {
    const modal = document.getElementById('seedPhraseModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.opacity = '1';
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
    }
}

export function hideSeedPhraseModal() {
    const modal = document.getElementById('seedPhraseModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.opacity = '0';
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
    }
}

export function showPasswordSetupModal() {
    const modal = document.getElementById('passwordSetupModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.opacity = '1';
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
    }
}

export function hidePasswordSetupModal() {
    const modal = document.getElementById('passwordSetupModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.opacity = '0';
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
    }
}

export function showSendModal() {
    const modal = document.getElementById('sendModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.opacity = '1';
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
    }
}

export function hideSendModal() {
    const modal = document.getElementById('sendModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.opacity = '0';
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
    }
}

export function showReceiveModal() {
    const modal = document.getElementById('receiveModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.opacity = '1';
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
    }
}

export function hideReceiveModal() {
    const modal = document.getElementById('receiveModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.opacity = '0';
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
    }
} 