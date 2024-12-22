import { showModal, hideModal, initializeModal } from '../modal.js';
import { showWalletSelection } from './walletSelection.js';
import { fetchBalanceFromWhatsOnChain } from './bitcoin.js';
import { disconnectWallet } from './config.js';

// Centralized wallet UI state management
class WalletUIManager {
    constructor() {
        this.connectButton = null;
        this.bsvToUsdRate = 0;
        this.balanceUpdateInterval = null;
        this.initializeConnectButton();
        this.initializePriceUpdates();
    }

    initializeConnectButton() {
        this.connectButton = document.getElementById('connectWalletBtn');
        if (!this.connectButton) {
            console.error('Connect button not found');
            return;
        }
    }

    initializePriceUpdates() {
        // Initial price fetch
        this.fetchBSVPrice();
        // Update price every minute
        setInterval(() => this.fetchBSVPrice(), 60000);
    }

    async fetchBSVPrice() {
        try {
            const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/exchangerate');
            const data = await response.json();
            this.bsvToUsdRate = data.rate;
            this.updateAllUSDValues();
        } catch (error) {
            console.error('Error fetching BSV price:', error);
        }
    }

    updateAllUSDValues() {
        // Update main wallet balance
        const mainBalance = document.getElementById('walletBalance');
        const mainBalanceUSD = document.getElementById('balanceUSD');
        if (mainBalance && mainBalanceUSD) {
            const bsvAmount = parseFloat(mainBalance.textContent);
            const usdAmount = (bsvAmount * this.bsvToUsdRate).toFixed(2);
            mainBalanceUSD.textContent = `≈ $${usdAmount}`;
        }

        // Update send modal balance
        const sendBalance = document.getElementById('availableBalance');
        const sendBalanceUSD = document.getElementById('amountUSD');
        if (sendBalance && sendBalanceUSD) {
            const bsvAmount = parseFloat(sendBalance.textContent);
            const usdAmount = (bsvAmount * this.bsvToUsdRate).toFixed(2);
            sendBalanceUSD.textContent = `≈ $${usdAmount}`;
        }

        // Update connect button balance if exists
        if (this.connectButton && this.connectButton.dataset.balance) {
            const bsvAmount = parseFloat(this.connectButton.dataset.balance);
            const usdAmount = (bsvAmount * this.bsvToUsdRate).toFixed(2);
            this.connectButton.innerHTML = `${bsvAmount.toFixed(8)} BSV<br><span class="text-sm text-gray-400">≈ $${usdAmount}</span>`;
        }
    }

    setupAmountSlider() {
        const slider = document.getElementById('amountSlider');
        const amountInput = document.getElementById('sendAmount');
        const maxBSV = document.getElementById('maxBSV');
        const amountUSD = document.getElementById('amountUSD');
        const availableBalance = document.getElementById('availableBalance');

        if (slider && amountInput && maxBSV && amountUSD && availableBalance) {
            const maxAmount = parseFloat(availableBalance.textContent);
            slider.max = maxAmount;
            maxBSV.textContent = `${maxAmount.toFixed(8)} BSV`;

            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                amountInput.value = value.toFixed(8);
                const usdAmount = (value * this.bsvToUsdRate).toFixed(2);
                amountUSD.textContent = `≈ $${usdAmount}`;
            });

            amountInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    slider.value = value;
                    const usdAmount = (value * this.bsvToUsdRate).toFixed(2);
                    amountUSD.textContent = `≈ $${usdAmount}`;
                }
            });
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
            newButton.dataset.balance = balance;
            
            // Add click handler for showing main wallet
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Connect button clicked, showing main wallet modal...');
                showModal('mainWalletModal');
            });
            
            this.replaceButton(newButton);
            this.connectButton = newButton;
            this.updateAllUSDValues();

            // Start periodic balance updates
            this.startBalanceUpdates();

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
        delete newButton.dataset.balance;
        
        // Add click handler for showing wallet selection
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showWalletSelection();
        });
        
        this.replaceButton(newButton);
        this.connectButton = newButton;

        // Stop balance updates
        this.stopBalanceUpdates();
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

    startBalanceUpdates() {
        // Clear any existing interval
        this.stopBalanceUpdates();
        
        // Start new interval
        this.balanceUpdateInterval = setInterval(async () => {
            try {
                if (!window.wallet?.getBalance) return;
                const balance = await window.wallet.getBalance();
                await this.updateConnectedState(balance);
            } catch (error) {
                console.error('Error updating balance:', error);
            }
        }, 30000); // Update every 30 seconds
    }

    stopBalanceUpdates() {
        if (this.balanceUpdateInterval) {
            clearInterval(this.balanceUpdateInterval);
            this.balanceUpdateInterval = null;
        }
    }

    setupMainWalletEvents() {
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
        this.startBalanceUpdates();
    }

    initialize() {
        // Setup amount slider when send modal is shown
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                setTimeout(() => this.setupAmountSlider(), 100);
            });
        }

        // Handle connect button click to show main wallet if already connected
        if (this.connectButton && this.connectButton.dataset.balance) {
            this.connectButton.addEventListener('click', (e) => {
                e.preventDefault();
                showModal('mainWalletModal');
            });
        }
    }
}

// Create singleton instance
const walletUIManager = new WalletUIManager();

// Export functions that use the singleton
export function initializeWalletUI() {
    walletUIManager.initialize();
}

export async function updateWalletUI(balance = null) {
    await walletUIManager.updateConnectedState(balance);
}

export function resetWalletUI() {
    walletUIManager.resetToDisconnectedState();
}

export function setWalletLoading(isLoading) {
    walletUIManager.updateLoadingState(isLoading);
}

export function updateUSDValues() {
    walletUIManager.updateAllUSDValues();
}

export function setupAmountSlider() {
    walletUIManager.setupAmountSlider();
}

export function setupMainWalletEvents() {
    walletUIManager.setupMainWalletEvents();
}

// Export balance update functions
export function startBalanceUpdates() {
    walletUIManager.startBalanceUpdates();
}

export function stopBalanceUpdates() {
    walletUIManager.stopBalanceUpdates();
} 