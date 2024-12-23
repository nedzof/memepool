import { showModal, hideModal, showError } from '../modal.js';
import { generateNewWallet } from './walletGeneration.js';
import { initializeImportWallet } from './walletImport.js';
import { setWalletLoading } from './walletUIManager.js';
import { SUPPORTED_WALLETS, detectAvailableWallets, initializeWallet } from './config.js';

// Helper function to handle button setup with loading state and error handling
async function setupWalletButton(buttonId, handler, options = {}) {
    console.log('Setting up button:', buttonId);
    const button = document.getElementById(buttonId);
    if (!button) {
        console.error(`Button with id ${buttonId} not found`);
        return;
    }
    console.log('Found button:', button);

    button.addEventListener('click', async (e) => {
        console.log(`Button ${buttonId} clicked`);
        try {
            setWalletLoading(true);
            console.log('Set wallet loading state');
            
            await options.preAction?.();
            console.log('Executing handler for', buttonId);
            await handler();
            console.log('Handler execution complete');

            if (options.hideModal) {
                console.log('Hiding modal');
                hideModal('walletSelectionModal');
            }
            if (options.showModal) {
                console.log('Showing modal:', options.showModal);
                showModal(options.showModal);
            }
        } catch (error) {
            console.error(`Error in ${buttonId}:`, error);
            showError(error.message || options.errorMessage || 'An error occurred');
            options.onError?.(error);
        } finally {
            setWalletLoading(false);
            console.log('Wallet loading state cleared');
        }
    });
    console.log(`Click handler added to ${buttonId}`);
}

// Handle connect wallet click - tries to connect to first available wallet or shows selection
export async function handleConnectWalletClick() {
    try {
        console.log('Handling connect wallet click');
        setWalletLoading(true);
        
        // Always show wallet selection for now
        showWalletSelection();
        return;

        // This code is temporarily disabled to ensure wallet selection always shows
        /*
        const availableWallets = detectAvailableWallets();
        const hasAvailableWallet = Object.values(availableWallets).some(available => available);
        
        if (!hasAvailableWallet) {
            showWalletSelection();
            return;
        }
        
        const firstAvailableWallet = Object.entries(availableWallets)
            .find(([_, available]) => available)?.[0];
            
        if (firstAvailableWallet) {
            await initializeWallet(firstAvailableWallet);
            showModal('mainWalletModal');
        } else {
            showWalletSelection();
        }
        */
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showError(error.message || 'Failed to connect wallet');
        showWalletSelection();
    } finally {
        setWalletLoading(false);
    }
}

// Modal navigation functions
export function showCreateWalletModal() {
    hideModal('walletSelectionModal');
    showModal('passwordSetupModal');
    generateNewWallet();
}

export function showImportWalletModal() {
    hideModal('walletSelectionModal');
    showModal('importWalletModal');
    initializeImportWallet();
}

export function showWalletSelection() {
    console.log('Showing wallet selection modal...');
    const availableWallets = detectAvailableWallets();
    console.log('Available wallets:', availableWallets);
    
    showModal('walletSelectionModal');
    console.log('Setting up wallet selection events...');
    setupWalletSelectionEvents(availableWallets);
    console.log('Wallet selection events setup complete');
}

// Setup wallet selection events
export function setupWalletSelectionEvents(availableWallets) {
    console.log('Setting up wallet selection events...');
    const modal = document.getElementById('walletSelectionModal');
    if (!modal) {
        console.error('Wallet selection modal not found');
        return;
    }
    console.log('Found wallet selection modal');

    // Setup wallet buttons
    Object.entries(SUPPORTED_WALLETS).forEach(([key, wallet]) => {
        console.log('Setting up wallet button:', key);
        const button = document.getElementById(wallet.id);
        if (!button) {
            console.error(`Button for wallet ${key} not found`);
            return;
        }
        console.log('Found button for wallet:', key);

        if (availableWallets[key]) {
            setupWalletButton(wallet.id, async () => {
                if (wallet.checkReady?.() === false) {
                    window.open(wallet.installUrl, '_blank');
                    throw new Error(`${wallet.name} wallet not ready`);
                }
                await initializeWallet(key);
            }, {
                hideModal: true,
                showModal: 'mainWalletModal',
                errorMessage: wallet.errorMessage
            });
        } else {
            button.addEventListener('click', () => {
                window.open(wallet.installUrl, '_blank');
            });
        }
    });

    console.log('Setting up create wallet button...');
    // Setup create and import wallet buttons
    setupWalletButton('createWalletBtn', async () => {
        try {
            console.log('Create wallet button clicked');
            hideModal('walletSelectionModal');
            
            // Verify password setup modal exists
            const passwordSetupModal = document.getElementById('passwordSetupModal');
            if (!passwordSetupModal) {
                console.error('Password setup modal not found');
                throw new Error('Password setup modal not found');
            }
            console.log('Found password setup modal');
            
            // Show password setup modal and generate wallet
            console.log('Showing password setup modal');
            showModal('passwordSetupModal');
            await generateNewWallet();
        } catch (error) {
            console.error('Error in create wallet flow:', error);
            showError(error.message || 'Failed to create wallet');
            showModal('walletSelectionModal');
        }
    }, {
        errorMessage: 'Failed to create new wallet'
    });
    console.log('Create wallet button setup complete');

    console.log('Setting up import wallet button...');
    setupWalletButton('importWalletBtn', initializeImportWallet, {
        hideModal: true,
        showModal: 'importWalletModal',
        onError: () => showModal('walletSelectionModal'),
        errorMessage: 'Failed to initialize import wallet'
    });
    console.log('Import wallet button setup complete');
    
    console.log('All wallet selection events setup complete');
} 