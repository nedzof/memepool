interface PhantomBtcAccount {
  address: string;
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
  publicKey: string;
  purpose: "payment" | "ordinals";
}

interface PhantomBitcoinProvider {
  isPhantom?: boolean;
  requestAccounts: () => Promise<PhantomBtcAccount[]>;
  disconnect: () => Promise<void>;
}

interface Phantom {
  bitcoin?: PhantomBitcoinProvider;
}

declare global {
  interface Window {
    phantom?: Phantom;
  }
} 