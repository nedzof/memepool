import { Wallet, WalletType } from '../../../shared/types/wallet';

export class ManualWallet implements Wallet {
  type: WalletType = WalletType.Manual;
  name: string = 'Manual Wallet';
  icon: string = '/icons/manual.svg';
  address: string = '';
  balance: number = 0;

  private privateKey: string = '';

  async isAvailable(): Promise<boolean> {
    return true; // Always available for testing
  }

  async initiateLogin(publicKey?: string): Promise<void> {
    // Simulate wallet connection
    this.privateKey = crypto.randomUUID();
    this.address = `1${this.privateKey.slice(0, 33)}`;
    this.balance = 100; // Start with 100 BSV for testing
  }

  async disconnect(): Promise<void> {
    // Reset wallet state
    this.privateKey = '';
    this.address = '';
    this.balance = 0;
  }

  async getBalance(): Promise<number> {
    return this.balance;
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async sendPayment(to: string, amount: number): Promise<string> {
    if (amount > this.balance) {
      throw new Error('Insufficient funds');
    }

    // Simulate transaction
    this.balance -= amount;
    return crypto.randomUUID(); // Return mock transaction ID
  }

  async signMessage(message: string): Promise<string> {
    // Simulate message signing
    const encoder = new TextEncoder();
    const data = encoder.encode(message + this.privateKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyMessage(message: string, signature: string, address: string): Promise<boolean> {
    // Simulate signature verification
    return true; // Always return true for testing
  }
} 