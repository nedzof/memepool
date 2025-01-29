import React, { useState, useEffect } from 'react';
import { FiX, FiSend, FiDownload, FiCopy, FiExternalLink, FiImage } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { walletManager } from '../../utils/wallet';
import { MemeVideoMetadata } from '../../../shared/types/meme';
import styles from './WalletModal.module.css';

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
}

const BSVTransactionModal: React.FC<BSVTransactionModalProps> = ({ onClose, onDisconnect, address }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'history'>('send');
  const [sendAmount, setSendAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userMemes, setUserMemes] = useState<MemeVideoMetadata[]>([]);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const wallet = walletManager.getWallet();
        if (wallet) {
          const balance = await wallet.getBalance();
          setBalance(balance);
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };

    fetchBalance();
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

  const handleSend = async () => {
    try {
      setError(null);
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
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-[#1A1B23] rounded-xl w-full max-w-2xl overflow-hidden border border-[#00ffa3]/30">
          {/* Header */}
          <div className="p-4 border-b border-[#2A2A40] flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#00ffa3]">BSV Wallet</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm"
              >
                Disconnect
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
                  className="w-full py-3 px-6 bg-[#00ffa3] text-black rounded-lg font-medium hover:bg-[#00ffa3]/90 transition-colors"
                >
                  Send BSV
                </button>
              </div>
            )}

            {activeTab === 'receive' && (
              <div className="text-center space-y-4">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <QRCodeSVG value={address} size={200} />
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <input
                    type="text"
                    value={address}
                    readOnly
                    className="flex-1 p-3 bg-[#2A2A40] border border-[#3D3D60] rounded-lg text-white focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(address)}
                    className="p-3 bg-[#2A2A40] border border-[#3D3D60] rounded-lg text-[#00ffa3] hover:bg-[#3D3D60] transition-colors"
                  >
                    <FiCopy className="w-5 h-5" />
                  </button>
                </div>
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
