import { showModal, hideModal, showError } from '../modal.js';
import { showWalletSelection } from './walletSelection.js';
import { setupMainWalletEvents } from './walletEvents.js';

// Wallet-specific modal functions
export function showMainWallet() {
    hideModal('walletSelectionModal');
    hideModal('importWalletModal');
    hideModal('passwordSetupModal');
    hideModal('sendModal');
    hideModal('receiveModal');
    showModal('mainWalletModal');
    setupMainWalletEvents();
}

// Setup back-to-main functionality
export function setupBackToMainHandlers() {
    const backButtons = document.querySelectorAll('.back-to-main');
    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the current modal
            const currentModal = button.closest('.modal');
            if (currentModal) {
                // Hide current modal
                hideModal(currentModal.id);
                // Show main wallet modal
                showMainWallet();
            }
        });
    });
}

// Re-export base modal functions for backward compatibility
export { showModal, hideModal, showError } from '../modal.js';
// Re-export wallet selection function
export { showWalletSelection }; 