import type { ReactNode } from 'react';

declare module 'yours-wallet-provider' {
  export interface Addresses extends Array<string> {
    [index: number]: string;
    length: number;
  }
  
  export interface Balance extends Number {
    toString: () => string;
    valueOf: () => number;
  }
  
  export type SignMessage = string;
  
  export interface SignedMessage {
    signedMessage: string;
  }

  export interface YoursWallet {
    isReady: boolean;
    connect: () => Promise<string>;
    disconnect: () => Promise<void>;
    isConnected: () => Promise<boolean>;
    getAddresses: () => Promise<Addresses>;
    getAddress: () => Promise<string>;
    getBalance: () => Promise<Balance>;
    signMessage: (message: SignMessage) => Promise<SignedMessage>;
    sendPayment: (to: string, amount: number) => Promise<{ txid: string }>;
    on: (event: YoursEvent, handler: Function) => void;
    removeAllListeners: () => void;
  }

  export type YoursEvent = 'switchAccount' | 'signedOut';

  export function useYoursWallet(): YoursWallet | undefined;
  export function YoursProvider(props: { children: ReactNode }): JSX.Element;
} 