import { showModal, hideModal, showError } from '../modal.js';
import { BitcoinWallet } from './bitcoin.js';
import { initializeSeedModal } from './modals/seedModal.js';

// Start wallet import process
export async function startWalletImport() {
    try {
        console.log('Starting wallet import process...');
        
        // Show seed modal in import mode
        sessionStorage.setItem('wallet_flow', 'import');
        showModal('seedModal');
        initializeSeedModal();
        
    } catch (error) {
        console.error('Error starting wallet import:', error);
        showError(error.message || 'Failed to start wallet import');
    }
} 