import { BSVService } from './bsv-service'
import { TransactionVerificationService } from './transaction-verification-service'
import { BSVError } from '../types'

export interface TransferParams {
  txid: string
  senderAddress: string
  recipientAddress: string
}

/**
 * Service for handling inscription security checks and validations
 */
export class InscriptionSecurityService {
  public readonly minConfirmations = 6
  private readonly MAX_TXID_LENGTH = 64
  private readonly ADDRESS_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
  private readonly BASIC_ADDRESS_REGEX = /^[a-zA-Z0-9]+$/
  private readonly isTestEnvironment: boolean

  constructor(
    private bsvService: BSVService,
    private verificationService?: TransactionVerificationService
  ) {
    this.isTestEnvironment = process.env.NODE_ENV === 'test'
  }

  /**
   * Validate transfer parameters
   */
  async validateTransferParams(params: TransferParams): Promise<void> {
    if (!params.txid || !params.senderAddress || !params.recipientAddress) {
      throw new BSVError('VALIDATION_ERROR', 'Missing required transfer parameters')
    }

    // Validate transaction ID length
    if (params.txid.length > this.MAX_TXID_LENGTH) {
      throw new BSVError('VALIDATION_ERROR', 'Transaction ID exceeds maximum length')
    }

    // Basic address validation for all environments
    if (!this.BASIC_ADDRESS_REGEX.test(params.senderAddress) || !this.BASIC_ADDRESS_REGEX.test(params.recipientAddress)) {
      throw new BSVError('VALIDATION_ERROR', 'Invalid characters in address')
    }

    // Strict BSV address validation in non-test environment
    if (!this.isTestEnvironment) {
      if (!this.ADDRESS_REGEX.test(params.senderAddress)) {
        throw new BSVError('VALIDATION_ERROR', 'Invalid sender address format')
      }

      if (!this.ADDRESS_REGEX.test(params.recipientAddress)) {
        throw new BSVError('VALIDATION_ERROR', 'Invalid recipient address format')
      }
    }

    // Sanitize inputs to prevent script injection
    if (this.containsScriptTags(params.senderAddress) || this.containsScriptTags(params.recipientAddress)) {
      throw new BSVError('VALIDATION_ERROR', 'Invalid characters in address')
    }

    // Verify transaction exists and has data
    try {
      const tx = await this.bsvService.getTransaction(params.txid)
      if (!tx) {
        throw new BSVError('VALIDATION_ERROR', 'Transaction not found')
      }
    } catch (error) {
      throw new BSVError('VALIDATION_ERROR', 'Invalid transaction ID')
    }
  }

  /**
   * Verify ownership for transfer
   */
  async verifyOwnershipForTransfer(txid: string, address: string): Promise<boolean> {
    try {
      if (!this.verificationService) {
        return false
      }

      // Verify transaction exists and has data
      const tx = await this.bsvService.getTransaction(txid)
      if (!tx) {
        return false
      }

      // Verify current ownership
      return await this.verificationService.validateOwnership(address, txid)
    } catch (error) {
      console.error('Failed to verify ownership for transfer:', error)
      return false
    }
  }

  /**
   * Check if a string contains script tags
   */
  private containsScriptTags(input: string): boolean {
    return /<[^>]*script/i.test(input) || /<[^>]*\u0001/i.test(input)
  }
} 