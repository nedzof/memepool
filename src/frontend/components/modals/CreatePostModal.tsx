import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiImage, FiTwitter, FiLink } from 'react-icons/fi';
import { walletManager } from '../../utils/wallet';
import { storageService } from '../../services/storage.service';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<{ url: string; title: string; image: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTwitterLinkPaste = async (url: string) => {
    if (url.match(/twitter\.com|x\.com/)) {
      setContent((prev) => prev + url);
      // You could add Twitter card preview here
    }
  };

  const handleLinkPaste = async (url: string) => {
    try {
      // In a real implementation, you would fetch the link preview data
      // For now, we'll just add the link to the content
      setContent((prev) => prev + url);
    } catch (error) {
      console.error('Failed to fetch link preview:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const wallet = walletManager.getWallet();
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      // Create the post
      const post = {
        content,
        image: imagePreview,
        timestamp: Date.now(),
      };

      // In a real implementation, you would:
      // 1. Upload any images to a storage service
      // 2. Create a transaction with the post data
      // 3. Sign the transaction with the wallet
      // 4. Broadcast the transaction

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulating network request

      onPostCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-[#2A2A40] rounded-lg p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Create Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full h-32 bg-[#1A1B23] text-white rounded-lg p-4 mb-4 resize-none"
        />

        {imagePreview && (
          <div className="relative mb-4">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-64 rounded-lg object-contain"
            />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1"
            >
              <FiX className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {linkPreview && (
          <div className="mb-4 border border-gray-700 rounded-lg p-4">
            <img
              src={linkPreview.image}
              alt={linkPreview.title}
              className="w-full h-32 object-cover rounded-lg mb-2"
            />
            <h3 className="text-white font-semibold">{linkPreview.title}</h3>
            <p className="text-gray-400 text-sm">{linkPreview.url}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiImage className="w-6 h-6" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => {
                const url = prompt('Enter Twitter URL:');
                if (url) handleTwitterLinkPaste(url);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiTwitter className="w-6 h-6" />
            </button>
            <button
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) handleLinkPaste(url);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiLink className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !content.trim()}
            className={`px-6 py-2 rounded-lg font-semibold ${
              isLoading || !content.trim()
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-[#00ffa3] text-black hover:bg-[#00ff9d] transition-colors'
            }`}
          >
            {isLoading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}; 