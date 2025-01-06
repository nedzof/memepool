import { BSVService } from './bsv-service.js';
import { TransactionVerificationService } from './transaction-verification-service.js';
import { InscriptionSecurityService } from './inscription-security-service.js';

/**
 * Service for handling ownership transfers of inscriptions
 */
export class OwnershipTransferService {
    constructor(bsvService, verificationService) {
        this.bsvService = bsvService || new BSVService();
        this.verificationService = verificationService || new TransactionVerificationService(this.bsvService);
        this.securityService = new InscriptionSecurityService(this.bsvService, this.verificationService);
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

            const senderAddress = await this.bsvService.getWalletAddress();

            // Validate transfer parameters
            await this.securityService.validateTransferParams({
                txid: inscriptionTxId,
                senderAddress,
                recipientAddress
            });

            // Verify ownership and security checks
            const securityCheck = await this.securityService.verifyOwnershipForTransfer(
                inscriptionTxId,
                senderAddress
            );

            // Request transfer confirmation
            const confirmed = await this.securityService.confirmTransfer(
                securityCheck.inscriptionData,
                recipientAddress
            );

            if (!confirmed) {
                throw new Error('Transfer cancelled by user');
            }

            // Get UTXOs
            const utxos = await this.bsvService.wallet.getUtxos();
            if (!utxos || utxos.length === 0) {
                throw new Error('No UTXOs available');
            }

            // Find the inscription UTXO
            const inscriptionUtxo = utxos.find(utxo => utxo.txId === inscriptionTxId);
            if (!inscriptionUtxo) {
                throw new Error('Inscription UTXO not found');
            }

            // Create transaction
            const tx = new this.bsvService.bsv.Transaction();

            // Add the inscription input
            if (!inscriptionUtxo.sourceTransaction) {
                // If source transaction is not available, fetch it
                const txHex = await this.bsvService.wallet.fetchWithRetry(
                    `https://api.whatsonchain.com/v1/bsv/test/tx/${inscriptionUtxo.txId}/hex`
                );
                const txData = await txHex.text();
                inscriptionUtxo.sourceTransaction = this.bsvService.bsv.Transaction.fromHex(txData);
            }

            tx.addInput({
                sourceTXID: inscriptionUtxo.txId,
                sourceOutputIndex: inscriptionUtxo.outputIndex,
                sourceSatoshis: inscriptionUtxo.satoshis,
                script: inscriptionUtxo.script,
                unlockingScriptTemplate: inscriptionUtxo.unlockingScriptTemplate,
                sourceTransaction: inscriptionUtxo.sourceTransaction
            });

            // Calculate amounts
            const transferAmount = this.securityService.config.minInscriptionValue;
            const fee = 1; // 1 satoshi fee
            const changeAmount = inscriptionUtxo.satoshis - transferAmount - fee;

            // Create P2PKH script for recipient
            const p2pkh = new this.bsvService.bsv.P2PKH();
            const recipientScript = p2pkh.lock(recipientAddress);

            // Add recipient output with the inscription
            tx.addOutput({
                lockingScript: recipientScript,
                satoshis: transferAmount
            });
            console.log('Added recipient output with', transferAmount, 'satoshis');

            // Add change output back to sender if there's change
            if (changeAmount > 0) {
                const senderScript = p2pkh.lock(senderAddress);
                tx.addOutput({
                    lockingScript: senderScript,
                    satoshis: changeAmount
                });
            }

            // Sign transaction
            await tx.sign(this.bsvService.wallet.privateKey);

            // Broadcast transaction
            const txid = await this.bsvService.wallet.broadcastTransaction(tx);
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
            if (status.confirmations < this.securityService.config.minConfirmations) {
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
                confirmed: status.confirmations >= this.securityService.config.minConfirmations,
                confirmations: status.confirmations,
                timestamp: status.timestamp,
                complete: status.confirmations >= this.securityService.config.minConfirmations
            };
        } catch (error) {
            console.error('Failed to get transfer status:', error);
            throw error;
        }
    }
} 