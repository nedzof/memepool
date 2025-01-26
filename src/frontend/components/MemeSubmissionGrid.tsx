import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import CreateMemeModal from './CreateMemeModal';

const MemeSubmissionGrid: React.FC = () => {
  const [memeVideos, setMemeVideos] = useState<MemeVideoMetadata[]>([]);
  const [isCreateMemeModalOpen, setIsCreateMemeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchMemeVideos = async () => {
      try {
        const response = await axios.get(`/api/memes?page=${currentPage}`);
        const newMemeVideos = response.data;
        setMemeVideos((prevMemeVideos) => [...prevMemeVideos, ...newMemeVideos]);
        setHasMore(newMemeVideos.length > 0);
      } catch (error) {
        console.error('Failed to fetch meme videos:', error);
        // TODO: Handle error and show user-friendly message
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
    <div>
      <h2 className="text-2xl font-bold mb-4">Meme Submission Grid</h2>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={handleCreateMemeClick}
      >
        Create Meme
      </button>
      <div className="grid grid-cols-3 gap-4">
        {memeVideos.map((video) => (
          <div key={video.id} className="bg-gray-100 p-4 rounded">
            <h3 className="text-xl font-bold mb-2">{video.title}</h3>
            <p>{video.description}</p>
            <video src={video.videoUrl} controls className="w-full" />
            <p>Likes: {video.likes}</p>
            <p>Dislikes: {video.dislikes}</p>
            <p>Views: {video.views}</p>
            <p>Shares: {video.shares}</p>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
          onClick={handleLoadMore}
        >
          Load More
        </button>
      )}
      <CreateMemeModal
        isOpen={isCreateMemeModalOpen}
        onClose={() => setIsCreateMemeModalOpen(false)}
        onMemeCreated={handleMemeCreated}
      />
    </div>
  );
};

export default MemeSubmissionGrid; 