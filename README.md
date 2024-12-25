# Memepool: Evolving Memes on the Blockchain

## What is Memepool?

Memepool is a revolutionary platform that combines meme culture, AI technology, and blockchain to create a new paradigm for content creation and monetization. It allows creators to transform static memes into engaging 3D animations and compete in real-time creative battles for crypto rewards.

## How does it work?

- **10-Minute Rounds**: Memepool operates on a unique 10-minute cycle, synchronized with Bitcoin's block time. Each new block triggers a fresh round of meme creation and competition.

- **AI-Powered Creation**: Creators use Memepool's AI tools to transform 2D memes into 3D animations without needing technical expertise. The AI handles the complex aspects while creators focus on the artistic vision.

- **Real-Time Rewards**: Viewers engage with the created memes and their interactions directly translate into real-time earnings for creators. 25% of the rewards are instant, while 75% goes into a performance pool.

- **Performance Pool**: The performance pool rewards the top creators of each round. The top creator receives 20% of the pool, with the rest being distributed among the top 100 based on their rank.

For detailed documentation, check out:
- [Application Flows](docs/appflow.md) - For detailed user flows
- [Round System](docs/round_system.md) - For round mechanics
- [AITubo Integration](docs/aitubo_integration.md) - For AI processing
- [BSV Integration](docs/bsv_integration.md) - For blockchain details

## Who is it for?

Memepool caters to a wide audience:

- **Creators**: Anyone with a passion for memes and creativity can participate. No technical skills are required, just a desire to create and compete.

- **Viewers**: Meme enthusiasts can discover, engage with, and support the best content. Their interactions directly influence the success of creators.

- **Collectors**: Unique 3D memes can be collected, traded, and monetized on the platform, opening up new opportunities for digital asset ownership.

Learn more about:
- [Product Design Requirements](docs/pdr.md) - For user roles and features
- [Wallet Integration](docs/wallet_integration.md) - For supported wallets
- [Technical Specifications](docs/specifications.md) - For detailed specifications

## Technical Architecture

Memepool is built on a robust technical foundation:

- **Frontend**: React/Redux SPA with real-time updates and seamless wallet integration.
- **Backend**: Node.js services for content management, round tracking, and blockchain interaction.
- **Blockchain**: Built on Bitcoin SV (BSV) for scalability, security, and instant microtransactions.
- **AI**: Integrated with AITubo.ai for fast, high-quality 3D transformations.
- **Storage**: BSV Storage for decentralized content storage, Redis and BSV for metadata management.

For detailed documentation, check out:
- [System Architecture](docs/architecture.md) - For system overview
- [Frontend Implementation](docs/frontend.md) - For client details
- [Backend Implementation](docs/backend.md) - For service details
- [Error Handling](docs/error_handling.md) - For error patterns
- [Testing Strategy](docs/testing_strategy.md) - For testing approach
- [Deployment](docs/deployment.md) - For deployment details
