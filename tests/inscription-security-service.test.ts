import { InscriptionSecurityService } from '../src/services/inscription-security-service'
import { BSVService } from '../src/services/bsv-service'
import { TransactionVerificationService } from '../src/services/transaction-verification-service'
import { BSVError } from '../src/types'
import type { TransferParams } from '../src/services/inscription-security-service'
import { Transaction } from '@bsv/sdk'

type MockBSVService = {
  getTransaction: jest.Mock<Promise<Transaction>, [string]>
  verifyTransaction: jest.Mock
}

type MockVerificationService = {
  validateOwnership: jest.Mock<Promise<boolean>, [string, string]>
}

// Mock services
const mockBsvService: MockBSVService = {
  getTransaction: jest.fn(),
  verifyTransaction: jest.fn()
}

const mockVerificationService: MockVerificationService = {
  validateOwnership: jest.fn()
}

describe('InscriptionSecurityService', () => {
  let service: InscriptionSecurityService
  const validParams: TransferParams = {
    txid: 'testTxId1',
    senderAddress: 'testAddress1',
    recipientAddress: 'testAddress2'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new InscriptionSecurityService(
      mockBsvService as unknown as BSVService,
      mockVerificationService as unknown as TransactionVerificationService
    )
    mockBsvService.getTransaction.mockResolvedValue(new Transaction())
  })

  describe('Service Initialization', () => {
    it('should initialize with required services', () => {
      expect(service).toBeDefined()
      expect(service.minConfirmations).toBe(6)
    })

    it('should handle missing verification service', async () => {
      service = new InscriptionSecurityService(mockBsvService as unknown as BSVService)
      const result = await service.verifyOwnershipForTransfer('txid', 'address')
      expect(result).toBe(false)
    })
  })

  describe('validateTransferParams', () => {
    it('should validate complete parameters', async () => {
      await expect(service.validateTransferParams(validParams)).resolves.not.toThrow()
      expect(mockBsvService.getTransaction).toHaveBeenCalledWith(validParams.txid)
    })

    it('should reject missing txid', async () => {
      const params = { ...validParams, txid: '' }
      await expect(service.validateTransferParams(params))
        .rejects
        .toThrow(new BSVError('VALIDATION_ERROR', 'Missing required transfer parameters'))
    })

    it('should reject missing sender address', async () => {
      const params = { ...validParams, senderAddress: '' }
      await expect(service.validateTransferParams(params))
        .rejects
        .toThrow(new BSVError('VALIDATION_ERROR', 'Missing required transfer parameters'))
    })

    it('should reject missing recipient address', async () => {
      const params = { ...validParams, recipientAddress: '' }
      await expect(service.validateTransferParams(params))
        .rejects
        .toThrow(new BSVError('VALIDATION_ERROR', 'Missing required transfer parameters'))
    })

    it('should reject invalid transaction ID', async () => {
      mockBsvService.getTransaction.mockRejectedValue(new Error('Transaction not found'))
      await expect(service.validateTransferParams(validParams))
        .rejects
        .toThrow(new BSVError('VALIDATION_ERROR', 'Invalid transaction ID'))
    })

    it('should handle network errors during validation', async () => {
      mockBsvService.getTransaction.mockRejectedValue(new Error('Network error'))
      await expect(service.validateTransferParams(validParams))
        .rejects
        .toThrow(BSVError)
    })
  })

  describe('verifyOwnershipForTransfer', () => {
    beforeEach(() => {
      mockVerificationService.validateOwnership.mockReset()
    })

    it('should verify ownership correctly', async () => {
      mockVerificationService.validateOwnership.mockResolvedValue(true)
      mockBsvService.getTransaction.mockResolvedValue(new Transaction())

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(true)
      expect(mockVerificationService.validateOwnership).toHaveBeenCalledWith('testAddress1', 'testTxId1')
      expect(mockBsvService.getTransaction).toHaveBeenCalledWith('testTxId1')
    })

    it('should return false for invalid ownership', async () => {
      mockVerificationService.validateOwnership.mockResolvedValue(false)
      mockBsvService.getTransaction.mockResolvedValue(new Transaction())

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(false)
      expect(mockVerificationService.validateOwnership).toHaveBeenCalledWith('testAddress1', 'testTxId1')
    })

    it('should handle verification service errors', async () => {
      mockVerificationService.validateOwnership.mockRejectedValue(new Error('Verification failed'))
      mockBsvService.getTransaction.mockResolvedValue(new Transaction())

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(false)
      expect(mockVerificationService.validateOwnership).toHaveBeenCalledWith('testAddress1', 'testTxId1')
    })

    it('should handle invalid transaction ID', async () => {
      mockBsvService.getTransaction.mockRejectedValue(new Error('Transaction not found'))

      const result = await service.verifyOwnershipForTransfer('invalidTxId', 'testAddress1')
      expect(result).toBe(false)
      expect(mockVerificationService.validateOwnership).not.toHaveBeenCalled()
    })

    it('should handle network errors during transaction fetch', async () => {
      mockBsvService.getTransaction.mockRejectedValue(new Error('Network error'))

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(false)
      expect(mockVerificationService.validateOwnership).not.toHaveBeenCalled()
    })

    it('should handle empty transaction data', async () => {
      mockBsvService.getTransaction.mockResolvedValue(null as unknown as Transaction)

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(false)
      expect(mockVerificationService.validateOwnership).not.toHaveBeenCalled()
    })
  })

  describe('Security Edge Cases', () => {
    it('should handle malformed addresses', async () => {
      const params = { ...validParams, senderAddress: 'malformed<>address' }
      await expect(service.validateTransferParams(params))
        .rejects
        .toThrow(BSVError)
    })

    it('should handle extremely long transaction IDs', async () => {
      const params = { ...validParams, txid: 'a'.repeat(1000) }
      await expect(service.validateTransferParams(params))
        .rejects
        .toThrow(BSVError)
    })

    it('should handle potential script injection in addresses', async () => {
      const params = { ...validParams, recipientAddress: '<script>alert("test")</script>' }
      await expect(service.validateTransferParams(params))
        .rejects
        .toThrow(BSVError)
    })

    it('should handle null values in parameters', async () => {
      const params = { ...validParams, senderAddress: null } as unknown as TransferParams
      await expect(service.validateTransferParams(params))
        .rejects
        .toThrow(BSVError)
    })
  })
}) 