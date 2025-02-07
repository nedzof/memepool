import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PhantomWallet } from '../utils/wallets/phantom-wallet';
import { YoursWallet } from '../utils/wallets/yours-wallet';
import type { BtcAccount, PhantomBitcoinProvider, ConnectResponse } from '../types/phantom';
import { generateBtcAddress } from '../utils/wallet';

interface Inscription {
  id: string;
  mintTx: string;
  transferTx: string;
  imageUrl: string;
  timestamp: number;
}

interface WalletContextType {
  isPhantomInstalled: boolean;
  isYoursInstalled: boolean;
  connected: boolean;
  btcAddress: string | null;
  accounts: BtcAccount[];
  balance: number;
  inscriptions: Inscription[];
  connect: (walletType: 'phantom' | 'yours') => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  addInscription: (inscription: Omit<Inscription, 'id' | 'timestamp'>) => void;
  publicKey: string | null;
  activeWallet: 'phantom' | 'yours' | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);
  const [isYoursInstalled, setIsYoursInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BtcAccount[]>([]);
  const [balance, setBalance] = useState(0);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [activeWallet, setActiveWallet] = useState<'phantom' | 'yours' | null>(null);

  const phantomWallet = PhantomWallet.getInstance();
  const yoursWallet = YoursWallet.getInstance();

  useEffect(() => {
    const checkWallets = async () => {
      // Check Phantom
      const provider = window?.phantom?.bitcoin;
      const isPhantomAvailable = provider?.isPhantom || false;
      setIsPhantomInstalled(isPhantomAvailable);

      // Check Yours
      const isYoursAvailable = await yoursWallet.isAvailable();
      setIsYoursInstalled(isYoursAvailable);
    };
    checkWallets();
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      try {
        const address = generateBtcAddress(publicKey);
        console.log('Generated BSV address:', address);
        setBtcAddress(address);
      } catch (error) {
        console.error('Error generating BSV address:', error);
        setBtcAddress(null);
      }
    } else {
      setBtcAddress(null);
    }
  }, [connected, publicKey]);

  const connect = async (walletType: 'phantom' | 'yours') => {
    try {
      if (walletType === 'phantom') {
        const provider = window.phantom?.bitcoin;
        if (!provider) {
          throw new Error('Phantom provider not found');
        }

        console.log('Connecting to Phantom...');
        const accounts = await provider.requestAccounts();
        console.log('Phantom connection response:', accounts);

        if (accounts && accounts.length > 0) {
          const publicKey = accounts[0].publicKey;
          console.log('Connected with public key:', publicKey);
          setPublicKey(publicKey);
          setAccounts(accounts);
          setConnected(true);
          setActiveWallet('phantom');
        }
      } else if (walletType === 'yours') {
        await yoursWallet.initiateLogin();
        const address = await yoursWallet.getAddress();
        const balance = await yoursWallet.getBalance();
        
        setPublicKey(yoursWallet.publicKey || null);
        setBtcAddress(address);
        setBalance(balance);
        setConnected(true);
        setActiveWallet('yours');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnected(false);
      setAccounts([]);
      setBtcAddress(null);
      setPublicKey(null);
      setActiveWallet(null);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      if (activeWallet === 'phantom') {
        const provider = window.phantom?.bitcoin;
        if (provider) {
          await provider.disconnect();
        }
      } else if (activeWallet === 'yours') {
        await yoursWallet.disconnect();
      }
      
      setConnected(false);
      setAccounts([]);
      setBtcAddress(null);
      setPublicKey(null);
      setActiveWallet(null);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  };

  const signMessage = async (message: string) => {
    if (activeWallet === 'phantom') {
      return await phantomWallet.signMessage(message);
    } else if (activeWallet === 'yours') {
      return await yoursWallet.signMessage(message);
    }
    throw new Error('No wallet connected');
  };

  const addInscription = useCallback((inscription: Omit<Inscription, 'id' | 'timestamp'>) => {
    const newInscription: Inscription = {
      ...inscription,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    setInscriptions(prev => [newInscription, ...prev]);
  }, []);

  useEffect(() => {
    const setupWalletListeners = () => {
      // Phantom wallet listeners
      const provider = window.phantom?.bitcoin;
      if (provider && activeWallet === 'phantom') {
        provider.on('accountsChanged', (accounts: BtcAccount[]) => {
          if (accounts.length > 0) {
            setPublicKey(accounts[0].publicKey);
            setAccounts(accounts);
            setConnected(true);
          } else {
            provider.requestAccounts().catch((error) => {
              console.error('Failed to reconnect:', error);
              setConnected(false);
              setAccounts([]);
              setBtcAddress(null);
              setPublicKey(null);
              setActiveWallet(null);
            });
          }
        });
      }

      // Yours wallet listeners
      if (window.yours && activeWallet === 'yours') {
        window.yours.on('accountChanged', async () => {
          try {
            const address = await yoursWallet.getAddress();
            const balance = await yoursWallet.getBalance();
            setBtcAddress(address);
            setBalance(balance);
          } catch (error) {
            console.error('Failed to update Yours wallet info:', error);
            setConnected(false);
            setBtcAddress(null);
            setPublicKey(null);
            setActiveWallet(null);
          }
        });
      }
    };

    setupWalletListeners();

    return () => {
      // Cleanup listeners
      if (window.phantom?.bitcoin?.removeAllListeners) {
        window.phantom.bitcoin.removeAllListeners();
      }
      if (window.yours?.removeAllListeners) {
        window.yours.removeAllListeners();
      }
    };
  }, [activeWallet]);

  return (
    <WalletContext.Provider
      value={{
        isPhantomInstalled,
        isYoursInstalled,
        connected,
        btcAddress,
        accounts,
        balance,
        inscriptions,
        connect,
        disconnect,
        signMessage,
        addInscription,
        publicKey,
        activeWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 