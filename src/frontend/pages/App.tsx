import '../utils/buffer-polyfill';
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PostGrid from '../components/PostGrid';
import Stats from './Stats';
import Layout from '../components/Layout';
import BSVTransactionModal from '../components/modals/BSVTransactionModal';
import { CreatePostModal } from '../components/modals/CreatePostModal';
import { useWallet } from '../providers/WalletProvider';
import { FiPlus } from 'react-icons/fi';

const App: React.FC = () => {
  const { 
    isPhantomInstalled, 
    connected, 
    btcAddress, 
    connect: connectPhantom,
    disconnect: disconnectPhantom
  } = useWallet();
  
  const [showBSVModal, setShowBSVModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [totalLocked, setTotalLocked] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);

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

  const handlePostCreated = () => {
    // Refresh the grid or update stats
    // This will be called after a post is successfully created
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <Layout
            totalLocked={totalLocked}
            participantCount={participantCount}
            btcAddress={btcAddress || ''}
            isPhantomInstalled={isPhantomInstalled}
            connected={connected}
            onShowBSVModal={() => setShowBSVModal(true)}
            onCreatePost={() => setShowCreatePostModal(true)}
            onConnectPhantom={handlePhantomClick}
            onDisconnect={handleDisconnect}
          />
        }>
          <Route index element={
            <div className="max-w-7xl mx-auto px-4 py-8">
              <PostGrid
                onStatsUpdate={(stats) => {
                  setTotalLocked(stats.totalLocked);
                  setParticipantCount(stats.participantCount);
                }}
              />
              {connected && (
                <button
                  onClick={() => setShowCreatePostModal(true)}
                  className="fixed bottom-8 right-8 bg-[#00ffa3] text-black p-4 rounded-full shadow-lg hover:bg-[#00ff9d] transition-colors"
                >
                  <FiPlus className="w-6 h-6" />
                </button>
              )}
            </div>
          } />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>

      {showBSVModal && btcAddress && (
        <BSVTransactionModal
          onClose={() => setShowBSVModal(false)}
          onDisconnect={handleDisconnect}
          address={btcAddress}
          onAddressChange={() => {}}
        />
      )}

      {showCreatePostModal && (
        <CreatePostModal
          onClose={() => setShowCreatePostModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </BrowserRouter>
  );
};

export default App; 