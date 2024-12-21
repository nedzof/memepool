import { updateWalletUI } from './walletUIUpdates.js';
import { showModal, hideModal } from './modalManager.js';

// Update balance display
export async function updateBalanceDisplay() {
    try {
        if (!window.wallet?.getBalance) return;
        const balance = await window.wallet.getBalance();
        await updateWalletUI(balance);
    } catch (error) {
        console.error('Error updating balance display:', error);
    }
}

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
        disconnectBtn.addEventListener('click', () => {
            // Clear session and reset UI
            localStorage.removeItem('memepire_wallet_session');
            window.wallet = null;
            location.reload();
        });
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
    updateBalanceDisplay();
} 