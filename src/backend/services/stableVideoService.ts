import axios from 'axios';

interface VideoGenerationOptions {
  input_image: string; // base64 encoded image
  frames_per_second?: number; // 3-30 FPS
  num_frames?: number; // 14 or 25 frames
  motion_bucket_id?: number; // 1-255
  cond_aug?: number; // 0.0-1.0
}

class StableVideoService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.stability.ai/v2/generation/stable-video-diffusion';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Stability AI API key is required');
    }
    this.apiKey = apiKey;
  }

  async generateVideo(options: VideoGenerationOptions) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          input_image: options.input_image,
          frames_per_second: options.frames_per_second || 6,
          num_frames: options.num_frames || 14,
          motion_bucket_id: options.motion_bucket_id || 127,
          cond_aug: options.cond_aug || 0.5
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error generating video:', error);
      throw error;
    }
  }

  async generateVideoFromBase64(base64Image: string, options: Partial<VideoGenerationOptions> = {}) {
    return this.generateVideo({
      input_image: base64Image,
      ...options
    });
  }
}

export default StableVideoService; 