import { updateWalletUI, startBalanceUpdates, stopBalanceUpdates } from './walletUIManager.js';
import { showModal, hideModal, showSendModal, showReceiveModal } from './modalManager.js';
import { disconnectWallet } from './config.js';

// Setup main wallet events
export function setupMainWalletEvents() {
    console.log('Setting up main wallet events');
    
    // Get all the buttons
    const sendBtn = document.getElementById('sendBtn');
    const receiveBtn = document.getElementById('receiveBtn');
    const profileBtn = document.getElementById('profileBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');

    // Setup Send button
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            console.log('Send button clicked');
            showSendModal();
        });
    }

    // Setup Receive button
    if (receiveBtn) {
        receiveBtn.addEventListener('click', () => {
            console.log('Receive button clicked');
            showReceiveModal();
        });
    }

    // Setup Profile button
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            console.log('Profile button clicked');
            hideModal('mainWalletModal');
            showModal('profileSetupModal');
        });
    }

    // Setup Disconnect button
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            console.log('Disconnect button clicked');
            disconnectWallet();
            location.reload();
        });
    }
}

// Clean up wallet events
export function cleanupWalletEvents() {
    // Stop balance updates
    stopBalanceUpdates();
} 