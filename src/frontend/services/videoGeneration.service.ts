import axios from 'axios';

interface VideoGenerationOptions {
  image: string;  // base64 encoded image
  fps?: number;
  numFrames?: number;
  motionScale?: number;
}

class VideoGenerationService {
  private readonly API_URL = '/api/video/generate';

  async generateVideo(options: VideoGenerationOptions): Promise<string> {
    try {
      const response = await axios.post(this.API_URL, options);
      return response.data.videoUrl;
    } catch (error) {
      console.error('Error generating video:', error);
      throw new Error('Failed to generate video');
    }
  }
}

export const videoGenerationService = new VideoGenerationService(); 