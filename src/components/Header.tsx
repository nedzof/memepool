import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { FiTrendingUp, FiLock, FiClock, FiZap, FiDollarSign, FiArrowUp, FiUsers, FiEdit3 } from 'react-icons/fi';

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
  participantCount: number;
  onShowBSVModal?: () => void;
  onCreatePost?: () => void;
  btcAddress?: string;
  isPhantomInstalled?: boolean;
  connected?: boolean;
  onConnectPhantom?: () => void;
  onDisconnect?: () => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  totalLocked,
  participantCount,
  onShowBSVModal,
  onCreatePost,
  btcAddress,
  isPhantomInstalled,
  connected,
  onConnectPhantom,
  onDisconnect
}) => {
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

  const formatBSV = useCallback((amount: number): string => {
    return `${amount.toFixed(2)} BSV`;
  }, []);

  const truncatedAddress = useMemo(() => 
    btcAddress ? btcAddress.slice(0, 4) + '...' + btcAddress.slice(-4) : 'Loading...',
    [btcAddress]
  );

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

  const createPostButton = useMemo(() => (
    connected && onCreatePost && (
      <button
        onClick={onCreatePost}
        className="flex items-center space-x-2 px-6 py-2 bg-[#00ffa3] hover:bg-[#00ff9d] text-black rounded-lg transition-all transform hover:scale-105 font-semibold shadow-lg"
      >
        <FiEdit3 className="w-5 h-5" />
        <span className="text-base">Create Post</span>
      </button>
    )
  ), [connected, onCreatePost]);

  return (
    <header className="sticky top-0 z-50 bg-[#1A1B23] border-b border-[#2A2A40]">
      <div className="max-w-7xl mx-auto">
        {/* Main Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center flex-shrink-0">
            <img src="/assets/images/Memepool_Logo.svg" alt="Memepool Logo" className="h-8" />
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            {createPostButton}
            {walletButton}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-2 flex items-center justify-between border-t border-[#2A2A40]">
          {/* Block Height */}
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

          {/* Stats */}
          <div className="flex items-center space-x-4">
            <div className="bg-[#2A2A40] px-3 py-1.5 rounded-lg">
              <div className="flex items-center text-[#00ffa3]">
                <FiLock className="w-3.5 h-3.5 mr-1" />
                <span className="text-sm font-bold">{formatBSV(totalLocked)}</span>
              </div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Total Locked</div>
            </div>
            <div className="bg-[#2A2A40] px-3 py-1.5 rounded-lg">
              <div className="flex items-center text-[#FF00FF]">
                <FiUsers className="w-3.5 h-3.5 mr-1" />
                <span className="text-sm font-bold animate-number-pulse">{participantCount}</span>
              </div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Memers</div>
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