import * as bip39 from 'bip39';
import { Buffer } from 'buffer';

// Convert mnemonic to seed
export async function mnemonicToSeed(mnemonic, passphrase = '') {
    try {
        // Normalize the mnemonic and passphrase
        const normalizedMnemonic = mnemonic.normalize('NFKD');
        const normalizedPassphrase = passphrase.normalize('NFKD');
        
        // Use bip39 to generate seed
        const seed = await bip39.mnemonicToSeed(normalizedMnemonic, normalizedPassphrase);
        return Buffer.from(seed);
    } catch (error) {
        console.error('Error converting mnemonic to seed:', error);
        throw new Error('Failed to convert mnemonic to seed');
    }
}

// Generate secure mnemonic
export function generateSecureMnemonic() {
    return bip39.generateMnemonic(128); // 12 words
}

// Validate mnemonic
export async function validateMnemonic(mnemonic) {
    try {
        if (!mnemonic) return false;
        
        // Clean up the mnemonic
        const cleanMnemonic = mnemonic.trim().toLowerCase();
        
        // Check if it's a valid BIP39 mnemonic
        const isValid = bip39.validateMnemonic(cleanMnemonic);
        console.log('Mnemonic validation result:', isValid);
        
        return isValid;
    } catch (error) {
        console.error('Error validating mnemonic:', error);
        return false;
    }
}

// Additional security check for mnemonic randomness
export async function validateMnemonicRandomness(mnemonic) {
    // This is a basic check - you might want to add more sophisticated checks
    const words = mnemonic.trim().toLowerCase().split(' ');
    
    // Check for 12 words
    if (words.length !== 12) {
        throw new Error('Seed phrase must be exactly 12 words');
    }
    
    // Check for duplicate words
    const uniqueWords = new Set(words);
    if (uniqueWords.size !== words.length) {
        throw new Error('Seed phrase contains duplicate words');
    }
    
    return true;
}

// Encrypt mnemonic with password
export async function encryptMnemonic(mnemonic, password) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(mnemonic);
        
        // Generate a key from the password
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        
        // Generate a random salt
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        
        // Derive the key
        const key = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt"]
        );
        
        // Generate a random IV
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt the data
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            data
        );
        
        // Return encrypted data with salt and IV
        return {
            data: Array.from(new Uint8Array(encryptedData)),
            salt: Array.from(salt),
            iv: Array.from(iv)
        };
    } catch (error) {
        console.error('Error encrypting mnemonic:', error);
        throw new Error('Failed to encrypt seed phrase');
    }
}

// Decrypt mnemonic with password
export async function decryptMnemonic(encryptedData, password) {
    try {
        const encoder = new TextEncoder();
        const passwordData = encoder.encode(password);
        
        // Generate key from password
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            passwordData,
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        
        // Generate decryption key
        const decryptionKey = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: new Uint8Array(encryptedData.salt),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['decrypt']
        );
        
        // Decrypt data
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: new Uint8Array(encryptedData.iv)
            },
            decryptionKey,
            new Uint8Array(encryptedData.data)
        );
        
        // Convert decrypted data back to string
        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    } catch (error) {
        console.error('Error decrypting mnemonic:', error);
        throw new Error('Failed to decrypt seed phrase');
    }
} 