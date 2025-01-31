import React, { useState, useEffect } from 'react';
import { FiX, FiSend, FiDownload, FiCopy, FiExternalLink, FiImage, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { walletManager } from '../../utils/wallet';
import { MemeVideoMetadata } from '../../../shared/types/meme';
import * as scrypt from 'scryptlib';
import styles from './WalletModal.module.css';
import { WalletType } from '../../../shared/types/wallet';
import { createPhantom } from '@phantom/wallet-sdk';
import { BtcAccount, PhantomBitcoinProvider } from '../../types/phantom';

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
      setIsPhantomConnected(true);

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

      // Initialize BSV wallet with the public key
      console.log('Using Phantom public key to initialize BSV wallet:', publicKey);
      const wallet = await walletManager.connect(WalletType.BSV, publicKey);
      
      if (wallet) {
        const balance = await wallet.getBalance();
        setBalance(balance);
        console.log('BSV wallet initialized with Phantom public key');
      }
    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Phantom');
      setIsPhantomConnected(false);
    }
  };

  const handlePhantomDisconnect = async () => {
    try {
      const phantom = window.phantom?.bitcoin;
      if (phantom) {
        await phantom.request({ method: "disconnect" });
      }
      setIsPhantomConnected(false);
      // Also disconnect BSV wallet since it depends on Phantom
      await walletManager.disconnect();
      setBalance(0);
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
    const phantom = window.phantom?.bitcoin;
    if (!phantom) {
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

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">BSV Wallet</h2>
          {renderPhantomStatus()}
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-[#2A2B36] rounded-lg p-1">
          {['send', 'receive', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'send' | 'receive' | 'history')}
              className={`flex-1 py-2 px-4 rounded-md ${
                activeTab === tab
                  ? 'bg-[#3B3C4A] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'send' && (
            <div className="space-y-4">
              {error && (
                <div className="p-4 bg-red-500/10 border-l-4 border-red-500 text-red-400 rounded">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-gray-400 mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full p-3 bg-[#2A2B36] border border-[#3D3D60] rounded-lg text-white focus:outline-none focus:border-[#00ffa3]"
                  placeholder="Enter BSV address"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Amount (BSV)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="w-full p-3 bg-[#2A2B36] border border-[#3D3D60] rounded-lg text-white focus:outline-none focus:border-[#00ffa3]"
                    placeholder="0.0"
                    step="0.00000001"
                    min="0"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    BSV
                  </div>
                </div>
                {balance > 0 && (
                  <div className="text-right mt-1">
                    <button
                      onClick={() => setSendAmount(balance.toString())}
                      className="text-sm text-[#00ffa3] hover:underline"
                    >
                      Max: {balance} BSV
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={!recipientAddress || !sendAmount || isLoading || !isPhantomConnected}
                className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 ${
                  !recipientAddress || !sendAmount || isLoading || !isPhantomConnected
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-[#00ffa3] hover:bg-[#00ffa3]/80'
                } text-black font-medium transition-colors`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiSend className="w-5 h-5" />
                    <span>Send BSV</span>
                  </>
                )}
              </button>

              {!isPhantomConnected && (
                <p className="text-sm text-center text-gray-400">
                  Please connect your Phantom wallet to send BSV
                </p>
              )}
            </div>
          )}

          {activeTab === 'receive' && (
            <div className="space-y-4">
              <div className="bg-[#2A2B36] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Your BSV Address</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(address)}
                      className="text-gray-400 hover:text-white"
                      title="Copy address"
                    >
                      {copySuccess ? <FiCheck size={20} /> : <FiCopy size={20} />}
                    </button>
                  </div>
                </div>
                <div className="break-all text-white font-mono text-sm">
                  {address}
                </div>
              </div>
              <div className="flex justify-center">
                <QRCodeSVG
                  value={address}
                  size={200}
                  bgColor="#2A2B36"
                  fgColor="#FFFFFF"
                  level="L"
                  includeMargin={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-[#2A2B36] p-4 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm text-gray-400">
                        {tx.type === 'send' ? 'Sent to' : 'Received from'}
                      </p>
                      <p className="text-white font-mono text-sm">{tx.address}</p>
                      <p className="text-sm text-gray-400">{formatDate(tx.timestamp)}</p>
                    </div>
                    <div className="text-right">
                      <p className={tx.type === 'send' ? 'text-red-400' : 'text-[#00ffa3]'}>
                        {tx.type === 'send' ? '-' : '+'}{tx.amount} BSV
                      </p>
                      <a
                        href={`https://whatsonchain.com/tx/${tx.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#00ffa3] hover:underline flex items-center justify-end"
                      >
                        View <FiExternalLink className="ml-1" />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400">
                  No transactions yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BSVTransactionModal; 
