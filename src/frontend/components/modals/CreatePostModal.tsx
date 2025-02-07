import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiImage, FiClock } from 'react-icons/fi';
import { walletManager } from '../../utils/wallet';
import { storageService } from '../../services/storage.service';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: () => void;
}

const MAX_CONTENT_SIZE = 10 * 1024; // 10KB limit
const MIN_LOCK_BLOCKS = 144; // 1 day minimum lock
const DEFAULT_LOCK_BLOCKS = 144 * 7; // 1 week default lock

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lockBlocks, setLockBlocks] = useState(DEFAULT_LOCK_BLOCKS);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBlockHeight = async () => {
      try {
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/chain/info');
        const data = await response.json();
        setCurrentBlockHeight(data.blocks);
      } catch (error) {
        console.error('Failed to fetch block height:', error);
        setError('Failed to fetch current block height');
      }
    };

    fetchBlockHeight();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size too large. Maximum size is 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateVibes = (amount: number, lockPeriod: number): number => {
    return (amount / 100000000) * Math.log(lockPeriod);
  };

  const handleSubmit = async () => {
    try {
      if (!currentBlockHeight) {
        setError('Block height not available');
        return;
      }

      if (Buffer.from(content).length > MAX_CONTENT_SIZE) {
        setError('Content size too large');
        return;
      }

      setIsLoading(true);
      setError(null);

      const wallet = walletManager.getWallet();
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      // Upload media if present
      let mediaUrl = null;
      if (imagePreview) {
        mediaUrl = await storageService.uploadMedia(imagePreview);
      }

      // Create the post transaction
      const lockUntilBlock = currentBlockHeight + lockBlocks;
      const amount = 0.001; // Default amount in BSV
      
      // Calculate initial vibes
      const initialVibes = calculateVibes(amount, lockBlocks);

      const post = {
        content,
        mediaUrl,
        lockUntilBlock,
        amount,
        initialVibes,
        timestamp: Date.now(),
      };

      // Sign and broadcast the transaction
      const txid = await wallet.lockCoins(post.amount, lockUntilBlock);

      // Store the post data
      await storageService.createPost({
        ...post,
        txid,
      });

      onPostCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
      setError(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef} 
        className="bg-[#2A2A40] rounded-xl w-full max-w-xl shadow-2xl border border-[#3D3D60]"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#3D3D60]">
          <h2 className="text-xl font-bold text-white">Create Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#3D3D60] rounded-lg"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full h-32 bg-[#1A1B23] text-white rounded-lg p-4 mb-4 resize-none border border-[#3D3D60] focus:border-[#00ffa3] focus:ring-1 focus:ring-[#00ffa3] focus:outline-none transition-colors placeholder-gray-500"
          />

          {/* Lock Period Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Lock Period (in blocks)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={MIN_LOCK_BLOCKS}
                value={lockBlocks}
                onChange={(e) => setLockBlocks(Math.max(MIN_LOCK_BLOCKS, parseInt(e.target.value)))}
                className="flex-1 bg-[#1A1B23] border border-[#3D3D60] rounded px-3 py-2 text-white text-sm focus:border-[#00ffa3] focus:ring-1 focus:ring-[#00ffa3] focus:outline-none"
              />
              <div className="text-sm text-gray-400">
                ≈ {Math.round(lockBlocks / 144)} days
              </div>
            </div>
          </div>

          {imagePreview && (
            <div className="relative mb-4 bg-[#1A1B23] p-2 rounded-lg border border-[#3D3D60]">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-64 rounded-lg object-contain mx-auto"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 rounded-full p-1 transition-colors"
              >
                <FiX className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-[#3D3D60]">
          <div className="flex space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-[#00ffa3] transition-colors p-2 hover:bg-[#1A1B23] rounded-lg"
            >
              <FiImage className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              className="text-gray-400 hover:text-[#00ffa3] transition-colors p-2 hover:bg-[#1A1B23] rounded-lg"
            >
              <FiClock className="w-5 h-5" />
              <span className="text-xs ml-1">{lockBlocks} blocks</span>
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !content.trim()}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              isLoading || !content.trim()
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-[#00ffa3] text-black hover:bg-[#00ff9d] hover:shadow-lg transform hover:scale-105'
            }`}
          >
            {isLoading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}; 