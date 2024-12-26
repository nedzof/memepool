import { updateWalletUI, startBalanceUpdates, stopBalanceUpdates } from './walletUIManager.js';
import { showModal, hideModal, showSendModal, showReceiveModal } from './modalManager.js';
import { disconnectWallet } from './config.js';

// Setup main wallet events
export function setupMainWalletEvents() {
    console.log('Setting up main wallet events');
    
    const mainWalletModal = document.getElementById('mainWalletModal');
    if (!mainWalletModal) {
        console.error('Main wallet modal not found');
        return;
    }

    // Handle button clicks using event delegation
    mainWalletModal.addEventListener('click', (event) => {
        if (event.target.matches('#sendBtn')) {
            console.log('Send button clicked');
            try {
                showSendModal();
            } catch (error) {
                console.error('Error in Send button handler:', error);
            }
        } else if (event.target.matches('#receiveBtn')) {
            console.log('Receive button clicked');
            try {
                showReceiveModal();
            } catch (error) {
                console.error('Error in Receive button handler:', error);
            }
        } else if (event.target.matches('#profileBtn')) {
            console.log('Profile button clicked');
            try {
                hideModal('mainWalletModal');
                showModal('profileSetupModal');
            } catch (error) {
                console.error('Error in Profile button handler:', error);
            }
        } else if (event.target.matches('#disconnectBtn')) {
            console.log('Disconnect button clicked');
            try {
                disconnectWallet();
                location.reload();
            } catch (error) {
                console.error('Error in Disconnect button handler:', error);
            }
        }
    });
}

// Clean up wallet events
export function cleanupWalletEvents() {
    // Stop balance updates
    stopBalanceUpdates();
} 