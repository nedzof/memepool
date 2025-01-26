import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/meme';

class StorageService {
  private baseUrl = '/api';
  // Temporary mock data with data URLs for testing
  private mockVideos: MemeVideoMetadata[] = [
    {
      id: 'video1',
      title: 'Funny Cat Meme',
      description: 'A hilarious cat video',
      videoUrl: 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=',
      inscriptionId: 'insc1',
      blockHeight: 123456,
      createdAt: new Date().toISOString()
    },
    {
      id: 'video2',
      title: 'Dancing Dog',
      description: 'Dog dancing to music',
      videoUrl: 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=',
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
    const newVideo = {
      id: `video${this.mockVideos.length + 1}`,
      ...metadata,
      videoUrl: 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=' // Use a test WebM data URL
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
    // For testing, return a mock data URL
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=';
  }
}

export const storageService = new StorageService();
export default storageService; 