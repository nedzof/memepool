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

  // Function to generate a random meme for a block
  const generateRandomMeme = async (block: Block) => {
    const memeUrl = await getRandomMemeUrl(300);
    if (memeUrl) {
      return {
        ...block,
        imageUrl: memeUrl
      };
    }
    return block;
  };

  // Initialize blocks with random memes
  useEffect(() => {
    const initializeBlocks = async () => {
      if (isLoadingTemplates) return;

      // Generate random memes for upcoming blocks
      const updatedUpcomingBlocks = await Promise.all(
        initialUpcomingBlocks.map(generateRandomMeme)
      );

      // Generate random meme for current block
      const updatedCurrentBlock = await generateRandomMeme(initialCurrentBlock);

      // Generate random memes for past blocks
      const updatedPastBlocks = await Promise.all(
        initialPastBlocks.map(generateRandomMeme)
      );

      setUpcomingBlocks(updatedUpcomingBlocks);
      setCurrentBlock(updatedCurrentBlock);
      setPastBlocks(updatedPastBlocks);
    };

    initializeBlocks();
  }, [isLoadingTemplates, initialUpcomingBlocks, initialCurrentBlock, initialPastBlocks]);

  const shiftBlocks = async () => {
    if (isAnimating || upcomingBlocks.length === 0) return;

    setIsAnimating(true);

    // Get the next block from upcoming blocks
    const nextBlock = upcomingBlocks[0];
    const remainingUpcomingBlocks = upcomingBlocks.slice(1);

    // Move current block to past blocks
    const updatedPastBlocks = [currentBlock, ...pastBlocks];

    // Update the state while preserving meme data
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
        const memeUrl = await getRandomMemeUrl(300);
        return {
          id: `upcoming-${Date.now()}-${i}`,
          imageUrl: memeUrl || '',
          blockNumber: upcomingBlocks[upcomingBlocks.length - 1]?.blockNumber + i + 1 || 0,
          templateId: undefined,
          topText: undefined,
          bottomText: undefined,
          isLoading: false
        } as Block;
      })
    );

    // Preserve the meme data when adding new blocks
    setUpcomingBlocks([...upcomingBlocks, ...newBlocks]);
  };

  const loadMorePastBlocks = async () => {
    if (isLoadingMore || !hasMorePastBlocks) return;

    setIsLoadingMore(true);
    const newBlocks = await Promise.all(
      Array.from({ length: 3 }, async (_, i) => {
        const memeUrl = await getRandomMemeUrl(300);
        return {
          id: `past-${Date.now()}-${i}`,
          imageUrl: memeUrl || '',
          blockNumber: pastBlocks[pastBlocks.length - 1]?.blockNumber - i - 1 || 0,
          templateId: undefined,
          topText: undefined,
          bottomText: undefined,
          isLoading: false
        } as Block;
      })
    );

    // Preserve the meme data when adding new blocks
    setPastBlocks([...pastBlocks, ...newBlocks]);
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