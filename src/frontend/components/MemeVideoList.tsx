import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/metadata';

const MemeVideoList: React.FC = () => {
  const [memeVideos, setMemeVideos] = useState<MemeVideoMetadata[]>([]);

  useEffect(() => {
    const fetchMemeVideos = async () => {
      try {
        // Fetch meme videos from user's wallet
        const walletResponse = await axios.get('/api/wallet/meme-videos');
        const walletMemeVideos = walletResponse.data;

        // Fetch meme videos from current round's submission grid
        const roundResponse = await axios.get('/api/round/current/submissions');
        const roundMemeVideos = roundResponse.data;

        // Combine wallet and round meme videos
        const allMemeVideos = [...walletMemeVideos, ...roundMemeVideos];

        setMemeVideos(allMemeVideos);
      } catch (error) {
        console.error('Failed to fetch meme videos:', error);
        // TODO: Handle error and show user-friendly message
      }
    };

    fetchMemeVideos();
  }, []);

  return (
    <div>
      <h2>Meme Videos</h2>
      {memeVideos.map((video) => (
        <div key={video.id}>
          <h3>{video.title}</h3>
          <p>{video.description}</p>
          <video src={video.videoUrl} controls />
          {/* TODO: Render additional metadata */}
        </div>
      ))}
    </div>
  );
};

export default MemeVideoList; 