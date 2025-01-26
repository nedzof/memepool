declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      NETWORK?: 'mainnet' | 'testnet';
      MEMEPOOL_ADDRESS: string;
      API_URL?: string;
      STORAGE_BUCKET?: string;
      STORAGE_REGION?: string;
      MONGODB_URI?: string;
      REDIS_URL?: string;
    }
  }
} 