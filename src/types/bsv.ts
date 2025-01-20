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
  sourceTransaction?: Transaction;
  unlockingScriptTemplate?: UnlockingTemplate;
}

export interface UnlockingTemplate {
  sign(tx: Transaction, inputIndex: number): Promise<Script>;
  estimateLength(): number;
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
  tx?: Transaction;
}

export interface TransactionStatus {
  confirmations: number;
  timestamp: number;
}

export interface BSVServiceInterface {
  wallet: {
    getUtxos(): Promise<UTXO[]>;
    fetchWithRetry(url: string): Promise<Response>;
    privateKey: PrivateKey;
    broadcastTransaction(tx: Transaction): Promise<string>;
  };
  getTransactionStatus(txid: string): Promise<TransactionStatus>;
  getWalletAddress(): Promise<string>;
  getUTXO(txid: string): Promise<UTXO | null>;
  getPrivateKey(): Promise<PrivateKey>;
  broadcastTx(tx: Transaction): Promise<string>;
  getTransaction(txid: string): Promise<Transaction>;
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