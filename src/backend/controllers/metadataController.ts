import { Request, Response } from 'express';
import { createMetadata, getMetadata, updateMetadata, deleteMetadata } from '../services/aerospikeService';
import { MemeVideoMetadata } from '../../shared/types/metadata';

export const createMemeVideoMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const metadata: MemeVideoMetadata = req.body;
    await createMetadata(metadata.id, metadata);
    res.status(201).json({ message: 'Meme video metadata created successfully' });
  } catch (error) {
    console.error('Failed to create meme video metadata:', error);
    res.status(500).json({ error: 'Failed to create meme video metadata' });
  }
};

export const getMemeVideoMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const metadata = await getMetadata(id);
    if (metadata) {
      res.status(200).json(metadata);
    } else {
      res.status(404).json({ error: 'Meme video metadata not found' });
    }
  } catch (error) {
    console.error('Failed to get meme video metadata:', error);
    res.status(500).json({ error: 'Failed to get meme video metadata' });
  }
};

export const updateMemeVideoMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const metadata: MemeVideoMetadata = req.body;
    await updateMetadata(id, metadata);
    res.status(200).json({ message: 'Meme video metadata updated successfully' });
  } catch (error) {
    console.error('Failed to update meme video metadata:', error);
    res.status(500).json({ error: 'Failed to update meme video metadata' });
  }
};

export const deleteMemeVideoMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteMetadata(id);
    res.status(200).json({ message: 'Meme video metadata deleted successfully' });
  } catch (error) {
    console.error('Failed to delete meme video metadata:', error);
    res.status(500).json({ error: 'Failed to delete meme video metadata' });
  }
}; 