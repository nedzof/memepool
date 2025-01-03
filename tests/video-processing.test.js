import { VideoProcessor } from '../src/services/video-processor.js';

// Mock browser APIs
global.URL = {
    createObjectURL: jest.fn(blob => `blob:${Math.random()}`),
    revokeObjectURL: jest.fn()
};

class MockHTMLVideoElement {
    constructor() {
        this.videoWidth = 1280;
        this.videoHeight = 720;
        this.duration = 3.5;
        this.currentTime = 0;
        this.preload = null;
        this._errorMode = false;
    }

    set src(value) {
        this._src = value;
        // Use queueMicrotask to simulate async behavior but avoid Jest timeouts
        queueMicrotask(() => {
            if (this._errorMode) {
                if (this.onerror) {
                    this.onerror(new Error('Video loading failed'));
                }
            } else {
                if (this.onloadedmetadata) {
                    this.onloadedmetadata();
                }
                if (this.onloadeddata) {
                    this.onloadeddata();
                    if (this.onseeked) {
                        this.onseeked();
                    }
                }
            }
        });
    }

    get src() {
        return this._src;
    }

    setErrorMode(value = true) {
        this._errorMode = value;
    }
}

global.HTMLVideoElement = MockHTMLVideoElement;

global.document = {
    createElement: jest.fn(type => {
        if (type === 'video') {
            return new MockHTMLVideoElement();
        }
        if (type === 'canvas') {
            return {
                width: 1280,
                height: 720,
                getContext: () => ({
                    drawImage: jest.fn()
                }),
                toDataURL: () => 'data:image/jpeg;base64,fake'
            };
        }
    })
};

describe('VideoProcessor', () => {
    let videoProcessor;
    let mockVideoFile;

    beforeEach(() => {
        videoProcessor = new VideoProcessor();
        
        // Create a mock video file
        mockVideoFile = new File(
            [new ArrayBuffer(1024 * 1024)], // 1MB of data
            'test-video.mp4',
            { type: 'video/mp4' }
        );

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('Format Verification', () => {
        test('should verify valid MP4 format', async () => {
            const result = await videoProcessor.verifyFormat(mockVideoFile);
            expect(result.isValid).toBe(true);
            expect(result.format).toBe('mp4');
            expect(URL.createObjectURL).toHaveBeenCalledWith(mockVideoFile);
            expect(URL.revokeObjectURL).toHaveBeenCalled();
        });

        test('should reject invalid video format', async () => {
            const invalidFile = new File(
                [new ArrayBuffer(1024)],
                'invalid.txt',
                { type: 'text/plain' }
            );
            
            await expect(videoProcessor.verifyFormat(invalidFile))
                .rejects
                .toThrow('Invalid video format');
        });

        test('should handle video loading errors', async () => {
            const mockVideo = new MockHTMLVideoElement();
            mockVideo.setErrorMode(true);
            document.createElement.mockImplementationOnce(() => mockVideo);

            await expect(videoProcessor.verifyFormat(mockVideoFile))
                .rejects
                .toThrow('Invalid video format');
        });
    });

    describe('Metadata Extraction', () => {
        test('should extract video metadata', async () => {
            const metadata = await videoProcessor.extractMetadata(mockVideoFile);
            
            expect(metadata).toHaveProperty('duration');
            expect(metadata).toHaveProperty('dimensions');
            expect(metadata).toHaveProperty('codec');
            expect(metadata.duration).toBe(3.5);
            expect(metadata.dimensions).toEqual({
                width: 1280,
                height: 720
            });
            expect(metadata.codec).toBe('MP4');
            expect(metadata.bitrate).toBeGreaterThan(0);
            expect(URL.createObjectURL).toHaveBeenCalledWith(mockVideoFile);
            expect(URL.revokeObjectURL).toHaveBeenCalled();
        });

        test('should handle metadata extraction errors', async () => {
            const mockVideo = new MockHTMLVideoElement();
            mockVideo.setErrorMode(true);
            document.createElement.mockImplementationOnce(() => mockVideo);

            await expect(videoProcessor.extractMetadata(mockVideoFile))
                .rejects
                .toThrow('Failed to extract metadata');
        });
    });

    describe('Thumbnail Generation', () => {
        test('should generate thumbnail from video', async () => {
            const thumbnailUrl = await videoProcessor.generateThumbnail(mockVideoFile);
            
            expect(thumbnailUrl).toMatch(/^data:image\/jpeg;base64,/);
            expect(URL.createObjectURL).toHaveBeenCalledWith(mockVideoFile);
            expect(URL.revokeObjectURL).toHaveBeenCalled();
        });

        test('should handle thumbnail generation errors', async () => {
            const mockVideo = new MockHTMLVideoElement();
            mockVideo.setErrorMode(true);
            document.createElement.mockImplementationOnce(() => mockVideo);

            await expect(videoProcessor.generateThumbnail(mockVideoFile))
                .rejects
                .toThrow('Failed to generate thumbnail');
        });
    });

    describe('Cleanup', () => {
        test('should revoke object URLs', () => {
            const urls = [
                'blob:http://localhost/123',
                'blob:http://localhost/456',
                'data:image/jpeg;base64,abc'
            ];

            videoProcessor.cleanup(urls);

            expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/123');
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/456');
        });
    });
}); 