import { Request, Response } from 'express';
import { MemeService } from '../services/meme.service';
import { Meme } from '../models/meme.model';

export class MemeController {
  private memeService: MemeService;

  constructor() {
    this.memeService = new MemeService();
  }

  async createMeme(req: Request, res: Response) {
    try {
      const { file, title, description, tags } = req.body;
      const creator = req.user?.address;

      const meme = await this.memeService.createMeme({
        creator,
        title,
        description,
        tags,
        file
      });

      res.status(201).json(meme);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create meme' });
    }
  }

  async getMeme(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const meme = await this.memeService.getMemeById(id);

      if (!meme) {
        return res.status(404).json({ error: 'Meme not found' });
      }

      res.json(meme);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get meme' });
    }
  }

  async listMemes(req: Request, res: Response) {
    try {
      const { status, creator, page = 1, limit = 10 } = req.query;
      const memes = await this.memeService.listMemes({
        status: status as string,
        creator: creator as string,
        page: Number(page),
        limit: Number(limit)
      });

      res.json(memes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list memes' });
    }
  }
} 