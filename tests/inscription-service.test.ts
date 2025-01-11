import { Script } from '@bsv/sdk'
import { InscriptionService } from '../src/services/inscription-service'
import { BSVError } from '../src/types'
import { Inscription, InscriptionContentType } from '../src/types/inscription'

describe('InscriptionService', () => {
  let inscriptionService: InscriptionService

  beforeEach(() => {
    inscriptionService = new InscriptionService()
  })

  describe('createInscriptionData', () => {
    // Create a small video file (under chunk size)
    const smallVideoContent = new Uint8Array(50 * 1024) // 50KB
    const smallFile = new File([smallVideoContent], 'small.mp4', { type: 'video/mp4' })

    // Create a large video file (over chunk size)
    const largeVideoContent = new Uint8Array(150 * 1024) // 150KB
    const largeFile = new File([largeVideoContent], 'large.mp4', { type: 'video/mp4' })

    const mockMetadata = {
      duration: 120,
      dimensions: {
        width: 1920,
        height: 1080
      },
      bitrate: 5000000
    }

    const mockCreatorAddress = 'mzJ9Gi7vvp1NGw4fviWjkHSvYAkHYQM9VA'
    const mockBlockHash = '000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254'

    it('should create valid inscription data for small video', async () => {
      const result = await inscriptionService.createInscriptionData({
        file: smallFile,
        metadata: mockMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: mockBlockHash
      })

      expect(result).toMatchObject({
        content: {
          type: 'video/mp4',
          size: smallFile.size,
          duration: mockMetadata.duration,
          width: mockMetadata.dimensions.width,
          height: mockMetadata.dimensions.height
        },
        metadata: {
          title: smallFile.name,
          creator: mockCreatorAddress,
          attributes: {
            blockHash: mockBlockHash,
            bitrate: mockMetadata.bitrate,
            format: smallFile.type,
            dimensions: '1920x1080'
          }
        },
        owner: mockCreatorAddress
      })

      // Verify single chunk for small file
      expect(Buffer.isBuffer(result.content.data)).toBe(true)
      expect(result.content.chunks).toBeUndefined()
      expect(result.transaction.chunks).toBeUndefined()
    })

    it('should create chunked inscription data for large video', async () => {
      const result = await inscriptionService.createInscriptionData({
        file: largeFile,
        metadata: mockMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: mockBlockHash
      })

      // Verify chunked data structure
      expect(Array.isArray(result.content.data)).toBe(true)
      const chunks = result.content.data as any[]
      expect(chunks.length).toBeGreaterThan(1)

      // Verify chunk properties
      chunks.forEach((chunk, index) => {
        expect(chunk).toMatchObject({
          sequenceNumber: index,
          totalChunks: chunks.length,
          data: expect.any(Buffer),
          checksum: expect.any(String)
        })
        expect(chunk.data.length).toBeLessThanOrEqual(100 * 1024) // Max 100KB per chunk
      })

      // Verify chunk metadata
      expect(result.content.chunks).toMatchObject({
        total: chunks.length,
        size: 100 * 1024,
        references: []
      })

      // Verify transaction chunk tracking
      expect(result.transaction.chunks).toMatchObject({
        txids: [],
        currentChunk: 0,
        isComplete: false
      })
    })

    it('should throw on unsupported video format', async () => {
      const invalidFile = new File(['test'], 'test.avi', { type: 'video/x-msvideo' })

      await expect(inscriptionService.createInscriptionData({
        file: invalidFile,
        metadata: mockMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: mockBlockHash
      })).rejects.toThrow(BSVError)
    })

    it('should throw on invalid metadata', async () => {
      const invalidMetadata = {
        duration: 0,
        dimensions: {
          width: 0,
          height: 0
        },
        bitrate: 0
      }

      await expect(inscriptionService.createInscriptionData({
        file: smallFile,
        metadata: invalidMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: mockBlockHash
      })).rejects.toThrow(BSVError)
    })

    it('should throw on invalid creator address', async () => {
      await expect(inscriptionService.createInscriptionData({
        file: smallFile,
        metadata: mockMetadata,
        creatorAddress: 'invalid',
        blockHash: mockBlockHash
      })).rejects.toThrow(BSVError)
    })

    it('should throw on invalid block hash', async () => {
      await expect(inscriptionService.createInscriptionData({
        file: smallFile,
        metadata: mockMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: 'invalid'
      })).rejects.toThrow(BSVError)
    })
  })

  describe('validateInscription', () => {
    const validInscription: Inscription = {
      id: 'test-123456-abcdef12-345678',
      content: {
        type: 'video/mp4',
        data: Buffer.from([]),
        size: 1000000,
        duration: 120,
        width: 1920,
        height: 1080
      },
      metadata: {
        title: 'Test Video',
        creator: 'mzJ9Gi7vvp1NGw4fviWjkHSvYAkHYQM9VA',
        createdAt: Date.now(),
        attributes: {
          format: 'video/mp4',
          dimensions: '1920x1080'
        }
      },
      owner: 'mzJ9Gi7vvp1NGw4fviWjkHSvYAkHYQM9VA',
      location: {
        txid: '',
        vout: 0,
        script: new Script(),
        satoshis: 1,
        height: 0
      },
      transaction: {
        txid: '',
        confirmations: 0,
        timestamp: Date.now(),
        fee: 0,
        blockHeight: 0
      },
      history: []
    }

    it('should validate correct inscription', () => {
      const result = inscriptionService.validateInscription(validInscription)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should validate chunked inscription', () => {
      const chunkedInscription: Inscription = {
        ...validInscription,
        content: {
          ...validInscription.content,
          data: [
            {
              sequenceNumber: 0,
              totalChunks: 2,
              data: Buffer.from([]),
              checksum: 'abc123'
            },
            {
              sequenceNumber: 1,
              totalChunks: 2,
              data: Buffer.from([]),
              checksum: 'def456'
            }
          ],
          chunks: {
            total: 2,
            size: 100 * 1024,
            references: []
          }
        },
        transaction: {
          ...validInscription.transaction,
          chunks: {
            txids: [],
            currentChunk: 0,
            isComplete: false
          }
        }
      }

      const result = inscriptionService.validateInscription(chunkedInscription)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should detect missing ID', () => {
      const invalid = { ...validInscription, id: '' }
      const result = inscriptionService.validateInscription(invalid)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing or invalid inscription ID')
    })

    it('should detect missing content', () => {
      const invalid = { ...validInscription, content: undefined as any }
      const result = inscriptionService.validateInscription(invalid)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing content')
    })

    it('should detect invalid content type', () => {
      const invalid = {
        ...validInscription,
        content: { 
          ...validInscription.content, 
          type: 'video/webm' as InscriptionContentType 
        }
      }
      const result = inscriptionService.validateInscription(invalid)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid content type')
    })
  })
}) 