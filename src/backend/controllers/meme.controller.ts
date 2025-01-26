import { Request, Response } from 'express';
import { MemeService } from '../services/meme.service';
import { MemeVideoMetadata } from '../../shared/types/metadata';

const memeService = new MemeService();

export const createMeme = async (req: Request, res: Response) => {
  try {
    const memeData: MemeVideoMetadata = req.body;
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