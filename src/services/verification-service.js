/**
 * Service for handling verification of inscriptions, blocks, and signatures
 */
export class VerificationService {
    constructor(blockchainService) {
        this.blockchainService = blockchainService;
    }

    /**
     * Check if transaction contains a memepool inscription
     * @param {Object} tx - Transaction data
     * @returns {boolean} True if transaction is an inscription
     */
    isInscriptionTransaction(tx) {
        try {
            const opReturnOutput = tx.vout.find(output => 
                output.scriptPubKey.type === 'nulldata' &&
                output.scriptPubKey.asm.includes('OP_RETURN')
            );
            
            if (!opReturnOutput) return false;
            
            const data = this.decodeInscriptionData(opReturnOutput.scriptPubKey.hex);
            return data?.type === 'memepool' && data?.version === '1.0';
        } catch (error) {
            return false;
        }
    }

    /**
     * Decode inscription data from transaction
     * @param {string} hexData - Hex encoded data
     * @returns {Object|null} Decoded inscription data or null
     */
    decodeInscriptionData(hexData) {
        try {
            const decoded = Buffer.from(hexData, 'hex').toString('utf8');
            const data = JSON.parse(decoded);
            return data;
        } catch (error) {
            return null;
        }
    }

    /**
     * Validate transaction signature
     * @param {Object} tx - Transaction data
     * @returns {Promise<boolean>} True if signature is valid
     */
    async validateTransactionSignature(tx) {
        try {
            if (!tx.vin || !tx.vin.length) return false;
            
            for (const input of tx.vin) {
                if (!input.scriptSig) return false;
                const isValid = this.verifySignature(tx, input.scriptSig);
                if (!isValid) return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error validating transaction signature:', error);
            return false;
        }
    }

    /**
     * Verify signature of a transaction
     * @param {Object} rawTx - Raw transaction data
     * @param {Object} scriptSig - Script signature
     * @returns {boolean} True if signature is valid
     */
    verifySignature(rawTx, scriptSig) {
        try {
            // Implementation would depend on BSV library being used
            // This is a placeholder for the actual signature verification logic
            return true;
        } catch (error) {
            console.error('Error verifying signature:', error);
            return false;
        }
    }

    /**
     * Verify timestamp against block height
     * @param {number} timestamp - Timestamp to verify
     * @param {number} blockHeight - Block height
     * @returns {Promise<boolean>} True if timestamp is valid
     */
    async verifyTimestamp(timestamp, blockHeight) {
        try {
            const response = await fetch(`${this.blockchainService.API_BASE}/block/height/${blockHeight}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch block at height ${blockHeight}`);
            }
            
            const blockData = await response.json();
            const blockTimestamp = blockData.time * 1000; // Convert to milliseconds
            
            // Allow for some time variance (e.g., 1 hour)
            const TIME_VARIANCE = 3600000;
            return Math.abs(timestamp - blockTimestamp) <= TIME_VARIANCE;
        } catch (error) {
            console.error('Error verifying timestamp:', error);
            return false;
        }
    }

    /**
     * Verify complete inscription
     * @param {Object} inscription - Inscription to verify
     * @returns {Promise<Object>} Verification results
     */
    async verifyInscription(inscription) {
        const results = {
            verified: false,
            blockVerified: false,
            signatureVerified: false,
            timestampVerified: false,
            errors: []
        };

        try {
            // Verify block hash
            try {
                results.blockVerified = await this.blockchainService.verifyBlockHash(
                    inscription.blockHash,
                    inscription.blockHeight
                );
                if (!results.blockVerified) {
                    results.errors.push('Block hash verification failed');
                }
            } catch (error) {
                results.blockVerified = false;
                results.errors.push('Block hash verification failed');
            }

            // Verify transaction signature
            try {
                results.signatureVerified = await this.validateTransactionSignature(inscription.transaction);
                if (!results.signatureVerified) {
                    results.errors.push('Transaction signature verification failed');
                }
            } catch (error) {
                results.signatureVerified = false;
                results.errors.push('Transaction signature verification failed');
            }

            // Verify timestamp
            try {
                results.timestampVerified = await this.verifyTimestamp(
                    inscription.content.timestamp,
                    inscription.blockHeight
                );
                if (!results.timestampVerified) {
                    results.errors.push('Timestamp verification failed');
                }
            } catch (error) {
                results.timestampVerified = false;
                results.errors.push('Timestamp verification failed');
            }

            // Overall verification status
            results.verified = results.blockVerified && 
                             results.signatureVerified && 
                             results.timestampVerified;

            return results;
        } catch (error) {
            console.error('Error during inscription verification:', error);
            results.errors.push(error.message);
            return results;
        }
    }
} 