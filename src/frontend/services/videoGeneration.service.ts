import axios from 'axios';

interface VideoGenerationOptions {
  image: string | File;  // base64 encoded image or File object
  name: string;
  fps?: number;
  numFrames?: number;
  motionScale?: number;
}

class VideoGenerationService {
  private readonly API_URL = '/api/video/generate';

  async generateVideo(options: VideoGenerationOptions): Promise<string> {
    try {
      const formData = new FormData();
      
      // Handle image input
      if (options.image instanceof File) {
        formData.append('image', options.image);
      } else {
        // Convert base64 to blob
        const byteString = atob(options.image);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/png' });
        formData.append('image', blob);
      }
      
      // Add other parameters
      formData.append('name', options.name);
      formData.append('fps', String(options.fps || 6));
      formData.append('frames', String(options.numFrames || 14));
      formData.append('motion', String(options.motionScale || 0.5));

      const response = await axios.post(this.API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
        // Add timeout and better error handling
        timeout: 30000,
        validateStatus: (status) => status === 200
      });

      // Convert blob to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read video data'));
        reader.readAsDataURL(response.data);
      });
    } catch (error) {
      console.error('Error generating video:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 500) {
          throw new Error('Server error: Failed to generate video. Please try again.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout: Video generation took too long.');
        }
      }
      throw new Error('Failed to generate video. Please try again.');
    }
  }
}

export const videoGenerationService = new VideoGenerationService(); 