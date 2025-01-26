# MemePool

A decentralized meme platform built on BSV blockchain.

## Features

- Upload and share memes
- BSV-based reward system
- Viral meme detection
- Community participation through BSV locks
- Thumbnail generation for video memes

## Prerequisites

- Node.js >= 18
- Aerospike database
- FFmpeg for video processing

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/memepool.git
cd memepool
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

- `MEMEPOOL_ADDRESS`: BSV address for the meme pool
- `AEROSPIKE_HOST`: Aerospike database host
- `AEROSPIKE_PORT`: Aerospike database port
- `AEROSPIKE_NAMESPACE`: Aerospike namespace
- `AEROSPIKE_SET`: Aerospike set name

## Architecture

- Frontend: React + Vite
- Backend: Node.js + Express
- Storage: Aerospike + Local file system
- Blockchain: BSV for transactions and rewards

## License

MIT