import { InscriptionSecurityService } from '../src/services/inscription-security-service'
import { BSVError } from '../src/types'
import type { InscriptionMetadata } from '../src/services/inscription-security-service'
import crypto from 'crypto'

// Mock crypto for consistent test results
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue(Buffer.from('00112233', 'hex'))
  })
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('InscriptionSecurityService', () => {
  let service: InscriptionSecurityService

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset()
    service = new InscriptionSecurityService()
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(service['config']).toEqual({
        minConfirmations: 1,
        minInscriptionValue: 1
      })
    })

    it('should initialize with custom config', () => {
      service = new InscriptionSecurityService({
        minConfirmations: 2,
        minInscriptionValue: 100
      })
      expect(service['config']).toEqual({
        minConfirmations: 2,
        minInscriptionValue: 100
      })
    })
  })

  describe('pubKeyHashToAddress', () => {
    it('should convert pubkey hash to testnet address', () => {
      const result = service.pubKeyHashToAddress('0123456789abcdef0123456789abcdef01234567')
      expect(result).toMatch(/^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/)
    })

    it('should throw on invalid pubkey hash', () => {
      expect(() => service.pubKeyHashToAddress('invalid_hash')).toThrow(BSVError)
    })
  })

  describe('verifyInscriptionFormat', () => {
    const mockInscriptionData = {
      type: 'memepool',
      version: '1.0',
      content: {
        id: 'testTxId1',
        title: 'Test',
        creator: 'test',
        timestamp: '2023-12-18T15:00:00.000Z'
      }
    }

    const mockTxHex = '76a914abcdef0123456789abcdef0123456789abcdef88ac006a' + 
                     Buffer.from(JSON.stringify(mockInscriptionData)).toString('hex')

    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockTxHex)
      }))
    })

    it('should verify valid inscription format', async () => {
      const result = await service.verifyInscriptionFormat('testTxId1')
      expect(result).toEqual(mockInscriptionData)
    })

    it('should handle protection marker', async () => {
      const protectionTxHex = '76a914abcdef0123456789abcdef0123456789abcdef88ac006a044d454d45'
      ;(global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve(protectionTxHex)
      }))

      const result = await service.hasProtectionMarker('testTxId1')
      expect(result).toBe(true)
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
        ok: false,
        statusText: 'Not Found'
      }))

      await expect(service.verifyInscriptionFormat('invalidTxId'))
        .rejects
        .toThrow(BSVError)
    })
  })

  describe('verifyOwnershipForTransfer', () => {
    const mockTx = {
      txid: 'testTxId1',
      vout: [{
        scriptPubKey: {
          addresses: ['testAddress1']
        }
      }],
      confirmations: 2
    }

    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTx)
      }))
    })

    it('should verify ownership correctly', async () => {
      // Mock spent check to indicate unspent
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTx)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          status: 404
        }))

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(true)
    })

    it('should handle insufficient confirmations', async () => {
      const lowConfTx = { ...mockTx, confirmations: 0 }
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(lowConfTx)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          status: 404
        }))

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(false)
    })

    it('should handle spent transactions', async () => {
      // Mock a chain of transactions
      const spentResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ spentTxid: 'testTxId2' })
      }
      const finalTx = {
        ...mockTx,
        txid: 'testTxId2'
      }

      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTx)
        }))
        .mockImplementationOnce(() => Promise.resolve(spentResponse))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(finalTx)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          status: 404
        }))

      const result = await service.verifyOwnershipForTransfer('testTxId1', 'testAddress1')
      expect(result).toBe(true)
    })
  })

  describe('confirmTransfer', () => {
    const validInscription: InscriptionMetadata = {
      type: 'memepool',
      version: '1.0',
      content: {
        id: 'testTxId1',
        title: 'Test',
        creator: 'test',
        timestamp: '2023-12-18T15:00:00.000Z'
      }
    }

    it('should confirm valid transfer parameters', async () => {
      const validAddress = 'mzJ9Gi7vvp1NGw4fviWjkHSvYAkHYQM9VA' // Valid testnet address
      
      expect(await service.confirmTransfer(validInscription, validAddress)).toBe(true)
    })

    it('should reject invalid inscription data', async () => {
      const invalidInscription = {
        type: 'memepool',
        version: '1.0',
        content: {} // Missing required fields
      }

      await expect(service.confirmTransfer(invalidInscription as any, 'mtestqxy8hqvfu4lx8e7e3zh8yk4xv3e7z4kxrsjf2k'))
        .rejects
        .toThrow(BSVError)
    })

    it('should reject invalid recipient address', async () => {
      await expect(service.confirmTransfer(validInscription, 'invalid'))
        .rejects
        .toThrow(BSVError)
    })
  })

  describe('validateTransferParams', () => {
    it('should validate complete parameters', () => {
      const params = {
        inscriptionId: 'testTxId1',
        recipientAddress: 'testAddress1',
        fee: 1000
      }
      expect(service.validateTransferParams(params)).toBe(true)
    })

    it('should reject incomplete parameters', () => {
      const params = {
        inscriptionId: 'testTxId1',
        recipientAddress: 'testAddress1'
        // Missing fee
      }
      expect(() => service.validateTransferParams(params))
        .toThrow(BSVError)
    })
  })

  describe('hasInscription and hasProtectionMarker', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve('76a914abcdef0123456789abcdef0123456789abcdef88ac006a044d454d45')
      }))
    })

    it('should detect inscription', async () => {
      const mockInscriptionTxHex = '76a914abcdef0123456789abcdef0123456789abcdef88ac006a' + 
                                  Buffer.from(JSON.stringify({ type: 'memepool' })).toString('hex')
      ;(global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockInscriptionTxHex)
      }))

      const result = await service.hasInscription('testTxId1')
      expect(result).toBe(true)
    })

    it('should detect protection marker', async () => {
      const result = await service.hasProtectionMarker('testTxId1')
      expect(result).toBe(true)
    })

    it('should handle transactions without inscriptions', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve('76a914abcdef0123456789abcdef0123456789abcdef88ac')
      }))

      const result = await service.hasInscription('testTxId1')
      expect(result).toBe(false)
    })
  })

  describe('filterInscriptionUtxos', () => {
    const mockUtxos = [
      { txid: 'testTxId1', vout: 0 },
      { txid: 'testTxId2', vout: 1 }
    ]

    const mockInscriptionTxHex = '76a914abcdef0123456789abcdef0123456789abcdef88ac006a' + 
                                Buffer.from(JSON.stringify({ type: 'memepool' })).toString('hex')

    beforeEach(() => {
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockInscriptionTxHex)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockInscriptionTxHex)
        }))
    })

    it('should filter UTXOs with inscriptions', async () => {
      const result = await service.filterInscriptionUtxos(mockUtxos)
      expect(result).toHaveLength(2)
      expect(result[0].txid).toBe('testTxId1')
    })

    it('should handle empty UTXO list', async () => {
      const result = await service.filterInscriptionUtxos([])
      expect(result).toHaveLength(0)
    })

    it('should handle API errors', async () => {
      const mockUtxos = [
        { txid: 'testTxId1', vout: 0 },
        { txid: 'testTxId2', vout: 1 }
      ]

      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'))

      await expect(service.filterInscriptionUtxos(mockUtxos)).rejects.toThrow(BSVError)
    })
  })
}) 