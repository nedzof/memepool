/**
 * Service for managing transaction caching
 */
export class TransactionCacheService {
    constructor() {
        this.transactionCache = new Map();
        this.CACHE_DURATION = 3600000; // 1 hour in milliseconds
    }

    /**
     * Cache transaction data
     * @param {string} txid - Transaction ID
     * @param {Object} txData - Transaction data
     */
    cacheTransaction(txid, txData) {
        this.transactionCache.set(txid, {
            data: txData,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached transaction data
     * @param {string} txid - Transaction ID
     * @returns {Object|null} Cached transaction data or null
     */
    getCachedTransaction(txid) {
        const cached = this.transactionCache.get(txid);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
            this.transactionCache.delete(txid);
            return null;
        }

        return cached.data;
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [txid, cached] of this.transactionCache.entries()) {
            if (now - cached.timestamp > this.CACHE_DURATION) {
                this.transactionCache.delete(txid);
            }
        }
    }

    /**
     * Clear all cache entries
     */
    clearCache() {
        this.transactionCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const timestamps = Array.from(this.transactionCache.values()).map(v => v.timestamp);
        return {
            totalCached: this.transactionCache.size,
            oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : -Infinity,
            newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : -Infinity
        };
    }
} 