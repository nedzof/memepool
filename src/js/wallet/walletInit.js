import { showModal, hideModal, showMainWallet, showWalletError } from './modalManager.js';
import { initUnisatWallet, initOKXWallet } from './walletInterfaces.js';
import { updateProfileWithPersistence } from './cache.js';
import { updateBalanceDisplay } from './walletEvents.js';
import { showWalletSelection, handleConnectWalletClick } from './walletSelection.js';

// Wallet type detection
export async function detectWalletType() {
    if (window.unisat) {
        return 'unisat';
    } else if (window.yours) {
        return 'yours';
    } else if (window.okxwallet) {
        return 'okx';
    }
    return null;
}

// Save wallet session
export function saveWalletSession(walletType, address) {
    try {
        localStorage.setItem('memepire_wallet_session', JSON.stringify({
            type: walletType,
            address: address,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving wallet session:', error);
    }
}

// Get last wallet session
export function getLastWalletSession() {
    try {
        const session = localStorage.getItem('memepire_wallet_session');
        return session ? JSON.parse(session) : null;
    } catch (error) {
        console.error('Error retrieving wallet session:', error);
        return null;
    }
}

// Connect UniSat wallet
export async function connectUnisatWallet() {
    try {
        const wallet = await initUnisatWallet();
        if (!wallet) {
            throw new Error('Failed to initialize UniSat wallet');
        }
        
        window.wallet = wallet;
        
        // Save wallet session
        saveWalletSession('unisat', wallet.getAddress());
        
        // Hide the wallet selection modal
        hideModal('initialSetupModal');
        
        // Update profile with persistence
        await updateProfileWithPersistence(wallet.getAddress());
        
        // Show the main wallet menu
        showMainWallet();
        
        // Update balance display immediately
        await updateBalanceDisplay();
        
        // Set up periodic balance updates
        setInterval(updateBalanceDisplay, 30000); // Update every 30 seconds
    } catch (error) {
        console.error('Failed to connect UniSat wallet:', error);
        showWalletError(error.message);
    }
}

// Connect OKX wallet
export async function connectOKXWallet() {
    try {
        const wallet = await initOKXWallet();
        if (!wallet) {
            throw new Error('Failed to initialize OKX wallet');
        }
        
        window.wallet = wallet;
        
        // Save wallet session
        saveWalletSession('okx', wallet.getAddress());
        
        // Hide the wallet selection modal
        hideModal('initialSetupModal');
        
        // Update profile with persistence
        await updateProfileWithPersistence(wallet.getAddress());
        
        // Show the main wallet menu
        showMainWallet();
        
        // Update balance display immediately
        await updateBalanceDisplay();
        
        // Set up periodic balance updates
        setInterval(updateBalanceDisplay, 30000); // Update every 30 seconds
    } catch (error) {
        console.error('Failed to connect OKX wallet:', error);
        showWalletError(error.message);
    }
}

// Initialize wallet
export async function initializeWallet() {
    console.log('Starting wallet initialization...');
    
    // Check for existing session
    const lastSession = getLastWalletSession();
    if (lastSession) {
        console.log('Found existing wallet session:', lastSession);
        
        // Verify wallet is still available
        const currentWalletType = await detectWalletType();
        if (currentWalletType === lastSession.type) {
            try {
                // Reconnect to the wallet
                const wallet = currentWalletType === 'unisat' ? 
                    await initUnisatWallet() : 
                    currentWalletType === 'okx' ?
                    await initOKXWallet() :
                    null;
                    
                if (!wallet) {
                    throw new Error('Failed to initialize wallet');
                }
                
                window.wallet = wallet;
                
                // Update balance display immediately
                await updateBalanceDisplay();
                
                // Set up periodic balance updates
                setInterval(updateBalanceDisplay, 30000); // Update every 30 seconds
                
                // Verify address matches
                if (wallet.getAddress() === lastSession.address) {
                    console.log('Successfully reconnected to previous wallet session');
                    await updateProfileWithPersistence(wallet.getAddress());
                    showMainWallet();
                    return;
                }
            } catch (error) {
                console.error('Failed to reconnect to previous session:', error);
            }
        }
    }

    // If no session or reconnection failed, proceed with normal initialization
    const walletType = await detectWalletType();
    
    // Update UI elements
    const connectBtn = document.getElementById('connectBtn');
    if (!connectBtn) {
        console.error('Connect wallet button not found');
        return;
    }

    // Remove any duplicate connect buttons
    const connectButtons = document.querySelectorAll('[id$="connectWalletBtn"]');
    if (connectButtons.length > 1) {
        for (let i = 1; i < connectButtons.length; i++) {
            connectButtons[i].remove();
        }
    }

    // Initialize modal states
    console.log('Initializing modal states...');
    const walletModals = document.querySelectorAll('[id$="Modal"]');
    walletModals.forEach(modal => {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });

    // Connect wallet button
    console.log('Setting up connect wallet button...');
    connectBtn.addEventListener('click', handleConnectWalletClick);
} 