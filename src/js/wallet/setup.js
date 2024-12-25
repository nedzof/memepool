import { BitcoinWallet } from './bitcoin.js';
import { showError, hideModal, showModal } from '../modal.js';

// Initialize wallet with required properties
async function initializeWallet(mnemonic, password, type = 'manual') {
    console.log('Initializing wallet with type:', type);
    
    try {
        // Validate wallet type
        const validTypes = ['okx', 'unisat', 'phantom', 'yours', 'manual', 'imported'];
        if (!validTypes.includes(type)) {
            throw new Error('Invalid wallet type');
        }

        // Initialize wallet
        const wallet = new BitcoinWallet();
        await wallet.init(mnemonic, password);

        // Get wallet data from initialized instance
        const walletData = wallet.getData();
        console.log('Wallet data:', walletData);

        if (!walletData || !walletData.address) {
            throw new Error('Failed to initialize wallet data');
        }

        // Store wallet data
        sessionStorage.setItem('wallet_type', type);
        sessionStorage.setItem('wallet_address', walletData.address);
        sessionStorage.setItem('wallet_public_key', walletData.publicKey || '');
        sessionStorage.setItem('wallet_balance', walletData.balance || '0');
        sessionStorage.setItem('wallet_initialized', 'true');

        // Store wallet instance globally
        window.bitcoinWallet = wallet;

        console.log('Wallet initialized successfully:', {
            type,
            address: walletData.address,
            hasPublicKey: !!walletData.publicKey,
            balance: walletData.balance
        });

        return {
            type,
            address: walletData.address,
            publicKey: walletData.publicKey,
            balance: walletData.balance
        };
    } catch (error) {
        console.error('Error initializing wallet:', error);
        // Clear any partial data
        sessionStorage.removeItem('wallet_type');
        sessionStorage.removeItem('wallet_address');
        sessionStorage.removeItem('wallet_public_key');
        sessionStorage.removeItem('wallet_balance');
        sessionStorage.removeItem('wallet_initialized');
        throw error;
    }
}

// Main wallet setup function
async function startWalletSetup() {
    try {
        console.log('Starting wallet setup process...');
        
        // Get stored data
        const mnemonic = sessionStorage.getItem('temp_mnemonic');
        const password = sessionStorage.getItem('temp_password');
        const flowType = sessionStorage.getItem('wallet_flow');
        
        console.log('Checking stored data:', {
            hasMnemonic: !!mnemonic,
            hasPassword: !!password,
            flowType
        });
        
        if (!mnemonic || !password) {
            throw new Error('Missing required data for wallet setup');
        }

        // Initialize wallet with proper type
        const type = flowType === 'create' ? 'manual' : 'imported';
        await initializeWallet(mnemonic, password, type);

        console.log('Wallet setup completed successfully');
        
        // Return success
        return true;

    } catch (error) {
        console.error('Wallet setup failed:', error);
        showError(error.message || 'Failed to setup wallet');
        throw error;
    }
}

// Make sure the function is available globally
window.startWalletSetup = startWalletSetup;

// Export both functions
export { initializeWallet, startWalletSetup }; 