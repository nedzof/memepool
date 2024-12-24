import { publicKeyToLegacyAddress } from './bitcoin.js';
import { logError, logSecurityEvent } from '../errors.js';
import { terminateSession } from './auth/session.js';
import { validateMnemonic } from './mnemonic.js';
import { BitcoinWallet } from './bitcoin.js';
import { fetchBalanceFromWhatsOnChain } from './bitcoin.js';

// Re-export for backward compatibility
export { validateMnemonic };

// Valid connection types
const VALID_CONNECTION_TYPES = ['okx', 'unisat', 'phantom', 'yours', 'manual', 'imported'];

// Common public key validation logic
export async function validatePublicKey(publicKey) {
    try {
        // Validate legacy address derivation
        const legacyAddress = publicKeyToLegacyAddress(publicKey);
        if (!legacyAddress) {
            throw new Error('Failed to derive legacy address');
        }
        
        // Confirm balance retrieval
        const balance = await fetchBalanceFromWhatsOnChain(legacyAddress);
        if (balance === null) {
            throw new Error('Failed to retrieve balance');
        }
        
        return true;
    } catch (error) {
        console.error('Public key validation failed:', error);
        throw error;
    }
}

// Validate wallet properties
export function validateWalletProperties(wallet) {
    if (!wallet) {
        throw new Error('No wallet instance found');
    }

    try {
        // Check required properties
        const requiredProperties = ['publicKey', 'legacyAddress', 'connectionType', 'balance'];
        for (const prop of requiredProperties) {
            if (!(prop in wallet)) {
                throw new Error(`Missing required property: ${prop}`);
            }
        }

        // Validate public key format
        const pubKeyRegex = /^0x[0-9a-fA-F]{66}$/;  // 0x prefix + 33 bytes (compressed) = 68 chars total
        if (!pubKeyRegex.test(wallet.publicKey)) {
            throw new Error('Invalid public key format');
        }

        // Validate legacy address format
        const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
        if (!legacyRegex.test(wallet.legacyAddress)) {
            throw new Error('Invalid legacy address format');
        }

        // Validate connection type
        if (!VALID_CONNECTION_TYPES.includes(wallet.connectionType)) {
            throw new Error('Invalid connection type');
        }

        // Validate balance
        if (typeof wallet.balance !== 'number' || isNaN(wallet.balance) || wallet.balance < 0) {
            throw new Error('Invalid balance');
        }

        return true;
    } catch (error) {
        console.error('Wallet properties validation failed:', error);
        throw error;
    }
} 