/**
 * Service for managing inscription indexing and retrieval
 */
export class InscriptionIndexService {
    constructor() {
        this.recoveryIndex = new Map();
        this.blockHeightIndex = new Map();
        this.contentIdMap = new Map();
    }

    /**
     * Initialize indices
     */
    async initialize() {
        this.recoveryIndex.clear();
        this.blockHeightIndex.clear();
        this.contentIdMap.clear();
        return true;
    }

    /**
     * Add inscription to recovery index with enhanced indexing
     * @param {Object} inscription - Inscription data
     * @param {string} txid - Transaction ID
     * @param {number} blockHeight - Block height
     */
    addToIndex(inscription, txid, blockHeight) {
        const key = inscription.content.id;
        const indexData = {
            txid,
            blockHeight,
            metadata: inscription.content.metadata,
            creator: inscription.content.creator,
            timestamp: inscription.content.timestamp
        };

        // Update main recovery index
        this.recoveryIndex.set(key, indexData);

        // Update block height index
        if (!this.blockHeightIndex.has(blockHeight)) {
            this.blockHeightIndex.set(blockHeight, new Set());
        }
        this.blockHeightIndex.get(blockHeight).add(key);

        // Update content ID mapping
        this.contentIdMap.set(key, {
            txid,
            blockHeight,
            verified: false
        });
    }

    /**
     * Get inscriptions by block height
     * @param {number} blockHeight - Block height to query
     * @returns {Array} Array of inscriptions at the specified height
     */
    getInscriptionsByHeight(blockHeight) {
        const contentIds = this.blockHeightIndex.get(blockHeight) || new Set();
        return Array.from(contentIds)
            .map(id => this.getInscription(id))
            .filter(inscription => inscription !== null);
    }

    /**
     * Get inscription by content ID
     * @param {string} contentId - Content ID to query
     * @returns {Object|null} Inscription data or null if not found
     */
    getInscription(contentId) {
        return this.recoveryIndex.get(contentId) || null;
    }

    /**
     * Get inscription status by content ID
     * @param {string} contentId - Content ID to query
     * @returns {Object|null} Status object or null if not found
     */
    getInscriptionStatus(contentId) {
        return this.contentIdMap.get(contentId) || null;
    }

    /**
     * Get all inscriptions
     * @returns {Array} Array of all inscriptions
     */
    getAllInscriptions() {
        return Array.from(this.recoveryIndex.values());
    }

    /**
     * Set verification status for an inscription
     * @param {string} contentId - Content ID
     * @param {boolean} status - Verification status
     */
    setVerificationStatus(contentId, status) {
        const indexData = this.contentIdMap.get(contentId);
        if (indexData) {
            indexData.verified = status;
            this.contentIdMap.set(contentId, indexData);
        }
    }

    /**
     * Get verified inscriptions
     * @returns {Array} Array of verified inscriptions
     */
    getVerifiedInscriptions() {
        return Array.from(this.contentIdMap.entries())
            .filter(([_, data]) => data.verified)
            .map(([id]) => this.getInscription(id))
            .filter(inscription => inscription !== null);
    }

    /**
     * Get block height statistics
     * @returns {Object} Statistics about indexed blocks
     */
    getBlockHeightStats() {
        const heights = Array.from(this.blockHeightIndex.keys());
        return {
            totalBlocks: heights.length,
            minHeight: Math.min(...heights),
            maxHeight: Math.max(...heights),
            inscriptionCount: this.recoveryIndex.size
        };
    }
} 