declare module '@bsv/sdk' {
  interface TransactionInput {
    address: string;
    amount: number;
  }

  interface TransactionOutput {
    address: string;
    amount: number;
  }

  interface TransactionRequest {
    inputs: TransactionInput[];
    outputs: TransactionOutput[];
  }

  interface Transaction {
    id: string;
    inputs: TransactionInput[];
    outputs: TransactionOutput[];
  }

  interface Block {
    hash: string;
    height: number;
    timestamp: Date;
    transactions: Transaction[];
    metadata?: Record<string, any>;
  }

  interface SendPaymentParams {
    from: string;
    to: string;
    amount: number;
  }

  interface BSV {
    getAddress(): Promise<string>;
    getBalance(): Promise<number>;
    getBlocks(params: { limit: number }): Promise<Block[]>;
    getLatestBlock(): Promise<Block>;
    sendPayment(params: SendPaymentParams): Promise<Transaction>;
    signMessage(message: string): Promise<string>;
    verifyMessage(message: string, signature: string): Promise<boolean>;
    createTransaction(request: TransactionRequest): Promise<Transaction>;
    broadcastTransaction(transaction: Transaction): Promise<void>;
  }

  export const bsv: BSV;
} 