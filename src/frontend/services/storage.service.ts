import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/metadata';

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
  txId?: string;
  creator?: string;
  timestamp?: Date;
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

// Track images for each block
const blockImages = new Map<number, string>();

class StorageService {
  private baseUrl = '/api';
  private latestBlockHeight: number = 0;
  private currentBlockNumber: number = 0;
  private upcomingStartNumber: number = 0;
  private pastStartNumber: number = 0;
  private isLoadingPastSubmissions: boolean = false;
  private currentPage: number = 1;
  private submissionsPerPage: number = 12;
  private currentTimeRange: 'all' | '24h' | '7d' | '30d' = 'all';
  private currentFilter: 'latest' | 'oldest' | 'popular' = 'latest';
  private searchTxId: string = '';
  private searchCreator: string = '';
  private apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  constructor() {
    // Initialize with a random high block number
    this.latestBlockHeight = 830000 + Math.floor(Math.random() * 1000);
    this.currentBlockNumber = this.latestBlockHeight;
    this.upcomingStartNumber = this.currentBlockNumber + 5; // Start upcoming blocks 5 blocks ahead
    this.pastStartNumber = this.currentBlockNumber - 1; // Start past blocks from the previous block
  }

  // Get image for a specific block
  getImageForBlock(blockNumber: number): string {
    if (!blockImages.has(blockNumber)) {
      const imageIndex = (blockNumber % 10) + 1; // Use modulo to cycle through images
      blockImages.set(blockNumber, `https://picsum.photos/400/400?random=${blockNumber}`);
    }
    return blockImages.get(blockNumber)!;
  }

  // Get current block number
  getCurrentBlockNumber(): number {
    return this.currentBlockNumber;
  }

  // Update current block number
  setCurrentBlockNumber(blockNumber: number): void {
    this.currentBlockNumber = blockNumber;
    this.upcomingStartNumber = blockNumber + 5; // Keep upcoming blocks 5 ahead
    this.pastStartNumber = blockNumber - 1; // Keep past blocks right behind
  }

  // Get upcoming blocks
  async getUpcomingBlocks(): Promise<Block[]> {
    const count = this.getOptimalBlockCount();
    const blocks: Block[] = [];
    
    // Generate upcoming blocks starting from upcomingStartNumber
    for (let i = 0; i < count; i++) {
      const blockNumber = this.upcomingStartNumber + i;
      blocks.push({
        id: `block-${blockNumber}`,
        imageUrl: this.getImageForBlock(blockNumber),
        blockNumber,
        txId: `tx-${blockNumber}`,
        creator: `creator-${blockNumber}`,
        timestamp: new Date(Date.now() + i * 60000), // Future timestamps
      });
    }
    
    return blocks;
  }

  // Get past blocks with search and filters
  async getPastBlocks(): Promise<Block[]> {
    const count = this.submissionsPerPage;
    let blocks: Block[] = [];
    
    // Generate past blocks starting from pastStartNumber going backwards
    for (let i = 0; i < count; i++) {
      const blockNumber = this.pastStartNumber - i;
      blocks.push({
        id: `block-${blockNumber}`,
        imageUrl: this.getImageForBlock(blockNumber),
        blockNumber,
        txId: `tx-${blockNumber}`,
        creator: `creator-${blockNumber}`,
        timestamp: new Date(Date.now() - i * 60000), // Past timestamps
      });
    }

    // Apply search filters
    if (this.searchTxId || this.searchCreator) {
      blocks = blocks.filter(block => {
        const matchesTxId = !this.searchTxId || block.txId?.toLowerCase().includes(this.searchTxId.toLowerCase());
        const matchesCreator = !this.searchCreator || block.creator?.toLowerCase().includes(this.searchCreator.toLowerCase());
        return matchesTxId && matchesCreator;
      });
    }

    // Apply time range filter
    if (this.currentTimeRange !== 'all' && blocks[0]?.timestamp) {
      const now = new Date();
      const ranges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now.getTime() - ranges[this.currentTimeRange];
      blocks = blocks.filter(block => block.timestamp && block.timestamp.getTime() > cutoff);
    }

    // Apply sort filter
    switch (this.currentFilter) {
      case 'latest':
        blocks.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
        break;
      case 'oldest':
        blocks.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
        break;
      case 'popular':
        blocks.sort((a, b) => b.blockNumber - a.blockNumber);
        break;
    }
    
    return blocks;
  }

  // Load more upcoming blocks
  async loadMoreUpcomingBlocks(): Promise<void> {
    this.upcomingStartNumber += this.getOptimalBlockCount();
  }

  // Load more past blocks
  async loadMorePastBlocks(): Promise<void> {
    if (this.isLoadingPastSubmissions) return;
    this.isLoadingPastSubmissions = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      this.currentPage++;
      this.pastStartNumber -= this.submissionsPerPage;
    } finally {
      this.isLoadingPastSubmissions = false;
    }
  }

  // Reset past blocks loading
  resetPastBlocks(): void {
    this.currentPage = 1;
    this.pastStartNumber = this.currentBlockNumber - 1;
  }

  // Set search filters
  setSearchFilters(txId: string, creator: string): void {
    this.searchTxId = txId;
    this.searchCreator = creator;
    this.resetPastBlocks();
  }

  // Set time range filter
  setTimeRange(range: 'all' | '24h' | '7d' | '30d'): void {
    this.currentTimeRange = range;
    this.resetPastBlocks();
  }

  // Set sort filter
  setSortFilter(filter: 'latest' | 'oldest' | 'popular'): void {
    this.currentFilter = filter;
    this.resetPastBlocks();
  }

  // Get optimal block count based on screen width
  getOptimalBlockCount(): number {
    const width = window.innerWidth;
    if (width < 640) return 1; // Mobile
    if (width < 1024) return 2; // Tablet
    return 3; // Desktop
  }

  // Filter submissions by time range
  private filterSubmissionsByTimeRange(submissions: MemeVideoMetadata[]): MemeVideoMetadata[] {
    if (this.currentTimeRange === 'all') return submissions;

    const now = new Date();
    const ranges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now.getTime() - ranges[this.currentTimeRange];
    return submissions.filter(s => new Date(s.createdAt).getTime() > cutoff);
  }

  // Sort submissions
  private sortSubmissions(submissions: MemeVideoMetadata[]): MemeVideoMetadata[] {
    switch (this.currentFilter) {
      case 'latest':
        return [...submissions].sort((a, b) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        );
      case 'oldest':
        return [...submissions].sort((a, b) => 
          a.createdAt.getTime() - b.createdAt.getTime()
        );
      case 'popular':
        return [...submissions].sort((a, b) => b.locks - a.locks);
      default:
        return submissions;
    }
  }

  // Temporary mock data generator
  private generateMockVideos(count: number): MemeVideoMetadata[] {
    const videos: MemeVideoMetadata[] = [];
    for (let i = 0; i < count; i++) {
      const blockHeight = this.latestBlockHeight - (count - i);
      videos.push({
        id: `block-${blockHeight}`,
        creator: `creator-${blockHeight}`,
        title: `Meme Block #${blockHeight}`,
        description: `A meme from block ${blockHeight}`,
        prompt: `Generate meme for block ${blockHeight}`,
        style: 'viral',
        duration: 30,
        format: 'video/mp4',
        fileUrl: `https://placehold.co/400x400/222235/00ffa3?text=Block+${blockHeight}`,
        thumbnailUrl: `https://placehold.co/400x400/222235/00ffa3?text=Block+${blockHeight}`,
        txId: `tx-${blockHeight}`,
        locks: Math.floor(Math.random() * 100),
        status: 'minted',
        tags: ['meme', 'viral', `block-${blockHeight}`],
        views: Math.floor(Math.random() * 1000),
        likes: Math.floor(Math.random() * 100),
        dislikes: Math.floor(Math.random() * 20),
        shares: Math.floor(Math.random() * 50),
        createdAt: new Date(Date.now() - (count - i) * 60000),
        updatedAt: new Date(Date.now() - (count - i) * 60000),
      });
    }
    return videos;
  }

  async getMemeVideos(page: number, limit: number): Promise<MemeVideoMetadata[]> {
    try {
      const response = await fetch(`${this.apiUrl}/memes?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meme videos');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching meme videos:', error);
      return [];
    }
  }

  async getMemeVideo(id: string): Promise<MemeVideoMetadata | null> {
    const mockVideos = this.generateMockVideos(10);
    const video = mockVideos.find(v => v.id === id);
    return video || null;
  }

  async saveMemeVideo(metadata: Omit<MemeVideoMetadata, 'id'>): Promise<MemeVideoMetadata> {
    this.latestBlockHeight++;
    const newVideo: MemeVideoMetadata = {
      id: `block-${this.latestBlockHeight}`,
      ...metadata,
      fileUrl: `https://placehold.co/400x400/222235/00ffa3?text=Block+${this.latestBlockHeight}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newVideo;
  }

  async updateMemeVideo(id: string, metadata: Partial<MemeVideoMetadata>): Promise<MemeVideoMetadata | null> {
    const mockVideos = this.generateMockVideos(10);
    const index = mockVideos.findIndex(v => v.id === id);
    if (index === -1) return null;
    
    return {
      ...mockVideos[index],
      ...metadata
    };
  }

  async deleteMemeVideo(id: string): Promise<boolean> {
    return true; // Mock successful deletion
  }

  async uploadVideo(formData: FormData): Promise<string> {
    // For testing, return a mock image URL
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.latestBlockHeight++;
    return `https://placehold.co/400x400/222235/00ffa3?text=Block+${this.latestBlockHeight}`;
  }

  // Utility method to get latest block height
  async getLatestBlockHeight(): Promise<number> {
    try {
      // In production, we would fetch from WhatsOnChain API
      // const response = await axios.get('https://api.whatsonchain.com/v1/bsv/main/chain/info');
      // return response.data.blocks;
      
      // For now, return mock data
      return this.latestBlockHeight;
    } catch (error) {
      console.error('Failed to fetch latest block height:', error);
      return this.latestBlockHeight;
    }
  }

  async uploadMedia(mediaData: string): Promise<string> {
    try {
      // Convert base64 to blob
      const base64Response = await fetch(mediaData);
      const blob = await base64Response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('file', blob);

      // Upload to server
      const response = await fetch(`${this.apiUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload media');
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  async createPost(post: Post): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
export default storageService; 