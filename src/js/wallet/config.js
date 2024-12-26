import { fetchBalanceFromWhatsOnChain } from './bitcoin.js';
import { resetWalletUI } from './walletUIManager.js';

// Get balance with WhatsOnChain
async function getBalance(address) {
    try {
        return await fetchBalanceFromWhatsOnChain(address);
    } catch (error) {
        console.error('Error getting balance:', error);
        return 0;
    }
}

// Initialize Unisat wallet interface
async function initUnisatWallet() {
    if (!window.unisat) throw new Error('Unisat wallet not found');

    try {
        await window.unisat.requestAccounts();
        const address = await window.unisat.getAccounts().then(accounts => accounts[0]);
        if (!address) throw new Error('No address found');
        
        return {
            type: 'unisat',
            getAddress: () => address,
            getPublicKey: () => address,
            getBalance: () => getBalance(address)
        };
    } catch (error) {
        console.error('Error initializing Unisat wallet:', error);
        throw error;
    }
}

// Initialize OKX wallet interface
async function initOKXWallet() {
    if (!window.okxwallet) throw new Error('OKX wallet not found');

    try {
        await window.okxwallet.request({ method: 'eth_requestAccounts' });
        const address = await window.okxwallet.request({ method: 'eth_accounts' }).then(accounts => accounts[0]);
        if (!address) throw new Error('No address found');
        
        return {
            type: 'okx',
            getAddress: () => address,
            getPublicKey: () => address,
            getBalance: () => getBalance(address)
        };
    } catch (error) {
        console.error('Error initializing OKX wallet:', error);
        throw error;
    }
}

// Initialize Phantom wallet interface
async function initPhantomWallet() {
    if (!window.phantom?.solana) {
        window.open('https://phantom.app', '_blank');
        throw new Error('Phantom wallet not found. Please install Phantom wallet.');
    }

    try {
        // Request connection to Phantom
        const resp = await window.phantom.solana.connect();
        const address = resp.publicKey.toString();
        if (!address) throw new Error('No address found');
        
        // Create wallet interface
        const wallet = {
            type: 'phantom',
            address: address,
            getAddress: () => address,
            getPublicKey: () => address,
            getBalance: async () => {
                try {
                    const connection = new window.solana.Connection('https://api.mainnet-beta.solana.com');
                    const balance = await connection.getBalance(new window.solana.PublicKey(address));
                    return balance / 1e9; // Convert lamports to SOL
                } catch (error) {
                    console.error('Error getting Phantom wallet balance:', error);
                    return 0;
                }
            },
            disconnect: async () => {
                try {
                    await window.phantom.solana.disconnect();
                } catch (error) {
                    console.error('Error disconnecting Phantom wallet:', error);
                }
            }
        };

        // Store wallet instance
        window.wallet = wallet;
        
        return wallet;
    } catch (error) {
        console.error('Error initializing Phantom wallet:', error);
        throw error;
    }
}

// Required wallet interface methods
const REQUIRED_METHODS = ['getAddress', 'getBalance', 'getPublicKey'];

// Wallet configuration
export const SUPPORTED_WALLETS = {
    unisat: {
        id: 'unisatWalletBtn',
        name: 'Unisat',
        checkAvailability: () => window.unisat !== undefined,
        initialize: initUnisatWallet,
        installUrl: 'https://unisat.io',
        errorMessage: 'Failed to connect to Unisat Wallet',
        retryAttempts: 3,
        retryDelay: 1000
    },
    okx: {
        id: 'okxWalletBtn',
        name: 'OKX',
        checkAvailability: () => window.okxwallet !== undefined,
        initialize: initOKXWallet,
        installUrl: 'https://www.okx.com/web3',
        errorMessage: 'Failed to connect to OKX Wallet',
        retryAttempts: 3,
        retryDelay: 1000
    },
    phantom: {
        id: 'phantomWalletBtn',
        name: 'Phantom',
        checkAvailability: () => window.phantom?.solana !== undefined,
        initialize: initPhantomWallet,
        installUrl: 'https://phantom.app',
        errorMessage: 'Failed to connect to Phantom Wallet. Please make sure Phantom is installed and unlocked.',
        retryAttempts: 3,
        retryDelay: 1000
    }
};

// Helper function to validate wallet interface
export function validateWalletInterface(wallet, walletType) {
    if (!wallet) throw new Error(`Invalid wallet instance for ${walletType}`);

    const missingMethods = REQUIRED_METHODS.filter(method => typeof wallet[method] !== 'function');
    if (missingMethods.length > 0) {
        throw new Error(`Wallet ${walletType} is missing required methods: ${missingMethods.join(', ')}`);
    }

    return true;
}

// Helper function to retry wallet operations
export async function retryWalletOperation(operation, walletType) {
    const config = SUPPORTED_WALLETS[walletType];
    if (!config) throw new Error(`Unsupported wallet type: ${walletType}`);

    const { retryAttempts, retryDelay } = config;
    let lastError;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt}/${retryAttempts} failed for ${walletType}:`, error);
            
            if (attempt < retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    
    throw lastError;
}

// Helper function to check wallet availability
export function detectAvailableWallets() {
    return Object.entries(SUPPORTED_WALLETS).reduce((acc, [key, wallet]) => {
        acc[key] = wallet.checkAvailability();
        return acc;
    }, {});
}

// Helper function to initialize wallet with validation
export async function initializeWallet(walletType) {
    const config = SUPPORTED_WALLETS[walletType];
    if (!config) throw new Error(`Unsupported wallet type: ${walletType}`);
    
    return retryWalletOperation(async () => {
        const wallet = await config.initialize();
        validateWalletInterface(wallet, walletType);
        return wallet;
    }, walletType);
}

// Disconnect wallet and clean up
export function disconnectWallet() {
    // Clear session storage
    sessionStorage.removeItem('temp_mnemonic');
    localStorage.removeItem('memepool_wallet_session');

    // Clear global wallet instance
    if (window.wallet?.disconnect) {
        try {
            window.wallet.disconnect();
        } catch (error) {
            console.warn('Error disconnecting wallet:', error);
        }
    }
    window.wallet = null;

    // Reset UI
    resetWalletUI();
} 