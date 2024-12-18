import { showModal, hideModal } from './modalManager.js';
import { setupReceiveModal } from './qrCode.js';
import { clearAllCache } from './cache.js';
import { fetchBalanceFromWhatsOnChain } from './blockchain.js';

// Setup main wallet events
export function setupMainWalletEvents() {
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

    // Update wallet balance and address
    updateWalletDisplay();
}

// Handle wallet disconnect
export function handleDisconnect() {
    // Clear wallet instance and session
    window.wallet = null;
    localStorage.removeItem('memepire_wallet_session');
    
    // Reset the connect button text and state
    const connectButton = document.getElementById('connectWalletBtn');
    if (connectButton) {
        connectButton.textContent = 'Connect Wallet';
        connectButton.classList.remove('connected');
    }

    // Close all modals
    const modals = document.querySelectorAll('[id$="Modal"]');
    modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    });
    
    // Show the initial setup modal
    const initialSetupModal = document.getElementById('initialSetupModal');
    if (initialSetupModal) {
        initialSetupModal.style.display = 'flex';
        initialSetupModal.classList.remove('hidden');
    }
    
    // Clear all cached data
    clearAllCache();
}

// Update wallet display
export function updateWalletDisplay() {
    const addressDisplay = document.getElementById('walletAddress');
    const balanceDisplay = document.getElementById('walletBalance');
    const walletTypeDisplay = document.getElementById('walletType');
    
    if (window.wallet) {
        // Get wallet type
        const walletType = window.wallet.getAddress().startsWith('0x') ? 'OKX' : 'UniSat';
        
        if (addressDisplay) {
            const address = window.wallet.getAddress();
            addressDisplay.textContent = address ? 
                `${address.slice(0, 6)}...${address.slice(-4)}` : 
                'No address available';
        }

        if (walletTypeDisplay) {
            walletTypeDisplay.textContent = `Connected with ${walletType}`;
        }

        if (balanceDisplay && typeof window.wallet.getBalance === 'function') {
            window.wallet.getBalance().then(balance => {
                const formattedBalance = balance.toFixed(8);
                balanceDisplay.textContent = `${formattedBalance} BSV`;
                
                // Update connect button
                const connectBtn = document.getElementById('connectWalletBtn');
                if (connectBtn) {
                    connectBtn.textContent = `${formattedBalance} BSV`;
                    connectBtn.classList.add('connected');
                }
            }).catch(error => {
                console.error('Error fetching balance:', error);
                balanceDisplay.textContent = '0 BSV';
            });
        }
    }
}

// Update balance display
export async function updateBalanceDisplay() {
    const balanceDisplay = document.getElementById('walletBalance');
    const connectBtn = document.getElementById('connectWalletBtn');
    const availableBalance = document.getElementById('availableBalance');
    const walletTypeDisplay = document.getElementById('walletType');
    
    if (window.wallet) {
        try {
            // Get the legacy address for WhatsOnChain lookup
            const address = window.wallet.getLegacyAddress();
            if (!address) {
                console.error('No legacy address available');
                return;
            }

            // Get wallet type
            const walletType = window.wallet.getAddress().startsWith('0x') ? 'OKX' : 'UniSat';
            
            // Update wallet type display
            if (walletTypeDisplay) {
                walletTypeDisplay.textContent = `Connected with ${walletType}`;
            }

            // Fetch balance from WhatsOnChain
            const balance = await fetchBalanceFromWhatsOnChain(address);
            const formattedBalance = balance.toFixed(8);
            
            // Update all balance displays
            if (balanceDisplay) {
                balanceDisplay.textContent = formattedBalance;
            }
            if (availableBalance) {
                availableBalance.textContent = formattedBalance;
            }
            if (connectBtn) {
                connectBtn.textContent = `${formattedBalance} BSV`;
                connectBtn.classList.add('connected');
            }
        } catch (error) {
            console.error('Error updating balance:', error);
            // Set default values on error
            if (balanceDisplay) balanceDisplay.textContent = '0';
            if (availableBalance) availableBalance.textContent = '0';
            if (connectBtn) {
                connectBtn.textContent = '0 BSV';
                connectBtn.classList.add('connected');
            }
        }
    }
} 