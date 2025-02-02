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

  async getTaskStatus(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const status = await videoProcessingService.getJobStatus(taskId);
      res.json(status);
    } catch (error) {
      console.error('Task status check error:', error);
      res.status(500).json({ error: 'Failed to get task status' });
    }
  }

  async getQueueMetrics(req: Request, res: Response) {
    try {
      const metrics = await videoProcessingService.getQueueMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Queue metrics error:', error);
      res.status(500).json({ error: 'Failed to get queue metrics' });
    }
  }
}

export default new AIVideoController(); 