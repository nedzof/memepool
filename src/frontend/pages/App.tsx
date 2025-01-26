import React, { useState } from 'react';
import WalletModal from '../components/modals/WalletModal';
import MemeSubmissionGrid from '../components/MemeSubmissionGrid';
import { Wallet } from '../../shared/types/wallet';

const App: React.FC = () => {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const handleWalletSuccess = (wallet: Wallet) => {
    setWallet(wallet);
    setIsWalletModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#1A1B23]">
      <header className="bg-[#222235] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <img src="/Memepool_Logo.png" alt="Memepool Logo" className="h-10" />
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
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <MemeSubmissionGrid />
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