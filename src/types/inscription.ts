import { bsv } from 'scrypt-ts';
import { SignedTransaction } from './bsv';

export interface InscriptionCreationParams {
  videoFile: {
    buffer: Buffer;
    type: string;
    name: string;
    size: number;
  };
  metadata: {
    duration: number;
    dimensions: {
      width: number;
      height: number;
    };
    bitrate: number;
  };
  creatorAddress: string;
  blockHash: string;
}

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

// Video inscription metadata (in OP_RETURN)
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

// Holder UTXO metadata types
export type InscriptionOperation = 'inscribe' | 'transfer';

export interface HolderMetadata {
  version: number;
  prefix: string;
  operation: InscriptionOperation;
  contentId: string;
  timestamp: number;
  creator?: string;
  previousOwner?: string;
}

export interface ContentIDComponents {
  videoName: string;
  creatorAddress: string;
  blockHash: string;
  timestamp: number;
}

export interface InscriptionHolderScript {
  p2pkhScript: string;
  metadata: HolderMetadata;
}

export interface InscriptionLocation {
  txid: string;
  vout: number;
  script: bsv.Script;
  satoshis: number;
  height: number;
  metadata: HolderMetadata;
}

export interface InscriptionTransaction {
  txid: string;
  confirmations: number;
  timestamp: number;
  fee: number;
  blockHeight: number;
}

export interface Inscription {
  txid: string;
  content: InscriptionContent;
  metadata: InscriptionMetadata;  // Video inscription metadata
  owner: string;
  location: InscriptionLocation;  // Includes holder UTXO metadata
  transaction: InscriptionTransaction;
  history: InscriptionTransaction[];
}

export interface InscriptionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MetadataValidator {
  validateMetadata(metadata: HolderMetadata): InscriptionValidation;
  validateContentID(contentID: string): boolean;
  validateOperation(operation: string, context: any): boolean;
} 