import { useEffect, useRef, useState } from 'react';
import { animationService } from '../services/animation.service';
import { storageService } from '../services/storage.service';
import { useMemeTemplates } from './useMemeTemplates';

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
  txId?: string;
  creator?: string;
  timestamp?: Date;
  templateId?: string;
  topText?: string;
  bottomText?: string;
  isLoading?: boolean;
}

interface UseBlocksAnimationProps {
  initialUpcomingBlocks: Block[];
  initialCurrentBlock: Block;
  initialPastBlocks: Block[];
  onShiftComplete?: () => void;
}

export const useBlocksAnimation = ({
  initialUpcomingBlocks,
  initialCurrentBlock,
  initialPastBlocks,
  onShiftComplete,
}: UseBlocksAnimationProps) => {
  const [upcomingBlocks, setUpcomingBlocks] = useState<Block[]>(initialUpcomingBlocks);
  const [currentBlock, setCurrentBlock] = useState<Block>(initialCurrentBlock);
  const [pastBlocks, setPastBlocks] = useState<Block[]>(initialPastBlocks);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePastBlocks, setHasMorePastBlocks] = useState(true);

  const {
    getRandomMemeUrl,
    isLoading: isLoadingTemplates
  } = useMemeTemplates();

  const currentBlockRef = useRef<HTMLDivElement>(null);
  const upcomingBlocksRef = useRef<HTMLDivElement>(null);
  const pastBlocksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animationService.initialize();
    return () => animationService.cleanup();
  }, []);

  // Function to generate a random meme for a block (only called once per block)
  const generateRandomMeme = async (block: Block) => {
    // If block already has a meme, preserve it
    if (block.imageUrl && block.imageUrl !== '') {
      return block;
    }

    const memeUrl = await getRandomMemeUrl(300);
    if (memeUrl) {
      return {
        ...block,
        imageUrl: memeUrl
      };
    }
    return block;
  };

  // Initialize blocks with random memes only if they don't have one
  useEffect(() => {
    const initializeBlocks = async () => {
      if (isLoadingTemplates) return;

      // Only generate memes for blocks that don't have one
      const updatedUpcomingBlocks = await Promise.all(
        initialUpcomingBlocks.map(block => 
          block.imageUrl ? block : generateRandomMeme(block)
        )
      );

      const updatedCurrentBlock = initialCurrentBlock.imageUrl 
        ? initialCurrentBlock 
        : await generateRandomMeme(initialCurrentBlock);

      const updatedPastBlocks = await Promise.all(
        initialPastBlocks.map(block => 
          block.imageUrl ? block : generateRandomMeme(block)
        )
      );

      setUpcomingBlocks(updatedUpcomingBlocks);
      setCurrentBlock(updatedCurrentBlock);
      setPastBlocks(updatedPastBlocks);
    };

    initializeBlocks();
  }, [initialUpcomingBlocks, initialCurrentBlock, initialPastBlocks, isLoadingTemplates]);

  const shiftBlocks = async () => {
    if (isAnimating || upcomingBlocks.length === 0) return;

    setIsAnimating(true);

    // Get the next block from upcoming blocks while preserving its meme data
    const nextBlock = upcomingBlocks[0];
    const remainingUpcomingBlocks = upcomingBlocks.slice(1);

    // Move current block to past blocks while preserving its meme data
    const updatedPastBlocks = [currentBlock, ...pastBlocks];

    // Update the state
    setCurrentBlock(nextBlock);
    setPastBlocks(updatedPastBlocks);
    setUpcomingBlocks(remainingUpcomingBlocks);

    // Load more upcoming blocks if needed
    if (remainingUpcomingBlocks.length < 3) {
      loadMoreUpcomingBlocks();
    }

    setTimeout(() => {
      setIsAnimating(false);
      if (onShiftComplete) onShiftComplete();
    }, 500);
  };

  const loadMoreUpcomingBlocks = async () => {
    const newBlocks = await Promise.all(
      Array.from({ length: 3 }, async (_, i) => {
        const block = {
          id: `upcoming-${Date.now()}-${i}`,
          imageUrl: '',
          blockNumber: upcomingBlocks[upcomingBlocks.length - 1]?.blockNumber + i + 1 || 0,
          templateId: undefined,
          topText: undefined,
          bottomText: undefined,
          isLoading: false
        } as Block;
        return generateRandomMeme(block);
      })
    );

    // Only add new blocks if we don't already have them
    const existingBlockNumbers = upcomingBlocks.map(block => block.blockNumber);
    const uniqueNewBlocks = newBlocks.filter(block => !existingBlockNumbers.includes(block.blockNumber));
    
    if (uniqueNewBlocks.length > 0) {
      setUpcomingBlocks([...upcomingBlocks, ...uniqueNewBlocks]);
    }
  };

  const loadMorePastBlocks = async () => {
    if (isLoadingMore || !hasMorePastBlocks) return;

    setIsLoadingMore(true);
    const newBlocks = await Promise.all(
      Array.from({ length: 3 }, async (_, i) => {
        const block = {
          id: `past-${Date.now()}-${i}`,
          imageUrl: '',
          blockNumber: pastBlocks[pastBlocks.length - 1]?.blockNumber - i - 1 || 0,
          templateId: undefined,
          topText: undefined,
          bottomText: undefined,
          isLoading: false
        } as Block;
        return generateRandomMeme(block);
      })
    );

    // Only add new blocks if we don't already have them
    const existingBlockNumbers = pastBlocks.map(block => block.blockNumber);
    const uniqueNewBlocks = newBlocks.filter(block => !existingBlockNumbers.includes(block.blockNumber));
    
    if (uniqueNewBlocks.length > 0) {
      setPastBlocks([...pastBlocks, ...uniqueNewBlocks]);
    }
    setIsLoadingMore(false);
  };

  const resetPastBlocks = () => {
    setPastBlocks(initialPastBlocks);
  };

  const searchPastBlocks = async (txId: string, creator: string) => {
    // Implement search functionality
  };

  const setTimeRange = async (range: 'all' | '24h' | '7d' | '30d') => {
    // Implement time range filtering
  };

  const setSortFilter = async (filter: 'latest' | 'oldest' | 'popular') => {
    // Implement sorting
  };

  return {
    upcomingBlocks,
    currentBlock,
    pastBlocks,
    isAnimating,
    isLoadingMore,
    hasMorePastBlocks,
    shiftBlocks,
    loadMoreUpcomingBlocks,
    loadMorePastBlocks,
    resetPastBlocks,
    searchPastBlocks,
    setTimeRange,
    setSortFilter,
    refs: {
      currentBlockRef,
      upcomingBlocksRef,
      pastBlocksRef,
    },
  };
}; 