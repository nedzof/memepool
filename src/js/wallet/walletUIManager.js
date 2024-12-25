import { showModal, hideModal, showError } from '../modal.js';
import { handleConnectWalletClick } from './walletSelection.js';

// Loading state management
let isLoading = false;
let connectButton = null;

// Initialize connect button
export function initializeConnectButton() {
    connectButton = document.querySelector('.connect-wallet-btn, #connectWalletBtn');
    if (!connectButton) {
        console.warn('Connect button not found, will try again when DOM updates');
        // Set up a mutation observer to watch for the button
        const observer = new MutationObserver((mutations, obs) => {
            const button = document.querySelector('.connect-wallet-btn, #connectWalletBtn');
            if (button) {
                console.log('Connect button found, initializing...');
                connectButton = button;
                button.addEventListener('click', handleConnectWalletClick);
                obs.disconnect(); // Stop observing once we find the button
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        return;
    }

    console.log('Found connect button, adding click handler');
    connectButton.addEventListener('click', handleConnectWalletClick);
}

// Loading state
export function setWalletLoading(loading) {
    isLoading = loading;
    if (connectButton) {
        if (loading) {
            connectButton.classList.add('loading');
            connectButton.disabled = true;
        } else {
            connectButton.classList.remove('loading');
            connectButton.disabled = false;
        }
    }
}

// Reset wallet UI to disconnected state
export function resetWalletUI() {
    if (connectButton) {
        connectButton.textContent = 'Connect Wallet';
        connectButton.classList.remove('connected');
        connectButton.dataset.walletConnected = 'false';
        delete connectButton.dataset.balance;
        connectButton.addEventListener('click', handleConnectWalletClick);
    }
}

// Update wallet UI with connected state
export async function updateWalletUI(balance = null) {
    if (connectButton) {
        connectButton.textContent = balance ? `${balance.toFixed(8)} BSV` : 'Connected';
        connectButton.classList.add('connected');
        connectButton.dataset.walletConnected = 'true';
        if (balance) connectButton.dataset.balance = balance;
        
        // Update click handler to show main wallet
        connectButton.addEventListener('click', () => {
            showModal('mainWalletModal');
        });
    }
}

// Initialize wallet UI
export function initializeWalletUI() {
    initializeConnectButton();
}

// Balance update functions
export function startBalanceUpdates() {
    // Implement if needed
    console.log('Balance updates started');
}

export function stopBalanceUpdates() {
    // Implement if needed
    console.log('Balance updates stopped');
}

// Initialize when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConnectButton);
} else {
    initializeConnectButton();
} 