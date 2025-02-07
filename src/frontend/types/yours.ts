export interface YoursWalletProvider {
  isReady: boolean;
  connect: () => Promise<string>; // Returns identity public key
  disconnect: () => Promise<void>;
  isConnected: () => Promise<boolean>;
  getAddresses: () => Promise<string[]>;
  getAddress: () => Promise<string>;
  getBalance: () => Promise<number>;
  signMessage: (message: string) => Promise<{ signature: string }>;
  sendPayment: (to: string, amount: number) => Promise<{ txid: string }>;
  on: (event: YoursEvent, handler: Function) => void;
  removeAllListeners: () => void;
}

export type YoursEvent = 'connect' | 'disconnect' | 'accountChanged';

declare global {
  interface Window {
    yours?: YoursWalletProvider;
  }
} 