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
              onClick={() => {
                const url = prompt('Enter Twitter URL:');
                if (url) handleTwitterLinkPaste(url);
              }}
              className="text-gray-400 hover:text-[#00ffa3] transition-colors p-2 hover:bg-[#1A1B23] rounded-lg"
            >
              <FiTwitter className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) handleLinkPaste(url);
              }}
              className="text-gray-400 hover:text-[#00ffa3] transition-colors p-2 hover:bg-[#1A1B23] rounded-lg"
            >
              <FiLink className="w-5 h-5" />
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