export interface BtcAccount {
  publicKey: string;
  address: string;
}

export interface PhantomBitcoinProvider {
  isPhantom?: boolean;
  connect: () => Promise<BtcAccount[]>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  requestAccounts: () => Promise<BtcAccount[]>;
  on: (event: PhantomEvent, callback: (args: any) => void) => void;
  removeAllListeners: () => void;
}

export type PhantomEvent = 'accountsChanged' | 'disconnect';

export interface ConnectResponse {
  publicKey: string;
  address: string;
}

export interface PhantomSolanaProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  request: (args: { method: string }) => Promise<any>;
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
}

declare global {
  interface Window {
    phantom?: {
      bitcoin: PhantomBitcoinProvider;
      solana?: PhantomSolanaProvider;
    };
  }
} 