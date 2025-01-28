import axios from 'axios';

interface VideoGenerationOptions {
  image: string;  // base64 encoded image
  fps?: number;
  numFrames?: number;
  motionScale?: number;
}

class VideoGenerationService {
  private readonly COMFY_API_URL = 'http://127.0.0.1:8188';

  async generateVideo(options: VideoGenerationOptions): Promise<string> {
    const {
      image,
      fps = 4,  // 12 frames / 3 seconds = 4 fps
      numFrames = 12,  // Exactly 12 frames
      motionScale = 0.5
    } = options;

    try {
      // Create workflow for video generation
      const workflow = {
        "3": {
          "inputs": {
            "image": image,
            "fps": fps,
            "num_frames": numFrames,
            "motion_bucket_id": 127,
            "cond_aug": motionScale,
            "video_length": 3.0  // Explicitly set to 3 seconds
          },
          "class_type": "SVD_img2vid"
        },
        "4": {
          "inputs": {
            "filename_prefix": "meme_video",
            "fps": fps,
            "video_format": "mp4",
            "save_output": true,
            "loop_count": 0  // Infinite loop
          },
          "class_type": "VHS_VideoCombine"
        }
      };

      // Queue the prompt
      const promptResponse = await axios.post(`${this.COMFY_API_URL}/prompt`, { prompt: workflow });
      const promptId = promptResponse.data.prompt_id;

      // Poll for completion
      while (true) {
        const historyResponse = await axios.get(`${this.COMFY_API_URL}/history/${promptId}`);
        if (historyResponse.data[promptId].outputs) {
          // Get the video output path
          const outputData = historyResponse.data[promptId].outputs["4"];
          if (outputData && outputData.video) {
            return `${this.COMFY_API_URL}/view?filename=${outputData.video[0]}`;
          }
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      throw new Error('Video generation failed');
    } catch (error) {
      console.error('Error generating video:', error);
      throw new Error('Failed to generate video');
    }
  }
}

export const videoGenerationService = new VideoGenerationService(); 