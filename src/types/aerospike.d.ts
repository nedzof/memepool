declare module 'aerospike' {
  export interface ClientConfig {
    hosts: Array<{
      addr: string;
      port: number;
    }>;
  }

  export interface Key {
    new (namespace: string, set: string, key: string): Key;
  }

  export interface Client {
    connect(): Promise<void>;
    close(): Promise<void>;
    put(key: Key, bins: Record<string, any>): Promise<void>;
    get(key: Key): Promise<{ bins: Record<string, any> }>;
    query(namespace: string, set: string): Query;
    remove(key: Key): Promise<void>;
  }

  export interface Query {
    foreach(): QueryStream;
  }

  export interface QueryStream {
    on(event: 'data', callback: (record: { bins: Record<string, any> }) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    on(event: 'end', callback: () => void): void;
  }

  export interface Status {
    AEROSPIKE_ERR_RECORD_NOT_FOUND: number;
  }

  export const status: Status;
  export function client(config: ClientConfig): Client;
  export const Key: Key;
}

export default aerospike; 