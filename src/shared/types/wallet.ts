export enum WalletType {
  BSV = 'BSV',
  Manual = 'Manual',
  Imported = 'Imported'
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
}

export interface Wallet {
  type: WalletType;
  name: string;
  icon: string;
  address: string;
  balance: number;

  isAvailable(): Promise<boolean>;
  initiateLogin(publicKey?: string): Promise<void>;
  disconnect(): Promise<void>;
  getBalance(): Promise<number>;
  getAddress(): Promise<string>;
  sendPayment(to: string, amount: number): Promise<string>;
  signMessage(message: string): Promise<string>;
  verifyMessage(message: string, signature: string, address: string): Promise<boolean>;
  deriveNextAddress?(): Promise<string>;
  lockCoins(submissionId: string, amount: number): Promise<void>;
} 