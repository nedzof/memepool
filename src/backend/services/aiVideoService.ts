import axios from 'axios';
import { config } from '../../shared/config/constants';
import { modelVersioningService } from './modelVersioning.service';
import { lightweightModel } from './lightweightModel.service';
import { grpcClient } from './grpcClient';

class AIVideoService {
  private isModelLoading = true;
  private modelLoadingStartTime = Date.now();
  private readonly healthCheckUrl = 'http://localhost:8001/health';

  constructor() {
    // Check model status every 5 seconds
    setInterval(async () => {
      try {
        const response = await fetch(this.healthCheckUrl);
        if (response.ok) {
          const data = await response.json();
          this.isModelLoading = data.status === 'loading';
          if (!this.isModelLoading) {
            console.log('AI model is ready to handle requests');
          }
        }
      } catch (error) {
        console.error('Error checking model status:', error);
      }
    }, 5000);
  }

  private async checkModelStatus(): Promise<{ isLoading: boolean; elapsedMinutes: number }> {
    try {
      const response = await fetch(this.healthCheckUrl);
      if (response.ok) {
        const data = await response.json();
        return {
          isLoading: data.status === 'loading',
          elapsedMinutes: Math.floor((Date.now() - this.modelLoadingStartTime) / 60000)
        };
      }
      throw new Error('Health check failed');
    } catch (error) {
      console.error('Error checking model status:', error);
      return {
        isLoading: true,
        elapsedMinutes: Math.floor((Date.now() - this.modelLoadingStartTime) / 60000)
      };
    }
  }

  async generateVideo(options: {
    image: string;
    name: string;
    config: {
      fps: number;
      frames: number;
      motion: number;
    }
  }): Promise<{ videoUrl: string; metadata: any }> {
    // Add validation
    if (!options.image.match(/^data:image\/(png|jpeg|gif);base64,/)) {
      throw new Error('Invalid image format - must be base64 PNG/JPEG/GIF');
    }

    if (options.config.fps < 4 || options.config.fps > 30) {
      throw new Error('FPS must be between 4-30');
    }

    if (options.config.frames < 12 || options.config.frames > 50) {
      throw new Error('Frames must be between 12-50');
    }

    if (options.config.motion < 0 || options.config.motion > 1) {
      throw new Error('Motion scale must be between 0-1');
    }

    // Check model status before proceeding
    const { isLoading, elapsedMinutes } = await this.checkModelStatus();
    if (isLoading) {
      throw new Error(
        `The AI model is still loading (${elapsedMinutes} minutes elapsed). ` +
        'The first startup takes about 10-15 minutes to download and load the model. ' +
        'Please try again in a few minutes.'
      );
    }

    try {
      return await this.generateWithLocalModel(options);
    } catch (error) {
      console.error('Video generation failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('UNAVAILABLE')) {
          throw new Error('Video generation service is not running. Please ensure the AI service is started.');
        }
        throw new Error(`Video generation failed: ${error.message}`);
      }
      throw new Error('Video generation failed unexpectedly');
    }
  }

  private async generateWithLocalModel(options: any) {
    try {
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(options.image.split(',')[1], 'base64');

      const request = {
        image: imageBuffer,
        fps: options.config.fps,
        frames: options.config.frames,
        motion: options.config.motion
      };

      // Try to connect to gRPC service
      const response = await grpcClient.generateVideo(request);
      if (!response || !response.video) {
        throw new Error('No video data received from generation service');
      }

      // Convert video buffer to base64
      const videoBase64 = `data:video/mp4;base64,${response.video.toString('base64')}`;

      return {
        videoUrl: videoBase64,
        metadata: {
          ...response.metadata,
          name: options.name,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Local model generation failed:', error);
      throw error;
    }
  }
}

export const aiVideoService = new AIVideoService(); 