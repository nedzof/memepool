# TypeScript Types Documentation

## Core BSV Types

### UTXO
Represents an Unspent Transaction Output.
```typescript
interface UTXO {
  txId: string                    // Transaction ID where the UTXO is located
  outputIndex: number             // Output index in the transaction
  script: Script                  // Locking script
  satoshis: number               // Amount in satoshis
  sourceTransaction?: Transaction // Optional source transaction
  unlockingTemplate?: UnlockingTemplate // Optional unlocking template
}
```

### Transaction Types
```typescript
interface TransactionInput {
  sourceTXID: string              // Transaction ID being spent
  sourceOutputIndex: number       // Output index being spent
  sourceSatoshis: number         // Input amount in satoshis
  script: Script                 // Unlocking script
  unlockingScriptTemplate?: UnlockingTemplate  // Optional unlocking template
  sourceTransaction?: Transaction // Optional source transaction
}

interface TransactionOutput {
  lockingScript: Script         // Locking script
  satoshis: number             // Amount in satoshis
  change?: boolean             // Whether this is a change output
}

interface SignedTransaction {
  tx: Transaction              // The transaction object
  inputs: TransactionInput[]   // Array of inputs
  outputs: TransactionOutput[] // Array of outputs
  fee: number                  // Transaction fee in satoshis
}
```

### Unlocking Template
```typescript
interface UnlockingTemplate {
  script: Script
  satoshis: number
  sign(tx: Transaction, inputIndex: number): Promise<Script>
  estimateLength(): number
}
```

## BSV Service Types

### Service Interfaces
```typescript
interface BSVServiceInterface {
  wallet: WalletProvider
  getWalletAddress(): Promise<string>
  getTransactionStatus(txid: string): Promise<TransactionStatus>
  getTransaction(txid: string): Promise<Transaction>
  createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction>
  broadcastTransaction(transaction: SignedTransaction): Promise<string>
  connect(): Promise<boolean>
  connectWallet(): Promise<string>
  getUTXOs(address: string): Promise<UTXO[]>
  estimateFee(inputs: number, outputs: number): number
  getNetworkConfig(): NetworkConfig
}

interface WalletProvider {
  privateKey: PrivateKey
  fetchWithRetry(url: string, options?: RequestInit): Promise<Response>
  getUtxos(): Promise<UTXO[]>
  broadcastTransaction(tx: Transaction): Promise<string>
}

interface TransactionStatus {
  confirmations: number
  timestamp: number
}

interface NetworkConfig {
  network: 'mainnet' | 'testnet'
  apiEndpoint: string
  feePerKb: number
}
```

## Inscription Types

### Content and Metadata
```typescript
type InscriptionContentType = 'video/mp4' | 'video/webm' | 'video/quicktime'

interface VideoChunk {
  sequenceNumber: number
  totalChunks: number
  data: Buffer
  checksum: string
  previousChunkTxid?: string
}

interface ChunkMetadata {
  total: number
  size: number
  references: string[]
}

interface ChunkTracking {
  txids: string[]
  currentChunk: number
  isComplete: boolean
}

interface InscriptionContent {
  type: InscriptionContentType
  data: Buffer | VideoChunk[]
  size: number
  duration: number
  width: number
  height: number
  chunks?: ChunkMetadata
}

interface InscriptionMetadata {
  title: string
  creator: string
  createdAt: number
  attributes: {
    blockHash?: string
    bitrate?: number
    format?: string
    dimensions?: string
    [key: string]: unknown
  }
}
```

### Inscription Core Types
```typescript
interface InscriptionLocation {
  txid: string
  vout: number
  script: Script
  satoshis: number
  height: number
}

interface InscriptionTransaction {
  txid: string
  confirmations: number
  timestamp: number
  fee: number
  blockHeight: number
  chunks?: ChunkTracking
}

interface Inscription {
  id: string
  content: InscriptionContent
  metadata: InscriptionMetadata
  owner: string
  location: InscriptionLocation
  transaction: InscriptionTransaction
  history: InscriptionTransaction[]
}

interface InscriptionValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}
```

### Transfer Types
```typescript
interface InscriptionTransfer {
  inscriptionId: string
  fromAddress: string
  toAddress: string
  transferTx?: SignedTransaction
  status: InscriptionTransferStatus
  timestamp: number
}

type InscriptionTransferStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

interface InscriptionTransferValidation extends InscriptionValidation {
  isValidTransfer: boolean
  transferErrors?: string[]
}

interface InscriptionTransferResult {
  transfer: InscriptionTransfer
  txid: string
  status: 'success' | 'failed'
  error?: string
}
```

## Service Interfaces

### BSV Service
```typescript
interface BSVService {
  getUTXOs(address: string): Promise<UTXO[]>
  createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction>
  broadcastTransaction(transaction: SignedTransaction): Promise<string>
  getTransactionDetails(txid: string): Promise<any>
  estimateFee(inputs: number, outputs: number): number
}
```

### Inscription Service
```typescript
interface InscriptionService {
  createInscription(content: InscriptionContent, metadata: InscriptionMetadata, owner: WalletKeys): Promise<Inscription>
  validateInscription(inscription: Inscription): Promise<InscriptionValidation>
  getInscriptionById(id: string): Promise<Inscription | null>
  listInscriptionsByOwner(address: string): Promise<Inscription[]>
}
```

### Ownership Transfer Service
```typescript
interface OwnershipTransferService {
  prepareTransfer(inscription: Inscription, toAddress: string): Promise<InscriptionTransfer>
  validateTransfer(transfer: InscriptionTransfer): Promise<InscriptionTransferValidation>
  transferInscription(transfer: InscriptionTransfer, senderKeys: WalletKeys): Promise<InscriptionTransferResult>
  verifyOwnership(inscription: Inscription, address: string): Promise<boolean>
  getTransferHistory(inscriptionId: string): Promise<InscriptionTransfer[]>
  getTransferStatus(transferId: string): Promise<InscriptionTransferStatus>
  cancelTransfer(transferId: string): Promise<boolean>
}
```

### Inscription Security Service
```typescript
interface InscriptionSecurityService {
  validateContent(content: InscriptionContent): Promise<InscriptionValidation>
  validateMetadata(metadata: InscriptionMetadata): Promise<InscriptionValidation>
  validateTransfer(transfer: InscriptionTransfer): Promise<InscriptionValidation>
  checkPermissions(address: string, inscription: Inscription): Promise<boolean>
}
```

### Wallet Service
```typescript
interface WalletService {
  createWallet(): Promise<WalletKeys>
  getBalance(address: string): Promise<number>
  fundAddress(address: string, amount: number): Promise<string>
  getNetworkConfig(): NetworkConfig
}

interface WalletKeys {
  privateKey: PrivateKey
  publicKey: PublicKey
  address: string
}
```

## Error Types
```typescript
class BSVError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'BSVError'
  }
}

class InscriptionError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'InscriptionError'
  }
}

class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message)
    this.name = 'ValidationError'
  }
}

class TransferError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'TransferError'
  }
}
```