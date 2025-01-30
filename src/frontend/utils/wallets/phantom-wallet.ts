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
    return null;
  }

  isPhantomInstalled(): boolean {
    const provider = this.getProvider();
    return !!provider;
  }

  async requestBitcoinAccounts(): Promise<BtcAccount[]> {
    try {
      const provider = this.getProvider();
      if (!provider) {
        throw new Error('Phantom provider not found');
      }

      // This will trigger the Phantom modal for user approval
      console.log('Requesting accounts from Phantom...');
      const accounts = await provider.requestAccounts();
      console.log('Received accounts:', accounts);
      this.accounts = accounts;
      return accounts;
    } catch (err) {
      const phantomError = err as PhantomError;
      if (phantomError.code === 4001) {
        throw new Error('User rejected the connection request');
      }
      throw new Error('Failed to connect to Phantom wallet');
    }
  }

  async connect(): Promise<BtcAccount> {
    try {
      if (!this.isPhantomInstalled()) {
        throw new Error('Phantom wallet is not installed');
      }

      // If we're already connected and have an account, return it
      if (this.connected && this.currentAccount) {
        return this.currentAccount;
      }

      // Request accounts first - this will show the Phantom modal
      const accounts = await this.requestBitcoinAccounts();
      
      // Find a p2tr account or use the first account
      this.currentAccount = accounts.find(acc => acc.addressType === 'p2tr') || accounts[0];
      
      if (!this.currentAccount) {
        throw new Error('No suitable account found');
      }

      this.connected = true;
      return this.currentAccount;
    } catch (error) {
      this.connected = false;
      this.currentAccount = null;
      this.accounts = [];
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

  getPublicKey(): string | null {
    return this.currentAccount?.publicKey || null;
  }

  async requestConnection(): Promise<BtcAccount> {
    try {
      if (!this.isPhantomInstalled()) {
        throw new Error('Phantom wallet is not installed');
      }

      // If we're already connected and have an account, return it
      if (this.connected && this.currentAccount) {
        return this.currentAccount;
      }

      // Request accounts first - this will show the Phantom modal
      const accounts = await this.requestBitcoinAccounts();
      
      // Find a p2tr account or use the first account
      this.currentAccount = accounts.find(acc => acc.addressType === 'p2tr') || accounts[0];
      
      if (!this.currentAccount) {
        throw new Error('No suitable account found');
      }

      this.connected = true;
      return this.currentAccount;
    } catch (error) {
      console.error('Error requesting Phantom connection:', error);
      throw error;
    }
  }
} 
