import React, { useState, useEffect, lazy } from 'react';
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

const BSVTransactionContent = lazy(() => import('./BSVTransactionContent'));

const BSVTransactionModal: React.FC<BSVTransactionModalProps> = ({ onClose, onDisconnect, address, onAddressChange }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'history'>('send');
  const [sendAmount, setSendAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userMemes, setUserMemes] = useState<MemeVideoMetadata[]>([]);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhantomConnected, setIsPhantomConnected] = useState(false);
  const [isPhantomInitialized, setIsPhantomInitialized] = useState(false);
  const [accounts, setAccounts] = useState<BtcAccount[]>([]);

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
          setIsPhantomInitialized(true);
          // Automatically trigger connection
          connectToPhantom();
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
      if (!window.phantom?.bitcoin) {
        throw new Error('Phantom Bitcoin not available');
      }

      console.log('Requesting Phantom BTC accounts...');
      const accounts = await window.phantom.bitcoin.requestAccounts();
      console.log('Connected with accounts:', accounts);
      setAccounts(accounts);
      setIsPhantomConnected(true);
    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Phantom');
      setIsPhantomConnected(false);
    }
  };

  const handlePhantomDisconnect = async () => {
    try {
      if (window.phantom?.bitcoin) {
        await window.phantom.bitcoin.disconnect();
      }
      setIsPhantomConnected(false);
      setAccounts([]);
      onDisconnect();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  useEffect(() => {
    const fetchUserMemes = async () => {
      try {
        // TODO: Replace with actual API call
        // For now, using mock data
        const mockMemes: MemeVideoMetadata[] = [
          {
            id: 'meme1',
            title: 'My First Meme',
            description: 'A funny meme I created',
            videoUrl: 'https://example.com/meme1.mp4',
            inscriptionId: 'insc1',
            blockHeight: 123456,
            createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          },
          {
            id: 'meme2',
            title: 'Another Great Meme',
            description: 'My second meme creation',
            videoUrl: 'https://example.com/meme2.mp4',
            inscriptionId: 'insc2',
            blockHeight: 123457,
            createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
          }
        ];
        setUserMemes(mockMemes);
      } catch (error) {
        console.error('Failed to fetch user memes:', error);
      }
    };

    if (activeTab === 'history') {
      fetchUserMemes();
    }
  }, [activeTab]);

  useEffect(() => {
    console.log('Address prop changed:', address);
    if (!validateBSVAddress(address)) {
      console.log('Address validation failed');
      setError('Invalid BSV address format');
      setIsValidAddress(false);
      return;
    }
    console.log('Address validation passed, updating state');
    setIsValidAddress(true);
    setError(null);
  }, [address]);

  const handleSend = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Check Phantom wallet connection first
      const phantom = window.phantom?.bitcoin;
      if (!phantom) {
        throw new Error('Please install Phantom wallet to continue');
      }

      if (!isPhantomConnected) {
        try {
          console.log('Requesting Phantom accounts...');
          const accounts = await phantom.requestAccounts();
          setIsPhantomConnected(true);
          console.log('Connected with accounts:', accounts);
        } catch (err) {
          throw new Error('Please connect your Phantom wallet to continue');
        }
      }

      const amount = parseFloat(sendAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }
      if (!recipientAddress) {
        throw new Error('Invalid recipient address');
      }

      const wallet = walletManager.getWallet();
      if (wallet) {
        const txId = await wallet.sendPayment(recipientAddress, amount);
        // Add transaction to history
        const newTransaction: Transaction = {
          id: String(txId),
          type: 'send',
          amount,
          timestamp: Date.now(),
          address: recipientAddress
        };
        setTransactions(prev => [newTransaction, ...prev]);
        
        // Reset form
        setSendAmount('');
        setRecipientAddress('');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Add a key to force QR code re-render
  const qrKey = `${address}-${isValidAddress}`;

  // Render Phantom connection status
  const renderPhantomStatus = () => {
    if (!isPhantomInitialized) {
      return (
        <a
          href="https://phantom.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-lg transition-colors text-sm"
        >
          Install Phantom
        </a>
      );
    }

    if (!isPhantomConnected) {
      return (
        <button
          onClick={connectToPhantom}
          className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-lg transition-colors text-sm"
        >
          Connect Phantom
        </button>
      );
    }

    return (
      <button
        onClick={handlePhantomDisconnect}
        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm"
      >
        Disconnect Phantom
      </button>
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

        {error && (
          <div className="p-4 bg-red-500/10 border-l-4 border-red-500 text-red-400 rounded mb-4">
            {error}
          </div>
        )}

        {isPhantomConnected && accounts.length > 0 ? (
          <BSVTransactionContent 
            accounts={accounts}
            onClose={onClose}
            onDisconnect={handlePhantomDisconnect}
            address={address}
            onAddressChange={onAddressChange}
          />
        ) : (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-gray-400 mb-4">Waiting for Phantom wallet connection...</div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BSVTransactionModal; 
