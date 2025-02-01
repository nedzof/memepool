import { Router } from 'express';
import aiVideoController from '../controllers/aiVideo.controller';

const router = Router();

router.post('/generate', aiVideoController.generateVideo);
router.get('/status/:jobId', aiVideoController.getVideoStatus);
router.get('/tasks/:taskId', aiVideoController.getTaskStatus);
router.get('/metrics', aiVideoController.getQueueMetrics);

export default router; 