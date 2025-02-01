import { modelScalingService } from '../services/modelScaling.service';

class ScalingWorker {
  private readonly interval = 300000; // 5 minutes

  start() {
    setInterval(async () => {
      try {
        await modelScalingService.autoScale();
      } catch (error) {
        console.error('Auto-scaling failed:', error);
      }
    }, this.interval);
  }
}

export const scalingWorker = new ScalingWorker(); 