export interface PhantomBitcoinProvider {
  isPhantom: boolean;
  request: (args: { method: string; params?: any }) => Promise<any>;
  on?: (event: string, handler: Function) => void;
  removeAllListeners?: () => void;
}

export interface PhantomSolanaProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  request: (args: { method: string }) => Promise<any>;
}

export interface BtcAccount {
  address: string;
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
  publicKey: string;
  purpose: "payment" | "ordinals";
}

declare global {
  interface Window {
    phantom?: {
      bitcoin?: PhantomBitcoinProvider;
      solana?: PhantomSolanaProvider;
    };
  }
} 