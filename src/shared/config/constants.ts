export const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),

  // BSV Network
  NETWORK: process.env.NETWORK || 'testnet',
  MEMEPOOL_ADDRESS: process.env.MEMEPOOL_ADDRESS || '',

  // API Configuration
  API_URL: process.env.API_URL || 'http://localhost:3000/api',
  API_VERSION: 'v1',

  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,

  // Meme Configuration
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TAGS: 5,

  // Lock Configuration
  MAX_LOCKS_PER_ROUND: 3,
  MIN_LOCK_AMOUNT: 0.01,
  LOCK_DURATION: 10 * 60 * 1000, // 10 minutes in milliseconds

  // Reward Configuration
  TOP_MEMES_REWARD_PERCENTAGE: 0.5, // 50%
  TOP_LOCKERS_REWARD_PERCENTAGE: 0.49, // 49%
  COMMUNITY_FUND_PERCENTAGE: 0.01, // 1%
  REWARD_MULTIPLIER_RANGE: {
    MIN: 1,
    MAX: 10
  },

  // Threshold Configuration
  THRESHOLD_DECAY_FACTOR: 0.7,
  THRESHOLD_HISTORY_FACTOR: 0.3,
  THRESHOLD_HISTORY_BLOCKS: 12,
  DEFAULT_THRESHOLD: 1000,

  // Failure Configuration
  JACKPOT_PERCENTAGE: 0.9, // 90%
  COMMUNITY_FUND_FAILURE_PERCENTAGE: 0.1, // 10%

  // Storage Configuration
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'memepool-storage',
  STORAGE_REGION: process.env.STORAGE_REGION || 'us-east-1',

  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/memepool',

  // Cache Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CACHE_TTL: 60 * 60, // 1 hour in seconds

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  }
} as const; 