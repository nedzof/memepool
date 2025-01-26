export enum WalletType {
  BSV = 'bsv',
  Manual = 'manual',
  Imported = 'imported'
}

export interface Wallet {
  type: WalletType;
  name: string;
  icon?: string;
  address: string;
  balance: number;
  isAvailable: () => boolean;
  initiateLogin: () => Promise<void>;
  getBalance: () => Promise<number>;
  getAddress: () => string;
  sendPayment: (amount: number, recipientAddress: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  verifyMessage: (message: string, signature: string, address: string) => Promise<boolean>;
} 