# System Architecture

## Related Documentation
- [Technical Specifications](./specifications.md) - For detailed specifications
- [Product Requirements](./pdr.md) - For product overview
- [BSV Integration](./bsv_integration.md) - For blockchain details
- [AITubo Integration](./aitubo_integration.md) - For AI processing details
- [Frontend Implementation](./frontend.md) - For client architecture
- [Backend Implementation](./backend.md) - For service architecture
- [Wallet Integration](./wallet_integration.md) - For wallet architecture
- [Error Handling](./error_handling.md) - For error handling patterns
- [Deployment](./deployment.md) - For deployment architecture
- [Testing Strategy](./testing_strategy.md) - For testing architecture
- [API Versioning](./api_versioning.md) - For API architecture
- [Round System](./round_system.md) - For round architecture

## 1. System Overview

### Core Components
1. **Frontend Layer**
   - React/Redux application
   - WebSocket integration
   - Wallet connections
   - Real-time updates

2. **Backend Services**
   - Node.js microservices
   - WebSocket server
   - Transaction processor
   - Round manager

3. **Storage Layer**
   - Aerospike (temporary data)
   - BSV blockchain (permanent records)
   - Redis (caching)
   - File system (temporary files)

4. **Integration Layer**
   - WhatsOnChain API
   - AITubo API
   - Wallet providers
   - Monitoring services

## 2. Data Flow

### Content Pipeline
1. **Submission Flow**
   ```
   Admin Upload → Validation → AITubo Processing → Quality Check → Round Assignment
   ```

2. **Viewing Flow**
   ```
   Content Request → Authorization → Payment Verification → Streaming → Revenue Distribution
   ```

### Transaction Flow
1. **View Time Payments**
   ```
   Watch Start → 1 sat/sec Payment → Split (40-45% Direct, 55-60% Pool) → Distribution
   ```

2. **Market Transactions**
   ```
   Trade Request → 2% Fee Calculation → BSV Transaction → Ownership Update
   ```

## 3. Service Architecture

### Core Services
1. **Authentication Service**
   - Wallet signature verification
   - Session management
   - Permission control
   - Rate limiting

2. **Content Service**
   - Meme validation
   - AITubo integration
   - Quality assurance
   - Distribution management

3. **Round Service**
   - Block synchronization
   - State management
   - Reward calculation
   - Performance tracking

4. **Payment Service**
   - Transaction processing
   - Revenue distribution
   - Fee management
   - Balance tracking

## 4. Data Management

### Storage Strategy
1. **Temporary Storage**
   - User sessions
   - Round state
   - Cache data
   - Processing queue

2. **Permanent Storage**
   - Transaction records
   - Content metadata
   - User profiles
   - Performance metrics

### State Management
1. **Round State**
   - Current participants
   - Engagement metrics
   - Revenue tracking
   - Reward calculations

2. **User State**
   - Active sessions
   - Balance tracking
   - View history
   - Earnings data

## 5. Security Architecture

### Authentication
1. **Wallet Integration**
   - Signature verification
   - Chain validation
   - Balance checks
   - Transaction signing

2. **Service Security**
   - API authentication
   - Rate limiting
   - DDOS protection
   - Input validation

### Data Protection
1. **Transaction Security**
   - Double-spend prevention
   - Fee validation
   - Chain monitoring
   - Error recovery

2. **Content Security**
   - Access control
   - Content validation
   - Ownership verification
   - Version control

## 6. Monitoring

### System Metrics
1. **Performance Monitoring**
   - Response times
   - Error rates
   - Resource usage
   - Transaction throughput

2. **Business Metrics**
   - Active users
   - Transaction volume
   - Revenue tracking
   - User engagement

### Health Checks
1. **Service Health**
   - API availability
   - Database health
   - Cache status
   - Queue length

2. **Integration Health**
   - BSV node status
   - AITubo availability
   - Wallet connections
   - External APIs

## 7. Deployment

### Infrastructure
1. **Production Environment**
   - Load balancers
   - Application servers
   - Database clusters
   - Cache servers

2. **Scaling Strategy**
   - Horizontal scaling
   - Auto-scaling rules
   - Resource allocation
   - Performance optimization