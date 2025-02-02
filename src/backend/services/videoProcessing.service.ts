import { aiVideoService } from './aiVideoService';
import { taskQueueService } from './taskQueue.service';
import { getMetadata } from './aerospikeService';

interface QueueMetrics {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
}

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

  async getQueueMetrics(): Promise<QueueMetrics> {
    const tasks = await taskQueueService.getQueueMetrics() as QueueMetrics;
    return {
      total: tasks.total,
      pending: tasks.pending,
      completed: tasks.completed,
      failed: tasks.failed,
      averageProcessingTime: tasks.averageProcessingTime
    };
  }
}

export const videoProcessingService = new VideoProcessingService(); 