import Aerospike from 'aerospike';
import { MemeVideoMetadata } from '../../shared/types/metadata';
import { config } from '../../shared/config/constants';

class StorageService {
  private client: Aerospike.Client;
  private namespace: string;
  private set: string;

  constructor() {
    this.namespace = config.AEROSPIKE_NAMESPACE;
    this.set = config.AEROSPIKE_SET;
    this.client = Aerospike.client({
      hosts: [{ addr: config.AEROSPIKE_HOST, port: config.AEROSPIKE_PORT }],
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('Connected to Aerospike');
    } catch (error) {
      console.error('Failed to connect to Aerospike:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      console.log('Disconnected from Aerospike');
    } catch (error) {
      console.error('Failed to disconnect from Aerospike:', error);
      throw error;
    }
  }

  async saveMemeVideo(metadata: MemeVideoMetadata): Promise<void> {
    const key = new Aerospike.Key(this.namespace, this.set, metadata.id);
    const bins = this.convertToAerospikeBins(metadata);
    await this.client.put(key, bins);
  }

  async getMemeVideo(id: string): Promise<MemeVideoMetadata | null> {
    try {
      const key = new Aerospike.Key(this.namespace, this.set, id);
      const record = await this.client.get(key);
      return this.convertFromAerospikeBins(record.bins);
    } catch (error: any) {
      if (error.code === Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  async getMemeVideos(page: number, limit: number): Promise<MemeVideoMetadata[]> {
    const query = this.client.query(this.namespace, this.set);
    const stream = query.foreach();
    const results: MemeVideoMetadata[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (record) => {
        results.push(this.convertFromAerospikeBins(record.bins));
      });

      stream.on('error', (error) => {
        reject(error);
      });

      stream.on('end', () => {
        const start = (page - 1) * limit;
        const end = start + limit;
        resolve(results.slice(start, end));
      });
    });
  }

  async updateMemeVideo(id: string, metadata: Partial<MemeVideoMetadata>): Promise<void> {
    const key = new Aerospike.Key(this.namespace, this.set, id);
    const bins = this.convertToAerospikeBins(metadata);
    await this.client.put(key, bins);
  }

  async deleteMemeVideo(id: string): Promise<void> {
    const key = new Aerospike.Key(this.namespace, this.set, id);
    await this.client.remove(key);
  }

  private convertToAerospikeBins(metadata: Partial<MemeVideoMetadata>): { [key: string]: any } {
    return Object.entries(metadata).reduce((bins, [key, value]) => {
      if (value instanceof Date) {
        bins[key] = value.getTime();
      } else {
        bins[key] = value;
      }
      return bins;
    }, {} as { [key: string]: any });
  }

  private convertFromAerospikeBins(bins: { [key: string]: any }): MemeVideoMetadata {
    const metadata = { ...bins };
    
    // Convert timestamp back to Date objects
    if (metadata.createdAt) metadata.createdAt = new Date(metadata.createdAt);
    if (metadata.updatedAt) metadata.updatedAt = new Date(metadata.updatedAt);
    
    return metadata as MemeVideoMetadata;
  }
}

export const storageService = new StorageService();
export default storageService; 