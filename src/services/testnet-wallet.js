import { PrivateKey } from '@bsv/sdk';

/**
 * Simple testnet wallet service for development
 * This is a temporary solution for testing purposes
 */
export class TestnetWallet {
    constructor() {
        // Static testnet private key
        this.privateKey = 'cNeCNR7mtXm3d6sJUuhtYuJqvtxBaZ3buUxMF2Qm5wRYEg9PKb5j';
        this.address = null;
        this.initialize();
    }

    initialize() {
        try {
            const privKey = PrivateKey.fromWif(this.privateKey);
            this.address = privKey.toAddress().toString();
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