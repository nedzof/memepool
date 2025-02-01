import { modelVersioningService } from '../services/modelVersioning.service';

async function activateDefaultModel() {
  const defaultVersion = await modelVersioningService.registerVersion({
    name: 'AnimateDiff-Light-v1',
    path: './models/animatediff-light',
    isActive: true
  });
  
  await modelVersioningService.activateVersion(defaultVersion);
  console.log(`Activated model version: ${defaultVersion}`);
}

activateDefaultModel().catch(console.error); 