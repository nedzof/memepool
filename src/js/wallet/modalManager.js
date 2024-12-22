import { showError } from '../modal.js';

// Modal management functions
export function showModal(modalId) {
    // First, hide all modals
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        modal.classList.remove('show');
    });

    // Then show the requested modal
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Wallet-specific modal functions
export function showMainWallet() {
    hideModal('walletSelectionModal');
    hideModal('importWalletModal');
    hideModal('passwordSetupModal');
    showModal('mainWalletModal');
}

export function showWalletSelection() {
    hideModal('mainWalletModal');
    hideModal('importWalletModal');
    hideModal('passwordSetupModal');
    showModal('walletSelectionModal');
}

export function showWalletError(message) {
    showError(message);
} 