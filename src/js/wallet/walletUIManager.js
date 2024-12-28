import { showModal, hideModal, showError } from '../modal.js';
import { handleConnectWalletClick } from './walletSelection.js';

// Loading state management
let isLoading = false;
let connectButton = null;

// Loading state
export function setWalletLoading(loading) {
    isLoading = loading;
    const connectButton = document.getElementById('connectWalletBtn');
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
    const connectButton = document.getElementById('connectWalletBtn');
    if (connectButton) {
        connectButton.textContent = 'Connect Wallet';
        connectButton.classList.remove('connected');
        connectButton.dataset.walletConnected = 'false';
        delete connectButton.dataset.balance;
    }
}

// Update wallet UI with connected state
export async function updateWalletUI(balance = null) {
    const connectButton = document.getElementById('connectWalletBtn');
    if (connectButton) {
        connectButton.textContent = balance ? `${balance.toFixed(8)} BSV` : 'Connected';
        connectButton.classList.add('connected');
        connectButton.dataset.walletConnected = 'true';
        if (balance) connectButton.dataset.balance = balance;
    }
}

// Initialize wallet UI
export function initializeWalletUI() {
    // No need to initialize connect button here as it's handled by header.js
    console.log('Wallet UI initialized');
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