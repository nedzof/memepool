import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/metadata';

class StorageService {
  private baseUrl = '/api';

  async getMemeVideos(page: number, limit: number): Promise<MemeVideoMetadata[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/memes`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch meme videos:', error);
      return [];
    }
  }

  async getMemeVideo(id: string): Promise<MemeVideoMetadata | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/memes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch meme video:', error);
      return null;
    }
  }

  async saveMemeVideo(metadata: Omit<MemeVideoMetadata, 'id'>): Promise<MemeVideoMetadata> {
    try {
      const response = await axios.post(`${this.baseUrl}/memes`, metadata);
      return response.data;
    } catch (error) {
      console.error('Failed to save meme video:', error);
      throw error;
    }
  }

  async updateMemeVideo(id: string, metadata: Partial<MemeVideoMetadata>): Promise<MemeVideoMetadata> {
    try {
      const response = await axios.patch(`${this.baseUrl}/memes/${id}`, metadata);
      return response.data;
    } catch (error) {
      console.error('Failed to update meme video:', error);
      throw error;
    }
  }

  async deleteMemeVideo(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/memes/${id}`);
    } catch (error) {
      console.error('Failed to delete meme video:', error);
      throw error;
    }
  }

  async uploadVideo(formData: FormData): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.url;
    } catch (error) {
      console.error('Failed to upload video:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
export default storageService; 