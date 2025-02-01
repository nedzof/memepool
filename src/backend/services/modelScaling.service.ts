import { AerospikeService } from './aerospikeService';
import { config } from '../../shared/config/constants';
import kubernetes from '../infra/kubernetes';

interface ScalingMetrics {
  gpuUtilization: number;
  memoryUsage: number;
  pendingTasks: number;
}

export class ModelScalingService {
  private readonly SCALE_UP_THRESHOLD = 75; // %
  private readonly SCALE_DOWN_THRESHOLD = 25; // %
  private readonly MAX_REPLICAS = 10;
  private readonly MIN_REPLICAS = 1;

  async autoScale() {
    const metrics = await this.getClusterMetrics();
    const currentReplicas = await kubernetes.getReplicaCount('video-model');
    
    if (metrics.gpuUtilization > this.SCALE_UP_THRESHOLD && 
        metrics.pendingTasks > currentReplicas * 2 &&
        currentReplicas < this.MAX_REPLICAS) {
      await kubernetes.scaleDeployment('video-model', currentReplicas + 1);
    }
    
    if (metrics.gpuUtilization < this.SCALE_DOWN_THRESHOLD &&
        currentReplicas > this.MIN_REPLICAS) {
      await kubernetes.scaleDeployment('video-model', currentReplicas - 1);
    }
  }

  private async getClusterMetrics(): Promise<ScalingMetrics> {
    const [gpu, memory, tasks] = await Promise.all([
      this.getGPUUtilization(),
      this.getMemoryUsage(),
      this.getPendingTasks()
    ]);

    return {
      gpuUtilization: gpu,
      memoryUsage: memory,
      pendingTasks: tasks
    };
  }

  private async getGPUUtilization(): Promise<number> {
    const stats = await kubernetes.getNodeMetrics();
    return stats.gpuUtilization;
  }

  private async getMemoryUsage(): Promise<number> {
    const stats = await kubernetes.getPodMemoryUsage('video-model');
    return stats.usagePercentage;
  }

  private async getPendingTasks(): Promise<number> {
    const counts = await taskQueueService.getQueueMetrics();
    return counts.pending + counts.processing;
  }
}

export const modelScalingService = new ModelScalingService(); 