# Memepool Documentation

## Overview
Memepool is a platform that transforms static memes into 3D animations using AI, synchronized with Bitcoin's blockchain. The platform operates on a standardized 1 sat/second viewing model with transparent reward distribution.

## Core Documentation

### Product & Architecture
1. [Product Design Requirements](./pdr.md)
   - Core features and requirements
   - User types and interactions
   - Development phases
   - Implementation guidelines

2. [Technical Specifications](./specifications.md)
   - Monetization model
   - Content guidelines
   - System limitations
   - Performance requirements

3. [Architecture Overview](./architecture.md)
   - System components
   - Data flow
   - Service architecture
   - Security measures

### Implementation Details
1. [Frontend Implementation](./frontend.md)
   - Technical stack
   - Component architecture
   - Feature implementation
   - Performance optimization

2. [Backend Implementation](./backend.md)
   - Service architecture
   - API implementation
   - Data management
   - Integration points

3. [Application Flow](./appflow.md)
   - Content pipeline
   - Round management
   - Wallet integration
   - System integration

### Core Systems
1. [BSV Integration](./bsv_integration.md)
   - Transaction management
   - Block synchronization
   - Revenue distribution
   - Security measures

2. [Round System](./round_system.md)
   - Round mechanics
   - Revenue distribution
   - State management
   - Error handling

3. [AITubo Integration](./aitubo_integration.md)
   - Processing pipeline
   - Quality standards
   - Error handling
   - Performance optimization

### Platform Features
1. [Wallet Integration](./wallet_integration.md)
   - Supported wallets (OKX, Yours, Unisat, Native)
   - Authentication flows
   - Transaction handling
   - Balance management

2. [Inscription Mechanism](./inscription.md)
   - Content inscription
   - Ownership management
   - Transfer system
   - Security measures

### Operations & Development
1. [Error Handling](./error_handling.md)
   - Error classification
   - Recovery procedures
   - Monitoring
   - User communication

2. [Testing Strategy](./testing_strategy.md)
   - Testing levels
   - Test coverage
   - Performance testing
   - Integration testing

3. [Deployment](./deployment.md)
   - Environment setup
   - Deployment procedures
   - Monitoring
   - Recovery procedures

4. [API Versioning](./api_versioning.md)
   - Version management
   - Compatibility
   - Documentation
   - Migration guides

## Quick References

### Revenue Model
- View Time: 1 sat/second
- Platform Fee: 2% on all transactions
- Direct Revenue Split:
  - Creator: 10%
  - Owner: 90%
- Reward Pool Split (55-60%):
  - Top 3 Memes: 95%
  - Fast Viewers: 5%

### Supported Wallets
- OKX Wallet
- Yours Wallet
- Unisat Wallet
- Native Memepool Wallet

### System Requirements
- Resolution: 1080p standard
- Frame Rate: 30 FPS
- Processing Time: <60 seconds
- Response Time: <500ms

### Key Metrics
- Block Time: ~10 minutes
- Concurrent Users: >100K
- Transaction Rate: >1K/minute
- Uptime: 99.9%

## Development Guidelines

### Code Standards
- TypeScript for all new code
- React/Redux for frontend
- Node.js for backend
- BSV for blockchain

### Testing Requirements
- Unit Test Coverage: >80%
- Integration Test Coverage: >70%
- E2E Test Coverage: >50%
- Performance Test Baseline: <500ms

### Security Requirements
- Wallet Authentication
- Rate Limiting
- Input Validation
- Error Handling

### Documentation Standards
- Keep documentation up-to-date
- Include code examples
- Maintain cross-references
- Version documentation with code 