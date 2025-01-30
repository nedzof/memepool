export {};

interface BtcAccount {
  address: string;
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
  publicKey: string;
  purpose: "payment" | "ordinals";
}

interface PhantomBitcoinProvider {
  isPhantom?: boolean;
  request: (args: { method: string; params?: any }) => Promise<any>;
  on: (event: string, callback: (args: any) => void) => void;
  requestAccounts: () => Promise<BtcAccount[]>;
  connect: () => Promise<{ publicKey: string }>;
}

interface PhantomProvider {
  bitcoin?: PhantomBitcoinProvider;
  solana?: {
    isPhantom?: boolean;
    connect: () => Promise<{ publicKey: { toString: () => string; }; }>;
    disconnect: () => Promise<void>;
    request: (args: { method: string; }) => Promise<any>;
  };
}

declare global {
  interface Window {
    phantom?: PhantomProvider;
  }
} 