import express from 'express';
import cors from 'cors';
import memegenService from './services/memegen.service.js';
import { createMetadata, getMetadata } from './services/aerospikeService.js';

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow both Vite dev server and production server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

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

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 