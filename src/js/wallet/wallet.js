// Import BSV library
import * as bsvLib from '@bsv/sdk';

// Export BSV functionality
export const bsv = bsvLib;

// PBKDF2 parameters for BIP39
const PBKDF2_ROUNDS = 2048;
const PBKDF2_BYTES = 64;

// Export utility functions
export async function generateMnemonic() {
    try {
        // Generate 16 bytes of random data (128 bits)
        const entropy = new Uint8Array(16);
        crypto.getRandomValues(entropy);

        // Convert entropy to binary string
        let binaryString = '';
        entropy.forEach(byte => {
            binaryString += byte.toString(2).padStart(8, '0');
        });

        // Calculate checksum (first 4 bits of SHA256)
        const hash = await crypto.subtle.digest('SHA-256', entropy);
        const hashArray = new Uint8Array(hash);
        const checksumBits = hashArray[0].toString(2).padStart(8, '0').slice(0, 4);

        // Combine entropy and checksum
        const combinedBits = binaryString + checksumBits;

        // Split into 11-bit segments and convert to words
        const words = [];
        for (let i = 0; i < combinedBits.length; i += 11) {
            const segment = combinedBits.slice(i, i + 11);
            if (segment.length === 11) { // Ensure we have a complete segment
                const index = parseInt(segment, 2);
                if (index < wordList.length) { // Validate index
                    words.push(wordList[index]);
                } else {
                    throw new Error('Invalid word index generated');
                }
            }
        }

        const mnemonic = words.join(' ');

        // Validate the generated mnemonic
        const isValid = await validateMnemonic(mnemonic);
        if (!isValid) {
            throw new Error('Generated mnemonic failed validation');
        }

        return mnemonic;
    } catch (error) {
        console.error('Error generating mnemonic:', error);
        throw new Error('Failed to generate mnemonic');
    }
}

export async function validateMnemonic(mnemonic) {
    try {
        if (!mnemonic || typeof mnemonic !== 'string') {
            return false;
        }

        // Split the mnemonic into words
        const words = mnemonic.trim().split(/\s+/);

        // Check word count (should be 12 words for 128-bit entropy)
        if (words.length !== 12) {
            return false;
        }

        // Verify each word is in the wordlist
        const validWords = words.every(word => wordList.includes(word));
        if (!validWords) {
            return false;
        }

        // Convert words to indices
        const indices = words.map(word => wordList.indexOf(word));

        // Convert indices to binary
        let bits = indices.map(index => 
            index.toString(2).padStart(11, '0')
        ).join('');

        // Split entropy and checksum
        const entropyBits = bits.slice(0, 128);
        const checksumBits = bits.slice(128);

        // Convert entropy bits to bytes
        const entropyBytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            entropyBytes[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
        }

        // Calculate checksum
        const hash = await crypto.subtle.digest('SHA-256', entropyBytes);
        const hashArray = new Uint8Array(hash);
        const expectedChecksumBits = hashArray[0].toString(2).padStart(8, '0').slice(0, 4);

        // Verify checksum
        return checksumBits === expectedChecksumBits;
    } catch (error) {
        console.error('Error validating mnemonic:', error);
        return false;
    }
}

// Convert mnemonic to seed using PBKDF2
async function mnemonicToSeed(mnemonic, passphrase = '') {
    try {
        // Normalize the mnemonic and passphrase
        const normalizedMnemonic = mnemonic.normalize('NFKD');
        const normalizedPassphrase = passphrase.normalize('NFKD');

        // Create the salt
        const salt = 'mnemonic' + normalizedPassphrase;

        // Convert mnemonic to key material
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(normalizedMnemonic),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );

        // Derive the seed using PBKDF2
        const params = {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: PBKDF2_ROUNDS,
            hash: 'SHA-512'
        };

        const seedBuffer = await crypto.subtle.deriveBits(
            params,
            keyMaterial,
            PBKDF2_BYTES * 8
        );

        return new Uint8Array(seedBuffer);
    } catch (error) {
        console.error('Error converting mnemonic to seed:', error);
        throw new Error('Failed to convert mnemonic to seed');
    }
}

// Add HMAC key derivation function
async function derivePrivateKey(seed) {
    try {
        // Import seed as HMAC key
        const key = await crypto.subtle.importKey(
            'raw',
            seed,
            { name: 'HMAC', hash: 'SHA-512' },
            false,
            ['sign']
        );

        // Generate master key using HMAC-SHA512
        const masterKeyData = await crypto.subtle.sign(
            'HMAC',
            key,
            new TextEncoder().encode('Bitcoin seed')
        );

        // Split into private key and chain code
        const masterKey = new Uint8Array(masterKeyData);
        const privateKeyBytes = masterKey.slice(0, 32);

        // Convert to BigInt and ensure it's within valid range
        let privateKeyNum = BigInt('0x' + Array.from(privateKeyBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(''));

        // Check if the private key is within valid range
        const maxPrivateKey = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140');
        if (privateKeyNum === BigInt(0) || privateKeyNum >= maxPrivateKey) {
            throw new Error('Invalid private key generated');
        }

        // Convert to decimal string (BSV SDK expects decimal string)
        return privateKeyNum.toString(10);
    } catch (error) {
        console.error('Error deriving private key:', error);
        throw new Error('Failed to derive private key');
    }
}

export async function createWalletFromMnemonic(mnemonic, startIndex = 0, endIndex = 5) {
    try {
        const isValid = await validateMnemonic(mnemonic);
        if (!isValid) {
            throw new Error('Invalid mnemonic provided');
        }

        // Convert mnemonic to seed
        const seed = await mnemonicToSeed(mnemonic);
        
        // Create master HD private key from seed
        const masterKey = bsv.HD.fromSeed(Buffer.from(seed));
        
        // Derive the BIP44 base path for Bitcoin: m/44'/0'/0'
        const derivedKey = masterKey.derive("m/44'/0'/0'");
        
        // Derive change key (1 for change addresses)
        const changeKey = derivedKey.derive('1');  // m/44'/0'/0'/1
        
        // Derive child keys for the specified range
        const childKeys = [];
        for (let i = startIndex; i <= endIndex; i++) {
            // Derive child key
            const childKey = changeKey.derive(i.toString());
            
            // Get private key
            const privateKey = childKey.privKey;
            
            // Get public key
            const publicKey = privateKey.toPublicKey();
            
            // Get address using P2PKH
            const address = publicKey.toAddress();
            
            childKeys.push({
                path: `m/44'/0'/0'/1/${i}`,
                address: address.toString(),
                legacyAddress: address.toString(),
                publicKey: publicKey.toString(),
                privateKey: privateKey.toWIF(),
                xprv: childKey.toString(),
                xpub: childKey.toPublic().toString(),
                sign: (tx) => tx.sign(privateKey)
            });
        }

        // Return both the master key info and derived child keys
        return {
            master: {
                xprv: masterKey.toString(),
                xpub: masterKey.toPublic().toString(),
            },
            childKeys: childKeys,
            // Return first child key as default wallet
            ...childKeys[0]
        };
    } catch (error) {
        console.error('Error creating wallet from mnemonic:', error);
        throw new Error('Failed to create wallet from mnemonic');
    }
}

// Helper function to derive a specific path
export function deriveChildKey(masterKey, path) {
    try {
        const pathParts = path.split('/').slice(1); // Remove 'm'
        let derivedKey = masterKey;
        
        for (const part of pathParts) {
            const hardened = part.endsWith("'");
            const index = parseInt(hardened ? part.slice(0, -1) : part);
            derivedKey = derivedKey.deriveChild(index, hardened);
        }
        
        return derivedKey;
    } catch (error) {
        console.error('Error deriving child key:', error);
        throw new Error('Failed to derive child key');
    }
} 