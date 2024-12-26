import { showModal, hideModal, showError } from '../modal.js';
import { handleConnectWalletClick } from './walletSelection.js';

// Loading state management
let isLoading = false;
let connectButton = null;

// Initialize connect button
export function initializeConnectButton() {
    connectButton = document.getElementById('connectWalletBtn');
    
    if (connectButton) {
        // Remove any existing click handlers
        const newButton = connectButton.cloneNode(true);
        connectButton.parentNode.replaceChild(newButton, connectButton);
        connectButton = newButton;
        
        connectButton.addEventListener('click', handleConnectWalletClick);
        console.log('Connect button initialized');
    } else {
        console.warn('Connect button not found, will try again when DOM updates');
        
        const observer = new MutationObserver((mutations, obs) => {
            const button = document.getElementById('connectWalletBtn');
            if (button) {
                // Remove any existing click handlers
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                connectButton = newButton;
                
                connectButton.addEventListener('click', handleConnectWalletClick);
                console.log('Connect button initialized after DOM update');
                obs.disconnect();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
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