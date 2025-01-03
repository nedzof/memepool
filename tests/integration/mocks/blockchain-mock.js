/**
 * Mock blockchain service for integration tests
 */
export class BlockchainServiceMock {
    constructor() {
        this.transactions = new Map();
        this.blocks = new Map();
        this.currentHeight = 0;
    }

    /**
     * Mock transaction broadcast
     */
    async broadcastTransaction(tx) {
        const mockTxid = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const blockHeight = ++this.currentHeight;
        
        this.transactions.set(mockTxid, {
            ...tx,
            txid: mockTxid,
            confirmations: 6,
            blockHeight,
            timestamp: Date.now()
        });

        this.blocks.set(blockHeight, {
            height: blockHeight,
            hash: `block_${blockHeight}`,
            transactions: [mockTxid]
        });

        return {
            success: true,
            txid: mockTxid,
            blockHeight
        };
    }

    /**
     * Mock transaction info retrieval
     */
    async getTransactionInfo(txid) {
        const tx = this.transactions.get(txid);
        if (!tx) {
            throw new Error('Transaction not found');
        }
        return tx;
    }

    /**
     * Mock output status check
     */
    async isOutputUnspent(txid, vout) {
        const tx = this.transactions.get(txid);
        return tx ? !tx.spent : false;
    }

    /**
     * Mock block transactions retrieval
     */
    async getBlockTransactions(startHeight, endHeight) {
        const transactions = [];
        for (let height = startHeight; height <= endHeight; height++) {
            const block = this.blocks.get(height);
            if (block) {
                const txs = block.transactions.map(txid => this.transactions.get(txid));
                transactions.push(...txs);
            }
        }
        return transactions;
    }

    /**
     * Mock block hash verification
     */
    async verifyBlockHash(hash, height) {
        const block = this.blocks.get(height);
        return block && block.hash === hash;
    }

    /**
     * Reset mock data
     */
    reset() {
        this.transactions.clear();
        this.blocks.clear();
        this.currentHeight = 0;
    }
} 