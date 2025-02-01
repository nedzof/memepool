import { AerospikeService } from './aerospikeService';
import { config } from '../../shared/config/constants';

interface Task {
  id: string;
  type: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  retries: number;
}

export class TaskQueueService {
  private aerospike: AerospikeService;
  private readonly namespace = config.AEROSPIKE_NAMESPACE;
  private readonly taskSet = 'video_tasks';
  private readonly maxRetries = 3;
  private readonly visibilityTimeout = 30000; // 30 seconds

  constructor() {
    this.aerospike = new AerospikeService();
  }

  async enqueue(taskType: string, payload: any): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: Task = {
      id: taskId,
      type: taskType,
      payload,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      retries: 0
    };

    await this.aerospike.createMetadata(`task_${taskId}`, task);
    return taskId;
  }

  async getNextTask(): Promise<Task | null> {
    const query = this.aerospike.client.query(this.namespace, this.taskSet);
    const tasks = await query.where('status', 'pending').limit(1).execute();
    
    if (tasks.length > 0) {
      const task = tasks[0] as Task;
      await this.aerospike.updateMetadata(`task_${task.id}`, {
        status: 'processing',
        updatedAt: new Date()
      });
      return task;
    }
    return null;
  }

  async completeTask(taskId: string, result: any): Promise<void> {
    await this.aerospike.updateMetadata(`task_${taskId}`, {
      status: 'completed',
      payload: result,
      updatedAt: new Date()
    });
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const task = await this.aerospike.getMetadata(`task_${taskId}`) as Task;
    const retries = task.retries + 1;
    
    await this.aerospike.updateMetadata(`task_${taskId}`, {
      status: retries >= this.maxRetries ? 'failed' : 'pending',
      retries,
      updatedAt: new Date(),
      error
    });
  }

  async getQueueMetrics() {
    const counts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    const scan = this.aerospike.client.scan(this.namespace, this.taskSet);
    const stream = scan.foreach();

    return new Promise((resolve, reject) => {
      stream.on('data', (record) => {
        const status = record.bins.status;
        if (counts.hasOwnProperty(status)) {
          counts[status]++;
        }
      });

      stream.on('error', (error) => reject(error));
      stream.on('end', () => resolve(counts));
    });
  }
}

export const taskQueueService = new TaskQueueService(); 