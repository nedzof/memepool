import { aiVideoService } from './aiVideoService';
import { taskQueueService } from './taskQueue.service';
import { getMetadata } from './aerospikeService';

class VideoProcessingService {
  async submitJob(prompt: string) {
    const jobId = await taskQueueService.enqueue('video_generation', {
      prompt,
      status: 'pending'
    });
    return jobId;
  }

  async getJobStatus(jobId: string) {
    const task = await getMetadata(`task_${jobId}`);
    if (!task) {
      throw new Error('Job not found');
    }
    return {
      jobId: task.id,
      status: task.status,
      result: task.status === 'completed' ? task.payload : null
    };
  }
}

export const videoProcessingService = new VideoProcessingService(); 