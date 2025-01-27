// Simple BSV utility module
const bsv = {
    Mnemonic: {
        fromEntropy: function(entropy) {
            // Generate a 12-word mnemonic using the entropy
            const wordList = [
                "abandon", "ability", "able", "about", "above", "absent",
                "absorb", "abstract", "absurd", "abuse", "access", "accident",
                "account", "accuse", "achieve", "acid", "acoustic", "acquire",
                "across", "act", "action", "actor", "actress", "actual",
                "adapt", "add", "addict", "address", "adjust", "admit",
                "adult", "advance", "advice", "aerobic", "affair", "afford",
                "afraid", "again", "age", "agent", "agree", "ahead",
                "aim", "air", "airport", "aisle", "alarm", "album",
                "alcohol", "alert", "alien", "all", "alley", "allow",
                "almost", "alone", "alpha", "already", "also", "alter",
                "always", "amateur", "amazing", "among", "amount", "amused"
            ];

            // Use entropy to select 12 words
            const words = [];
            for (let i = 0; i < 12; i++) {
                const index = entropy[i] % wordList.length;
                words.push(wordList[index]);
            }

            return {
                toString: () => words.join(' ')
            };
        },
        fromString: function(str) {
            // Validate the mnemonic string
            const words = str.trim().split(/\s+/);
            if (words.length !== 12) {
                throw new Error('Invalid mnemonic: must be 12 words');
            }
            return {
                toString: () => str
            };
        }
    },
    HDPrivateKey: {
        fromSeed: function(seed) {
            // For demo purposes, create a simple private key
            const privateKey = Array.from(seed).map(b => b.toString(16).padStart(2, '0')).join('');
            return {
                deriveChild: function(path) {
                    return {
                        privateKey: privateKey,
                        publicKey: {
                            toAddress: function() {
                                return {
                                    toString: () => `1${privateKey.substr(0, 33)}`
                                };
                            }
                        }
                    };
                }
            };
        }
    }
};

// Add wallet functionality
class Wallet {
    constructor() {
        this.isInitialized = false;
        this.balance = 0;
        this.address = '';
        this.transactions = [];
    }

    async generateNewWallet(password, mnemonic) {
        try {
            // Generate wallet from mnemonic
            const seed = new TextEncoder().encode(mnemonic);
            const hdPrivateKey = bsv.HDPrivateKey.fromSeed(seed);
            const childKey = hdPrivateKey.deriveChild("m/44'/236'/0'/0/0");
            
            this.address = childKey.publicKey.toAddress().toString();
            this.isInitialized = true;
            this.balance = 0;
            
            return { success: true };
        } catch (error) {
            throw new Error('Failed to generate wallet: ' + error.message);
        }
    }

    async importFromMnemonic(mnemonic, password = '') {
        try {
            // Validate mnemonic
            bsv.Mnemonic.fromString(mnemonic);
            
            // Generate wallet from mnemonic
            const seed = new TextEncoder().encode(mnemonic);
            const hdPrivateKey = bsv.HDPrivateKey.fromSeed(seed);
            const childKey = hdPrivateKey.deriveChild("m/44'/236'/0'/0/0");
            
            this.address = childKey.publicKey.toAddress().toString();
            this.isInitialized = true;
            this.balance = 0;
            
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
            
            // Create address from private key
            this.address = `1${privateKey.substr(0, 33)}`;
            this.isInitialized = true;
            this.balance = 0;
            
            return { success: true };
        } catch (error) {
            throw new Error('Failed to import private key: ' + error.message);
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

    async send(toAddress, amount) {
        // Simulate sending transaction
        if (amount > this.balance) {
            throw new Error('Insufficient balance');
        }
        
        const txid = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
            
        this.balance -= amount;
        this.transactions.unshift({
            txid,
            type: 'send',
            amount,
            to: toAddress,
            timestamp: new Date().toISOString()
        });
        
        return { txid };
    }

    disconnect() {
        this.isInitialized = false;
        this.balance = 0;
        this.address = '';
        this.transactions = [];
    }
}

// Export both bsv utilities and Wallet class
export default bsv;
export { Wallet }; 