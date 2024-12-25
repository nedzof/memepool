# Round System

## Related Documentation
- [Technical Specifications](./specifications.md) - For detailed specifications
- [Architecture Overview](./architecture.md) - For system architecture
- [BSV Integration](./bsv_integration.md) - For blockchain details
- [Application Flow](./appflow.md) - For detailed flows
- [Wallet Integration](./wallet_integration.md) - For wallet implementation
- [Error Handling](./error_handling.md) - For error handling patterns
- [Testing Strategy](./testing_strategy.md) - For testing requirements
- [AITubo Integration](./aitubo_integration.md) - For content processing

## 1. Round Overview

### Core Concepts
1. **Round Structure**
   - Duration: 10 minutes (1 BSV block)
   - Synchronization: Block-based
   - Content: Multiple memes
   - Participants: Unlimited

2. **Revenue Model**
   - Instant Revenue: 25%
     - Creator: 10%
     - Owner: 90%
   - Performance Pool: 75%
     - Top Creator: 20%
     - Top 100 Distribution: 80%
       - Rank-based distribution
       - Higher ranks get larger shares

## 2. Round Mechanics

### Round Initialization
1. **Block Synchronization**
   ```
   New Block → Round Start → Content Selection → State Reset
   ```
   - Block height tracking
   - Round state initialization
   - Content assignment
   - Participant reset

2. **Content Selection**
   - Quality verification
   - Performance check
   - Distribution planning
   - Availability confirmation

### Round Execution
1. **View Time Tracking**
   ```
   Watch Start → 1 sat/sec Payment → Revenue Split → Pool Update
   ```
   - Rate: 1 sat/second
   - Platform fee: 2%
   - Real-time tracking
   - State updates

2. **Engagement Metrics**
   - View duration
   - Viewer count
   - Revenue generation
   - Performance ranking

## 3. Revenue Distribution

### Direct Revenue
1. **Creator Share (10%)**
   ```
   Revenue → Platform Fee → Creator Split → Wallet
   ```
   - Real-time calculation
   - Immediate distribution
   - Transaction verification
   - Balance update

2. **Owner Share (90%)**
   ```
   Revenue → Platform Fee → Owner Split → Wallet
   ```
   - Ownership verification
   - Revenue calculation
   - Transaction processing
   - Balance tracking

### Reward Pool
1. **Top Performers (95%)**
   ```
   Pool → Rank Calculation → Split Distribution → Wallets
   ```
   - Performance ranking
   - Revenue calculation
   - Split distribution
   - Transaction processing

2. **Fast Viewers (5%)**
   ```
   Pool → First 100 → Equal Split → Wallets
   ```
   - Viewer tracking
   - Eligibility check
   - Revenue split
   - Distribution

## 4. State Management

### Round State
1. **Active State**
   - Current participants
   - Revenue tracking
   - Performance metrics
   - Time remaining

2. **Historical State**
   - Past performance
   - Revenue history
   - Participant data
   - Analytics data

### Transaction State
1. **Payment Tracking**
   - View time payments
   - Revenue splits
   - Pool contributions
   - Transaction history

2. **Balance Management**
   - Creator balances
   - Owner balances
   - Viewer balances
   - Pool balance

## 5. Error Handling

### Transaction Recovery
1. **Payment Issues**
   - Transaction retry
   - State recovery
   - Balance reconciliation
   - User notification

2. **State Issues**
   - State verification
   - Data recovery
   - History correction
   - System notification

### System Recovery
1. **Round Recovery**
   - State restoration
   - Revenue recalculation
   - Distribution verification
   - History update

2. **Service Recovery**
   - Service restart
   - State verification
   - Data consistency
   - User notification

## 6. Performance Monitoring

### System Metrics
1. **Technical Metrics**
   - Response times
   - Error rates
   - Resource usage
   - Network performance

2. **Business Metrics**
   - Active participants
   - Revenue generation
   - Distribution success
   - User engagement

### Health Checks
1. **Service Health**
   - Round synchronization
   - Payment processing
   - State management
   - Error handling

2. **Integration Health**
   - BSV node status
   - Wallet connections
   - External services
   - API availability 