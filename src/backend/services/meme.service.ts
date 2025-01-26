import { AerospikeService } from './aerospikeService';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import { BSVService } from './bsv.service';
import { StorageService } from './storage.service';

export interface CreateMemeInput {
  creator: string;
  title: string;
  description: string;
  prompt: string;
  style: string;
  duration: number;
  format: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
  tags: string[];
}

export interface UserParticipation {
  totalLocks: number;
  totalBSVLocked: number;
  successfulPredictions: number;
}

export interface UserRewards {
  totalEarned: number;
  pendingRewards: number;
  rewardHistory: {
    amount: number;
    timestamp: Date;
    memeId: string;
  }[];
}

export class MemeService {
  private bsvService: BSVService;
  private storageService: StorageService;
  private aerospikeService: AerospikeService;

  constructor() {
    this.bsvService = new BSVService();
    this.storageService = new StorageService();
    this.aerospikeService = new AerospikeService();
  }

  async createMeme(input: CreateMemeInput): Promise<MemeVideoMetadata> {
    try {
      // Upload file to storage
      const fileUrl = await this.storageService.uploadFile(input.file);
      const thumbnailUrl = await this.storageService.generateThumbnail(fileUrl);

      // Calculate fee based on current threshold
      const threshold = await this.bsvService.getCurrentThreshold();
      const fee = this.bsvService.calculateLockDifficulty(threshold);

      // Lock BSV to blockchain
      const tx = await this.bsvService.lockBSV(input.creator, fee);

      // Create meme record
      const meme: MemeVideoMetadata = {
        id: `meme_${Date.now()}`,
        creator: input.creator,
        title: input.title,
        description: input.description,
        prompt: input.prompt,
        style: input.style,
        duration: input.duration,
        format: input.format,
        fileUrl,
        thumbnailUrl,
        txId: tx.id,
        locks: 0,
        status: 'pending',
        tags: input.tags,
        views: 0,
        likes: 0,
        dislikes: 0,
        shares: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.aerospikeService.createMeme(meme);
      return meme;
    } catch (error) {
      throw new Error('Failed to create meme');
    }
  }

  async getMemes(page: number, limit: number): Promise<MemeVideoMetadata[]> {
    const skip = (page - 1) * limit;
    return this.aerospikeService.getMemes(skip, limit);
  }

  async getMemeById(id: string): Promise<MemeVideoMetadata | null> {
    return this.aerospikeService.getMemeById(id);
  }

  async getUserParticipation(userId: string): Promise<UserParticipation> {
    const participation = await this.aerospikeService.getUserParticipation(userId);
    return {
      totalLocks: participation.totalLocks || 0,
      totalBSVLocked: participation.totalBSVLocked || 0,
      successfulPredictions: participation.successfulPredictions || 0
    };
  }

  async getUserRewards(userId: string): Promise<UserRewards> {
    const rewards = await this.aerospikeService.getUserRewards(userId);
    return {
      totalEarned: rewards.totalEarned || 0,
      pendingRewards: rewards.pendingRewards || 0,
      rewardHistory: rewards.rewardHistory || []
    };
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