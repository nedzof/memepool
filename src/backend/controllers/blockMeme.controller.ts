import { Request, Response } from 'express';
import { BlockMemeService } from '../services/blockMeme.service';
import { BlockStateService } from '../services/blockState.service';

class BlockMemeController {
  private blockMemeService: BlockMemeService;
  private blockStateService: BlockStateService;

  constructor() {
    this.blockStateService = BlockStateService.getInstance();
    this.blockMemeService = new BlockMemeService(this.blockStateService);
  }

  async initialize() {
    await this.blockStateService.start();
  }

  async getCurrentBlockInfo(req: Request, res: Response) {
    try {
      const currentHeight = this.blockStateService.getCurrentBlockHeight();
      const currentMeme = await this.blockMemeService.getCurrentMeme();
      const upcomingMemes = await this.blockMemeService.getUpcomingMemes(3);
      const pastMemes = await this.blockMemeService.getPastMemes(3);

      res.json({
        currentHeight,
        currentMeme,
        upcomingMemes,
        pastMemes
      });
    } catch (error) {
      console.error('Error getting current block info:', error);
      res.status(500).json({ error: 'Failed to get current block info' });
    }
  }

  async getMemeForBlock(req: Request, res: Response) {
    try {
      const blockHeight = parseInt(req.params.blockHeight);
      
      if (isNaN(blockHeight)) {
        return res.status(400).json({ error: 'Invalid block height' });
      }

      const meme = await this.blockMemeService.getMemeForBlock(blockHeight);
      res.json(meme);
    } catch (error) {
      console.error('Error getting meme for block:', error);
      res.status(500).json({ error: 'Failed to get meme for block' });
    }
  }

  async getUpcomingMemes(req: Request, res: Response) {
    try {
      const count = parseInt(req.query.count as string) || 3;
      const memes = await this.blockMemeService.getUpcomingMemes(count);
      res.json(memes);
    } catch (error) {
      console.error('Error getting upcoming memes:', error);
      res.status(500).json({ error: 'Failed to get upcoming memes' });
    }
  }

  async getPastMemes(req: Request, res: Response) {
    try {
      const count = parseInt(req.query.count as string) || 3;
      const memes = await this.blockMemeService.getPastMemes(count);
      res.json(memes);
    } catch (error) {
      console.error('Error getting past memes:', error);
      res.status(500).json({ error: 'Failed to get past memes' });
    }
  }

  async shiftBlocks(req: Request, res: Response) {
    try {
      await this.blockMemeService.shiftBlocks();
      const currentHeight = this.blockStateService.getCurrentBlockHeight();
      const currentMeme = await this.blockMemeService.getCurrentMeme();
      const upcomingMemes = await this.blockMemeService.getUpcomingMemes(3);
      const pastMemes = await this.blockMemeService.getPastMemes(3);

      res.json({
        currentHeight,
        currentMeme,
        upcomingMemes,
        pastMemes
      });
    } catch (error) {
      console.error('Error shifting blocks:', error);
      res.status(500).json({ error: 'Failed to shift blocks' });
    }
  }

  async updateBlockMemes(req: Request, res: Response) {
    try {
      await this.blockMemeService.updateBlockMemes();
      res.json({ message: 'Block memes updated successfully' });
    } catch (error) {
      console.error('Error updating block memes:', error);
      res.status(500).json({ error: 'Failed to update block memes' });
    }
  }
}

const controller = new BlockMemeController();
controller.initialize();
export default controller; 