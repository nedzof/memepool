import React, { useState } from 'react';
import WalletModal from '../components/modals/WalletModal';
import { Wallet } from '../../shared/types/wallet';

const App: React.FC = () => {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const handleWalletSuccess = (wallet: Wallet) => {
    setWallet(wallet);
    setIsWalletModalOpen(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <img src="/Memepool_Logo.png" alt="Memepool Logo" className="app-logo" />
        <button onClick={() => setIsWalletModalOpen(true)}>
          {wallet ? 'Connected' : 'Connect Wallet'}
        </button>
      </header>

      <main className="app-main">
        {/* Add your main content here */}
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