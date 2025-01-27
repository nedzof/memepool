import { Request, Response } from 'express';
import StableVideoService from '../services/stableVideoService';

class VideoController {
  private videoService: StableVideoService;

  constructor() {
    // The API key should be loaded from environment variables in production
    this.videoService = new StableVideoService(process.env.STABILITY_API_KEY || '');
  }

  generateVideo = async (req: Request, res: Response) => {
    try {
      const {
        image, // base64 encoded image
        framesPerSecond,
        numFrames,
        motionBucketId,
        condAug
      } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Image is required' });
      }

      const video = await this.videoService.generateVideoFromBase64(image, {
        frames_per_second: framesPerSecond,
        num_frames: numFrames,
        motion_bucket_id: motionBucketId,
        cond_aug: condAug
      });

      return res.json(video);
    } catch (error) {
      console.error('Error in video generation:', error);
      return res.status(500).json({ error: 'Failed to generate video' });
    }
  };
}

export default new VideoController(); 