import type { Request, Response } from 'express';
import { MemeService } from '../services/meme.service';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import memegenService from '../services/memegen.service.js';
import { AerospikeService, createMetadata, getMetadata, updateMetadata } from '../services/aerospikeService.js';

interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  width?: number;
  height?: number;
  box_count?: number;
}

interface CreateMemeInput extends MemeVideoMetadata {
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
  templateId?: string;
  topText?: string;
  bottomText?: string;
}

const memeService = new MemeService();
const aerospikeService = new AerospikeService();

export const createMeme = async (req: Request, res: Response) => {
  try {
    const memeData: CreateMemeInput = {
      ...req.body,
      file: {
        buffer: Buffer.from(req.body.file || req.body.url, 'base64'),
        originalname: req.body.filename || 'meme.jpg',
        mimetype: req.body.mimetype || 'image/jpeg'
      }
    };
    const createdMeme = await memeService.createMeme(memeData);
    res.status(201).json(createdMeme);
  } catch (error) {
    console.error('Failed to create meme:', error);
    res.status(500).json({ error: 'Failed to create meme' });
  }
};

export const getMemes = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const memes = await memeService.getMemes(Number(page), Number(limit));
    res.json(memes);
  } catch (error) {
    console.error('Failed to retrieve memes:', error);
    res.status(500).json({ error: 'Failed to retrieve memes' });
  }
};

export const getMemeById = async (req: Request, res: Response) => {
  try {
    const memeId = req.params.id;
    const meme = await memeService.getMemeById(memeId);
    if (meme) {
      res.json(meme);
    } else {
      res.status(404).json({ error: 'Meme not found' });
    }
  } catch (error) {
    console.error('Failed to retrieve meme:', error);
    res.status(500).json({ error: 'Failed to retrieve meme' });
  }
};

export const getUserParticipation = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const participation = await memeService.getUserParticipation(userId);
    res.json(participation);
  } catch (error) {
    console.error('Failed to retrieve user participation:', error);
    res.status(500).json({ error: 'Failed to retrieve user participation' });
  }
};

export const getUserRewards = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const rewards = await memeService.getUserRewards(userId);
    res.json(rewards);
  } catch (error) {
    console.error('Failed to retrieve user rewards:', error);
    res.status(500).json({ error: 'Failed to retrieve user rewards' });
  }
};

class MemeController {
  private readonly CACHE_KEY = 'meme_templates';
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MIN_CACHED_TEMPLATES = 50;

  constructor() {
    this.initializeTemplateCache();
  }

  private async initializeTemplateCache() {
    try {
      const cachedTemplates = await getMetadata(this.CACHE_KEY) as MemeTemplate[] | null;
      if (!cachedTemplates || cachedTemplates.length < this.MIN_CACHED_TEMPLATES) {
        const templates = await memegenService.getTemplates();
        await createMetadata(this.CACHE_KEY, templates);
      }
    } catch (error) {
      console.error('Error initializing template cache:', error);
    }
  }

  async getTemplates(req: Request, res: Response) {
    try {
      let templates = await getMetadata(this.CACHE_KEY) as MemeTemplate[] | null;
      
      if (!templates || templates.length < this.MIN_CACHED_TEMPLATES) {
        templates = await memegenService.getTemplates();
        await createMetadata(this.CACHE_KEY, templates);
      }
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch meme templates' });
    }
  }

  async getRandomMeme(req: Request, res: Response) {
    try {
      const width = req.query.width ? parseInt(req.query.width as string) : 300;
      let templates = await getMetadata(this.CACHE_KEY) as MemeTemplate[] | null;
      
      if (!templates) {
        templates = await memegenService.getTemplates();
        await createMetadata(this.CACHE_KEY, templates);
      }
      
      const randomIndex = Math.floor(Math.random() * templates.length);
      const template = templates[randomIndex];
      const meme = {
        url: `${memegenService.baseUrl}/images/${template.id}.jpg?width=${width}`,
        id: template.id
      };
      
      res.json(meme);
    } catch (error) {
      console.error('Error getting random meme:', error);
      res.status(500).json({ error: 'Failed to get random meme' });
    }
  }

  async getMemeWithText(req: Request, res: Response) {
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
  }

  async searchTemplates(req: Request, res: Response) {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      let templates = await getMetadata(this.CACHE_KEY) as MemeTemplate[] | null;
      
      if (!templates) {
        templates = await memegenService.getTemplates();
        await createMetadata(this.CACHE_KEY, templates);
      }

      const searchResults = templates.filter((template: MemeTemplate) => 
        template.name.toLowerCase().includes((query as string).toLowerCase()) ||
        template.id.toLowerCase().includes((query as string).toLowerCase())
      );

      res.json(searchResults);
    } catch (error) {
      console.error('Error searching templates:', error);
      res.status(500).json({ error: 'Failed to search templates' });
    }
  }
}

export default new MemeController(); 