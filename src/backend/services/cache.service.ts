import { createMetadata, getMetadata } from './aerospikeService';

class CacheService {
  private static instance: CacheService;
  
  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get(key: string): Promise<any> {
    return getMetadata(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await createMetadata(key, value, ttl);
  }
}

export { CacheService }; 