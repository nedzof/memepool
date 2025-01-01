/**
 * Service for handling video inscriptions
 */
export class InscriptionService {
    /**
     * Creates an inscription data structure for a video
     * @param {File} file - The video file
     * @param {Object} metadata - Video metadata
     * @param {string} creatorAddress - The creator's wallet address
     * @param {string} blockHash - Latest block hash
     * @returns {Object} Inscription data structure
     */
    createInscriptionData(file, metadata, creatorAddress, blockHash) {
        const timestamp = new Date().toISOString();
        
        return {
            type: "memepool",
            version: "1.0",
            content: {
                id: this.generateContentId(file, timestamp, creatorAddress, blockHash),
                title: file.name,
                creator: creatorAddress,
                timestamp: timestamp,
                blockHash: blockHash,
                metadata: {
                    format: file.type,
                    size: file.size,
                    duration: metadata.duration,
                    dimensions: `${metadata.dimensions.width}x${metadata.dimensions.height}`,
                    bitrate: metadata.bitrate
                }
            }
        };
    }

    /**
     * Generates a unique content ID
     * @param {File} file - The video file
     * @param {string} timestamp - ISO timestamp
     * @param {string} creatorAddress - The creator's wallet address
     * @param {string} blockHash - Latest block hash for timestamp verification
     * @returns {string} Unique content ID
     */
    generateContentId(file, timestamp, creatorAddress, blockHash) {
        // Use deterministic components for the ID
        const fileComponent = file.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const timeComponent = timestamp.replace(/[^0-9]/g, '');
        const addressComponent = creatorAddress.slice(-8); // Use last 8 chars of address
        const blockComponent = blockHash.slice(-6); // Use last 6 chars of block hash
        
        return `${fileComponent}-${timeComponent}-${addressComponent}-${blockComponent}`;
    }

    /**
     * Validates the inscription data structure
     * @param {Object} inscriptionData - The inscription data to validate
     * @returns {boolean} True if valid, throws error if invalid
     */
    validateInscriptionData(inscriptionData) {
        const required = [
            'type',
            'version',
            'content',
            'content.id',
            'content.title',
            'content.creator',
            'content.timestamp',
            'content.metadata',
            'content.metadata.format',
            'content.metadata.size',
            'content.metadata.duration',
            'content.metadata.dimensions'
        ];

        for (const field of required) {
            const value = field.split('.').reduce((obj, key) => obj?.[key], inscriptionData);
            if (value === undefined || value === null || value === '') {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        return true;
    }
} 