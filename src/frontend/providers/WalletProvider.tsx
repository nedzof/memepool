import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PhantomWallet } from '../utils/wallets/phantom-wallet';
import { useYoursWallet } from 'yours-wallet-provider';
import type { PhantomSolanaProvider } from '../types/phantom';
import { generateBtcAddress } from '../utils/wallet';

interface WalletContextType {
  isPhantomInstalled: boolean;
  isYoursInstalled: boolean;
  connected: boolean;
  btcAddress: string | null;
  balance: number;
  connect: (walletType: 'phantom' | 'yours') => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  publicKey: string | null;
  activeWallet: 'phantom' | 'yours' | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);
  const [isYoursInstalled, setIsYoursInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [activeWallet, setActiveWallet] = useState<'phantom' | 'yours' | null>(null);

  const phantomWallet = PhantomWallet.getInstance();
  const yoursWallet = useYoursWallet();

  // Handle Yours wallet connection state
  const handleYoursWalletState = useCallback(async () => {
    if (!yoursWallet) return;

    try {
      const isConnected = await yoursWallet.isConnected();
      if (isConnected) {
        const addresses = await yoursWallet.getAddresses();
        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          const balance = await yoursWallet.getBalance();
          if (balance !== undefined) {
            setBtcAddress(address);
            setBalance(Number(balance));
            setConnected(true);
            setActiveWallet('yours');
          }
        }
      }
    } catch (error) {
      console.error('Error checking Yours wallet state:', error);
    }
  }, [yoursWallet]);

  // Check if wallets are installed
  useEffect(() => {
    const checkWallets = async () => {
      try {
        // Check Phantom
        const phantomProvider = window?.phantom?.solana;
        const isPhantomAvailable = phantomProvider?.isPhantom || false;
        setIsPhantomInstalled(isPhantomAvailable);

        // Check Yours
        const isYoursAvailable = yoursWallet?.isReady || false;
        setIsYoursInstalled(isYoursAvailable);

        if (isYoursAvailable) {
          await handleYoursWalletState();
        }

        console.log('Wallet detection:', {
          phantom: isPhantomAvailable,
          yours: isYoursAvailable
        });

        // Check if Phantom is already connected
        if (isPhantomAvailable && activeWallet === 'phantom' && phantomProvider) {
          try {
            const resp = await phantomProvider.connect();
            const pubKey = resp.publicKey.toString();
            setPublicKey(pubKey);
            setConnected(true);
          } catch (error) {
            console.log('No connected accounts found');
            setConnected(false);
            setPublicKey(null);
            setActiveWallet(null);
          }
        }
      } catch (error) {
        console.error('Error checking wallet availability:', error);
      }
    };

    checkWallets();
  }, [activeWallet, yoursWallet, handleYoursWalletState]);

  // Set up Yours wallet event listeners
  useEffect(() => {
    if (!yoursWallet?.on) return;

    yoursWallet.on('switchAccount', () => {
      console.log('switchAccount');
      handleYoursWalletState();
    });

    yoursWallet.on('signedOut', () => {
      console.log('signedOut');
      if (activeWallet === 'yours') {
        disconnect();
      }
    });
  }, [yoursWallet, activeWallet, handleYoursWalletState]);

  // Generate BSV address when connected with public key
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
        const provider = window.phantom?.solana;
        if (!provider) {
          throw new Error('Phantom provider not found');
        }

        console.log('Connecting to Phantom...');
        const resp = await provider.connect();
        const pubKey = resp.publicKey.toString();
        console.log('Connected with public key:', pubKey);
        setPublicKey(pubKey);
        setConnected(true);
        setActiveWallet('phantom');
      } else if (walletType === 'yours') {
        if (!yoursWallet?.isReady) {
          window.open('https://yours.org', '_blank');
          throw new Error('Yours Wallet is not ready');
        }

        try {
          // Connect and get identity public key
          const identityPubKey = await yoursWallet.connect();
          if (identityPubKey) {
            console.log('Connected with identity public key:', identityPubKey);
            setPublicKey(identityPubKey);

            // Get addresses after connection
            const addresses = await yoursWallet.getAddresses();
            if (addresses && addresses.length > 0) {
              const address = addresses[0];
              const balance = await yoursWallet.getBalance();
              if (balance !== undefined) {
                setBtcAddress(address);
                setBalance(Number(balance));
                setConnected(true);
                setActiveWallet('yours');
              }
            }
          }
        } catch (err: unknown) {
          console.error('Failed to connect to Yours wallet:', err);
          throw new Error(err instanceof Error ? err.message : 'Failed to connect to Yours wallet');
        }
      }
    } catch (err: unknown) {
      console.error('Failed to connect:', err);
      setConnected(false);
      setBtcAddress(null);
      setPublicKey(null);
      setActiveWallet(null);
      throw new Error(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const disconnect = async () => {
    try {
      if (activeWallet === 'phantom') {
        const provider = window.phantom?.solana;
        if (provider) {
          await provider.disconnect();
        }
      } else if (activeWallet === 'yours' && yoursWallet) {
        await yoursWallet.disconnect();
      }
      
      setConnected(false);
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
    } else if (activeWallet === 'yours' && yoursWallet) {
      const result = await yoursWallet.signMessage(message);
      if (result?.signedMessage) {
        return result.signedMessage;
      }
      throw new Error('Failed to sign message with Yours wallet');
    }
    throw new Error('No wallet connected');
  };

  // Set up Phantom wallet event listeners
  useEffect(() => {
    const setupPhantomListeners = () => {
      const provider = window.phantom?.solana;
      if (provider && activeWallet === 'phantom') {
        provider.on('accountChanged', () => {
          provider.connect().then(resp => {
            const pubKey = resp.publicKey.toString();
            setPublicKey(pubKey);
            setConnected(true);
          }).catch(error => {
            console.error('Failed to reconnect:', error);
            setConnected(false);
            setBtcAddress(null);
            setPublicKey(null);
            setActiveWallet(null);
          });
        });

        provider.on('disconnect', () => {
          setConnected(false);
          setBtcAddress(null);
          setPublicKey(null);
          setActiveWallet(null);
        });
      }
    };

    setupPhantomListeners();

    return () => {
      // Cleanup listeners
      const provider = window.phantom?.solana;
      if (provider?.removeAllListeners) {
        provider.removeAllListeners();
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
        balance,
        connect,
        disconnect,
        signMessage,
        publicKey,
        activeWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 