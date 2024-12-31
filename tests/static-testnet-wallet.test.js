import { StaticTestnetWallet } from '../src/services/static-testnet-wallet';

describe('StaticTestnetWallet', () => {
    let wallet;

    beforeEach(() => {
        wallet = new StaticTestnetWallet();
    });

    test('should initialize with static testnet address', () => {
        expect(wallet.getAddress()).toBe('mxRjX2uxHHmS4rdSYcmCcp2G91eseb5PpF');
    });

    test('should provide wallet info', () => {
        const info = wallet.getWalletInfo();
        expect(info.address).toBe('mxRjX2uxHHmS4rdSYcmCcp2G91eseb5PpF');
        expect(info.network).toBe('testnet');
        expect(info.isConnected).toBe(true);
    });

    test('should provide mock UTXOs', async () => {
        const utxos = await wallet.getUtxos();
        expect(utxos).toBeInstanceOf(Array);
        expect(utxos[0]).toHaveProperty('txId');
        expect(utxos[0]).toHaveProperty('outputIndex');
        expect(utxos[0]).toHaveProperty('script');
        expect(utxos[0]).toHaveProperty('satoshis');
    });

    test('should mock transaction signing', async () => {
        const mockTx = { id: 'mock_tx' };
        const signedTx = await wallet.signTransaction(mockTx);
        expect(signedTx).toEqual(mockTx);
    });

    test('should mock transaction broadcasting', async () => {
        const mockTx = { id: 'mock_tx' };
        const txid = await wallet.broadcastTransaction(mockTx);
        expect(txid).toMatch(/^mock_txid_\d+$/);
    });
}); 