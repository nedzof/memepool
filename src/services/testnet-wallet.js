import * as bsvSdk from '@bsv/sdk';

/**
 * Simple testnet wallet service for development
 * This is a temporary solution for testing purposes
 */
export class TestnetWallet {
    constructor() {
        // Static testnet private key
        this.privateKey = 'cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy';
        // Hardcoded wallet address
        this.address = 'n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ';
        this.initialize();
    }

    initialize() {
        try {
            // Verify the private key is valid
            const privKey = bsvSdk.PrivateKey.fromWif(this.privateKey);
            // We're using the hardcoded address instead of deriving it
            console.log('Testnet wallet initialized with address:', this.address);
        } catch (error) {
            console.error('Failed to initialize testnet wallet:', error);
        }
    }

    getAddress() {
        return this.address;
    }

    getPrivateKey() {
        return this.privateKey;
    }

    // Mock methods to match BSV wallet interface
    async getUtxos() {
        return []; // For now, return empty UTXOs
    }

    async signTransaction(tx) {
        return tx; // Mock signing for now
    }

    async broadcastTransaction(tx) {
        return 'test_txid'; // Mock broadcast for now
    }
}

// Create a singleton instance
export const testnetWallet = new TestnetWallet(); 