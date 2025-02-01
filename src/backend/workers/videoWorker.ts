import { taskQueueService } from '../services/taskQueue.service';
import { aiVideoService } from '../services/aiVideoService';

class VideoWorker {
  private readonly pollInterval = 5000;

  start() {
    setInterval(async () => {
      try {
        const task = await taskQueueService.getNextTask();
        if (task) {
          await this.processTask(task);
        }
      } catch (error) {
        console.error('Worker error:', error);
      }
    }, this.pollInterval);
  }

  private async processTask(task: Task) {
    try {
      const result = await aiVideoService.generateVideo(task.payload);
      await taskQueueService.completeTask(task.id, result);
    } catch (error) {
      await taskQueueService.failTask(task.id, error.message);
    }
  }
}

export const videoWorker = new VideoWorker(); 