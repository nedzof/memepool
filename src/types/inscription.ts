import { Script } from '@bsv/sdk';

export type InscriptionContentType = 'video/mp4' | 'video/webm' | 'video/quicktime';

export interface VideoChunk {
  sequenceNumber: number;
  totalChunks: number;
  data: Buffer;
  checksum: string;
  previousChunkTxid?: string;
}

export interface ChunkMetadata {
  total: number;
  size: number;
  references: string[];
}

export interface ChunkTracking {
  txids: string[];
  currentChunk: number;
  isComplete: boolean;
}

export interface InscriptionContent {
  type: InscriptionContentType;
  data: Buffer | VideoChunk[];
  size: number;
  duration: number;
  width: number;
  height: number;
  chunks?: ChunkMetadata;
}

export interface InscriptionMetadata {
  type: string;
  version: string;
  content: {
    type: string;
    size: number;
    duration: number;
    width: number;
    height: number;
  };
  metadata: {
    title: string;
    creator: string;
    createdAt: number;
    attributes: {
      blockHash: string;
      bitrate: number;
      format: string;
      dimensions: string;
    };
  };
}

export interface InscriptionLocation {
  txid: string;
  vout: number;
  script: Script;
  satoshis: number;
  height: number;
}

export interface InscriptionTransaction {
  txid: string;
  confirmations: number;
  timestamp: number;
  fee: number;
  blockHeight: number;
  chunks?: ChunkTracking;
}

export interface Inscription {
  txid: string;
  content: InscriptionContent;
  metadata: InscriptionMetadata;
  owner: string;
  location: InscriptionLocation;
  transaction: InscriptionTransaction;
  history: InscriptionTransaction[];
}

export interface InscriptionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} 