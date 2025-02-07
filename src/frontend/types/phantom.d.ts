export interface BtcAccount {
  publicKey: string;
  address: string;
}

export interface PhantomBitcoinProvider {
  isPhantom?: boolean;
  connect: () => Promise<BtcAccount[]>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  on: (event: string, callback: (args: any) => void) => void;
  removeAllListeners: () => void;
}

export interface ConnectResponse {
  publicKey: string;
  address: string;
}

export interface PhantomSolanaProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  request: (args: { method: string }) => Promise<any>;
}

declare global {
  interface Window {
    phantom?: {
      bitcoin?: PhantomBitcoinProvider;
      solana?: {
        isPhantom?: boolean;
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
        request: (args: { method: string }) => Promise<any>;
      };
    };
  }
} 