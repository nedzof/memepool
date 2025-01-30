export {};

declare global {
  interface Window {
    phantom?: {
      bitcoin?: {
        isPhantom?: boolean;
        request: (args: { method: string; params?: any }) => Promise<any>;
        on: (event: string, callback: (args: any) => void) => void;
        requestAccounts: () => Promise<{
          address: string;
          addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
          publicKey: string;
          purpose: "payment" | "ordinals";
        }[]>;
      };
      [key: string]: any;
    };
  }
} 