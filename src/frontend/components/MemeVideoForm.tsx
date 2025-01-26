import React, { useState } from 'react';
import { blockchainService } from '../services/blockchain.service';
import { storageService } from '../services/storage.service';
import { MemeVideoMetadata } from '../../shared/types/meme';

interface MemeVideoFormProps {
  onSubmit: (metadata: MemeVideoMetadata) => void;
}

export const MemeVideoForm: React.FC<MemeVideoFormProps> = ({ onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // First, upload the video file and get its URL
      const formData = new FormData();
      formData.append('video', videoFile);
      const videoUrl = await storageService.uploadVideo(formData);

      // Then, inscribe the video on the blockchain
      const { inscriptionId, blockHeight } = await blockchainService.inscribeMeme(videoUrl);

      // Finally, save the metadata
      const metadata: Omit<MemeVideoMetadata, 'id'> = {
        title,
        description,
        videoUrl,
        inscriptionId,
        blockHeight,
        createdAt: new Date().toISOString(),
      };

      await storageService.saveMemeVideo(metadata);
      onSubmit(metadata as MemeVideoMetadata);

      // Reset form
      setTitle('');
      setDescription('');
      setVideoFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          rows={3}
        />
      </div>

      <div>
        <label htmlFor="video" className="block text-sm font-medium text-gray-700">
          Video File
        </label>
        <input
          type="file"
          id="video"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          required
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isUploading ? 'Uploading...' : 'Upload Video'}
      </button>
    </form>
  );
}; 