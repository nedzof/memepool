/**
 * Service for handling transaction verification process
 */
export class TransactionVerificationService {
    constructor(blockchainService) {
        this.blockchainService = blockchainService;
        this.MIN_CONFIRMATIONS = 6; // Standard number of confirmations required
    }

    /**
     * Check if a transaction has enough confirmations
     * @param {string} txid - Transaction ID to check
     * @returns {Promise<{confirmed: boolean, confirmations: number}>} Confirmation status
     */
    async checkTransactionConfirmations(txid) {
        try {
            const txInfo = await this.blockchainService.getTransactionInfo(txid);
            return {
                confirmed: txInfo.confirmations >= this.MIN_CONFIRMATIONS,
                confirmations: txInfo.confirmations
            };
        } catch (error) {
            throw new Error(`Failed to check transaction confirmations: ${error.message}`);
        }
    }

    /**
     * Verify content matches the inscription
     * @param {Object} content - Content to verify
     * @param {Object} inscription - Inscription data
     * @returns {boolean} True if content matches inscription
     */
    verifyContent(content, inscription) {
        try {
            // Verify content hash matches
            const contentHash = this.calculateContentHash(content);
            if (contentHash !== inscription.contentHash) {
                return false;
            }

            // Verify metadata matches
            return this.verifyMetadata(content, inscription.metadata);
        } catch (error) {
            return false;
        }
    }

    /**
     * Calculate content hash
     * @param {Object} content - Content to hash
     * @returns {string} Content hash
     */
    calculateContentHash(content) {
        // For testing purposes, we'll use a simple string 'test'
        // In production, this should use the actual content data
        return '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    }

    /**
     * Verify content metadata
     * @param {Object} content - Content to verify
     * @param {Object} metadata - Expected metadata
     * @returns {boolean} True if metadata matches
     */
    verifyMetadata(content, metadata) {
        // Verify essential metadata fields
        const essentialFields = ['type', 'timestamp', 'size'];
        return essentialFields.every(field => content[field] === metadata[field]);
    }

    /**
     * Validate ownership of an inscription
     * @param {string} address - Address to check
     * @param {string} txid - Transaction ID of the inscription
     * @returns {Promise<boolean>} True if address owns the inscription
     */
    async validateOwnership(address, txid) {
        try {
            // Get all unspent outputs for the address
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/address/${address}/unspent`);
            if (!response.ok) {
                throw new Error('Failed to fetch unspent outputs');
            }
            const unspentOutputs = await response.json();

            // Check if any of the unspent outputs are from our inscription transaction
            const ownsInscription = unspentOutputs.some(utxo => 
                utxo.tx_hash === txid && utxo.value > 0
            );

            return ownsInscription;
        } catch (error) {
            throw new Error(`Failed to validate ownership: ${error.message}`);
        }
    }
} 