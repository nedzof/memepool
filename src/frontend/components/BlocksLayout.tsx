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
  const [loadedVideos, setLoadedVideos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    animationService.initialize();
    return () => animationService.cleanup();
  }, []);

  const handleVideoError = (videoId: string) => {
    setVideoErrors(prev => ({ ...prev, [videoId]: true }));
  };

  const handleVideoLoaded = (videoId: string) => {
    setLoadedVideos(prev => ({ ...prev, [videoId]: true }));
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

  const renderPlaceholder = (blockHeight: number) => (
    <div className="w-full h-full bg-[#2A2A40] flex flex-col items-center justify-center">
      <div className="animate-pulse w-16 h-16 mb-4 rounded-full bg-[#00ffa3]/20"></div>
      <span className="text-[#00ffa3]">Loading Block #{blockHeight}</span>
    </div>
  );

  const renderBlock = (block: MemeVideoMetadata, isSmall = true) => (
    <div key={block.id} className={`meme-block ${isSmall ? 'slide-left' : ''}`}>
      {videoErrors[block.id] || !loadedVideos[block.id] ? (
        renderPlaceholder(block.blockHeight)
      ) : (
        <video
          key={block.id}
          src={block.videoUrl}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => handleVideoError(block.id)}
          onLoadedData={() => handleVideoLoaded(block.id)}
          onMouseEnter={(e) => {
            const video = e.currentTarget;
            if (video.readyState >= 3) {
              video.play().catch(error => {
                console.error('Failed to play video:', error);
              });
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.pause();
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
            {videoErrors[currentMeme.id] || !loadedVideos[currentMeme.id] ? (
              renderPlaceholder(currentMeme.blockHeight)
            ) : (
              <video
                key={currentMeme.id}
                src={currentMeme.videoUrl}
                className="w-full h-full object-cover rounded-xl"
                controls
                playsInline
                preload="metadata"
                loop
                onError={() => handleVideoError(currentMeme.id)}
                onLoadedData={() => handleVideoLoaded(currentMeme.id)}
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