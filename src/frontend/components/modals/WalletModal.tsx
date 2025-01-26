import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as bip39 from 'bip39';
import { WalletType } from '../../../shared/types/wallet';
import styles from './WalletModal.module.css';

// Use browser's crypto API for random values
const getRandomValues = (size: number): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(size));
};

type TabType = 'tokens' | 'nfts' | 'activity';

interface TestnetWallet {
  getBalance(): Promise<number>;
  getAddress(): Promise<string>;
  sendPayment(recipient: string, amount: number): Promise<void>;
  signMessage(message: string): Promise<string>;
  verifyMessage(message: string, signature: string, publicKey: string): Promise<boolean>;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (wallet: any) => void;
  onCancel: () => void;
  testnetWallet?: TestnetWallet;
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

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onSuccess, onCancel, testnetWallet }) => {
  const [activeTab, setActiveTab] = useState<TabType>('tokens');
  const [showIntroModal, setShowIntroModal] = useState(true);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isImportingWallet, setIsImportingWallet] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [importSeedPhrase, setImportSeedPhrase] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWalletType, setActiveWalletType] = useState<WalletType>(WalletType.BSV);
  const [mnemonic, setMnemonic] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Token data
  const [tokens, setTokens] = useState<TokenData[]>([
    { symbol: 'SOL', amount: 2.4186, value: 156.32 },
    { symbol: 'USDC', amount: 145.23, value: 145.23 },
    { symbol: 'RAY', amount: 50, value: 89.75 }
  ]);
  
  // NFT data
  const [nfts, setNfts] = useState<NFTData[]>([
    { name: 'Degen #1234', image: '/nft1.png', collection: 'Degen Apes' },
    { name: 'Solana Monkey #5678', image: '/nft2.png', collection: 'SMB' }
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

  useEffect(() => {
    if (isOpen) {
      setMnemonic("");
      setIsGenerating(false);
    }
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
      
      // Generate new mnemonic
      const newMnemonic = bip39.generateMnemonic();
      setMnemonic(newMnemonic);
      
      // TODO: Create new wallet instance based on selected wallet type
      const wallet = {
        type: activeWalletType,
        address: '1234...5678', // Placeholder
        balance: 0
      };
      
      // Store wallet and notify parent
      localStorage.setItem('wallet_seed', newMnemonic);
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
      
      if (!bip39.validateMnemonic(importSeedPhrase)) {
        throw new Error('Invalid seed phrase format');
      }
      
      // Create wallet from seed phrase
      const wallet = {
        type: activeWalletType,
        address: '1234...5678', // Placeholder
        balance: 0
      };
      
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

  const handleTestnetConnect = async (): Promise<string> => {
    if (!testnetWallet) {
      throw new Error('TestnetWallet is not initialized');
    }
    
    const wallet = {
      type: activeWalletType,
      address: '1234...5678', // Placeholder
      balance: 0
    };
    onSuccess(wallet);
    return 'success';
  };

  const handleGenerateMnemonic = () => {
    setIsGenerating(true);
    try {
      // Use browser's crypto API to generate entropy
      const entropy = getRandomValues(16);
      const newMnemonic = bip39.entropyToMnemonic(Buffer.from(entropy));
      setMnemonic(newMnemonic);
    } catch (error) {
      console.error('Failed to generate mnemonic:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConnect = async () => {
    try {
      // TODO: Implement actual wallet connection
      const wallet = {
        type: activeWalletType,
        address: '1234...5678', // Placeholder
        balance: 0
      };
      onSuccess(wallet);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
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
                  {activity.type === 'receive' ? '+' : '-'}{activity.amount} SOL
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

  if (!isOpen) return null;

  return (
    <div 
      className={`${styles.modalOverlay} ${styles.visible}`}
      onClick={handleBackdropClick}
    >
      <div className={`${styles.modalContainer} ${styles.visible}`}>
        <div className={styles.container}>
          {showIntroModal ? (
            <div className={styles.introModal}>
              <div className={styles.introContent}>
                <div className={styles.introTitle}>DoggyMarket Wallet</div>
                <div className={styles.introText}>
                  DoggyMarket comes with built-in wallet, there is no need to download any browser extension. 
                  Your private keys are stored in the browser and are never sent to the server.
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.introActions}>
                  <button 
                    className={styles.createWalletButton}
                    onClick={handleCreateWallet}
                    disabled={isCreatingWallet || isImportingWallet}
                  >
                    {isCreatingWallet ? 'Creating...' : 'Create new wallet'}
                  </button>
                  <button 
                    className={styles.importWalletButton}
                    onClick={() => setShowImportModal(true)}
                    disabled={isCreatingWallet || isImportingWallet}
                  >
                    Import wallet
                  </button>
                </div>
              </div>
            </div>
          ) : showImportModal ? (
            <div className={styles.importModal}>
              <div className={styles.importContent}>
                <div className={styles.importTitle}>Import Wallet</div>
                <div className={styles.importText}>
                  Enter your 12-word seed phrase to import your existing wallet.
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <textarea
                  className={styles.seedPhraseInput}
                  value={importSeedPhrase}
                  onChange={(e) => setImportSeedPhrase(e.target.value)}
                  placeholder="Enter seed phrase..."
                  rows={3}
                  disabled={isImportingWallet}
                />
                <div className={styles.importActions}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowImportModal(false);
                      setImportSeedPhrase('');
                      setError(null);
                    }}
                    disabled={isImportingWallet}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.importButton}
                    onClick={handleImportWallet}
                    disabled={isImportingWallet || !importSeedPhrase.trim()}
                  >
                    {isImportingWallet ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.mainModal}>
              <div className={styles.mainContent}>
                <div className={styles.header}>
                  <button 
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close modal"
                  >
                    <svg className={styles.closeIcon} viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h2 className="modal-title">Connect a Wallet</h2>
                  <p className="modal-subtitle">Choose your preferred wallet to connect to our app</p>
                </div>

                {/* Recent Connections */}
                <div className="wallet-options-section recent-connections">
                  <div className="wallet-options-title">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recent Connections
                  </div>
                  <button className="recent-connection-btn">
                    <div className="recent-connection-icon">
                      <img src="/wallet-icons/phantom.png" alt="Phantom" />
                    </div>
                    <div className="recent-connection-info">
                      <div className="recent-connection-name">Phantom Wallet</div>
                      <div className="recent-connection-address">7x...3Pq8</div>
                    </div>
                  </button>
                </div>

                <div className="wallet-options-divider"></div>

                {/* Popular Wallets */}
                <div className="wallet-options-section">
                  <div className="wallet-options-title">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Popular Wallets
                  </div>
                  <div className="wallet-options-grid">
                    <button className="wallet-option-card popular">
                      <div className="wallet-option-icon">
                        <img src="/wallet-icons/phantom.png" alt="Phantom" />
                      </div>
                      <div className="wallet-option-name">Phantom</div>
                      <div className="wallet-option-desc">Browser Extension</div>
                    </button>

                    <button className="wallet-option-card">
                      <div className="wallet-option-icon">
                        <img src="/wallet-icons/tiktok.png" alt="TikTok" />
                      </div>
                      <div className="wallet-option-name">TikTok</div>
                      <div className="wallet-option-desc">Social Login</div>
                    </button>

                    <button className="wallet-option-card">
                      <div className="wallet-option-icon">
                        <img src="/wallet-icons/manual.png" alt="Manual" />
                      </div>
                      <div className="wallet-option-name">Manual</div>
                      <div className="wallet-option-desc">Seed Phrase</div>
                    </button>
                  </div>
                </div>

                {/* Other Wallets */}
                <div className="wallet-options-section">
                  <div className="wallet-options-title">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Other Options
                  </div>
                  <div className="wallet-options-grid">
                    <button className="wallet-option-card">
                      <div className="wallet-option-icon">
                        <img src="/wallet-icons/qr.png" alt="QR Code" />
                      </div>
                      <div className="wallet-option-name">QR Code</div>
                      <div className="wallet-option-desc">Mobile Wallets</div>
                    </button>

                    <button className="wallet-option-card">
                      <div className="wallet-option-icon">
                        <img src="/wallet-icons/more.png" alt="More" />
                      </div>
                      <div className="wallet-option-name">More</div>
                      <div className="wallet-option-desc">View All Options</div>
                    </button>
                  </div>
                </div>

                <div className={styles.body}>
                  <div className={styles.balanceContainer}>
                    <img src="/solana-logo.svg" className={styles.solanaLogo} />
                    <span className={styles.balanceLabel}>Wallet Balance</span>
                    <span className={styles.balanceValue}>2.4186 SOL</span>
                    <a className={styles.receiveLink}>Receive</a>
                  </div>
                  <ul className={styles.tabList}>
                    {(['tokens', 'nfts', 'activity'] as TabType[]).map((tab) => (
                      <li 
                        key={tab}
                        className={`${styles.tabItem} ${activeTab === tab ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </li>
                    ))}
                  </ul>
                  <div className={styles.tabContent}>
                    {renderTabContent()}
                  </div>
                </div>

                <div className={styles.walletTypes}>
                  <button
                    className={`${styles.walletButton} ${activeWalletType === WalletType.BSV ? styles.active : ''}`}
                    onClick={() => setActiveWalletType(WalletType.BSV)}
                  >
                    BSV Wallet
                  </button>
                  <button
                    className={`${styles.walletButton} ${activeWalletType === WalletType.Manual ? styles.active : ''}`}
                    onClick={() => setActiveWalletType(WalletType.Manual)}
                  >
                    Manual Wallet
                  </button>
                  <button
                    className={`${styles.walletButton} ${activeWalletType === WalletType.Imported ? styles.active : ''}`}
                    onClick={() => setActiveWalletType(WalletType.Imported)}
                  >
                    Import Wallet
                  </button>
                </div>

                {activeWalletType === WalletType.Imported && (
                  <div className={styles.mnemonicSection}>
                    <textarea
                      className={styles.mnemonicInput}
                      value={mnemonic}
                      onChange={(e) => setMnemonic(e.target.value)}
                      placeholder="Enter your mnemonic phrase..."
                    />
                    <button
                      className={styles.generateButton}
                      onClick={handleGenerateMnemonic}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating...' : 'Generate New'}
                    </button>
                  </div>
                )}

                <div className={styles.modalActions}>
                  <button className={styles.cancelButton} onClick={onCancel}>
                    Cancel
                  </button>
                  <button className={styles.connectButton} onClick={handleConnect}>
                    Connect
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletModal; 