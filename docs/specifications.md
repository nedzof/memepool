# Business and Monetization Specifications

## Related Documentation
- [Product Requirements](./pdr.md) - For product overview and user stories
- [Round System](./round_system.md) - For round mechanics implementation
- [BSV Integration](./bsv_integration.md) - For blockchain transaction details

## 1. Monetization Model

### Revenue Distribution
1. **Instant Revenue (50 %)**
   - Creator Share: 10 % of instant revenue
   - Owner Share: 90 % of instant revenue

2. **Reward Pool (48 %)**
   - Top 3 Creators: 20 % of pool
      - Top 1: 12 % of pool
      - Top 2: 6 % of pool
      - Top 3: 2 % of pool
   - First Time Unique Viewers: 80 % of pool
      - First 5 Viewers: 50 % equally distributed
      - First 5-50 Viewers: 30 % equally distributed
      - First 50-100 Viewers: 20 % equally distributed

3. **Platform Fee (2 %)**

### Transaction Types
1. **View Time Payments**
   - Rate: 10 sat/second
   
2. **Market Transactions**
   - Trading Fee: 1 %
   - Inscription Fee: 1 %

## 2. Content Guidelines

### Submission Requirements
1. **Video Specifications**
   - Format: MP4
   - Max Size: 10MB
   - Aspect Ratio: 1:1

## 3. Business Rules

### Round Participation
1. **Creator Rules**
   - One submission per round

2. **Viewer Rules**
   - Pay-per-second model
   - Early viewer bonuses

### Market Rules
1. **Ownership**
   - Transferable rights
   - Revenue inheritance
   
## Transaction Fee Modeling
### 1. Video inscription calculation (10MB)
#### Base data
- Size: 10MB = 10,000 KB
- Fee rate: 15 sats/KB
- BSV price: \$56
- 1 BSV = 100,000,000 sats

#### Calculation
1. Total sats needed:
   - 10,000 KB × 15 sats/KB = 150,000 sats

2. Convert to BSV:
   - 150,000 sats ÷ 100,000,000 = 0.0015 BSV

3. Convert to USD:
   - 0.0015 BSV × \$56 = \$0.084

#### Result
Inscribing 10MB on BSV would cost approximately \$0.084 (8.4 cents USD)
