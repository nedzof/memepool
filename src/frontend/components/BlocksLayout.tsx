import React from 'react';
import { MemeVideoMetadata } from '../../shared/types/meme';

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
  return (
    <div className="section-container my-8">
      {/* Past Blocks */}
      <div className="mb-8">
        <h3 className="section-label mb-4">Past Blocks</h3>
        <div id="pastBlocks" className="blocks-container">
          {pastBlocks.map((block) => (
            <div key={block.id} className="meme-block slide-left">
              <video
                src={block.videoUrl}
                className="w-full h-full object-cover"
                muted
                loop
              />
              <div className="block-number-display absolute bottom-0 left-0 right-0 p-2 text-center">
                <span className="text-[#00ffa3]">#{block.blockHeight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Meme */}
      {currentMeme && (
        <div className="mb-8">
          <h3 className="section-label mb-4">Current Meme</h3>
          <div className="current-meme">
            <video
              src={currentMeme.videoUrl}
              className="w-full h-full object-cover rounded-xl"
              controls
              autoPlay
              loop
            />
            <button className="beat-button px-6 py-3 bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-lg font-semibold text-white hover:opacity-90 transition-all">
              Beat It!
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Blocks */}
      <div>
        <h3 className="section-label mb-4">Upcoming Blocks</h3>
        <div id="upcomingBlocks" className="blocks-container">
          {upcomingBlocks.map((block) => (
            <div key={block.id} className="meme-block slide-right">
              <video
                src={block.videoUrl}
                className="w-full h-full object-cover"
                muted
                loop
              />
              <div className="block-number-display absolute bottom-0 left-0 right-0 p-2 text-center">
                <span className="text-[#00ffa3]">#{block.blockHeight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlocksLayout; 