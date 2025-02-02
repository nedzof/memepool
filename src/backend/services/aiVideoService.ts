import axios from 'axios';
import { config } from '../../shared/config/constants';
import { modelVersioningService } from './modelVersioning.service';
import { lightweightModel } from './lightweightModel.service';
import { grpcClient } from './grpcClient';

class AIVideoService {
  private readonly BASE_URL = config.AI_VIDEO_SERVICE_URL;
  
  async generateVideo(options: {
    image: string;
    config: {
      fps: number;
      frames: number;
      motion: number;
    }
  }): Promise<{ videoUrl: string; metadata: any }> {
    // Add validation
    if (!options.image.match(/^data:image\/(png|jpeg);base64,/)) {
      throw new Error('Invalid image format - must be base64 PNG/JPEG');
    }

    if (options.config.fps < 3 || options.config.fps > 30) {
      throw new Error('FPS must be between 3-30');
    }

    try {
      // Try local model first
      const localResult = await this.generateWithLocalModel(options);
      return localResult;
    } catch (localError) {
      console.error('Local model failed, falling back to cloud:', localError);
      
      try {
        const cloudResult = await this.generateWithCloudService(options);
        return {
          ...cloudResult,
          metadata: {
            ...cloudResult.metadata,
            fallbackUsed: true
          }
        };
      } catch (cloudError) {
        console.error('All video generation methods failed');
        throw new Error('Video generation failed on all backends');
      }
    }
  }

  private async generateWithLocalModel(options: any) {
    const activeModel = await modelVersioningService.getActiveVersion();
    if (!activeModel) throw new Error('No active local model');

    const request = {
      image: Buffer.from(options.image.split(',')[1], 'base64'),
      fps: options.config.fps,
      frames: options.config.frames,
      motion: options.config.motion
    };

    const response = await grpcClient.generateVideo(request);

    return {
      videoUrl: await this.storeVideo(response.video),
      metadata: {
        ...response.metadata,
        modelVersion: activeModel.id
      }
    };
  }

  private async storeVideo(buffer: Buffer): Promise<string> {
    // Implementation to store video in S3/IPFS/local storage
    // Return URL
  }

  private async generateWithCloudService(options: any) {
    const response = await axios.post(`${this.BASE_URL}/generate`, {
      source_image: options.image,
      parameters: options.config
    });

    return {
      videoUrl: response.data.output.url,
      metadata: response.data.metadata
    };
  }
}

export const aiVideoService = new AIVideoService(); 