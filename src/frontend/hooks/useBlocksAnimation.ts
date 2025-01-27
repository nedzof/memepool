import { useEffect, useRef, useState } from 'react';
import { animationService } from '../services/animation.service';
import { storageService } from '../services/storage.service';

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
  txId?: string;
  creator?: string;
  timestamp?: Date;
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

  const currentBlockRef = useRef<HTMLDivElement>(null);
  const upcomingBlocksRef = useRef<HTMLDivElement>(null);
  const pastBlocksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animationService.initialize();
    return () => animationService.cleanup();
  }, []);

  // Load initial blocks
  useEffect(() => {
    const loadBlocks = async () => {
      const [upcoming, past] = await Promise.all([
        storageService.getUpcomingBlocks(),
        storageService.getPastBlocks(),
      ]);
      setUpcomingBlocks(upcoming);
      setPastBlocks(past);
      setHasMorePastBlocks(past.length === storageService['submissionsPerPage']);
    };
    loadBlocks();
  }, []);

  const shiftBlocks = async () => {
    if (isAnimating || !currentBlockRef.current || !upcomingBlocksRef.current || !pastBlocksRef.current || upcomingBlocks.length === 0) {
      return;
    }

    setIsAnimating(true);

    try {
      // Get the first upcoming block element
      const upcomingBlockElement = upcomingBlocksRef.current.firstElementChild as HTMLElement;
      if (!upcomingBlockElement) return;

      // Animate the exchange
      await animationService.animateBlockExchange(
        currentBlockRef.current,
        upcomingBlockElement,
        pastBlocksRef.current
      );

      // Update state after animation
      setPastBlocks(prev => [currentBlock, ...prev]);
      setCurrentBlock(upcomingBlocks[0]);
      setUpcomingBlocks(prev => prev.slice(1));

      // Update block numbers in storage service
      storageService.setCurrentBlockNumber(upcomingBlocks[0].blockNumber);

      // Load more upcoming blocks if needed
      if (upcomingBlocks.length <= 3) {
        const newUpcomingBlocks = await storageService.getUpcomingBlocks();
        setUpcomingBlocks(prev => [...prev, ...newUpcomingBlocks]);
      }

      onShiftComplete?.();
    } catch (error) {
      console.error('Error during block shift animation:', error);
    } finally {
      setIsAnimating(false);
    }
  };

  const loadMoreUpcomingBlocks = async () => {
    await storageService.loadMoreUpcomingBlocks();
    const newBlocks = await storageService.getUpcomingBlocks();
    setUpcomingBlocks(prev => [...prev, ...newBlocks]);
  };

  const loadMorePastBlocks = async () => {
    if (isLoadingMore || !hasMorePastBlocks) return;
    setIsLoadingMore(true);
    try {
      await storageService.loadMorePastBlocks();
      const newBlocks = await storageService.getPastBlocks();
      if (newBlocks.length === 0) {
        setHasMorePastBlocks(false);
      } else {
        setPastBlocks(prev => [...prev, ...newBlocks]);
        setHasMorePastBlocks(newBlocks.length === storageService['submissionsPerPage']);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const resetPastBlocks = async () => {
    setIsLoadingMore(true);
    try {
      storageService.resetPastBlocks();
      const newBlocks = await storageService.getPastBlocks();
      setPastBlocks(newBlocks);
      setHasMorePastBlocks(newBlocks.length === storageService['submissionsPerPage']);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const searchPastBlocks = async (txId: string, creator: string) => {
    setIsLoadingMore(true);
    try {
      storageService.setSearchFilters(txId, creator);
      const newBlocks = await storageService.getPastBlocks();
      setPastBlocks(newBlocks);
      setHasMorePastBlocks(newBlocks.length === storageService['submissionsPerPage']);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const setTimeRange = async (range: 'all' | '24h' | '7d' | '30d') => {
    setIsLoadingMore(true);
    try {
      storageService.setTimeRange(range);
      const newBlocks = await storageService.getPastBlocks();
      setPastBlocks(newBlocks);
      setHasMorePastBlocks(newBlocks.length === storageService['submissionsPerPage']);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const setSortFilter = async (filter: 'latest' | 'oldest' | 'popular') => {
    setIsLoadingMore(true);
    try {
      storageService.setSortFilter(filter);
      const newBlocks = await storageService.getPastBlocks();
      setPastBlocks(newBlocks);
      setHasMorePastBlocks(newBlocks.length === storageService['submissionsPerPage']);
    } finally {
      setIsLoadingMore(false);
    }
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