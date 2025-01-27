import React, { useState, useEffect } from 'react';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import CreateMemeModal from './CreateMemeModal';
import { storageService } from '../services/storage.service';

const MemeSubmissionGrid: React.FC = () => {
  const [memeVideos, setMemeVideos] = useState<MemeVideoMetadata[]>([]);
  const [isCreateMemeModalOpen, setIsCreateMemeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemeVideos = async () => {
      setIsLoading(true);
      try {
        const newMemeVideos = await storageService.getMemeVideos(currentPage, 10);
        setMemeVideos((prevMemeVideos: MemeVideoMetadata[]) => {
          const updatedMemeVideos: MemeVideoMetadata[] = [...prevMemeVideos, ...newMemeVideos];
          return updatedMemeVideos;
        });
        setHasMore(newMemeVideos.length === 10);
      } catch (error) {
        console.error('Failed to fetch meme videos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemeVideos();
  }, [currentPage]);

  const handleCreateMemeClick = () => {
    setIsCreateMemeModalOpen(true);
  };

  const handleMemeCreated = (metadata: MemeVideoMetadata) => {
    setMemeVideos((prevMemeVideos: MemeVideoMetadata[]) => {
      const updatedMemeVideos: MemeVideoMetadata[] = [metadata, ...prevMemeVideos];
      return updatedMemeVideos;
    });
  };

  const handleLoadMore = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handleVideoClick = (videoId: string) => {
    setActiveVideo(activeVideo === videoId ? null : videoId);
  };

  return (
    <div className="min-h-screen bg-[#1A1B23] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
            Meme Pool
          </h2>
          <button
            className="px-6 py-3 bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
            onClick={handleCreateMemeClick}
          >
            Create Meme
          </button>
        </div>
        
        {isLoading && memeVideos.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9945FF]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memeVideos.map((video, index) => (
              <div
                key={video.id}
                className={`bg-[#222235] rounded-xl overflow-hidden transition-all duration-300 aspect-square relative group
                  ${index < 3 ? 'viral-submission' : ''}
                  hover:transform hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,255,163,0.2)]`}
                onClick={() => handleVideoClick(video.id)}
              >
                {activeVideo === video.id ? (
                  <video
                    src={video.fileUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    controls
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <video
                      src={video.fileUrl}
                      className="w-full h-full object-cover"
                    />
                    <div className="stats-overlay">
                      <div className="flex justify-between items-center mb-4">
                        <div className="stats-icon">
                          <span className="text-[#14F195] text-2xl font-bold">{video.locks}</span>
                          <span className="text-gray-400">🔒</span>
                        </div>
                        <div className="stats-icon">
                          <span className="text-[#9945FF] text-2xl font-bold">{video.views}</span>
                          <span className="text-gray-400">👁️</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="stats-icon">
                          <span className="text-[#14F195] text-xl font-bold">{video.likes}</span>
                          <span className="text-gray-400">❤️</span>
                        </div>
                        <div className="stats-icon">
                          <span className="text-[#9945FF] text-xl font-bold">{video.shares}</span>
                          <span className="text-gray-400">🔄</span>
                        </div>
                      </div>
                    </div>
                    <div className="play-button">
                      <svg className="w-8 h-8 text-[#14F195]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
                {index < 3 && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9945FF] via-[#14F195] to-[#9945FF] animate-gradient-x"></div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {hasMore && !isLoading && (
          <div className="flex justify-center mt-8">
            <button
              className="px-6 py-3 bg-[#222235] rounded-lg font-semibold text-white hover:bg-[#2A2A40] transition-colors"
              onClick={handleLoadMore}
            >
              Load More
            </button>
          </div>
        )}

        {isLoading && memeVideos.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#9945FF]"></div>
          </div>
        )}
      </div>
      
      <CreateMemeModal
        isOpen={isCreateMemeModalOpen}
        onClose={() => setIsCreateMemeModalOpen(false)}
        onMemeCreated={handleMemeCreated}
      />
    </div>
  );
};

export default MemeSubmissionGrid; 