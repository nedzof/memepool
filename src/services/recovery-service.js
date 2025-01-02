import { BlockchainService } from './blockchain-service';
import { InscriptionIndexService } from './inscription-index-service';
import { TransactionCacheService } from './transaction-cache-service';
import { VerificationService } from './verification-service';
import { RecoveryProgressService } from './recovery-progress-service';

/**
 * Main service for orchestrating content recovery from blockchain
 */
export class RecoveryService {
    constructor() {
        this.blockchainService = new BlockchainService();
        this.inscriptionIndexService = new InscriptionIndexService();
        this.transactionCacheService = new TransactionCacheService();
        this.verificationService = new VerificationService(this.blockchainService);
        this.progressService = new RecoveryProgressService();
        this.BATCH_SIZE = 100;
    }

    /**
     * Initialize recovery service
     */
    async initialize() {
        await this.inscriptionIndexService.initialize();
        return true;
    }

    /**
     * Start progressive recovery process
     * @param {number} startBlock - Starting block height
     * @param {number} endBlock - Ending block height
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<boolean>} True if recovery started successfully
     */
    async startProgressiveRecovery(startBlock, endBlock, progressCallback = null) {
        if (this.progressService.recoveryState.isRunning) {
            throw new Error('Recovery process already running');
        }

        try {
            this.progressService.updateState({
                isRunning: true,
                currentBlock: startBlock,
                processedBlocks: 0,
                totalBlocks: endBlock - startBlock + 1,
                errors: []
            });

            await this.processBlocksProgressively(startBlock, endBlock, progressCallback);
            return true;
        } catch (error) {
            this.progressService.addError(error.message);
            throw error;
        }
    }

    /**
     * Process blocks progressively
     * @param {number} startBlock - Starting block height
     * @param {number} endBlock - Ending block height
     * @param {Function} progressCallback - Callback for progress updates
     */
    async processBlocksProgressively(startBlock, endBlock, progressCallback) {
        try {
            for (let height = startBlock; height <= endBlock; height += this.BATCH_SIZE) {
                const batchEnd = Math.min(height + this.BATCH_SIZE - 1, endBlock);
                
                // Process batch
                await this.processBatch(height, batchEnd);
                
                // Update progress
                this.progressService.updateState({
                    currentBlock: batchEnd + 1,
                    processedBlocks: batchEnd - startBlock + 1
                });

                if (progressCallback) {
                    const status = this.progressService.getRecoveryStatus();
                    progressCallback(status);
                }

                // Save checkpoint if needed
                if (height % this.progressService.CHECKPOINT_INTERVAL === 0) {
                    await this.progressService.saveCheckpoint(height, this.progressService.recoveryState);
                }
            }
        } catch (error) {
            this.progressService.addError(error.message);
            throw error;
        } finally {
            this.progressService.updateState({ isRunning: false });
        }
    }

    /**
     * Process a batch of blocks
     * @param {number} startHeight - Start block height
     * @param {number} endHeight - End block height
     */
    async processBatch(startHeight, endHeight) {
        try {
            // Get transactions for batch
            const transactions = await this.blockchainService.getBlockTransactions(startHeight, endHeight) || [];
            
            // Process each transaction
            for (const tx of transactions) {
                await this.processTransaction(tx);
            }
        } catch (error) {
            const errorMessage = `Error processing batch ${startHeight}-${endHeight}: ${error.message}`;
            this.progressService.addError(errorMessage);
            // Don't throw the error, just record it and continue
            return false;
        }
        return true;
    }

    /**
     * Process a single transaction
     * @param {Object} transaction - Transaction to process
     */
    async processTransaction(transaction) {
        try {
            // Check if transaction is cached
            const cached = this.transactionCacheService.getCachedTransaction(transaction.txid);
            if (cached) {
                return cached;
            }

            // Check if transaction contains inscription
            if (!this.verificationService.isInscriptionTransaction(transaction)) {
                return null;
            }

            // Verify transaction
            const verificationResults = await this.verificationService.verifyInscription({
                transaction,
                blockHash: transaction.blockhash,
                blockHeight: transaction.blockheight,
                content: this.verificationService.decodeInscriptionData(
                    transaction.vout.find(v => v.scriptPubKey.type === 'nulldata').scriptPubKey.hex
                )
            });

            if (verificationResults.verified) {
                // Add to index
                this.inscriptionIndexService.addToIndex(
                    verificationResults.inscription,
                    transaction.txid,
                    transaction.blockheight
                );

                // Cache transaction
                this.transactionCacheService.cacheTransaction(transaction.txid, verificationResults);
            } else {
                // Add to partial data for retry
                this.progressService.addPartialData(transaction.txid, {
                    transaction,
                    errors: verificationResults.errors
                });
            }

            return verificationResults;
        } catch (error) {
            this.progressService.addError(`Error processing transaction ${transaction.txid}: ${error.message}`);
            return null;
        }
    }

    /**
     * Resume recovery from last checkpoint
     * @param {number} endBlock - New end block height
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<boolean>} True if resumed successfully
     */
    async resumeRecovery(endBlock, progressCallback = null) {
        const lastCheckpoint = this.progressService.recoveryState.lastCheckpoint;
        if (!lastCheckpoint) {
            throw new Error('No checkpoint found to resume from');
        }

        await this.progressService.restoreFromCheckpoint(lastCheckpoint);
        return this.startProgressiveRecovery(lastCheckpoint + 1, endBlock, progressCallback);
    }

    /**
     * Get current recovery status
     * @returns {Object} Current recovery status
     */
    getRecoveryStatus() {
        return this.progressService.getRecoveryStatus();
    }

    /**
     * Get inscription by content ID
     * @param {string} contentId - Content ID to retrieve
     * @returns {Object|null} Inscription data or null if not found
     */
    getInscription(contentId) {
        return this.inscriptionIndexService.getInscription(contentId);
    }

    /**
     * Get all inscriptions
     * @returns {Array} Array of all inscriptions
     */
    getAllInscriptions() {
        return this.inscriptionIndexService.getAllInscriptions();
    }

    /**
     * Get verified inscriptions
     * @returns {Array} Array of verified inscriptions
     */
    getVerifiedInscriptions() {
        return this.inscriptionIndexService.getVerifiedInscriptions();
    }
} 