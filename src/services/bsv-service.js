import { Script, Transaction, OP } from '@bsv/sdk';
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
        // Calculate total transaction size:
        // 1. Transaction version (4 bytes)
        // 2. Input count (1-9 bytes)
        // 3. Typical P2PKH input (148 bytes)
        // 4. Output count (1-9 bytes)
        // 5. OP_FALSE OP_RETURN (2 bytes)
        // 6. PUSHDATA4 overhead for metadata (5 bytes)
        // 7. PUSHDATA4 overhead for video (5 bytes)
        // 8. P2PKH change output (34 bytes)
        // 9. nLockTime (4 bytes)
        // 10. Additional buffer for signature variations (10 bytes)
        const txOverhead = 4 + 1 + 148 + 1 + 2 + 5 + 5 + 34 + 4 + 10;
        const totalSize = dataSize + txOverhead;
        
        // Convert to KB and ensure we round up to the next KB boundary
        const sizeInKb = totalSize / 1024;
        const roundedKb = Math.ceil(sizeInKb);
        
        // Calculate fee to ensure slightly above 1 sat/KB
        // Add a small fraction (0.02) to ensure we're always above 1 sat/KB
        const fee = Math.ceil(roundedKb + 0.02);

        // Add size information
        const feeInfo = {
            sizeBytes: totalSize,
            sizeKb: sizeInKb,
            roundedKb: roundedKb,
            rate: this.feeRate,
            fee: fee,
            bsv: fee / 100000000,
            overhead: txOverhead,
            effectiveRate: (fee * 1024) / totalSize
        };

        console.log('Fee calculation details:', {
            dataSize,
            overhead: txOverhead,
            totalSize,
            sizeKb: sizeInKb,
            roundedKb,
            fee,
            effectiveRate: (fee * 1024) / totalSize
        });

        return feeInfo;
    }

    /**
     * Get transaction status
     * @param {string} txid - Transaction ID
     * @returns {Promise<Object>} Transaction status
     */
    async getTransactionStatus(txid) {
        try {
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch transaction status');
            }
            
            const data = await response.json();
            return {
                confirmed: data.confirmations > 0,
                confirmations: data.confirmations || 0,
                timestamp: data.time || Date.now()
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

            console.log('Creating inscription transaction...');
            console.log('Inscription data:', inscriptionData);
            console.log('File:', file);

            // Read file content
            const fileContent = await file.arrayBuffer();
            const fileBytes = new Uint8Array(fileContent);
            console.log('File content loaded, size:', fileBytes.length, 'bytes');

            // Validate file size (BSV has a max transaction size of ~100MB)
            const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
            if (fileBytes.length > MAX_FILE_SIZE) {
                throw new Error(`File size (${fileBytes.length} bytes) exceeds maximum allowed size (${MAX_FILE_SIZE} bytes)`);
            }

            // Validate video format
            if (fileBytes.length < 8) {
                throw new Error('Invalid video file: too small to be a valid MP4');
            }
            
            // Check for MP4 signature (ftyp)
            const signature = Buffer.from(fileBytes.slice(4, 8)).toString();
            if (signature !== 'ftyp') {
                throw new Error('Invalid video format: not a valid MP4 file');
            }

            // Prepare inscription data
            const data = JSON.stringify(inscriptionData);
            console.log('Serialized data:', data);
            
            // Create transaction
            console.log('Creating transaction...');
            const tx = new Transaction();
            console.log('Transaction created:', tx);

            // Calculate fee based on total size
            const totalSize = fileBytes.length + data.length;
            console.log('Total size:', totalSize);
            const feeInfo = await this.calculateFee(totalSize);
            console.log('Fee info:', feeInfo);

            // Get UTXOs with retry
            console.log('Getting UTXOs...');
            let utxos;
            try {
                utxos = await this.wallet.getUtxos();
                console.log('UTXOs:', utxos);
                if (!utxos || utxos.length === 0) {
                    throw new Error('No UTXOs available. Please fund your wallet.');
                }
            } catch (error) {
                if (error.message.includes('429') || error.message.includes('rate limit')) {
                    throw new Error('Rate limited by API. Please wait a moment and try again.');
                }
                throw error;
            }

            // Create data output using OP_FALSE OP_RETURN
            console.log('Building data output...');
            
            // Convert metadata to buffer
            const metadataBuffer = Buffer.from(data, 'utf8');
            console.log('Metadata size:', metadataBuffer.length, 'bytes');

            // Create script chunks
            const scriptParts = [];
            
            // Add OP_FALSE OP_RETURN
            scriptParts.push(Buffer.from([0x00, 0x6a])); // OP_FALSE OP_RETURN
            
            // Add metadata with PUSHDATA4
            const metadataLenBuffer = Buffer.alloc(5);
            metadataLenBuffer[0] = 0x4e; // PUSHDATA4 opcode
            metadataLenBuffer.writeUInt32LE(metadataBuffer.length, 1);
            console.log('Metadata PUSHDATA4:', metadataLenBuffer);
            
            // Create complete metadata chunk
            const metadataChunk = Buffer.concat([metadataLenBuffer, metadataBuffer]);
            scriptParts.push(metadataChunk);

            // Add video data with PUSHDATA4
            const videoLenBuffer = Buffer.alloc(5);
            videoLenBuffer[0] = 0x4e; // PUSHDATA4 opcode
            videoLenBuffer.writeUInt32LE(fileBytes.length, 1);
            console.log('Video PUSHDATA4:', videoLenBuffer);
            
            // Create complete video chunk
            const videoBuffer = Buffer.from(fileBytes);
            const videoChunk = Buffer.concat([videoLenBuffer, videoBuffer]);
            scriptParts.push(videoChunk);

            // Combine all parts into final script
            const scriptBuffer = Buffer.concat(scriptParts);
            console.log('Script structure:');
            console.log('- OP_FALSE OP_RETURN:', scriptParts[0].length, 'bytes');
            console.log('- Metadata chunk:', scriptParts[1].length, 'bytes');
            console.log('- Video chunk:', scriptParts[2].length, 'bytes');
            console.log('Total script size:', scriptBuffer.length, 'bytes');

            // Verify script structure before proceeding
            let pos = 0;
            // Verify OP_FALSE OP_RETURN
            if (scriptBuffer[0] !== 0x00 || scriptBuffer[1] !== 0x6a) {
                throw new Error('Invalid script structure: OP_FALSE OP_RETURN not found');
            }
            pos += 2;

            // Verify metadata chunk
            if (scriptBuffer[pos] !== 0x4e) {
                throw new Error('Invalid script structure: Metadata PUSHDATA4 not found');
            }
            const metadataLength = scriptBuffer.readUInt32LE(pos + 1);
            if (metadataLength !== metadataBuffer.length) {
                throw new Error('Invalid script structure: Metadata length mismatch');
            }
            pos += 5 + metadataLength;

            // Verify video chunk
            if (scriptBuffer[pos] !== 0x4e) {
                throw new Error('Invalid script structure: Video PUSHDATA4 not found');
            }
            const videoLength = scriptBuffer.readUInt32LE(pos + 1);
            if (videoLength !== fileBytes.length) {
                throw new Error('Invalid script structure: Video length mismatch');
            }
            pos += 5;

            // Verify video data integrity
            const videoData = scriptBuffer.slice(pos, pos + videoLength);
            if (videoData.length !== fileBytes.length) {
                throw new Error('Invalid script structure: Video data length mismatch');
            }
            
            // Verify video header
            const videoHeader = videoData.slice(4, 8).toString();
            if (videoHeader !== 'ftyp') {
                throw new Error('Invalid script structure: Video data corruption detected');
            }

            // Create script from buffer
            const script = Script.fromBinary(new Uint8Array(scriptBuffer));
            console.log('Script created successfully');
            console.log('Script type:', script.constructor.name);
            console.log('Script chunks:', script.chunks ? script.chunks.length : 'N/A');

            // Build transaction
            console.log('Building complete transaction...');
            
            // Add inputs from UTXOs
            console.log('Adding inputs to transaction...');
            console.log('Total UTXOs to process:', utxos.length);
            let totalInput = 0;
            
            for (const utxo of utxos) {
                console.log('Processing UTXO:', utxo);
                console.log('UTXO details:', {
                    txId: utxo.txId,
                    outputIndex: utxo.outputIndex,
                    satoshis: utxo.satoshis,
                    hasScript: !!utxo.script,
                    hasUnlockingTemplate: !!utxo.unlockingScriptTemplate,
                    hasSourceTransaction: !!utxo.sourceTransaction
                });

                const input = {
                    sourceTXID: utxo.txId,
                    sourceOutputIndex: utxo.outputIndex,
                    sourceSatoshis: utxo.satoshis,
                    script: utxo.script,
                    unlockingScriptTemplate: utxo.unlockingScriptTemplate
                };

                if (utxo.sourceTransaction) {
                    input.sourceTransaction = utxo.sourceTransaction;
                }

                tx.addInput(input);
                totalInput += utxo.satoshis;
                console.log('Running total input:', totalInput);
            }

            console.log('Final total input:', totalInput);

            // Add OP_RETURN output
            console.log('Adding OP_RETURN output...');
            tx.addOutput({
                lockingScript: script,
                satoshis: 0
            });
            console.log('Added OP_RETURN output');

            // Add change output
            console.log('Calculating change...');
            const changeAmount = totalInput - feeInfo.fee;
            console.log('Change calculation:', { totalInput, fee: feeInfo.fee, changeAmount });
            
            if (changeAmount > 0) {
                console.log('Creating change output script...');
                const pubKey = this.wallet.privateKey.toPublicKey();
                const p2pkh = new this.bsv.P2PKH();
                const lockingScript = p2pkh.lock(pubKey.toAddress());
                console.log('Change script created:', lockingScript);

                console.log('Adding change output...');
                tx.addOutput({
                    lockingScript: lockingScript,
                    satoshis: changeAmount
                });
                console.log('Added change output');
            }

            // Skip fee computation if source transactions are not available
            const hasAllSourceTransactions = tx.inputs.every(input => !!input.sourceTransaction);
            if (!hasAllSourceTransactions) {
                console.log('Skipping fee computation as not all source transactions are available');
            } else {
                console.log('Computing fee...');
                await tx.fee();
                console.log('Fee computed');
            }

            // Sign transaction
            console.log('Signing transaction...');
            try {
                await tx.sign(this.wallet.privateKey);
                console.log('Transaction signed:', tx);
            } catch (error) {
                if (error.message.includes('sourceSatoshis') || error.message.includes('sourceTransaction')) {
                    throw new Error('Failed to sign transaction: Missing source transaction data. Please try again.');
                }
                throw error;
            }

            // Broadcast transaction
            console.log('Broadcasting transaction...');
            try {
                const txid = await this.wallet.broadcastTransaction(tx);
                console.log('Transaction broadcast successful. TXID:', txid);
                return txid;
            } catch (error) {
                if (error.message.includes('429') || error.message.includes('rate limit')) {
                    throw new Error('Rate limited by API. Please wait a moment and try again.');
                }
                throw error;
            }
        } catch (error) {
            console.error('Detailed error in createInscriptionTransaction:', error);
            if (error.message === 'Wallet not connected') {
                throw error;
            }
            throw new Error('Failed to create inscription transaction: ' + error.message);
        }
    }
} 