import { showModal } from '../modal.js';
import { showWalletSelection } from './walletSelection.js';

// Centralized wallet UI state management
class WalletUIManager {
    constructor() {
        this.connectButton = null;
        this.initializeConnectButton();
    }

    initializeConnectButton() {
        this.connectButton = document.getElementById('connectWalletBtn');
        if (!this.connectButton) {
            console.error('Connect button not found');
            return;
        }
    }

    createNewButton(oldButton) {
        const newButton = oldButton.cloneNode(true);
        newButton.id = 'connectWalletBtn';
        return newButton;
    }

    async updateConnectedState(balance = null) {
        if (!this.connectButton) {
            this.initializeConnectButton();
            if (!this.connectButton) return;
        }

        try {
            if (!balance && window.wallet) {
                balance = await window.wallet.getBalance();
            }

            const newButton = this.createNewButton(this.connectButton);
            newButton.textContent = balance > 0 ? `${balance.toFixed(8)} BSV` : 'Connected';
            newButton.classList.add('connected');
            newButton.dataset.walletConnected = 'true';
            
            // Add click handler for showing main wallet
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Connect button clicked, showing main wallet modal...');
                showModal('mainWalletModal');
            });
            
            this.replaceButton(newButton);
            this.connectButton = newButton;

        } catch (error) {
            console.error('Error updating wallet UI:', error);
            this.resetToDisconnectedState();
        }
    }

    resetToDisconnectedState() {
        if (!this.connectButton) {
            this.initializeConnectButton();
            if (!this.connectButton) return;
        }

        const newButton = this.createNewButton(this.connectButton);
        newButton.textContent = 'Connect Wallet';
        newButton.classList.remove('connected');
        newButton.dataset.walletConnected = 'false';
        
        // Add click handler for showing wallet selection
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showWalletSelection();
        });
        
        this.replaceButton(newButton);
        this.connectButton = newButton;
    }

    replaceButton(newButton) {
        if (this.connectButton && this.connectButton.parentNode) {
            this.connectButton.parentNode.replaceChild(newButton, this.connectButton);
        }
    }

    updateLoadingState(isLoading) {
        if (!this.connectButton) return;
        
        if (isLoading) {
            this.connectButton.classList.add('loading');
            this.connectButton.disabled = true;
        } else {
            this.connectButton.classList.remove('loading');
            this.connectButton.disabled = false;
        }
    }
}

// Create singleton instance
const walletUIManager = new WalletUIManager();

// Export functions that use the singleton
export async function updateWalletUI(balance = null) {
    await walletUIManager.updateConnectedState(balance);
}

export function resetWalletUI() {
    walletUIManager.resetToDisconnectedState();
}

export function setWalletLoading(isLoading) {
    walletUIManager.updateLoadingState(isLoading);
} 