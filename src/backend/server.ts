import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import memegenService from './services/memegen.service.js';
import { createMetadata, getMetadata } from './services/aerospikeService.js';
import inscriptionsRouter from './routes/inscriptions';
import blockMemeRoutes from './routes/blockMeme.routes';
import axios from 'axios';
import faucetRouter from './routes/faucet';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const COMFY_API_URL = 'http://127.0.0.1:8188';

// Block Meme Routes
app.use('/api/block-memes', blockMemeRoutes);

// Meme API Routes
app.get('/api/memes/templates', async (req, res) => {
  try {
    const templates = await memegenService.getTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch meme templates' });
  }
});

app.get('/api/memes/random', async (req, res) => {
  try {
    const width = req.query.width ? parseInt(req.query.width as string) : 300;
    const meme = await memegenService.getRandomMeme(width);
    res.json(meme);
  } catch (error) {
    console.error('Error getting random meme:', error);
    res.status(500).json({ error: 'Failed to get random meme' });
  }
});

app.get('/api/memes/generate', async (req, res) => {
  try {
    const { templateId, topText, bottomText, width } = req.query;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const memeUrl = await memegenService.getMemeWithText(
      templateId as string,
      topText as string,
      bottomText as string,
      width ? parseInt(width as string) : undefined
    );

    // Cache the generated meme URL
    const cacheKey = `meme_${templateId}_${topText}_${bottomText}`;
    await createMetadata(cacheKey, { url: memeUrl });

    res.json({ url: memeUrl });
  } catch (error) {
    console.error('Error generating meme with text:', error);
    res.status(500).json({ error: 'Failed to generate meme' });
  }
});

app.get('/api/memes/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchResults = await memegenService.searchTemplates(query as string);
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({ error: 'Failed to search templates' });
  }
});

// Proxy routes for ComfyUI
app.post('/api/comfy/prompt', async (req, res) => {
  try {
    const response = await axios.post(`${COMFY_API_URL}/prompt`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying prompt request:', error);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
});

app.get('/api/comfy/history/:promptId', async (req, res) => {
  try {
    const response = await axios.get(`${COMFY_API_URL}/history/${req.params.promptId}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying history request:', error);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
});

app.get('/api/comfy/prompt_progress', async (req, res) => {
  try {
    const response = await axios.get(`${COMFY_API_URL}/prompt_progress`);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying progress request:', error);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
});

app.get('/api/comfy/view', async (req, res) => {
  try {
    const response = await axios.get(`${COMFY_API_URL}/view`, {
      params: req.query,
      responseType: 'stream'
    });
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying view request:', error);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
});

// Routes
app.use('/api/inscriptions', inscriptionsRouter);
app.use('/api/faucet', faucetRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 