import { showModal, hideModal, showError } from '../modal.js';
import { generateNewWallet } from './walletGeneration.js';
import { initializeImportWallet } from './walletImport.js';
import { setWalletLoading } from './walletUIUpdates.js';
import { SUPPORTED_WALLETS, detectAvailableWallets, initializeWallet } from './config.js';

// Helper function to handle button setup with loading state and error handling
async function setupWalletButton(buttonId, handler, options = {}) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.addEventListener('click', async () => {
        try {
            setWalletLoading(true);
            
            await options.preAction?.();
            await handler();

            if (options.hideModal) hideModal('walletSelectionModal');
            if (options.showModal) showModal(options.showModal);
        } catch (error) {
            console.error(`Error in ${buttonId}:`, error);
            showError(error.message || options.errorMessage || 'An error occurred');
            options.onError?.(error);
        } finally {
            setWalletLoading(false);
        }
    });
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
    showModal('seedPhraseModal');
    generateNewWallet();
}

export function showImportWalletModal() {
    hideModal('walletSelectionModal');
    showModal('importWalletModal');
    initializeImportWallet();
}

export function showWalletSelection() {
    const availableWallets = detectAvailableWallets();
    showModal('walletSelectionModal');
    setupWalletSelectionEvents(availableWallets);
}

// Setup wallet selection events
export function setupWalletSelectionEvents(availableWallets) {
    const modal = document.getElementById('walletSelectionModal');
    if (!modal) return;

    // Setup wallet buttons
    Object.entries(SUPPORTED_WALLETS).forEach(([key, wallet]) => {
        const button = document.getElementById(wallet.id);
        if (!button) return;

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

    // Setup create and import wallet buttons
    setupWalletButton('createWalletBtn', generateNewWallet, {
        hideModal: true,
        showModal: 'seedPhraseModal',
        onError: () => showModal('walletSelectionModal'),
        errorMessage: 'Failed to create new wallet'
    });

    setupWalletButton('importWalletBtn', initializeImportWallet, {
        hideModal: true,
        showModal: 'importWalletModal',
        onError: () => showModal('walletSelectionModal'),
        errorMessage: 'Failed to initialize import wallet'
    });
} 