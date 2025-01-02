/**
 * Service for interacting with the blockchain
 */
export class BlockchainService {
    constructor() {
        this.API_BASE = 'https://api.whatsonchain.com/v1/bsv/test';
        this.BATCH_SIZE = 100;
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000; // 1 second
    }

    /**
     * Get transactions from a range of blocks
     * @param {number} startHeight - Start block height
     * @param {number} endHeight - End block height
     * @returns {Promise<Array>} Array of transactions
     */
    async getBlockTransactions(startHeight, endHeight) {
        try {
            const transactions = [];
            
            for (let height = startHeight; height <= endHeight; height++) {
                const response = await fetch(`${this.API_BASE}/block/height/${height}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch block at height ${height}`);
                }
                
                const blockData = await response.json();
                const txs = await this.getBlockTransactionDetails(blockData.hash);
                transactions.push(...txs);
            }
            
            return transactions;
        } catch (error) {
            console.error('Error fetching block transactions:', error);
            throw error;
        }
    }

    /**
     * Get detailed transaction data for a block
     * @param {string} blockHash - Block hash
     * @returns {Promise<Array>} Array of transaction details
     */
    async getBlockTransactionDetails(blockHash) {
        try {
            const response = await fetch(`${this.API_BASE}/block/${blockHash}/transactions`);
            if (!response.ok) {
                throw new Error(`Failed to fetch transactions for block ${blockHash}`);
            }
            
            const transactions = await response.json();
            return transactions;
        } catch (error) {
            console.error('Error fetching transaction details:', error);
            throw error;
        }
    }

    /**
     * Verify block hash at given height
     * @param {string} blockHash - Block hash to verify
     * @param {number} height - Block height
     * @returns {Promise<boolean>} True if verified
     */
    async verifyBlockHash(blockHash, height) {
        try {
            const response = await fetch(`${this.API_BASE}/block/height/${height}`);
            if (!response.ok) {
                throw new Error(`Failed to verify block at height ${height}`);
            }
            
            const blockData = await response.json();
            return blockData.hash === blockHash;
        } catch (error) {
            console.error('Error verifying block hash:', error);
            return false;
        }
    }
} 