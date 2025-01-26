import React, { useState, useEffect } from 'react';
import { WalletType } from '../../../shared/types/wallet';
import { walletService } from '../../services/wallet.service';
import styles from './WalletModal.module.css';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (wallet: any) => void;
  onCancel: () => void;
}

interface TokenData {
  symbol: string;
  amount: number;
  value: number;
}

interface NFTData {
  name: string;
  image: string;
  collection: string;
}

interface ActivityData {
  type: 'send' | 'receive';
  address: string;
  amount: number;
  date: Date;
}

type TabType = 'tokens' | 'nfts' | 'activity';

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onSuccess, onCancel }) => {
  const [activeTab, setActiveTab] = useState<TabType>('tokens');
  const [showIntroModal, setShowIntroModal] = useState(true);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isImportingWallet, setIsImportingWallet] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [importSeedPhrase, setImportSeedPhrase] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWalletType, setActiveWalletType] = useState<WalletType>(WalletType.BSV);
  
  // Token data
  const [tokens, setTokens] = useState<TokenData[]>([
    { symbol: 'BSV', amount: 2.4186, value: 156.32 },
    { symbol: 'USDC', amount: 145.23, value: 145.23 },
    { symbol: 'ORD', amount: 50, value: 89.75 }
  ]);
  
  // NFT data
  const [nfts, setNfts] = useState<NFTData[]>([
    { name: 'Meme #1234', image: '/nft1.png', collection: 'MemePool' },
    { name: 'BSV Monkey #5678', image: '/nft2.png', collection: 'BSV Monkeys' }
  ]);
  
  // Activity data
  const [activities, setActivities] = useState<ActivityData[]>([
    { type: 'receive', address: '7x...3Pq8', amount: 1.5, date: new Date() },
    { type: 'send', address: '9y...2Mk4', amount: 0.5, date: new Date() }
  ]);

  // Handle scroll locking
  useEffect(() => {
    if (!isOpen) return;
    
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCreateWallet = async () => {
    try {
      setError(null);
      setIsCreatingWallet(true);
      
      const { wallet, mnemonic } = await walletService.createWallet(activeWalletType);
      setSeedPhrase(mnemonic);
      
      // Store wallet and notify parent
      localStorage.setItem('wallet_seed', mnemonic);
      setShowIntroModal(false);
      onSuccess(wallet);
    } catch (error) {
      console.error('Failed to create wallet:', error);
      setError('Failed to create wallet. Please try again.');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleImportWallet = async () => {
    try {
      setError(null);
      setIsImportingWallet(true);
      
      // Validate seed phrase
      if (!importSeedPhrase.trim()) {
        throw new Error('Please enter a seed phrase');
      }
      
      const wallet = await walletService.importWallet(activeWalletType, importSeedPhrase);
      
      // Store wallet and notify parent
      localStorage.setItem('wallet_seed', importSeedPhrase);
      setShowIntroModal(false);
      setShowImportModal(false);
      onSuccess(wallet);
    } catch (error) {
      console.error('Failed to import wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to import wallet. Please try again.');
    } finally {
      setIsImportingWallet(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tokens':
        return (
          <div className={styles.tokenList}>
            {tokens.map((token, index) => (
              <div key={index} className={styles.tokenItem}>
                <div className={styles.tokenSymbol}>{token.symbol}</div>
                <div className={styles.tokenAmount}>{token.amount}</div>
                <div className={styles.tokenValue}>${token.value.toFixed(2)}</div>
                <button className={styles.sendButton}>Send</button>
              </div>
            ))}
          </div>
        );
      
      case 'nfts':
        return (
          <div className={styles.nftGrid}>
            {nfts.map((nft, index) => (
              <div key={index} className={styles.nftCard}>
                <img src={nft.image} alt={nft.name} className={styles.nftImage} />
                <div className={styles.nftInfo}>
                  <div className={styles.nftName}>{nft.name}</div>
                  <div className={styles.nftCollection}>{nft.collection}</div>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'activity':
        return (
          <div className={styles.activityList}>
            {activities.map((activity, index) => (
              <div key={index} className={styles.activityItem}>
                <div className={styles.activityType}>{activity.type}</div>
                <div className={styles.activityAddress}>{activity.address}</div>
                <div className={styles.activityAmount}>
                  {activity.type === 'receive' ? '+' : '-'}{activity.amount} BSV
                </div>
                <div className={styles.activityDate}>
                  {activity.date.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="absolute inset-0 bg-[#1A1B23]/80 backdrop-blur-sm"></div>
      <div className="relative bg-[#222235] p-8 rounded-2xl shadow-xl z-10 w-full max-w-2xl mx-4">
        {showIntroModal ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
              Connect Wallet
            </h2>
            <div className="space-y-4">
              <button
                onClick={handleCreateWallet}
                disabled={isCreatingWallet}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-lg font-semibold text-white hover:opacity-90 transition-all"
              >
                {isCreatingWallet ? 'Creating...' : 'Create New Wallet'}
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="w-full px-6 py-4 bg-[#1A1B23] rounded-lg font-semibold text-white hover:bg-[#2A2A40] transition-colors"
              >
                Import Existing Wallet
              </button>
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </div>
        ) : showImportModal ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
              Import Wallet
            </h2>
            <div className="space-y-4">
              <textarea
                value={importSeedPhrase}
                onChange={(e) => setImportSeedPhrase(e.target.value)}
                placeholder="Enter your seed phrase..."
                className="w-full px-4 py-3 bg-[#1A1B23] border border-[#2A2A40] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9945FF] focus:border-transparent transition-colors"
                rows={4}
              />
              <div className="flex space-x-4">
                <button
                  onClick={handleImportWallet}
                  disabled={isImportingWallet}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-lg font-semibold text-white hover:opacity-90 transition-all"
                >
                  {isImportingWallet ? 'Importing...' : 'Import'}
                </button>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-6 py-3 bg-[#1A1B23] rounded-lg font-semibold text-white hover:bg-[#2A2A40] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
                Wallet
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex space-x-4 border-b border-[#2A2A40]">
              <button
                onClick={() => setActiveTab('tokens')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'tokens'
                    ? 'text-[#14F195] border-b-2 border-[#14F195]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tokens
              </button>
              <button
                onClick={() => setActiveTab('nfts')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'nfts'
                    ? 'text-[#14F195] border-b-2 border-[#14F195]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                NFTs
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'text-[#14F195] border-b-2 border-[#14F195]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Activity
              </button>
            </div>
            {renderTabContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletModal; 