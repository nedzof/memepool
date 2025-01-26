# MemePool

A decentralized platform for sharing and inscribing meme videos on the Bitcoin SV blockchain.

## Features

- Upload and share meme videos
- Inscribe memes on the Bitcoin SV blockchain
- Browse and discover memes
- Connect BSV wallet for transactions
- Modern, responsive UI built with React and TailwindCSS

## Project Structure

```
.
├── backend/             # Backend server code
│   ├── services/       # Business logic and services
│   └── package.json    # Backend dependencies
├── src/
│   ├── frontend/       # Frontend React application
│   │   ├── components/ # React components
│   │   ├── services/   # Frontend services
│   │   └── utils/      # Utility functions
│   ├── shared/         # Shared types and utilities
│   └── backend/        # Backend TypeScript code
└── package.json        # Frontend dependencies
```

## Prerequisites

- Node.js >= 18
- npm >= 9
- A BSV wallet (for inscribing memes)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/memepool.git
cd memepool
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

4. Create a `.env` file in the root directory:
```env
VITE_BSV_NETWORK=testnet
SCRYPT_ORD_API_KEY=your_api_key
```

5. Start the development servers:

In one terminal:
```bash
# Start the frontend
npm run dev
```

In another terminal:
```bash
# Start the backend
cd backend
npm run dev
```

The application will be available at http://localhost:3000 (or the next available port).

## Development

- Frontend is built with React, TypeScript, and Vite
- Backend uses Express.js and TypeScript
- Styling is done with TailwindCSS
- BSV blockchain integration using scrypt-ord

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
MIT