import axios from 'axios';
import { config } from '../../shared/config/constants';
import { modelVersioningService } from './modelVersioning.service';

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
    if (!activeModel) {
      throw new Error('No active local model');
    }

    const response = await axios.post(`http://localhost:8000/generate`, {
      source_image: options.image,
      parameters: options.config
    });

    return {
      videoUrl: response.data.output.url,
      metadata: {
        modelVersion: activeModel.id,
        localInference: true
      }
    };
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