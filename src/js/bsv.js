// Import BSV library
import * as bsvLib from '@bsv/sdk';
import { fetchBalanceFromWhatsOnChain } from './wallet/blockchain.js';
import { generateSecureMnemonic, validateMnemonic, encryptMnemonic, decryptMnemonic } from './wallet/mnemonic.js';

// Export BSV functionality
export const bsv = bsvLib;

// Export BSV Wallet class
export class BSVWallet {
    constructor() {
        this.wallet = null;
        this.encryptedMnemonic = null;
        this.publicKey = null;
        this.connectionType = 'manual';
        this.balance = 0;
    }

    async generateNewWallet(password, mnemonic = null) {
        try {
            // If no mnemonic is provided, generate a new one using our secure function
            if (!mnemonic) {
                mnemonic = generateSecureMnemonic();
            }

            // Create wallet from mnemonic
            this.wallet = await createWalletFromMnemonic(mnemonic);
            
            // Store public key
            this.publicKey = this.wallet.publicKey;

            // Fetch and store initial balance
            try {
                this.balance = await fetchBalanceFromWhatsOnChain(this.wallet.legacyAddress);
            } catch (error) {
                console.error('Error fetching initial balance:', error);
                this.balance = 0;
            }

            // Encrypt mnemonic with password
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
            // Fetch fresh balance from WhatsOnChain
            if (this.wallet && this.wallet.legacyAddress) {
                this.balance = await fetchBalanceFromWhatsOnChain(this.wallet.legacyAddress);
            }
            return this.balance;
        } catch (error) {
            console.error('Error fetching balance:', error);
            return this.balance; // Return last known balance on error
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

// Create wallet from mnemonic
export async function createWalletFromMnemonic(mnemonic) {
    try {
        // Validate mnemonic
        if (!validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic provided');
        }

        // Convert mnemonic to seed using bsv.Mnemonic
        const mnemonicObj = bsv.Mnemonic.fromString(mnemonic);
        const seed = mnemonicObj.toSeed();
        
        // Create HDPrivateKey from seed
        const hdPrivateKey = bsv.HDPrivateKey.fromSeed(seed);
        
        // Derive the first account's external chain (m/44'/0'/0'/0/0)
        const derivedKey = hdPrivateKey.deriveChild("m/44'/0'/0'/0/0");
        const privateKey = derivedKey.privateKey;
        
        // Create public key and addresses
        const publicKey = privateKey.toPublicKey();
        const address = publicKey.toAddress();
        const legacyAddress = address.toString();
        
        return {
            address: legacyAddress,
            legacyAddress: legacyAddress,
            publicKey: publicKey.toString(),
            privateKey: privateKey.toString(),
            sign: (tx) => tx.sign(privateKey)
        };
    } catch (error) {
        console.error('Error creating wallet from mnemonic:', error);
        throw new Error('Failed to create wallet from mnemonic');
    }
}

// Export both named and default exports
export default bsv;
export class Wallet {
    // ... Wallet class implementation
} 