import { VideoProcessor } from '../src/services/video-processor';
import type { VideoMetadata, VideoFormatValidation, VideoProcessingResult } from '../src/types/video';
import { BSVError } from '../src/types';

// Mock browser APIs
class MockHTMLVideoElement {
  private _src: string = '';
  videoWidth = 1920;
  videoHeight = 1080;
  duration = 3.5;
  currentTime = 0;
  preload: string | null = null;
  onloadedmetadata: (() => void) | null = null;
  onloadeddata: (() => void) | null = null;
  onseeked: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(private errorMode = false) {}

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    // Trigger events when src is set
    if (value) {
      this.load();
    }
  }

  load(): void {
    if (this.errorMode) {
      queueMicrotask(() => this.onerror?.());
      return;
    }
    
    // Trigger events in sequence
    queueMicrotask(() => {
      this.onloadedmetadata?.();
      queueMicrotask(() => {
        this.onloadeddata?.();
        if (this.onseeked) {
          this.currentTime = this.duration / 2;
          queueMicrotask(() => this.onseeked?.());
        }
      });
    });
  }
}

// Mock canvas API
class MockCanvasContext {
  drawImage(): void {}
}

class MockCanvas {
  width = 1920;
  height = 1080;
  getContext(): MockCanvasContext | null {
    return new MockCanvasContext();
  }
  toDataURL(): string {
    return 'data:image/jpeg;base64,mockThumbnail';
  }
}

// Setup global mocks
global.URL = {
  createObjectURL: jest.fn(blob => `blob:${Math.random()}`),
  revokeObjectURL: jest.fn()
} as any;

global.document = {
  createElement: jest.fn((type: string) => {
    if (type === 'video') return new MockHTMLVideoElement();
    if (type === 'canvas') return new MockCanvas();
    return null;
  })
} as any;

describe('VideoProcessor', () => {
  let videoProcessor: VideoProcessor;
  const mockFile = new File(
    [new ArrayBuffer(1024)],
    'test.mp4',
    { type: 'video/mp4' }
  );

  beforeEach(() => {
    videoProcessor = new VideoProcessor();
    jest.clearAllMocks();
  });

  describe('verifyFormat', () => {
    it('should validate supported video format', async () => {
      const result: VideoFormatValidation = await videoProcessor.verifyFormat(mockFile);
      expect(result).toEqual({
        isValid: true,
        format: 'mp4'
      });
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    }, 10000);

    it('should reject unsupported format', async () => {
      const invalidFile = new File([], 'test.avi', { type: 'video/avi' });
      await expect(videoProcessor.verifyFormat(invalidFile))
        .rejects
        .toThrow(new BSVError('INVALID_FORMAT', 'Unsupported video format'));
    });

    it('should reject oversized file', async () => {
      const largeFile = new File(
        [new ArrayBuffer(101 * 1024 * 1024)],
        'large.mp4',
        { type: 'video/mp4' }
      );
      await expect(videoProcessor.verifyFormat(largeFile))
        .rejects
        .toThrow(new BSVError('INVALID_SIZE', 'Video file too large'));
    });

    it('should handle video loading error', async () => {
      (document.createElement as jest.Mock).mockImplementationOnce(() => 
        new MockHTMLVideoElement(true)
      );
      await expect(videoProcessor.verifyFormat(mockFile))
        .rejects
        .toThrow(new BSVError('INVALID_FORMAT', 'Invalid video format'));
    }, 10000);
  });

  describe('extractMetadata', () => {
    it('should extract video metadata', async () => {
      const metadata: VideoMetadata = await videoProcessor.extractMetadata(mockFile);
      expect(metadata).toEqual({
        duration: 3.5,
        dimensions: {
          width: 1920,
          height: 1080
        },
        codec: 'MP4',
        bitrate: expect.any(Number)
      });
    }, 10000);

    it('should reject if duration exceeds maximum', async () => {
      const longVideo = new MockHTMLVideoElement();
      longVideo.duration = 10;
      (document.createElement as jest.Mock).mockImplementationOnce(() => longVideo);
      
      await expect(videoProcessor.extractMetadata(mockFile))
        .rejects
        .toThrow(new BSVError('INVALID_DURATION', 'Video duration exceeds maximum allowed'));
    }, 10000);

    it('should handle metadata extraction error', async () => {
      (document.createElement as jest.Mock).mockImplementationOnce(() => 
        new MockHTMLVideoElement(true)
      );
      await expect(videoProcessor.extractMetadata(mockFile))
        .rejects
        .toThrow(new BSVError('METADATA_ERROR', 'Failed to extract metadata'));
    }, 10000);
  });

  describe('processVideo', () => {
    it('should process video file successfully', async () => {
      const result: VideoProcessingResult = await videoProcessor.processVideo(mockFile);
      expect(result).toEqual({
        metadata: expect.objectContaining({
          duration: 3.5,
          dimensions: {
            width: 1920,
            height: 1080
          }
        }),
        buffer: expect.any(Buffer),
        format: 'video/mp4',
        thumbnail: expect.stringContaining('data:image/jpeg;base64,')
      });
    }, 10000);

    it('should handle missing thumbnail gracefully', async () => {
      (document.createElement as jest.Mock)
        .mockImplementationOnce(() => new MockHTMLVideoElement()) // For verifyFormat
        .mockImplementationOnce(() => new MockHTMLVideoElement()) // For extractMetadata
        .mockImplementationOnce(() => new MockHTMLVideoElement(true)); // For thumbnail

      const result: VideoProcessingResult = await videoProcessor.processVideo(mockFile);
      expect(result.thumbnail).toBeUndefined();
      expect(result.metadata).toBeDefined();
      expect(result.buffer).toBeDefined();
    }, 10000);

    it('should handle unsupported format', async () => {
      const invalidFile = new File([], 'test.avi', { type: 'video/avi' });
      await expect(videoProcessor.processVideo(invalidFile))
        .rejects
        .toThrow(new BSVError('INVALID_FORMAT', 'Unsupported video format'));
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail successfully', async () => {
      const thumbnail = await videoProcessor.generateThumbnail(mockFile);
      expect(thumbnail).toContain('data:image/jpeg;base64,');
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    }, 10000);

    it('should handle thumbnail generation error', async () => {
      (document.createElement as jest.Mock).mockImplementationOnce(() => 
        new MockHTMLVideoElement(true)
      );
      await expect(videoProcessor.generateThumbnail(mockFile))
        .rejects
        .toThrow(new BSVError('THUMBNAIL_ERROR', 'Failed to generate thumbnail'));
    }, 10000);

    it('should handle canvas context error', async () => {
      class MockCanvasWithError extends MockCanvas {
        getContext(): null {
          return null;
        }
      }
      (document.createElement as jest.Mock)
        .mockImplementationOnce(() => new MockHTMLVideoElement())
        .mockImplementationOnce(() => new MockCanvasWithError());

      await expect(videoProcessor.generateThumbnail(mockFile))
        .rejects
        .toThrow(new BSVError('THUMBNAIL_ERROR', 'Failed to generate thumbnail'));
    }, 10000);
  });

  describe('cleanup', () => {
    it('should cleanup blob URLs', () => {
      const urls = ['blob:123', 'blob:456', 'data:789', 'https://example.com'];
      videoProcessor.cleanup(urls);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:123');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:456');
    });

    it('should handle empty URLs array', () => {
      videoProcessor.cleanup([]);
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it('should handle null or undefined URLs', () => {
      videoProcessor.cleanup(['blob:123', '', null as any, undefined as any]);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:123');
    });
  });
}); 