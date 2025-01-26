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

  useEffect(() => {
    const fetchMemeVideos = async () => {
      setIsLoading(true);
      try {
        const newMemeVideos = await storageService.getMemeVideos(currentPage, 10);
        setMemeVideos((prevMemeVideos) => [...prevMemeVideos, ...newMemeVideos]);
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
    setMemeVideos([metadata, ...memeVideos]);
  };

  const handleLoadMore = () => {
    setCurrentPage((prevPage) => prevPage + 1);
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
            {memeVideos.map((video) => (
              <div
                key={video.id}
                className="bg-[#222235] rounded-xl overflow-hidden hover:shadow-lg hover:shadow-[#9945FF]/20 transition-all duration-300"
              >
                <video
                  src={video.fileUrl}
                  controls
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2 text-white">{video.title}</h3>
                  <p className="text-gray-400 mb-4">{video.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-[#14F195]">{video.likes}</span>
                      <span className="text-gray-400">Likes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[#9945FF]">{video.views}</span>
                      <span className="text-gray-400">Views</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[#14F195]">{video.shares}</span>
                      <span className="text-gray-400">Shares</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[#9945FF]">{video.dislikes}</span>
                      <span className="text-gray-400">Dislikes</span>
                    </div>
                  </div>
                </div>
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