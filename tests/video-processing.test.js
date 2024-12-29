import { VideoProcessor } from '../src/services/video-processor.js';
import fs from 'fs';
import path from 'path';

describe('VideoProcessor', () => {
    let videoProcessor;
    const testVideoPath = path.join(__dirname, 'fixtures', 'test-video.mp4');

    beforeAll(() => {
        videoProcessor = new VideoProcessor();
        
        // Create test video file if it doesn't exist
        if (!fs.existsSync(testVideoPath)) {
            const testDir = path.join(__dirname, 'fixtures');
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir, { recursive: true });
            }
            // Copy sample video to test directory
            fs.copyFileSync(path.join(__dirname, '../src/assets/sample.mp4'), testVideoPath);
        }
    });

    afterAll(() => {
        // Cleanup test files
        if (fs.existsSync(testVideoPath)) {
            fs.unlinkSync(testVideoPath);
        }
    });

    describe('Format Verification', () => {
        test('should verify valid MP4 format', async () => {
            const result = await videoProcessor.verifyFormat(testVideoPath);
            expect(result.isValid).toBe(true);
            expect(result.format).toBe('mp4');
        });

        test('should reject invalid video format', async () => {
            const invalidPath = path.join(__dirname, 'fixtures', 'invalid.txt');
            fs.writeFileSync(invalidPath, 'not a video');
            
            await expect(videoProcessor.verifyFormat(invalidPath))
                .rejects
                .toThrow('Invalid video format');
                
            fs.unlinkSync(invalidPath);
        });
    });

    describe('Metadata Extraction', () => {
        test('should extract video metadata', async () => {
            const metadata = await videoProcessor.extractMetadata(testVideoPath);
            
            expect(metadata).toHaveProperty('duration');
            expect(metadata).toHaveProperty('dimensions');
            expect(metadata).toHaveProperty('codec');
            expect(metadata.duration).toBeLessThanOrEqual(5); // Max 5 seconds
            expect(metadata.dimensions).toHaveProperty('width');
            expect(metadata.dimensions).toHaveProperty('height');
        });

        test('should throw error for non-existent file', async () => {
            await expect(videoProcessor.extractMetadata('nonexistent.mp4'))
                .rejects
                .toThrow('File not found');
        });
    });

    describe('Thumbnail Generation', () => {
        test('should generate thumbnail from video', async () => {
            const thumbnailPath = await videoProcessor.generateThumbnail(testVideoPath);
            
            expect(fs.existsSync(thumbnailPath)).toBe(true);
            expect(path.extname(thumbnailPath)).toBe('.jpg');
            
            // Cleanup
            fs.unlinkSync(thumbnailPath);
        });

        test('should throw error for corrupted video', async () => {
            const corruptedPath = path.join(__dirname, 'fixtures', 'corrupted.mp4');
            fs.writeFileSync(corruptedPath, 'corrupted data');
            
            await expect(videoProcessor.generateThumbnail(corruptedPath))
                .rejects
                .toThrow('Failed to generate thumbnail');
                
            fs.unlinkSync(corruptedPath);
        });
    });

    describe('Video Processing Pipeline', () => {
        test('should process video successfully', async () => {
            const result = await videoProcessor.processVideo(testVideoPath);
            
            expect(result).toHaveProperty('metadata');
            expect(result).toHaveProperty('thumbnailPath');
            expect(result).toHaveProperty('processedVideoPath');
            expect(result.metadata.duration).toBeLessThanOrEqual(5);
            expect(fs.existsSync(result.thumbnailPath)).toBe(true);
            expect(fs.existsSync(result.processedVideoPath)).toBe(true);
            
            // Cleanup
            fs.unlinkSync(result.thumbnailPath);
            fs.unlinkSync(result.processedVideoPath);
        });

        test('should handle processing errors gracefully', async () => {
            const invalidPath = path.join(__dirname, 'fixtures', 'invalid.mp4');
            fs.writeFileSync(invalidPath, 'invalid data');
            
            await expect(videoProcessor.processVideo(invalidPath))
                .rejects
                .toThrow('Video processing failed');
                
            fs.unlinkSync(invalidPath);
        });
    });
}); 