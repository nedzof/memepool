import { Wallet, WalletType } from '../../../shared/types/wallet';
import { bsv } from '@bsv/sdk';

export class BSVWallet implements Wallet {
  type: WalletType = WalletType.BSV;
  name: string = 'BSV Wallet';
  icon: string = '/icons/bsv.svg';
  address: string = '';
  balance: number = 0;

  async isAvailable(): Promise<boolean> {
    try {
      // Check if BSV wallet is available in the browser
      return typeof window !== 'undefined' && 'bsv' in window;
    } catch {
      return false;
    }
  }

  async initiateLogin(): Promise<void> {
    try {
      // Request wallet connection
      await bsv.requestAccounts();
      
      // Get address and balance
      this.address = await this.getAddress();
      this.balance = await this.getBalance();
    } catch (error) {
      throw new Error('Failed to connect BSV wallet');
    }
  }

  async getBalance(): Promise<number> {
    try {
      const balance = await bsv.getBalance(this.address);
      return Number(balance);
    } catch (error) {
      throw new Error('Failed to get balance');
    }
  }

  async getAddress(): Promise<string> {
    try {
      const [address] = await bsv.getAccounts();
      return address;
    } catch (error) {
      throw new Error('Failed to get address');
    }
  }

  async sendPayment(to: string, amount: number): Promise<string> {
    try {
      const tx = await bsv.sendPayment({
        from: this.address,
        to,
        amount
      });
      return tx.id;
    } catch (error) {
      throw new Error('Failed to send payment');
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      const signature = await bsv.signMessage(message, this.address);
      return signature;
    } catch (error) {
      throw new Error('Failed to sign message');
    }
  }

  async verifyMessage(message: string, signature: string, address: string): Promise<boolean> {
    try {
      return await bsv.verifyMessage(message, signature, address);
    } catch (error) {
      throw new Error('Failed to verify message');
    }
  }
} 