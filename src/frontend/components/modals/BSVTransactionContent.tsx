import React, { useState, useEffect } from 'react';
import { FiSend, FiDownload, FiCopy, FiExternalLink, FiCheck } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { walletManager } from '../../utils/wallet';
import { MemeVideoMetadata } from '../../../shared/types/meme';
import { WalletType } from '../../../shared/types/wallet';
import { BtcAccount } from '../../types/phantom';

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

interface BSVTransactionContentProps {
  accounts: BtcAccount[];
  onClose: () => void;
  onDisconnect: () => void;
  address: string;
  onAddressChange?: (newAddress: string) => void;
}

const BSVTransactionContent: React.FC<BSVTransactionContentProps> = ({ 
  accounts, 
  onClose, 
  onDisconnect, 
  address, 
  onAddressChange 
}) => {
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

  // Initialize BSV wallet with Phantom account
  useEffect(() => {
    const initBSVWallet = async () => {
      try {
        // Find the payment account first, fallback to first account
        const paymentAccount = accounts.find(acc => acc.purpose === 'payment') || accounts[0];
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
        console.error('Failed to initialize BSV wallet:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize BSV wallet');
      }
    };

    initBSVWallet();
  }, [accounts]);

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

  return (
    <>
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
              disabled={!recipientAddress || !sendAmount || isLoading}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 ${
                !recipientAddress || !sendAmount || isLoading
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
    </>
  );
};

export default BSVTransactionContent; 