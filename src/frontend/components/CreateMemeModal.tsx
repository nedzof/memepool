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
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="bg-white p-8 rounded-lg shadow-lg z-10">
        <h2 className="text-2xl font-bold mb-4">Create Meme</h2>
        <MemeVideoForm onSubmit={handleSubmit} onCancel={onClose} />
      </div>
    </div>
  );
};

export default CreateMemeModal; 