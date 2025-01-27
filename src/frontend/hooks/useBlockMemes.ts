import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface BlockMeme {
  blockHeight: number;
  memeUrl: string;
  templateId: string;
  generatedAt: Date;
}

interface BlockMemeState {
  currentHeight: number;
  currentMeme: BlockMeme | null;
  upcomingMemes: BlockMeme[];
  pastMemes: BlockMeme[];
  isLoading: boolean;
  error: string | null;
}

const API_BASE = '/api/block-memes';

export const useBlockMemes = () => {
  const [state, setState] = useState<BlockMemeState>({
    currentHeight: 0,
    currentMeme: null,
    upcomingMemes: [],
    pastMemes: [],
    isLoading: true,
    error: null
  });

  const fetchBlockInfo = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await axios.get(`${API_BASE}/current`);
      setState(prev => ({
        ...prev,
        ...response.data,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to fetch block info:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch block info'
      }));
    }
  }, []);

  const getMemeForBlock = useCallback(async (blockHeight: number) => {
    try {
      const response = await axios.get(`${API_BASE}/block/${blockHeight}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch meme for block ${blockHeight}:`, error);
      throw error;
    }
  }, []);

  const getUpcomingMemes = useCallback(async (count: number = 3) => {
    try {
      const response = await axios.get(`${API_BASE}/upcoming`, {
        params: { count }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch upcoming memes:', error);
      throw error;
    }
  }, []);

  const getPastMemes = useCallback(async (count: number = 3) => {
    try {
      const response = await axios.get(`${API_BASE}/past`, {
        params: { count }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch past memes:', error);
      throw error;
    }
  }, []);

  const shiftBlocks = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await axios.post(`${API_BASE}/shift`);
      setState(prev => ({
        ...prev,
        ...response.data,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to shift blocks:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to shift blocks'
      }));
    }
  }, []);

  const updateBlockMemes = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/update`);
      await fetchBlockInfo(); // Refresh state after update
    } catch (error) {
      console.error('Failed to update block memes:', error);
      throw error;
    }
  }, [fetchBlockInfo]);

  // Set up polling for updates
  useEffect(() => {
    fetchBlockInfo();
    const interval = setInterval(fetchBlockInfo, 60000); // Poll every minute

    return () => {
      clearInterval(interval);
    };
  }, [fetchBlockInfo]);

  return {
    ...state,
    getMemeForBlock,
    getUpcomingMemes,
    getPastMemes,
    shiftBlocks,
    updateBlockMemes,
    refreshBlockInfo: fetchBlockInfo
  };
}; 