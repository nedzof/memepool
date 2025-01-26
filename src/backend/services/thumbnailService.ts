import axios from 'axios';

const THUMBNAIL_API_URL = 'https://api.example.com/generate-thumbnail';

export const generateThumbnail = async (videoUrl: string): Promise<string> => {
  try {
    const response = await axios.post(THUMBNAIL_API_URL, { videoUrl });
    const thumbnailUrl = response.data.thumbnailUrl;
    return thumbnailUrl;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    throw error;
  }
}; 