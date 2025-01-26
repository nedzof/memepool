import Aerospike from 'aerospike';

const AEROSPIKE_CONFIG = {
  host: process.env.AEROSPIKE_HOST || 'localhost',
  port: process.env.AEROSPIKE_PORT ? parseInt(process.env.AEROSPIKE_PORT, 10) : 3000,
  namespace: process.env.AEROSPIKE_NAMESPACE || 'memepool',
  set: process.env.AEROSPIKE_SET || 'metadata',
};

let client: Aerospike.Client;

export const connectToAerospike = async (): Promise<void> => {
  try {
    client = Aerospike.client(AEROSPIKE_CONFIG);
    await client.connect();
    console.log('Connected to Aerospike database');
  } catch (error) {
    console.error('Failed to connect to Aerospike database:', error);
    throw error;
  }
};

export const disconnectFromAerospike = async (): Promise<void> => {
  try {
    await client.close();
    console.log('Disconnected from Aerospike database');
  } catch (error) {
    console.error('Failed to disconnect from Aerospike database:', error);
    throw error;
  }
};

export const createMetadata = async (key: string, metadata: Record<string, any>): Promise<void> => {
  try {
    await client.put(new Aerospike.Key(AEROSPIKE_CONFIG.namespace, AEROSPIKE_CONFIG.set, key), metadata);
  } catch (error) {
    console.error('Failed to create metadata in Aerospike:', error);
    throw error;
  }
};

export const getMetadata = async (key: string): Promise<Record<string, any> | null> => {
  try {
    const record = await client.get(new Aerospike.Key(AEROSPIKE_CONFIG.namespace, AEROSPIKE_CONFIG.set, key));
    return record ? record.bins : null;
  } catch (error) {
    console.error('Failed to get metadata from Aerospike:', error);
    throw error;
  }
};

export const updateMetadata = async (key: string, metadata: Record<string, any>): Promise<void> => {
  try {
    await client.put(new Aerospike.Key(AEROSPIKE_CONFIG.namespace, AEROSPIKE_CONFIG.set, key), metadata);
  } catch (error) {
    console.error('Failed to update metadata in Aerospike:', error);
    throw error;
  }
};

export const deleteMetadata = async (key: string): Promise<void> => {
  try {
    await client.remove(new Aerospike.Key(AEROSPIKE_CONFIG.namespace, AEROSPIKE_CONFIG.set, key));
  } catch (error) {
    console.error('Failed to delete metadata from Aerospike:', error);
    throw error;
  }
}; 