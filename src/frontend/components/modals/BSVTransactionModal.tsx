import React, { useState, useEffect } from 'react';
import { FiX, FiSend, FiDownload, FiCopy, FiExternalLink, FiImage, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { walletManager } from '../../utils/wallet';
import { MemeVideoMetadata } from '../../../shared/types/meme';
import * as scrypt from 'scryptlib';
import styles from './WalletModal.module.css';
import { WalletType } from '../../../shared/types/wallet';
import { PhantomWallet } from '../../utils/wallets/phantom-wallet';

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
  const [isChangingAddress, setIsChangingAddress] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhantomConnected, setIsPhantomConnected] = useState(false);
  const phantomWallet = PhantomWallet.getInstance();

  const initializePhantom = async () => {
    try {
      console.log('Checking Phantom installation...');
      if (!phantomWallet.isPhantomInstalled()) {
        console.log('Phantom not installed');
        setError('Please install Phantom wallet to continue');
        return;
      }

      // First, request Phantom BTC connection - this will show the modal
      console.log('Requesting Phantom BTC connection...');
      const btcAccount = await phantomWallet.requestConnection();
      setIsPhantomConnected(true);
      console.log('Connected to Phantom with BTC account:', btcAccount);

      // Get the public key from the BTC account
      const publicKey = btcAccount.publicKey;
      if (!publicKey) {
        throw new Error('No public key available from Phantom');
      }

      // Only after successful Phantom connection, initialize BSV wallet with the public key
      console.log('Using Phantom public key to initialize BSV wallet...');
      const wallet = await walletManager.connect(WalletType.BSV, publicKey);
      if (wallet) {
        const balance = await wallet.getBalance();
        setBalance(balance);
        console.log('BSV wallet initialized with Phantom public key');
      }
    } catch (error) {
      console.error('Failed to initialize Phantom:', error);
      setError('Please connect your Phantom wallet to continue');
      setIsPhantomConnected(false);
    }
  };

  useEffect(() => {
    initializePhantom();
  }, []);

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
      if (!phantomWallet.isPhantomInstalled()) {
        throw new Error('Please install Phantom wallet to continue');
      }

      if (!isPhantomConnected) {
        try {
          console.log('Requesting Phantom connection...');
          const account = await phantomWallet.connect();
          setIsPhantomConnected(true);
          console.log('Connected to Phantom with account:', account);
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

  const handlePhantomConnect = async () => {
    try {
      setError(null);
      if (!phantomWallet.isPhantomInstalled()) {
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Request Phantom BTC connection first - this will show the modal
      console.log('Requesting Phantom BTC connection...');
      const btcAccount = await phantomWallet.requestConnection();
      setIsPhantomConnected(true);
      console.log('Connected to Phantom with BTC account:', btcAccount);

      // Get the public key from the BTC account
      const publicKey = btcAccount.publicKey;
      if (!publicKey) {
        throw new Error('No public key available from Phantom');
      }

      // Only after successful Phantom connection, initialize BSV wallet with the public key
      console.log('Using Phantom public key to initialize BSV wallet...');
      const wallet = await walletManager.connect(WalletType.BSV, publicKey);
      if (wallet) {
        const balance = await wallet.getBalance();
        setBalance(balance);
        console.log('BSV wallet initialized with Phantom public key');
      }
    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      setError('Failed to connect to Phantom wallet');
      setIsPhantomConnected(false);
    }
  };

  const handlePhantomDisconnect = async () => {
    try {
      await phantomWallet.disconnect();
      setIsPhantomConnected(false);
      // Also disconnect BSV wallet since it depends on Phantom
      await walletManager.disconnect();
      setBalance(0);
    } catch (error) {
      console.error('Error disconnecting from Phantom:', error);
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

  const generateNewAddress = async () => {
    try {
      console.log('Starting new address generation...');
      setIsChangingAddress(true);
      setError(null);
      
      const wallet = walletManager.getWallet();
      console.log('Current wallet state:', wallet);
      
      if (!wallet) {
        console.error('No wallet instance found');
        throw new Error('Wallet not initialized. Please try disconnecting and connecting again.');
      }

      if (!wallet.deriveNextAddress) {
        console.error('Wallet does not support address derivation');
        throw new Error('This wallet does not support generating new addresses');
      }

      console.log('Calling deriveNextAddress...');
      const newAddress = await wallet.deriveNextAddress();
      console.log('Received new address:', newAddress);
      
      if (!validateBSVAddress(newAddress)) {
        console.error('Invalid address generated:', newAddress);
        throw new Error('Generated address is invalid');
      }
      console.log('Address validation passed');

      // Update the address through the parent component
      console.log('Calling onAddressChange with new address:', newAddress);
      if (onAddressChange) {
        onAddressChange(newAddress);
      }
      
      setIsValidAddress(true);
      console.log('Address update complete');
    } catch (error) {
      console.error('Failed to generate new address:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate new address');
      setIsValidAddress(false);
    } finally {
      setIsChangingAddress(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-4)}`;
  };

  // Add a key to force QR code re-render
  const qrKey = `${address}-${isValidAddress}`;

  // Render Phantom connection status
  const renderPhantomStatus = () => {
    if (!phantomWallet.isPhantomInstalled()) {
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
          onClick={handlePhantomConnect}
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
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-[#1A1B23] rounded-xl w-full max-w-2xl overflow-hidden border border-[#00ffa3]/30">
          {/* Header */}
          <div className="p-4 border-b border-[#2A2A40] flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#00ffa3]">BSV Wallet</h2>
            <div className="flex items-center space-x-2">
              {renderPhantomStatus()}
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm"
              >
                Disconnect BSV
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#2A2A40] rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Balance Display */}
          <div className="p-4 border-b border-[#2A2A40]">
            <div className="text-center">
              <p className="text-gray-400">Balance</p>
              <p className="text-2xl font-bold text-white">{balance} BSV</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#2A2A40]">
            <button
              className={`flex-1 p-4 text-center transition-colors ${
                activeTab === 'send' ? 'bg-[#2A2A40] text-[#00ffa3]' : 'text-gray-400'
              }`}
              onClick={() => setActiveTab('send')}
            >
              <FiSend className="inline-block mr-2" />
              Send
            </button>
            <button
              className={`flex-1 p-4 text-center transition-colors ${
                activeTab === 'receive' ? 'bg-[#2A2A40] text-[#00ffa3]' : 'text-gray-400'
              }`}
              onClick={() => setActiveTab('receive')}
            >
              <FiDownload className="inline-block mr-2" />
              Receive
            </button>
            <button
              className={`flex-1 p-4 text-center transition-colors ${
                activeTab === 'history' ? 'bg-[#2A2A40] text-[#00ffa3]' : 'text-gray-400'
              }`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {error && (
              <div className="p-4 mb-4 bg-red-500/20 border-l-4 border-red-500 text-red-400">
                {error}
              </div>
            )}

            {activeTab === 'send' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full p-3 bg-[#2A2A40] border border-[#3D3D60] rounded-lg text-white focus:outline-none focus:border-[#00ffa3]"
                    placeholder="Enter BSV address"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Amount (BSV)</label>
                  <input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="w-full p-3 bg-[#2A2A40] border border-[#3D3D60] rounded-lg text-white focus:outline-none focus:border-[#00ffa3]"
                    placeholder="0.0"
                    step="0.00000001"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!recipientAddress || !sendAmount || isLoading}
                  className={`w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 ${
                    isLoading
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-[#00ffa3] hover:bg-[#00ffa3]/80'
                  } text-black font-medium transition-colors`}
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner w-5 h-5 border-2 border-black/30 border-t-black"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FiSend className="w-5 h-5" />
                      <span>Send BSV</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'receive' && (
              <div className="text-center space-y-4 p-4">
                {isValidAddress ? (
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <QRCodeSVG key={qrKey} value={address} size={200} />
                  </div>
                ) : (
                  <div className="bg-red-500/20 p-4 rounded-lg">
                    <p className="text-red-400">Invalid address - QR code cannot be generated</p>
                  </div>
                )}
                <div className="flex items-center justify-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={truncateAddress(address)}
                      readOnly
                      className={`w-full p-3 bg-[#2A2A40] border ${
                        isValidAddress ? 'border-[#3D3D60]' : 'border-red-500'
                      } rounded-lg text-white focus:outline-none`}
                    />
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
                      <input
                        type="text"
                        value={address}
                        readOnly
                        className={`w-full h-full p-3 bg-[#2A2A40] border ${
                          isValidAddress ? 'border-[#3D3D60]' : 'border-red-500'
                        } rounded-lg text-white focus:outline-none`}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(address)}
                    disabled={!isValidAddress}
                    className={`p-3 bg-[#2A2A40] border border-[#3D3D60] rounded-lg ${
                      isValidAddress ? 'text-[#00ffa3] hover:bg-[#3D3D60]' : 'text-gray-500 cursor-not-allowed'
                    } transition-colors relative group`}
                  >
                    {copySuccess ? (
                      <FiCheck className="w-5 h-5" />
                    ) : (
                      <FiCopy className="w-5 h-5" />
                    )}
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {copySuccess ? 'Copied!' : 'Copy address'}
                    </span>
                  </button>
                  <button
                    onClick={generateNewAddress}
                    disabled={isChangingAddress}
                    className={`p-3 bg-[#2A2A40] border border-[#3D3D60] rounded-lg ${
                      !isChangingAddress ? 'text-[#00ffa3] hover:bg-[#3D3D60]' : 'text-gray-500'
                    } transition-colors flex items-center space-x-2 relative group`}
                  >
                    <FiRefreshCw className={`w-5 h-5 ${isChangingAddress ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">New Address</span>
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Generate new address
                    </span>
                  </button>
                </div>
                {error && (
                  <p className="text-red-500 text-sm mt-2">{error}</p>
                )}
                <p className="text-sm text-gray-400 mt-2">
                  This is your current receiving address. Click "New Address" to generate a new one for enhanced privacy.
                </p>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                {/* Transactions */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white mb-3">Recent Transactions</h3>
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 bg-[#2A2A40] rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-gray-400">
                          {tx.type === 'send' ? 'Sent to' : 'Received from'}
                        </p>
                        <p className="text-white truncate max-w-[200px]">{tx.address}</p>
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
                          View on WhatsOnChain
                          <FiExternalLink className="ml-1" />
                        </a>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-center text-gray-400">No transactions yet</p>
                  )}
                </div>

                {/* User's Memes */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-white mb-3">Your Memes</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {userMemes.map((meme) => (
                      <div
                        key={meme.id}
                        className="bg-[#2A2A40] rounded-lg overflow-hidden border border-[#3D3D60]"
                      >
                        <div className="aspect-video bg-black/50 flex items-center justify-center">
                          <FiImage className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-white mb-1">{meme.title}</h4>
                          <p className="text-sm text-gray-400 mb-2">{formatDate(meme.createdAt)}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#00ffa3]">Block #{meme.blockHeight}</span>
                            <a
                              href={`https://whatsonchain.com/tx/${meme.inscriptionId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00ffa3] hover:underline flex items-center"
                            >
                              View Inscription
                              <FiExternalLink className="ml-1" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {userMemes.length === 0 && (
                    <p className="text-center text-gray-400">No memes created yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BSVTransactionModal; 
