import { showModal, hideModal, showError } from '../modal.js';
import { updateProfileWithPersistence } from './cache.js';
import { updateBalanceDisplay } from './walletEvents.js';
import { updateWalletUI, resetWalletUI, setWalletLoading } from './walletUIUpdates.js';
import { 
    SUPPORTED_WALLETS, 
    validateWalletInterface, 
    retryWalletOperation, 
    initializeWallet
} from './config.js';

// Custom error types
class WalletError extends Error {
    constructor(message, type = 'WalletError') {
        super(message);
        this.name = type;
    }
}

class WalletInitializationError extends WalletError {
    constructor(message) {
        super(message, 'WalletInitializationError');
    }
}

class WalletConnectionError extends WalletError {
    constructor(message) {
        super(message, 'WalletConnectionError');
    }
}

class WalletSessionError extends WalletError {
    constructor(message) {
        super(message, 'WalletSessionError');
    }
}

class WalletAddressError extends WalletError {
    constructor(message) {
        super(message, 'WalletAddressError');
    }
}

// Wallet Manager class to handle all wallet operations
class WalletManager {
    constructor() {
        this.balanceUpdateInterval = null;
        this.walletEventCleanupFns = new Map();
    }

    async detectWalletType() {
        for (const [type, config] of Object.entries(SUPPORTED_WALLETS)) {
            if (config.checkAvailability()) {
                return type;
            }
        }
        return null;
    }

    saveSession(walletType, address) {
        try {
            const sessionData = {
                type: walletType,
                address: address,
                timestamp: Date.now(),
                isConnected: true
            };
            localStorage.setItem('memepire_wallet_session', JSON.stringify(sessionData));
        } catch (error) {
            throw new WalletSessionError('Failed to save wallet session');
        }
    }

    getLastSession() {
        try {
            const session = localStorage.getItem('memepire_wallet_session');
            return session ? JSON.parse(session) : null;
        } catch (error) {
            throw new WalletSessionError('Failed to retrieve wallet session');
        }
    }

    clearSession() {
        try {
            localStorage.removeItem('memepire_wallet_session');
            this.cleanupWallet();
        } catch (error) {
            console.warn('Error clearing session:', error);
        }
    }

    cleanupWallet() {
        // Clear global wallet instance
        if (window.wallet?.disconnect) {
            try {
                window.wallet.disconnect();
            } catch (error) {
                console.warn('Error disconnecting wallet:', error);
            }
        }
        window.wallet = null;

        // Clear balance update interval
        if (this.balanceUpdateInterval) {
            clearInterval(this.balanceUpdateInterval);
            this.balanceUpdateInterval = null;
        }

        // Clean up event listeners
        this.cleanupWalletEvents();
    }

    cleanupWalletEvents() {
        // Clean up any registered event listeners
        for (const cleanup of this.walletEventCleanupFns.values()) {
            try {
                cleanup();
            } catch (error) {
                console.warn('Error cleaning up wallet event:', error);
            }
        }
        this.walletEventCleanupFns.clear();
    }

    async setupWalletEvents(wallet) {
        // Clean up any existing event listeners first
        this.cleanupWalletEvents();

        if (typeof wallet.on === 'function') {
            try {
                // Setup account switch event
                const switchAccountHandler = () => {
                    console.log('Wallet: Account switched');
                    updateWalletUI();
                };
                wallet.on('switchAccount', switchAccountHandler);
                this.walletEventCleanupFns.set('switchAccount', () => {
                    try {
                        wallet.off('switchAccount', switchAccountHandler);
                    } catch (error) {
                        console.warn('Error removing switchAccount listener:', error);
                    }
                });

                // Setup sign out event
                const signOutHandler = () => {
                    console.log('Wallet: Signed out');
                    this.disconnectWallet();
                };
                wallet.on('signedOut', signOutHandler);
                this.walletEventCleanupFns.set('signedOut', () => {
                    try {
                        wallet.off('signedOut', signOutHandler);
                    } catch (error) {
                        console.warn('Error removing signedOut listener:', error);
                    }
                });

                // Setup disconnect event if supported
                if (wallet.on.toString().includes('disconnect')) {
                    const disconnectHandler = () => {
                        console.log('Wallet: Disconnected');
                        this.disconnectWallet();
                    };
                    wallet.on('disconnect', disconnectHandler);
                    this.walletEventCleanupFns.set('disconnect', () => {
                        try {
                            wallet.off('disconnect', disconnectHandler);
                        } catch (error) {
                            console.warn('Error removing disconnect listener:', error);
                        }
                    });
                }
            } catch (error) {
                console.warn('Warning: Some wallet events not supported:', error);
            }
        }
    }

    async disconnectWallet() {
        this.clearSession();
        resetWalletUI();
        hideModal('mainWalletModal');
    }

    async connectWallet(walletType) {
        try {
            setWalletLoading(true);
            const config = SUPPORTED_WALLETS[walletType];
            if (!config) throw new Error(`Unsupported wallet type: ${walletType}`);

            // Clean up any existing wallet state
            this.cleanupWallet();

            // Initialize wallet with retry logic
            const wallet = await initializeWallet(walletType);
            window.wallet = wallet;
            
            // Get and verify address with retry
            const address = await retryWalletOperation(async () => {
                const addr = await wallet.getAddress();
                if (!addr) throw new WalletAddressError('No address returned from wallet');
                return addr;
            }, walletType);

            // Save session and update UI
            this.saveSession(walletType, address);
            await updateProfileWithPersistence(address);
            
            // Update UI with balance
            const balance = await retryWalletOperation(async () => {
                return wallet.getBalance();
            }, walletType).catch(error => {
                console.warn('Failed to get initial balance:', error);
                return 0;
            });
            
            await updateWalletUI(balance);
            
            // Hide selection modal and show main wallet
            hideModal('walletSelectionModal');
            showModal('mainWalletModal');
            
            // Setup periodic balance updates
            this.balanceUpdateInterval = setInterval(updateBalanceDisplay, 30000);
            
            return wallet;
        } catch (error) {
            console.error(`Wallet connection failed:`, error);
            
            // Show user-friendly error message based on error type
            let errorMessage = 'Failed to connect wallet. Please try again.';
            if (error instanceof WalletInitializationError) {
                errorMessage = 'Failed to initialize wallet. Please make sure it is installed correctly.';
            } else if (error instanceof WalletConnectionError) {
                errorMessage = 'Could not connect to wallet. Please check your connection and try again.';
            } else if (error instanceof WalletAddressError) {
                errorMessage = 'Could not access wallet address. Please check wallet permissions.';
            } else if (error instanceof WalletSessionError) {
                errorMessage = 'Failed to save wallet session. Please try again.';
            }
            
            showError(errorMessage);
            this.clearSession();
            resetWalletUI();
            throw error;
        } finally {
            setWalletLoading(false);
        }
    }

    async reconnectLastSession() {
        const lastSession = this.getLastSession();
        if (!lastSession?.isConnected) return false;

        const currentWalletType = await this.detectWalletType();
        if (currentWalletType !== lastSession.type) {
            throw new WalletConnectionError('Wallet type mismatch');
        }

        try {
            const wallet = await this.connectWallet(currentWalletType);
            const currentAddress = await wallet.getAddress();
            
            if (currentAddress !== lastSession.address) {
                throw new WalletAddressError('Address mismatch with saved session');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to reconnect to previous session:', error);
            this.clearSession();
            return false;
        }
    }

    async initialize() {
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
                hideModal(modal.id);
            }
        });

        try {
            // Try to reconnect to previous session
            const reconnected = await this.reconnectLastSession();
            if (!reconnected) {
                resetWalletUI();
            }
        } catch (error) {
            console.error('Initialization failed:', error);
            this.clearSession();
            resetWalletUI();
            
            // Only show error to user if it's not a normal disconnected state
            if (!(error instanceof WalletConnectionError && error.message === 'Wallet type mismatch')) {
                showError('Failed to initialize wallet. Please try connecting again.');
            }
        }
    }
}

// Create singleton instance
const walletManager = new WalletManager();

// Export functions that use the singleton
export const detectWalletType = () => walletManager.detectWalletType();
export const connectYoursWallet = () => walletManager.connectWallet('yours');
export const connectUnisatWallet = () => walletManager.connectWallet('unisat');
export const connectOKXWallet = () => walletManager.connectWallet('okx');
export const initialize = () => walletManager.initialize();
export const getLastWalletSession = () => walletManager.getLastSession(); 