import axios from 'axios';

interface VideoGenerationOptions {
  image: string;  // base64 encoded image
  fps?: number;
  numFrames?: number;
  motionScale?: number;
  onProgress?: (progress: number) => void;  // Progress callback
}

class VideoGenerationService {
  private readonly BACKEND_URL = 'http://localhost:4000';

  async generateVideo(options: VideoGenerationOptions): Promise<string> {
    const {
      image,
      fps = 4,  // 12 frames / 3 seconds = 4 fps
      numFrames = 12,  // Exactly 12 frames
      motionScale = 0.5,
      onProgress
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

      // Queue the prompt through our backend proxy
      const promptResponse = await axios.post(`${this.BACKEND_URL}/api/comfy/prompt`, { prompt: workflow });
      const promptId = promptResponse.data.prompt_id;

      // Poll for completion and progress
      let lastProgress = 0;
      while (true) {
        const [historyResponse, progressResponse] = await Promise.all([
          axios.get(`${this.BACKEND_URL}/api/comfy/history/${promptId}`),
          axios.get(`${this.BACKEND_URL}/api/comfy/prompt_progress`)
        ]);

        // Update progress
        if (progressResponse.data && onProgress) {
          const currentProgress = Math.round((progressResponse.data.value || 0) * 100);
          if (currentProgress !== lastProgress) {
            onProgress(currentProgress);
            lastProgress = currentProgress;
          }
        }

        // Check if generation is complete
        if (historyResponse.data[promptId]?.outputs) {
          const outputData = historyResponse.data[promptId].outputs["4"];
          if (outputData && outputData.video) {
            // Ensure we show 100% at the end
            if (onProgress) onProgress(100);
            return `${this.BACKEND_URL}/api/comfy/view?filename=${outputData.video[0]}`;
          }
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms
      }

      throw new Error('Video generation failed');
    } catch (error) {
      console.error('Error generating video:', error);
      throw new Error('Failed to generate video');
    }
  }
}

export const videoGenerationService = new VideoGenerationService(); 