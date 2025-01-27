import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';

// Add Phantom provider type to the window object
declare global {
  interface Window {
    phantom?: {
      solana?: any;
    };
  }
}

export const Header: React.FC = () => {
  console.log('[Header] Rendering Header component');
  
  const [searchQuery, setSearchQuery] = useState('');
  const { select, connected, publicKey, disconnect } = useWallet();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search query:', searchQuery);
    // TODO: Implement search functionality
  };

  const connectPhantom = async () => {
    if (typeof window.phantom !== 'undefined') {
      try {
        // Select and connect to Phantom wallet
        await select('phantom' as WalletName);
      } catch (error) {
        console.error('Error connecting to Phantom wallet:', error);
      }
    } else {
      // Redirect to Phantom wallet extension in Chrome Web Store
      window.open('https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa', '_blank');
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-gray-900 shadow-lg">
      {/* Logo Section */}
      <div className="flex items-center flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">Memepool</h1>
      </div>

      {/* Search Section */}
      <div className="flex-grow max-w-2xl mx-8">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for creators, wallets & inscriptions"
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Wallet Section */}
      <div className="flex items-center space-x-4 flex-shrink-0">
        {connected ? (
          <button
            onClick={disconnect}
            className="flex items-center px-3 py-1.5 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <span className="text-white text-sm">
              {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
            </span>
          </button>
        ) : (
          <button
            onClick={connectPhantom}
            className="flex items-center px-3 py-1.5 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <img src="/wallet-icons/phantom.png" alt="Phantom" className="w-5 h-5 mr-2" />
            <span className="text-white text-sm">Connect Phantom</span>
          </button>
        )}
      </div>
    </header>
  );
}; 