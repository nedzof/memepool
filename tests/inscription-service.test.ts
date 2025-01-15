import { Script } from '@bsv/sdk'
import { InscriptionService } from '../src/services/inscription-service'
import { BSVError } from '../src/types'
import { Inscription, InscriptionContentType, HolderMetadata } from '../src/types/inscription'
import cbor from 'cbor'

describe('InscriptionService', () => {
  let inscriptionService: InscriptionService

  beforeEach(() => {
    inscriptionService = new InscriptionService()
  })

  describe('createInscriptionData', () => {
    // Create a small video file (under chunk size)
    const smallVideoBuffer = Buffer.from(new Uint8Array(50 * 1024)) // 50KB
    const smallVideoFile = {
      buffer: smallVideoBuffer,
      name: 'small.mp4',
      type: 'video/mp4',
      size: 50 * 1024
    }

    // Create a large video file (over chunk size)
    const largeVideoBuffer = Buffer.from(new Uint8Array(150 * 1024)) // 150KB
    const largeVideoFile = {
      buffer: largeVideoBuffer,
      name: 'large.mp4',
      type: 'video/mp4',
      size: 150 * 1024
    }

    const mockMetadata = {
      duration: 120,
      dimensions: {
        width: 1920,
        height: 1080
      },
      bitrate: 5000000
    }

    // Use valid testnet address format
    const mockCreatorAddress = 'mzJ9Gi7vvp1NGw4fviWjkHSvYAkHYQM9VA'
    const mockBlockHash = '000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254'

    it('should create valid inscription data for small video', async () => {
      const result = await inscriptionService.createInscriptionData({
        videoFile: smallVideoFile,
        metadata: mockMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: mockBlockHash
      })

      expect(result).toMatchObject({
        content: {
          type: 'video/mp4',
          size: smallVideoFile.size,
          duration: mockMetadata.duration,
          width: mockMetadata.dimensions.width,
          height: mockMetadata.dimensions.height
        },
        metadata: {
          type: 'memepool',
          version: '1.0',
          content: {
            type: smallVideoFile.type,
            size: smallVideoFile.size,
            duration: mockMetadata.duration,
            width: mockMetadata.dimensions.width,
            height: mockMetadata.dimensions.height
          },
          metadata: {
            title: smallVideoFile.name,
            creator: mockCreatorAddress,
            attributes: {
              blockHash: mockBlockHash,
              bitrate: mockMetadata.bitrate,
              format: smallVideoFile.type,
              dimensions: '1920x1080'
            }
          }
        }
      })

      // Verify single chunk for small file
      expect(Buffer.isBuffer(result.content.data)).toBe(true)
      expect(result.content.chunks).toBeUndefined()

      // Verify holder script format
      const scriptHex = result.holderScript.toHex()
      expect(scriptHex).toMatch(/^76a914[0-9a-f]{40}88ac/) // P2PKH script
      expect(scriptHex).toMatch(/6a/) // OP_RETURN

      // Verify CBOR metadata in holder script
      const p2pkhEnd = scriptHex.indexOf('88ac') + 4
      const cborHex = scriptHex.slice(p2pkhEnd + 2) // Skip 6a
      const cborData = Buffer.from(cborHex, 'hex')
      const decodedMetadata = cbor.decode(cborData) as HolderMetadata

      expect(decodedMetadata).toMatchObject({
        version: 1,
        prefix: 'meme',
        operation: 'inscribe',
        name: smallVideoFile.name,
        creator: mockCreatorAddress
      })
    })

    it('should create chunked inscription data for large video', async () => {
      const result = await inscriptionService.createInscriptionData({
        videoFile: largeVideoFile,
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

      // Verify holder script CBOR metadata
      const scriptHex = result.holderScript.toHex()
      const p2pkhEnd = scriptHex.indexOf('88ac') + 4
      const cborHex = scriptHex.slice(p2pkhEnd + 2) // Skip 6a
      const cborData = Buffer.from(cborHex, 'hex')
      const decodedMetadata = cbor.decode(cborData) as HolderMetadata

      expect(decodedMetadata).toMatchObject({
        version: 1,
        prefix: 'meme',
        operation: 'inscribe',
        name: largeVideoFile.name,
        creator: mockCreatorAddress
      })
    })

    it('should throw on unsupported video format', async () => {
      const invalidFile = {
        buffer: Buffer.from([]),
        name: 'test.avi',
        type: 'video/x-msvideo',
        size: 1000
      }

      await expect(inscriptionService.createInscriptionData({
        videoFile: invalidFile,
        metadata: mockMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: mockBlockHash
      })).rejects.toThrow(BSVError)
      await expect(inscriptionService.createInscriptionData({
        videoFile: invalidFile,
        metadata: mockMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: mockBlockHash
      })).rejects.toThrow("INSCRIPTION_ERROR")
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
        videoFile: smallVideoFile,
        metadata: invalidMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: mockBlockHash
      })).rejects.toThrow(BSVError)
      await expect(inscriptionService.createInscriptionData({
        videoFile: smallVideoFile,
        metadata: invalidMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: mockBlockHash
      })).rejects.toThrow("INSCRIPTION_ERROR")
    })

    it('should throw on invalid creator address', async () => {
      await expect(inscriptionService.createInscriptionData({
        videoFile: smallVideoFile,
        metadata: mockMetadata,
        creatorAddress: 'invalid',
        blockHash: mockBlockHash
      })).rejects.toThrow(BSVError)
      await expect(inscriptionService.createInscriptionData({
        videoFile: smallVideoFile,
        metadata: mockMetadata,
        creatorAddress: 'invalid',
        blockHash: mockBlockHash
      })).rejects.toThrow("VALIDATION_ERROR")
    })

    it('should throw on invalid block hash', async () => {
      await expect(inscriptionService.createInscriptionData({
        videoFile: smallVideoFile,
        metadata: mockMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: 'invalid'
      })).rejects.toThrow(BSVError)
      await expect(inscriptionService.createInscriptionData({
        videoFile: smallVideoFile,
        metadata: mockMetadata,
        creatorAddress: mockCreatorAddress,
        blockHash: 'invalid'
      })).rejects.toThrow("VALIDATION_ERROR")
    })
  })

  describe('validateInscription', () => {
    const validInscription: Inscription = {
      txid: '2234d0dc08b84f1a4e9fbae89a96411ed56c8f04b8c687543e0382e2be258f06',
      content: {
        type: 'video/mp4',
        data: Buffer.from([]),
        size: 1000000,
        duration: 120,
        width: 1920,
        height: 1080
      },
      metadata: {
        type: 'memepool',
        version: '1.0',
        content: {
          type: 'video/mp4',
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
            blockHash: '000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254',
            bitrate: 5000000,
            format: 'video/mp4',
            dimensions: '1920x1080'
          }
        }
      },
      owner: 'mzJ9Gi7vvp1NGw4fviWjkHSvYAkHYQM9VA',
      location: {
        txid: '',
        vout: 0,
        script: Script.fromHex('76a914729f451157ae9c5b89390c6e7690d612a4af2bd488ac6a044d454d45'),
        satoshis: 1,
        height: 0,
        metadata: {
          version: 1,
          prefix: 'meme',
          operation: 'inscribe',
          name: 'Test Video',
          contentID: '123',
          txid: 'deploy',
          creator: 'mzJ9Gi7vvp1NGw4fviWjkHSvYAkHYQM9VA'
        }
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

    it('should detect missing txid', () => {
      const invalid = { ...validInscription, txid: '' }
      const result = inscriptionService.validateInscription(invalid)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing or invalid transaction ID')
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
        }
      }

      const result = inscriptionService.validateInscription(chunkedInscription)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
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
          type: 'video/avi' as InscriptionContentType 
        }
      }
      const result = inscriptionService.validateInscription(invalid)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid content type')
    })
  }) 
}) 