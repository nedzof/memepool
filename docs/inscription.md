# Inscription Standards

## Related Documentation
- [BSV Integration](./bsv_integration.md) - For blockchain details
- [Wallet Integration](./wallet_integration.md) - For wallet interactions

## 1. Transaction Structure

### Overview
Each inscription transaction consists of three outputs:
1. OP_RETURN output containing video data (using PUSHDATA)
2. Holder UTXO (1 sat) managed by sCrypt contract
3. Change output (optional)

### 1.1 Video Data Output (OP_RETURN)
- Contains complete video data in a single transaction
- Structure: `OP_FALSE OP_RETURN <PUSHDATA> <metadata> <PUSHDATA> <video_data>`
- Value: 0 satoshis
- No size limits (BSV supports large OP_RETURN data)
- Direct on-chain storage without chunking

### 1.2 Holder UTXO
- Value: Exactly 1 satoshi
- Managed by sCrypt contract
- Script structure:
  ```
  [Contract State] [P2PKH script]
  ```

#### Contract State Format
```typescript
{
  contentId: ByteString      // Unique identifier for the inscription
  creator: PubKey           // Original creator's public key
  owner: PubKey            // Current owner's public key
  metadata: ByteString     // Inscription metadata
}
```

#### Metadata Format
```json
{
  "p": "memepool",           // Fixed prefix for protocol identification
  "op": "deploy",           // Operation type: "deploy" or "transfer"
  "v": "1",                 // Protocol version
  "contentId": "<content_id>",
  "timestamp": 1234567890,
  "creator": "<creator_address>"
}
```

#### Operation Types
1. Deploy (Initial Inscription)
   ```json
   {
     "p": "memepool",
     "op": "deploy",
     "v": "1",
     "contentId": "<content_id>",
     "timestamp": 1234567890,
     "creator": "<creator_address>"
   }
   ```

2. Transfer
   ```json
   {
     "p": "memepool",
     "op": "transfer",
     "v": "1",
     "contentId": "<content_id>",
     "timestamp": 1234567890,
     "creator": "<creator_address>",
     "previousOwner": "<previous_owner_address>"
   }
   ```

### 1.3 Change Output
- Standard P2PKH output
- Returns remaining satoshis to sender
- Optional (if input amount > inscription cost + 1 sat)

## 2. Inscription Process

### 2.1 Content Preparation
1. Read complete video file
2. Generate content ID (hash of content + creator address)
3. Create metadata with proper prefix and operation type
4. Prepare PUSHDATA format for video data

### 2.2 Transaction Creation
1. Select UTXO for funding
2. Create OP_RETURN output with PUSHDATA
3. Create holder UTXO with contract
4. Add change output if needed
5. Sign and broadcast

### 2.3 Verification
1. Verify transaction structure
2. Check holder UTXO value (1 sat)
3. Validate contract state
4. Verify metadata format and prefix

## 3. Transfer Process

### 3.1 Transfer Transaction
1. Input: Current holder UTXO
2. Outputs:
   - New holder UTXO (1 sat) with updated owner
   - Change output (if needed)

### 3.2 Contract Verification
- Validates owner's signature
- Updates contract state
- Maintains inscription metadata
- Verifies protocol prefix and operation type

## 4. Technical Specifications

### 4.1 Video Requirements
- Formats: MP4, WebM
- Max size: No hard limit (BSV supports large OP_RETURN)
- Max duration: 5 seconds
- Resolution: Up to 4K

### 4.2 Network Parameters
- Fee rate: 1 sat/kb
- Dust limit: 546 sats
- Min relay fee: 1 sat/byte

### 4.3 Content ID Generation
```typescript
contentId = sha256(videoData + creatorAddress + timestamp).slice(0, 32)
```

### 4.4 Protocol Identifiers
- Prefix: "memepool"
- Version: "1"
- Operations: 
  - "deploy" (initial inscription)
  - "transfer" (ownership transfer)

## 5. Error Handling

### 5.1 Transaction Errors
- Insufficient funds
- Invalid script format
- Contract verification failure
- Network broadcast issues
- Invalid protocol prefix
- Unsupported operation type

### 5.2 Content Errors
- Unsupported format
- Invalid metadata
- Missing required fields
- Invalid protocol prefix
- Incorrect operation type

## 6. Storage Standards

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

## 7. Verification Process

### 7.1 Protocol Verification
1. Check prefix ("memepool")
2. Validate version
3. Verify operation type
4. Validate metadata structure

### 7.2 Content Verification
1. Verify video format
2. Check content ID
3. Validate metadata
4. Verify ownership chain

### 7.3 Transaction Verification
1. Check OP_RETURN structure
2. Verify PUSHDATA format
3. Validate holder UTXO
4. Check contract state

## 8. Performance Optimization

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

## 9. Monitoring

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