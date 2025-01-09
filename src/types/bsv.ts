import { Script, Transaction, PrivateKey, PublicKey } from '@bsv/sdk'

export interface UTXO {
  txid: string
  vout: number
  script: string
  satoshis: number
  height?: number
  confirmations?: number
}

export interface TransactionInput {
  sourceTransactionHash: string
  sourceOutputIndex: number
  script: Script
  sequence?: number
}

export interface TransactionOutput {
  lockingScript: Script
  satoshis: number
  change?: boolean
}

export interface SignedTransaction {
  tx: Transaction
  inputs: TransactionInput[]
  outputs: TransactionOutput[]
  fee: number
}

export interface WalletKeys {
  privateKey: PrivateKey
  publicKey: PublicKey
  address: string
}

export interface TransactionMetadata {
  txid: string
  blockHeight?: number
  confirmations: number
  timestamp?: number
  fee: number
}

export interface NetworkConfig {
  network: 'mainnet' | 'testnet'
  apiEndpoint: string
  feePerKb: number
} 