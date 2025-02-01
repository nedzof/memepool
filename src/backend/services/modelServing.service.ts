import { spawn } from 'child_process';
import { config } from '../../shared/config/constants';
import fs from 'fs';

class ModelServingService {
  private modelProcess: ReturnType<typeof spawn> | null = null;
  private readonly modelPath = config.MODEL_SERVING_PATH;

  async start() {
    console.log('Starting model server...');
    
    // Check for required model files
    if (!fs.existsSync('./models')) {
      throw new Error('Models directory not found');
    }

    // Check GPU availability
    const hasGPU = await this.checkGPUAvailability();
    console.log(`GPU ${hasGPU ? 'available' : 'not available'}`);

    // Start server process with logging
    this.modelProcess = spawn('python', [
      '-m', 'uvicorn',
      '--host', '0.0.0.0',
      '--port', '8000',
      'model_server:app'
    ], {
      cwd: this.modelPath,
      stdio: 'pipe'
    });

    this.modelProcess.stdout.on('data', (data) => {
      console.log(`[Model Server] ${data}`);
    });

    this.modelProcess.stderr.on('data', (data) => {
      console.error(`[Model Server Error] ${data}`);
    });

    // Wait for server readiness
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => 
        reject(new Error('Model server startup timeout')), 30000);
      
      this.modelProcess.stdout.on('data', (data) => {
        if (data.includes('Server ready')) {
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });
  }

  stopModelServer() {
    if (this.modelProcess) {
      this.modelProcess.kill();
    }
  }

  private async checkGPUAvailability(): Promise<boolean> {
    // Implementation of checkGPUAvailability method
    return false; // Placeholder return, actual implementation needed
  }
}

export const modelServingService = new ModelServingService(); 