import { updateWalletUI, startBalanceUpdates, stopBalanceUpdates } from './walletUIManager.js';
import { showModal, hideModal, showError } from '../modal.js';
import { disconnectWallet } from './config.js';
import { showSendModal, showReceiveModal } from './modalManager.js';

// Setup main wallet events
export function setupMainWalletEvents() {
    console.log('Setting up main wallet events');
    
    const mainWalletModal = document.getElementById('mainWalletModal');
    if (!mainWalletModal) {
        console.error('Main wallet modal not found');
        return;
    }

    // Check if events are already initialized
    if (mainWalletModal.hasAttribute('data-events-initialized')) {
        console.log('Main wallet events already initialized');
        return;
    }

    // Handle button clicks using event delegation
    mainWalletModal.addEventListener('click', (event) => {
        // Find the closest button that was clicked
        const button = event.target.closest('button');
        if (!button) return;

        console.log('Button clicked:', button.id);

        if (button.id === 'sendBtn') {
            console.log('Send button clicked');
            try {
                showSendModal();
            } catch (error) {
                console.error('Error in Send button handler:', error);
            }
        } else if (button.id === 'receiveBtn') {
            console.log('Receive button clicked');
            try {
                showReceiveModal();
            } catch (error) {
                console.error('Error in Receive button handler:', error);
            }
        } else if (button.id === 'profileBtn') {
            console.log('Profile button clicked');
            try {
                hideModal('mainWalletModal');
                showModal('profileSetupModal');
            } catch (error) {
                console.error('Error in Profile button handler:', error);
            }
        } else if (button.id === 'disconnectBtn') {
            console.log('Disconnect button clicked');
            try {
                disconnectWallet();
                location.reload();
            } catch (error) {
                console.error('Error in Disconnect button handler:', error);
            }
        }
    });

    // Mark events as initialized
    mainWalletModal.setAttribute('data-events-initialized', 'true');

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