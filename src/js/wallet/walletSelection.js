import { showModal, hideModal, showWalletError, showMainWallet, showWalletSelection } from './modalManager.js';
import { connectUnisatWallet, connectOKXWallet } from './walletInit.js';
import { generateNewWallet } from './walletGeneration.js';
import { authenticateWithX } from './auth/xAuth.js';
import { initializeImportWallet } from './walletImport.js';

// Export showWalletSelection from modalManager
export { showWalletSelection } from './modalManager.js';

// Show create wallet modal
export function showCreateWalletModal() {
    console.log('Showing create wallet modal...');
    hideModal('walletSelectionModal');
    showModal('seedPhraseModal');
    generateNewWallet();
}

// Show import wallet modal
export function showImportWalletModal() {
    console.log('Showing import wallet modal...');
    hideModal('walletSelectionModal');
    showModal('importWalletModal');
    initializeImportWallet();
}

// Handle connect wallet button click
export function handleConnectWalletClick() {
    console.log('Connect wallet button clicked');
    showWalletSelection();
}

// Make functions available globally
window.showCreateWalletModal = showCreateWalletModal;
window.showImportWalletModal = showImportWalletModal;
window.showWalletSelection = showWalletSelection;
window.handleConnectWalletClick = handleConnectWalletClick;
window.connectOKXWallet = connectOKXWallet;
window.connectUnisatWallet = connectUnisatWallet;

// Check if wallet is already initialized
async function isWalletInitialized() {
    console.log('Checking wallet initialization...');
    
    // First check session
    const session = localStorage.getItem('memepire_wallet_session');
    if (session) {
        const sessionData = JSON.parse(session);
        console.log('Found wallet session:', sessionData);
        if (sessionData.isConnected) {
            return true;
        }
    }

    // Then check window.wallet
    if (!window.wallet) {
        console.log('No wallet instance found');
        return false;
    }

    try {
        // Check all required properties
        const publicKey = window.wallet.getPublicKey();
        const legacyAddress = await window.wallet.getLegacyAddress();
        const balance = await window.wallet.getBalance();
        const connectionType = window.wallet.getConnectionType();

        const isInitialized = !!(publicKey && legacyAddress && balance !== undefined && connectionType);
        console.log('Wallet initialization check:', { isInitialized, publicKey, legacyAddress, balance, connectionType });
        return isInitialized;
    } catch (error) {
        console.error('Error checking wallet initialization:', error);
        return false;
    }
}

// Setup wallet selection events with enhanced feedback
function setupWalletSelectionEvents(hasUnisat, hasOKX) {
    console.log('Setting up wallet selection events...');
    const modal = document.getElementById('initialSetupModal');
    if (!modal) {
        console.error('Modal not found');
        return;
    }

    // Add close functionality with proper event handling
    const closeModal = (e) => {
        // Only close if clicking the backdrop (modal itself)
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            hideModal('initialSetupModal');
        }
    };
    
    // Remove any existing click listeners
    modal.removeEventListener('click', closeModal);
    // Add the click listener
    modal.addEventListener('click', closeModal);

    // Unisat wallet connection
    if (hasUnisat) {
        const unisatBtn = document.getElementById('unisatWalletBtn');
        if (unisatBtn) {
            console.log('Setting up Unisat button');
            unisatBtn.addEventListener('click', async () => {
                try {
                    unisatBtn.classList.add('loading');
                    await connectUnisatWallet();
                    hideModal('initialSetupModal');
                    showMainWallet();
                } catch (error) {
                    console.error('Unisat connection error:', error);
                    showWalletError(error.message);
                } finally {
                    unisatBtn.classList.remove('loading');
                }
            });
        }
    }

    // OKX wallet connection
    if (hasOKX) {
        const okxBtn = document.getElementById('okxWalletBtn');
        if (okxBtn) {
            console.log('Setting up OKX button');
            okxBtn.addEventListener('click', async () => {
                try {
                    okxBtn.classList.add('loading');
                    await connectOKXWallet();
                    hideModal('initialSetupModal');
                    showMainWallet();
                } catch (error) {
                    console.error('OKX connection error:', error);
                    showWalletError(error.message);
                } finally {
                    okxBtn.classList.remove('loading');
                }
            });
        }
    }

    // Create new wallet
    const createWalletBtn = document.getElementById('createWalletBtn');
    if (createWalletBtn) {
        console.log('Setting up create wallet button');
        createWalletBtn.addEventListener('click', async () => {
            try {
                console.log('Create wallet button clicked');
                createWalletBtn.classList.add('loading');
                hideModal('initialSetupModal');
                showModal('seedPhraseModal');
                await generateNewWallet();
            } catch (error) {
                console.error('Error creating new wallet:', error);
                showWalletError(error.message);
                showModal('initialSetupModal');
            } finally {
                createWalletBtn.classList.remove('loading');
            }
        });
    }

    // Import existing wallet
    const importWalletBtn = document.getElementById('importWalletBtn');
    if (importWalletBtn) {
        console.log('Setting up import wallet button');
        importWalletBtn.addEventListener('click', () => {
            try {
                console.log('Import wallet button clicked');
                importWalletBtn.classList.add('loading');
                hideModal('initialSetupModal');
                showModal('importWalletModal');
                initializeImportWallet();
            } catch (error) {
                console.error('Error initializing import wallet:', error);
                showWalletError(error.message);
                showModal('initialSetupModal');
            } finally {
                importWalletBtn.classList.remove('loading');
            }
        });
    }

    console.log('All wallet selection events set up');
} 