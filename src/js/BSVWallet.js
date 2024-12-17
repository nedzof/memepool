import { bsv, createWalletFromMnemonic, validateMnemonic } from './bsv.js';

export class BSVWallet {
    constructor() {
        this.isInitialized = false;
        this.balance = 0;
        this.address = '';
        this.transactions = [];
        this.wallet = null;
    }

    async generateNewWallet(password, mnemonic) {
        try {
            // Validate mnemonic
            if (!validateMnemonic(mnemonic)) {
                throw new Error('Invalid mnemonic');
            }

            // Create wallet from mnemonic
            this.wallet = await createWalletFromMnemonic(mnemonic);
            this.address = this.wallet.getAddress();
            this.isInitialized = true;
            await this.updateBalance();

            return { success: true };
        } catch (error) {
            throw new Error('Failed to generate wallet: ' + error.message);
        }
    }

    async importFromMnemonic(mnemonic, password = '') {
        try {
            // Validate mnemonic
            if (!validateMnemonic(mnemonic)) {
                throw new Error('Invalid mnemonic');
            }

            // Create wallet from mnemonic
            this.wallet = await createWalletFromMnemonic(mnemonic);
            this.address = this.wallet.getAddress();
            this.isInitialized = true;
            await this.updateBalance();

            return { success: true };
        } catch (error) {
            throw new Error('Failed to import mnemonic: ' + error.message);
        }
    }

    async importFromPrivateKey(privateKey, password = '') {
        try {
            // Validate private key format
            if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
                throw new Error('Invalid private key format');
            }

            // Create wallet from private key
            this.wallet = await bsv.Wallet.fromPrivateKey(privateKey);
            this.address = this.wallet.getAddress();
            this.isInitialized = true;
            await this.updateBalance();

            return { success: true };
        } catch (error) {
            throw new Error('Failed to import private key: ' + error.message);
        }
    }

    async updateBalance() {
        if (!this.isInitialized || !this.wallet) {
            throw new Error('Wallet not initialized');
        }

        try {
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/address/${this.address}/balance`);
            if (!response.ok) {
                throw new Error('Failed to fetch balance');
            }

            const data = await response.json();
            this.balance = data.confirmed / 100000000; // Convert satoshis to BSV
            return this.balance;
        } catch (error) {
            console.error('Error updating balance:', error);
            return this.balance;
        }
    }

    getBalance() {
        return this.balance;
    }

    getAddress() {
        return this.address;
    }

    getTransactions() {
        return this.transactions;
    }

    async getUtxos() {
        if (!this.isInitialized || !this.wallet) {
            throw new Error('Wallet not initialized');
        }

        try {
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/address/${this.address}/unspent`);
            if (!response.ok) {
                throw new Error('Failed to fetch UTXOs');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching UTXOs:', error);
            return [];
        }
    }

    async send(toAddress, amount) {
        if (!this.isInitialized || !this.wallet) {
            throw new Error('Wallet not initialized');
        }

        if (amount > this.balance) {
            throw new Error('Insufficient balance');
        }

        try {
            const utxos = await this.getUtxos();
            const tx = new bsv.Transaction()
                .from(utxos)
                .to(toAddress, Math.floor(amount * 100000000)) // Convert BSV to satoshis
                .change(this.address)
                .sign(this.wallet.getPrivateKey());

            const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/tx/raw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    txhex: tx.toString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to broadcast transaction');
            }

            const { txid } = await response.json();
            
            // Update local state
            this.balance -= amount;
            this.transactions.unshift({
                txid,
                type: 'send',
                amount,
                to: toAddress,
                timestamp: new Date().toISOString()
            });

            return { txid };
        } catch (error) {
            throw new Error('Failed to send transaction: ' + error.message);
        }
    }

    getPrivateKey() {
        if (!this.isInitialized || !this.wallet) {
            throw new Error('Wallet not initialized');
        }
        return this.wallet.getPrivateKey();
    }

    disconnect() {
        this.isInitialized = false;
        this.balance = 0;
        this.address = '';
        this.transactions = [];
        this.wallet = null;
    }
}

export default BSVWallet; 