import { TransactionVerificationService } from '../src/services/transaction-verification-service'
import { BSVService } from '../src/services/bsv-service'
import { BSVError } from '../src/types'

interface ContentMetadata {
  type: string
  timestamp: number
  size: number
  [key: string]: unknown
}

interface InscriptionContent {
  type: string
  timestamp: number
  size: number
  contentHash: string
  metadata: ContentMetadata
  [key: string]: unknown
}

type MockBSVService = {
  getTransactionStatus: jest.Mock<Promise<{ confirmations: number; timestamp: number }>, [string]>
  wallet: {
    fetchWithRetry: jest.Mock<Promise<Response>, [string]>
  }
}

describe('TransactionVerificationService', () => {
  let service: TransactionVerificationService
  let mockBsvService: MockBSVService

  const mockTransactionId = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  const mockAddress = 'n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ'

  beforeEach(() => {
    mockBsvService = {
      getTransactionStatus: jest.fn(),
      wallet: {
        fetchWithRetry: jest.fn()
      }
    }

    service = new TransactionVerificationService(mockBsvService as unknown as BSVService)
  })

  describe('Transaction Confirmation Checks', () => {
    it('should confirm transaction with sufficient confirmations', async () => {
      mockBsvService.getTransactionStatus.mockResolvedValue({
        confirmations: 6,
        timestamp: Date.now()
      })

      const result = await service.checkTransactionConfirmations(mockTransactionId)
      expect(result.confirmed).toBe(true)
      expect(result.confirmations).toBe(6)
    })

    it('should not confirm transaction with insufficient confirmations', async () => {
      mockBsvService.getTransactionStatus.mockResolvedValue({
        confirmations: 3,
        timestamp: Date.now()
      })

      const result = await service.checkTransactionConfirmations(mockTransactionId)
      expect(result.confirmed).toBe(false)
      expect(result.confirmations).toBe(3)
    })

    it('should handle transaction status fetch errors', async () => {
      mockBsvService.getTransactionStatus.mockRejectedValue(new Error('Network error'))

      await expect(service.checkTransactionConfirmations(mockTransactionId))
        .rejects
        .toThrow(BSVError)
    })

    it('should handle invalid transaction ID', async () => {
      mockBsvService.getTransactionStatus.mockRejectedValue(new Error('Invalid transaction ID'))

      await expect(service.checkTransactionConfirmations('invalid_txid'))
        .rejects
        .toThrow(BSVError)
    })
  })

  describe('Content Verification', () => {
    const mockContent: InscriptionContent = {
      type: 'video',
      timestamp: 1234567890,
      size: 1024,
      contentHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      metadata: {
        type: 'video',
        timestamp: 1234567890,
        size: 1024
      }
    }

    const mockInscription: InscriptionContent = {
      type: 'video',
      timestamp: 1234567890,
      size: 1024,
      contentHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      metadata: {
        type: 'video',
        timestamp: 1234567890,
        size: 1024
      }
    }

    it('should verify matching content and inscription', () => {
      const result = service.verifyContent(mockContent, mockInscription)
      expect(result).toBe(true)
    })

    it('should reject content with mismatched metadata', () => {
      const modifiedContent: InscriptionContent = {
        ...mockContent,
        size: 2048,
        metadata: {
          ...mockContent.metadata,
          size: 2048
        }
      }
      const result = service.verifyContent(modifiedContent, mockInscription)
      expect(result).toBe(false)
    })

    it('should reject content with mismatched content hash', () => {
      const modifiedContent: InscriptionContent = {
        ...mockContent,
        contentHash: 'different_hash'
      }
      const result = service.verifyContent(modifiedContent, mockInscription)
      expect(result).toBe(false)
    })

    it('should handle missing metadata fields', () => {
      const incompleteContent = {
        ...mockContent,
        metadata: {
          type: 'video',
          timestamp: 0,
          size: 0
        }
      }
      const result = service.verifyContent(incompleteContent, mockInscription)
      expect(result).toBe(false)
    })

    it('should handle null content', () => {
      const result = service.verifyContent(null as any, mockInscription)
      expect(result).toBe(false)
    })
  })

  describe('Ownership Validation', () => {
    const mockUnspentOutputs = [
      {
        tx_hash: mockTransactionId,
        tx_pos: 0,
        value: 1000,
        script_hex: '76a91400112233445566778899aabbccddeeff0123456788ac'
      }
    ]

    beforeEach(() => {
      mockBsvService.wallet.fetchWithRetry.mockResolvedValue({
        ok: true,
        json: async () => mockUnspentOutputs
      } as Response)
    })

    it('should validate ownership when UTXO exists', async () => {
      const result = await service.validateOwnership(mockAddress, mockTransactionId)
      expect(result).toBe(true)
      expect(mockBsvService.wallet.fetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining(mockAddress)
      )
    })

    it('should reject ownership when UTXO does not exist', async () => {
      mockBsvService.wallet.fetchWithRetry.mockResolvedValue({
        ok: true,
        json: async () => []
      } as Response)

      const result = await service.validateOwnership(mockAddress, mockTransactionId)
      expect(result).toBe(false)
    })

    it('should handle API errors', async () => {
      mockBsvService.wallet.fetchWithRetry.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      await expect(service.validateOwnership(mockAddress, mockTransactionId))
        .rejects
        .toThrow(BSVError)
    })

    it('should handle network errors', async () => {
      mockBsvService.wallet.fetchWithRetry.mockRejectedValue(new Error('Network error'))

      await expect(service.validateOwnership(mockAddress, mockTransactionId))
        .rejects
        .toThrow(BSVError)
    })

    it('should handle malformed UTXO data', async () => {
      mockBsvService.wallet.fetchWithRetry.mockResolvedValue({
        ok: true,
        json: async () => [{ invalid: 'data' }]
      } as Response)

      const result = await service.validateOwnership(mockAddress, mockTransactionId)
      expect(result).toBe(false)
    })

    it('should handle zero-value UTXOs', async () => {
      mockBsvService.wallet.fetchWithRetry.mockResolvedValue({
        ok: true,
        json: async () => [{
          ...mockUnspentOutputs[0],
          value: 0
        }]
      } as Response)

      const result = await service.validateOwnership(mockAddress, mockTransactionId)
      expect(result).toBe(false)
    })
  })
}) 