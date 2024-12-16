import bsv from './bsv.js';

class BSVWallet {
    constructor() {
        this.balance = 0;
        this.transactions = [];
        this.address = '';
        this.privateKey = '';
        this.isInitialized = false;
    }

    async generateNewWallet(password, mnemonic) {
        console.log('Starting wallet generation...');
        try {
            if (!password) {
                throw new Error('Password is required');
            }

            console.log('Creating mnemonic...');
            // Use provided mnemonic or generate a new one
            const entropy = new Uint8Array(16);
            window.crypto.getRandomValues(entropy);
            const mnemonicWords = mnemonic || bsv.Mnemonic.fromEntropy(entropy).toString();
            console.log('Mnemonic created successfully');

            console.log('Generating seed from mnemonic...');
            const seedBuffer = await this.mnemonicToSeed(mnemonicWords, password);
            console.log('Seed generated successfully');

            console.log('Creating HD private key...');
            const hdPrivateKey = bsv.HDPrivateKey.fromSeed(seedBuffer);
            console.log('HD private key created successfully');
            
            // Derive first address (m/44'/0'/0'/0/0)
            console.log('Deriving address...');
            const derivedKey = hdPrivateKey.deriveChild("m/44'/0'/0'/0/0");
            this.privateKey = derivedKey.privateKey;
            this.address = derivedKey.publicKey.toAddress().toString();
            console.log('Address derived successfully:', this.address);
            
            this.isInitialized = true;
            this.balance = 1.0; // Set initial balance for testing
            this.generateMockTransactions(); // For demo purposes
            
            console.log('Wallet initialization complete');
            return {
                mnemonic: mnemonicWords,
                address: this.address,
                initialized: this.isInitialized
            };
        } catch (error) {
            console.error('Error in generateNewWallet:', error);
            this.isInitialized = false;
            this.balance = 0;
            this.address = '';
            this.privateKey = '';
            throw new Error(`Failed to generate wallet: ${error.message}`);
        }
    }

    async mnemonicToSeed(mnemonic, password) {
        if (!mnemonic) {
            throw new Error('Mnemonic is required');
        }
        if (!password) {
            throw new Error('Password is required');
        }

        try {
            // Use PBKDF2 for seed generation
            const encoder = new TextEncoder();
            const salt = encoder.encode('mnemonic' + password);
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                encoder.encode(mnemonic),
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );
            const seed = await window.crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 2048,
                    hash: 'SHA-512'
                },
                keyMaterial,
                512
            );
            return new Uint8Array(seed);
        } catch (error) {
            console.error('Error in mnemonicToSeed:', error);
            throw new Error(`Failed to generate seed: ${error.message}`);
        }
    }

    generateMockTransactions() {
        const types = ['send', 'receive'];
        const now = Date.now();
        
        for (let i = 0; i < 5; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const amount = (Math.random() * 0.1).toFixed(8);
            const address = 'addr_' + Math.random().toString(36).substr(2, 9);
            
            this.transactions.push({
                type: type,
                amount: parseFloat(amount),
                [type === 'send' ? 'to' : 'from']: address,
                timestamp: now - (i * 3600000) // Each transaction 1 hour apart
            });

            if (type === 'send') {
                this.balance -= parseFloat(amount);
            } else {
                this.balance += parseFloat(amount);
            }
        }
    }

    async send(toAddress, amount) {
        if (!this.isInitialized) throw new Error('Wallet not initialized');
        
        // Mock transaction for demo
        this.balance -= amount;
        this.transactions.unshift({
            type: 'send',
            amount: amount,
            to: toAddress,
            timestamp: Date.now()
        });
        
        return {
            txid: 'tx_' + Math.random().toString(36).substr(2, 9)
        };
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

    disconnect() {
        this.balance = 0;
        this.transactions = [];
        this.address = '';
        this.privateKey = '';
        this.isInitialized = false;
    }
}

export default BSVWallet; 