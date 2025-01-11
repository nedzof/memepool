import { BSVError } from '../types'
import { Script } from '@bsv/sdk'
import type {
  InscriptionContent,
  InscriptionMetadata,
  Inscription,
  InscriptionValidation,
  VideoChunk,
  InscriptionContentType,
  InscriptionLocation,
  InscriptionTransaction
} from '../types/inscription'
import crypto from 'crypto'

interface VideoMetadata {
  duration: number
  dimensions: {
    width: number
    height: number
  }
  bitrate: number
}

interface InscriptionCreationParams {
  file: File
  metadata: VideoMetadata
  creatorAddress: string
  blockHash: string
}

const MAX_CHUNK_SIZE = 100 * 1024  // 100KB per chunk

/**
 * Service for handling video inscriptions
 */
export class InscriptionService {
  /**
   * Creates an inscription data structure for a video
   * @param params - Parameters for inscription creation
   * @returns Inscription data structure
   */
  async createInscriptionData(params: InscriptionCreationParams): Promise<Inscription> {
    const { file, metadata, creatorAddress, blockHash } = params
    const timestamp = Date.now()

    // Validate input parameters
    this.validateInputParams(params)

    // Read file data
    const fileData = await file.arrayBuffer()
    const buffer = Buffer.from(fileData)

    // Determine if we need to chunk the data
    const chunks = this.prepareVideoChunks(buffer)
    
    const content: InscriptionContent = {
      type: this.validateVideoFormat(file.type),
      data: chunks.length > 1 ? chunks : buffer,
      size: file.size,
      duration: metadata.duration,
      width: metadata.dimensions.width,
      height: metadata.dimensions.height
    }

    if (chunks.length > 1) {
      content.chunks = {
        total: chunks.length,
        size: MAX_CHUNK_SIZE,
        references: []  // Will be filled when transactions are created
      }
    }

    const inscriptionMetadata: InscriptionMetadata = {
      title: file.name,
      creator: creatorAddress,
      createdAt: timestamp,
      attributes: {
        blockHash,
        bitrate: metadata.bitrate,
        format: file.type,
        dimensions: `${metadata.dimensions.width}x${metadata.dimensions.height}`
      }
    }

    const location: InscriptionLocation = {
      txid: '',
      vout: 0,
      script: new Script(), // Empty script until transaction is created
      satoshis: 1,
      height: 0
    }

    const transaction: InscriptionTransaction = {
      txid: '',
      confirmations: 0,
      timestamp: timestamp,
      fee: 0,
      blockHeight: 0,
      chunks: chunks.length > 1 ? {
        txids: [],
        currentChunk: 0,
        isComplete: false
      } : undefined
    }

    return {
      id: this.generateContentId({
        fileName: file.name,
        timestamp,
        creatorAddress,
        blockHash
      }),
      content,
      metadata: inscriptionMetadata,
      owner: creatorAddress,
      location,
      transaction,
      history: []
    }
  }

  /**
   * Prepares video data chunks if needed
   * @param buffer - Video data buffer
   * @returns Array of chunks or single chunk if small enough
   */
  private prepareVideoChunks(buffer: Buffer): VideoChunk[] {
    if (buffer.length <= MAX_CHUNK_SIZE) {
      return [{
        sequenceNumber: 0,
        totalChunks: 1,
        data: buffer,
        checksum: this.calculateChecksum(buffer)
      }]
    }

    const chunks: VideoChunk[] = []
    let offset = 0
    let chunkNumber = 0
    const totalChunks = Math.ceil(buffer.length / MAX_CHUNK_SIZE)

    while (offset < buffer.length) {
      const chunkData = buffer.slice(offset, offset + MAX_CHUNK_SIZE)
      chunks.push({
        sequenceNumber: chunkNumber,
        totalChunks,
        data: chunkData,
        checksum: this.calculateChecksum(chunkData),
        previousChunkTxid: chunkNumber > 0 ? undefined : undefined // Will be filled during inscription
      })
      offset += MAX_CHUNK_SIZE
      chunkNumber++
    }

    return chunks
  }

  /**
   * Calculates checksum for data integrity
   * @param data - Data buffer
   * @returns Checksum string
   */
  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Validates video format and returns the correct content type
   * @param mimeType - The MIME type of the video file
   * @returns Validated video content type
   * @throws {BSVError} If format is not supported
   */
  private validateVideoFormat(mimeType: string): InscriptionContentType {
    const format = mimeType.toLowerCase() as InscriptionContentType
    const supportedFormats: InscriptionContentType[] = ['video/mp4', 'video/webm', 'video/quicktime']

    if (!supportedFormats.includes(format)) {
      throw new BSVError(
        'INVALID_FORMAT',
        `Unsupported video format: ${format}. Supported formats: ${supportedFormats.join(', ')}`
      )
    }

    return format
  }

  /**
   * Validates input parameters for inscription creation
   * @param params - Parameters to validate
   * @throws {BSVError} If any parameters are invalid
   */
  private validateInputParams(params: InscriptionCreationParams): void {
    const { file, metadata, creatorAddress, blockHash } = params

    if (!file || !(file instanceof File)) {
      throw new BSVError('INVALID_PARAMS', 'Invalid file parameter')
    }

    if (!metadata || !metadata.duration || !metadata.dimensions || !metadata.bitrate) {
      throw new BSVError('INVALID_PARAMS', 'Invalid metadata parameter')
    }

    if (!creatorAddress || typeof creatorAddress !== 'string' || creatorAddress.length < 25) {
      throw new BSVError('INVALID_PARAMS', 'Invalid creator address')
    }

    if (!blockHash || typeof blockHash !== 'string' || !/^[0-9a-f]{64}$/i.test(blockHash)) {
      throw new BSVError('INVALID_PARAMS', 'Invalid block hash')
    }
  }

  /**
   * Generates a unique content ID
   * @param params - Parameters for ID generation
   * @returns Unique content ID
   */
  private generateContentId(params: {
    fileName: string
    timestamp: number
    creatorAddress: string
    blockHash: string
  }): string {
    const { fileName, timestamp, creatorAddress, blockHash } = params
    
    // Use deterministic components for the ID
    const fileComponent = fileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const timeComponent = timestamp.toString()
    const addressComponent = creatorAddress.slice(-8) // Use last 8 chars of address
    const blockComponent = blockHash.slice(-6) // Use last 6 chars of block hash
    
    return `${fileComponent}-${timeComponent}-${addressComponent}-${blockComponent}`
  }

  /**
   * Validates the inscription data structure
   * @param inscription - The inscription data to validate
   * @returns Validation result
   */
  validateInscription(inscription: Inscription): InscriptionValidation {
    const validation: InscriptionValidation = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      // Check required fields
      if (!inscription.id || typeof inscription.id !== 'string') {
        validation.errors.push('Missing or invalid inscription ID')
      }

      // Check content
      if (!inscription.content) {
        validation.errors.push('Missing content')
        validation.isValid = false
        return validation
      }

      // Check content type
      const supportedFormats: InscriptionContentType[] = ['video/mp4', 'video/quicktime']
      if (!supportedFormats.includes(inscription.content.type)) {
        validation.errors.push('Invalid content type')
        validation.isValid = false
        return validation
      }

      if (!inscription.metadata || !inscription.metadata.title || !inscription.metadata.creator) {
        validation.errors.push('Missing required metadata fields')
      }

      // Check content constraints
      if (inscription.content.size > 100 * 1024 * 1024) { // 100MB limit
        validation.errors.push('Content size exceeds 100MB limit')
      }

      if (inscription.content.width && inscription.content.height) {
        if (inscription.content.width > 3840 || inscription.content.height > 2160) {
          validation.warnings.push('Resolution exceeds 4K (3840x2160)')
        }
      }

      // Update validation status
      validation.isValid = validation.errors.length === 0
    } catch (error) {
      validation.isValid = false
      validation.errors.push(error instanceof Error ? error.message : 'Unknown validation error')
    }

    return validation
  }
} 