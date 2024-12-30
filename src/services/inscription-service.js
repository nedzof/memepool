/**
 * Service for handling video inscriptions
 */
export class InscriptionService {
    /**
     * Creates an inscription data structure for a video
     * @param {File} file - The video file
     * @param {Object} metadata - Video metadata
     * @returns {Object} Inscription data structure
     */
    createInscriptionData(file, metadata) {
        const timestamp = new Date().toISOString();
        
        return {
            type: "memepool",
            version: "1.0",
            content: {
                id: this.generateContentId(file, timestamp),
                title: file.name,
                creator: "testnet_address", // Will be replaced with actual wallet address
                timestamp: timestamp,
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
     * @returns {string} Unique content ID
     */
    generateContentId(file, timestamp) {
        // Generate a random component for uniqueness
        const random = Math.random().toString(36).substring(2, 15);
        const fileComponent = file.name.replace(/[^a-zA-Z0-9]/g, '');
        const timeComponent = timestamp.replace(/[^0-9]/g, '');
        
        return `${fileComponent}-${timeComponent}-${random}`;
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