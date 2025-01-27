import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/meme';

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
  txId?: string;
  creator?: string;
  timestamp?: Date;
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

  constructor() {
    // Initialize with a random high block number
    this.latestBlockHeight = 830000 + Math.floor(Math.random() * 1000);
    this.currentBlockNumber = this.latestBlockHeight;
    this.upcomingStartNumber = this.currentBlockNumber + 5;
    this.pastStartNumber = this.currentBlockNumber - 1;
  }

  // Get image for a specific block
  getImageForBlock(blockNumber: number): string {
    if (!blockImages.has(blockNumber)) {
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
    this.upcomingStartNumber = blockNumber + 5;
    this.pastStartNumber = blockNumber - 1;
  }

  // Get upcoming blocks
  async getUpcomingBlocks(): Promise<Block[]> {
    const count = this.getOptimalBlockCount();
    const blocks: Block[] = [];
    
    for (let i = 0; i < count; i++) {
      const blockNumber = this.upcomingStartNumber + i;
      blocks.push({
        id: `block-${blockNumber}`,
        imageUrl: this.getImageForBlock(blockNumber),
        blockNumber,
        txId: `tx-${blockNumber}`,
        creator: `creator-${blockNumber}`,
        timestamp: new Date(Date.now() + i * 60000),
      });
    }
    
    return blocks;
  }

  // Get past blocks with search and filters
  async getPastBlocks(): Promise<Block[]> {
    const count = this.submissionsPerPage;
    let blocks: Block[] = [];
    
    // Generate base blocks
    for (let i = 0; i < count; i++) {
      const blockNumber = this.pastStartNumber - i;
      blocks.push({
        id: `block-${blockNumber}`,
        imageUrl: this.getImageForBlock(blockNumber),
        blockNumber,
        txId: `tx-${blockNumber}`,
        creator: `creator-${blockNumber}`,
        timestamp: new Date(Date.now() - i * 60000),
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
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'oldest':
        return [...submissions].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'popular':
        return [...submissions].sort((a, b) => b.blockHeight - a.blockHeight);
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
        id: `block-${blockHeight}`, // Using block height as part of ID ensures uniqueness
        title: `Meme Block #${blockHeight}`,
        description: `A meme from block ${blockHeight}`,
        videoUrl: `https://placehold.co/400x400/222235/00ffa3?text=Block+${blockHeight}`,
        inscriptionId: `insc-${blockHeight}`,
        blockHeight,
        createdAt: new Date(Date.now() - (count - i) * 60000).toISOString()
      });
    }
    return videos;
  }

  async getMemeVideos(page: number, limit: number): Promise<MemeVideoMetadata[]> {
    // Return mock data for now
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockVideos = this.generateMockVideos(10); // Generate 10 mock videos
    const start = (page - 1) * limit;
    return mockVideos.slice(start, start + limit);
  }

  async getMemeVideo(id: string): Promise<MemeVideoMetadata | null> {
    const mockVideos = this.generateMockVideos(10);
    const video = mockVideos.find(v => v.id === id);
    return video || null;
  }

  async saveMemeVideo(metadata: Omit<MemeVideoMetadata, 'id'>): Promise<MemeVideoMetadata> {
    this.latestBlockHeight++;
    const newVideo = {
      id: `block-${this.latestBlockHeight}`,
      ...metadata,
      videoUrl: `https://placehold.co/400x400/222235/00ffa3?text=Block+${this.latestBlockHeight}`,
      blockHeight: this.latestBlockHeight,
      createdAt: new Date().toISOString()
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
}

export const storageService = new StorageService();
export default storageService; 