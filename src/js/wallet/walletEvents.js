import { updateWalletUI, startBalanceUpdates, stopBalanceUpdates, resetWalletUI } from './walletUIManager.js';
import { showModal, hideModal, showError } from '../modal.js';
import { disconnectWallet } from './config.js';
import { showSendModal, showReceiveModal } from './modalManager.js';
import { terminateSession } from './auth/session.js';
import { updateHeaderWalletButton } from '../header.js';

// Setup main wallet events
export function setupMainWalletEvents() {
    console.log('Setting up main wallet events...');
    
    // Get main wallet modal elements
    const mainWalletModal = document.getElementById('mainWalletModal');
    const sendButton = document.getElementById('sendBtn');
    const receiveButton = document.getElementById('receiveBtn');
    const disconnectButton = document.getElementById('disconnectBtn');

    // Verify elements exist
    if (!mainWalletModal || !sendButton || !receiveButton || !disconnectButton) {
        console.error('Main wallet modal elements not found');
        return;
    }

    // Add event listeners
    sendButton.addEventListener('click', () => {
        console.log('Send button clicked');
        showSendModal();
    });

    receiveButton.addEventListener('click', () => {
        console.log('Receive button clicked');
        showReceiveModal();
    });

    disconnectButton.addEventListener('click', () => {
        console.log('Disconnect button clicked');
        
        // Terminate the current session
        terminateSession();

        // Reset wallet UI to disconnected state
        resetWalletUI();

        // Update header button to disconnected state
        updateHeaderWalletButton(false);

        // Clear wallet data from session storage
        sessionStorage.removeItem('wallet_type');
        sessionStorage.removeItem('wallet_address');
        sessionStorage.removeItem('wallet_public_key');
        sessionStorage.removeItem('wallet_initialized');

        // Hide the main wallet modal
        hideModal('mainWalletModal');
    });

    // Start balance updates when modal is shown
    mainWalletModal.addEventListener('show.bs.modal', () => {
        console.log('Main wallet modal shown, starting balance updates');
        startBalanceUpdates();
    });

    // Stop balance updates when modal is hidden
    mainWalletModal.addEventListener('hide.bs.modal', () => {
        console.log('Main wallet modal hidden, stopping balance updates');
        stopBalanceUpdates();
    });

    console.log('Main wallet events setup complete');
}

// Clean up wallet events
export function cleanupWalletEvents() {
    console.log('Cleaning up wallet events');
    // Stop balance updates
    stopBalanceUpdates();
    
    // Remove events initialization flag
    const mainWalletModal = document.getElementById('mainWalletModal');
    if (mainWalletModal) {
        mainWalletModal.removeAttribute('data-events-initialized');
    }
} 