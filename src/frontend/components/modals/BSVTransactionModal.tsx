import React, { useState, useEffect } from 'react';
import { FiX, FiSend, FiDownload, FiCopy, FiExternalLink, FiImage, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { walletManager } from '../../utils/wallet';
import { MemeVideoMetadata } from '../../../shared/types/meme';
import * as scrypt from 'scryptlib';
import styles from './WalletModal.module.css';
import { WalletType } from '../../../shared/types/wallet';
import { createPhantom } from '@phantom/wallet-sdk';
import { BtcAccount } from '../../types/phantom';

// Initialize Phantom with configuration
const initPhantom = () => {
  const opts = {
    zIndex: 10_000,
    hideLauncherBeforeOnboarded: true,
  };
  createPhantom(opts);
};

// BSV address validation regex
const BSV_ADDRESS_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

const validateBSVAddress = (address: string): boolean => {
  if (!address) return false;
  return BSV_ADDRESS_REGEX.test(address);
};

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number;
  timestamp: number;
  address: string;
}

interface BSVTransactionModalProps {
  onClose: () => void;
  onDisconnect: () => void;
  address: string;
  onAddressChange?: (newAddress: string) => void;
}

const BSVTransactionModal: React.FC<BSVTransactionModalProps> = ({ onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [isPhantomConnected, setIsPhantomConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Phantom when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      try {
        console.log('Initializing Phantom...');
        initPhantom();
        
        // Wait a bit for Phantom to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!isMounted) return;
        
        console.log('Checking Phantom installation...');
        console.log('Phantom object:', window.phantom);
        
        if (window.phantom?.bitcoin) {
          console.log('Phantom Bitcoin object:', window.phantom.bitcoin);
          console.log('Methods available:', Object.keys(window.phantom.bitcoin));
          // Don't auto-connect, wait for user interaction
          setIsPhantomConnected(false);
        } else {
          console.log('Phantom Bitcoin not detected');
          setError('Please install Phantom wallet to continue');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to initialize Phantom:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize Phantom');
      }
    };

    init();
    return () => { isMounted = false; };
  }, []);

  const connectToPhantom = async () => {
    try {
      setIsLoading(true);
      if (!window.phantom?.bitcoin) {
        throw new Error('Phantom Bitcoin not available');
      }

      console.log('Requesting Phantom BTC connection...');
      // Use request method with "connect" since that's what's available
      const response = await window.phantom.bitcoin.request({ 
        method: "connect",
        params: { onlyIfTrusted: false }
      });
      console.log('Connected with response:', response);

      // Get accounts after connection
      console.log('Requesting accounts...');
      const accounts = await window.phantom.bitcoin.request({
        method: "getAccounts"
      });
      console.log('Got accounts:', accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error('No BTC accounts available');
      }

      // Find the payment account first, fallback to first account
      const paymentAccount = accounts.find((acc: BtcAccount) => acc.purpose === 'payment') || accounts[0];
      const publicKey = paymentAccount.publicKey;
      
      if (!publicKey) {
        throw new Error('No public key available from Phantom');
      }

      setIsPhantomConnected(true);
    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Phantom');
      setIsPhantomConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Render connection UI
  const renderConnectionUI = () => {
    if (!window.phantom?.bitcoin) {
      return (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Please install Phantom wallet to continue</p>
          <a
            href="https://phantom.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Install Phantom
          </a>
        </div>
      );
    }

    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
        <p className="text-gray-400 mb-6">Connect your Phantom wallet to continue</p>
        <button
          onClick={connectToPhantom}
          disabled={isLoading}
          className={`px-6 py-3 ${
            isLoading 
              ? 'bg-purple-500/50 cursor-not-allowed' 
              : 'bg-purple-500 hover:bg-purple-600'
          } text-white rounded-lg transition-colors text-sm font-medium`}
        >
          {isLoading ? 'Connecting...' : 'Connect Phantom'}
        </button>
        {error && (
          <p className="mt-4 text-red-500 text-sm">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1E1F28] rounded-lg p-6 max-w-lg w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FiX size={24} />
        </button>

        {/* Show only connection UI until connected */}
        {!isPhantomConnected ? renderConnectionUI() : (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Successfully Connected!</h2>
            <p className="text-gray-400">Loading BSV wallet functionality...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BSVTransactionModal; 
