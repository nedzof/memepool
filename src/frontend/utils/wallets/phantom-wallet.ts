import { WalletType } from '../../../shared/types/wallet';

interface PhantomError extends Error {
  code?: number;
}

export class PhantomWallet {
  private static instance: PhantomWallet | null = null;
  private connected: boolean = false;

  private constructor() {}

  static getInstance(): PhantomWallet {
    if (!PhantomWallet.instance) {
      PhantomWallet.instance = new PhantomWallet();
    }
    return PhantomWallet.instance;
  }

  isPhantomInstalled(): boolean {
    const provider = window.phantom?.solana;
    return provider?.isPhantom || false;
  }

  async connect(): Promise<string> {
    try {
      if (!this.isPhantomInstalled()) {
        throw new Error('Phantom wallet is not installed');
      }

      const provider = window.phantom?.solana;
      if (!provider) {
        throw new Error('Phantom provider not found');
      }

      try {
        const response = await provider.connect();
        this.connected = true;
        return response.publicKey.toString();
      } catch (err) {
        const phantomError = err as PhantomError;
        if (phantomError.code === 4001) {
          throw new Error('User rejected the connection request');
        }
        throw new Error('Failed to connect to Phantom wallet');
      }
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      const provider = window.phantom?.solana;
      if (provider) {
        await provider.disconnect();
      }
      this.connected = false;
    } catch (error) {
      console.error('Error disconnecting from Phantom:', error);
      throw new Error('Failed to disconnect from Phantom wallet');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async requestConnection(): Promise<boolean> {
    try {
      if (!this.isPhantomInstalled()) {
        throw new Error('Phantom wallet is not installed');
      }

      if (this.connected) {
        return true;
      }

      await this.connect();
      return true;
    } catch (error) {
      console.error('Error requesting Phantom connection:', error);
      throw error;
    }
  }
} 
