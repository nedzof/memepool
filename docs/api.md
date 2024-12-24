MEMEPIRE Technical Documentation
Platform Overview

Memepire is a blockchain-based video meme marketplace where creators transform trending memes into short video interpretations. Each video is minted as a digital asset on the Bitcoin SV blockchain, enabling creators to not only earn from real-time engagement but also trade their creations in our integrated marketplace.
Core Platform Components
1. Video Meme Creation System

The platform integrates with AITubo's AI engine to facilitate meme-to-video transformation:

    Creators select current trending meme
    AITubo API processes the meme and generates video variations
    Creators can customize and enhance the AI output
    Final video is minted as a digital asset on BSV blockchain

2. Marketplace Mechanics

All created videos become tradeable assets:

    Videos are automatically listed in marketplace after round completion
    Creators set initial pricing and royalty preferences
    Buyers can purchase full rights or viewing licenses
    Smart contracts handle royalty distribution
    Secondary market trading enabled for purchased videos

3. Round-Based Competition

Each round operates on Bitcoin block timing (approximately 10 minutes):

    Live competition phase with real-time rewards
    Immediate earnings based on viewer engagement (25% of revenue)
    End-of-round pool distribution (75% of revenue)
    Top performers receive additional marketplace exposure

4. Revenue Distribution System

Multiple revenue streams are managed automatically:

Competition Revenue
├── Real-time Earnings (25%)
│   └── Direct creator payments based on watch time
└── Round Pool (75%)
    ├── First Place: 20%
    ├── Second Place: 10%
    ├── Third Place: 3%
    ├── Early Adopters: 40%
    └── Platform Fee: 2%

Marketplace Revenue
├── Primary Sales
│   ├── Creator: 85%
│   ├── Platform: 10%
│   └── Community Pool: 5%
└── Secondary Sales
    ├── Original Creator: 10%
    ├── Seller: 85%
    └── Platform: 5%

Technical Integration Architecture
AITubo Integration

Single endpoint handling all video generation:

BASE_URL: https://aitubo.ai/api/v1/
Primary Function: processVideoMeme
Input: Source meme, style preferences
Output: Generated video content

WhatsOnChain Integration

Core blockchain synchronization:

BASE_URL: https://api.whatsonchain.com/v1/bsv/
Primary Functions:
- monitorBlocks: Round timing
- processTransactions: Payments
- validateTransactions: Marketplace trades

Marketplace Operations

Unified trading system:

Trading Functions:
- listVideo: Post new video asset
- purchaseVideo: Buy video rights
- setRoyalties: Configure creator earnings
- transferOwnership: Handle sales

Data Flow Architecture
1. Content Creation Flow

User Initiates Creation
↓
AITubo Generates Video
↓
Creator Customizes
↓
Content Verification
↓
Blockchain Minting
↓
Marketplace Listing

2. Transaction Flow

User Initiates Purchase
↓
Payment Validation
↓
Smart Contract Execution
↓
Rights Transfer
↓
Royalty Distribution
↓
Ownership Update

3. Competition Flow

Round Starts (Block Timer)
↓
Submissions Open
↓
Real-time Payments
↓
Round Completion
↓
Pool Distribution
↓
Marketplace Integration

System Requirements
Creator Requirements

    BSV wallet integration
    Content creation capabilities
    Marketplace participation rights

Buyer Requirements

    BSV wallet connection
    Trading privileges
    Content license agreement

Platform Requirements

    High-performance video processing
    Real-time transaction handling
    Secure asset management
    Automated reward distribution

Future Enhancements
Phase 1: Core Features

    Basic video minting
    Simple marketplace
    Direct sales

Phase 2: Advanced Trading

    Bidding system
    Auction mechanics
    Bundle sales

Phase 3: Community Features

    DAO governance
    Community curation
    Advanced royalty models

Integration Points

All system components interact through a unified API layer:

Content Creation ←→ Blockchain ←→ Marketplace
         ↑             ↑              ↑
         └─────────────┴──────────────┘
                 Unified API

This architecture ensures seamless operation between content creation, blockchain transactions, and marketplace functionality, while maintaining system modularity and scalability.
