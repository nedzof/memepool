import axios from 'axios';
import { createMetadata, getMetadata } from './aerospikeService';
import memegenService from './memegen.service';
import { BlockStateService } from './blockState.service';
import { CacheService } from './cache.service';

interface BlockMeme {
  blockHeight: number;
  memeUrl: string;
  templateId: string;
  generatedAt: Date;
}

export class BlockMemeService {
  private readonly MEME_PREFIX = 'block_meme_';
  private readonly BUFFER_BLOCKS = 50;
  private blockStateService: BlockStateService;
  private cacheService: CacheService;

  constructor() {
    this.blockStateService = BlockStateService.getInstance();
    this.cacheService = CacheService.getInstance();
    this.initializeBlockMemes();
    this.setupBlockHeightListener();
  }

  private setupBlockHeightListener() {
    this.blockStateService.onBlockHeightChanged(async (newHeight: number) => {
      await this.ensureBlockMemes(newHeight);
    });
  }

  private async initializeBlockMemes() {
    try {
      const currentHeight = this.blockStateService.getCurrentBlockHeight();
      await this.ensureBlockMemes(currentHeight);
    } catch (error) {
      console.error('Failed to initialize block memes:', error);
    }
  }

  private async generateMemeForBlock(blockHeight: number): Promise<BlockMeme> {
    try {
      // Check if meme already exists
      const existingMeme = await getMetadata(`${this.MEME_PREFIX}${blockHeight}`);
      if (existingMeme) {
        return existingMeme;
      }

      // Get a random meme template
      const templates = await memegenService.getTemplates();
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      
      // Generate meme text based on block height
      const topText = `Block`;
      const bottomText = `#${blockHeight}`;
      
      // Generate meme URL
      const memeUrl = await memegenService.getMemeWithText(
        randomTemplate.id,
        topText,
        bottomText
      );

      const blockMeme: BlockMeme = {
        blockHeight,
        memeUrl,
        templateId: randomTemplate.id,
        generatedAt: new Date()
      };

      // Store in Aerospike
      await createMetadata(`${this.MEME_PREFIX}${blockHeight}`, blockMeme);
      
      return blockMeme;
    } catch (error) {
      console.error(`Failed to generate meme for block ${blockHeight}:`, error);
      throw error;
    }
  }

  private async ensureBlockMemes(currentHeight: number) {
    try {
      const targetHeight = currentHeight + this.BUFFER_BLOCKS;
      
      // Generate memes for all blocks up to target height if they don't exist
      for (let height = currentHeight; height <= targetHeight; height++) {
        const existingMeme = await getMetadata(`${this.MEME_PREFIX}${height}`);
        if (!existingMeme) {
          await this.generateMemeForBlock(height);
        }
      }
    } catch (error) {
      console.error('Failed to ensure block memes:', error);
      throw error;
    }
  }

  async getMemeForBlock(blockHeight: number): Promise<BlockMeme> {
    try {
      // Try to get existing meme
      const existingMeme = await getMetadata(`${this.MEME_PREFIX}${blockHeight}`);
      if (existingMeme) {
        return existingMeme;
      }

      // If meme doesn't exist, generate it
      return await this.generateMemeForBlock(blockHeight);
    } catch (error) {
      console.error(`Failed to get meme for block ${blockHeight}:`, error);
      throw error;
    }
  }

  async getUpcomingMemes(count: number = 3): Promise<BlockMeme[]> {
    const currentHeight = this.blockStateService.getCurrentBlockHeight();
    const memes: BlockMeme[] = [];
    
    // Get next 'count' blocks in descending order
    for (let i = count; i > 0; i--) {
      const blockHeight = currentHeight + i;
      const meme = await this.getMemeForBlock(blockHeight);
      memes.push(meme);
    }
    
    return memes;
  }

  async getPastMemes(count: number = 3): Promise<BlockMeme[]> {
    const currentHeight = this.blockStateService.getCurrentBlockHeight();
    const memes: BlockMeme[] = [];
    
    // Get previous 'count' blocks in descending order
    for (let i = 1; i <= count; i++) {
      const blockHeight = currentHeight - i;
      if (blockHeight >= 0) {
        const meme = await this.getMemeForBlock(blockHeight);
        memes.push(meme);
      }
    }
    
    return memes;
  }

  async getCurrentMeme(): Promise<BlockMeme> {
    if (!this.blockStateService.isInitialized()) {
      throw new Error('Block state service not initialized');
    }
    
    const currentHeight = this.blockStateService.getCurrentBlockHeight();
    if (currentHeight <= 0) {
      throw new Error('Invalid block height');
    }

    // Add cache check
    const cachedMeme = await this.cacheService.get(`meme-${currentHeight}`);
    if (cachedMeme) {
      return cachedMeme;
    }

    // If meme doesn't exist, generate it
    return await this.generateMemeForBlock(currentHeight);
  }

  async shiftBlocks(): Promise<void> {
    await this.blockStateService.shiftToNextBlock();
    await this.updateBlockMemes();
  }

  async updateBlockMemes(): Promise<void> {
    const currentHeight = this.blockStateService.getCurrentBlockHeight();
    await this.ensureBlockMemes(currentHeight);
  }
} 