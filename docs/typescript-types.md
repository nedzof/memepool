# TypeScript Types Documentation

## Core BSV Types

### UTXO
Represents an Unspent Transaction Output.
```typescript
interface UTXO {
  txid: string          // Transaction ID where the UTXO is located
  vout: number          // Output index in the transaction
  script: string        // Locking script in hex format
  satoshis: number      // Amount in satoshis
  height?: number       // Block height where the UTXO was created
  confirmations?: number // Number of confirmations
}
```

### Transaction Types
```typescript
interface TransactionInput {
  sourceTransactionHash: string  // Transaction ID being spent
  sourceOutputIndex: number      // Output index being spent
  script: Script                 // Unlocking script
  sequence?: number              // Input sequence number
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

## BSV SDK Types

### SDK Transaction Types
```typescript
interface SDKTransactionInput {
  sourceTransaction?: Transaction        // Optional source transaction
  sourceTransactionHash: string         // Transaction ID being spent
  sourceOutputIndex: number             // Output index being spent
  unlockingScript?: Script              // Optional unlocking script
  unlockingScriptTemplate?: P2PKH       // Optional P2PKH template
  sequence?: number                     // Optional sequence number
}

interface SDKTransactionOutput {
  lockingScript: Script                // Locking script
  satoshis: number                    // Amount in satoshis
  change?: boolean                    // Whether this is a change output
}

interface SDKTransaction {
  addInput(input: SDKTransactionInput): SDKTransaction
  addOutput(output: SDKTransactionOutput): SDKTransaction
  sign(privateKey?: PrivateKey): Promise<SDKTransaction>
  toHex(): string
  fee(): Promise<number>
}
```

### Wallet Provider Interface
```typescript
interface WalletProvider {
  getAddress(): Promise<string>                              // Get wallet address
  getBalance(): Promise<number>                              // Get wallet balance
  signTransaction(tx: SDKTransaction): Promise<SignedTransaction>  // Sign a transaction
  privateKey: PrivateKey                                     // Wallet's private key
}
```

## Testnet Wallet Types

### UTXO Management
```typescript
interface WhatsOnChainUTXO {
  tx_hash: string     // Transaction hash
  tx_pos: number      // Output position
  value: number       // Amount in satoshis
}

interface FormattedUTXO {
  txId: string                     // Transaction ID
  outputIndex: number              // Output index
  satoshis: number                 // Amount in satoshis
  script: Script                   // Locking script
  unlockingTemplate: UnlockingTemplate  // Template for unlocking
  sourceTransaction?: Transaction       // Optional source transaction
}
```

### Transaction Templates
```typescript
interface UnlockingTemplate {
  sign: (tx: Transaction, inputIndex: number) => Promise<Script>  // Sign input
  estimateLength: () => Promise<number>                          // Estimate script length
}

interface ExtendedTransaction extends Transaction {
  inputs: Array<TransactionInput & {
    sourceSatoshis?: number   // Input amount
    satoshis?: number         // Alternative amount field
    value?: number            // Another alternative amount field
  }>
}
```

### Network Types
```typescript
interface FetchOptions extends RequestInit {
  headers?: Record<string, string>  // Custom headers
}

interface TransactionStatus {
  confirmed: boolean        // Whether transaction is confirmed
  confirmations: number     // Number of confirmations
  timestamp: number         // Transaction timestamp
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

## Service Interfaces

### BSV Service
```typescript
interface BSVService {
  getUTXOs(address: string): Promise<UTXO[]>
  createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction>
  broadcastTransaction(transaction: SignedTransaction): Promise<string>
  getTransactionDetails(txid: string): Promise<TransactionStatus>
  estimateFee(inputs: number, outputs: number): number
  getNetworkConfig(): NetworkConfig
}
```

### Testnet Wallet Service
```typescript
class TestnetWallet {
  constructor(wifKey?: string)
  getAddress(): string
  getPrivateKey(): string
  getUtxos(): Promise<FormattedUTXO[]>
  signTransaction(tx: Transaction): Promise<Transaction>
  broadcastTransaction(tx: Transaction): Promise<string>
}
```

### Wallet Types
```typescript
interface WalletKeys {
  privateKey: PrivateKey      // BSV private key
  publicKey: PublicKey        // BSV public key
  address: string             // BSV address
}

interface NetworkConfig {
  network: 'mainnet' | 'testnet'  // Network type
  apiEndpoint: string             // API endpoint URL
  feePerKb: number                // Fee rate in satoshis per KB
}
```

## Inscription Types

### Content and Metadata
```typescript
interface InscriptionContent {
  type: 'video/mp4' | 'video/webm' | 'video/quicktime'  // Video MIME type
  data: Buffer       // Video data buffer
  size: number       // Size in bytes
  duration?: number  // Duration in seconds
  width?: number     // Video width
  height?: number    // Video height
}

interface InscriptionMetadata {
  title: string      // Inscription title
  description?: string  // Optional description
  creator: string    // Creator's address or identifier
  createdAt: number  // Creation timestamp
  tags?: string[]    // Optional tags
  attributes?: Record<string, string | number | boolean>  // Custom attributes
}
```

### Inscription Core Types
```typescript
interface Inscription {
  id: string                    // Unique inscription ID
  content: InscriptionContent   // Video content
  metadata: InscriptionMetadata // Metadata
  owner: string                 // Current owner's address
  location: UTXO               // Current UTXO location
  transaction: TransactionMetadata  // Creation transaction info
  history: InscriptionHistory[]    // Ownership history
}

interface InscriptionHistory {
  txid: string        // Transaction ID
  previousOwner: string  // Previous owner's address
  newOwner: string      // New owner's address
  timestamp: number     // Transfer timestamp
  blockHeight?: number  // Block height of transfer
}
```

### Transfer Types
```typescript
interface InscriptionTransfer {
  inscription: Inscription   // Inscription being transferred
  fromAddress: string       // Sender's address
  toAddress: string         // Recipient's address
  fee: number              // Transfer fee
  timestamp: number        // Transfer initiation time
  status?: InscriptionTransferStatus  // Current transfer status
  transaction?: SignedTransaction     // Transfer transaction
}

interface InscriptionTransferStatus {
  state: 'pending' | 'processing' | 'completed' | 'failed'
  confirmations: number    // Number of confirmations
  error?: string          // Error message if failed
  lastUpdated: number     // Last status update timestamp
}

interface InscriptionTransferValidation extends InscriptionValidation {
  hasValidSource: boolean       // Source address is valid
  hasValidDestination: boolean  // Destination address is valid
  hasSufficientFunds: boolean   // Sufficient funds for transfer
  isAuthorized: boolean         // Transfer is authorized
  estimatedFee: number          // Estimated transfer fee
}

interface InscriptionTransferResult {
  transfer: InscriptionTransfer          // Transfer details
  transaction: SignedTransaction         // Completed transaction
  txid: string                          // Transaction ID
  status: InscriptionTransferStatus     // Current status
  validation: InscriptionTransferValidation  // Validation results
}
```

## Inscription Architecture

### Overview
The inscription system uses a combination of OP_RETURN data storage and special marker UTXOs to manage video assets on the BSV blockchain:

1. **Content Storage**: Video metadata and content hash stored in OP_RETURN
2. **Ownership**: Represented by special 1-sat nonstandard UTXOs with protection markers
3. **Transfers**: Economic transfers of marker UTXOs rather than full content

### Inscription Creation Example
```typescript
// 1. Prepare video content and metadata
const content: InscriptionContent = {
  type: 'video/mp4',
  data: videoBuffer,
  size: videoBuffer.length,
  duration: 120,
  width: 1920,
  height: 1080
}

const metadata: InscriptionMetadata = {
  title: "My Video NFT",
  description: "An amazing video creation",
  creator: creatorAddress,
  createdAt: Date.now(),
  tags: ["video", "nft"],
  attributes: {
    quality: "4K",
    category: "entertainment"
  }
}

// 2. Create inscription transaction
const inscription = await inscriptionService.createInscription(
  content,
  metadata,
  creatorKeys
)

// The service will:
// 1. Store content hash and metadata in OP_RETURN
// 2. Create special 1-sat UTXO with protection marker
// 3. Lock UTXO to creator's address
```

### Protection Marker Implementation
```typescript
interface ProtectedOutput extends TransactionOutput {
  lockingScript: Script  // P2PKH script + protection marker
  satoshis: 1           // Always 1 satoshi for inscription UTXOs
  protectionMarker: {
    prefix: 'MEME'      // Standard prefix for our inscriptions
    data?: Buffer       // Optional additional protection data
  }
}

// Example of creating protected output
const protectedOutput: ProtectedOutput = {
  lockingScript: createProtectedScript(recipientAddress),
  satoshis: 1,
  protectionMarker: { prefix: 'MEME' }
}

// Helper to create protected script
function createProtectedScript(address: string): Script {
  const p2pkhScript = new P2PKH().lock(address)
  const protectionMarker = Buffer.from('MEME')
  
  return Script.fromASM(`
    ${p2pkhScript.toASM()}
    OP_RETURN
    ${protectionMarker.toString('hex')}
  `)
}
```

### Ownership Transfer Example
```typescript
// 1. Prepare transfer
const transfer = await ownershipTransferService.prepareTransfer(
  inscription,
  recipientAddress
)

// 2. Validate transfer
const validation = await ownershipTransferService.validateTransfer(transfer)
if (!validation.isValid) {
  throw new Error(`Invalid transfer: ${validation.errors?.join(', ')}`)
}

// 3. Execute transfer
const result = await ownershipTransferService.transferInscription(
  transfer,
  senderKeys
)

// The service will:
// 1. Spend current inscription UTXO
// 2. Create new 1-sat UTXO with protection marker
// 3. Lock to recipient's address
// 4. Handle change and fees
```

### Ownership Verification Example
```typescript
// Verify current ownership
const isOwner = await ownershipTransferService.verifyOwnership(
  inscription,
  address
)

// Get full ownership history
const history = await ownershipTransferService.getTransferHistory(
  inscription.id
)

// Example history entry
interface InscriptionHistory {
  txid: string           // Transfer transaction ID
  previousOwner: string  // Previous owner's address
  newOwner: string       // New owner's address
  timestamp: number      // Transfer timestamp
  blockHeight?: number   // Block height of transfer
}
```

### UTXO Tracking Example
```typescript
// Find inscription UTXOs
const utxos = await bsvService.getUTXOs(address)
const inscriptionUtxos = utxos.filter(utxo => 
  isInscriptionUtxo(utxo.script)
)

// Helper to identify inscription UTXOs
function isInscriptionUtxo(script: string): boolean {
  // Check for 1-sat value and protection marker
  return (
    script.includes('6a044d454d45') && // OP_RETURN MEME
    utxo.satoshis === 1
  )
}

// Get inscription details from UTXO
const inscription = await inscriptionService.getInscriptionFromUtxo(utxo)
```

## Service Interfaces

### BSV Service
Handles core BSV blockchain operations.
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
Manages inscription creation and validation.
```typescript
interface InscriptionService {
  createInscription(content: InscriptionContent, metadata: InscriptionMetadata, owner: WalletKeys): Promise<Inscription>
  validateInscription(inscription: Inscription): Promise<InscriptionValidation>
  getInscriptionById(id: string): Promise<Inscription | null>
  listInscriptionsByOwner(address: string): Promise<Inscription[]>
}
```

### Ownership Transfer Service
Handles inscription ownership transfers.
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

### Security Service
Handles security validations.
```typescript
interface InscriptionSecurityService {
  validateContent(content: InscriptionContent): Promise<InscriptionValidation>
  validateMetadata(metadata: InscriptionMetadata): Promise<InscriptionValidation>
  validateTransfer(transfer: InscriptionTransfer): Promise<InscriptionValidation>
  checkPermissions(address: string, inscription: Inscription): Promise<boolean>
}
```

### Wallet Service
Manages wallet operations.
```typescript
interface WalletService {
  createWallet(): Promise<WalletKeys>
  getBalance(address: string): Promise<number>
  fundAddress(address: string, amount: number): Promise<string>
  getNetworkConfig(): NetworkConfig
}
```

## Error Handling
```typescript
// Inscription-specific errors
class InscriptionError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_FORMAT' | 'SIZE_EXCEEDED' | 'MARKER_MISSING' | 'TRANSFER_FAILED'
  ) {
    super(message)
    this.name = 'InscriptionError'
  }
}

// Transfer-specific errors
class TransferError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'INSUFFICIENT_FUNDS' | 'INVALID_UTXO' | 'NETWORK_ERROR'
  ) {
    super(message)
    this.name = 'TransferError'
  }
}
``` 