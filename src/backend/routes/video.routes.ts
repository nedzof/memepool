import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import { aiVideoService } from '../services/aiVideoService';

const router = Router();
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

interface VideoRequestBody {
  fps?: string;
  frames?: string;
  motion?: string;
  name: string;
}

const generateVideo: RequestHandler = async (req, res) => {
  try {
    const { fps, frames, motion, name } = req.body as VideoRequestBody;
    const imageFile = req.file;

    if (!imageFile) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    // Validate file type
    if (!imageFile.mimetype.startsWith('image/')) {
      res.status(400).json({ error: 'Invalid file type. Please upload an image file.' });
      return;
    }

    // Convert image buffer to base64
    const base64Image = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;

    try {
      const result = await aiVideoService.generateVideo({
        image: base64Image,
        name,
        config: {
          fps: parseInt(fps || '6'),
          frames: parseInt(frames || '14'),
          motion: parseFloat(motion || '0.5')
        }
      });

      res.setHeader('Content-Type', 'video/mp4');
      // Convert base64 video to buffer
      const videoBuffer = Buffer.from(result.videoUrl.split(',')[1], 'base64');
      res.send(videoBuffer);
    } catch (error) {
      console.error('Error in AI video service:', error);
      if (error instanceof Error && error.message.includes('still loading')) {
        res.status(503).json({ 
          error: error.message,
          retryAfter: 60 // Suggest retry after 1 minute
        });
      } else {
        throw error; // Re-throw for general error handling
      }
    }
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate video' 
    });
  }
};

router.post('/generate', upload.single('image'), generateVideo);

export default router; 