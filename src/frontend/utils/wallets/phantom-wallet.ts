import { WalletType } from '../../../shared/types/wallet';

interface PhantomError extends Error {
  code?: number;
}

interface BtcAccount {
  address: string;
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
  publicKey: string;
  purpose: "payment" | "ordinals";
}

export class PhantomWallet {
  private static instance: PhantomWallet | null = null;
  private connected: boolean = false;
  private accounts: BtcAccount[] = [];
  private currentAccount: BtcAccount | null = null;

  private constructor() {}

  static getInstance(): PhantomWallet {
    if (!PhantomWallet.instance) {
      PhantomWallet.instance = new PhantomWallet();
    }
    return PhantomWallet.instance;
  }

  private getProvider() {
    if ('phantom' in window) {
      const provider = (window as any).phantom?.bitcoin;
      
      if (provider && provider.isPhantom) {
        return provider;
      }
    }

    window.open('https://phantom.app/', '_blank');
    return null;
  }

  isPhantomInstalled(): boolean {
    return !!(window as any)?.phantom?.bitcoin?.isPhantom;
  }

  async connect(): Promise<string> {
    try {
      const provider = this.getProvider();
      if (!provider) {
        throw new Error('Phantom provider not found');
      }

      try {
        // Request accounts and wait for user approval
        this.accounts = await provider.requestAccounts();
        
        // Find a p2pkh account or use the first account
        this.currentAccount = this.accounts.find(acc => acc.addressType === 'p2pkh') || this.accounts[0];
        
        if (!this.currentAccount) {
          throw new Error('No suitable account found');
        }

        this.connected = true;
        return this.currentAccount.address;
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
      const provider = this.getProvider();
      if (provider) {
        await provider.disconnect();
      }
      this.connected = false;
      this.accounts = [];
      this.currentAccount = null;
    } catch (error) {
      console.error('Error disconnecting from Phantom:', error);
      throw new Error('Failed to disconnect from Phantom wallet');
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.currentAccount;
  }

  getCurrentAccount(): BtcAccount | null {
    return this.currentAccount;
  }

  async requestConnection(): Promise<boolean> {
    try {
      if (!this.isPhantomInstalled()) {
        throw new Error('Phantom wallet is not installed');
      }

      if (this.connected && this.currentAccount) {
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
