import { initUnisatWallet, initOKXWallet } from './walletInterfaces.js';
import { initYoursWallet } from './interfaces/yoursWallet.js';

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
    yours: {
        id: 'yoursWalletBtn',
        name: 'Yours',
        checkAvailability: () => window.yours !== undefined,
        checkReady: () => window.yours?.isReady,
        initialize: initYoursWallet,
        installUrl: 'https://yours.org',
        errorMessage: 'Failed to connect to Yours Wallet. Please make sure it is installed and try again.',
        retryAttempts: 2,
        retryDelay: 1500
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