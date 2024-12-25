import { BitcoinWallet } from './bitcoin.js';
import { showError, hideModal, showModal } from '../modal.js';

// Main wallet setup function
export async function startWalletSetup() {
    try {
        console.log('Starting wallet setup process...');
        
        // Get stored data
        const mnemonic = sessionStorage.getItem('temp_mnemonic');
        const password = sessionStorage.getItem('temp_password');
        
        console.log('Checking stored data:', {
            hasMnemonic: !!mnemonic,
            hasPassword: !!password
        });
        
        if (!mnemonic || !password) {
            throw new Error('Missing required data for wallet setup');
        }

        // Initialize wallet
        console.log('Creating new BitcoinWallet instance...');
        const wallet = new BitcoinWallet();
        
        console.log('Initializing wallet with mnemonic and password...');
        await wallet.initialize(mnemonic, password);

        // Verify wallet was created successfully
        console.log('Checking wallet initialization status...');
        if (!wallet.isInitialized()) {
            throw new Error('Wallet initialization failed');
        }

        // Store only essential data
        console.log('Storing essential wallet data...');
        sessionStorage.setItem('wallet_pubkey', wallet.getPublicKey());
        sessionStorage.setItem('wallet_balance', wallet.getBalance());
        sessionStorage.setItem('wallet_type', 'bitcoin');

        // Store wallet instance
        console.log('Storing wallet instance globally...');
        window.bitcoinWallet = wallet;

        console.log('Wallet setup completed successfully');
        
        // Hide success animation modal and show main wallet
        console.log('Transitioning to main wallet view...');
        hideModal('walletCreatedModal');
        showModal('mainWalletModal');
        
        // Return the wallet instance
        return wallet;

    } catch (error) {
        console.error('Wallet setup failed:', error);
        showError(error.message || 'Failed to setup wallet');
        throw error;
    }
}

// Initialize the module
console.log('=== Wallet setup module loaded ===');

// Make sure the function is available globally
window.startWalletSetup = startWalletSetup;

// Export for module usage
export default startWalletSetup; 