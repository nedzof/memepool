# Inscription Standards

## Related Documentation
- [BSV Integration](./bsv_integration.md) - For blockchain details
- [Wallet Integration](./wallet_integration.md) - For wallet interactions

## 1. Inscription Format

### Data Structure
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

The inscription data structure follows a strict format:
1. **Root Level**
   - `type`: Always "memepool" for our inscriptions
   - `version`: Current version "1.0"

2. **Content Section**
   - Contains technical details about the video
   - All fields are required
   - Size is in bytes
   - Duration is in seconds
   - Width and height in pixels

3. **Metadata Section**
   - Contains descriptive information
   - `title`: Original filename
   - `creator`: Creator's BSV address
   - `createdAt`: Unix timestamp in milliseconds
   - `attributes`: Additional metadata including format details

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

The inscription transfer protocol includes a protection mechanism to prevent accidental spending of inscription UTXOs:

1. Protection Marker
   - Each inscription UTXO includes a special marker: `OP_RETURN "MEME"` (hex: `6a044d454d45`)
   - This marker is appended to the standard P2PKH script
   - Makes the output "nonstandard" to prevent accidental spending

2. Transfer Process
   - Original inscription UTXO is consumed
   - New UTXO is created for recipient with:
     - 1 satoshi value
     - P2PKH script locking to recipient's address
     - Protection marker appended
   - Change (if any) returned to sender

3. Ownership Verification
   - Current owner determined by tracing UTXO chain
   - Each transfer maintains protection marker
   - Original creator preserved in inscription metadata
   - Ownership history traceable through blockchain

4. Security Measures
   - Minimum confirmations required for transfer
   - Ownership verification before transfer
   - UTXO spending status verification
   - Protection marker verification
   - Transaction format validation

## Script Format

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