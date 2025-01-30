import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { FiTrendingUp, FiLock, FiClock, FiZap, FiDollarSign, FiArrowUp } from 'react-icons/fi';
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
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [isHeightLoading, setIsHeightLoading] = useState(true);

  // Fetch current block height
  useEffect(() => {
    const fetchBlockHeight = async () => {
      try {
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/chain/info');
        const data = await response.json();
        setBlockHeight(data.blocks);
      } catch (error) {
        console.error('Failed to fetch block height:', error);
      } finally {
        setIsHeightLoading(false);
      }
    };

    fetchBlockHeight();
    const interval = setInterval(fetchBlockHeight, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

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
    <div className="flex-grow relative">
      <div className="relative h-2 bg-[#2A2A40] rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-500 ${
            progress >= 100 
              ? 'bg-gradient-to-r from-[#00ffa3] via-[#00ffa3] to-[#9945FF] animate-pulse'
              : progress >= 70
              ? 'bg-gradient-to-r from-[#FFB800] to-[#FF00FF] animate-progress-pulse'
              : 'bg-gradient-to-r from-[#FF0000] to-[#FF00FF]'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs mt-1.5">
        <div className="flex items-center">
          <div className={`flex items-center ${
            progress >= 100 ? 'text-[#00ffa3] animate-bounce' : 'text-white/90'
          }`}>
            <FiArrowUp className={`w-3 h-3 mr-1 ${progress >= 70 ? 'animate-pulse' : ''}`} />
            <span className="font-bold">
              {progress >= 100 ? 'VIRAL AF 🔥' : `${Math.floor(progress)}% TO MOON`}
            </span>
          </div>
        </div>
        {progress >= 70 && progress < 100 && (
          <div className="text-[#FFB800] text-xs font-bold animate-pulse">ALMOST VIRAL! 🚀</div>
        )}
      </div>
    </div>
  ), [progress]);

  const walletButton = useMemo(() => (
    connected ? (
      <button
        onClick={onShowBSVModal}
        className="flex items-center space-x-2 px-3 py-1.5 bg-[#2A2A40] hover:bg-[#3D3D60] rounded-lg transition-all transform hover:scale-105"
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
        className="flex items-center space-x-2 px-3 py-1.5 bg-[#2A2A40] hover:bg-[#3D3D60] rounded-lg transition-all transform hover:scale-105"
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
    <header className="sticky top-0 z-50 bg-[#1A1B23] border-b border-[#2A2A40]">
      <div className="max-w-7xl mx-auto">
        {/* Main Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center flex-shrink-0">
            <img src="/assets/images/Memepool_Logo.svg" alt="Memepool Logo" className="h-8" />
          </div>

          <div className="flex-grow max-w-xl mx-8">
            <SearchBar onSearch={handleSearch} />
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            {walletButton}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-2 flex items-center space-x-6">
          {/* Block Height */}
          <div className="flex items-center space-x-4">
            <div className="bg-[#2A2A40] px-3 py-1.5 rounded-lg">
              <div className={`font-mono text-lg font-bold ${isHeightLoading ? 'animate-pulse' : ''}`}>
                {isHeightLoading ? (
                  <span className="text-[#9945FF]">Loading...</span>
                ) : (
                  <span className="text-[#00ffa3] animate-number-pulse">{blockHeight?.toLocaleString()}</span>
                )}
              </div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Block Height</div>
            </div>
            <div className="flex items-center text-[#FF00FF] animate-heartbeat">
              <FiClock className="w-4 h-4 mr-1.5" />
              <span className="font-mono text-base font-bold">{formatTimeElapsed(timeLeft)}</span>
            </div>
          </div>

          {/* Progress Section */}
          <div className="flex-grow flex items-center space-x-4">
            {progressElement}

            {/* Stats */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="bg-[#2A2A40] px-3 py-1.5 rounded-lg">
                <div className="flex items-center text-[#00ffa3]">
                  <FiLock className="w-3.5 h-3.5 mr-1" />
                  <span className="text-sm font-bold">{formatBSV(totalLocked)}</span>
                </div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider">
                  Target: {formatBSV(threshold)}
                </div>
              </div>
              <div className="bg-[#2A2A40] px-3 py-1.5 rounded-lg">
                <div className="flex items-center text-[#FF00FF]">
                  <FiZap className="w-3.5 h-3.5 mr-1" />
                  <span className="text-sm font-bold animate-number-pulse">{participantCount}</span>
                </div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider">Memers</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// Add new animations to tailwind.config.js
const animations = {
  'number-pulse': {
    '0%, 100%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.1)' }
  },
  'progress-pulse': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.7 }
  },
  'heartbeat': {
    '0%, 100%': { transform: 'scale(1)' },
    '25%': { transform: 'scale(1.1)' },
    '50%': { transform: 'scale(1)' },
    '75%': { transform: 'scale(1.1)' }
  }
};

export const Header = memo(HeaderComponent); 