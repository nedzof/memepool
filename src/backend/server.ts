import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import memegenService from './services/memegen.service.js';
import { createMetadata, getMetadata, initAerospike } from './services/aerospikeService.js';
import inscriptionsRouter from './routes/inscriptions';
import blockMemeRoutes from './routes/blockMeme.routes';
import faucetRouter from './routes/faucet';
import aiVideoRoutes from './routes/aiVideo.routes';
import { BlockStateService } from './services/blockState.service';
import { modelServingService } from './services/modelServing.service.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add startup logging
console.log('Starting server initialization...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', port);

// Initialize BlockStateService
const blockStateService = BlockStateService.getInstance();

// Block Meme Routes with initialization check
app.use('/api/block-memes', async (req, res, next) => {
  try {
    if (!blockStateService.isInitialized()) {
      console.log('BlockStateService not initialized, attempting to initialize...');
      await blockStateService.start();
    }
    next();
  } catch (error) {
    console.error('BlockStateService initialization failed in middleware:', error);
    res.status(503).json({ 
      error: 'Service temporarily unavailable',
      details: 'Block state service initialization failed'
    });
  }
}, blockMemeRoutes);

// AI Video Routes
app.use('/api/video', aiVideoRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    blockState: blockStateService.isInitialized() ? 'initialized' : 'not initialized',
    currentBlockHeight: blockStateService.getCurrentBlockHeight()
  };
  res.json(health);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// Start the server
const startServer = async () => {
  try {
    console.log('Initializing BlockStateService...');
    await blockStateService.start();
    console.log('BlockStateService initialized successfully');

    await initAerospike();
    console.log('Aerospike initialized successfully');

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 