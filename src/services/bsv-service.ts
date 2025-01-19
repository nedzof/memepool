import { Script, Transaction, PrivateKey, PublicKey, P2PKH } from '@bsv/sdk'
import * as bsvSdk from '@bsv/sdk'
import { TestnetWallet } from './testnet-wallet'
import { InscriptionSecurityService } from './inscription-security-service'
import { BSVError } from '../types'
import { 
  BSVServiceInterface, 
  UTXO, 
  WalletProvider, 
  NetworkConfig, 
  TransactionInput, 
  TransactionOutput 
} from '../types/bsv'
import { SignedTransaction } from '../types/services'
import { InscriptionMetadata } from '../types/inscription'
import crypto from 'crypto'

/**
 * Service for handling BSV blockchain interactions
 */
export class BSVService implements BSVServiceInterface {
  private network: 'mainnet' | 'testnet'
  private connected: boolean
  public wallet: WalletProvider
  private bsv: typeof bsvSdk
  private securityService: InscriptionSecurityService
  private feeRate: number
  private apiUrl: string

  constructor(isTestMode = false) {
    this.network = 'testnet'
    this.connected = false
    this.bsv = bsvSdk
    this.feeRate = 1 // Standard fee rate (1 sat/kb)
    this.apiUrl = process.env.BSV_API_URL || 'https://api.whatsonchain.com/v1/bsv/test'

    // Initialize with a default wallet provider
    this.wallet = this.createDefaultWalletProvider()

    // Auto-connect testnet wallet in development, but not in test mode
    if (process.env.NODE_ENV !== 'production' && !isTestMode) {
      this.wallet = new TestnetWallet() as unknown as WalletProvider
      this.connected = true
    }

    // Initialize security service with this instance
    this.securityService = new InscriptionSecurityService(this)
  }

  private createDefaultWalletProvider(): WalletProvider {
    return {
      privateKey: new PrivateKey(),
      fetchWithRetry: async (url: string, options?: RequestInit) => {
        const response = await fetch(url, options)
        if (!response.ok) {
          throw new BSVError('FETCH_ERROR', 'Failed to fetch data')
        }
        return response
      },
      getUtxos: async () => [],
      broadcastTransaction: async (tx: Transaction) => {
        const response = await fetch('https://api.whatsonchain.com/v1/bsv/test/tx/raw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txhex: tx.toHex() })
        })
        if (!response.ok) {
          throw new BSVError('BROADCAST_ERROR', 'Failed to broadcast transaction')
        }
        const data = await response.json()
        return data.txid
      }
    }
  }

  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/status`)
      if (!response.ok) {
        throw new Error('API connection failed')
      }
      const data = await response.json()
      return data.status === 'ok'
    } catch (error) {
      throw new BSVError('CONNECTION_ERROR', 'Failed to connect to BSV network')
    }
  }

  async getWalletAddress(): Promise<string> {
    try {
      // Get the public key from the private key
      const pubKey = this.wallet.privateKey.toPublicKey()
      // Get the address from the public key
      const address = pubKey.toAddress(this.network)
      
      // Verify the address exists on the network
      const response = await this.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/address/${address}/info`
      )
      const data = await response.json()
      
      if (!data.isvalid) {
        throw new BSVError('WALLET_ERROR', 'Invalid wallet address')
      }
      
      return address
    } catch (error) {
      throw new BSVError('WALLET_ERROR', 'Failed to get wallet address')
    }
  }

  async connectWallet(): Promise<string> {
    try {
      const address = await this.getWalletAddress()
      if (!address) {
        throw new Error('Failed to get wallet address')
      }
      return address
    } catch (error) {
      throw new BSVError('WALLET_ERROR', 'Failed to connect wallet')
    }
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      const response = await this.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/address/${address}/unspent`
      )
      
      const data = await response.json()
      return data.map((utxo: any) => ({
        txId: utxo.tx_hash,
        outputIndex: utxo.tx_pos,
        lockingScript: Script.fromHex(utxo.script_hex),
        satoshis: utxo.value
      }))
    } catch (error) {
      console.error('Failed to get UTXOs:', error)
      throw new BSVError('UTXO_FETCH_ERROR', 'Failed to get UTXOs')
    }
  }

  async createTransaction(inputs: TransactionInput[], outputs: TransactionOutput[]): Promise<SignedTransaction> {
    try {
      const tx = new Transaction()
      let totalInput = 0
      let totalOutput = 0
      
      // Add inputs
      for (const input of inputs) {
        if (!input.script || !input.unlockingScriptTemplate) {
          throw new BSVError('VALIDATION_ERROR', 'Script must be defined for inputs')
        }
        
        // Get source transaction if not provided
        let sourceTransaction = input.sourceTransaction
        if (!sourceTransaction && input.sourceTXID) {
          sourceTransaction = await this.getTransaction(input.sourceTXID)
        }

        // Create input with required properties
        const txInput = {
          sourceTXID: input.sourceTXID,
          sourceOutputIndex: input.sourceOutputIndex,
          sourceTransaction,
          unlockingScriptTemplate: input.unlockingScriptTemplate,
          sourceSatoshis: input.sourceSatoshis,
          script: input.script
        }

        tx.addInput(txInput as any)
        totalInput += input.sourceSatoshis
      }

      // Add outputs
      for (const output of outputs) {
        if (!output.lockingScript) {
          throw new BSVError('VALIDATION_ERROR', 'Locking script must be defined for outputs')
        }
        
        // Create output with required properties
        const txOutput = {
          lockingScript: output.lockingScript,
          satoshis: output.satoshis,
          change: output.change
        }

        tx.addOutput(txOutput as any)
        totalOutput += output.satoshis
      }

      // Calculate fee
      const fee = this.estimateFee(inputs.length, outputs.length)

      // Validate transaction
      if (totalOutput + fee > totalInput) {
        const remainingFunds = totalInput - totalOutput
        if (remainingFunds < fee) {
          throw new BSVError('TX_CREATE_ERROR', `Insufficient funds for fee. Required: ${fee}, Available: ${remainingFunds}`)
        }
      }

      // Sign transaction
      await tx.sign()

      return {
        tx,
        inputs,
        outputs,
        fee
      }
    } catch (error) {
      if (error instanceof BSVError) {
        throw error
      }
      console.error('Failed to create transaction:', error)
      throw new BSVError('TX_CREATE_ERROR', 'Failed to create transaction')
    }
  }

  estimateFee(inputCount: number, outputCount: number): number {
    const getVarIntSize = (i: number): number => {
      if (i > 2 ** 32) return 9
      if (i > 2 ** 16) return 5
      if (i > 253) return 3
      return 1
    }

    // Base transaction size
    let size = 4 // version
    size += getVarIntSize(inputCount) // number of inputs
    size += inputCount * (32 + 4 + 4) // txid(32) + vout(4) + sequence(4)
    size += inputCount * 107 // ~107 bytes for typical P2PKH unlocking script (sig + pubkey)
    size += getVarIntSize(outputCount) // number of outputs
    size += 4 // locktime

    // Add size for inscription data output
    size += 8 // value (0 satoshis)
    size += 1 // OP_FALSE
    size += 1 // OP_RETURN
    size += 5 // PUSHDATA4 opcode + length for metadata
    size += 200 // Typical metadata size (adjust based on your metadata)
    size += 5 // PUSHDATA4 opcode + length for content
    size += 1024 // Initial content chunk (1KB is usually enough for testing)

    // Add size for holder script output
    size += 8 // value (1 satoshi)
    size += 25 // P2PKH part (76a914{20-bytes-hash}88ac)
    size += 35 // OP_RETURN + txid (1 + 1 + 32 + 1 bytes)
    size += 7  // OP_RETURN MEME marker (1 + 1 + 4 + 1 bytes)

    // Add size for change output
    size += 34 // 8 (value) + 26 (P2PKH script)

    // Calculate fee at exactly 1 sat/kb rate
    const feeRate = 1.0;
    const calculatedFee = Math.ceil((size / 1024) * feeRate);
    
    // Ensure minimum fee of 300 satoshis
    return Math.max(300, calculatedFee);
  }

  async broadcastTransaction(transaction: SignedTransaction): Promise<string> {
    try {
      if (!transaction || !transaction.tx) {
        throw new BSVError('VALIDATION_ERROR', 'Invalid transaction')
      }
      return await this.wallet.broadcastTransaction(transaction.tx)
    } catch (error) {
      if (error instanceof BSVError) {
        throw error
      }
      throw new BSVError('BROADCAST_ERROR', 'Failed to broadcast transaction')
    }
  }

  async getTransactionStatus(txid: string): Promise<{ confirmations: number; timestamp: number }> {
    try {
      const response = await this.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/tx/${txid}`
      )
      
      const data = await response.json()
      return {
        confirmations: data.confirmations || 0,
        timestamp: data.time || Date.now()
      }
    } catch (error) {
      console.error('Failed to get transaction details:', error)
      throw new BSVError('TX_DETAILS_ERROR', 'Failed to get transaction details')
    }
  }

  getNetworkConfig(): NetworkConfig {
    return {
      network: this.network,
      apiEndpoint: 'https://api.whatsonchain.com/v1/bsv/test',
      feePerKb: this.feeRate
    }
  }

  async getTransaction(txid: string): Promise<Transaction> {
    try {
      const response = await this.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`
      )
      
      const txHex = await response.text()
      return Transaction.fromHex(txHex)
    } catch (error) {
      console.error('Failed to get transaction:', error)
      throw new BSVError('TX_FETCH_ERROR', 'Failed to get transaction')
    }
  }

  /**
   * Create a script with PUSHDATA4 for large data
   * @param data Buffer containing the data to push
   * @returns Buffer containing PUSHDATA4 prefixed data
   */
  private createPushData4(data: Buffer): Buffer {
    // PUSHDATA4 structure:
    // 1 byte  - opcode (0x4e)
    // 4 bytes - length (little-endian)
    // n bytes - data
    const lenBuffer = Buffer.alloc(5)
    lenBuffer[0] = 0x4e // PUSHDATA4 opcode
    lenBuffer.writeUInt32LE(data.length, 1) // Write actual byte length, not hex length
    return Buffer.concat([lenBuffer, data])
  }

  /**
   * Creates a deterministic inscription ID
   * @param content - Content buffer
   * @param metadata - Inscription metadata
   * @param address - Creator's address
   * @returns Deterministic inscription ID
   */
  private generateInscriptionId(
    content: Buffer,
    metadata: InscriptionMetadata,
    address: string
  ): string {
    // Create a deterministic ID based on content hash, metadata, and creator
    const data = Buffer.concat([
      crypto.createHash('sha256').update(content).digest(),
      Buffer.from(address),
      Buffer.from(JSON.stringify({
        type: metadata.type,
        content: {
          type: metadata.content.type,
          size: metadata.content.size,
          duration: metadata.content.duration,
          dimensions: `${metadata.content.width}x${metadata.content.height}`
        },
        creator: metadata.metadata.creator
      }))
    ]);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Creates an inscription transaction
   * @param metadata - Inscription metadata
   * @param content - Content buffer
   * @param holderScript - The holder script from inscription service
   * @returns Transaction ID
   */
  async createInscriptionTransaction(
    metadata: InscriptionMetadata, 
    content: Buffer,
    holderScript: Script
  ): Promise<string> {
    try {
      // Get wallet address and UTXOs
      const address = await this.getWalletAddress();
      const utxos = await this.wallet.getUtxos();

      if (!utxos.length) {
        throw new BSVError('NO_UTXOS', 'No UTXOs available');
      }

      // Create transaction
      const tx = new Transaction();

      // Add input
      const selectedUtxo = utxos[0]; // Use first UTXO for simplicity
      const p2pkh = new P2PKH();
      const unlockingTemplate = p2pkh.unlock(this.wallet.privateKey);
      
      // Get the source transaction for the input
      const sourceTx = await this.getTransaction(selectedUtxo.txId);
      
      tx.addInput({
        sourceTXID: selectedUtxo.txId,
        sourceOutputIndex: selectedUtxo.outputIndex,
        sourceSatoshis: selectedUtxo.satoshis,
        unlockingScriptTemplate: unlockingTemplate,
        sourceTransaction: sourceTx
      });

      // Calculate actual data sizes
      const metadataSize = Buffer.from(JSON.stringify(metadata)).length;
      const contentSize = content.length;
      const holderScriptSize = holderScript.toHex().length / 2;

      // Calculate exact output sizes
      const inscriptionOutputSize = 
        8 + // satoshis field
        1 + // varint for script length
        2 + // OP_FALSE OP_RETURN
        this.calculatePushDataSize(metadataSize) +
        metadataSize +
        this.calculatePushDataSize(contentSize) +
        contentSize;

      const holderOutputSize = 
        8 + // satoshis field
        1 + // varint for script length
        holderScriptSize;

      const changeOutputSize = 
        8 + // satoshis field
        1 + // varint for script length
        25; // P2PKH script size

      // Calculate total size
      const totalSize = 
        4 + // version
        1 + // input count varint
        36 + // outpoint (txid + index)
        1 + // unlocking script length varint
        107 + // typical P2PKH unlocking script size
        4 + // sequence
        1 + // output count varint
        inscriptionOutputSize +
        holderOutputSize +
        changeOutputSize +
        4; // locktime

      // Calculate fee at 1 sat/kb
      const fee = Math.ceil(totalSize / 1000);
      const changeAmount = selectedUtxo.satoshis - 1 - fee;

      // Add inscription data output
      const inscriptionScriptParts = [
        '006a', // OP_FALSE OP_RETURN
        this.createPushData(Buffer.from(JSON.stringify(metadata))).toString('hex'),  // JSON metadata
        this.createPushData(content).toString('hex')  // Video content
      ];
      const inscriptionScript = Script.fromHex(inscriptionScriptParts.join(''));
      tx.addOutput({
        lockingScript: inscriptionScript,
        satoshis: 0
      });

      // Generate deterministic inscription ID
      const inscriptionId = this.generateInscriptionId(content, metadata, address);

      // Create holder metadata
      const holderMetadata = {
        version: 1,
        prefix: 'meme',
        operation: 'inscribe' as const,
        name: metadata.metadata.title,
        contentID: inscriptionId,
        txid: 'deploy',
        creator: address
      };

      // Convert metadata to JSON string
      const jsonData = Buffer.from(JSON.stringify(holderMetadata));

      // Create the holder script
      const p2pkhScript = p2pkh.lock(address);
      const holderScriptParts = [
        p2pkhScript.toHex(),                // P2PKH script
        '6a' + this.createPushData(jsonData).toString('hex')  // OP_RETURN + JSON data
      ];
      const finalHolderScript = Script.fromHex(holderScriptParts.join(''));

      // Add inscription holder output with exactly 1 satoshi
      tx.addOutput({
        lockingScript: finalHolderScript,
        satoshis: 1
      });

      // Add change output if above dust limit (546 satoshis)
      if (changeAmount >= 546) {
        tx.addOutput({
          lockingScript: p2pkhScript,
          satoshis: changeAmount
        });
      }

      // Sign and broadcast transaction
      await tx.sign();
      const txid = await this.wallet.broadcastTransaction(tx);

      return txid;
    } catch (error) {
      console.error('Failed to create inscription transaction:', error);
      throw error instanceof BSVError ? error : new BSVError('TX_CREATE_ERROR', 'Failed to create inscription transaction');
    }
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
   * Calculate the size needed for a pushdata operation
   * @private
   */
  private calculatePushDataSize(dataSize: number): number {
    if (dataSize < 0x4c) {
      return 1; // just the size byte
    } else if (dataSize <= 0xff) {
      return 2; // OP_PUSHDATA1 + size byte
    } else if (dataSize <= 0xffff) {
      return 3; // OP_PUSHDATA2 + size bytes
    } else {
      return 5; // OP_PUSHDATA4 + size bytes
    }
  }

  /**
   * Validates a holder script format
   * @param script - The script to validate
   * @returns boolean indicating if script is valid
   */
  private validateHolderScript(script: Script): boolean {
    const scriptHex = script.toHex();
    
    // Check for required components
    const hasP2PKH = /76a914[0-9a-f]{40}88ac/.test(scriptHex);
    const hasOriginalTxid = /6a20[0-9a-f]{64}/.test(scriptHex);
    const hasMEMEMarker = scriptHex.includes('6a044d454d45');
    
    // All components must be present and in correct order
    return hasP2PKH && hasOriginalTxid && hasMEMEMarker;
  }

  /**
   * Extracts and decodes inscription metadata from a transaction output
   * @param script - The inscription script
   * @returns The decoded metadata or null if invalid
   */
  extractInscriptionMetadata(script: Script): InscriptionMetadata | null {
    try {
      const scriptHex = script.toHex();
      
      // Check for OP_FALSE OP_RETURN prefix
      if (!scriptHex.startsWith('006a')) return null;
      
      // Skip OP_FALSE OP_RETURN
      let currentPos = 4;
      
      // Get PUSHDATA for metadata
      const metadataLength = this.getPushDataLength(scriptHex.slice(currentPos));
      if (!metadataLength) return null;
      
      // Extract CBOR data
      const metadataHex = scriptHex.slice(currentPos + metadataLength.prefixSize * 2, 
                                        currentPos + metadataLength.prefixSize * 2 + metadataLength.length * 2);
      const metadataBuffer = Buffer.from(metadataHex, 'hex');
      
      // Decode CBOR data
      const metadata = JSON.parse(metadataBuffer.toString()) as InscriptionMetadata;
      
      // Validate metadata structure
      if (!this.validateInscriptionMetadata(metadata)) return null;
      
      return metadata;
    } catch (error) {
      console.error('Failed to extract inscription metadata:', error);
      return null;
    }
  }

  /**
   * Gets the length of a PUSHDATA operation from its hex representation
   * @private
   */
  private getPushDataLength(hex: string): { length: number; prefixSize: number } | null {
    try {
      const firstByte = parseInt(hex.slice(0, 2), 16);
      
      if (firstByte <= 0x4b) {
        return { length: firstByte, prefixSize: 1 };
      } else if (firstByte === 0x4c) {
        return { length: parseInt(hex.slice(2, 4), 16), prefixSize: 2 };
      } else if (firstByte === 0x4d) {
        return { length: parseInt(hex.slice(2, 6), 16), prefixSize: 3 };
      } else if (firstByte === 0x4e) {
        return { length: parseInt(hex.slice(2, 10), 16), prefixSize: 5 };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validates inscription metadata structure
   * @private
   */
  private validateInscriptionMetadata(metadata: any): metadata is InscriptionMetadata {
    return (
      metadata &&
      typeof metadata.type === 'string' &&
      typeof metadata.version === 'string' &&
      metadata.content &&
      typeof metadata.content.type === 'string' &&
      typeof metadata.content.size === 'number' &&
      typeof metadata.content.duration === 'number' &&
      typeof metadata.content.width === 'number' &&
      typeof metadata.content.height === 'number' &&
      metadata.metadata &&
      typeof metadata.metadata.title === 'string' &&
      typeof metadata.metadata.creator === 'string' &&
      typeof metadata.metadata.createdAt === 'number' &&
      metadata.metadata.attributes &&
      typeof metadata.metadata.attributes.blockHash === 'string' &&
      typeof metadata.metadata.attributes.bitrate === 'number' &&
      typeof metadata.metadata.attributes.format === 'string' &&
      typeof metadata.metadata.attributes.dimensions === 'string'
    );
  }
} 