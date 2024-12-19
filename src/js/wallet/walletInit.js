import { showModal, hideModal, showMainWallet, showWalletError } from './modalManager.js';
import { initUnisatWallet, initOKXWallet } from './walletInterfaces.js';
import { updateProfileWithPersistence } from './cache.js';
import { updateBalanceDisplay, handleConnectWalletButton } from './walletEvents.js';
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
        const sessionData = {
            type: walletType,
            address: address,
            timestamp: Date.now(),
            isConnected: true
        };
        localStorage.setItem('memepire_wallet_session', JSON.stringify(sessionData));
        
        // Update button state
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.classList.add('connected');
        }
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
        
        // Get the address to verify connection
        const address = await wallet.getAddress();
        if (!address) {
            throw new Error('Failed to get wallet address');
        }
        
        // Only set the wallet and save session if we have a valid address
        window.wallet = wallet;
        
        // Save wallet session
        saveWalletSession('unisat', address);
        
        // Hide the wallet selection modal
        hideModal('initialSetupModal');
        
        // Update profile with persistence
        await updateProfileWithPersistence(address);
        
        // Update button state and click handler
        await handleConnectWalletButton();
        
        // Show the main wallet menu
        showMainWallet();
        
        // Set up periodic balance updates
        setInterval(updateBalanceDisplay, 30000); // Update every 30 seconds
    } catch (error) {
        console.error('Failed to connect UniSat wallet:', error);
        // Reset wallet state
        window.wallet = null;
        // Reset button state
        await handleConnectWalletButton();
        showWalletError(error.message);
    }
}

// Connect OKX wallet
export async function connectOKXWallet() {
    try {
        console.log('Connecting OKX wallet...');
        const wallet = await initOKXWallet();
        if (!wallet) {
            throw new Error('Failed to initialize OKX wallet');
        }
        
        // Get the address to verify connection
        const address = await wallet.getAddress();
        if (!address) {
            throw new Error('Failed to get wallet address');
        }
        
        console.log('OKX wallet connected successfully:', { address });
        
        // Only set the wallet and save session if we have a valid address
        window.wallet = wallet;
        
        // Hide the wallet selection modal first
        hideModal('initialSetupModal');
        
        // Update profile with persistence
        await updateProfileWithPersistence(address);
        
        // Save wallet session
        saveWalletSession('okx', address);
        
        // Update button state and click handler
        await handleConnectWalletButton();
        
        // Show the main wallet menu
        showMainWallet();
        
        // Set up periodic balance updates
        setInterval(updateBalanceDisplay, 30000); // Update every 30 seconds
        
        console.log('OKX wallet setup complete');
    } catch (error) {
        console.error('Failed to connect OKX wallet:', error);
        // Reset wallet state
        window.wallet = null;
        // Reset button state
        await handleConnectWalletButton();
        // Clear any existing session
        localStorage.removeItem('memepire_wallet_session');
        showWalletError(error.message);
    }
}

// Initialize wallet
export async function initializeWallet() {
    console.log('Starting wallet initialization...');
    
    // Remove any duplicate connect buttons
    const connectButtons = document.querySelectorAll('[id$="connectWalletBtn"]');
    if (connectButtons.length > 1) {
        for (let i = 1; i < connectButtons.length; i++) {
            connectButtons[i].remove();
        }
    }

    // Initialize modal states
    const walletModals = document.querySelectorAll('[id$="Modal"]');
    walletModals.forEach(modal => {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });

    // Check for existing session
    const lastSession = getLastWalletSession();
    if (lastSession && lastSession.isConnected) {
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
                
                // Verify address matches
                const currentAddress = await wallet.getAddress();
                if (currentAddress === lastSession.address) {
                    console.log('Successfully reconnected to previous wallet session');
                    await updateProfileWithPersistence(currentAddress);
                    
                    // Set up periodic balance updates
                    setInterval(updateBalanceDisplay, 30000); // Update every 30 seconds
                }
            } catch (error) {
                console.error('Failed to reconnect to previous session:', error);
                // Clear invalid session
                localStorage.removeItem('memepire_wallet_session');
                window.wallet = null;
            }
        }
    }

    // Update button state and click handler
    await handleConnectWalletButton();
} 