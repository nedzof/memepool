import { showModal, hideModal } from './modalManager.js';
import { setupReceiveModal } from './qrCode.js';
import { clearAllCache } from './cache.js';

// Setup main wallet events
export function setupMainWalletEvents() {
    console.log('Setting up main wallet events');
    
    // Send button
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            hideModal('mainWalletModal');
            showModal('sendModal');
        });
    }

    // Receive button
    const receiveBtn = document.getElementById('receiveBtn');
    if (receiveBtn) {
        receiveBtn.addEventListener('click', () => {
            hideModal('mainWalletModal');
            showModal('receiveModal');
            setupReceiveModal();
        });
    }

    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            hideModal('mainWalletModal');
            showModal('profileSetupModal');
        });
    }

    // Disconnect button
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', handleDisconnect);
    }

    // Close buttons for each modal
    const closeButtons = document.querySelectorAll('[id$="CloseBtn"]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal-target') || 'mainWalletModal';
            hideModal(modalId);
            if (modalId !== 'mainWalletModal') {
                showModal('mainWalletModal');
            }
        });
    });

    // Update wallet display
    updateWalletDisplay();
}

// Handle wallet disconnect
export function handleDisconnect() {
    console.log('Handling wallet disconnect');
    
    // Clear wallet instance
    window.wallet = null;
    
    // Clear session and mark as disconnected
    const session = localStorage.getItem('memepire_wallet_session');
    if (session) {
        const sessionData = JSON.parse(session);
        sessionData.isConnected = false;
        localStorage.setItem('memepire_wallet_session', JSON.stringify(sessionData));
    }
    
    // Reset the connect button text and state
    const connectButton = document.getElementById('connectWalletBtn');
    if (connectButton) {
        connectButton.textContent = 'Connect Wallet';
        connectButton.classList.remove('connected');
    }

    // Close all modals
    const modals = document.querySelectorAll('[id$="Modal"]');
    modals.forEach(modal => {
        hideModal(modal.id);
    });
    
    // Clear all cached data
    clearAllCache();
}

// Update wallet display
export async function updateWalletDisplay() {
    console.log('Updating wallet display');
    
    if (!window.wallet) {
        console.log('No wallet instance found');
        return;
    }

    try {
        // Get wallet type and address
        const walletType = window.wallet.type || window.wallet.getConnectionType();
        const address = await window.wallet.getAddress();
        console.log('Wallet type:', walletType, 'Address:', address);

        // Update address display
        const addressDisplay = document.getElementById('walletAddress');
        if (addressDisplay) {
            addressDisplay.textContent = address;
        }

        // Update balance
        await updateBalanceDisplay();

        // Update wallet type display
        const walletTypeDisplay = document.getElementById('walletType');
        if (walletTypeDisplay) {
            walletTypeDisplay.textContent = walletType.toUpperCase();
        }
    } catch (error) {
        console.error('Error updating wallet display:', error);
    }
}

// Update balance display
export async function updateBalanceDisplay() {
    console.log('Updating balance display');
    
    if (!window.wallet) {
        console.log('No wallet instance found');
        return;
    }

    try {
        // Get wallet type and address
        const walletType = window.wallet.type || window.wallet.getConnectionType();
        const address = await window.wallet.getAddress();
        console.log('Wallet type:', walletType, 'Address:', address);

        // Get balance
        const balance = await window.wallet.getBalance();
        const formattedBalance = balance.toFixed(8);
        console.log('Formatted balance:', formattedBalance);

        // Update balance displays
        const balanceDisplays = document.querySelectorAll('.balance-value');
        balanceDisplays.forEach(display => {
            display.textContent = formattedBalance;
        });

        // Update connect button if it exists
        const connectButton = document.getElementById('connectWalletBtn');
        if (connectButton) {
            connectButton.textContent = `${formattedBalance} BSV`;
            connectButton.classList.add('connected');
        }
    } catch (error) {
        console.error('Error updating balance display:', error);
    }
} 