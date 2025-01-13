import { BSVError } from '../types'
import { Script, P2PKH } from '@bsv/sdk'
import type {
  InscriptionContent,
  InscriptionMetadata,
  Inscription,
  InscriptionValidation,
  VideoChunk,
  InscriptionContentType,
  InscriptionLocation,
  InscriptionTransaction,
  InscriptionCreationParams
} from '../types/inscription'
import { VideoMetadata, VideoFile } from '../types/video'
import crypto from 'crypto'

const MAX_CHUNK_SIZE = 100 * 1024  // 100KB per chunk

/**
 * Service for handling video inscriptions
 */
export class InscriptionService {
  /**
   * Creates the initial inscription holder script
   * @param address - The address to create the holder script for
   * @param inscriptionTxId - The inscription transaction ID
   * @returns Script object
   */
  createInitialHolderScript(address: string, inscriptionTxId: string): Script {
    // Create P2PKH script
    const p2pkh = new P2PKH();
    const p2pkhScript = p2pkh.lock(address);
    
    // Create combined script parts
    const scriptParts = [
      p2pkhScript.toHex(), // P2PKH script
      '6a20' + inscriptionTxId, // OP_RETURN <32 bytes> for TXID
      '6a044d454d45' // OP_RETURN MEME
    ];
    
    // Create and return combined script
    return Script.fromHex(scriptParts.join(''));
  }

  /**
   * Creates an inscription data structure for a video
   * @param params - Parameters for inscription creation
   * @returns Inscription data structure
   */
  async createInscriptionData(params: InscriptionCreationParams): Promise<{ 
    content: InscriptionContent; 
    metadata: InscriptionMetadata;
    holderScript: Script;
    inscriptionId: string;
  }> {
    const { videoFile, metadata, creatorAddress, blockHash } = params

    // Validate input parameters
    this.validateInputParams(params)

    // Create a temporary inscription ID based on content hash
    // This will be replaced by the actual txid after transaction creation
    const tempInscriptionId = crypto.createHash('sha256')
      .update(videoFile.buffer)
      .digest('hex');

    // Create the holder script with the temporary ID
    const holderScript = this.createInitialHolderScript(creatorAddress, tempInscriptionId)

    // Determine if we need to chunk the data
    const chunks = this.prepareVideoChunks(videoFile.buffer)
    
    const content: InscriptionContent = {
      type: this.validateVideoFormat(videoFile.type),
      data: chunks.length > 1 ? chunks : videoFile.buffer,
      size: videoFile.size,
      duration: metadata.duration,
      width: metadata.dimensions.width,
      height: metadata.dimensions.height,
      chunks: chunks.length > 1 ? {
        total: chunks.length,
        size: MAX_CHUNK_SIZE,
        references: []
      } : undefined
    }

    const inscriptionMetadata: InscriptionMetadata = {
      type: 'memepool',
      version: '1.0',
      content: {
        type: videoFile.type,
        size: videoFile.size,
        duration: metadata.duration,
        width: metadata.dimensions.width,
        height: metadata.dimensions.height
      },
      metadata: {
        title: videoFile.name,
        creator: creatorAddress,
        createdAt: Date.now(),
        attributes: {
          blockHash,
          bitrate: metadata.bitrate,
          format: videoFile.type,
          dimensions: `${metadata.dimensions.width}x${metadata.dimensions.height}`
        }
      }
    }

    return { 
      content, 
      metadata: inscriptionMetadata,
      holderScript,
      inscriptionId: tempInscriptionId
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
   */
  private validateInputParams(params: InscriptionCreationParams): void {
    const { videoFile, metadata, creatorAddress, blockHash } = params

    if (!videoFile || !videoFile.buffer || !videoFile.type) {
      throw new BSVError('INVALID_PARAMS', 'Invalid file parameter')
    }

    if (!this.validateVideoFormat(videoFile.type)) {
      throw new BSVError('INVALID_PARAMS', 'Invalid video format')
    }

    if (!metadata || !metadata.duration || !metadata.dimensions) {
      throw new BSVError('INVALID_PARAMS', 'Invalid metadata')
    }

    if (!creatorAddress) {
      throw new BSVError('INVALID_PARAMS', 'Invalid creator address')
    }

    if (!blockHash) {
      throw new BSVError('INVALID_PARAMS', 'Invalid block hash')
    }
  }

  /**
   * Generates a deterministic inscription ID based on content and metadata
   * @private
   */
  private generateInscriptionId(
    content: Buffer,
    metadata: VideoMetadata,
    creator: string,
    timestamp: number
  ): string {
    const data = Buffer.concat([
      content.slice(0, 1024), // First 1KB of content
      Buffer.from(creator),
      Buffer.from(JSON.stringify({
        duration: metadata.duration,
        dimensions: metadata.dimensions,
        codec: metadata.codec,
        bitrate: metadata.bitrate
      }))
    ]);
    return crypto.createHash('sha256').update(data).digest('hex');
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
      if (!inscription.txid || typeof inscription.txid !== 'string' || !/^[0-9a-f]{64}$/i.test(inscription.txid)) {
        validation.errors.push('Missing or invalid transaction ID')
      }

      // Check content
      if (!inscription.content) {
        validation.errors.push('Missing content')
        validation.isValid = false
        return validation
      }

      // Check content type
      const supportedFormats: InscriptionContentType[] = ['video/mp4', 'video/webm', 'video/quicktime']
      if (!supportedFormats.includes(inscription.content.type)) {
        validation.errors.push('Invalid content type')
        validation.isValid = false
        return validation
      }

      // Check location and script
      if (!inscription.location || !inscription.location.script) {
        validation.errors.push('Missing location or script')
      } else {
        // Verify script format (P2PKH + Original TXID + MEME marker)
        const scriptHex = inscription.location.script.toHex()
        const hasP2PKH = /76a914[0-9a-f]{40}88ac/.test(scriptHex)
        const hasOriginalTxid = /6a20[0-9a-f]{64}/.test(scriptHex)
        const hasMEMEMarker = scriptHex.includes('6a044d454d45')
        
        if (!hasP2PKH || !hasOriginalTxid || !hasMEMEMarker) {
          validation.errors.push('Invalid inscription holder script format')
        }

        // Verify 1 satoshi value
        if (inscription.location.satoshis !== 1) {
          validation.errors.push('Invalid inscription holder value (must be 1 satoshi)')
        }
      }

      if (!inscription.metadata || 
         !inscription.metadata.metadata.title || 
         !inscription.metadata.metadata.creator) {
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

  /**
   * Updates the holder script with the actual transaction ID
   * @param script - The original holder script
   * @param txid - The actual transaction ID
   * @returns Updated holder script
   */
  updateHolderScript(creatorAddress: string, txid: string): Script {
    return this.createInitialHolderScript(creatorAddress, txid);
  }
} 