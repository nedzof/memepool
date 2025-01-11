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

  constructor(
    private bsvService: BSVService,
    private verificationService?: TransactionVerificationService
  ) {}

  /**
   * Validate transfer parameters
   */
  async validateTransferParams(params: TransferParams): Promise<void> {
    if (!params.txid || !params.senderAddress || !params.recipientAddress) {
      throw new BSVError('VALIDATION_ERROR', 'Missing required transfer parameters')
    }

    // Verify transaction exists
    try {
      await this.bsvService.getTransaction(params.txid)
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
        throw new BSVError('SERVICE_ERROR', 'Verification service not initialized')
      }

      // Verify transaction exists
      await this.bsvService.getTransaction(txid)

      // Verify current ownership
      const isOwner = await this.verificationService.validateOwnership(address, txid)
      if (!isOwner) {
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to verify ownership for transfer:', error)
      return false
    }
  }
} 