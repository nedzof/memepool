// Temporary in-memory cache for development
const cache: Record<string, any> = {};

export const createMetadata = async (key: string, data: any): Promise<void> => {
  cache[key] = data;
};

export const getMetadata = async (key: string): Promise<any> => {
  return cache[key] || null;
};

export const updateMetadata = async (key: string, data: any): Promise<void> => {
  cache[key] = { ...cache[key], ...data };
};

export const deleteMetadata = async (key: string): Promise<void> => {
  delete cache[key];
};

export interface Round {
  id: string;
  startTime: Date;
  endTime: Date;
  totalBSVLocked: number;
  threshold: number;
  status: 'active' | 'completed';
  memeIds: string[];
}

export class AerospikeService {
  constructor() {
    // Using in-memory cache for development
  }

  async createMeme(meme: any): Promise<void> {
    await createMetadata(meme.id, meme);
  }

  async getMemes(skip: number, limit: number): Promise<any[]> {
    // Return empty array for now
    return [];
  }

  async getMemeById(id: string): Promise<any | null> {
    return getMetadata(id);
  }

  async getUserParticipation(userId: string): Promise<any> {
    return {
      totalLocks: 0,
      totalBSVLocked: 0,
      successfulPredictions: 0
    };
  }

  async getUserRewards(userId: string): Promise<any> {
    return {
      totalEarned: 0,
      pendingRewards: 0,
      rewardHistory: []
    };
  }

  async getCurrentRound(): Promise<Round | null> {
    return {
      id: 'current_round',
      startTime: new Date(),
      endTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      totalBSVLocked: 0,
      threshold: 0.001,
      status: 'active',
      memeIds: []
    };
  }
}

export async function ping() {
  const client = await connect();
  await client.info('statistics');
  return true;
} 