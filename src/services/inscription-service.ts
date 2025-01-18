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
  InscriptionCreationParams,
  HolderMetadata,
  ContentIDComponents
} from '../types/inscription'
import { VideoMetadata, VideoFile } from '../types/video'
import crypto from 'crypto'
import cbor from 'cbor'

const MAX_CHUNK_SIZE = 100 * 1024  // 100KB per chunk

/**
 * Service for handling video inscriptions
 */
export class InscriptionService {
  /**
   * Creates the initial inscription holder script
   * @param address - The address to create the holder script for
   * @param name - The name of the video
   * @param contentId - The unique content ID
   * @returns Script object
   */
  createInitialHolderScript(address: string, name: string, contentId: string): Script {
    try {
      // Create P2PKH script
      console.log('Creating P2PKH script with:', { address, name, contentId });
      const p2pkh = new P2PKH();
      console.log('P2PKH instance created');
      const p2pkhScript = p2pkh.lock(address);
      console.log('P2PKH script created:', p2pkhScript.toHex());
      
      // Create holder metadata
      const metadata: HolderMetadata = {
        version: 1,
        prefix: 'meme',
        operation: 'inscribe',
        name,
        contentID: contentId,
        txid: 'deploy',
        creator: address
      };
      console.log('Created holder metadata:', metadata);

      // Serialize metadata to CBOR
      const cborData = cbor.encode(metadata);
      console.log('CBOR data length:', cborData.length);
      console.log('CBOR data hex:', cborData.toString('hex'));
      
      // Create combined script parts
      const scriptParts = [
        p2pkhScript.toHex(),                // P2PKH script
        '6a' + this.createPushData(cborData).toString('hex')  // OP_RETURN + CBOR data
      ];
      console.log('Script parts:', scriptParts);
      
      const finalScript = Script.fromHex(scriptParts.join(''));
      console.log('Final script hex:', finalScript.toHex());
      return finalScript;
    } catch (error) {
      console.error('Failed to create holder script:', error);
      // Let the error propagate up to be handled by createInscriptionData
      throw error;
    }
  }

  /**
   * Creates a transfer holder script
   * @param toAddress - The recipient's address
   * @param originalMetadata - The original holder metadata
   * @param originalTxId - The original inscription transaction ID
   * @returns Script object
   */
  createTransferHolderScript(toAddress: string, originalMetadata: HolderMetadata, originalTxId: string): Script {
    // Create P2PKH script for new owner
    const p2pkh = new P2PKH();
    const p2pkhScript = p2pkh.lock(toAddress);
    
    // Create transfer metadata
    const metadata: HolderMetadata = {
      version: originalMetadata.version,
      prefix: originalMetadata.prefix,
      operation: 'transfer',
      name: originalMetadata.name,
      contentID: originalMetadata.contentID,
      txid: originalTxId,
      creator: originalMetadata.creator
    };

    // Serialize metadata to CBOR
    const cborData = cbor.encode(metadata);
    
    // Create combined script parts
    const scriptParts = [
      p2pkhScript.toHex(),                // P2PKH script
      '6a' + this.createPushData(cborData).toString('hex')  // OP_RETURN + CBOR data
    ];
    
    return Script.fromHex(scriptParts.join(''));
  }

  /**
   * Creates appropriate PUSHDATA based on data size
   * @param data - The data to push
   * @returns Buffer containing the PUSHDATA prefix and data
   */
  private createPushData(data: Buffer): Buffer {
    if (data.length <= 0x4b) {
      // Use direct push
      const lenBuffer = Buffer.alloc(1);
      lenBuffer.writeUInt8(data.length);
      return Buffer.concat([lenBuffer, data]);
    } else if (data.length <= 0xff) {
      // Use PUSHDATA1
      const lenBuffer = Buffer.alloc(2);
      lenBuffer[0] = 0x4c; // PUSHDATA1
      lenBuffer[1] = data.length;
      return Buffer.concat([lenBuffer, data]);
    } else if (data.length <= 0xffff) {
      // Use PUSHDATA2
      const lenBuffer = Buffer.alloc(3);
      lenBuffer[0] = 0x4d; // PUSHDATA2
      lenBuffer.writeUInt16LE(data.length, 1);
      return Buffer.concat([lenBuffer, data]);
    } else {
      // Use PUSHDATA4
      const lenBuffer = Buffer.alloc(5);
      lenBuffer[0] = 0x4e; // PUSHDATA4
      lenBuffer.writeUInt32LE(data.length, 1);
      return Buffer.concat([lenBuffer, data]);
    }
  }

  /**
   * Extracts and decodes holder metadata from a script
   * @param script - The holder script
   * @returns The decoded metadata or null if invalid
   */
  extractHolderMetadata(script: Script): HolderMetadata | null {
    try {
      const scriptHex = script.toHex();
      
      // Find OP_RETURN data after P2PKH script
      const p2pkhMatch = scriptHex.match(/76a914[0-9a-f]{40}88ac/);
      if (!p2pkhMatch) return null;
      
      const dataStart = p2pkhMatch.index! + p2pkhMatch[0].length;
      if (scriptHex.slice(dataStart, dataStart + 2) !== '6a') return null;
      
      // Extract CBOR data after OP_RETURN
      const opReturnData = scriptHex.slice(dataStart + 2);
      
      // Handle PUSHDATA prefixes
      let cborStartIndex = 0;
      if (opReturnData.startsWith('4c')) {
        cborStartIndex = 4; // Skip 4c and one byte length
      } else if (opReturnData.startsWith('4d')) {
        cborStartIndex = 6; // Skip 4d and two byte length
      } else if (opReturnData.startsWith('4e')) {
        cborStartIndex = 10; // Skip 4e and four byte length
      } else {
        cborStartIndex = 2; // Skip one byte length for direct push
      }
      
      const cborHex = opReturnData.slice(cborStartIndex);
      const cborBuffer = Buffer.from(cborHex, 'hex');
      
      // Decode CBOR data
      const metadata = cbor.decode(cborBuffer) as HolderMetadata;
      
      // Validate metadata structure
      if (!this.validateHolderMetadata(metadata)) return null;
      
      return metadata;
    } catch (error) {
      console.error('Failed to extract holder metadata:', error);
      return null;
    }
  }

  /**
   * Validates holder metadata structure
   * @param metadata - The metadata to validate
   * @returns boolean indicating if metadata is valid
   */
  private validateHolderMetadata(metadata: HolderMetadata): boolean {
    return !!(
      metadata &&
      metadata.version === 1 &&
      metadata.prefix === 'meme' &&
      (metadata.operation === 'inscribe' || metadata.operation === 'transfer') &&
      typeof metadata.name === 'string' &&
      typeof metadata.contentID === 'string' &&
      typeof metadata.txid === 'string' &&
      typeof metadata.creator === 'string'
    );
  }

  /**
   * Validates the holder script format
   * @param script - The script to validate
   * @returns boolean indicating if script is valid
   */
  private validateHolderScript(script: Script): boolean {
    console.log('Validating holder script...');
    
    // Extract and validate metadata
    const metadata = this.extractHolderMetadata(script);
    console.log('Extracted metadata:', metadata);
    if (!metadata) {
      console.log('Failed to extract metadata from script');
      return false;
    }
    
    // Check P2PKH script presence (76a914{20-bytes}88ac)
    const scriptHex = script.toHex();
    console.log('Script hex:', scriptHex);
    const hasP2PKH = /76a914[0-9a-f]{40}88ac/.test(scriptHex);
    console.log('Has P2PKH:', hasP2PKH);
    
    // Check for OP_RETURN with PUSHDATA prefix
    // The prefix can be:
    // 0x01-0x4b: direct length
    // 0x4c: PUSHDATA1 (1 byte length)
    // 0x4d: PUSHDATA2 (2 bytes length)
    // 0x4e: PUSHDATA4 (4 bytes length)
    const hasOpReturn = /6a([0-9a-f]{2}){1,5}/.test(scriptHex);
    console.log('Has OP_RETURN with PUSHDATA:', hasOpReturn);
    
    // Check if metadata is valid
    const isValidMetadata = this.validateHolderMetadata(metadata);
    console.log('Metadata validation result:', isValidMetadata);
    
    const isValid = hasP2PKH && hasOpReturn && isValidMetadata;
    console.log('Final validation result:', isValid);
    
    return isValid;
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
    try {
      console.log('Step 1: Starting inscription data creation');
      console.log('Input params:', {
        videoName: params.videoFile.name,
        videoType: params.videoFile.type,
        videoSize: params.videoFile.size,
        creatorAddress: params.creatorAddress,
        blockHash: params.blockHash,
        metadata: params.metadata
      });

      // Validate creator address format first
      console.log('Step 2: Validating creator address');
      if (!params.creatorAddress || !/^[mn1][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(params.creatorAddress)) {
        throw new BSVError('VALIDATION_ERROR', 'Invalid address format');
      }

      // Validate block hash format
      console.log('Step 3: Validating block hash');
      if (!/^[0-9a-f]{64}$/i.test(params.blockHash)) {
        throw new BSVError('VALIDATION_ERROR', 'Invalid block hash format');
      }

      // Validate other input parameters
      console.log('Step 4: Validating input parameters');
      try {
        this.validateInputParams(params);
      } catch (error) {
        console.error('Input parameter validation failed:', error);
        throw error;
      }

      // Generate unique content ID
      console.log('Step 5: Generating content ID');
      const contentIdComponents = {
        videoName: params.videoFile.name,
        creatorAddress: params.creatorAddress,
        blockHash: params.blockHash,
        timestamp: Date.now()
      };
      console.log('Content ID components:', contentIdComponents);
      const contentId = this.generateContentId(contentIdComponents);
      console.log('Generated content ID:', contentId);

      // Create holder script
      console.log('Step 6: Creating holder script');
      let holderScript: Script;
      try {
        holderScript = this.createInitialHolderScript(
          params.creatorAddress,
          params.videoFile.name,
          contentId
        );
        console.log('Holder script created successfully');
      } catch (error) {
        console.error('Failed to create holder script:', error);
        throw new BSVError('INSCRIPTION_ERROR', `Failed to create holder script: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Create inscription ID
      console.log('Step 7: Creating inscription ID');
      const tempInscriptionId = crypto.createHash('sha256')
        .update(params.videoFile.buffer)
        .digest('hex');
      console.log('Generated inscription ID:', tempInscriptionId);

      // Prepare video chunks
      console.log('Step 8: Preparing video chunks');
      let chunks: VideoChunk[];
      try {
        chunks = this.prepareVideoChunks(params.videoFile.buffer);
        console.log('Video chunks prepared:', {
          numberOfChunks: chunks.length,
          totalSize: params.videoFile.size,
          firstChunkSize: chunks[0].data.length
        });
      } catch (error) {
        console.error('Failed to prepare video chunks:', error);
        throw new BSVError('INSCRIPTION_ERROR', `Failed to prepare video chunks: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Create content structure
      console.log('Step 9: Creating content structure');
      let content: InscriptionContent;
      try {
        content = {
          type: this.validateVideoFormat(params.videoFile.type),
          data: chunks.length > 1 ? chunks : params.videoFile.buffer,
          size: params.videoFile.size,
          duration: params.metadata.duration,
          width: params.metadata.dimensions.width,
          height: params.metadata.dimensions.height,
          chunks: chunks.length > 1 ? {
            total: chunks.length,
            size: MAX_CHUNK_SIZE,
            references: []
          } : undefined
        };
        console.log('Content structure created successfully');
      } catch (error) {
        console.error('Failed to create content structure:', error);
        throw new BSVError('INSCRIPTION_ERROR', `Failed to create content structure: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Create metadata
      console.log('Step 10: Creating inscription metadata');
      const inscriptionMetadata: InscriptionMetadata = {
        type: 'memepool',
        version: '1.0',
        content: {
          type: params.videoFile.type,
          size: params.videoFile.size,
          duration: params.metadata.duration,
          width: params.metadata.dimensions.width,
          height: params.metadata.dimensions.height
        },
        metadata: {
          title: params.videoFile.name,
          creator: params.creatorAddress,
          createdAt: Date.now(),
          attributes: {
            blockHash: params.blockHash,
            bitrate: params.metadata.bitrate,
            format: params.videoFile.type,
            dimensions: `${params.metadata.dimensions.width}x${params.metadata.dimensions.height}`
          }
        }
      };
      console.log('Inscription metadata created successfully');

      console.log('Step 11: Returning final result');
      return { 
        content, 
        metadata: inscriptionMetadata,
        holderScript,
        inscriptionId: tempInscriptionId
      };
    } catch (error) {
      console.error('Failed to create inscription data:', error);
      if (error instanceof BSVError) {
        throw error;
      }
      throw new BSVError('INSCRIPTION_ERROR', 'Failed to create inscription data: ' + (error instanceof Error ? error.message : String(error)));
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
    const { videoFile, metadata } = params;

    if (!videoFile || !videoFile.buffer || !videoFile.type) {
      throw new BSVError('INSCRIPTION_ERROR', 'Invalid file parameter');
    }

    // Validate video format
    try {
      this.validateVideoFormat(videoFile.type);
    } catch (error) {
      throw new BSVError('INSCRIPTION_ERROR', 'Invalid video format');
    }

    if (!metadata || !metadata.duration || !metadata.dimensions) {
      throw new BSVError('INSCRIPTION_ERROR', 'Invalid metadata');
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
    };

    try {
      // Check required fields
      if (!inscription.txid || typeof inscription.txid !== 'string' || !/^[0-9a-f]{64}$/i.test(inscription.txid)) {
        validation.errors.push('Missing or invalid transaction ID');
      }

      // Check content
      if (!inscription.content) {
        validation.errors.push('Missing content');
        validation.isValid = false;
        return validation;
      }

      // Check content type
      const supportedFormats: InscriptionContentType[] = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!supportedFormats.includes(inscription.content.type)) {
        validation.errors.push('Invalid content type');
      }

      // Check location and script
      if (!inscription.location || !inscription.location.script) {
        validation.errors.push('Missing location or script');
      } else {
        // Verify script format (P2PKH + MEME marker)
        const scriptHex = inscription.location.script.toHex();
        const hasP2PKH = /76a914[0-9a-f]{40}88ac/.test(scriptHex);
        const hasMEMEMarker = scriptHex.includes('6a044d454d45');
        
        if (!hasP2PKH || !hasMEMEMarker) {
          validation.errors.push('Invalid inscription holder script format');
        }

        // Verify 1 satoshi value
        if (inscription.location.satoshis !== 1) {
          validation.errors.push('Invalid inscription holder value (must be 1 satoshi)');
        }
      }

      validation.isValid = validation.errors.length === 0;
      return validation;

    } catch (error) {
      validation.isValid = false;
      validation.errors.push('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return validation;
    }
  }

  /**
   * Updates the holder script with the actual transaction ID
   * @param creatorAddress - The creator's address
   * @param txid - The actual transaction ID
   * @returns Updated holder script
   */
  updateHolderScript(creatorAddress: string, txid: string): Script {
    // For updates, we use the txid as both the name and contentId since we're just updating
    // an existing inscription
    return this.createInitialHolderScript(creatorAddress, txid, txid);
  }

  /**
   * Generates a unique content ID for an inscription
   * @param components - The components to use in generating the content ID
   * @returns The generated content ID
   */
  private generateContentId(components: ContentIDComponents): string {
    return `MEME_${crypto.createHash('sha256')
      .update(components.videoName + components.creatorAddress + components.blockHash)
      .digest('hex')}_${components.timestamp}`;
  }
} 