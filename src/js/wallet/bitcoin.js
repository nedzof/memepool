import * as bitcoin from 'bitcoinjs-lib';
import * as bip32 from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bip39 from 'bip39';
import ECPairFactory from 'ecpair';
import { Buffer } from 'buffer';
import { generateSecureMnemonic, validateMnemonic, encryptMnemonic, decryptMnemonic } from './mnemonic.js';

// Initialize bip32 with secp256k1
const bip32Instance = bip32.BIP32Factory(ecc);

// Initialize ECPair with secp256k1
const ECPair = ECPairFactory(ecc);

// Bitcoin Utilities
export function publicKeyToLegacyAddress(publicKey) {
    try {
        // Remove '0x' prefix if present
        const cleanPubKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
        // Create public key buffer
        const pubKeyBuffer = Buffer.from(cleanPubKey, 'hex');
        // Create Bitcoin public key and convert to legacy address
        const { address } = bitcoin.payments.p2pkh({ 
            pubkey: pubKeyBuffer,
            network: bitcoin.networks.bitcoin 
        });
        return address;
    } catch (error) {
        console.error('Error converting public key to legacy address:', error);
        return null;
    }
}

// Create script for OP_RETURN data
export function createOpReturnScript(data) {
    try {
        const script = bitcoin.script.compile([
            bitcoin.opcodes.OP_RETURN,
            Buffer.from(data)
        ]);
        return script.toString('hex');
    } catch (error) {
        console.error('Error creating OP_RETURN script:', error);
        return null;
    }
}

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
        
        const response = await rateLimitedFetch(`https://api.whatsonchain.com/v1/bsv/main/address/${address}/balance`);
        if (!response.ok) throw new Error('Failed to fetch balance');
        
        const data = await response.json();
        return data.confirmed / 100000000; // Convert satoshis to BSV
    } catch (error) {
        console.error('Error fetching balance:', error);
        return 0;
    }
}

// Check username availability on chain
export async function checkUsernameAvailability(username) {
    try {
        const normalizedUsername = username.toLowerCase().replace(/\s+/g, '');
        const script = createOpReturnScript(['MEMEPIRE_USERNAME', normalizedUsername]);
        
        if (!script) {
            throw new Error('Failed to create script');
        }

        const response = await rateLimitedFetch(`https://api.whatsonchain.com/v1/bsv/main/script/search`, {
            method: 'POST',
            body: JSON.stringify({ script })
        });

        if (!response.ok) {
            throw new Error('Failed to check username availability');
        }

        const data = await response.json();
        return data.length === 0;
    } catch (error) {
        console.error('Error checking username availability:', error);
        return false;
    }
}

// Create wallet from mnemonic
export async function createWalletFromMnemonic(mnemonic) {
    try {
        console.log('Creating wallet from mnemonic...');
        
        if (!validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic provided');
        }

        const seed = await bip39.mnemonicToSeed(mnemonic);
        console.log('Generated seed from mnemonic');

        const root = bip32Instance.fromSeed(Buffer.from(seed));
        console.log('Created master node');

        const path = "m/44'/0'/0'/0/0";
        const child = root.derivePath(path);
        console.log('Derived child key at path:', path);

        const keyPair = ECPair.fromPrivateKey(child.privateKey);
        console.log('Created key pair');

        const { address } = bitcoin.payments.p2pkh({ 
            pubkey: keyPair.publicKey,
            network: bitcoin.networks.bitcoin 
        });

        console.log('Generated address:', address);

        return {
            address: address,
            legacyAddress: address,
            publicKey: keyPair.publicKey.toString('hex'),
            privateKey: keyPair.privateKey.toString('hex'),
            sign: (tx) => keyPair.sign(tx)
        };
    } catch (error) {
        console.error('Error creating wallet from mnemonic:', error);
        throw new Error('Failed to create wallet from mnemonic: ' + error.message);
    }
}

// Bitcoin Wallet Class
export class BitcoinWallet {
    constructor() {
        this.wallet = null;
        this.encryptedMnemonic = null;
        this.publicKey = null;
        this.connectionType = 'manual';
        this.balance = 0;
    }

    async generateNewWallet(password, mnemonic = null) {
        try {
            if (!mnemonic) {
                mnemonic = generateSecureMnemonic();
            }

            this.wallet = await createWalletFromMnemonic(mnemonic);
            this.publicKey = this.wallet.publicKey;

            try {
                this.balance = await fetchBalanceFromWhatsOnChain(this.wallet.legacyAddress);
            } catch (error) {
                console.error('Error fetching initial balance:', error);
                this.balance = 0;
            }

            sessionStorage.setItem('temp_mnemonic', mnemonic);
            this.encryptedMnemonic = await encryptMnemonic(mnemonic, password);

            return {
                success: true,
                address: this.wallet.address,
                publicKey: this.publicKey,
                balance: this.balance
            };
        } catch (error) {
            console.error('Error generating wallet:', error);
            throw new Error('Failed to generate wallet: ' + error.message);
        }
    }

    getAddress() {
        return this.wallet ? this.wallet.address : null;
    }

    getLegacyAddress() {
        return this.wallet ? this.wallet.legacyAddress : null;
    }

    getPublicKey() {
        return this.publicKey;
    }

    getConnectionType() {
        return this.connectionType;
    }

    async getBalance() {
        try {
            if (this.wallet && this.wallet.legacyAddress) {
                this.balance = await fetchBalanceFromWhatsOnChain(this.wallet.legacyAddress);
            }
            return this.balance;
        } catch (error) {
            console.error('Error fetching balance:', error);
            return this.balance;
        }
    }

    async sign(tx) {
        if (!this.wallet) {
            throw new Error('Wallet not initialized');
        }
        return this.wallet.sign(tx);
    }

    async decrypt(password) {
        if (!this.encryptedMnemonic) {
            throw new Error('No encrypted mnemonic available');
        }

        try {
            return await decryptMnemonic(this.encryptedMnemonic, password);
        } catch (error) {
            throw new Error('Failed to decrypt mnemonic');
        }
    }
}

// Export bitcoin libraries
export { bitcoin }; 