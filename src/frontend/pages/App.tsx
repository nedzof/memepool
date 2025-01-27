import React, { useState } from 'react';
import MemeSubmissionGrid from '../components/MemeSubmissionGrid';
import SearchBar from '../components/SearchBar';
import BlocksLayout from '../components/BlocksLayout';
import { MemeVideoMetadata } from '../../shared/types/meme';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { useBlockMemes } from '../hooks/useBlockMemes';

// Add Phantom provider type to the window object
declare global {
  interface Window {
    phantom?: {
      solana?: any;
    };
  }
}

const App: React.FC = () => {
  const { select, connected, publicKey, disconnect } = useWallet();
  const { currentHeight } = useBlockMemes();
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

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search query:', query);
  };

  const handleCompete = () => {
    console.log('Compete clicked');
  };

  const handleBlockClick = (block: any) => {
    console.log('Block clicked:', block);
  };

  const handleShiftComplete = () => {
    console.log('Shift complete');
  };

  const connectPhantom = async () => {
    if (typeof window.phantom !== 'undefined') {
      try {
        await select('phantom' as WalletName);
      } catch (error) {
        console.error('Error connecting to Phantom wallet:', error);
      }
    } else {
      window.open('https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa', '_blank');
    }
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
            {connected ? (
              <button
                onClick={disconnect}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <img 
                  src="/images/phantom-icon.svg" 
                  alt="Phantom" 
                  className="w-5 h-5"
                />
                <span className="text-white text-sm">
                  {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                </span>
              </button>
            ) : (
              <button
                onClick={connectPhantom}
                className="flex items-center space-x-2 text-white hover:text-white/80 transition-colors"
              >
                <span className="text-sm">Connect with</span>
                <img 
                  src="/images/phantom-icon.svg" 
                  alt="Phantom" 
                  className="w-6 h-6"
                />
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <BlocksLayout
          onCompete={handleCompete}
          onBlockClick={handleBlockClick}
          onShiftComplete={handleShiftComplete}
        />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="submissions-title">
            Submissions for Block #{currentHeight}
          </h2>
          <MemeSubmissionGrid />
        </div>
      </main>
    </div>
  );
};

export default App; 