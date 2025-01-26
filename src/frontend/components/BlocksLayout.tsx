import React, { useEffect, useRef, useState } from 'react';
import { MemeVideoMetadata } from '../../shared/types/meme';
import { animationService, AnimationPosition } from '../services/animation.service';

interface BlocksLayoutProps {
  pastBlocks: MemeVideoMetadata[];
  currentMeme: MemeVideoMetadata | null;
  upcomingBlocks: MemeVideoMetadata[];
}

const BlocksLayout: React.FC<BlocksLayoutProps> = ({
  pastBlocks,
  currentMeme,
  upcomingBlocks,
}) => {
  const pastBlocksRef = useRef<HTMLDivElement>(null);
  const currentMemeRef = useRef<HTMLDivElement>(null);
  const upcomingBlocksRef = useRef<HTMLDivElement>(null);

  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    animationService.initialize();
    return () => animationService.cleanup();
  }, []);

  const handleVideoError = (videoId: string) => {
    setVideoErrors(prev => ({ ...prev, [videoId]: true }));
  };

  const handleBeatIt = () => {
    if (!currentMemeRef.current || !pastBlocksRef.current) return;

    const currentRect = currentMemeRef.current.getBoundingClientRect();
    const pastBlocksRect = pastBlocksRef.current.getBoundingClientRect();

    const startPos: AnimationPosition = {
      x: currentRect.left,
      y: currentRect.top,
      width: currentRect.width,
      height: currentRect.height
    };

    const endPos: AnimationPosition = {
      x: pastBlocksRect.left,
      y: pastBlocksRect.top,
      width: 120,
      height: 120
    };

    animationService.moveToPastBlock(currentMemeRef.current, startPos, endPos);

    // Move first upcoming block to current position
    if (upcomingBlocksRef.current && upcomingBlocksRef.current.firstElementChild) {
      const targetPos: AnimationPosition = {
        x: currentRect.left,
        y: currentRect.top,
        width: currentRect.width,
        height: currentRect.height
      };

      animationService.moveToCurrentMeme(
        upcomingBlocksRef.current.firstElementChild as HTMLElement,
        targetPos
      );
    }
  };

  const renderBlock = (block: MemeVideoMetadata, isSmall = true) => (
    <div key={block.id} className={`meme-block ${isSmall ? 'slide-left' : ''}`}>
      {videoErrors[block.id] ? (
        <div className="w-full h-full bg-[#2A2A40] flex items-center justify-center">
          <span className="text-[#00ffa3]">Loading...</span>
        </div>
      ) : (
        <video
          src={block.videoUrl}
          className="w-full h-full object-cover"
          muted
          loop
          onError={() => handleVideoError(block.id)}
          onMouseEnter={(e) => {
            try {
              e.currentTarget.play();
            } catch (error) {
              console.error('Failed to play video:', error);
            }
          }}
          onMouseLeave={(e) => {
            try {
              e.currentTarget.pause();
            } catch (error) {
              console.error('Failed to pause video:', error);
            }
          }}
        />
      )}
      <div className="block-number-display absolute bottom-0 left-0 right-0 p-2 text-center">
        <span className="text-[#00ffa3]">#{block.blockHeight}</span>
      </div>
    </div>
  );

  return (
    <div className="section-container my-8">
      {/* Past Blocks */}
      <div className="mb-8">
        <h3 className="section-label mb-4">Past Blocks</h3>
        <div id="pastBlocks" className="blocks-container" ref={pastBlocksRef}>
          {pastBlocks.map(block => renderBlock(block))}
        </div>
      </div>

      {/* Current Meme */}
      {currentMeme && (
        <div className="mb-8">
          <h3 className="section-label mb-4">Current Meme</h3>
          <div className="current-meme" ref={currentMemeRef}>
            {videoErrors[currentMeme.id] ? (
              <div className="w-full h-full bg-[#2A2A40] flex items-center justify-center rounded-xl">
                <span className="text-[#00ffa3]">Loading...</span>
              </div>
            ) : (
              <video
                src={currentMeme.videoUrl}
                className="w-full h-full object-cover rounded-xl"
                controls
                autoPlay
                loop
                onError={() => handleVideoError(currentMeme.id)}
              />
            )}
            <button 
              onClick={handleBeatIt}
              className="beat-button px-6 py-3 bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-lg font-semibold text-white hover:opacity-90 transition-all"
            >
              Beat It!
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Blocks */}
      <div>
        <h3 className="section-label mb-4">Upcoming Blocks</h3>
        <div id="upcomingBlocks" className="blocks-container" ref={upcomingBlocksRef}>
          {upcomingBlocks.map(block => renderBlock(block))}
        </div>
      </div>
    </div>
  );
};

export default BlocksLayout; 