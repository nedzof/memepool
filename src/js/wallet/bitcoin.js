import * as bsvLib from '@bsv/sdk';
import { generateSecureMnemonic, validateMnemonic, encryptMnemonic, decryptMnemonic, mnemonicToSeed } from './mnemonic.js';
import { showError } from '../modal.js';

const bsv = bsvLib;

// Blockchain API Utilities
const API_COOLDOWN = 2000; // 2 seconds between requests
let lastRequestTime = 0;

// Rate limiting helper
async function rateLimitedFetch(url, options = {}) {
    const now = Date.now();
    const timeToWait = Math.max(0, API_COOLDOWN - (now - lastRequestTime));
    
    if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    
    lastRequestTime = Date.now();
    
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        mode: 'cors'
    });
}

// Fetch balance from WhatsOnChain API
export async function fetchBalanceFromWhatsOnChain(address) {
    try {
        if (!address) return 0;
        
        // Add exponential backoff retry logic
        const maxRetries = 3;
        let currentRetry = 0;
        let lastError = null;

        while (currentRetry < maxRetries) {
            try {
                // Add longer delay between retries
                const delay = Math.min(1000 * Math.pow(2, currentRetry), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                const response = await rateLimitedFetch(`https://api.whatsonchain.com/v1/bsv/main/address/${address}/balance`);
                
                // Handle rate limiting specifically
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                return data.confirmed / 100000000; // Convert satoshis to BSV
            } catch (error) {
                console.warn(`Attempt ${currentRetry + 1} failed:`, error);
                lastError = error;
                currentRetry++;
                
                // If it's not a rate limit error and we got a response, don't retry
                if (error.message !== 'Rate limit exceeded') {
                    break;
                }
            }
        }
        
        // If we exhausted all retries, return 0 but log the error
        console.error('Failed to fetch balance after retries:', lastError);
        return 0;
    } catch (error) {
        console.error('Error fetching balance:', error);
        return 0;
    }
}

// Create wallet from mnemonic
export async function createWalletFromMnemonic(mnemonic) {
    try {
        console.log('Creating wallet from mnemonic...');
        
        if (!validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic provided');
        }

        // Convert mnemonic to seed
        const seed = await mnemonicToSeed(mnemonic);
        
        // Create master HD private key from seed
        const masterKey = bsv.HD.fromSeed(Buffer.from(seed));
        
        // Derive the BIP44 path for Bitcoin step by step
        // m/44'/0'/0'/0/0
        let derivedKey = masterKey;
        derivedKey = derivedKey.deriveChild(44 + 0x80000000);  // 44' (hardened)
        derivedKey = derivedKey.deriveChild(0 + 0x80000000);   // 0' (hardened)
        derivedKey = derivedKey.deriveChild(0 + 0x80000000);   // 0' (hardened)
        derivedKey = derivedKey.deriveChild(0);                // 0 (normal)
        derivedKey = derivedKey.deriveChild(0);                // 0 (normal)
        
        // Convert XPRIV to WIF and get private key
        const privateKey = derivedKey.privKey;
        const privateKeyWIF = privateKey.toWif();
        
        // Convert to public key
        const xpubKey = derivedKey.toPublic();
        const publicKey = xpubKey.pubKey;
        
        // Get address from public key
        const address = publicKey.toAddress();

        console.log('Generated address:', address.toString());

        const walletData = {
            address: address.toString(),
            legacyAddress: address.toString(),
            publicKey: publicKey.toString(),
            privateKey: privateKeyWIF,
            sign: (tx) => tx.sign(privateKey)
        };

        // Log all properties that will be validated
        console.log('=== Wallet Properties for Validation ===');
        console.log('publicKey:', walletData.publicKey);
        console.log('legacyAddress:', walletData.legacyAddress);
        console.log('connectionType: manual');
        console.log('balance: 0');
        console.log('=====================================');

        return walletData;
    } catch (error) {
        console.error('Error creating wallet from mnemonic:', error);
        throw new Error('Failed to create wallet from mnemonic: ' + error.message);
    }
}

// Bitcoin Wallet Class
export class BitcoinWallet {
    constructor() {
        this.address = null;
        this.publicKey = null;
        this.balance = '0';
        this.isInitialized = false;
        this._walletData = null;
    }

    async init(mnemonic, password) {
        try {
            // Validate inputs
            if (!mnemonic || !password) {
                throw new Error('Mnemonic and password are required');
            }

            // Create wallet using our BSV implementation
            this._walletData = await createWalletFromMnemonic(mnemonic);
            
            // Set wallet properties
            this.address = this._walletData.address;
            this.publicKey = this._walletData.publicKey;
            this.balance = '0';
            this.isInitialized = true;

            console.log('Initialized wallet with:', {
                address: this.address,
                hasPublicKey: !!this.publicKey,
                isInitialized: this.isInitialized
            });

        } catch (error) {
            console.error('Error initializing wallet:', error);
            throw error;
        }
    }

    getData() {
        if (!this.isInitialized) {
            throw new Error('Wallet not initialized');
        }
        return {
            address: this.address,
            publicKey: this.publicKey,
            balance: this.balance
        };
    }

    isReady() {
        return this.isInitialized;
    }
} 