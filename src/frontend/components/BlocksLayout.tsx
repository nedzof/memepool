import React, { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { useBlocksAnimation } from '../hooks/useBlocksAnimation';
import { storageService } from '../services/storage.service';
import { FiSearch, FiX, FiCopy, FiCheck, FiClock, FiTrendingUp, FiFilter } from 'react-icons/fi';

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
  txId?: string;
  creator?: string;
  timestamp?: Date;
}

interface BlocksLayoutProps {
  upcomingBlocks?: Block[];
  currentBlock?: Block;
  pastBlocks?: Block[];
  onCompete: () => void;
  onBlockClick: (block: Block) => void;
  onShiftComplete?: () => void;
}

// Global state for block numbers (mimicking old implementation)
let currentBlockNumber = 831000; // Starting block number
let upcomingStartNumber = currentBlockNumber + 5;
let pastStartNumber = currentBlockNumber - 1;

const getInitialBlockCount = () => {
  const viewportWidth = window.innerWidth;
  const blockWidth = 120; // Block width
  const gap = 20; // Gap between blocks
  const currentMemeWidth = 400; // Current meme width
  const sideSpacing = 40; // Minimum spacing on each side
  
  // Calculate available width for blocks on each side
  const availableWidth = (viewportWidth - currentMemeWidth - (sideSpacing * 2)) / 2;
  
  // Initially show only 2 blocks
  return Math.min(2, Math.floor(availableWidth / (blockWidth + gap)));
};

const getOptimalBlockCount = () => {
  const viewportWidth = window.innerWidth;
  const blockWidth = 120; // Block width
  const gap = 20; // Gap between blocks
  const currentMemeWidth = 400; // Current meme width
  const sideSpacing = 40; // Minimum spacing on each side
  
  // Calculate available width for blocks on each side
  const availableWidth = (viewportWidth - currentMemeWidth - (sideSpacing * 2)) / 2;
  
  // Always show exactly 3 blocks, matching the old implementation
  return 3;
};

const BlocksLayout: React.FC<BlocksLayoutProps> = ({
  upcomingBlocks: initialUpcomingBlocks = [],
  currentBlock: initialCurrentBlock,
  pastBlocks: initialPastBlocks = [],
  onCompete,
  onBlockClick,
  onShiftComplete,
}) => {
  const [showCompeteButton, setShowCompeteButton] = useState(false);
  const [showPastModal, setShowPastModal] = useState(false);
  const [searchTxId, setSearchTxId] = useState('');
  const [searchCreator, setSearchCreator] = useState('');
  const [currentTimeRange, setCurrentTimeRange] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [currentFilter, setCurrentFilter] = useState<'latest' | 'oldest' | 'popular'>('latest');
  const [copySuccess, setCopySuccess] = useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  const {
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
    refs: { currentBlockRef, upcomingBlocksRef, pastBlocksRef },
  } = useBlocksAnimation({
    initialUpcomingBlocks,
    initialCurrentBlock: initialCurrentBlock || {
      id: 'placeholder',
      imageUrl: '/placeholder.png',
      blockNumber: 0,
    },
    initialPastBlocks,
    onShiftComplete,
  });

  // Use initial block count before animation
  const [blockCount, setBlockCount] = useState(getInitialBlockCount());
  
  // Update block count after animation
  useEffect(() => {
    if (isAnimating) {
      setBlockCount(getOptimalBlockCount());
    }
  }, [isAnimating]);
  
  // Keep original block numbers from initialization
  const [blockNumbers, setBlockNumbers] = useState<Record<string, number>>({});

  // Initialize block numbers on first render
  useEffect(() => {
    if (!initialCurrentBlock) return;
    
    const numbers: Record<string, number> = {};
    
    // Assign numbers to upcoming blocks
    initialUpcomingBlocks.forEach((block, index) => {
      numbers[block.id] = initialCurrentBlock.blockNumber + (index + 1);
    });

    // Assign numbers to past blocks
    initialPastBlocks.forEach((block, index) => {
      numbers[block.id] = initialCurrentBlock.blockNumber - (index + 1);
    });

    setBlockNumbers(numbers);
  }, [initialUpcomingBlocks, initialPastBlocks, initialCurrentBlock]);

  // Update block numbers when shifting
  const handleShiftBlocks = () => {
    if (isAnimating) return;
    
    // Update block numbers
    currentBlockNumber = upcomingStartNumber - 2; // Next block becomes current
    upcomingStartNumber = currentBlockNumber + 5;
    pastStartNumber = currentBlockNumber - 1;
    
    shiftBlocks();
  };

  // Always show exactly 3 blocks with consistent numbering
  const displayedUpcomingBlocks = upcomingBlocks
    .slice(0, 3)
    .map((block, index) => ({
      ...block,
      blockNumber: upcomingStartNumber - index
    }))
    .sort((a, b) => a.blockNumber - b.blockNumber); // Sort by block number

  const displayedPastBlocks = pastBlocks
    .slice(0, 3)
    .map((block, index) => ({
      ...block,
      blockNumber: pastStartNumber - index
    }))
    .sort((a, b) => b.blockNumber - a.blockNumber); // Higher numbers on the left

  // Update current block number
  const currentBlockWithNumber = currentBlock ? {
    ...currentBlock,
    blockNumber: currentBlockNumber
  } : undefined;

  useEffect(() => {
    if (currentBlock) {
      setShowCompeteButton(true);
    }
  }, [currentBlock]);

  const handleSearch = async () => {
    if (!searchTxId && !searchCreator) return;
    await searchPastBlocks(searchTxId, searchCreator);
  };

  const handleTimeRangeChange = async (range: 'all' | '24h' | '7d' | '30d') => {
    setCurrentTimeRange(range);
    await setTimeRange(range);
  };

  const handleSortChange = async (filter: 'latest' | 'oldest' | 'popular') => {
    setCurrentFilter(filter);
    await setSortFilter(filter);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMorePastBlocks) return;
    await loadMorePastBlocks();
  };

  const handleCopyTxId = async (block: Block) => {
    if (!block.txId) return;
    
    try {
      await navigator.clipboard.writeText(block.txId);
      setCopiedBlockId(block.id);
      setTimeout(() => setCopiedBlockId(null), 2000);
    } catch (error) {
      console.error('Failed to copy transaction ID:', error);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      handleLoadMore();
    }
  };

  const formatTimeAgo = (timestamp?: Date) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  if (!currentBlock) {
    return (
      <div className="section-container">
        <div className="flex justify-center items-center h-[600px]">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container">
      {/* Shift Blocks Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleShiftBlocks}
          disabled={isAnimating || upcomingBlocks.length === 0}
          className="gradient-button px-6 py-2 rounded-lg font-bold bg-gradient-to-r from-[#ff00ff] to-[#00ffff] text-white hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Shift Blocks
        </button>
      </div>

      {/* Main horizontal layout */}
      <div className="relative w-full h-[600px]">
        {/* Section titles */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-[20%] mb-4">
          <div className="text-[#00ffa3] text-xl font-medium">
            Upcoming Blocks
          </div>
          <div className="text-[#00ffa3] text-xl font-medium">
            Past Blocks
          </div>
        </div>

        {/* Blocks layout */}
        <div className="absolute inset-0 mt-12">
          {/* Current Block Section - Centered */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div 
              ref={currentBlockRef}
              className="current-meme rounded-xl overflow-hidden relative w-[400px] h-[400px] bg-black/20 border border-[#00ffa3]/30 shadow-[0_0_80px_rgba(0,255,163,0.4)]"
            >
              <img
                src={currentBlockWithNumber?.imageUrl}
                alt={`Current Block ${currentBlockWithNumber?.blockNumber}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 text-lg font-mono text-[#00ffa3]">
                #{currentBlockWithNumber?.blockNumber}
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button
                  onClick={onCompete}
                  disabled={isAnimating}
                  className={twMerge(
                    "gradient-button px-8 py-3 rounded-lg font-bold text-lg bg-gradient-to-r from-[#ff00ff] to-[#00ffff] hover:scale-105 transform transition-all duration-300 shadow-lg shadow-[#00ffa3]/20",
                    isAnimating && "pointer-events-none opacity-50"
                  )}
                >
                  COMPETE
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Blocks Section - Right side */}
          <div className="absolute right-[calc(50%+240px)] top-1/2 -translate-y-1/2 flex items-center">
            <button 
              onClick={loadMoreUpcomingBlocks}
              disabled={isAnimating}
              className="absolute -left-12 p-2 rounded-full bg-black/50 border border-[#00ffa3]/30 hover:border-[#00ffa3] transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div ref={upcomingBlocksRef} className="flex justify-end space-x-4">
              {displayedUpcomingBlocks.map((block) => (
                <div
                  key={block.id}
                  onClick={() => !isAnimating && onBlockClick(block)}
                  className={twMerge(
                    "w-[120px] h-[120px] relative overflow-hidden flex-shrink-0 bg-black/20 border border-[#00ffa3]/30 rounded-lg cursor-pointer hover:border-[#00ffa3] transition-all hover:scale-105",
                    isAnimating && "pointer-events-none"
                  )}
                >
                  <img src={block.imageUrl} alt={`Block ${block.blockNumber}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 right-2 text-sm font-mono text-[#00ffa3]">#{block.blockNumber}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Blocks Section - Left side */}
          <div className="absolute left-[calc(50%+240px)] top-1/2 -translate-y-1/2 flex items-center">
            <div ref={pastBlocksRef} className="flex space-x-4">
              {displayedPastBlocks.map((block) => (
                <div
                  key={block.id}
                  onClick={() => !isAnimating && onBlockClick(block)}
                  className={twMerge(
                    "w-[120px] h-[120px] relative overflow-hidden flex-shrink-0 bg-black/20 border border-[#00ffa3]/30 rounded-lg cursor-pointer hover:border-[#00ffa3] transition-all hover:scale-105",
                    isAnimating && "pointer-events-none"
                  )}
                >
                  <img src={block.imageUrl} alt={`Block ${block.blockNumber}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 right-2 text-sm font-mono text-[#00ffa3]">#{block.blockNumber}</div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowPastModal(true)}
              className="absolute -right-12 p-2 rounded-full bg-black/50 border border-[#00ffa3]/30 hover:border-[#00ffa3] transition-all hover:scale-110"
            >
              <svg className="w-6 h-6 text-[#00ffa3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Past Submissions Modal */}
      {showPastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[#1A1B23] rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-[#2A2A40]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#00ffa3]">Past Submissions</h2>
                <button
                  onClick={() => setShowPastModal(false)}
                  className="p-2 hover:bg-[#2A2A40] rounded-full transition-colors"
                >
                  <FiX className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Search and Filters */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTxId}
                    onChange={(e) => setSearchTxId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by Transaction ID"
                    className="w-full pl-10 pr-4 py-2 bg-[#2A2A40] border border-[#3D3D60] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ffa3]"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchCreator}
                    onChange={(e) => setSearchCreator(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by Creator"
                    className="w-full pl-10 pr-4 py-2 bg-[#2A2A40] border border-[#3D3D60] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ffa3]"
                  />
                </div>
              </div>

              {/* Time Range and Sort Filters */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-2">
                  {(['all', '24h', '7d', '30d'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => handleTimeRangeChange(range)}
                      className={twMerge(
                        "px-3 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1",
                        currentTimeRange === range
                          ? "bg-[#00ffa3] text-black"
                          : "bg-[#2A2A40] text-gray-400 hover:text-white"
                      )}
                    >
                      <FiClock className="w-4 h-4" />
                      <span>{range === 'all' ? 'All Time' : range}</span>
                    </button>
                  ))}
                </div>
                <div className="flex space-x-2">
                  {(['latest', 'oldest', 'popular'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => handleSortChange(filter)}
                      className={twMerge(
                        "px-3 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1",
                        currentFilter === filter
                          ? "bg-[#00ffa3] text-black"
                          : "bg-[#2A2A40] text-gray-400 hover:text-white"
                      )}
                    >
                      {filter === 'popular' ? (
                        <FiTrendingUp className="w-4 h-4" />
                      ) : (
                        <FiFilter className="w-4 h-4" />
                      )}
                      <span>{filter.charAt(0).toUpperCase() + filter.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Past Submissions Grid */}
            <div 
              className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]"
              onScroll={handleScroll}
            >
              <div className="grid grid-cols-3 gap-6">
                {pastBlocks.map((block) => (
                  <div
                    key={block.id}
                    onClick={() => !isAnimating && onBlockClick(block)}
                    className="relative overflow-hidden bg-black/20 border border-[#00ffa3]/30 rounded-lg cursor-pointer hover:border-[#00ffa3] transition-all hover:scale-105 aspect-square group"
                  >
                    <img src={block.imageUrl} alt={`Block ${block.blockNumber}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-mono text-[#00ffa3]">#{block.blockNumber}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyTxId(block);
                              }}
                              className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                              {copiedBlockId === block.id ? (
                                <FiCheck className="w-4 h-4 text-[#00ffa3]" />
                              ) : (
                                <FiCopy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                          {block.creator && (
                            <div className="text-sm text-gray-400 truncate">
                              {block.creator}
                            </div>
                          )}
                          {block.timestamp && (
                            <div className="text-xs text-gray-500">
                              {formatTimeAgo(block.timestamp)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {isLoadingMore && (
                <div className="flex justify-center mt-8">
                  <div className="loading-spinner"></div>
                </div>
              )}
              {!isLoadingMore && !hasMorePastBlocks && pastBlocks.length > 0 && (
                <div className="text-center mt-8 text-gray-400">
                  No more blocks to load
                </div>
              )}
              {!isLoadingMore && pastBlocks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  No blocks found matching your filters
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlocksLayout; 