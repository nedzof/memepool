// Error types
export class BSVError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'BSVError';
  }
}

export class InscriptionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'InscriptionError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TransferError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'TransferError';
  }
}

// Constants
export const INSCRIPTION_PROTOCOL_ID = 'bsv-video-v1';
export const MIN_SATS_PER_BYTE = 0.5;
export const MAX_INSCRIPTION_SIZE = 100 * 1024 * 1024; // 100MB

// Re-export types from other modules
export * from './bsv';
export * from './inscription';
export * from './services'; 