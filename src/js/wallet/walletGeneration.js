import { showModal, hideModal, showError } from '../modal.js';
import { BitcoinWallet } from './bitcoin.js';
import { initializeSeedModal } from './modals/seedModal.js';

// Generate new wallet
export async function generateNewWallet() {
    try {
        console.log('Starting new wallet generation...');
        
        // Show seed modal in create mode
        sessionStorage.setItem('wallet_flow', 'create');
        showModal('seedModal');
        initializeSeedModal();
        
    } catch (error) {
        console.error('Error generating wallet:', error);
        showError(error.message || 'Failed to generate wallet');
    }
} 