import { showError } from '../modal.js';

// Modal management functions
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        setTimeout(() => {
            modal.querySelector('.modal').classList.add('show');
        }, 10);
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.querySelector('.modal').classList.remove('show');
        setTimeout(() => {
            modal.classList.remove('show');
        }, 300);
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