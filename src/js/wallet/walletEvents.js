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

    disconnectButton.addEventListener('click', async () => {
        console.log('Disconnect button clicked');
        
        try {
            // Disconnect the wallet first (this also resets the UI)
            await disconnectWallet();
            
            // Terminate the session
            terminateSession();

            // Update header button to disconnected state
            updateHeaderWalletButton(false);

            // Hide the main wallet modal
            hideModal('mainWalletModal');
            
            console.log('Wallet disconnected successfully');
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
            showError('Failed to disconnect wallet. Please try again.');
        }
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