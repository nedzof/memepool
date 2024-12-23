import { showModal, hideModal, showError } from '../modal.js';
import { generateNewWallet } from './walletGeneration.js';
import { initializeImportWallet } from './walletImport.js';
import { setWalletLoading } from './walletUIManager.js';
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
        
        // Ensure wallet loading state is managed
        setWalletLoading(true);
        
        // Find the connect wallet button
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        if (!connectWalletBtn) {
            console.error('Connect Wallet button not found');
            throw new Error('Connect Wallet button is missing');
        }

        // Add click event listener with comprehensive error handling
        connectWalletBtn.addEventListener('click', async (event) => {
            try {
                console.log('Connect Wallet button clicked');
                
                // Prevent multiple clicks
                event.preventDefault();
                event.stopPropagation();
                
                // Ensure button is not already disabled
                if (connectWalletBtn.disabled) {
                    console.warn('Connect Wallet button is currently disabled');
                    return;
                }

                // Disable button during wallet selection
                connectWalletBtn.disabled = true;
                connectWalletBtn.classList.add('cursor-wait', 'opacity-50');

                // Show wallet selection modal
                showWalletSelection();
            } catch (clickError) {
                console.error('Error in Connect Wallet button click handler:', clickError);
                showError(clickError.message || 'An unexpected error occurred while connecting wallet');
            } finally {
                // Re-enable button
                connectWalletBtn.disabled = false;
                connectWalletBtn.classList.remove('cursor-wait', 'opacity-50');
                setWalletLoading(false);
            }
        });

        // Trigger initial setup
        showWalletSelection();
    } catch (error) {
        console.error('Error setting up Connect Wallet functionality:', error);
        showError(error.message || 'Failed to set up wallet connection');
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
        showModal: 'passwordSetupModal',
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