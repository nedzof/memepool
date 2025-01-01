import { InscriptionService } from '../src/services/inscription-service.js';

describe('InscriptionService', () => {
    let inscriptionService;
    let mockFile;
    let mockMetadata;
    let mockAddress;

    beforeEach(() => {
        inscriptionService = new InscriptionService();
        
        // Mock file object
        mockFile = {
            name: 'test-video.mp4',
            type: 'video/mp4',
            size: 1024 * 1024 // 1MB
        };

        // Mock metadata
        mockMetadata = {
            duration: 3.5,
            dimensions: {
                width: 1280,
                height: 720
            },
            bitrate: 1000000 // 1Mbps
        };

        // Mock creator address
        mockAddress = 'testnet_wallet_address_123';
    });

    describe('createInscriptionData', () => {
        test('should create valid inscription data structure', () => {
            const result = inscriptionService.createInscriptionData(mockFile, mockMetadata, mockAddress);

            expect(result).toHaveProperty('type', 'memepool');
            expect(result).toHaveProperty('version', '1.0');
            expect(result.content).toHaveProperty('title', mockFile.name);
            expect(result.content).toHaveProperty('creator', mockAddress);
            expect(result.content).toHaveProperty('timestamp');
            expect(result.content.metadata).toHaveProperty('format', mockFile.type);
            expect(result.content.metadata).toHaveProperty('size', mockFile.size);
            expect(result.content.metadata).toHaveProperty('duration', mockMetadata.duration);
            expect(result.content.metadata).toHaveProperty('dimensions', '1280x720');
            expect(result.content.metadata).toHaveProperty('bitrate', mockMetadata.bitrate);
        });

        test('should generate unique content IDs', () => {
            const result1 = inscriptionService.createInscriptionData(mockFile, mockMetadata, mockAddress);
            const result2 = inscriptionService.createInscriptionData(mockFile, mockMetadata, mockAddress);

            expect(result1.content.id).not.toBe(result2.content.id);
        });
    });

    describe('validateInscriptionData', () => {
        test('should validate correct inscription data', () => {
            const data = inscriptionService.createInscriptionData(mockFile, mockMetadata, mockAddress);
            expect(() => inscriptionService.validateInscriptionData(data)).not.toThrow();
        });

        test('should throw error for missing required fields', () => {
            const invalidData = {
                type: 'memepool',
                version: '1.0',
                content: {
                    // Missing required fields
                }
            };

            expect(() => inscriptionService.validateInscriptionData(invalidData)).toThrow();
        });

        test('should throw error for empty required fields', () => {
            const data = inscriptionService.createInscriptionData(mockFile, mockMetadata, mockAddress);
            data.content.title = '';

            expect(() => inscriptionService.validateInscriptionData(data)).toThrow();
        });
    });
}); 