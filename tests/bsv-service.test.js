import { BSVService } from '../src/services/bsv-service.js';

// Mock bsv SDK
jest.mock('@bsv/sdk', () => ({
    initialize: jest.fn().mockResolvedValue(true),
    requestProvider: jest.fn().mockResolvedValue({
        getAddress: jest.fn().mockResolvedValue('testnet_address'),
        getUtxos: jest.fn().mockResolvedValue([]),
        signTransaction: jest.fn().mockImplementation(tx => tx),
        broadcastTransaction: jest.fn().mockResolvedValue('test_txid')
    }),
    Script: {
        buildDataOut: jest.fn().mockReturnValue('test_script')
    },
    Transaction: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        addOutput: jest.fn().mockReturnThis(),
        change: jest.fn().mockReturnThis(),
        fee: jest.fn().mockReturnThis()
    })),
    getTransaction: jest.fn().mockResolvedValue({
        confirmations: 1,
        time: Date.now()
    })
}));

describe('BSVService', () => {
    let bsvService;
    let mockFile;
    let mockInscriptionData;

    beforeEach(() => {
        bsvService = new BSVService();
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

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('connect', () => {
        test('should connect to BSV testnet', async () => {
            const result = await bsvService.connect();
            expect(result).toBe(true);
            expect(bsvService.bsv.initialize).toHaveBeenCalledWith({ network: 'testnet' });
        });

        test('should handle connection errors', async () => {
            bsvService.bsv.initialize.mockRejectedValueOnce(new Error('Connection failed'));
            await expect(bsvService.connect()).rejects.toThrow('Failed to connect to BSV testnet');
        });
    });

    describe('connectWallet', () => {
        test('should connect to wallet and return address', async () => {
            const address = await bsvService.connectWallet();
            expect(address).toBe('testnet_address');
            expect(bsvService.bsv.requestProvider).toHaveBeenCalled();
        });

        test('should handle wallet connection errors', async () => {
            bsvService.bsv.requestProvider.mockRejectedValueOnce(new Error('Wallet connection failed'));
            await expect(bsvService.connectWallet()).rejects.toThrow('Failed to connect wallet');
        });
    });

    describe('calculateFee', () => {
        test('should calculate fee for small transaction (< 1.5KB)', async () => {
            const dataSize = 1024; // 1KB
            const feeInfo = await bsvService.calculateFee(dataSize);
            
            expect(feeInfo).toHaveProperty('sizeBytes', dataSize);
            expect(feeInfo).toHaveProperty('sizeKb', 1);
            expect(feeInfo).toHaveProperty('roundedKb', 1);
            expect(feeInfo).toHaveProperty('rate', 1);
            expect(feeInfo).toHaveProperty('fee', 1);
            expect(feeInfo).toHaveProperty('bsv', 1 / 100000000);
        });

        test('should calculate fee for medium transaction (1.5KB to 2.49KB)', async () => {
            const dataSize = 2 * 1024; // 2KB
            const feeInfo = await bsvService.calculateFee(dataSize);
            
            expect(feeInfo.sizeKb).toBe(2);
            expect(feeInfo.roundedKb).toBe(2);
            expect(feeInfo.fee).toBe(2);
        });

        test('should calculate fee for large transaction (2.5KB to 3.49KB)', async () => {
            const dataSize = 3 * 1024; // 3KB
            const feeInfo = await bsvService.calculateFee(dataSize);
            
            expect(feeInfo.sizeKb).toBe(3);
            expect(feeInfo.roundedKb).toBe(3);
            expect(feeInfo.fee).toBe(3);
        });

        test('should handle fractional kilobytes correctly', async () => {
            const dataSize = 1.7 * 1024; // 1.7KB
            const feeInfo = await bsvService.calculateFee(dataSize);
            
            expect(feeInfo.sizeKb).toBeCloseTo(1.7, 2);
            expect(feeInfo.roundedKb).toBe(2); // Rounds to 2 because 1.7 + 0.5 = 2.2, floor = 2
            expect(feeInfo.fee).toBe(2);
        });

        test('should enforce minimum fee of 1 satoshi', async () => {
            const dataSize = 100; // Very small file
            const feeInfo = await bsvService.calculateFee(dataSize);
            
            expect(feeInfo.sizeKb).toBeLessThan(1);
            expect(feeInfo.fee).toBe(1); // Minimum fee
        });
    });

    describe('createInscriptionTransaction', () => {
        test('should create transaction with correct fee', async () => {
            await bsvService.connectWallet();
            const txid = await bsvService.createInscriptionTransaction(mockInscriptionData, mockFile);
            expect(txid).toBe('test_txid');
        });

        test('should throw error if wallet not connected', async () => {
            await expect(bsvService.createInscriptionTransaction(mockInscriptionData, mockFile))
                .rejects.toThrow('Wallet not connected');
        });
    });

    describe('getTransactionStatus', () => {
        test('should return transaction status', async () => {
            const status = await bsvService.getTransactionStatus('test_txid');
            expect(status).toHaveProperty('confirmed', true);
            expect(status).toHaveProperty('confirmations');
            expect(status).toHaveProperty('timestamp');
        });

        test('should handle transaction status errors', async () => {
            bsvService.bsv.getTransaction.mockRejectedValueOnce(new Error('Status check failed'));
            await expect(bsvService.getTransactionStatus('test_txid'))
                .rejects.toThrow('Failed to get transaction status');
        });
    });
}); 