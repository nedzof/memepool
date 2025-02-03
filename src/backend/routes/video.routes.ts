import { Router, Request, Response } from 'express';
import multer, { Multer } from 'multer';
import { aiVideoService } from '../services/aiVideoService';

const router = Router();
const upload: Multer = multer();

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

interface VideoGenerateRequest extends Request {
  file?: MulterFile;
}

router.post('/generate', upload.single('image'), async (req: VideoGenerateRequest, res: Response): Promise<void> => {
  try {
    const { fps, frames, motion, name } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    // Convert image buffer to base64
    const base64Image = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;

    const result = await aiVideoService.generateVideo({
      image: base64Image,
      name,
      config: {
        fps: parseInt(fps) || 6,
        frames: parseInt(frames) || 14,
        motion: parseFloat(motion) || 0.5
      }
    });

    res.setHeader('Content-Type', 'video/mp4');
    // Convert base64 video to buffer
    const videoBuffer = Buffer.from(result.videoUrl.split(',')[1], 'base64');
    res.send(videoBuffer);
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate video' 
    });
  }
});

export default router; 