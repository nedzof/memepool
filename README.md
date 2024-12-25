# Memepool: Evolving Memes on the Blockchain

## What is Memepool?

Memepool is a revolutionary platform that combines meme culture, AI technology, and blockchain to create a new paradigm for content creation and monetization. It allows creators to transform static memes into engaging 3D animations and compete in real-time creative battles for crypto rewards.

## How does it work?

- **10-Minute Rounds**: Memepool operates on a unique 10-minute cycle, synchronized with Bitcoin's block time. Each new block triggers a fresh round of meme creation and competition.

- **AI-Powered Creation**: Creators use Memepool's AI tools to transform 2D memes into 3D animations without needing technical expertise. The AI handles the complex aspects while creators focus on the artistic vision.

- **Real-Time Rewards**: Viewers engage with the created memes and their interactions directly translate into real-time earnings for creators. 25% of the rewards are instant, while 75% goes into a performance pool.

- **Performance Pool**: The performance pool rewards the top creators of each round. The top creator receives 20% of the pool, with the rest being distributed among the top 100 based on their rank.

For more details on the platform's mechanics, check out the [Application Flows](docs/appflow.md) documentation.

## Who is it for?

Memepool caters to a wide audience:

- **Creators**: Anyone with a passion for memes and creativity can participate. No technical skills are required, just a desire to create and compete.

- **Viewers**: Meme enthusiasts can discover, engage with, and support the best content. Their interactions directly influence the success of creators.

- **Collectors**: Unique 3D memes can be collected, traded, and monetized on the platform, opening up new opportunities for digital asset ownership.

Learn more about the different user types and their roles in the [Product Design Requirements](docs/pdr.md) document.

## Technical Architecture

Memepool is built on a robust technical foundation:

- **Frontend**: React/Redux SPA with real-time updates and seamless wallet integration.
- **Backend**: Node.js services for content management, round tracking, and blockchain interaction.
- **Blockchain**: Built on Bitcoin SV (BSV) for scalability, security, and instant microtransactions.
- **AI**: Integrated with AITubo.ai for fast, high-quality 3D transformations.
- **Storage**: BSV Storage for decentralized content storage, Redis and BSV for metadata management.

Dive deeper into the technical stack and architecture in the [System Architecture](docs/architecture.md) overview.

The detailed development plan and phases are outlined in the [Product Design Requirements](docs/pdr.md) document.
