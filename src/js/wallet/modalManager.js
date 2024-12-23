import { showModal, hideModal, showError } from '../modal.js';
import { showWalletSelection } from './walletSelection.js';
import { setupMainWalletEvents } from './walletEvents.js';
import { setupReceiveModal } from './qrCode.js';

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

// Show send modal
export function showSendModal() {
    hideModal('mainWalletModal');
    showModal('sendModal');
    setupBackToMainHandlers();
}

// Show receive modal
export function showReceiveModal() {
    hideModal('mainWalletModal');
    showModal('receiveModal');
    setupReceiveModal();
    setupBackToMainHandlers();
}

// Setup back-to-main functionality
export function setupBackToMainHandlers() {
    console.log('Setting up back-to-main handlers');
    const backButtons = document.querySelectorAll('.back-to-main');
    backButtons.forEach(button => {
        // Remove existing listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add new click listener
        newButton.addEventListener('click', () => {
            console.log('Back to main clicked');
            const currentModal = newButton.closest('.modal');
            if (currentModal) {
                console.log('Hiding current modal:', currentModal.id);
                hideModal(currentModal.id);
                console.log('Showing main wallet modal');
                showMainWallet();
            }
        });
    });
}

// Re-export base modal functions for backward compatibility
export { showModal, hideModal, showError } from '../modal.js';
// Re-export wallet selection function
export { showWalletSelection }; 