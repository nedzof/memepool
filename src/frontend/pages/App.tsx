import '../utils/buffer-polyfill';
import React, { useState } from 'react';
import MemeSubmissionGrid from '../components/MemeSubmissionGrid';
import BSVTransactionModal from '../components/modals/BSVTransactionModal';
import { useWallet } from '../providers/WalletProvider';
import { Header } from '../../components/Header';

const App: React.FC = () => {
  const { 
    isPhantomInstalled, 
    connected, 
    btcAddress, 
    connect: connectPhantom,
    disconnect: disconnectPhantom
  } = useWallet();
  
  const [showBSVModal, setShowBSVModal] = useState(false);
  const [totalLocked, setTotalLocked] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [timeLeft] = useState(0);
  const [threshold] = useState(1000);

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
        timeLeft={timeLeft}
        participantCount={participantCount}
        roundNumber={roundNumber}
        onShowBSVModal={() => setShowBSVModal(true)}
        btcAddress={btcAddress || ''}
        isPhantomInstalled={isPhantomInstalled}
        connected={connected}
        onConnectPhantom={handlePhantomClick}
        onDisconnect={handleDisconnect}
      />

      <main>
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

      {showBSVModal && btcAddress && (
        <BSVTransactionModal
          onClose={() => setShowBSVModal(false)}
          onDisconnect={handleDisconnect}
          address={btcAddress}
          onAddressChange={() => {}}
        />
      )}
    </div>
  );
};

export default App; 