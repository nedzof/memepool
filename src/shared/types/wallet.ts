export enum WalletType {
  BSV = 'BSV',
  Imported = 'Imported',
  Manual = 'Manual'
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: Date;
}

export interface Wallet {
  id: string;
  type: WalletType;
  name: string;
  icon: string;
  address?: string;
  balance?: number;
  isAvailable: () => boolean;
  initiateLogin: () => Promise<boolean>;
  getBalance: () => Promise<number>;
  getAddress: () => Promise<string>;
  sendPayment: (to: string, amount: number) => Promise<Transaction>;
  signMessage: (message: string) => Promise<string>;
  verifyMessage: (message: string, signature: string) => Promise<boolean>;
} 