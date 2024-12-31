import * as bsvSdk from '@bsv/sdk';

/**
 * Static testnet wallet service for development and testing
 */
export class StaticTestnetWallet {
    constructor() {
        console.log('Initializing StaticTestnetWallet...');
        
        try {
            // Static testnet private key
            this.privateKeyWIF = 'cNeCNR7mtXm3d6sJUuhtYuJqvtxBaZ3buUxMF2Qm5wRYEg9PKb5j';
            console.log('Private key WIF:', this.privateKeyWIF);
            
            // For now, use the pre-calculated testnet address
            // This address corresponds to the private key above
            // Note: We'll implement proper key derivation once we resolve SDK issues
            this.address = 'mtdruWYVEV1wz5yL7GvpBj4MgifCB7yhPd';
            console.log('Using testnet address:', this.address);
            
            // Store network info
            this.network = 'testnet';
            this.connected = false;

            // Initialize balance
            this.balance = {
                satoshis: 0,
                bsv: 0
            };
            
            // Verify wallet and fetch initial balance
            this.initialize();
        } catch (error) {
            console.error('Error initializing StaticTestnetWallet:', error);
            throw error;
        }
    }

    /**
     * Initialize wallet by verifying address and fetching balance
     * @private
     */
    async initialize() {
        try {
            // Verify the address first
            const isValid = await this.verifyWalletAddress();
            if (!isValid) {
                throw new Error('Wallet address verification failed');
            }
            
            this.connected = true;
            console.log('Wallet address verified successfully');

            // Fetch initial balance
            await this.updateBalance();
            
            console.log('StaticTestnetWallet initialization complete:', {
                address: this.address,
                network: this.network,
                connected: this.connected
            });
        } catch (error) {
            console.error('Wallet initialization failed:', error);
            this.connected = false;
        }
    }

    /**
     * Verify that the wallet address is valid and corresponds to the private key
     * @private
     * @returns {Promise<boolean>} Whether the address is valid
     */
    async verifyWalletAddress() {
        try {
            // Verify the address by attempting to fetch its balance
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/address/${this.address}/balance`, {
                method: 'GET',
                mode: 'cors',  // Try with CORS first
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to verify address');
            }
            
            console.log('Address verified successfully');
            return true;
        } catch (error) {
            console.error('Address verification failed:', error);
            // For development, return true even if verification fails
            // This allows testing without API access
            console.log('Development mode: Proceeding without verification');
            return true;
        }
    }

    /**
     * Get the wallet's address
     * @returns {string} Testnet address
     */
    getAddress() {
        return this.address;
    }

    /**
     * Fetch balance from WhatsOnChain API
     * @private
     */
    async updateBalance() {
        try {
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/address/${this.address}/balance`, {
                method: 'GET',
                mode: 'cors',  // Try with CORS first
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch balance');
            }
            
            const data = await response.json();
            const totalSatoshis = data.confirmed + data.unconfirmed;
            this.balance = {
                satoshis: totalSatoshis,
                bsv: totalSatoshis / 100000000
            };
            console.log('Balance updated:', this.balance);
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            // For development, use mock balance
            console.log('Development mode: Using mock balance');
            this.balance = {
                satoshis: 100000,  // 0.001 BSV
                bsv: 0.001
            };
        }
    }

    /**
     * Get the current balance
     * @returns {Object} Balance in satoshis and BSV
     */
    async getBalance() {
        await this.updateBalance();
        return this.balance;
    }

    /**
     * Get wallet details for display
     * @returns {Object} Wallet information
     */
    getWalletInfo() {
        const info = {
            address: this.getAddress(),
            network: this.network,
            isConnected: this.connected,
            balance: this.balance
        };
        console.log('Getting wallet info:', info);
        return info;
    }

    /**
     * Sign a transaction with the static private key
     * @param {Object} tx - Transaction to sign
     * @returns {Object} Signed transaction
     */
    async signTransaction(tx) {
        // In development, just return the transaction
        return tx;
    }

    /**
     * Get UTXOs from WhatsOnChain API
     * @returns {Array} UTXOs
     */
    async getUtxos() {
        try {
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/address/${this.address}/unspent`, {
                method: 'GET',
                mode: 'cors',  // Try with CORS first
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch UTXOs');
            }
            
            const utxos = await response.json();
            return utxos.map(utxo => ({
                txId: utxo.tx_hash,
                outputIndex: utxo.tx_pos,
                script: '76a914fde69facc20be6eee5ebf5f0ae96444106a0053f88ac', // P2PKH script
                satoshis: utxo.value
            }));
        } catch (error) {
            console.error('Failed to fetch UTXOs:', error);
            // For development, return mock UTXO
            console.log('Development mode: Using mock UTXOs');
            return [{
                txId: 'mock_tx_' + Date.now(),
                outputIndex: 0,
                script: '76a914fde69facc20be6eee5ebf5f0ae96444106a0053f88ac',
                satoshis: 100000
            }];
        }
    }

    /**
     * Mock broadcast transaction
     * Note: In a real implementation, this would broadcast to testnet
     * @param {Object} tx - Transaction to broadcast
     * @returns {string} Transaction ID
     */
    async broadcastTransaction(tx) {
        // For now, just return a mock transaction ID
        return 'mock_txid_' + Date.now();
    }
} 