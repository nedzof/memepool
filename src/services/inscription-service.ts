import { bsv, Utils, toByteString, hash160, SmartContract } from 'scrypt-ts'
import { BSVError } from '../types'
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
  ContentIDComponents,
  ChunkMetadata
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
   * @param name - The name of the video
   * @param contentId - The unique content ID
   * @returns Script object
   */
  createInitialHolderScript(address: string, name: string, contentId: string): bsv.Script {
    try {
      // Create P2PKH script using sCrypt's Utils
      console.log('Creating P2PKH script with:', { address, name, contentId });
      const pubKeyHash = hash160(toByteString(address))
      const p2pkhScript = Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(1))
      console.log('P2PKH script created:', p2pkhScript);
      
      // Create holder metadata
      const metadata: HolderMetadata = {
        version: 1,
        prefix: 'meme',
        operation: 'inscribe',
        contentId,
        timestamp: Math.floor(Date.now() / 1000),
        creator: address
      };
      console.log('Created holder metadata:', metadata);

      // Convert metadata to JSON string and then to Buffer
      const jsonData = Buffer.from(JSON.stringify(metadata));
      console.log('JSON data length:', jsonData.length);
      console.log('JSON data hex:', jsonData.toString('hex'));
      
      // Create combined script with metadata in OP_IF and P2PKH
      const scriptParts = [
        '00', // OP_FALSE
        '63', // OP_IF
        this.createPushData(jsonData).toString('hex'),
        '68', // OP_ENDIF
        p2pkhScript
      ];
      
      return new bsv.Script(scriptParts.join(''));
    } catch (error) {
      console.error('Failed to create holder script:', error);
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
  createTransferHolderScript(toAddress: string, originalMetadata: HolderMetadata, originalTxId: string): bsv.Script {
    // Create P2PKH script for new owner using sCrypt's Utils
    const pubKeyHash = hash160(toByteString(toAddress))
    const p2pkhScript = Utils.buildPublicKeyHashOutput(pubKeyHash, BigInt(1))
    
    // Create transfer metadata
    const metadata: HolderMetadata = {
      version: originalMetadata.version,
      prefix: originalMetadata.prefix,
      operation: 'transfer',
      contentId: originalMetadata.contentId,
      timestamp: Math.floor(Date.now() / 1000),
      creator: originalMetadata.creator,
      previousOwner: originalMetadata.creator
    };

    // Convert metadata to JSON string and then to Buffer
    const jsonData = Buffer.from(JSON.stringify(metadata));
    
    // Create combined script parts
    const scriptParts = [
      p2pkhScript,                // P2PKH script
      '6a' + this.createPushData(jsonData).toString('hex')  // OP_RETURN + JSON data
    ];
    
    return new bsv.Script(scriptParts.join(''));
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
  extractHolderMetadata(script: bsv.Script): HolderMetadata | null {
    try {
      const scriptHex = script.toHex();
      
      // Check for OP_FALSE OP_IF structure
      if (!scriptHex.startsWith('0063')) {
        return null;
      }
      
      // Find OP_ENDIF and P2PKH script
      const opEndifIndex = scriptHex.indexOf('68');
      if (opEndifIndex === -1) {
        return null;
      }
      
      // Extract JSON data between OP_IF and OP_ENDIF
      const jsonHex = scriptHex.slice(4, opEndifIndex);
      const jsonBuffer = Buffer.from(jsonHex, 'hex');
      
      // Parse JSON data
      const metadata = JSON.parse(jsonBuffer.toString()) as HolderMetadata;
      
      // Validate metadata structure
      if (!this.validateHolderMetadata(metadata)) {
        return null;
      }
      
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
      typeof metadata.version === 'number' &&
      metadata.prefix === 'meme' &&
      (metadata.operation === 'inscribe' || metadata.operation === 'transfer') &&
      typeof metadata.contentId === 'string' &&
      typeof metadata.timestamp === 'number' &&
      typeof metadata.creator === 'string'
    );
  }

  /**
   * Validates the holder script format
   * @param script - The script to validate
   * @returns boolean indicating if script is valid
   */
  private validateHolderScript(script: bsv.Script): boolean {
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
    
    // Check for OP_FALSE OP_IF structure
    const hasOpIf = scriptHex.startsWith('0063') && scriptHex.includes('68');
    console.log('Has OP_IF structure:', hasOpIf);
    
    // Check if metadata is valid
    const isValidMetadata = this.validateHolderMetadata(metadata);
    console.log('Metadata validation result:', isValidMetadata);
    
    const isValid = hasP2PKH && hasOpIf && isValidMetadata;
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
    holderScript: bsv.Script;
    inscriptionId: string;
  }> {
    try {
      console.log('Step 1: Starting inscription data creation');
      console.log('Input params:', {
        videoName: params.videoFile.name,
        videoSize: params.videoFile.size,
        videoType: params.videoFile.type,
        creatorAddress: params.creatorAddress
      });

      // Generate unique content ID
      console.log('Step 2: Generating content ID');
      const contentId = await this.generateContentId({
        videoName: params.videoFile.name,
        creatorAddress: params.creatorAddress,
        blockHash: params.blockHash,
        timestamp: Date.now()
      });
      console.log('Generated content ID:', contentId);

      // Create video content chunks if needed
      console.log('Step 3: Processing video content');
      let videoContent: Buffer | VideoChunk[];
      let chunkMetadata: ChunkMetadata | undefined;

      if (params.videoFile.size > MAX_CHUNK_SIZE) {
        console.log('Video size exceeds chunk limit, creating chunks...');
        const chunks = await this.createVideoChunks(params.videoFile.buffer);
        videoContent = chunks;
        chunkMetadata = {
          total: chunks.length,
          size: params.videoFile.size,
          references: []
        };
        console.log('Created video chunks:', {
          count: chunks.length,
          totalSize: params.videoFile.size
        });
      } else {
        console.log('Video within size limit, using direct content');
        videoContent = params.videoFile.buffer;
      }

      // Create inscription content
      console.log('Step 4: Creating inscription content');
      const content: InscriptionContent = {
        type: params.videoFile.type as InscriptionContentType,
        data: videoContent,
        size: params.videoFile.size,
        duration: params.metadata.duration,
        width: params.metadata.dimensions.width,
        height: params.metadata.dimensions.height,
        chunks: chunkMetadata
      };
      console.log('Created inscription content:', {
        type: content.type,
        size: content.size,
        duration: content.duration,
        dimensions: `${content.width}x${content.height}`,
        hasChunks: !!content.chunks
      });

      // Create inscription metadata
      console.log('Step 5: Creating inscription metadata');
      const metadata: InscriptionMetadata = {
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
      console.log('Created inscription metadata:', metadata);

      // Create holder script
      console.log('Step 6: Creating holder script');
      const holderScript = this.createInitialHolderScript(
        params.creatorAddress,
        params.videoFile.name,
        contentId
      );
      console.log('Created holder script');

      return {
        content,
        metadata,
        holderScript,
        inscriptionId: contentId
      };
    } catch (error) {
      console.error('Failed to create inscription data:', error);
      throw error;
    }
  }

  /**
   * Generates a unique content ID for an inscription
   * @param components - Components to use in generating the ID
   * @returns The generated content ID
   */
  private async generateContentId(components: ContentIDComponents): Promise<string> {
    const { videoName, creatorAddress, blockHash, timestamp } = components;
    
    // Create a string combining all components
    const baseString = `${videoName}|${creatorAddress}|${blockHash}|${timestamp}`;
    
    // Create SHA-256 hash
    const hash = crypto.createHash('sha256');
    hash.update(baseString);
    
    // Return first 16 bytes of hash as hex
    return hash.digest('hex').slice(0, 32);
  }

  /**
   * Creates video chunks for large files
   * @param videoBuffer - The video file buffer
   * @returns Array of video chunks
   */
  private async createVideoChunks(videoBuffer: Buffer): Promise<VideoChunk[]> {
    const chunks: VideoChunk[] = [];
    const totalChunks = Math.ceil(videoBuffer.length / MAX_CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * MAX_CHUNK_SIZE;
      const end = Math.min(start + MAX_CHUNK_SIZE, videoBuffer.length);
      const chunkData = videoBuffer.slice(start, end);
      
      // Create checksum for chunk
      const hash = crypto.createHash('sha256');
      hash.update(chunkData);
      const checksum = hash.digest('hex');
      
      chunks.push({
        sequenceNumber: i + 1,
        totalChunks,
        data: chunkData,
        checksum,
        previousChunkTxid: i > 0 ? undefined : undefined // Will be set during inscription
      });
    }
    
    return chunks;
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
        // Verify script format (P2PKH + OP_RETURN with JSON metadata)
        const scriptHex = inscription.location.script.toHex();
        
        // Check for P2PKH script
        const hasP2PKH = /76a914[0-9a-f]{40}88ac/.test(scriptHex);
        if (!hasP2PKH) {
          validation.errors.push('Invalid P2PKH script format');
        }

        // Check for OP_RETURN with JSON metadata
        const hasOpReturn = scriptHex.includes('6a');
        if (!hasOpReturn) {
          validation.errors.push('Missing OP_RETURN data');
        }

        // Try to extract and validate metadata
        const metadata = this.extractHolderMetadata(inscription.location.script);
        if (!metadata) {
          validation.errors.push('Invalid metadata format');
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
  updateHolderScript(creatorAddress: string, txid: string): bsv.Script {
    // For updates, we use the txid as both the name and contentId since we're just updating
    // an existing inscription
    return this.createInitialHolderScript(creatorAddress, txid, txid);
  }
} 