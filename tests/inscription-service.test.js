import { InscriptionService } from '../src/services/inscription-service.js';

describe('InscriptionService', () => {
    let inscriptionService;
    let mockFile;
    let mockMetadata;
    let mockAddress;
    let mockTimestamp;
    let mockBlockHash;

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
        mockAddress = 'n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ';
        
        // Fixed timestamp for deterministic testing
        mockTimestamp = '2024-02-14T12:00:00.000Z';

        // Mock block hash
        mockBlockHash = '000000000000000000a7fb6c2b0eb7b13336c82424c74a17925b81b874ee0185';
    });

    describe('generateContentId', () => {
        test('should generate deterministic content ID with block hash', () => {
            const id1 = inscriptionService.generateContentId(mockFile, mockTimestamp, mockAddress, mockBlockHash);
            const id2 = inscriptionService.generateContentId(mockFile, mockTimestamp, mockAddress, mockBlockHash);
            
            expect(id1).toBe(id2);
            expect(id1).toMatch(/^[a-z0-9]+-\d+-[a-zA-Z0-9]{8}-[a-zA-Z0-9]{6}$/);
            expect(id1.split('-')[2]).toBe(mockAddress.slice(-8));
            expect(id1.split('-')[3]).toBe(mockBlockHash.slice(-6));
        });

        test('should handle special characters in filename', () => {
            const specialFile = {
                ...mockFile,
                name: 'test@#$%^&*video.mp4'
            };
            
            const id = inscriptionService.generateContentId(specialFile, mockTimestamp, mockAddress, mockBlockHash);
            expect(id).toMatch(/^[a-z0-9]+-\d+-[a-zA-Z0-9]{8}-[a-zA-Z0-9]{6}$/);
        });

        test('should use consistent case for filename', () => {
            const upperCaseFile = {
                ...mockFile,
                name: 'TEST-VIDEO.mp4'
            };
            
            const lowerCaseFile = {
                ...mockFile,
                name: 'test-video.mp4'
            };
            
            const id1 = inscriptionService.generateContentId(upperCaseFile, mockTimestamp, mockAddress, mockBlockHash);
            const id2 = inscriptionService.generateContentId(lowerCaseFile, mockTimestamp, mockAddress, mockBlockHash);
            
            expect(id1).toBe(id2);
        });
    });

    describe('createInscriptionData', () => {
        test('should create valid inscription data structure with block hash', () => {
            const result = inscriptionService.createInscriptionData(mockFile, mockMetadata, mockAddress, mockBlockHash);

            expect(result).toHaveProperty('type', 'memepool');
            expect(result).toHaveProperty('version', '1.0');
            expect(result.content).toHaveProperty('title', mockFile.name);
            expect(result.content).toHaveProperty('creator', mockAddress);
            expect(result.content).toHaveProperty('timestamp');
            expect(result.content).toHaveProperty('blockHash', mockBlockHash);
            expect(result.content.metadata).toHaveProperty('format', mockFile.type);
            expect(result.content.metadata).toHaveProperty('size', mockFile.size);
            expect(result.content.metadata).toHaveProperty('duration', mockMetadata.duration);
            expect(result.content.metadata).toHaveProperty('dimensions', '1280x720');
            expect(result.content.metadata).toHaveProperty('bitrate', mockMetadata.bitrate);
        });

        test('should include block hash in content ID', () => {
            const result = inscriptionService.createInscriptionData(mockFile, mockMetadata, mockAddress, mockBlockHash);
            expect(result.content.id.split('-')[3]).toBe(mockBlockHash.slice(-6));
        });
    });

    describe('validateInscriptionData', () => {
        test('should validate correct inscription data', () => {
            const data = inscriptionService.createInscriptionData(mockFile, mockMetadata, mockAddress, mockBlockHash);
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
            const data = inscriptionService.createInscriptionData(mockFile, mockMetadata, mockAddress, mockBlockHash);
            data.content.title = '';

            expect(() => inscriptionService.validateInscriptionData(data)).toThrow();
        });
    });
}); 