export interface BtcAccount {
  address: string;
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
  publicKey: string;
  purpose: "payment" | "ordinals";
}

export interface ConnectResponse {
  accounts: BtcAccount[];
}

export interface PhantomBitcoinProvider {
  isPhantom: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<ConnectResponse>;
  disconnect: () => Promise<void>;
  request: (args: { method: string; params?: any }) => Promise<any>;
  signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: string }>;
  on: (event: string, handler: Function) => void;
  removeAllListeners: () => void;
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