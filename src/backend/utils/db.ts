import { MongoClient, Db } from 'mongodb';
import { config } from '../../shared/config/constants';

class Database {
  private static instance: Database;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(): Promise<void> {
    if (!this.client) {
      this.client = await MongoClient.connect(config.MONGODB_URI);
      this.db = this.client.db();
      console.log('Connected to MongoDB');
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }
}

export const db = Database.getInstance(); 