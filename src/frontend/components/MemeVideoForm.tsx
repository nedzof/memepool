import React, { useState, useContext } from 'react';
import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import { generateVideo } from '../../backend/services/aituboService';
import { AuthContext } from '../../shared/context/AuthContext';
import { inscribeMeme } from '../../backend/services/scryptOrdService';
import { generateThumbnail } from '../../backend/services/thumbnailService';

interface MemeVideoFormProps {
  onSubmit: (metadata: MemeVideoMetadata) => void;
  onCancel: () => void;
  initialValues?: MemeVideoMetadata;
}

const MemeVideoForm: React.FC<MemeVideoFormProps> = ({ onSubmit, onCancel, initialValues }) => {
  const [prompt, setPrompt] = useState(initialValues?.prompt || '');
  const [style, setStyle] = useState(initialValues?.style || '');
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Generate meme video using AiTubo API
      const videoResponse = await generateVideo({ prompt, style, duration: 10, format: 'mp4' });

      // Generate thumbnail for the meme video
      const thumbnailUrl = await generateThumbnail(videoResponse.videoUrl);

      // Inscribe the meme video on-chain using scrypt-ord
      const inscriptionId = await inscribeMeme(videoResponse.videoUrl);

      const metadata: MemeVideoMetadata = {
        id: '',
        title: prompt,
        description: '',
        prompt,
        style,
        duration: videoResponse.metadata.duration,
        format: videoResponse.metadata.format,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: user.id,
        videoUrl: videoResponse.videoUrl,
        thumbnailUrl,
        tags: [],
        nsfw: false,
        visibility: 'public',
        license: '',
        blockchain: {
          txId: inscriptionId,
          blockHeight: 0, // TODO: Retrieve block height from BSV blockchain
          mintedAt: new Date(),
        },
        nft: {
          tokenId: '',
          contractAddress: '',
          ownerAddress: '', // TODO: Get owner address from wallet
          mintedAt: new Date(),
          marketplaceUrl: '',
        },
        revenue: {
          totalEarned: 0,
          totalPaidOut: 0,
          outstandingBalance: 0,
        },
      };

      onSubmit(metadata);
    } catch (error) {
      console.error('Failed to create meme video:', error);
      // TODO: Handle error and show user-friendly message
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="prompt">Prompt:</label>
        <input
          type="text"
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="style">Style:</label>
        <input
          type="text"
          id="style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={isCreating}>
        {isCreating ? 'Creating...' : 'Create Meme'}
      </button>
      <button type="button" onClick={onCancel} disabled={isCreating}>
        Cancel
      </button>
    </form>
  );
};

export default MemeVideoForm; 