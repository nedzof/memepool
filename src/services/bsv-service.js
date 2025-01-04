import * as bsvSdk from '@bsv/sdk';
import { testnetWallet } from './testnet-wallet.js';

/**
 * Service for handling BSV testnet operations
 */
export class BSVService {
    constructor(isTestMode = false) {
        this.network = 'testnet';
        this.connected = false;
        this.wallet = null;
        this.bsv = bsvSdk;
        
        // Standard fee rate (1 sat/kb)
        this.feeRate = 1;

        // Auto-connect testnet wallet in development, but not in test mode
        if (process.env.NODE_ENV !== 'production' && !isTestMode) {
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
            // Initialize BSV SDK
            this.bsv = bsvSdk;
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

            // Use testnet wallet in development
            if (process.env.NODE_ENV === 'development') {
                this.wallet = testnetWallet;
                return this.wallet.getAddress();
            }

            // For production or test, request wallet provider
            const provider = await this.bsv.requestProvider();
            this.wallet = provider;
            return await this.wallet.getAddress();
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw new Error('Failed to connect wallet');
        }
    }

    /**
     * Get wallet address if connected
     * @returns {Promise<string>} Wallet address
     */
    async getWalletAddress() {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }
        return this.wallet.getAddress();
    }

    /**
     * Get wallet balance
     * @returns {Promise<number>} Balance in BSV
     */
    async getBalance() {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }
        
        try {
            const address = await this.getWalletAddress();
            // WhatsOnChain API endpoint (removed 'test-' prefix)
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/address/${address}/balance`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch balance from WhatsOnChain');
            }
            
            const data = await response.json();
            // Convert satoshis to BSV (1 BSV = 100,000,000 satoshis)
            const balanceBSV = (data.confirmed + data.unconfirmed) / 100000000;
            console.log(`Current wallet balance: ${balanceBSV.toFixed(8)} BSV (${data.confirmed + data.unconfirmed} satoshis)`);
            return balanceBSV;
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            // Return 0 balance in case of error
            return 0;
        }
    }

    /**
     * Start periodic balance updates
     * @param {Function} callback - Function to call with updated balance
     * @param {number} interval - Update interval in milliseconds
     * @returns {number} Timer ID
     */
    startBalanceUpdates(callback, interval = 30000) {
        // Initial balance fetch
        this.getBalance().then(callback);
        
        // Set up periodic updates
        return setInterval(async () => {
            const balance = await this.getBalance();
            callback(balance);
        }, interval);
    }

    /**
     * Stop periodic balance updates
     * @param {number} timerId - Timer ID from startBalanceUpdates
     */
    stopBalanceUpdates(timerId) {
        if (timerId) {
            clearInterval(timerId);
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
        const roundedKb = Math.max(1, Math.floor(sizeInKb + 0.5));
        const fee = roundedKb; // Fee is same as rounded KB (1 sat/KB)

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
                .addOutput({
                    script: dataScript,
                    satoshis: 0
                })
                .change(await this.wallet.getAddress())
                .fee(feeInfo.fee);

            // Sign transaction
            const signedTx = await this.wallet.signTransaction(tx);

            // Broadcast transaction
            const txid = await this.wallet.broadcastTransaction(signedTx);
            return txid;
        } catch (error) {
            if (error.message === 'Wallet not connected') {
                throw error;
            }
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

    /**
     * Get latest block hash from testnet
     * @returns {Promise<string>} Latest block hash
     */
    async getLatestBlockHash() {
        try {
            // WhatsOnChain API endpoint for latest block info
            const response = await fetch('https://api.whatsonchain.com/v1/bsv/test/chain/info');
            
            if (!response.ok) {
                throw new Error('Failed to fetch latest block info');
            }
            
            const data = await response.json();
            const blockHash = data.bestblockhash;
            console.log('Latest block hash:', blockHash);
            return blockHash;
        } catch (error) {
            console.error('Failed to fetch block hash:', error);
            throw error;
        }
    }
} 