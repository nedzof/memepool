import { VideoProcessor as IVideoProcessor, VideoMetadata, VideoFormatValidation, VideoProcessingResult, VideoProcessorOptions } from '../types/video';
import { InscriptionContentType } from '../types/inscription';
import { BSVError } from '../types';

/**
 * Service for processing video files for inscription
 */
export class VideoProcessor implements IVideoProcessor {
  private readonly options: VideoProcessorOptions;
  private readonly DEFAULT_OPTIONS: VideoProcessorOptions = {
    maxDuration: 5,  // 5 seconds
    maxSize: 100 * 1024 * 1024,  // 100MB
    supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime']
  };

  constructor(options?: VideoProcessorOptions) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
  }

  private createVideoElement(): HTMLVideoElement {
    const video = document.createElement('video');
    video.preload = 'metadata';
    return video;
  }

  /**
   * Verify if the video format is supported
   */
  async verifyFormat(file: File): Promise<VideoFormatValidation> {
    return new Promise((resolve, reject) => {
      if (!this.options.supportedFormats?.includes(file.type)) {
        reject(new BSVError('INVALID_FORMAT', 'Unsupported video format'));
        return;
      }

      if (file.size > (this.options.maxSize || 0)) {
        reject(new BSVError('INVALID_SIZE', 'Video file too large'));
        return;
      }

      const video = this.createVideoElement();
      const url = URL.createObjectURL(file);
      video.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.onloadedmetadata = null;
        video.onerror = null;
      };

      video.onloadedmetadata = () => {
        cleanup();
        resolve({
          isValid: true,
          format: file.type.split('/')[1]
        });
      };

      video.onerror = () => {
        cleanup();
        reject(new BSVError('INVALID_FORMAT', 'Invalid video format'));
      };
    });
  }

  /**
   * Extract metadata from video file
   */
  async extractMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = this.createVideoElement();
      const url = URL.createObjectURL(file);
      video.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.onloadedmetadata = null;
        video.onerror = null;
      };

      video.onloadedmetadata = () => {
        if (video.duration > (this.options.maxDuration || 0)) {
          cleanup();
          reject(new BSVError('INVALID_DURATION', 'Video duration exceeds maximum allowed'));
          return;
        }

        const metadata: VideoMetadata = {
          duration: video.duration,
          dimensions: {
            width: video.videoWidth,
            height: video.videoHeight
          },
          codec: file.type.split('/')[1].toUpperCase(),
          bitrate: Math.round(file.size * 8 / video.duration) // Approximate bitrate
        };
        cleanup();
        resolve(metadata);
      };

      video.onerror = () => {
        cleanup();
        reject(new BSVError('METADATA_ERROR', 'Failed to extract metadata'));
      };
    });
  }

  /**
   * Process video file for inscription
   */
  async processVideo(file: File): Promise<VideoProcessingResult> {
    // Verify format first
    await this.verifyFormat(file);
    
    // Extract metadata
    const metadata = await this.extractMetadata(file);

    // Read file as buffer
    const buffer = await file.arrayBuffer().then(arrayBuffer => Buffer.from(arrayBuffer));

    // Determine format
    let format: InscriptionContentType;
    switch (file.type) {
      case 'video/mp4':
        format = 'video/mp4';
        break;
      case 'video/webm':
        format = 'video/webm';
        break;
      case 'video/quicktime':
        format = 'video/quicktime';
        break;
      default:
        throw new BSVError('INVALID_FORMAT', 'Unsupported video format');
    }

    // Generate thumbnail (optional)
    let thumbnail: string | undefined;
    try {
      thumbnail = await this.generateThumbnail(file);
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
      // Continue without thumbnail
    }

    return {
      metadata,
      buffer,
      format,
      thumbnail
    };
  }

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = this.createVideoElement();
      const url = URL.createObjectURL(file);
      video.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
      };

      video.onloadeddata = () => {
        // Seek to the middle of the video
        video.currentTime = video.duration / 2;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          cleanup();
          resolve(thumbnailUrl);
        } catch (error) {
          cleanup();
          reject(new BSVError('THUMBNAIL_ERROR', 'Failed to generate thumbnail'));
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new BSVError('THUMBNAIL_ERROR', 'Failed to generate thumbnail'));
      };
    });
  }

  /**
   * Clean up resources
   */
  cleanup(urls: string[]): void {
    urls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }
} 