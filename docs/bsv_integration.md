# BSV Integration

## Related Documentation
- [Technical Specifications](./specifications.md) - For detailed specifications
- [Round System](./round_system.md) - For round management
- [Architecture Overview](./architecture.md) - For system architecture
- [Application Flow](./appflow.md) - For detailed flows
- [Wallet Integration](./wallet_integration.md) - For wallet details

## 1. Blockchain Integration

### Core Components
1. **Network Configuration**
   - Network: BSV Mainnet
   - API Provider: WhatsOnChain
   - Block Time: ~10 minutes
   - Fee Strategy: Dynamic

2. **Wallet Support**
   - See [Wallet Integration](./wallet_integration.md) for supported wallets:
     - OKX Wallet
     - Yours Wallet
     - Unisat Wallet
     - Native Memepool Wallet

3. **Transaction Types**
   ```typescript
   enum TransactionType {
     VIEW_TIME = 'view_time',
     MARKET_TRADE = 'market_trade',
     INSCRIPTION = 'inscription',
     REWARD_DISTRIBUTION = 'reward_distribution'
   }
   ```

## 2. Transaction Management

### View Time Payments
1. **Payment Flow**
   ```
   Watch Start → Balance Check → 1 sat/sec Payment → Split Distribution
   ```
   - Rate: 1 sat/second
   - Platform Fee: 2%
   - Direct Revenue: 40-45%
   - Reward Pool: 55-60%

2. **Transaction Structure**
   ```typescript
   interface ViewTimeTransaction {
     viewerId: string;
     contentId: string;
     duration: number;
     rate: number;
     timestamp: number;
     splits: {
       creator: number;
       owner: number;
       pool: number;
       platform: number;
     }
   }
   ```

### Market Transactions
1. **Trade Flow**
   ```
   Trade Request → Fee Calculation → BSV Transaction → Ownership Update
   ```
   - Platform Fee: 2%
   - Ownership Transfer
   - Balance Updates
   - History Tracking

2. **Transaction Structure**
   ```typescript
   interface MarketTransaction {
     sellerId: string;
     buyerId: string;
     contentId: string;
     amount: number;
     platformFee: number;
     timestamp: number;
   }
   ```

## 3. Block Synchronization

### Round Management
1. **Block Events**
   ```
   New Block → Height Check → Round Start → State Reset
   ```
   - Block Height Tracking
   - Round State Management
   - Content Assignment
   - Participant Reset

2. **State Updates**
   ```typescript
   interface BlockState {
     height: number;
     timestamp: number;
     roundId: string;
     contentIds: string[];
     participants: string[];
   }
   ```

### Recovery Procedures
1. **Block Reorg Handling**
   - State Rollback
   - Transaction Reprocessing
   - Balance Reconciliation
   - User Notification

2. **Network Issues**
   - Connection Retry
   - State Recovery
   - Transaction Retry
   - Error Notification

## 4. Revenue Distribution

### Direct Revenue
1. **Creator Share (10%)**
   ```
   Revenue → Platform Fee → Creator Split → Wallet
   ```
   - Real-time Processing
   - Transaction Verification
   - Balance Update
   - History Recording

2. **Owner Share (90%)**
   ```
   Revenue → Platform Fee → Owner Split → Wallet
   ```
   - Ownership Verification
   - Transaction Processing
   - Balance Update
   - History Recording

### Reward Pool
1. **Distribution Flow**
   ```
   Pool Collection → Rank Calculation → Split Distribution → Wallets
   ```
   - Top 3 Memes (95%)
   - Fast Viewers (5%)
   - Platform Fee
   - Transaction Processing

2. **Transaction Batching**
   ```typescript
   interface RewardBatch {
     roundId: string;
     totalAmount: number;
     distributions: {
       recipientId: string;
       amount: number;
       reason: string;
     }[];
   }
   ```

## 5. Security Measures

### Transaction Validation
1. **Input Validation**
   - Balance Verification
   - Rate Limits
   - Signature Checks
   - Double-spend Prevention

2. **Output Validation**
   - Amount Verification
   - Fee Calculation
   - Split Validation
   - State Consistency

### Error Handling
1. **Transaction Errors**
   - Insufficient Balance
   - Network Issues
   - Rate Limit Exceeded
   - Invalid Signature

2. **Recovery Procedures**
   - Transaction Retry
   - State Recovery
   - Balance Reconciliation
   - User Notification

## 6. Performance Optimization

### Transaction Batching
1. **Batch Processing**
   - View Time Aggregation
   - Reward Distribution
   - Fee Optimization
   - State Updates

2. **Queue Management**
   - Priority Queuing
   - Rate Limiting
   - Error Handling
   - State Tracking

### Caching Strategy
1. **Block Cache**
   - Height Tracking
   - State Caching
   - Transaction History
   - Balance Updates

2. **Transaction Cache**
   - Pending Transactions
   - Recent History
   - Balance States
   - User Activity

## 7. Monitoring

### Blockchain Metrics
1. **Network Health**
   - Block Time
   - Fee Rates
   - Network Status
   - Node Performance

2. **Transaction Metrics**
   - Success Rate
   - Processing Time
   - Fee Efficiency
   - Error Rate

### System Health
1. **Service Status**
   - API Availability
   - Processing Queue
   - Error Rates
   - Response Times

2. **Integration Health**
   - Node Connection
   - API Status
   - Wallet Services
   - State Consistency 