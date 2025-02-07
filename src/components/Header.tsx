import React, { useState, useCallback, useMemo, memo } from 'react';
import { FiEdit3 } from 'react-icons/fi';

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
}) => {
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
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <img src="/assets/images/Memepool_Logo.svg" alt="Memepool Logo" className="h-8" />
            <div className="text-[#00ffa3] font-mono">
              <span className="font-bold">{formatBSV(totalLocked)}</span>
              <span className="text-white/60 text-sm ml-2">locked</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {createPostButton}
            {walletButton}
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