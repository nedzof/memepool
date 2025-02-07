import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createMetadata, getMetadata } from './services/aerospikeService.js';
import inscriptionsRouter from './routes/inscriptions.js';
import faucetRouter from './routes/faucet.js';

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

// Routes
app.use('/api/inscriptions', inscriptionsRouter);
app.use('/api/faucet', faucetRouter);

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    aerospike: 'connected'
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
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 