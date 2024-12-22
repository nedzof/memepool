// Export all necessary functions from their respective modules
export { initializeWalletUI, updateWalletUI, resetWalletUI, setWalletLoading } from './wallet/walletUIManager.js';
export { initializeWalletSelection } from './wallet/walletSetup.js';
export { disconnectWallet } from './wallet/config.js';

// Initialize wallet functionality
export async function initializeWallet() {
    console.log('Initializing wallet functionality...');
    initializeWalletUI();
    initializeWalletSelection();
} 