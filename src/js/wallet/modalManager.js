import { setupMainWalletEvents, updateBalanceDisplay } from './walletEvents.js';
import { setupWalletSelectionEvents } from './walletSelection.js';
import { showModal, hideModal, showError as showErrorMessage } from '../modal.js';

// Show wallet selection modal
export function showWalletSelection() {
    console.log('Showing wallet selection modal...');
    
    // First detect available wallets
    const hasUnisat = window.unisat !== undefined;
    const hasOKX = window.okxwallet !== undefined;
    
    // Show the modal
    showModal('walletSelectionModal');
    
    // Setup event handlers
    setupWalletSelectionEvents(hasUnisat, hasOKX);
}

// Re-export modal functions
export { showModal, hideModal };

// Show main wallet modal with enhanced animations
export function showMainWallet() {
    showModal('mainWalletModal');
}

export function hideMainWallet() {
    hideModal('mainWalletModal');
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
    showErrorMessage(message);
}

// Modal-specific show/hide functions
export function showSeedPhraseModal() {
    showModal('seedPhraseModal');
}

export function hideSeedPhraseModal() {
    hideModal('seedPhraseModal');
}

export function showPasswordSetupModal() {
    showModal('passwordSetupModal');
}

export function hidePasswordSetupModal() {
    hideModal('passwordSetupModal');
}

export function showSendModal() {
    showModal('sendModal');
}

export function hideSendModal() {
    hideModal('sendModal');
}

export function showReceiveModal() {
    showModal('receiveModal');
}

export function hideReceiveModal() {
    hideModal('receiveModal');
} 