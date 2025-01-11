import type { 
  UTXO, 
  TransactionInput, 
  TransactionOutput,
  WalletKeys,
  NetworkConfig
} from './bsv'
import { Transaction } from '@bsv/sdk'

import type {
  Inscription,
  InscriptionContent,
  InscriptionMetadata,
  InscriptionValidation
} from './inscription'

// Transaction types
export interface SignedTransaction {
  tx: Transaction;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  fee: number;
}

// Transfer types
export interface InscriptionTransfer {
  inscriptionId: string;
  fromAddress: string;
  toAddress: string;
  transferTx?: SignedTransaction;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: number;
}

export interface InscriptionTransferValidation extends InscriptionValidation {
  isValidTransfer: boolean;
  transferErrors?: string[];
}

export interface InscriptionTransferResult {
  transfer: InscriptionTransfer;
  txid: string;
  status: 'success' | 'failed';
  error?: string;
}

export type InscriptionTransferStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

// Service interfaces
export interface BSVService {
  getUTXOs(address: string): Promise<UTXO[]>;
  createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction>;
  broadcastTransaction(transaction: SignedTransaction): Promise<string>;
  getTransactionDetails(txid: string): Promise<any>;
  estimateFee(inputs: number, outputs: number): number;
}

export interface InscriptionService {
  createInscription(content: InscriptionContent, metadata: InscriptionMetadata, owner: WalletKeys): Promise<Inscription>;
  validateInscription(inscription: Inscription): Promise<InscriptionValidation>;
  getInscriptionById(id: string): Promise<Inscription | null>;
  listInscriptionsByOwner(address: string): Promise<Inscription[]>;
}

export interface OwnershipTransferService {
  prepareTransfer(inscription: Inscription, toAddress: string): Promise<InscriptionTransfer>;
  validateTransfer(transfer: InscriptionTransfer): Promise<InscriptionTransferValidation>;
  transferInscription(transfer: InscriptionTransfer, senderKeys: WalletKeys): Promise<InscriptionTransferResult>;
  verifyOwnership(inscription: Inscription, address: string): Promise<boolean>;
  getTransferHistory(inscriptionId: string): Promise<InscriptionTransfer[]>;
  getTransferStatus(transferId: string): Promise<InscriptionTransferStatus>;
  cancelTransfer(transferId: string): Promise<boolean>;
}

export interface InscriptionSecurityService {
  validateContent(content: InscriptionContent): Promise<InscriptionValidation>;
  validateMetadata(metadata: InscriptionMetadata): Promise<InscriptionValidation>;
  validateTransfer(transfer: InscriptionTransfer): Promise<InscriptionValidation>;
  checkPermissions(address: string, inscription: Inscription): Promise<boolean>;
}

export interface WalletService {
  createWallet(): Promise<WalletKeys>;
  getBalance(address: string): Promise<number>;
  fundAddress(address: string, amount: number): Promise<string>;
  getNetworkConfig(): NetworkConfig;
} 