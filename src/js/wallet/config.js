import { fetchBalanceFromWhatsOnChain } from './bitcoin.js';
import { resetWalletUI } from './walletUIManager.js';
import * as bsvLib from '@bsv/sdk';

const bsv = bsvLib;

// Get balance with WhatsOnChain
async function getBalance(address) {
    try {
        return await fetchBalanceFromWhatsOnChain(address);
    } catch (error) {
        console.error('Error getting balance:', error);
        return 0;
    }
}

// Convert public key to legacy address
function convertToLegacyAddress(publicKeyHex) {
    try {
        // If the key doesn't start with 02, 03, or 04, assume it's an x-coordinate only
        if (!publicKeyHex.startsWith('02') && !publicKeyHex.startsWith('03') && !publicKeyHex.startsWith('04')) {
            console.log('Converting x-coordinate to public key...');
            
            // Create a compressed public key (starts with 02)
            const compressedKey = '02' + publicKeyHex;
            console.log('Compressed public key:', compressedKey);
            
            // Create BSV public key from compressed format
            const publicKey = bsv.PublicKey.fromString(compressedKey);
            console.log('Converted public key:', publicKey.toString());
            
            // Get legacy address
            return publicKey.toAddress().toString();
        }

        // Otherwise use the provided public key format
        console.log('Using provided public key format...');
        const publicKey = bsv.PublicKey.fromString(publicKeyHex);
        return publicKey.toAddress().toString();
    } catch (error) {
        console.error('Error converting to legacy address:', error);
        throw new Error('Failed to convert public key to legacy address');
    }
}

// Initialize Unisat wallet interface
async function initUnisatWallet() {
    if (!window.unisat) throw new Error('Unisat wallet not found');

    try {
        await window.unisat.requestAccounts();
        const accounts = await window.unisat.getAccounts();
        const address = accounts[0];
        if (!address) throw new Error('No address found');
        
        // Get the public key
        const publicKey = await window.unisat.getPublicKey();
        if (!publicKey) throw new Error('Failed to get public key');

        // Convert to legacy address
        const legacyAddress = convertToLegacyAddress(publicKey);
        
        const wallet = {
            type: 'unisat',
            address: legacyAddress,
            publicKey: publicKey,
            getAddress: () => legacyAddress,
            getPublicKey: () => publicKey,
            getBalance: () => getBalance(legacyAddress)
        };

        // Store wallet instance and data
        window.wallet = wallet;
        sessionStorage.setItem('wallet_address', legacyAddress);
        sessionStorage.setItem('wallet_public_key', publicKey);
        
        return wallet;
    } catch (error) {
        console.error('Error initializing Unisat wallet:', error);
        throw error;
    }
}

// Initialize OKX wallet interface
async function initOKXWallet() {
    if (!window.okxwallet) throw new Error('OKX wallet not found');

    try {
        // Request Bitcoin account access
        console.log('Requesting Bitcoin accounts...');
        await window.okxwallet.bitcoin.connect();
        const accounts = await window.okxwallet.bitcoin.getAccounts();
        console.log('Bitcoin accounts received:', accounts);
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found in OKX Wallet');
        }

        const address = accounts[0];

        // Request signature for login verification
        console.log('Requesting signature for login verification...');
        const message = 'Sign this message to verify your wallet ownership\nTimestamp: ' + Date.now();
        const signature = await window.okxwallet.bitcoin.signMessage(message);
        console.log('Signature received:', signature);

        if (!signature) {
            throw new Error('Failed to get signature for login verification');
        }

        // Get public key
        console.log('Requesting public key...');
        const publicKey = await window.okxwallet.bitcoin.getPublicKey();
        console.log('Public key received:', publicKey);
        
        if (!publicKey) throw new Error('Failed to get public key');

        // Clean public key (remove 0x prefix if present)
        const cleanPubKey = publicKey.replace('0x', '');
        console.log('Cleaned public key:', cleanPubKey);

        // Convert to legacy address
        const legacyAddress = convertToLegacyAddress(cleanPubKey);
        console.log('Legacy address calculated:', legacyAddress);
        
        const wallet = {
            type: 'okx',
            address: legacyAddress,
            publicKey: cleanPubKey,
            signature: signature,
            getAddress: () => legacyAddress,
            getPublicKey: () => cleanPubKey,
            getBalance: () => getBalance(legacyAddress),
            signMessage: async (message) => {
                return await window.okxwallet.bitcoin.signMessage(message);
            },
            send: async (toAddress, amount) => {
                try {
                    const txHash = await window.okxwallet.bitcoin.sendTransaction({
                        to: toAddress,
                        value: amount * 1e8 // Convert to satoshis
                    });
                    return { txid: txHash };
                } catch (error) {
                    throw new Error('Failed to send transaction: ' + error.message);
                }
            }
        };

        // Store wallet instance and data
        window.wallet = wallet;
        sessionStorage.setItem('wallet_address', legacyAddress);
        sessionStorage.setItem('wallet_public_key', cleanPubKey);
        sessionStorage.setItem('wallet_signature', signature);
        
        return wallet;
    } catch (error) {
        console.error('Error initializing OKX wallet:', error);
        throw error;
    }
}

// Initialize Phantom wallet interface
async function initPhantomWallet() {
    if (!window.phantom) {
        window.open('https://phantom.app', '_blank');
        throw new Error('Phantom wallet not found. Please install Phantom wallet.');
    }

    try {
        // Get Bitcoin provider
        const provider = window.phantom?.bitcoin;
        if (!provider?.isPhantom) {
            throw new Error('Phantom Bitcoin provider not found');
        }

        // Request accounts
        console.log('Requesting Phantom Bitcoin accounts...');
        const accounts = await provider.requestAccounts();
        console.log('Received accounts:', accounts);

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found in Phantom Wallet');
        }

        // Look for a P2PKH account or use the first account's public key
        let address, publicKey;
        const p2pkhAccount = accounts.find(acc => acc.addressType === 'p2pkh');
        
        if (p2pkhAccount) {
            console.log('Found P2PKH account:', p2pkhAccount);
            address = p2pkhAccount.address;
            publicKey = p2pkhAccount.publicKey;
        } else {
            console.log('No P2PKH account found, deriving legacy address from first account');
            publicKey = accounts[0].publicKey;
            // Convert to legacy address using the public key
            address = convertToLegacyAddress(publicKey);
        }

        console.log('Using address:', address);
        console.log('Using public key:', publicKey);

        // Create wallet interface
        const wallet = {
            type: 'phantom',
            address: address,
            publicKey: publicKey,
            getAddress: () => address,
            getPublicKey: () => publicKey,
            getBalance: async () => {
                try {
                    return await getBalance(address);
                } catch (error) {
                    console.error('Error getting Phantom wallet balance:', error);
                    return 0;
                }
            },
            signMessage: async (message) => {
                throw new Error('Message signing not yet supported for Phantom wallet');
            },
            disconnect: async () => {
                // Note: According to docs, there's no programmatic disconnect
                console.log('Note: Users must disconnect manually through Phantom wallet UI');
            }
        };

        // Store wallet instance and data
        window.wallet = wallet;
        sessionStorage.setItem('wallet_address', address);
        sessionStorage.setItem('wallet_public_key', publicKey);
        
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