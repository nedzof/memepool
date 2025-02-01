import '../utils/buffer-polyfill';
import React, { useState, useEffect } from 'react';
import MemeSubmissionGrid from '../components/MemeSubmissionGrid';
import SearchBar from '../components/SearchBar';
import BlocksLayout from '../components/BlocksLayout';
import BSVTransactionModal from '../components/modals/BSVTransactionModal';
import { MemeVideoMetadata } from '../../shared/types/meme';
import { useBlockMemes } from '../hooks/useBlockMemes';
import { useWallet } from '../providers/WalletProvider';
import { FiDollarSign } from 'react-icons/fi';
import { Header } from '../../components/Header';

const App: React.FC = () => {
  const { currentHeight } = useBlockMemes();
  const { 
    isPhantomInstalled, 
    connected, 
    btcAddress, 
    connect: connectPhantom,
    disconnect: disconnectPhantom
  } = useWallet();
  
  const [showBSVModal, setShowBSVModal] = useState(false);
  const [totalLocked, setTotalLocked] = useState(0);
  const [threshold] = useState(1000); // Default threshold
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);

  // Add timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Reset timer when round changes
  useEffect(() => {
    setTimeElapsed(0);
  }, [roundNumber]);

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
      await connectPhantom();
    } catch (error) {
      console.error('Error connecting to Phantom wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPhantom();
    } catch (error) {
      console.error('Error disconnecting from Phantom wallet:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1B23]">
      <Header
        totalLocked={totalLocked}
        threshold={threshold}
        timeLeft={timeElapsed}
        participantCount={participantCount}
        roundNumber={roundNumber}
        onSearch={handleSearch}
        onShowBSVModal={() => setShowBSVModal(true)}
        btcAddress={btcAddress || ''}
        isPhantomInstalled={isPhantomInstalled}
        connected={connected}
        onConnectPhantom={handlePhantomClick}
        onDisconnect={handleDisconnect}
      />

      <main>
        <BlocksLayout
          onCompete={handleCompete}
          onBlockClick={handleBlockClick}
          onShiftComplete={handleShiftComplete}
        />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <MemeSubmissionGrid
            onStatsUpdate={(stats) => {
              setTotalLocked(stats.totalLocked);
              setParticipantCount(stats.participantCount);
              setRoundNumber(stats.roundNumber);
            }}
          />
        </div>
      </main>

      {/* BSV Transaction Modal */}
      {showBSVModal && btcAddress && (
        <BSVTransactionModal
          onClose={() => setShowBSVModal(false)}
          onDisconnect={handleDisconnect}
          address={btcAddress}
          onAddressChange={() => {}} // Remove address change handler as it's managed by WalletProvider
        />
      )}
    </div>
  );
};

export default App; 