import { bsv } from 'scrypt-ts';

export interface TransactionOutput {
  script: bsv.Script;
  satoshis: number;
}

export interface TransactionInput {
  sourceTXID: string;
  sourceOutputIndex: number;
  sourceSatoshis: number;
  script: bsv.Script;
}

export interface UnlockingTemplate {
  script: bsv.Script;
  satoshis: number;
  sign: (tx: bsv.Transaction, inputIndex: number) => Promise<bsv.Script>;
  estimateLength: () => number;
}

export interface WalletProvider {
  getAddress(): string;
  getPrivateKey(): string;
  getUtxos(): Promise<UTXO[]>;
  signTransaction(tx: bsv.Transaction): Promise<bsv.Transaction>;
  broadcastTransaction(tx: bsv.Transaction): Promise<string>;
}

export interface UTXO {
  txId: string;
  outputIndex: number;
  satoshis: number;
  script: bsv.Script;
  tx?: bsv.Transaction;
  unlockingTemplate?: UnlockingTemplate;
}

export interface TransactionStatus {
  confirmations: number;
  timestamp: number;
}

export interface BSVServiceInterface {
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

export interface SignedTransaction {
  tx: bsv.Transaction;
  fee: number;
}

export type NetworkType = 'mainnet' | 'testnet';

export interface NetworkConfig {
  apiUrl: string;
  feeRate: number;
}

export interface WalletKeys {
  privateKey: bsv.PrivateKey;
  publicKey: bsv.PublicKey;
  address: string;
} 