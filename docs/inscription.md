# Inscription Standards

## Related Documentation
- [BSV Integration](./bsv_integration.md) - For blockchain details
- [Wallet Integration](./wallet_integration.md) - For wallet interactions

## 1. Inscription Format

### Data Structure
The inscription consists of two main parts:
1. Video inscription data (OP_RETURN)
2. Holder UTXO with metadata using sCrypt contract

#### 1. Video Inscription Data
```json
{
  "type": "memepool",
  "version": "1.0",
  "content": {
    "type": "video/mp4",
    "size": 156843,
    "duration": 4.01,
    "width": 854,
    "height": 480
  },
  "metadata": {
    "title": "video_title.mp4",
    "creator": "creator_address",
    "createdAt": 1736706811212,
    "attributes": {
      "blockHash": "104349035bb6df3adcbe19ecf82a5536ec8f0872f10d88615fb724475bddc7f7",
      "bitrate": 312904,
      "format": "video/mp4",
      "dimensions": "854x480"
    }
  }
}
```

#### 2. Holder UTXO Format
The holder UTXO uses a sCrypt contract format that combines:
1. OP_FALSE and OP_IF for metadata protection
2. JSON metadata with inscription details
3. Standard P2PKH script for the owner

Script format:
```
[OP_FALSE] [OP_IF] [JSON metadata] [OP_ENDIF] [P2PKH script]
00 + 63 + <pushdata><metadata> + 68 + 76a914<pubKeyHash>88ac
```

Metadata structure for initial inscription:
```json
{
  "version": "1",
  "prefix": "meme",
  "operation": "inscribe",
  "contentId": "<inscription_id>",
  "timestamp": 1736706811212,
  "creator": "<creator wallet address>"
}
```

Metadata structure for transfers:
```json
{
  "version": "1",
  "prefix": "meme",
  "operation": "transfer",
  "contentId": "<inscription_id>",
  "timestamp": 1736706811212,
  "creator": "<creator wallet address>",
  "previousOwner": "<previous owner address>"
}
```

### sCrypt Contract Format

#### InscriptionHolder Contract
The inscription holder contract is implemented using sCrypt and includes:

```typescript
export class InscriptionHolder extends SmartContract {
    @prop()
    static readonly TYPE = 'inscription'

    @prop()
    readonly contentId: ByteString

    @prop()
    readonly creator: PubKey

    @prop(true)
    owner: PubKey

    @prop(true)
    metadata: ByteString

    constructor(contentId: ByteString, creator: PubKey, owner: PubKey, metadata: ByteString) {
        super(...arguments)
        this.contentId = contentId
        this.creator = creator
        this.owner = owner
        this.metadata = metadata
    }

    @method()
    public transfer(newOwner: PubKey, sig: Sig) {
        // Verify current owner's signature
        assert(this.checkSig(sig, this.owner), 'signature check failed')
        // Update owner
        this.owner = newOwner
        // Build new state output
        const output = this.buildStateOutput(this.ctx.utxo.value)
        // Verify outputs
        assert(this.ctx.hashOutputs == hash256(output + this.buildChangeOutput()), 'hashOutputs mismatch')
    }
}
```

### Transfer Process
1. **Input**: Current holder UTXO with sCrypt contract
   - Value: exactly 1 satoshi
   - Must include valid contract state

2. **Contract Verification**:
   - Validates owner's signature
   - Verifies transaction structure
   - Ensures proper state transition

3. **Output**:
   - New contract state with updated owner
   - Metadata updated for transfer
   - Value: 1 satoshi

4. **Validation**:
   - Contract state verification
   - Signature validation
   - Value confirmation
   - Metadata integrity check

### Video Data Handling
The video data is handled in the following way:

1. **Data Storage**
   - Full video data is stored in the blockchain using `OP_RETURN` outputs
   - For videos larger than the maximum transaction size:
     - Data is split into chunks
     - Each chunk is stored in a separate transaction
     - Chunks are linked using transaction references
     - The first transaction contains the metadata and references to chunks

2. **Transaction Structure**
   ```
   Transaction 1 (Metadata + First Chunk):
   - Input: Funding UTXO
   - Outputs:
     1. OP_RETURN: Metadata + First chunk of video data
     2. P2PKH: Change (if any)
     3. Protection Marker: 1 sat UTXO with MEME marker

   Transaction 2..N (Additional Chunks):
   - Input: Previous chunk's change UTXO
   - Outputs:
     1. OP_RETURN: Next chunk of video data
     2. P2PKH: Change (if any)
   ```

3. **Chunk Management**
   - Maximum chunk size: ~100KB per transaction
   - Each chunk includes:
     - Sequence number
     - Total chunks count
     - Previous chunk reference
     - Checksum for data integrity

### Content Types
1. **Supported Formats**
   - Images: JPEG, PNG, GIF
   - Videos: MP4, WebM
   - Maximum size: 100MB
   - Resolution: Up to 4K

2. **Metadata Requirements**
   - Content hash
   - Creation timestamp
   - Creator signature
   - Format details

## Transfer Protection Mechanism

The inscription transfer protocol uses the OP_IF structure to protect inscription UTXOs:

1. Protection Structure
   - Each inscription UTXO uses the OP_IF structure:
     ```
     [OP_FALSE] [OP_IF] [JSON metadata] [OP_ENDIF] [P2PKH script]
     ```
   - The OP_FALSE OP_IF combination ensures the metadata section is never executed
   - Makes the output "nonstandard" to prevent accidental spending

2. Transfer Process
   - Original inscription UTXO is consumed
   - New UTXO is created for recipient with:
     - 1 satoshi value
     - Same OP_IF structure
     - Updated metadata (operation: "transfer")
     - P2PKH script updated to recipient's address
   - Change (if any) returned to sender

3. Ownership Verification
   - Current owner determined by P2PKH script in latest UTXO
   - Each transfer maintains OP_IF structure with metadata
   - Original creator preserved in metadata
   - Ownership history traceable through blockchain

4. Security Measures
   - Minimum confirmations required for transfer
   - Ownership verification before transfer
   - UTXO spending status verification
   - Script format validation
   - Metadata structure validation

## Script Format

### Inscription Holder Script
The inscription holder script now uses sCrypt contract format:
```
[Contract State] [P2PKH script]
```

Components:
1. **Contract State** - sCrypt contract data
   - Contains inscription metadata
   - Manages ownership and transfers
   - Enforces transfer rules

2. **P2PKH Script** - Standard Pay-to-Public-Key-Hash script
   - Format: `76a914<pubKeyHash>88ac`
   - Controls spending authorization

### Transfer Process
1. **Contract Call**
   - Load contract from UTXO
   - Call transfer method with:
     - New owner's public key
     - Current owner's signature
   - Verify contract state transition

2. **Output Creation**
   - New contract state
   - Updated metadata
   - P2PKH script for recipient
   - Value: 1 satoshi

3. **Validation**
   - Contract state verification
   - Signature validation
   - Output structure verification
   - Value confirmation

## 2. Inscription Process

### Content Preparation
1. **Content Validation**
   ```
   Validate Format → Check Size → Generate Hash → Prepare Metadata
   ```
   - Format verification
   - Size constraints
   - Hash generation
   - Metadata compilation

2. **Data Formatting**
   ```
   Structure Data → Add Metadata → Sign Content → Prepare Transaction
   ```
   - JSON formatting
   - Metadata inclusion
   - Digital signing
   - Transaction preparation

### Transaction Creation
1. **Inscription Transaction**
   ```
   Create Input → Add Data → Calculate Fee → Sign Transaction
   ```
   - UTXO selection
   - Data embedding
   - Fee calculation
   - Transaction signing

2. **Verification Process**
   ```
   Verify Format → Check Signature → Validate Size → Confirm Data
   ```
   - Format check
   - Signature validation
   - Size verification
   - Data confirmation

## 3. Storage Standards

### Content Storage
1. **On-chain Data**
   ```
   Content Hash → Metadata → Creator Info → Timestamp
   ```
   - Permanent storage
   - Immutable record
   - Public access
   - Verifiable data

2. **Off-chain Storage**
   ```
   Original Content → Transformed Version → Preview → Thumbnails
   ```
   - Content CDN
   - Version control
   - Access control
   - Backup strategy

### Data Management
1. **Version Control**
   ```
   Original → Processed → Published → Archived
   ```
   - Version tracking
   - State management
   - Access logging
   - Archive policy

2. **Access Control**
   ```
   Public Access → Creator Rights → Owner Rights → Admin Access
   ```
   - Permission levels
   - Access tokens
   - Rate limiting
   - Usage tracking

## 4. Verification Process

### Content Verification
1. **Hash Verification**
   ```
   Calculate Hash → Compare Chain → Verify Metadata → Confirm Status
   ```
   - Hash matching
   - Chain verification
   - Metadata validation
   - Status confirmation

2. **Ownership Verification**
   ```
   Check Signature → Verify Chain → Confirm Rights → Update Status
   ```
   - Signature check
   - Chain analysis
   - Rights verification
   - Status update

### Quality Control
1. **Content Standards**
   ```
   Check Format → Verify Quality → Validate Rules → Approve Content
   ```
   - Format standards
   - Quality metrics
   - Rule compliance
   - Content approval

2. **Technical Standards**
   ```
   Performance Check → Size Validation → Format Check → Technical Approval
   ```
   - Performance metrics
   - Size requirements
   - Format validation
   - Technical verification

## 5. Error Handling

### Transaction Errors
1. **Network Issues**
   ```
   Detect Error → Retry Logic → Fallback Options → User Notification
   ```
   - Error detection
   - Retry strategy
   - Fallback plan
   - User communication

2. **Validation Errors**
   ```
   Identify Issue → Provide Feedback → Suggest Fix → Track Resolution
   ```
   - Issue identification
   - User feedback
   - Fix suggestions
   - Resolution tracking

### Recovery Process
1. **Transaction Recovery**
   ```
   Monitor Status → Detect Issues → Apply Fix → Verify Resolution
   ```
   - Status monitoring
   - Issue detection
   - Fix application
   - Resolution verification

2. **Data Recovery**
   ```
   Backup Check → Restore Data → Verify Integrity → Confirm Recovery
   ```
   - Backup validation
   - Data restoration
   - Integrity check
   - Recovery confirmation

## 6. Performance Optimization

### Transaction Optimization
1. **Fee Optimization**
   ```
   Calculate Size → Estimate Fee → Optimize Input → Confirm Rate
   ```
   - Size calculation
   - Fee estimation
   - Input optimization
   - Rate confirmation

2. **Data Optimization**
   ```
   Compress Data → Optimize Format → Reduce Size → Verify Quality
   ```
   - Data compression
   - Format optimization
   - Size reduction
   - Quality verification

### System Performance
1. **Processing Pipeline**
   ```
   Queue Management → Parallel Processing → Batch Operations → Status Tracking
   ```
   - Queue handling
   - Parallel execution
   - Batch processing
   - Status monitoring

2. **Resource Management**
   ```
   Monitor Usage → Optimize Resources → Balance Load → Track Performance
   ```
   - Usage monitoring
   - Resource optimization
   - Load balancing
   - Performance tracking

## 7. Monitoring

### Transaction Monitoring
1. **Status Tracking**
   ```
   Monitor Chain → Track Status → Update State → Notify Users
   ```
   - Chain monitoring
   - Status updates
   - State management
   - User notifications

2. **Performance Metrics**
   ```
   Track Speed → Measure Success → Monitor Errors → Generate Reports
   ```
   - Speed tracking
   - Success rates
   - Error monitoring
   - Report generation

### System Monitoring
1. **Health Checks**
   ```
   Check Services → Verify State → Monitor Performance → Alert Issues
   ```
   - Service monitoring
   - State verification
   - Performance tracking
   - Issue alerting

2. **Usage Analytics**
   ```
   Track Volume → Monitor Patterns → Analyze Trends → Generate Insights
   ```
   - Volume tracking
   - Pattern monitoring
   - Trend analysis
   - Insight generation

# Inscription Format

## Overview
Inscriptions in the Memepool platform are created using a special transaction format that includes both the inscription data and a holder UTXO with metadata in an OP_IF structure.

## Transaction Structure

1. **Input**: Standard P2PKH input for funding the inscription
2. **Outputs**:
   a. **Inscription Data Output** (OP_FALSE OP_RETURN):
      - Contains metadata and content data
      - Value: 0 satoshis
   b. **Inscription Holder Output** (1 satoshi):
      - OP_FALSE OP_IF structure
      - JSON metadata
      - P2PKH script for the owner
   c. **Change Output** (optional):
      - Returns remaining satoshis to sender
      - Standard P2PKH format

## Inscription ID Generation

The inscription ID is generated deterministically using:
1. SHA256 hash of the content
2. Creator's address
3. Essential metadata (type, content details, dimensions, etc.)

This ensures:
- Unique identification of inscriptions
- Easy tracking and verification
- Content-based referencing
- Creator attribution

## Validation
To validate an inscription holder UTXO:
1. Check for OP_FALSE OP_IF structure
2. Verify JSON metadata format and content
3. Validate P2PKH script format
4. Ensure 1 satoshi value

## Transfer Protocol
When transferring an inscription:
1. Use the inscription holder UTXO as input
2. Create new holder output with:
   - Same OP_IF structure
   - Updated metadata with:
     - operation: "transfer"
     - txid: original inscription txid
   - P2PKH script for new owner
3. Maintain all other metadata fields
4. Ensure output has exactly 1 satoshi 