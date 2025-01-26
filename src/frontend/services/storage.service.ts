import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/meme';

class StorageService {
  private baseUrl = '/api';
  // Temporary mock data with static images for testing
  private mockVideos: MemeVideoMetadata[] = [
    {
      id: 'past-block-1',
      title: 'Funny Cat Meme',
      description: 'A hilarious cat video',
      videoUrl: 'https://placehold.co/400x400/222235/00ffa3?text=Block+123456',
      inscriptionId: 'insc1',
      blockHeight: 123456,
      createdAt: new Date().toISOString()
    },
    {
      id: 'past-block-2',
      title: 'Dancing Dog',
      description: 'Dog dancing to music',
      videoUrl: 'https://placehold.co/400x400/222235/00ffa3?text=Block+123457',
      inscriptionId: 'insc2',
      blockHeight: 123457,
      createdAt: new Date().toISOString()
    }
  ];

  async getMemeVideos(page: number, limit: number): Promise<MemeVideoMetadata[]> {
    // Return mock data for now
    await new Promise(resolve => setTimeout(resolve, 500));
    const start = (page - 1) * limit;
    return this.mockVideos.slice(start, start + limit);
  }

  async getMemeVideo(id: string): Promise<MemeVideoMetadata | null> {
    const video = this.mockVideos.find(v => v.id === id);
    return video || null;
  }

  async saveMemeVideo(metadata: Omit<MemeVideoMetadata, 'id'>): Promise<MemeVideoMetadata> {
    const blockHeight = metadata.blockHeight || Math.floor(Math.random() * 1000000);
    const newVideo = {
      id: `block-${this.mockVideos.length + 1}`,
      ...metadata,
      videoUrl: `https://placehold.co/400x400/222235/00ffa3?text=Block+${blockHeight}`,
      blockHeight
    };
    this.mockVideos.push(newVideo);
    return newVideo;
  }

  async updateMemeVideo(id: string, metadata: Partial<MemeVideoMetadata>): Promise<MemeVideoMetadata | null> {
    const index = this.mockVideos.findIndex(v => v.id === id);
    if (index === -1) return null;
    
    this.mockVideos[index] = {
      ...this.mockVideos[index],
      ...metadata
    };
    return this.mockVideos[index];
  }

  async deleteMemeVideo(id: string): Promise<boolean> {
    const index = this.mockVideos.findIndex(v => v.id === id);
    if (index === -1) return false;
    
    this.mockVideos.splice(index, 1);
    return true;
  }

  async uploadVideo(formData: FormData): Promise<string> {
    // For testing, return a mock image URL
    await new Promise(resolve => setTimeout(resolve, 1000));
    const blockHeight = Math.floor(Math.random() * 1000000);
    return `https://placehold.co/400x400/222235/00ffa3?text=Block+${blockHeight}`;
  }
}

export const storageService = new StorageService();
export default storageService; 