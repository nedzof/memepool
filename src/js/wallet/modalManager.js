import { showModal, hideModal, showError } from '../modal.js';
import { showWalletSelection } from './walletSelection.js';
import { setupMainWalletEvents } from './walletEvents.js';
import { setupReceiveModal } from './qrCode.js';

// Wallet-specific modal functions
export function showMainWallet() {
    console.log('Showing main wallet modal');
    
    // Ensure wallet is initialized
    const walletInitialized = sessionStorage.getItem('wallet_initialized');
    if (!walletInitialized) {
        console.error('Attempted to show main wallet before initialization');
        showError('Wallet not properly initialized');
        return;
    }
    
    // Hide all other modals first
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (!modal.classList.contains('hidden')) {
            hideModal(modal.id);
        }
    });

    // Show main wallet modal
    const mainWalletModal = document.getElementById('mainWalletModal');
    if (!mainWalletModal) {
        console.error('Main wallet modal not found');
        return;
    }

    showModal('mainWalletModal');
    
    // Initialize main wallet events
    setupMainWalletEvents();
    
    // Update wallet UI if needed
    const walletAddress = sessionStorage.getItem('wallet_address');
    if (walletAddress) {
        updateWalletUI();
    }
    
    console.log('Main wallet modal shown and events initialized');
}

// Show send modal
export function showSendModal() {
    console.log('showSendModal called');
    try {
        if (!sessionStorage.getItem('wallet_initialized')) {
            console.error('Attempted to show send modal before wallet initialization');
            return;
        }
        console.log('Hiding main wallet modal');
        hideModal('mainWalletModal');
        console.log('Showing send modal');
        showModal('sendModal');
        console.log('Setting up back button handlers');
        setupBackToMainHandlers();
    } catch (error) {
        console.error('Error in showSendModal:', error);
    }
}

// Show receive modal
export function showReceiveModal() {
    console.log('showReceiveModal called'); 
    try {
        if (!sessionStorage.getItem('wallet_initialized')) {
            console.error('Attempted to show receive modal before wallet initialization');
            return;
        }
        console.log('Hiding main wallet modal');
        hideModal('mainWalletModal');
        console.log('Showing receive modal');
        showModal('receiveModal');
        console.log('Setting up receive modal');
        setupReceiveModal();
        console.log('Setting up back button handlers');
        setupBackToMainHandlers();
    } catch (error) {
        console.error('Error in showReceiveModal:', error);
    }
}

// Setup back-to-main functionality
export function setupBackToMainHandlers() {
    // Get all back buttons
    const backButtons = document.querySelectorAll('.back-to-main');
    
    backButtons.forEach(button => {
        // Remove old button and create new one to clear event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add click handler to new button
        newButton.addEventListener('click', () => {
            console.log('Back button clicked');
            hideModal(newButton.closest('.modal').id);
            showMainWallet();
        });
    });
}

// Re-export base modal functions for backward compatibility
export { showModal, hideModal, showError } from '../modal.js';
// Re-export wallet selection function
export { showWalletSelection }; 