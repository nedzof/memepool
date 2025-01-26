import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import CreateMemeModal from './CreateMemeModal';

const MemeSubmissionGrid: React.FC = () => {
  const [memeVideos, setMemeVideos] = useState<MemeVideoMetadata[]>([]);
  const [isCreateMemeModalOpen, setIsCreateMemeModalOpen] = useState(false);

  useEffect(() => {
    const fetchMemeVideos = async () => {
      try {
        const response = await axios.get('/api/metadata');
        setMemeVideos(response.data);
      } catch (error) {
        console.error('Failed to fetch meme videos:', error);
        // TODO: Handle error and show user-friendly message
      }
    };

    fetchMemeVideos();
  }, []);

  const handleCreateMemeClick = () => {
    setIsCreateMemeModalOpen(true);
  };

  const handleMemeCreated = (metadata: MemeVideoMetadata) => {
    setMemeVideos([...memeVideos, metadata]);
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
            {/* TODO: Render video thumbnail and other metadata */}
          </div>
        ))}
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