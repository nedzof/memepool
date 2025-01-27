import React from 'react';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import MemeVideoForm from './MemeVideoForm';

interface Block {
  id: string;
  imageUrl: string;
  blockNumber: number;
  txId?: string;
  creator?: string;
  timestamp?: Date;
}

interface CreateMemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemeCreated: (metadata: MemeVideoMetadata) => void;
  currentBlock: Block | undefined;
}

const CreateMemeModal: React.FC<CreateMemeModalProps> = ({
  isOpen,
  onClose,
  onMemeCreated,
  currentBlock,
}) => {
  if (!isOpen || !currentBlock) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90">
      <div className="min-h-screen">
        {/* Close button */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="max-w-lg mx-auto pt-8 pb-16 px-4">
          {/* Block Image */}
          <div className="relative mb-6">
            <div className="aspect-square rounded-3xl overflow-hidden bg-[#2A2A40] shadow-[0_8px_32px_rgba(0,255,163,0.2)]">
              <img
                src={currentBlock.imageUrl}
                alt="Block"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 text-[#00ffa3] font-mono text-sm">
              #{currentBlock.blockNumber}
            </div>
          </div>

          {/* Form */}
          <MemeVideoForm
            onSubmit={(metadata) => {
              onMemeCreated(metadata);
              onClose();
            }}
            onCancel={onClose}
            currentBlock={currentBlock}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateMemeModal; 