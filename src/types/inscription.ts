import type { UTXO, TransactionMetadata, SignedTransaction } from './bsv'

export interface InscriptionContent {
  type: 'video/mp4' | 'video/webm' | 'video/quicktime'
  data: Buffer
  size: number
  duration?: number
  width?: number
  height?: number
}

export interface InscriptionMetadata {
  title: string
  description?: string
  creator: string
  createdAt: number
  tags?: string[]
  attributes?: Record<string, string | number | boolean>
}

export interface Inscription {
  id: string
  content: InscriptionContent
  metadata: InscriptionMetadata
  owner: string
  location: UTXO
  transaction: TransactionMetadata
  history: InscriptionHistory[]
}

export interface InscriptionHistory {
  txid: string
  previousOwner: string
  newOwner: string
  timestamp: number
  blockHeight?: number
}

export interface InscriptionValidation {
  isValid: boolean
  errors?: string[]
  warnings?: string[]
}

export interface InscriptionTransfer {
  inscription: Inscription
  fromAddress: string
  toAddress: string
  fee: number
  timestamp: number
  status?: InscriptionTransferStatus
  transaction?: SignedTransaction
}

export interface InscriptionTransferStatus {
  state: 'pending' | 'processing' | 'completed' | 'failed'
  confirmations: number
  error?: string
  lastUpdated: number
}

export interface InscriptionTransferValidation extends InscriptionValidation {
  hasValidSource: boolean
  hasValidDestination: boolean
  hasSufficientFunds: boolean
  isAuthorized: boolean
  estimatedFee: number
}

export interface InscriptionTransferResult {
  transfer: InscriptionTransfer
  transaction: SignedTransaction
  txid: string
  status: InscriptionTransferStatus
  validation: InscriptionTransferValidation
}

export interface InscriptionIndexEntry {
  id: string
  owner: string
  location: UTXO
  metadata: InscriptionMetadata
  contentHash: string
} 