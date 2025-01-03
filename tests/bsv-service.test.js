// Mock BSV SDK
jest.mock('@bsv/sdk', () => {
    const mockProvider = {
        getAddress: jest.fn().mockResolvedValue('testnet_address'),
        getUtxos: jest.fn().mockResolvedValue([{
            txid: 'test_txid',
            vout: 0,
            satoshis: 1000000
        }]),
        signTransaction: jest.fn().mockImplementation(tx => tx),
        broadcastTransaction: jest.fn().mockResolvedValue('test_txid')
    };

    return {
        initialize: jest.fn().mockResolvedValue(true),
        requestProvider: jest.fn().mockResolvedValue(mockProvider),
        Script: {
            buildDataOut: jest.fn().mockReturnValue('test_script')
        },
        Transaction: jest.fn().mockImplementation(() => ({
            from: jest.fn().mockReturnThis(),
            addOutput: jest.fn().mockReturnThis(),
            change: jest.fn().mockReturnThis(),
            fee: jest.fn().mockReturnThis(),
            serialize: jest.fn().mockReturnValue('test_tx_hex')
        })),
        getTransaction: jest.fn().mockResolvedValue({
            confirmations: 1,
            time: Date.now(),
            txid: 'test_txid',
            vout: [{
                scriptPubKey: {
                    addresses: ['testnet_address']
                }
            }]
        }),
        mockProvider // Export for test access
    };
});

// Mock testnet wallet
jest.mock('../src/services/testnet-wallet', () => ({
    testnetWallet: {
        getAddress: jest.fn().mockReturnValue('testnet_address'),
        getUtxos: jest.fn().mockResolvedValue([{
            txid: 'test_txid',
            vout: 0,
            satoshis: 1000000
        }]),
        signTransaction: jest.fn().mockImplementation(tx => tx),
        broadcastTransaction: jest.fn().mockResolvedValue('test_txid')
    }
}));

// Mock fetch for balance checks
global.fetch = jest.fn().mockImplementation((url) => {
    if (url.includes('/balance')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                confirmed: 1000000,
                unconfirmed: 0
            })
        });
    }
    return Promise.reject(new Error('Not found'));
});

import { BSVService } from '../src/services/bsv-service.js';
const bsvSdk = require('@bsv/sdk');

describe('BSVService', () => {
    let bsvService;
    let mockFile;
    let mockInscriptionData;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
        bsvService = new BSVService(true);
        mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
        mockInscriptionData = {
            type: 'memepool',
            version: '1.0',
            content: {
                id: 'test_id',
                title: 'Test Video',
                creator: 'test_address',
                timestamp: new Date().toISOString()
            }
        };
    });

    describe('connect', () => {
        test('should connect to BSV testnet', async () => {
            const result = await bsvService.connect();
            expect(result).toBe(true);
            expect(bsvSdk.initialize).toHaveBeenCalledWith({ network: 'testnet' });
        });

        test('should handle connection errors', async () => {
            bsvSdk.initialize.mockRejectedValueOnce(new Error('Connection failed'));
            await expect(bsvService.connect()).rejects.toThrow('Failed to connect to BSV testnet');
        });
    });

    describe('connectWallet', () => {
        test('should connect to wallet and return address', async () => {
            const address = await bsvService.connectWallet();
            expect(address).toBe('testnet_address');
            expect(bsvSdk.requestProvider).toHaveBeenCalled();
        });

        test('should handle wallet connection errors', async () => {
            bsvSdk.requestProvider.mockRejectedValueOnce(new Error('Wallet connection failed'));
            await expect(bsvService.connectWallet()).rejects.toThrow('Failed to connect wallet');
        });

        test('should auto-connect in development environment', async () => {
            process.env.NODE_ENV = 'development';
            const devBsvService = new BSVService(false);
            const address = await devBsvService.connectWallet();
            expect(address).toBe('testnet_address');
            process.env.NODE_ENV = 'test';
        });
    });

    describe('getWalletAddress', () => {
        test('should return wallet address when connected', async () => {
            await bsvService.connectWallet();
            const address = await bsvService.getWalletAddress();
            expect(address).toBe('testnet_address');
        });

        test('should throw error when wallet not connected', async () => {
            await expect(bsvService.getWalletAddress())
                .rejects
                .toThrow('Wallet not connected');
        });
    });

    describe('getBalance', () => {
        test('should fetch and return wallet balance', async () => {
            await bsvService.connectWallet();
            const balance = await bsvService.getBalance();
            expect(balance).toBe(0.01); // 1000000 satoshis = 0.01 BSV
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/balance'));
        });

        test('should handle balance fetch errors', async () => {
            await bsvService.connectWallet();
            fetch.mockRejectedValueOnce(new Error('Network error'));
            const balance = await bsvService.getBalance();
            expect(balance).toBe(0);
        });

        test('should throw error when wallet not connected', async () => {
            await expect(bsvService.getBalance())
                .rejects
                .toThrow('Wallet not connected');
        });
    });

    describe('calculateFee', () => {
        const testCases = [
            { size: 500, expected: { roundedKb: 1, fee: 1 } },           // < 1KB
            { size: 1024, expected: { roundedKb: 1, fee: 1 } },         // 1KB
            { size: 1536, expected: { roundedKb: 2, fee: 2 } },         // 1.5KB
            { size: 2048, expected: { roundedKb: 2, fee: 2 } },         // 2KB
            { size: 2560, expected: { roundedKb: 3, fee: 3 } },         // 2.5KB
            { size: 3072, expected: { roundedKb: 3, fee: 3 } }          // 3KB
        ];

        test.each(testCases)('should calculate correct fee for $size bytes', async ({ size, expected }) => {
            const feeInfo = await bsvService.calculateFee(size);
            expect(feeInfo.roundedKb).toBe(expected.roundedKb);
            expect(feeInfo.fee).toBe(expected.fee);
            expect(feeInfo.sizeBytes).toBe(size);
            expect(feeInfo.sizeKb).toBe(size / 1024);
            expect(feeInfo.rate).toBe(1);
            expect(feeInfo.bsv).toBe(expected.fee / 100000000);
        });

        test('should enforce minimum fee of 1 satoshi', async () => {
            const feeInfo = await bsvService.calculateFee(100);
            expect(feeInfo.fee).toBe(1);
        });

        test('should handle zero byte size', async () => {
            const feeInfo = await bsvService.calculateFee(0);
            expect(feeInfo.fee).toBe(1); // Minimum fee
            expect(feeInfo.roundedKb).toBe(1);
            expect(feeInfo.sizeBytes).toBe(0);
        });

        test('should handle very large file sizes', async () => {
            const size = 1024 * 1024; // 1MB
            const feeInfo = await bsvService.calculateFee(size);
            expect(feeInfo.roundedKb).toBe(1024);
            expect(feeInfo.fee).toBe(1024);
        });

        test('should handle decimal kilobyte values', async () => {
            const size = 1536; // 1.5KB
            const feeInfo = await bsvService.calculateFee(size);
            expect(feeInfo.roundedKb).toBe(2); // Should round up
            expect(feeInfo.fee).toBe(2);
        });
    });

    describe('createInscriptionTransaction', () => {
        beforeEach(async () => {
            await bsvService.connectWallet();
            bsvService.wallet = bsvSdk.mockProvider;
        });

        test('should create transaction with correct fee', async () => {
            const txid = await bsvService.createInscriptionTransaction(mockInscriptionData, mockFile);
            expect(txid).toBe('test_txid');
            expect(bsvSdk.Script.buildDataOut).toHaveBeenCalled();
            expect(bsvSdk.mockProvider.signTransaction).toHaveBeenCalled();
            expect(bsvSdk.mockProvider.broadcastTransaction).toHaveBeenCalled();
        });

        test('should throw error if wallet not connected', async () => {
            bsvService.wallet = null;
            await expect(bsvService.createInscriptionTransaction(mockInscriptionData, mockFile))
                .rejects
                .toThrow('Wallet not connected');
        });

        test('should handle transaction creation errors', async () => {
            bsvSdk.mockProvider.broadcastTransaction.mockRejectedValueOnce(new Error('Broadcast failed'));
            await expect(bsvService.createInscriptionTransaction(mockInscriptionData, mockFile))
                .rejects
                .toThrow('Failed to create inscription transaction');
        });

        test('should handle UTXO fetch errors', async () => {
            bsvSdk.mockProvider.getUtxos.mockRejectedValueOnce(new Error('UTXO fetch failed'));
            
            await expect(bsvService.createInscriptionTransaction(mockInscriptionData, mockFile))
                .rejects
                .toThrow('Failed to create inscription transaction');
        });

        test('should handle signing errors', async () => {
            bsvSdk.mockProvider.signTransaction.mockRejectedValueOnce(new Error('Signing failed'));
            
            await expect(bsvService.createInscriptionTransaction(mockInscriptionData, mockFile))
                .rejects
                .toThrow('Failed to create inscription transaction');
        });

        test('should handle invalid file input', async () => {
            const invalidFile = null; // null file should definitely fail
            
            await expect(bsvService.createInscriptionTransaction(mockInscriptionData, invalidFile))
                .rejects
                .toThrow('Failed to create inscription transaction');
        });
    });

    describe('getTransactionStatus', () => {
        test('should return transaction status', async () => {
            const status = await bsvService.getTransactionStatus('test_txid');
            expect(status).toEqual({
                confirmed: true,
                confirmations: 1,
                timestamp: expect.any(Number)
            });
        });

        test('should handle transaction status errors', async () => {
            bsvSdk.getTransaction.mockRejectedValueOnce(new Error('Status check failed'));
            await expect(bsvService.getTransactionStatus('test_txid'))
                .rejects
                .toThrow('Failed to get transaction status');
        });
    });

    describe('balance updates', () => {
        let updateCallback;
        let timerId;

        beforeEach(async () => {
            jest.useFakeTimers();
            updateCallback = jest.fn();
            await bsvService.connectWallet();
        });

        afterEach(() => {
            if (timerId) {
                bsvService.stopBalanceUpdates(timerId);
            }
            jest.clearAllTimers();
            jest.useRealTimers();
            jest.clearAllMocks();
        });

        test('should start periodic balance updates', async () => {
            // Mock successful balance fetch
            fetch.mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    confirmed: 1000000,
                    unconfirmed: 0
                })
            }));

            timerId = bsvService.startBalanceUpdates(updateCallback, 1000);
            
            // Wait for initial balance fetch
            await Promise.resolve();
            await jest.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            
            expect(updateCallback).toHaveBeenCalledTimes(1);
            expect(updateCallback).toHaveBeenCalledWith(0.01); // 1000000 satoshis = 0.01 BSV
            
            // Reset mock for next update
            fetch.mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    confirmed: 2000000,
                    unconfirmed: 0
                })
            }));

            // Clear the initial call count
            updateCallback.mockClear();

            // Advance timer and verify update
            await jest.advanceTimersByTimeAsync(1000);
            await Promise.resolve();
            
            expect(updateCallback).toHaveBeenCalledTimes(1);
            expect(updateCallback).toHaveBeenLastCalledWith(0.02); // 2000000 satoshis = 0.02 BSV
        });

        test('should handle balance update errors', async () => {
            // Mock failed balance fetch
            fetch.mockImplementation(() => Promise.reject(new Error('Network error')));
            
            timerId = bsvService.startBalanceUpdates(updateCallback, 1000);
            
            // Wait for initial balance fetch
            await Promise.resolve();
            await jest.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            
            expect(updateCallback).toHaveBeenCalledTimes(1);
            expect(updateCallback).toHaveBeenCalledWith(0); // Should call with 0 on error
            
            // Clear the initial call count
            updateCallback.mockClear();
            
            // Mock next failed balance fetch
            fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));
            
            // Advance timer and verify update
            await jest.advanceTimersByTimeAsync(1000);
            await Promise.resolve();
            
            expect(updateCallback).toHaveBeenCalledTimes(1);
            expect(updateCallback).toHaveBeenCalledWith(0); // Should call with 0 on error
        });

        test('should stop balance updates', async () => {
            // Mock initial balance fetch
            fetch.mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    confirmed: 1000000,
                    unconfirmed: 0
                })
            }));

            timerId = bsvService.startBalanceUpdates(updateCallback, 1000);
            
            // Wait for initial balance fetch
            await Promise.resolve();
            await jest.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            
            // Clear the initial call count
            updateCallback.mockClear();
            
            bsvService.stopBalanceUpdates(timerId);
            
            // Mock next balance fetch (should not be called)
            fetch.mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    confirmed: 2000000,
                    unconfirmed: 0
                })
            }));
            
            await jest.advanceTimersByTimeAsync(1000);
            await Promise.resolve();
            
            expect(updateCallback).not.toHaveBeenCalled();
        });

        test('should handle invalid timer ID gracefully', () => {
            expect(() => bsvService.stopBalanceUpdates(null)).not.toThrow();
            expect(() => bsvService.stopBalanceUpdates(undefined)).not.toThrow();
        });
    });

    describe('getLatestBlockHash', () => {
        test('should fetch latest block hash', async () => {
            const mockHash = '000000000000000000789f78cf7c0b36cc0b6ef50d2f2854c4a3367e5c80a4a5';
            global.fetch = jest.fn().mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    bestblockhash: mockHash
                })
            }));

            const hash = await bsvService.getLatestBlockHash();
            expect(hash).toBe(mockHash);
            expect(fetch).toHaveBeenCalledWith('https://api.whatsonchain.com/v1/bsv/test/chain/info');
        });

        test('should handle API errors', async () => {
            global.fetch = jest.fn().mockImplementationOnce(() => Promise.resolve({
                ok: false
            }));

            await expect(bsvService.getLatestBlockHash())
                .rejects
                .toThrow('Failed to fetch latest block info');
        });

        test('should handle network errors', async () => {
            global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

            await expect(bsvService.getLatestBlockHash())
                .rejects
                .toThrow('Network error');
        });
    });
}); 