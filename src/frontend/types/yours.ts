export interface YoursWalletProvider {
  isYours: boolean;
  connect: () => Promise<ConnectResponse>;
  disconnect: () => Promise<void>;
  getAddress: () => Promise<string>;
  getBalance: () => Promise<number>;
  signMessage: (message: string) => Promise<{ signature: string }>;
  sendPayment: (to: string, amount: number) => Promise<{ txid: string }>;
  on: (event: YoursEvent, handler: Function) => void;
  removeAllListeners: () => void;
}

export interface ConnectResponse {
  address: string;
  publicKey: string;
}

export type YoursEvent = 'connect' | 'disconnect' | 'accountChanged';

declare global {
  interface Window {
    yours?: YoursWalletProvider;
  }
} 