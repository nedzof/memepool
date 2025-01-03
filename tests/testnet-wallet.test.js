import { TestnetWallet } from '../src/services/testnet-wallet.js';

describe('TestnetWallet', () => {
    let wallet;

    beforeEach(() => {
        wallet = new TestnetWallet();
    });

    test('should initialize with static private key', () => {
        expect(wallet.getPrivateKey()).toBe('cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy');
    });

    test('should generate consistent address from private key', () => {
        const address = wallet.getAddress();
        expect(address).toBeTruthy();
        expect(typeof address).toBe('string');
        
        // Create another instance and verify address is the same
        const wallet2 = new TestnetWallet();
        expect(wallet2.getAddress()).toBe(address);
    });

    test('should implement wallet interface methods', async () => {
        expect(typeof wallet.getUtxos).toBe('function');
        expect(typeof wallet.signTransaction).toBe('function');
        expect(typeof wallet.broadcastTransaction).toBe('function');

        const utxos = await wallet.getUtxos();
        expect(Array.isArray(utxos)).toBe(true);

        const mockTx = { test: true };
        const signedTx = await wallet.signTransaction(mockTx);
        expect(signedTx).toEqual(mockTx);

        const txid = await wallet.broadcastTransaction(signedTx);
        expect(txid).toBe('test_txid');
    });
}); 