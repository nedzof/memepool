import { updateWalletUI, startBalanceUpdates, stopBalanceUpdates } from './walletUIManager.js';
import { showModal, hideModal, initializeModal } from '../modal.js';
import { disconnectWallet } from './config.js';

// Setup main wallet events
export function setupMainWalletEvents() {
    console.log('Setting up main wallet events');
    
    // Initialize main wallet modal
    initializeModal('mainWalletModal', {
        listeners: {
            '#sendBtn': () => {
                hideModal('mainWalletModal');
                showModal('sendModal');
            },
            '#receiveBtn': () => {
                hideModal('mainWalletModal');
                showModal('receiveModal');
            },
            '#profileBtn': () => {
                hideModal('mainWalletModal');
                showModal('profileSetupModal');
            },
            '#disconnectBtn': () => {
                disconnectWallet();
                location.reload();
            }
        }
    });

    // Initialize send modal
    initializeModal('sendModal', {
        returnTo: 'mainWalletModal'
    });

    // Initialize receive modal
    initializeModal('receiveModal', {
        returnTo: 'mainWalletModal'
    });

    // Initialize profile setup modal
    initializeModal('profileSetupModal', {
        returnTo: 'mainWalletModal'
    });

    // Start balance updates
    startBalanceUpdates();
}

// Clean up wallet events
export function cleanupWalletEvents() {
    // Stop balance updates
    stopBalanceUpdates();
} 