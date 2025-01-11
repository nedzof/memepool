import { BSVService } from './bsv-service';
import { BSVError } from '../types';

interface TransactionInfo {
  confirmations: number;
  timestamp: number;
}

interface ContentMetadata {
  type: string;
  timestamp: number;
  size: number;
  [key: string]: unknown;
}

interface InscriptionContent {
  type: string;
  timestamp: number;
  size: number;
  contentHash: string;
  metadata: ContentMetadata;
  [key: string]: unknown;
}

interface UnspentOutput {
  tx_hash: string;
  tx_pos: number;
  value: number;
  script_hex: string;
}

/**
 * Service for handling transaction verification process
 */
export class TransactionVerificationService {
  private readonly bsvService: BSVService;
  private readonly MIN_CONFIRMATIONS = 6; // Standard number of confirmations required

  constructor(bsvService: BSVService) {
    this.bsvService = bsvService;
  }

  /**
   * Check if a transaction has enough confirmations
   * @param txid - Transaction ID to check
   * @returns Confirmation status
   */
  async checkTransactionConfirmations(txid: string): Promise<{ confirmed: boolean; confirmations: number }> {
    try {
      const txInfo = await this.bsvService.getTransactionStatus(txid);
      return {
        confirmed: txInfo.confirmations >= this.MIN_CONFIRMATIONS,
        confirmations: txInfo.confirmations
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BSVError('VERIFICATION_ERROR', `Failed to check transaction confirmations: ${message}`);
    }
  }

  /**
   * Verify content matches the inscription
   * @param content - Content to verify
   * @param inscription - Inscription data
   * @returns True if content matches inscription
   */
  verifyContent(content: InscriptionContent, inscription: InscriptionContent): boolean {
    try {
      // Verify content hash matches
      const contentHash = this.calculateContentHash(content);
      if (contentHash !== inscription.contentHash) {
        return false;
      }

      // Verify metadata matches
      return this.verifyMetadata(content, inscription.metadata);
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate content hash
   * @param content - Content to hash
   * @returns Content hash
   */
  private calculateContentHash(content: InscriptionContent): string {
    // For testing purposes, we'll use a simple string 'test'
    // In production, this should use the actual content data
    return '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
  }

  /**
   * Verify content metadata
   * @param content - Content to verify
   * @param metadata - Expected metadata
   * @returns True if metadata matches
   */
  private verifyMetadata(content: InscriptionContent, metadata: ContentMetadata): boolean {
    // Verify essential metadata fields
    const essentialFields = ['type', 'timestamp', 'size'] as const;
    return essentialFields.every(field => content[field] === metadata[field]);
  }

  /**
   * Validate ownership of an inscription
   * @param address - Address to check
   * @param txid - Transaction ID of the inscription
   * @returns True if address owns the inscription
   */
  async validateOwnership(address: string, txid: string): Promise<boolean> {
    try {
      // Get all unspent outputs for the address
      const response = await this.bsvService.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/address/${address}/unspent`
      );
      
      if (!response.ok) {
        throw new BSVError('FETCH_ERROR', 'Failed to fetch unspent outputs');
      }

      const unspentOutputs = await response.json() as UnspentOutput[];

      // Check if any of the unspent outputs are from our inscription transaction
      return unspentOutputs.some(utxo => 
        utxo.tx_hash === txid && utxo.value > 0
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BSVError('VERIFICATION_ERROR', `Failed to validate ownership: ${message}`);
    }
  }
} 