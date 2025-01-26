import { MemeVideoMetadata } from '../../shared/types/meme';

class StorageService {
  // Temporary mock data
  private mockVideos: MemeVideoMetadata[] = [
    {
      id: 'video1',
      title: 'Funny Cat Meme',
      description: 'A hilarious cat video',
      videoUrl: '/assets/videos/sample1.mp4',
      inscriptionId: 'insc1',
      blockHeight: 123456,
      createdAt: new Date().toISOString()
    },
    {
      id: 'video2',
      title: 'Dancing Dog',
      description: 'Dog dancing to music',
      videoUrl: '/assets/videos/sample2.mp4',
      inscriptionId: 'insc2',
      blockHeight: 123457,
      createdAt: new Date().toISOString()
    }
  ];

  async getMemeVideos(page: number, limit: number): Promise<MemeVideoMetadata[]> {
    // Simulate API delay
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
      ...metadata
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