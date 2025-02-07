import { MemeVideoMetadata } from '../../shared/types/metadata';

interface Transaction {
  txid: string;
  amount: number;
  handle_id: string;
  note: string;
  locked_until: number;
  created_at: Date;
  totalAmountandLockLiked: number;
  totalAmountandLockLikedForReplies: number;
  locklikes: LockLike[];
  initialVibes: number;
  totalLockLikeVibes: number;
  totalVibes: number;
  mediaUrl?: string;
}

interface LockLike {
  txid: string;
  amount: number;
  locked_until: number;
  created_at: Date;
}

interface Post {
  content: string;
  mediaUrl?: string | null;
  lockUntilBlock: number;
  amount: number;
  initialVibes: number;
  timestamp: number;
  txid: string;
}

class StorageService {
  private apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  private currentBlockHeight: number = 0;
  private currentFilter: 'latest' | 'oldest' | 'popular' = 'latest';

  constructor() {
    this.fetchCurrentBlockHeight();
  }

  private async fetchCurrentBlockHeight(): Promise<void> {
    try {
      const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/chain/info');
      const data = await response.json();
      this.currentBlockHeight = data.blocks;
    } catch (error) {
      console.error('Failed to fetch block height:', error);
      this.currentBlockHeight = 830000; // Fallback value
    }
  }

  private calculateVibes(amount: number, lockPeriod: number): number {
    return (amount / 100000000) * Math.log(lockPeriod);
  }

  async getMemeVideos(page: number, limit: number): Promise<MemeVideoMetadata[]> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    // Generate mock transactions
    const mockTransactions = Array.from({ length: limit }, (_, i) => {
      const blockNumber = this.currentBlockHeight - ((page - 1) * limit + i);
      const amount = Math.random() * 1 + 0.1; // Random amount between 0.1 and 1.1 BSV
      const lockPeriod = Math.floor(Math.random() * 1000) + 144; // Random lock period > 1 day
      const locklikes = Array.from({ length: Math.floor(Math.random() * 5) }, () => ({
        txid: `tx-${Math.random().toString(36).substring(7)}`,
        amount: Math.random() * 0.5,
        locked_until: blockNumber + Math.floor(Math.random() * 500) + 144,
        created_at: new Date(Date.now() - Math.random() * 86400000)
      }));

      const initialVibes = this.calculateVibes(amount, lockPeriod);
      const totalLockLikeVibes = locklikes.reduce((sum, locklike) => {
        const locklikePeriod = locklike.locked_until - this.currentBlockHeight;
        return sum + this.calculateVibes(locklike.amount, locklikePeriod);
      }, 0);

      const totalLockLiked = locklikes.reduce((sum, locklike) => sum + locklike.amount, 0);
      const totalAmountandLockLiked = totalLockLiked + amount;

      return {
        id: `meme-${blockNumber}`,
        creator: `creator-${i + 1}`,
        title: `Meme #${blockNumber}`,
        description: `A placeholder meme ${blockNumber}`,
        prompt: `Generate meme ${blockNumber}`,
        style: 'viral',
        duration: 30,
        format: 'video/mp4',
        fileUrl: `https://placehold.co/600x400/1A1B23/00ffa3?text=Meme+${blockNumber}%0A${amount.toFixed(2)}+BSV`,
        thumbnailUrl: `https://placehold.co/600x400/1A1B23/00ffa3?text=Meme+${blockNumber}%0A${amount.toFixed(2)}+BSV`,
        txId: `tx-${blockNumber}`,
        locks: totalAmountandLockLiked,
        status: 'minted' as const,
        tags: ['meme', 'viral'],
        createdAt: new Date(Date.now() - ((page - 1) * limit + i) * 60000),
        updatedAt: new Date(Date.now() - ((page - 1) * limit + i) * 60000),
        initialVibes,
        totalLockLikeVibes,
        totalVibes: initialVibes + totalLockLikeVibes,
        locklikes
      };
    });

    // Sort by total vibes in descending order
    return mockTransactions.sort((a, b) => (b.totalVibes || 0) - (a.totalVibes || 0));
  }

  async createPost(post: Post): Promise<void> {
    try {
      // In a real implementation, this would create a transaction
      // For now, we'll just simulate the delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Calculate vibes
      const lockPeriod = post.lockUntilBlock - this.currentBlockHeight;
      const initialVibes = this.calculateVibes(post.amount, lockPeriod);

      console.log('Created post with vibes:', {
        ...post,
        initialVibes,
        currentBlockHeight: this.currentBlockHeight,
        lockPeriod
      });
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async uploadMedia(mediaData: string): Promise<string> {
    // Simulate media upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `https://placehold.co/600x400/1A1B23/00ffa3?text=Uploaded+Media`;
  }
}

export const storageService = new StorageService();
export default storageService; 