import axios from 'axios';

interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  width?: number;
  height?: number;
  box_count?: number;
}

class MemegenService {
  public readonly baseUrl = 'https://api.memegen.link';

  async getTemplates(): Promise<MemeTemplate[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/templates`);
      return response.data;
    } catch (error) {
      console.error('Error fetching meme templates:', error);
      throw error;
    }
  }

  async getRandomMeme(width: number = 300): Promise<{ url: string; id: string }> {
    try {
      const templates = await this.getTemplates();
      const randomIndex = Math.floor(Math.random() * templates.length);
      const template = templates[randomIndex];

      return {
        url: `${this.baseUrl}/images/${template.id}.jpg?width=${width}`,
        id: template.id
      };
    } catch (error) {
      console.error('Error getting random meme:', error);
      throw error;
    }
  }

  async getMemeWithText(
    templateId: string,
    topText: string = '',
    bottomText: string = '',
    width: number = 300
  ): Promise<string> {
    try {
      // URL encode the text parameters
      const encodedTop = encodeURIComponent(topText);
      const encodedBottom = encodeURIComponent(bottomText);
      
      return `${this.baseUrl}/images/${templateId}/${encodedTop}/${encodedBottom}.jpg?width=${width}`;
    } catch (error) {
      console.error('Error generating meme with text:', error);
      throw error;
    }
  }

  async searchTemplates(query: string): Promise<MemeTemplate[]> {
    try {
      const templates = await this.getTemplates();
      const lowercaseQuery = query.toLowerCase();
      
      return templates.filter(template => 
        template.name.toLowerCase().includes(lowercaseQuery) ||
        template.id.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error('Error searching meme templates:', error);
      throw error;
    }
  }
}

export default new MemegenService(); 