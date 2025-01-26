import React, { useState } from 'react';
import axios from 'axios';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import { generateVideo } from '../../backend/services/aituboService';

interface MemeVideoFormProps {
  onSubmit: (metadata: MemeVideoMetadata) => void;
  onCancel: () => void;
  initialValues?: MemeVideoMetadata;
}

const MemeVideoForm: React.FC<MemeVideoFormProps> = ({ onSubmit, onCancel, initialValues }) => {
  const [prompt, setPrompt] = useState(initialValues?.prompt || '');
  const [style, setStyle] = useState(initialValues?.style || '');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Generate meme video using AiTubo API
      const videoResponse = await generateVideo({ prompt, style, duration: 10, format: 'mp4' });

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
        creatorId: '', // TODO: Get creator ID from authentication context
        videoUrl: videoResponse.videoUrl,
        thumbnailUrl: '', // TODO: Generate thumbnail and get URL
        views: 0,
        likes: 0,
        dislikes: 0,
        shares: 0,
        tags: [],
        nsfw: false,
        visibility: 'public',
        license: '',
        blockchain: {
          txId: '',
          blockHeight: 0,
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