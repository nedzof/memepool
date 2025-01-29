import React, { useState, useEffect } from 'react';
import MemeSubmissionGrid from '../components/MemeSubmissionGrid';
import SearchBar from '../components/SearchBar';
import BlocksLayout from '../components/BlocksLayout';
import BSVTransactionModal from '../components/modals/BSVTransactionModal';
import { MemeVideoMetadata } from '../../shared/types/meme';
import { useBlockMemes } from '../hooks/useBlockMemes';
import { generateBtcAddress } from '../utils/wallet';
import { FiDollarSign } from 'react-icons/fi';

// Add Phantom provider type to the window object
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
        request: (args: { method: string }) => Promise<{ publicKey: { toString: () => string } }>;
      };
    };
  }
}

const App: React.FC = () => {
  const { currentHeight } = useBlockMemes();
  const [isPhantomInstalled, setIsPhantomInstalled] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string>('');
  const [btcAddress, setBtcAddress] = useState<string>('');
  const [showBSVModal, setShowBSVModal] = useState(false);

  useEffect(() => {
    const provider = window?.phantom?.solana;
    setIsPhantomInstalled(provider?.isPhantom || false);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      try {
        const address = generateBtcAddress(publicKey);
        console.log('Generated BSV address:', address);
        setBtcAddress(address);
      } catch (error) {
        console.error('Error generating BSV address:', error);
        setBtcAddress('');
      }
    } else {
      setBtcAddress('');
    }
  }, [connected, publicKey]);

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

  const handlePhantomClick = async () => {
    if (!isPhantomInstalled) {
      window.open('https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa', '_blank');
      return;
    }

    try {
      const provider = window.phantom?.solana;
      if (!provider) return;

      // This will trigger the connection approval modal
      const resp = await provider.connect();
      const pubKey = resp.publicKey.toString();
      setPublicKey(pubKey);
      setConnected(true);
      console.log('Connected with public key:', pubKey);
    } catch (error) {
      console.error('Error connecting to Phantom wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      const provider = window.phantom?.solana;
      if (!provider) return;

      await provider.disconnect();
      setConnected(false);
      setPublicKey('');
      setBtcAddress('');
    } catch (error) {
      console.error('Error disconnecting from Phantom wallet:', error);
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

          <div className="flex-shrink-0 flex items-center space-x-4">
            {connected && btcAddress && (
              <button
                onClick={() => setShowBSVModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#00ffa3]/10 hover:bg-[#00ffa3]/20 rounded-lg transition-colors text-[#00ffa3]"
              >
                <FiDollarSign className="w-5 h-5" />
                <span className="text-sm">BSV Wallet</span>
              </button>
            )}
            
            {connected ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <img 
                  src="/images/phantom-icon.svg" 
                  alt="Phantom" 
                  className="w-5 h-5"
                />
                <span className="text-white text-sm font-mono">
                  {btcAddress ? btcAddress.slice(0, 6) + '...' + btcAddress.slice(-6) : 'Loading...'}
                </span>
              </button>
            ) : (
              <button
                onClick={handlePhantomClick}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <span className="text-white text-sm">
                  {isPhantomInstalled ? 'Connect with' : 'Download'}
                </span>
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

      {/* BSV Transaction Modal */}
      {showBSVModal && btcAddress && (
        <BSVTransactionModal
          onClose={() => setShowBSVModal(false)}
          address={btcAddress}
        />
      )}
    </div>
  );
};

export default App; 