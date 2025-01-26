import React from 'react';
import { MemeVideoMetadata } from '../../shared/types/meme';

interface MemeBlocksProps {
  pastBlocks: MemeVideoMetadata[];
  currentMeme: MemeVideoMetadata | null;
  upcomingBlocks: MemeVideoMetadata[];
}

const MemeBlocks: React.FC<MemeBlocksProps> = ({ pastBlocks, currentMeme, upcomingBlocks }) => {
  return (
    <div className="section-container my-8">
      {/* Past Blocks */}
      <div className="mb-4">
        <h2 className="section-label mb-2">Past Blocks</h2>
        <div id="pastBlocks" className="blocks-container">
          {pastBlocks.map((meme) => (
            <div key={meme.id} className="meme-block">
              <video src={meme.videoUrl} className="w-full h-full object-cover" />
              <div className="block-number-display absolute bottom-0 left-0 right-0 p-2 text-center">
                <span className="text-[#00ffa3]">Block {meme.blockHeight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Meme */}
      <div className="mb-4">
        <h2 className="section-label mb-2">Current Meme</h2>
        <div className="flex justify-center">
          {currentMeme ? (
            <div className="current-meme">
              <video
                src={currentMeme.videoUrl}
                className="w-full h-full object-cover rounded-xl"
                controls
              />
              <div className="block-number-display absolute bottom-0 left-0 right-0 p-2 text-center">
                <span className="text-[#00ffa3]">Block {currentMeme.blockHeight}</span>
              </div>
              <button className="beat-button px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white">
                Beat This Meme
              </button>
            </div>
          ) : (
            <div className="current-meme flex items-center justify-center">
              <p className="text-gray-400">No current meme</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Blocks */}
      <div>
        <h2 className="section-label mb-2">Upcoming Blocks</h2>
        <div id="upcomingBlocks" className="blocks-container">
          {upcomingBlocks.map((meme) => (
            <div key={meme.id} className="meme-block">
              <video src={meme.videoUrl} className="w-full h-full object-cover" />
              <div className="block-number-display absolute bottom-0 left-0 right-0 p-2 text-center">
                <span className="text-[#00ffa3]">Block {meme.blockHeight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MemeBlocks; 