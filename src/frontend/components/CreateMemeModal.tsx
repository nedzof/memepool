import React, { useState } from 'react';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import MemeVideoForm from './MemeVideoForm';

interface CreateMemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemeCreated: (metadata: MemeVideoMetadata) => void;
}

const CreateMemeModal: React.FC<CreateMemeModalProps> = ({ isOpen, onClose, onMemeCreated }) => {
  const handleSubmit = (metadata: MemeVideoMetadata) => {
    onMemeCreated(metadata);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-[#1A1B23]/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-[#222235] p-8 rounded-2xl shadow-xl z-10 w-full max-w-2xl mx-4">
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
          Create Meme
        </h2>
        <div className="bg-[#1A1B23] rounded-xl p-6">
          <MemeVideoForm onSubmit={handleSubmit} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
};

export default CreateMemeModal; 