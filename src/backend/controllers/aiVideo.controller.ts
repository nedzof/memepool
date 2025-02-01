import { Request, Response } from 'express';
import { videoProcessingService } from '../services/videoProcessing.service';

class AIVideoController {
  async generateVideo(req: Request, res: Response) {
    try {
      const { prompt } = req.body;
      const jobId = await videoProcessingService.submitJob(prompt);
      res.json({ jobId, status: 'processing' });
    } catch (error) {
      console.error('Video generation error:', error);
      res.status(500).json({ error: 'Failed to start video generation' });
    }
  }

  async getVideoStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const status = await videoProcessingService.getJobStatus(jobId);
      res.json(status);
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ error: 'Failed to get video status' });
    }
  }
}

export default new AIVideoController(); 