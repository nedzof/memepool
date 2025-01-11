import { InscriptionSecurityService } from '../src/services/inscription-security-service'
import { BSVService } from '../src/services/bsv-service'
import { TransactionVerificationService } from '../src/services/transaction-verification-service'
import { BSVError } from '../src/types'
import type { TransferParams } from '../src/services/inscription-security-service'

// Mock services
const mockBsvService = {
  getTransaction: jest.fn(),
  verifyTransaction: jest.fn()
} as unknown as BSVService

const mockVerificationService = {
  validateOwnership: jest.fn() as jest.Mock<Promise<boolean>>
} as unknown as TransactionVerificationService

describe('InscriptionSecurityService', () => {
  let service: InscriptionSecurityService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new InscriptionSecurityService(mockBsvService, mockVerificationService)
  })

  describe('validateTransferParams', () => {
    it('should validate complete parameters', async () => {
      const params: TransferParams = {
        txid: 'testTxId1',
        senderAddress: 'testAddress1',
        recipientAddress: 'testAddress2'
      }
      await expect(service.validateTransferParams(params)).resolves.not.toThrow()
    })

    it('should reject incomplete parameters', async () => {
      const params = {
        txid: 'testTxId1',
        senderAddress: 'testAddress1'
        // Missing recipientAddress
      } as TransferParams

      await expect(service.validateTransferParams(params))
        .rejects
        .toThrow(BSVError)
    })
  })

  describe('verifyOwnershipForTransfer', () => {
    beforeEach(() => {
      (mockVerificationService.validateOwnership as jest.Mock).mockReset()
    })

    it('should verify ownership correctly', async () => {
      (mockVerificationService.validateOwnership as jest.Mock).mockResolvedValue(true)

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(true)
      expect(mockVerificationService.validateOwnership).toHaveBeenCalledWith('testAddress1', 'testTxId1')
    })

    it('should return false for invalid ownership', async () => {
      (mockVerificationService.validateOwnership as jest.Mock).mockResolvedValue(false)

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(false)
    })

    it('should handle verification service errors', async () => {
      (mockVerificationService.validateOwnership as jest.Mock).mockRejectedValue(new Error('Verification failed'))

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(false)
    })
  })
}) 