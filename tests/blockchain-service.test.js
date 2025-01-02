import { BlockchainService } from '../src/services/blockchain-service';

describe('BlockchainService', () => {
    let service;
    let mockFetch;

    beforeEach(() => {
        service = new BlockchainService();
        mockFetch = jest.fn();
        global.fetch = mockFetch;
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('getBlockTransactions', () => {
        it('should fetch transactions for a range of blocks', async () => {
            const mockBlockData = { hash: 'blockhash123' };
            const mockTransactions = [{ txid: 'tx1' }, { txid: 'tx2' }];

            mockFetch
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBlockData) })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTransactions) });

            const result = await service.getBlockTransactions(100, 100);
            expect(result).toEqual(mockTransactions);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('should handle fetch errors gracefully', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(service.getBlockTransactions(100, 100)).rejects.toThrow();
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    describe('getBlockTransactionDetails', () => {
        it('should fetch transaction details for a block', async () => {
            const mockTransactions = [{ txid: 'tx1' }, { txid: 'tx2' }];
            mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockTransactions) });

            const result = await service.getBlockTransactionDetails('blockhash123');
            expect(result).toEqual(mockTransactions);
            expect(mockFetch).toHaveBeenCalled();
        });

        it('should handle fetch errors gracefully', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(service.getBlockTransactionDetails('blockhash123')).rejects.toThrow();
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    describe('verifyBlockHash', () => {
        it('should verify block hash correctly', async () => {
            const mockBlockData = { hash: 'blockhash123' };
            mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBlockData) });

            const result = await service.verifyBlockHash('blockhash123', 100);
            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalled();
        });

        it('should return false for invalid block hash', async () => {
            const mockBlockData = { hash: 'differenthash' };
            mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBlockData) });

            const result = await service.verifyBlockHash('blockhash123', 100);
            expect(result).toBe(false);
            expect(mockFetch).toHaveBeenCalled();
        });

        it('should handle fetch errors gracefully', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            const result = await service.verifyBlockHash('blockhash123', 100);
            expect(result).toBe(false);
            expect(mockFetch).toHaveBeenCalled();
        });
    });
}); 