import { showModal, hideModal, showError } from '../modal.js';
import { showWalletSelection } from './walletSelection.js';

// Wallet-specific modal functions
export function showMainWallet() {
    hideModal('walletSelectionModal');
    hideModal('importWalletModal');
    hideModal('passwordSetupModal');
    showModal('mainWalletModal');
}

// Re-export base modal functions for backward compatibility
export { showModal, hideModal, showError } from '../modal.js';
// Re-export wallet selection function
export { showWalletSelection }; 