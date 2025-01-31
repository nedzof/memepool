import React, { createContext, useContext, useState, useEffect } from 'react';
import { PhantomWallet } from '../utils/wallets/phantom-wallet';
import type { BtcAccount } from '../types/phantom';

interface WalletContextType {
  isPhantomInstalled: boolean;
  connected: boolean;
  btcAddress: string | null;
  accounts: BtcAccount[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType>({
  isPhantomInstalled: false,
  connected: false,
  btcAddress: null,
  accounts: [],
  connect: async () => {},
  disconnect: async () => {},
  signMessage: async () => '',
});

export const useWallet = () => useContext(WalletContext);

const wallet = PhantomWallet.getInstance();

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BtcAccount[]>([]);

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

  return (
    <WalletContext.Provider
      value={{
        isPhantomInstalled,
        connected,
        btcAddress,
        accounts,
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 