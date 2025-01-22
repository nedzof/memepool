import { bsv } from 'scrypt-ts';

// Export all interfaces as type declarations
export type {
  TransactionOutput,
  TransactionInput,
  UnlockingTemplate,
  WalletProvider,
  UTXO,
  TransactionStatus,
  BSVServiceInterface,
  SignedTransaction,
  NetworkType,
  NetworkConfig,
  WalletKeys
};

interface TransactionOutput {
  script: bsv.Script;
  satoshis: number;
}

interface TransactionInput {
  sourceTXID: string;
  sourceOutputIndex: number;
  sourceSatoshis: number;
  script: bsv.Script;
}

interface UnlockingTemplate {
  script: bsv.Script;
  satoshis: number;
  sign: (tx: bsv.Transaction, inputIndex: number) => Promise<bsv.Script>;
  estimateLength: () => number;
}

interface WalletProvider {
  getAddress(): string;
  getPrivateKey(): string;
  getUtxos(): Promise<UTXO[]>;
  signTransaction(tx: bsv.Transaction): Promise<bsv.Transaction>;
  broadcastTransaction(tx: bsv.Transaction): Promise<string>;
}

interface UTXO {
  txId: string;
  outputIndex: number;
  satoshis: number;
  script: bsv.Script;
  tx?: bsv.Transaction;
  unlockingTemplate?: UnlockingTemplate;
}

interface TransactionStatus {
  confirmations: number;
  timestamp: number;
}

interface BSVServiceInterface {
  connect(): Promise<boolean>;
  getWalletAddress(): Promise<string>;
  getPrivateKey(): Promise<bsv.PrivateKey>;
  getUTXO(txid: string): Promise<UTXO | null>;
  getUTXOs(address: string): Promise<UTXO[]>;
  getTransaction(txid: string): Promise<bsv.Transaction>;
  getTransactionStatus(txid: string): Promise<{ confirmations: number; timestamp: number }>;
  createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction>;
  broadcastTx(tx: bsv.Transaction): Promise<string>;
  estimateFee(inputCount: number, outputCount: number): number;
}

interface SignedTransaction {
  tx: bsv.Transaction;
  fee: number;
}

type NetworkType = 'mainnet' | 'testnet';

interface NetworkConfig {
  apiUrl: string;
  feeRate: number;
}

interface WalletKeys {
  privateKey: bsv.PrivateKey;
  publicKey: bsv.PublicKey;
  address: string;
} 