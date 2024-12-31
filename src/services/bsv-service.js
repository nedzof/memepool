import * as bsvSdk from '@bsv/sdk';
import { testnetWallet } from './testnet-wallet.js';

/**
 * Service for handling BSV testnet operations
 */
export class BSVService {
    constructor() {
        this.network = 'testnet';
        this.connected = false;
        this.wallet = null;
        this.bsv = bsvSdk;
        
        // Standard fee rate (1 sat/kb)
        this.feeRate = 1;

        // Auto-connect testnet wallet in development
        if (process.env.NODE_ENV !== 'production') {
            this.wallet = testnetWallet;
            this.connected = true;
        }
    }

    /**
     * Initialize connection to BSV testnet
     * @returns {Promise<boolean>} Connection status
     */
    async connect() {
        try {
            // Initialize BSV testnet connection
            await this.bsv.initialize({ network: this.network });
            this.connected = true;
            return true;
        } catch (error) {
            console.error('Failed to connect to BSV testnet:', error);
            throw new Error('Failed to connect to BSV testnet');
        }
    }

    /**
     * Connect to a wallet
     * @returns {Promise<string>} Wallet address
     */
    async connectWallet() {
        try {
            if (!this.connected) {
                await this.connect();
            }

            // Request wallet connection
            const provider = await this.bsv.requestProvider();
            this.wallet = provider;

            // Get wallet address
            const address = await this.wallet.getAddress();
            return address;
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw new Error('Failed to connect wallet');
        }
    }

    /**
     * Calculate transaction fee based on data size using standard rate of 1 sat/kb
     * @param {number} dataSize - Size of data in bytes
     * @returns {Promise<Object>} Fee calculations
     */
    async calculateFee(dataSize) {
        // Convert bytes to kilobytes
        const sizeInKb = dataSize / 1024;
        
        // Calculate fee based on size rounding rules:
        // 0.0 kb to 1.4999... kb = 1 sat
        // 1.5 kb to 2.4999... kb = 2 sat
        // 2.5 kb to 3.4999... kb = 3 sat
        // etc.
        const roundedKb = Math.floor((sizeInKb + 0.5));
        const fee = Math.max(1, roundedKb); // Minimum fee is 1 sat

        // Add size information
        const feeInfo = {
            sizeBytes: dataSize,
            sizeKb: sizeInKb,
            roundedKb: roundedKb,
            rate: this.feeRate,
            fee: fee,
            bsv: fee / 100000000
        };

        return feeInfo;
    }

    /**
     * Create and broadcast inscription transaction
     * @param {Object} inscriptionData - The inscription data
     * @param {File} file - The video file
     * @returns {Promise<string>} Transaction ID
     */
    async createInscriptionTransaction(inscriptionData, file) {
        try {
            if (!this.wallet) {
                throw new Error('Wallet not connected');
            }

            // Prepare inscription data
            const data = JSON.stringify(inscriptionData);
            const dataScript = this.bsv.Script.buildDataOut(data);

            // Calculate fee based on total size
            const totalSize = file.size + data.length;
            const feeInfo = await this.calculateFee(totalSize);

            // Create transaction
            const tx = new this.bsv.Transaction()
                .from(await this.wallet.getUtxos())
                .addOutput(new this.bsv.Transaction.Output({
                    script: dataScript,
                    satoshis: 0
                }))
                .change(await this.wallet.getAddress())
                .fee(feeInfo.fee);

            // Sign transaction
            const signedTx = await this.wallet.signTransaction(tx);

            // Broadcast transaction
            const txid = await this.wallet.broadcastTransaction(signedTx);
            return txid;
        } catch (error) {
            console.error('Failed to create inscription transaction:', error);
            throw new Error('Failed to create inscription transaction');
        }
    }

    /**
     * Get transaction status
     * @param {string} txid - Transaction ID
     * @returns {Promise<Object>} Transaction status
     */
    async getTransactionStatus(txid) {
        try {
            const status = await this.bsv.getTransaction(txid);
            return {
                confirmed: status.confirmations > 0,
                confirmations: status.confirmations,
                timestamp: status.time
            };
        } catch (error) {
            console.error('Failed to get transaction status:', error);
            throw new Error('Failed to get transaction status');
        }
    }
} 