declare module '@bsv/sdk' {
  interface Transaction {
    id: string;
    inputs: Array<{
      address: string;
      value: number;
    }>;
    outputs: Array<{
      address: string;
      value: number;
    }>;
  }

  interface Block {
    hash: string;
    height: number;
    transactions: Transaction[];
    metadata?: {
      threshold?: number;
    };
  }

  interface SendPaymentParams {
    from: string;
    to: string;
    amount: number;
  }

  interface BSV {
    requestAccounts(): Promise<string[]>;
    getAccounts(): Promise<string[]>;
    getBalance(address: string): Promise<string>;
    getBlocks(params: { limit: number }): Promise<Block[]>;
    getLatestBlock(): Promise<Block>;
    sendPayment(params: SendPaymentParams): Promise<Transaction>;
    signMessage(message: string, address: string): Promise<string>;
    verifyMessage(message: string, signature: string, address: string): Promise<boolean>;
  }

  export const bsv: BSV;
} 