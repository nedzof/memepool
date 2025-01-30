import React, { useState, useCallback, useMemo, memo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { FiTrendingUp, FiLock, FiClock, FiZap, FiDollarSign } from 'react-icons/fi';
import SearchBar from '../frontend/components/SearchBar';

// Add Phantom provider type to the window object
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect: () => Promise<{ publicKey: { toString: () => string; } }>;
        disconnect: () => Promise<void>;
        request: (args: { method: string; }) => Promise<any>;
      };
    };
  }
}

interface HeaderProps {
  totalLocked: number;
  threshold: number;
  timeLeft: number;
  participantCount: number;
  roundNumber: number;
  onSearch?: (query: string) => void;
  onShowBSVModal?: () => void;
  btcAddress?: string;
  isPhantomInstalled?: boolean;
  connected?: boolean;
  onConnectPhantom?: () => void;
  onDisconnect?: () => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  totalLocked,
  threshold,
  timeLeft,
  participantCount,
  roundNumber,
  onSearch,
  onShowBSVModal,
  btcAddress,
  isPhantomInstalled,
  connected,
  onConnectPhantom,
  onDisconnect
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback((query: string) => {
    console.log('Search query:', query);
    if (onSearch) {
      onSearch(query);
    }
  }, [onSearch]);

  const formatBSV = useCallback((amount: number): string => {
    return `${amount.toFixed(2)} BSV`;
  }, []);

  const formatTimeElapsed = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const progress = useMemo(() => (totalLocked / threshold) * 100, [totalLocked, threshold]);

  const truncatedAddress = useMemo(() => 
    btcAddress ? btcAddress.slice(0, 4) + '...' + btcAddress.slice(-4) : 'Loading...',
    [btcAddress]
  );

  const progressElement = useMemo(() => (
    <div className="flex-grow">
      <div className="relative h-1.5 bg-[#3D3D60] rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#9945FF] to-[#FF00FF] transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <div className="flex items-center">
          <FiTrendingUp className="w-3 h-3 mr-1 text-[#9945FF]" />
          <span className="text-white/90">
            {progress >= 100 ? 'Round Complete!' : `${Math.floor(progress)}% to Goal`}
          </span>
        </div>
        {progress >= 70 && progress < 100 && (
          <div className="text-[#FF00FF] text-xs">Almost there! 🚀</div>
        )}
        {progress >= 100 && (
          <div className="text-[#9945FF] text-xs">Viral achieved! 🔥</div>
        )}
      </div>
    </div>
  ), [progress]);

  const walletButton = useMemo(() => (
    connected ? (
      <button
        onClick={onShowBSVModal}
        className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
      >
        <img 
          src="/images/phantom-icon.svg" 
          alt="Phantom" 
          className="w-4 h-4"
        />
        <span className="text-white text-sm font-mono">
          {truncatedAddress}
        </span>
      </button>
    ) : (
      <button
        onClick={onConnectPhantom}
        className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
      >
        <span className="text-white text-sm">
          {isPhantomInstalled ? 'Connect' : 'Download'}
        </span>
        <img 
          src="/images/phantom-icon.svg" 
          alt="Phantom" 
          className="w-4 h-4"
        />
      </button>
    )
  ), [connected, onShowBSVModal, truncatedAddress, onConnectPhantom, isPhantomInstalled]);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#2A2A40] to-[#1A1B23] shadow-xl">
      {/* Main Header */}
      <div className="max-w-7xl mx-auto">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center flex-shrink-0">
            <img src="/assets/images/Memepool_Logo.svg" alt="Memepool Logo" className="h-8" />
          </div>

          {/* Search Section */}
          <div className="flex-grow max-w-xl mx-8">
            <SearchBar onSearch={handleSearch} />
          </div>

          {/* Wallet Section */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {walletButton}
          </div>
        </div>

        {/* Round Stats Section */}
        <div className="border-t border-[#3D3D60]">
          <div className="px-4 py-2 flex items-center space-x-8">
            {/* Round Info */}
            <div className="flex items-center space-x-6">
              <div>
                <h2 className="text-base font-bold text-white">Round #{roundNumber}</h2>
                <div className="text-xs text-[#9945FF]/90">Block #{roundNumber}</div>
              </div>
              <div className="flex items-center text-[#FF00FF]">
                <FiClock className="w-4 h-4 mr-1.5" />
                <span className="font-mono text-base">{formatTimeElapsed(timeLeft)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex-grow flex items-center space-x-4">
              {progressElement}

              {/* Stats */}
              <div className="flex items-center space-x-4 flex-shrink-0">
                <div>
                  <div className="flex items-center text-[#9945FF]">
                    <FiLock className="w-3 h-3 mr-1" />
                    <span className="text-sm font-medium">{formatBSV(totalLocked)}</span>
                  </div>
                  <div className="text-[10px] text-white/60">Target: {formatBSV(threshold)}</div>
                </div>
                <div>
                  <div className="flex items-center text-[#FF00FF]">
                    <FiZap className="w-3 h-3 mr-1" />
                    <span className="text-sm font-medium">{participantCount}</span>
                  </div>
                  <div className="text-[10px] text-white/60">Memers</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// Memoize the entire component
export const Header = memo(HeaderComponent); 