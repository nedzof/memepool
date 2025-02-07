import React, { useState, useCallback, useMemo, memo } from 'react';
import { FiEdit3, FiLock, FiUsers, FiChevronDown, FiLogOut } from 'react-icons/fi';

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
  btcAddress: string;
  isPhantomInstalled: boolean;
  isYoursInstalled: boolean;
  connected: boolean;
  onShowBSVModal: () => void;
  onCreatePost: () => void;
  onConnectPhantom: () => void;
  onConnectYours: () => void;
  onDisconnect: () => void;
  activeWallet: 'phantom' | 'yours' | null;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  totalLocked,
  participantCount,
  btcAddress,
  isPhantomInstalled,
  isYoursInstalled,
  connected,
  onShowBSVModal,
  onCreatePost,
  onConnectPhantom,
  onConnectYours,
  onDisconnect,
  activeWallet
}) => {
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  const formatBSV = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const walletButton = useMemo(() => (
    connected ? (
      <button
        onClick={onShowBSVModal}
        className="flex items-center space-x-2 bg-[#1A1B23] text-[#00ffa3] px-4 py-2 rounded-lg hover:bg-[#2A2A40] transition-colors"
      >
        <span>{formatAddress(btcAddress)}</span>
        <FiChevronDown className="w-4 h-4" />
      </button>
    ) : (
      <div className="relative">
        <button
          onClick={() => setShowWalletDropdown(!showWalletDropdown)}
          className="flex items-center space-x-2 bg-[#00ffa3] text-black px-4 py-2 rounded-lg hover:bg-[#00ff9d] transition-colors"
        >
          <span>Connect Wallet</span>
          <FiChevronDown className="w-4 h-4" />
        </button>

        {showWalletDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-[#2A2A40] rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => {
                onConnectPhantom();
                setShowWalletDropdown(false);
              }}
              className="w-full px-4 py-3 text-left text-gray-300 hover:bg-[#1A1B23] hover:text-[#00ffa3] transition-colors flex items-center space-x-2"
            >
              <img src="/icons/phantom.svg" alt="Phantom" className="w-5 h-5" />
              <span>Phantom Wallet</span>
              {!isPhantomInstalled && (
                <span className="text-xs text-gray-500 ml-auto">Install</span>
              )}
            </button>

            <button
              onClick={() => {
                onConnectYours();
                setShowWalletDropdown(false);
              }}
              className="w-full px-4 py-3 text-left text-gray-300 hover:bg-[#1A1B23] hover:text-[#00ffa3] transition-colors flex items-center space-x-2"
            >
              <img src="/icons/yours.svg" alt="Yours" className="w-5 h-5" />
              <span>Yours Wallet</span>
              {!isYoursInstalled && (
                <span className="text-xs text-gray-500 ml-auto">Install</span>
              )}
            </button>
          </div>
        )}
      </div>
    )
  ), [connected, onShowBSVModal, btcAddress, onConnectPhantom, isPhantomInstalled, showWalletDropdown, onConnectYours, isYoursInstalled]);

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