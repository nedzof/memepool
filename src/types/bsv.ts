import { Transaction, Script, PublicKey, PrivateKey, Signature } from '@bsv/sdk';
import { SignedTransaction } from './services';

export interface TransactionOutput {
  satoshis: number;
  lockingScript: Script;
  change?: boolean;
}

export interface TransactionInput {
  sourceTXID: string;
  sourceOutputIndex: number;
  sourceSatoshis: number;
  script: Script;
  unlockingScriptTemplate?: UnlockingTemplate;
  sourceTransaction?: Transaction;
}

export interface UnlockingTemplate {
  script: Script
  satoshis: number
  sign(tx: Transaction, inputIndex: number): Promise<Script>
  estimateLength(): number
}

export interface WalletProvider {
  privateKey: PrivateKey;
  fetchWithRetry(url: string, options?: RequestInit): Promise<Response>;
  getUtxos(): Promise<UTXO[]>;
  broadcastTransaction(tx: Transaction): Promise<string>;
}

export interface UTXO {
  txId: string;
  outputIndex: number;
  script: Script;
  satoshis: number;
  sourceTransaction?: Transaction;
  unlockingTemplate?: UnlockingTemplate;
}

export interface TransactionStatus {
  confirmations: number;
  timestamp: number;
}

export interface BSVServiceInterface {
  wallet: WalletProvider;
  getWalletAddress(): Promise<string>;
  getTransactionStatus(txid: string): Promise<TransactionStatus>;
  getTransaction(txid: string): Promise<Transaction>;
  createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction>;
  broadcastTransaction(transaction: SignedTransaction): Promise<string>;
  connect(): Promise<boolean>;
  connectWallet(): Promise<string>;
  getUTXOs(address: string): Promise<UTXO[]>;
  estimateFee(inputs: number, outputs: number): number;
  getNetworkConfig(): NetworkConfig;
}

// Network types
export interface NetworkConfig {
  network: 'mainnet' | 'testnet';
  apiEndpoint: string;
  feePerKb: number;
}

// Wallet types
export interface WalletKeys {
  privateKey: PrivateKey;
  publicKey: PublicKey;
  address: string;
} 