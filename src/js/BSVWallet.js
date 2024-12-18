import { generateMnemonic, createWalletFromMnemonic } from './bsv.js';

export class BSVWallet {
    constructor() {
        this.wallet = null;
        this.encryptedMnemonic = null;
    }

    async generateNewWallet(password, mnemonic = null) {
        try {
            // If no mnemonic is provided, generate a new one
            if (!mnemonic) {
                mnemonic = await generateMnemonic();
            }

            // Create wallet from mnemonic
            this.wallet = await createWalletFromMnemonic(mnemonic);

            // Encrypt mnemonic with password
            const encoder = new TextEncoder();
            const mnemonicData = encoder.encode(mnemonic);
            const passwordData = encoder.encode(password);

            // Generate key from password
            const key = await crypto.subtle.importKey(
                'raw',
                passwordData,
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );

            // Generate encryption key
            const encryptionKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: new Uint8Array(16),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                key,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Encrypt mnemonic
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                encryptionKey,
                mnemonicData
            );

            // Store encrypted mnemonic and IV
            this.encryptedMnemonic = {
                data: new Uint8Array(encryptedData),
                iv: iv
            };

            return {
                success: true,
                address: this.wallet.address
            };
        } catch (error) {
            console.error('Error generating wallet:', error);
            throw new Error('Failed to generate wallet: ' + error.message);
        }
    }

    getAddress() {
        return this.wallet ? this.wallet.address : null;
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
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(password);

            // Generate key from password
            const key = await crypto.subtle.importKey(
                'raw',
                passwordData,
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );

            // Generate decryption key
            const decryptionKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: new Uint8Array(16),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                key,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Decrypt mnemonic
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: this.encryptedMnemonic.iv
                },
                decryptionKey,
                this.encryptedMnemonic.data
            );

            const decoder = new TextDecoder();
            return decoder.decode(decryptedData);
        } catch (error) {
            throw new Error('Failed to decrypt mnemonic');
        }
    }
}

// Add both named and default exports
export default BSVWallet; 