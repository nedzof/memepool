import { Meme, CreateMemeInput, ListMemesInput, ListMemesOutput } from '../models/meme.model';
import { BSVService } from './bsv.service';
import { StorageService } from './storage.service';

export class MemeService {
  private bsvService: BSVService;
  private storageService: StorageService;

  constructor() {
    this.bsvService = new BSVService();
    this.storageService = new StorageService();
  }

  async createMeme(input: CreateMemeInput): Promise<Meme> {
    try {
      // Upload file to storage
      const fileUrl = await this.storageService.uploadFile(input.file);

      // Calculate fee based on current threshold
      const threshold = await this.bsvService.getCurrentThreshold();
      const fee = this.bsvService.calculateLockDifficulty(threshold);

      // Lock BSV to blockchain
      const tx = await this.bsvService.lockBSV(input.creator, fee);

      // Create meme record
      const meme: Meme = {
        id: crypto.randomUUID(),
        creator: input.creator,
        title: input.title,
        description: input.description,
        fileUrl,
        txId: tx.id,
        locks: 0,
        status: 'pending',
        tags: input.tags,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store meme data
      await this.storageService.storeMeme(meme);

      return meme;
    } catch (error) {
      throw new Error('Failed to create meme');
    }
  }

  async getMemeById(id: string): Promise<Meme | null> {
    try {
      return await this.storageService.getMeme(id);
    } catch (error) {
      throw new Error('Failed to get meme');
    }
  }

  async listMemes(input: ListMemesInput): Promise<ListMemesOutput> {
    try {
      const { memes, total } = await this.storageService.listMemes(input);
      const pages = Math.ceil(total / input.limit);

      return {
        memes,
        total,
        page: input.page,
        pages
      };
    } catch (error) {
      throw new Error('Failed to list memes');
    }
  }

  async updateMemeStatus(id: string, status: Meme['status']): Promise<void> {
    try {
      const meme = await this.getMemeById(id);
      if (!meme) {
        throw new Error('Meme not found');
      }

      meme.status = status;
      meme.updatedAt = new Date();

      await this.storageService.updateMeme(meme);
    } catch (error) {
      throw new Error('Failed to update meme status');
    }
  }
} 