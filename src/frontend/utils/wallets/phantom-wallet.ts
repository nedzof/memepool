import type { PhantomBitcoinProvider, BtcAccount } from '../../types/phantom';

// Types for Phantom Bitcoin Provider
type DisplayEncoding = 'utf8' | 'hex';
type PhantomEvent = 'connect' | 'disconnect' | 'accountChanged';

interface PhantomSolanaProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  request: (args: { method: string }) => Promise<any>;
}

declare global {
  interface Window {
    phantom?: {
      bitcoin?: PhantomBitcoinProvider;
      solana?: PhantomSolanaProvider;
    };
  }
}

interface BtcAccount {
  address: string;
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
  publicKey: string;
  purpose: "payment" | "ordinals";
}

interface ConnectResponse {
  accounts: BtcAccount[];
}

interface PhantomBitcoinProvider {
  isPhantom: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<ConnectResponse>;
  request: (args: { method: string; params?: any }) => Promise<any>;
  signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: string }>;
  on: (event: string, handler: Function) => void;
  removeAllListeners: () => void;
}

interface PhantomWindow extends Window {
  phantom?: {
    bitcoin?: PhantomBitcoinProvider;
  }
}

declare global {
  interface Window extends PhantomWindow {}
}

export { BtcAccount };

export class PhantomWallet {
  private static instance: PhantomWallet;
  private provider: PhantomBitcoinProvider | null = null;

  private constructor() {}

  public static getInstance(): PhantomWallet {
    if (!PhantomWallet.instance) {
      PhantomWallet.instance = new PhantomWallet();
    }
    return PhantomWallet.instance;
  }

  private getProvider(): PhantomBitcoinProvider | null {
    if ('phantom' in window) {
      const provider = window.phantom?.bitcoin;
      if (provider && provider.isPhantom) {
        return provider;
      }
    }
    window.open('https://phantom.app/', '_blank');
    return null;
  }

  public async isPhantomInstalled(): Promise<boolean> {
    try {
      const provider = this.getProvider();
      return provider !== null;
    } catch (error) {
      console.error('Error checking Phantom installation:', error);
      return false;
    }
  }

  public async requestConnection(): Promise<BtcAccount[]> {
    try {
      const provider = this.getProvider();
      if (!provider) {
        throw new Error('Phantom wallet is not installed');
      }

      this.provider = provider;

      // Use the connect method to show the modal
      const response = await provider.connect({
        onlyIfTrusted: false, // This ensures the modal always appears
      });

      console.log('Phantom connection response:', response);

      // The response should contain the accounts
      const accounts = response.accounts;
      console.log('Phantom accounts:', accounts);

      return Array.isArray(accounts) ? accounts : [accounts];
    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.provider?.removeAllListeners) {
        this.provider.removeAllListeners();
      }
      this.provider = null;
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw error;
    }
  }

  public async signMessage(message: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    const messageBytes = new TextEncoder().encode(message);
    const response = await this.provider.signMessage(messageBytes, message);
    return response.signature;
  }
} 
