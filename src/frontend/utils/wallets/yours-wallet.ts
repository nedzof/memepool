import { Wallet, WalletType } from '../../../shared/types/wallet';
import type { YoursWalletProvider, ConnectResponse } from '../../types/yours';

export class YoursWallet implements Wallet {
  private static instance: YoursWallet;
  private provider: YoursWalletProvider | null = null;

  type: WalletType = WalletType.BSV;
  name: string = 'Yours Wallet';
  icon: string = '/icons/yours.svg';
  address: string = '';
  balance: number = 0;
  publicKey: string | null = null;

  private constructor() {}

  public static getInstance(): YoursWallet {
    if (!YoursWallet.instance) {
      YoursWallet.instance = new YoursWallet();
    }
    return YoursWallet.instance;
  }

  private getProvider(): YoursWalletProvider | null {
    if ('yours' in window) {
      const provider = window.yours;
      if (provider?.isYours) {
        return provider;
      }
    }
    window.open('https://chromewebstore.google.com/detail/yours-wallet/mlbnicldlpdimbjdcncnklfempedeipj', '_blank');
    return null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const provider = this.getProvider();
      return provider !== null;
    } catch (error) {
      console.error('Error checking Yours Wallet installation:', error);
      return false;
    }
  }

  async initiateLogin(publicKey?: string): Promise<void> {
    try {
      console.log('Yours Wallet: Initiating login...');
      const provider = this.getProvider();
      
      if (!provider) {
        throw new Error('Yours Wallet is not installed');
      }

      this.provider = provider;

      const response = await provider.connect();
      console.log('Yours Wallet connection response:', response);

      if (response) {
        this.publicKey = response.publicKey;
        this.address = response.address;
        
        // Get initial balance
        const balance = await provider.getBalance();
        this.balance = balance;
        
        console.log('Yours Wallet connected:', {
          address: this.address,
          publicKey: this.publicKey,
          balance: this.balance
        });
      }
    } catch (error) {
      console.error('Failed to connect to Yours Wallet:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.provider) {
        await this.provider.disconnect();
      }
      this.address = '';
      this.balance = 0;
      this.publicKey = null;
      this.provider = null;
    } catch (error) {
      console.error('Failed to disconnect from Yours Wallet:', error);
      throw error;
    }
  }

  async getBalance(): Promise<number> {
    try {
      if (!this.provider) {
        throw new Error('Wallet not connected');
      }
      this.balance = await this.provider.getBalance();
      return this.balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async getAddress(): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Wallet not connected');
      }
      return this.address;
    } catch (error) {
      console.error('Failed to get address:', error);
      throw error;
    }
  }

  async sendPayment(to: string, amount: number): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Wallet not connected');
      }

      if (amount > this.balance) {
        throw new Error('Insufficient funds');
      }

      const result = await this.provider.sendPayment(to, amount);
      return result.txid;
    } catch (error) {
      console.error('Failed to send payment:', error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Wallet not connected');
      }

      const result = await this.provider.signMessage(message);
      return result.signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  async verifyMessage(message: string, signature: string, address: string): Promise<boolean> {
    // This would typically be implemented on the server side
    // or using a BSV library for signature verification
    throw new Error('Message verification not implemented');
  }

  async lockCoins(submissionId: string, amount: number): Promise<void> {
    try {
      if (!this.provider) {
        throw new Error('Wallet not connected');
      }

      // Send payment to the submission address
      await this.sendPayment(submissionId, amount);
    } catch (error) {
      console.error('Failed to lock coins:', error);
      throw error;
    }
  }
} 