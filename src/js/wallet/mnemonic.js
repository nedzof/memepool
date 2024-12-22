import { bsv } from '../bsv.js';

// Generate secure random mnemonic
export function generateSecureMnemonic() {
    // Get 16 bytes (128 bits) of cryptographically secure random data
    const entropy = bsv.crypto.Random.getRandomBuffer(16);
    
    // Convert to mnemonic using BIP39
    const mnemonic = bsv.Mnemonic.fromEntropy(entropy);
    
    // Validate the generated mnemonic
    if (!mnemonic.isValid()) {
        throw new Error('Generated mnemonic failed validation');
    }
    
    return mnemonic.toString();
}

// Validate mnemonic format and BIP39 compliance
export function validateMnemonic(mnemonic) {
    if (!mnemonic || typeof mnemonic !== 'string') {
        return false;
    }

    try {
        const mnemonicObj = bsv.Mnemonic.fromString(mnemonic);
        return mnemonicObj.isValid();
    } catch (error) {
        console.error('Mnemonic validation failed:', error);
        return false;
    }
}

// Validate mnemonic randomness and security
export function validateMnemonicRandomness(mnemonic) {
    if (!validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic according to BIP39 specification');
    }

    const words = mnemonic.trim().toLowerCase().split(/\s+/);
    
    // Check word count
    if (words.length !== 12) {
        throw new Error('Mnemonic must be exactly 12 words');
    }

    // Check for duplicates
    const uniqueWords = new Set(words);
    if (uniqueWords.size !== words.length) {
        throw new Error('Mnemonic contains duplicate words, indicating potential randomness issues');
    }

    // Check for sequential patterns
    let sequentialCount = 0;
    const wordList = bsv.Mnemonic.Words.ENGLISH;
    for (let i = 1; i < words.length; i++) {
        const currentIndex = wordList.indexOf(words[i]);
        const prevIndex = wordList.indexOf(words[i - 1]);
        if (currentIndex - prevIndex === 1) {
            sequentialCount++;
        }
    }
    if (sequentialCount > 2) { // Allow at most 2 sequential words
        throw new Error('Mnemonic appears to be sequential or non-random');
    }

    // Check for repeating patterns
    const patternCheck = words.join(' ');
    const patterns = patternCheck.match(/(.+ .+).*\1/);
    if (patterns) {
        throw new Error('Mnemonic contains patterns');
    }

    // Check entropy using the Bitcoin library
    try {
        const mnemonicObj = bsv.Mnemonic.fromString(mnemonic);
        const entropy = mnemonicObj.toEntropy();
        
        // Count bit patterns in entropy
        const bits = Array.from(entropy).map(byte => 
            byte.toString(2).padStart(8, '0')
        ).join('');
        
        // Calculate Shannon entropy
        const bitCounts = new Map();
        for (let i = 0; i < bits.length - 3; i++) {
            const pattern = bits.slice(i, i + 4);
            bitCounts.set(pattern, (bitCounts.get(pattern) || 0) + 1);
        }
        
        const totalPatterns = bits.length - 3;
        const shannonEntropy = Array.from(bitCounts.values()).reduce((entropy, count) => {
            const probability = count / totalPatterns;
            return entropy - probability * Math.log2(probability);
        }, 0);
        
        // Shannon entropy should be close to 4 for random sequences
        if (shannonEntropy < 3.5) {
            throw new Error('Mnemonic has insufficient entropy');
        }

        return true;
    } catch (error) {
        console.error('Entropy validation failed:', error);
        throw error;
    }
}

// Encrypt mnemonic with password
export async function encryptMnemonic(mnemonic, password) {
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
    
    return {
        data: Array.from(new Uint8Array(encryptedData)),
        salt: Array.from(salt),
        iv: Array.from(iv)
    };
}

// Decrypt mnemonic with password
export async function decryptMnemonic(encryptedData, password) {
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
            salt: new Uint8Array(encryptedData.salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        key,
        { name: 'AES-GCM', length: 256 },
        true,
        ['decrypt']
    );

    // Decrypt mnemonic
    const decryptedData = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: new Uint8Array(encryptedData.iv)
        },
        decryptionKey,
        new Uint8Array(encryptedData.data)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
} 