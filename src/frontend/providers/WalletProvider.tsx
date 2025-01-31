import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PhantomWallet } from '../utils/wallets/phantom-wallet';
import type { BtcAccount } from '../types/phantom';

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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BtcAccount[]>([]);
  const [balance, setBalance] = useState(0);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);

  const wallet = PhantomWallet.getInstance();

  useEffect(() => {
    const checkPhantom = async () => {
      const isInstalled = await wallet.isPhantomInstalled();
      setIsPhantomInstalled(isInstalled);
    };
    checkPhantom();
  }, []);

  useEffect(() => {
    if (connected && accounts[0]?.address) {
      setBtcAddress(accounts[0].address);
    } else {
      setBtcAddress(null);
    }
  }, [connected, accounts]);

  const connect = async () => {
    try {
      const newAccounts = await wallet.requestConnection();
      setAccounts(newAccounts);
      setConnected(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnected(false);
      setAccounts([]);
      setBtcAddress(null);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      await wallet.disconnect();
      setConnected(false);
      setAccounts([]);
      setBtcAddress(null);
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