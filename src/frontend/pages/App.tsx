import React, { useState } from 'react';
import WalletModal from '../components/modals/WalletModal';
import MemeSubmissionGrid from '../components/MemeSubmissionGrid';
import SearchBar from '../components/SearchBar';
import BlocksLayout from '../components/BlocksLayout';
import { Wallet } from '../../shared/types/wallet';
import { MemeVideoMetadata } from '../../shared/types/meme';

const App: React.FC = () => {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  
  // Mock data for blocks layout
  const [pastBlocks] = useState<MemeVideoMetadata[]>([
    {
      id: 'past1',
      title: 'Past Meme 1',
      description: 'A funny meme from the past',
      videoUrl: 'https://example.com/video1.mp4',
      inscriptionId: 'insc1',
      blockHeight: 123456,
      createdAt: new Date().toISOString()
    },
    {
      id: 'past2',
      title: 'Past Meme 2',
      description: 'Another funny meme from the past',
      videoUrl: 'https://example.com/video2.mp4',
      inscriptionId: 'insc2',
      blockHeight: 123457,
      createdAt: new Date().toISOString()
    }
  ]);

  const [currentMeme] = useState<MemeVideoMetadata | null>({
    id: 'current',
    title: 'Current Hot Meme',
    description: 'The currently trending meme',
    videoUrl: 'https://example.com/current.mp4',
    inscriptionId: 'insc3',
    blockHeight: 123458,
    createdAt: new Date().toISOString()
  });

  const [upcomingBlocks] = useState<MemeVideoMetadata[]>([
    {
      id: 'upcoming1',
      title: 'Upcoming Meme 1',
      description: 'A meme from the future',
      videoUrl: 'https://example.com/video3.mp4',
      inscriptionId: 'insc4',
      blockHeight: 123459,
      createdAt: new Date().toISOString()
    },
    {
      id: 'upcoming2',
      title: 'Upcoming Meme 2',
      description: 'Another meme from the future',
      videoUrl: 'https://example.com/video4.mp4',
      inscriptionId: 'insc5',
      blockHeight: 123460,
      createdAt: new Date().toISOString()
    }
  ]);

  const handleWalletSuccess = (wallet: Wallet) => {
    setWallet(wallet);
    setIsWalletModalOpen(false);
  };

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search query:', query);
  };

  return (
    <div className="min-h-screen bg-[#1A1B23]">
      <header className="bg-[#222235] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <img src="/assets/images/Memepool_Logo.svg" alt="Memepool Logo" className="h-10" />
          </div>
          
          <div className="flex-grow flex justify-center">
            <SearchBar onSearch={handleSearch} />
          </div>
          
          <div className="flex-shrink-0">
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                wallet
                  ? 'bg-[#14F195] text-[#1A1B23]'
                  : 'bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white'
              }`}
            >
              {wallet ? 'Connected' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>

      <main>
        <BlocksLayout
          pastBlocks={pastBlocks}
          currentMeme={currentMeme}
          upcomingBlocks={upcomingBlocks}
        />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <MemeSubmissionGrid />
        </div>
      </main>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSuccess={handleWalletSuccess}
        onCancel={() => setIsWalletModalOpen(false)}
      />
    </div>
  );
};

export default App; 