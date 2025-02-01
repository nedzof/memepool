import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PhantomWallet } from '../utils/wallets/phantom-wallet';
import type { BtcAccount, PhantomBitcoinProvider } from '../types/phantom';
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
  connected: boolean;
  btcAddress: string | null;
  accounts: BtcAccount[];
  balance: number;
  inscriptions: Inscription[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  addInscription: (inscription: Omit<Inscription, 'id' | 'timestamp'>) => void;
  publicKey: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BtcAccount[]>([]);
  const [balance, setBalance] = useState(0);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const wallet = PhantomWallet.getInstance();

  useEffect(() => {
    const checkPhantom = async () => {
      const provider = window?.phantom?.bitcoin;
      const isInstalled = provider?.isPhantom || false;
      setIsPhantomInstalled(isInstalled);
    };
    checkPhantom();
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

  const connect = async () => {
    try {
      const provider = window.phantom?.bitcoin;
      if (!provider) {
        throw new Error('Phantom provider not found');
      }

      console.log('Requesting Phantom accounts...');
      const accounts = await provider.request({ method: 'requestAccounts' });
      console.log('Received accounts:', accounts);

      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        setPublicKey(account.publicKey);
        setAccounts(accounts);
        setConnected(true);
        console.log('Connected with public key:', account.publicKey);
      } else {
        throw new Error('No accounts returned from Phantom');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnected(false);
      setAccounts([]);
      setBtcAddress(null);
      setPublicKey(null);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      const provider = window.phantom?.bitcoin;
      if (provider) {
        await provider.request({ method: 'disconnect' });
      }
      setConnected(false);
      setAccounts([]);
      setBtcAddress(null);
      setPublicKey(null);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  };

  const signMessage = async (message: string) => {
    return await wallet.signMessage(message);
  };

  const addInscription = useCallback((inscription: Omit<Inscription, 'id' | 'timestamp'>) => {
    const newInscription: Inscription = {
      ...inscription,
      id: Math.random().toString(36).substr(2, 9), // Simple ID generation
      timestamp: Date.now(),
    };
    setInscriptions(prev => [newInscription, ...prev]);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isPhantomInstalled,
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