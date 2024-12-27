import { showModal, hideModal, showError } from '../modal.js';
import { showWalletSelection } from './walletSelection.js';
import { setupMainWalletEvents } from './walletEvents.js';
import { setupReceiveModal } from './qrCode.js';
import { updateWalletUI } from './walletUIManager.js';

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
    
    // Show main wallet modal
    const mainWalletModal = document.getElementById('mainWalletModal');
    if (!mainWalletModal) {
        console.error('Main wallet modal not found');
        return;
    }

    // If modal is already open and initialized, just return
    if (mainWalletModal.classList.contains('open') && mainWalletModal.hasAttribute('data-initialized')) {
        console.log('Main wallet modal already open and initialized');
        return;
    }

    // Hide all other modals first
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (!modal.classList.contains('hidden') && modal.id !== 'mainWalletModal') {
            hideModal(modal.id);
        }
    });

    // Show the modal
    showModal('mainWalletModal');

    // Only initialize events if not already initialized
    if (!mainWalletModal.hasAttribute('data-initialized')) {
        // Wait for included content to be loaded
        const checkIncludedContent = () => {
            console.log('Checking for buttons...');
            const sendBtn = document.getElementById('sendBtn');
            const receiveBtn = document.getElementById('receiveBtn');
            const disconnectBtn = document.getElementById('disconnectBtn');

            console.log('Button elements:', { 
                sendBtn: sendBtn?.id, 
                receiveBtn: receiveBtn?.id, 
                disconnectBtn: disconnectBtn?.id 
            });

            if (!sendBtn || !receiveBtn || !disconnectBtn) {
                console.log('Some buttons not found, waiting...');
                setTimeout(checkIncludedContent, 100);
                return;
            }

            console.log('All buttons found, initializing events');
            
            // Initialize main wallet events
            console.log('Setting up main wallet events...');
            setupMainWalletEvents();
            
            // Update wallet UI if needed
            const walletAddress = sessionStorage.getItem('wallet_address');
            if (walletAddress) {
                console.log('Updating wallet UI with address:', walletAddress);
                updateWalletUI();
            }
            
            // Mark as initialized
            mainWalletModal.setAttribute('data-initialized', 'true');
            
            console.log('Main wallet modal shown and events initialized');
        };

        checkIncludedContent();
    } else {
        console.log('Main wallet modal already initialized, skipping event setup');
        // Just update the UI
        const walletAddress = sessionStorage.getItem('wallet_address');
        if (walletAddress) {
            console.log('Updating wallet UI with address:', walletAddress);
            updateWalletUI();
        }
    }
}

// Show send modal
export function showSendModal() {
    console.log('showSendModal called');
    try {
        if (!sessionStorage.getItem('wallet_initialized')) {
            console.error('Attempted to show send modal before wallet initialization');
            return;
        }

        // Wait for send modal to be loaded
        const checkSendModal = () => {
            console.log('Checking for send modal...');
            const sendModal = document.getElementById('sendModal');
            console.log('Send modal found:', sendModal?.id);

            if (!sendModal) {
                console.log('Send modal not found, waiting...');
                setTimeout(checkSendModal, 100);
                return;
            }

            console.log('Send modal found, showing it');
            hideModal('mainWalletModal');
            showModal('sendModal');
            setupBackToMainHandlers();
        };

        checkSendModal();
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

        // Wait for receive modal to be loaded
        const checkReceiveModal = () => {
            console.log('Checking for receive modal...');
            const receiveModal = document.getElementById('receiveModal');
            console.log('Receive modal found:', receiveModal?.id);

            if (!receiveModal) {
                console.log('Receive modal not found, waiting...');
                setTimeout(checkReceiveModal, 100);
                return;
            }

            console.log('Receive modal found, showing it');
            hideModal('mainWalletModal');
            showModal('receiveModal');
            setupReceiveModal();
            setupBackToMainHandlers();
        };

        checkReceiveModal();
    } catch (error) {
        console.error('Error in showReceiveModal:', error);
    }
}

// Setup back-to-main functionality
export function setupBackToMainHandlers() {
    console.log('Setting up back-to-main handlers...');
    // Get all back buttons
    const backButtons = document.querySelectorAll('.back-to-main');
    console.log('Found back buttons:', backButtons.length);
    
    backButtons.forEach(button => {
        // Remove old button and create new one to clear event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add click handler to new button
        newButton.addEventListener('click', () => {
            console.log('Back button clicked');
            const modal = newButton.closest('.modal');
            console.log('Closing modal:', modal?.id);
            if (modal) {
                hideModal(modal.id);
            }
            showMainWallet();
        });
    });
    console.log('Back-to-main handlers setup complete');
}

// Re-export base modal functions for backward compatibility
export { showModal, hideModal, showError } from '../modal.js';
// Re-export wallet selection function
export { showWalletSelection }; 