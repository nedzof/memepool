import axios from 'axios';

const AITUBO_API_BASE_URL = 'https://api.aitubo.com/v1';

export interface AiTuboGenerateVideoParams {
  prompt: string;
  style: string;
  duration: number;
  format: string;
}

export interface AiTuboGenerateVideoResponse {
  videoUrl: string;
  metadata: {
    prompt: string;
    style: string;
    duration: number;
    format: string;
  };
}

export const generateVideo = async (params: AiTuboGenerateVideoParams): Promise<AiTuboGenerateVideoResponse> => {
  try {
    const response = await axios.post(`${AITUBO_API_BASE_URL}/generate-video`, params);
    return response.data;
  } catch (error) {
    console.error('Failed to generate video using AiTubo API:', error);
    throw error;
  }
}; 