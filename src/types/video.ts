import { InscriptionContentType } from './inscription';

export interface VideoMetadata {
  duration: number;
  dimensions: {
    width: number;
    height: number;
  };
  codec: string;
  bitrate: number;
}

export interface VideoFile {
  buffer: Buffer;
  name: string;
  size: number;
  type: string;
}

export interface VideoFormatValidation {
  isValid: boolean;
  format: string;
}

export interface VideoProcessorOptions {
  maxDuration?: number;        // Maximum video duration in seconds
  maxSize?: number;           // Maximum file size in bytes
  supportedFormats?: string[]; // Supported video formats
}

export interface VideoProcessingResult {
  metadata: VideoMetadata;
  buffer: Buffer;             // Video data as buffer
  format: InscriptionContentType;
  thumbnail?: string;         // Optional base64 thumbnail
}

export interface VideoProcessor {
  verifyFormat(file: File): Promise<VideoFormatValidation>;
  extractMetadata(file: File): Promise<VideoMetadata>;
  processVideo(file: File): Promise<VideoProcessingResult>;
  generateThumbnail(file: File): Promise<string>;
  cleanup(urls: string[]): void;
} 