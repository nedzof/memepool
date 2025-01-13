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
  sequenceNumber?: number        // Optional sequence number for locktime
}

interface TransactionOutput {
  lockingScript: Script         // Locking script
  satoshis: number             // Amount in satoshis
  change?: boolean             // Whether this is a change output
}

interface Transaction {
  version: number              // Transaction version
  lockTime?: number           // Optional locktime (block height or timestamp)
  inputs: TransactionInput[]   // Array of inputs
  outputs: TransactionOutput[] // Array of outputs
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

### Script Types
```typescript
interface Script {
  toHex(): string
  fromHex(hex: string): Script
  add(data: Buffer): Script
  clone(): Script
}

interface MEMEMarkerScript extends Script {
  readonly MARKER: string     // MEME marker constant
  validate(): boolean        // Validates MEME marker structure
  getPosition(): number     // Gets marker position in script
}

interface CombinedScriptTemplate {
  createScript(address: string): Script
  validate(script: Script): boolean
  estimateSize(): number
  separateComponents(script: Script): {
    p2pkhScript: Script
    markerScript: MEMEMarkerScript
  }
}

interface P2PKHTemplate {
  lock(address: string): Script
  unlock(privateKey: PrivateKey): UnlockingTemplate
}
```

### Locktime Types
```typescript
enum LocktimeType {
  BLOCK_HEIGHT = 'block_height',  // Locktime is a block height
  TIMESTAMP = 'timestamp'         // Locktime is a Unix timestamp
}

interface LocktimeConfig {
  type: LocktimeType
  value: number                  // Block height or timestamp
  sequence?: number             // Optional sequence number
}

interface LocktimeValidation {
  isValid: boolean
  errors: string[]
  currentHeight?: number        // Current block height if relevant
  currentTime?: number         // Current timestamp if relevant
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

## Video Types (`src/types/video.ts`)

```typescript
export interface VideoMetadata {
  duration: number;
  dimensions: {
    width: number;
    height: number;
  };
  codec: string;
  bitrate: number;
}

export interface VideoFile {
  buffer: Buffer;
  name: string;
  size: number;
  type: string;
}

export interface VideoFormatValidation {
  isValid: boolean;
  format: string;
}

export interface VideoProcessorOptions {
  maxDuration?: number;        // Maximum video duration in seconds
  maxSize?: number;           // Maximum file size in bytes
  supportedFormats?: string[]; // Supported video formats
}

export interface VideoProcessingResult {
  metadata: VideoMetadata;
  buffer: Buffer;             // Video data as buffer
  format: InscriptionContentType;
  thumbnail?: string;         // Optional base64 thumbnail
}

export interface VideoProcessor {
  verifyFormat(file: File): Promise<VideoFormatValidation>;
  extractMetadata(file: File): Promise<VideoMetadata>;
  processVideo(file: File): Promise<VideoProcessingResult>;
  generateThumbnail(file: File): Promise<string>;
  cleanup(urls: string[]): void;
}
```

## Inscription Types (`src/types/inscription.ts`)

```typescript
export interface InscriptionCreationParams {
  videoFile: VideoFile;
  metadata: VideoMetadata;
  creatorAddress: string;
  blockHash: string;
}

export type InscriptionContentType = 'video/mp4' | 'video/webm' | 'video/quicktime';

export interface VideoChunk {
  sequenceNumber: number;
  totalChunks: number;
  data: Buffer;
  checksum: string;
  previousChunkTxid?: string;
}

export interface ChunkMetadata {
  total: number;
  size: number;
  references: string[];
}

export interface ChunkTracking {
  txids: string[];
  currentChunk: number;
  isComplete: boolean;
}

export interface InscriptionContent {
  type: InscriptionContentType;
  data: Buffer | VideoChunk[];
  size: number;
  duration: number;
  width: number;
  height: number;
  chunks?: ChunkMetadata;
}

export interface InscriptionMetadata {
  type: string;
  version: string;
  content: {
    type: string;
    size: number;
    duration: number;
    width: number;
    height: number;
  };
  metadata: {
    title: string;
    creator: string;
    createdAt: number;
    attributes: {
      blockHash: string;
      bitrate: number;
      format: string;
      dimensions: string;
    };
  };
}

export interface InscriptionLocation {
  txid: string;
  vout: number;
  script: Script;
  satoshis: number;
  height: number;
  originalInscriptionId?: string;
}

export interface InscriptionTransaction {
  txid: string;
  confirmations: number;
  timestamp: number;
  fee: number;
  blockHeight: number;
  chunks?: ChunkTracking;
}

export interface Inscription {
  txid: string;
  content: InscriptionContent;
  metadata: InscriptionMetadata;
  owner: string;
  location: InscriptionLocation;
  transaction: InscriptionTransaction;
  history: InscriptionTransaction[];
}

export interface InscriptionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface InscriptionHolderScript {
  p2pkhScript: string;
  memeMarker: string;
  originalInscriptionId: string;
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