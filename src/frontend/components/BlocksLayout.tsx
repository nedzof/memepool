import React, { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { FiSearch, FiX, FiCopy, FiCheck, FiClock, FiTrendingUp, FiFilter } from 'react-icons/fi';
import CreateMemeModal from './CreateMemeModal';
import { useBlockMemes } from '../hooks/useBlockMemes';

interface Block {
  blockHeight: number;
  memeUrl: string;
  templateId?: string;
  generatedAt?: Date;
  isLoading?: boolean;
  // Legacy fields for compatibility
  id?: string;
  imageUrl?: string;
  blockNumber?: number;
}

interface BlocksLayoutProps {
  onCompete: () => void;
  onBlockClick: (block: Block) => void;
  onShiftComplete?: () => void;
}

const BlocksLayout: React.FC<BlocksLayoutProps> = ({
  onCompete,
  onBlockClick,
  onShiftComplete,
}) => {
  const [showCreateMemeModal, setShowCreateMemeModal] = useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState<number | null>(null);
  const [loadingBlocks, setLoadingBlocks] = useState<Record<number, boolean>>({});

  const {
    currentHeight,
    currentMeme,
    upcomingMemes,
    pastMemes,
    isLoading,
    error,
    refreshBlockInfo,
    shiftBlocks
  } = useBlockMemes();

  // Convert BlockMeme to Block
  const convertToBlock = (blockMeme: any): Block => ({
    ...blockMeme,
    id: `block-${blockMeme.blockHeight}`,
    imageUrl: blockMeme.memeUrl,
    blockNumber: blockMeme.blockHeight
  });

  const handleCopyBlockHeight = async (blockHeight: number) => {
    try {
      await navigator.clipboard.writeText(blockHeight.toString());
      setCopiedBlockId(blockHeight);
      setTimeout(() => setCopiedBlockId(null), 2000);
    } catch (error) {
      console.error('Failed to copy block height:', error);
    }
  };

  const handleImageLoad = (blockHeight: number) => {
    setLoadingBlocks(prev => ({ ...prev, [blockHeight]: false }));
  };

  const handleImageError = (blockHeight: number) => {
    console.error(`Failed to load image for block ${blockHeight}`);
    setLoadingBlocks(prev => ({ ...prev, [blockHeight]: false }));
  };

  // Function to render a block image with loading state
  const renderBlockImage = (block: Block) => (
    <div className="relative w-full h-full">
      {(loadingBlocks[block.blockHeight] || block.isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="loading-spinner"></div>
        </div>
      )}
      <img
        src={block.memeUrl}
        alt={`Block ${block.blockHeight}`}
        className={twMerge(
          "w-full h-full object-cover transition-opacity duration-300",
          loadingBlocks[block.blockHeight] ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => handleImageLoad(block.blockHeight)}
        onError={() => handleImageError(block.blockHeight)}
      />
    </div>
  );

  // Mark blocks as loading when they're first added
  useEffect(() => {
    const newLoadingState: Record<number, boolean> = {};
    [...upcomingMemes, currentMeme, ...pastMemes].forEach(block => {
      if (block && !loadingBlocks.hasOwnProperty(block.blockHeight)) {
        newLoadingState[block.blockHeight] = true;
      }
    });
    if (Object.keys(newLoadingState).length > 0) {
      setLoadingBlocks(prev => ({ ...prev, ...newLoadingState }));
    }
  }, [upcomingMemes, currentMeme, pastMemes]);

  const handleShiftBlocks = async () => {
    if (isLoading || !upcomingMemes.length) return;
    
    try {
      await shiftBlocks();
      
      if (onShiftComplete) {
        onShiftComplete();
      }
    } catch (error) {
      console.error('Failed to shift blocks:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4">
      {/* Shift Blocks Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleShiftBlocks}
          disabled={isLoading || upcomingMemes.length === 0}
          className="gradient-button px-6 py-2 rounded-lg font-bold bg-gradient-to-r from-[#ff00ff] to-[#00ffff] text-white hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Shift Blocks
        </button>
      </div>

      <div className="flex justify-between items-center w-full gap-8">
        {/* Upcoming Blocks */}
        <div className="flex-1">
          <h2 className="text-[#00ffa3] text-right mb-4">Upcoming Blocks</h2>
          <div className="flex justify-end gap-4">
            {upcomingMemes.map(block => (
              <div
                key={block.blockHeight}
                className="meme-block group cursor-pointer"
                onClick={() => onBlockClick(convertToBlock(block))}
              >
                {renderBlockImage(convertToBlock(block))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-mono text-[#00ffa3]">#{block.blockHeight}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyBlockHeight(block.blockHeight);
                        }}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        {copiedBlockId === block.blockHeight ? (
                          <FiCheck className="w-4 h-4 text-[#00ffa3]" />
                        ) : (
                          <FiCopy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Block */}
        <div className="flex-shrink-0 w-[400px]">
          {currentMeme && (
            <div className="current-meme relative">
              <div className="compete-button">
                <button
                  onClick={() => setShowCreateMemeModal(true)}
                >
                  COMPETE
                </button>
              </div>
              {renderBlockImage(convertToBlock(currentMeme))}
              <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-md rounded-md px-3 py-1.5 border-l-2 border-[#00ffa3]">
                <span className="text-sm font-mono text-[#00ffa3]">#{currentHeight}</span>
              </div>
            </div>
          )}
        </div>

        {/* Past Blocks */}
        <div className="flex-1">
          <h2 className="text-[#00ffa3] mb-4">Past Blocks</h2>
          <div className="flex gap-4">
            {pastMemes.map(block => (
              <div
                key={block.blockHeight}
                className="meme-block group cursor-pointer"
                onClick={() => onBlockClick(convertToBlock(block))}
              >
                {renderBlockImage(convertToBlock(block))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-mono text-[#00ffa3]">#{block.blockHeight}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyBlockHeight(block.blockHeight);
                        }}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        {copiedBlockId === block.blockHeight ? (
                          <FiCheck className="w-4 h-4 text-[#00ffa3]" />
                        ) : (
                          <FiCopy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Meme Modal */}
      {showCreateMemeModal && (
        <CreateMemeModal
          onClose={() => setShowCreateMemeModal(false)}
          onMemeCreated={() => {
            setShowCreateMemeModal(false);
            if (onCompete) {
              onCompete();
            }
            refreshBlockInfo();
          }}
          currentBlock={currentMeme ? convertToBlock(currentMeme) : null}
        />
      )}
    </div>
  );
};

export default BlocksLayout; 