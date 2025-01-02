import { TransactionCacheService } from '../src/services/transaction-cache-service';

describe('TransactionCacheService', () => {
    let service;
    const mockTxData = { txid: 'tx123', data: 'test' };

    beforeEach(() => {
        service = new TransactionCacheService();
        // Mock Date.now() to control time
        jest.spyOn(Date, 'now').mockImplementation(() => 1000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('cacheTransaction', () => {
        it('should cache transaction data', () => {
            service.cacheTransaction('tx123', mockTxData);
            expect(service.transactionCache.has('tx123')).toBe(true);
            const cached = service.transactionCache.get('tx123');
            expect(cached.data).toEqual(mockTxData);
            expect(cached.timestamp).toBe(1000);
        });

        it('should overwrite existing cache entry', () => {
            service.cacheTransaction('tx123', { old: 'data' });
            service.cacheTransaction('tx123', mockTxData);
            expect(service.transactionCache.get('tx123').data).toEqual(mockTxData);
        });
    });

    describe('getCachedTransaction', () => {
        it('should return cached transaction data', () => {
            service.cacheTransaction('tx123', mockTxData);
            const result = service.getCachedTransaction('tx123');
            expect(result).toEqual(mockTxData);
        });

        it('should return null for non-existent transaction', () => {
            const result = service.getCachedTransaction('nonexistent');
            expect(result).toBeNull();
        });

        it('should return null for expired cache entry', () => {
            service.cacheTransaction('tx123', mockTxData);
            // Move time forward past cache duration
            jest.spyOn(Date, 'now').mockImplementation(() => service.CACHE_DURATION + 2000);
            const result = service.getCachedTransaction('tx123');
            expect(result).toBeNull();
            expect(service.transactionCache.has('tx123')).toBe(false);
        });
    });

    describe('clearExpiredCache', () => {
        it('should remove expired entries', () => {
            service.cacheTransaction('tx1', { data: 'fresh' });
            service.cacheTransaction('tx2', { data: 'expired' });

            // Move time forward for tx2 to expire
            jest.spyOn(Date, 'now').mockImplementation(() => service.CACHE_DURATION + 2000);
            service.cacheTransaction('tx3', { data: 'fresh' });

            service.clearExpiredCache();

            expect(service.transactionCache.has('tx1')).toBe(false);
            expect(service.transactionCache.has('tx2')).toBe(false);
            expect(service.transactionCache.has('tx3')).toBe(true);
        });
    });

    describe('clearCache', () => {
        it('should clear all cache entries', () => {
            service.cacheTransaction('tx1', { data: 'test1' });
            service.cacheTransaction('tx2', { data: 'test2' });

            service.clearCache();

            expect(service.transactionCache.size).toBe(0);
        });
    });

    describe('getCacheStats', () => {
        it('should return correct cache statistics', () => {
            const now = Date.now();
            service.cacheTransaction('tx1', { data: 'test1' }); // timestamp: 1000
            jest.spyOn(Date, 'now').mockImplementation(() => 2000);
            service.cacheTransaction('tx2', { data: 'test2' }); // timestamp: 2000

            const stats = service.getCacheStats();
            expect(stats.totalCached).toBe(2);
            expect(stats.oldestEntry).toBe(1000);
            expect(stats.newestEntry).toBe(2000);
        });

        it('should handle empty cache', () => {
            const stats = service.getCacheStats();
            expect(stats.totalCached).toBe(0);
            expect(stats.oldestEntry).toBe(-Infinity);
            expect(stats.newestEntry).toBe(-Infinity);
        });
    });
}); 