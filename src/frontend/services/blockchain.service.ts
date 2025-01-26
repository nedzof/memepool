import axios from 'axios';

export class BlockchainService {
  private baseUrl = '/api/blockchain';

  async inscribeMeme(videoUrl: string): Promise<{ inscriptionId: string; blockHeight: number }> {
    try {
      const response = await axios.post(`${this.baseUrl}/inscribe`, { videoUrl });
      return response.data;
    } catch (error) {
      console.error('Failed to inscribe meme:', error);
      throw error;
    }
  }

  async getMemeInscription(inscriptionId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/inscription/${inscriptionId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get meme inscription:', error);
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService(); 