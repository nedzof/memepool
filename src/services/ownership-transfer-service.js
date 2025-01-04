import { BSVService } from './bsv-service';
import { TransactionVerificationService } from './transaction-verification-service';

/**
 * Service for handling ownership transfers of inscriptions
 */
export class OwnershipTransferService {
    constructor(bsvService, verificationService) {
        this.bsvService = bsvService || new BSVService();
        this.verificationService = verificationService || new TransactionVerificationService(this.bsvService);
        this.MIN_CONFIRMATIONS = 6;
    }

    /**
     * Create a transfer transaction
     * @param {string} inscriptionTxId - Transaction ID of the inscription
     * @param {string} recipientAddress - Recipient's wallet address
     * @returns {Promise<string>} Transaction ID of the transfer
     */
    async createTransferTransaction(inscriptionTxId, recipientAddress) {
        try {
            if (!this.bsvService.wallet) {
                throw new Error('Wallet not connected');
            }

            // Verify current ownership
            const currentAddress = await this.bsvService.getWalletAddress();
            const isOwner = await this.verificationService.validateOwnership(currentAddress, inscriptionTxId);
            if (!isOwner) {
                throw new Error('Not the current owner of the inscription');
            }

            // Create transfer transaction
            const tx = new this.bsvService.bsv.Transaction()
                .from(await this.bsvService.wallet.getUtxos())
                .to(recipientAddress, 0) // Transfer with 0 satoshis
                .change(currentAddress)
                .fee(1); // Minimum fee of 1 satoshi

            // Sign and broadcast transaction
            const signedTx = await this.bsvService.wallet.signTransaction(tx);
            const txid = await this.bsvService.wallet.broadcastTransaction(signedTx);

            return txid;
        } catch (error) {
            console.error('Failed to create transfer transaction:', error);
            throw error;
        }
    }

    /**
     * Verify transfer completion
     * @param {string} transferTxId - Transaction ID of the transfer
     * @param {string} recipientAddress - Expected recipient address
     * @returns {Promise<boolean>} True if transfer is complete and valid
     */
    async verifyTransfer(transferTxId, recipientAddress) {
        try {
            // Check transaction confirmations
            const status = await this.bsvService.getTransactionStatus(transferTxId);
            if (status.confirmations < this.MIN_CONFIRMATIONS) {
                return false;
            }

            // Verify recipient ownership
            const isNewOwner = await this.verificationService.validateOwnership(recipientAddress, transferTxId);
            return isNewOwner;
        } catch (error) {
            console.error('Failed to verify transfer:', error);
            return false;
        }
    }

    /**
     * Get transfer status
     * @param {string} transferTxId - Transaction ID of the transfer
     * @returns {Promise<Object>} Transfer status details
     */
    async getTransferStatus(transferTxId) {
        try {
            const status = await this.bsvService.getTransactionStatus(transferTxId);
            return {
                confirmed: status.confirmations >= this.MIN_CONFIRMATIONS,
                confirmations: status.confirmations,
                timestamp: status.timestamp,
                complete: status.confirmations >= this.MIN_CONFIRMATIONS
            };
        } catch (error) {
            console.error('Failed to get transfer status:', error);
            throw error;
        }
    }
} 