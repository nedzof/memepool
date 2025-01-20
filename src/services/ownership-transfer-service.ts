import { BSVService } from './bsv-service';
import { TransactionVerificationService } from './transaction-verification-service';
import { InscriptionSecurityService } from './inscription-security-service';
import { Script, Transaction } from '@bsv/sdk';
import { BSVError } from '../types';
import { BSVServiceInterface, UTXO, TransactionOutput } from '../types/bsv';
import { InscriptionHolder } from '../contracts/inscription-holder';
import { bsv, ByteString, PubKey, Sig } from 'scrypt-ts';
import { createHash } from 'crypto';
import { HolderMetadata } from '../types/inscription';

interface TransferOptions {
  value?: number;
  preserveScript?: boolean;
  utxoData?: Record<string, any>;
  originalInscriptionId?: string;
}

interface TransferStatus {
  confirmed: boolean;
  confirmations: number;
  timestamp: number;
  complete: boolean;
}

/**
 * Service for handling ownership transfers of inscriptions
 */
export class OwnershipTransferService {
  private bsvService: BSVServiceInterface;
  private verificationService: TransactionVerificationService;
  private securityService: InscriptionSecurityService;

  constructor(
    bsvService: BSVService,
    verificationService?: TransactionVerificationService,
    securityService?: InscriptionSecurityService
  ) {
    this.bsvService = bsvService;
    this.verificationService = verificationService || new TransactionVerificationService(bsvService);
    this.securityService = securityService || new InscriptionSecurityService(bsvService, this.verificationService);
  }

  /**
   * Create a transfer transaction
   */
  async createTransferTransaction(
    inscriptionTxId: string,
    recipientAddress: string,
    options: TransferOptions = {}
  ): Promise<string> {
    try {
      // Get the inscription UTXO
      const utxo = await this.bsvService.getUTXO(inscriptionTxId);
      if (!utxo) {
        throw new BSVError('UTXO_ERROR', 'Inscription UTXO not found');
      }

      // Load and verify the contract instance
      const contract = InscriptionHolder.fromTx(utxo.tx);
      
      // Get recipient's public key from address
      const recipientPubKey = bsv.PublicKey.fromString(recipientAddress);

      // Create signature for transfer
      const currentPrivateKey = await this.bsvService.getPrivateKey();
      const tx = new Transaction();
      tx.addInput({
        sourceTXID: inscriptionTxId,
        sourceOutputIndex: utxo.outputIndex,
        sourceSatoshis: utxo.satoshis,
        sourceTransaction: utxo.tx
      });

      // Add contract output
      tx.addOutput({
        lockingScript: contract.lockingScript,
        satoshis: utxo.satoshis
      });

      // Sign the transaction
      const sigBuf = currentPrivateKey.sign(tx.getSignaturePreimage(0, contract.lockingScript, utxo.satoshis, 0x41));

      // Call contract transfer method with raw bytes
      await contract.methods.transfer(
        recipientPubKey.toBuffer(),
        sigBuf
      );

      // Broadcast transaction
      const txid = await this.bsvService.broadcastTx(tx);

      return txid;
    } catch (error) {
      console.error('Transfer transaction creation failed:', error);
      throw error;
    }
  }

  private validateInscriptionScript(scriptHex: string): boolean {
    // Check for standard inscription format
    const isInscription = scriptHex.startsWith('0063') && 
                         scriptHex.includes('68') && 
                         scriptHex.includes('76a914');
    
    // Check for P2PKH format that can be converted
    const isP2PKH = scriptHex.startsWith('76a914') && scriptHex.endsWith('88ac');
    
    return isInscription || isP2PKH;
  }

  private createPushData(data: Buffer): Buffer {
    if (data.length <= 0x4b) {
      const lenBuffer = Buffer.alloc(1);
      lenBuffer.writeUInt8(data.length);
      return Buffer.concat([lenBuffer, data]);
    } else if (data.length <= 0xff) {
      const lenBuffer = Buffer.alloc(2);
      lenBuffer[0] = 0x4c;
      lenBuffer[1] = data.length;
      return Buffer.concat([lenBuffer, data]);
    } else if (data.length <= 0xffff) {
      const lenBuffer = Buffer.alloc(3);
      lenBuffer[0] = 0x4d;
      lenBuffer.writeUInt16LE(data.length, 1);
      return Buffer.concat([lenBuffer, data]);
    } else {
      const lenBuffer = Buffer.alloc(5);
      lenBuffer[0] = 0x4e;
      lenBuffer.writeUInt32LE(data.length, 1);
      return Buffer.concat([lenBuffer, data]);
    }
  }

  /**
   * Fetch source transaction with retry logic
   * @private
   */
  private async fetchSourceTransaction(txid: string): Promise<Transaction> {
    try {
      // First try to get the raw transaction hex
      const hexResponse = await this.bsvService.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`
      );
      const txHex = await hexResponse.text();

      // Create transaction from hex
      const tx = Transaction.fromHex(txHex);

      // Also get the full transaction data for verification
      const dataResponse = await this.bsvService.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/tx/${txid}`
      );
      const txData = await dataResponse.json();

      // Verify and enhance outputs with script data from API
      tx.outputs = tx.outputs.map((output: TransactionOutput, index: number) => {
        const outputData = txData.vout[index];
        if (!outputData) {
          throw new BSVError('INVALID_TRANSACTION', `Missing output data for index ${index}`);
        }

        // Create script from hex if available
        if (outputData.scriptPubKey?.hex) {
          output.lockingScript = Script.fromHex(outputData.scriptPubKey.hex);
        }

        return output;
      });

      return tx;
    } catch (error) {
      console.error('Failed to fetch source transaction:', error);
      throw new BSVError('FETCH_ERROR', 'Failed to fetch source transaction');
    }
  }

  /**
   * Extract original inscription ID from holder script
   * @private
   */
  private extractOriginalInscriptionId(scriptHex: string): string | undefined {
    const match = scriptHex.match(/6a20([0-9a-f]{64})/);
    return match ? match[1] : undefined;
  }

  /**
   * Verify transfer completion
   */
  async verifyTransfer(transferTxId: string, recipientAddress: string): Promise<boolean> {
    try {
      // Check transaction confirmations
      const status = await this.bsvService.getTransactionStatus(transferTxId);
      if (!status || status.confirmations < this.securityService.minConfirmations) {
        return false;
      }

      // Verify recipient ownership
      return await this.verificationService.validateOwnership(recipientAddress, transferTxId);
    } catch (error) {
      console.error('Failed to verify transfer:', error);
      return false;
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferTxId: string): Promise<TransferStatus> {
    try {
      const status = await this.bsvService.getTransactionStatus(transferTxId);
      if (!status) {
        throw new BSVError('STATUS_ERROR', 'Failed to get transaction status');
      }

      return {
        confirmed: status.confirmations >= this.securityService.minConfirmations,
        confirmations: status.confirmations,
        timestamp: status.timestamp,
        complete: status.confirmations >= this.securityService.minConfirmations
      };
    } catch (error) {
      console.error('Failed to get transfer status:', error);
      throw error instanceof BSVError ? error : new BSVError('STATUS_ERROR', 'Failed to get transfer status');
    }
  }

  private async extractHolderMetadata(scriptHex: string): Promise<HolderMetadata | null> {
    try {
      // Handle P2PKH format
      if (scriptHex.startsWith('76a914') && scriptHex.endsWith('88ac')) {
        // Extract pubKeyHash from P2PKH script
        const pubKeyHash = scriptHex.slice(6, -4);
        const timestamp = Date.now();
        const contentId = this.extractOriginalInscriptionId(scriptHex) || scriptHex;
        
        // Create initial inscription metadata
        return {
          version: '1',
          prefix: 'meme',
          operation: 'inscribe',
          contentId,
          timestamp,
          creator: this.pubKeyHashToAddress(pubKeyHash)
        };
      }

      // Handle ordinals-like inscription format
      if (!scriptHex.startsWith('0063')) {
        return null;
      }

      // Find OP_ENDIF (68)
      const opEndifPos = scriptHex.indexOf('68', 4);
      if (opEndifPos === -1) {
        return null;
      }

      // Extract metadata between OP_IF and OP_ENDIF
      const metadataHex = scriptHex.slice(4, opEndifPos);
      
      // Handle PUSHDATA prefixes
      let jsonStartIndex = 0;
      let jsonLength = 0;
      
      if (metadataHex.startsWith('4c')) {
        jsonLength = parseInt(metadataHex.slice(2, 4), 16);
        jsonStartIndex = 4;
      } else if (metadataHex.startsWith('4d')) {
        jsonLength = parseInt(metadataHex.slice(2, 6).match(/../g)!.reverse().join(''), 16);
        jsonStartIndex = 6;
      } else if (metadataHex.startsWith('4e')) {
        jsonLength = parseInt(metadataHex.slice(2, 10).match(/../g)!.reverse().join(''), 16);
        jsonStartIndex = 10;
      } else {
        jsonLength = parseInt(metadataHex.slice(0, 2), 16);
        jsonStartIndex = 2;
      }

      const jsonHex = metadataHex.slice(jsonStartIndex, jsonStartIndex + (jsonLength * 2));
      const jsonBuffer = Buffer.from(jsonHex, 'hex');
      
      return JSON.parse(jsonBuffer.toString()) as HolderMetadata;
    } catch (error) {
      console.error('Failed to extract holder metadata:', error);
      return null;
    }
  }

  private pubKeyHashToAddress(pubKeyHash: string): string {
    // For testnet, version byte is 0x6f
    const versionByte = '6f';
    const fullHash = versionByte + pubKeyHash;
    
    // Convert to Buffer for checksum calculation
    const buffer = Buffer.from(fullHash, 'hex');
    
    // Calculate double SHA256 for checksum using Node's crypto
    const hash1 = createHash('sha256').update(buffer).digest();
    const hash2 = createHash('sha256').update(hash1).digest();
    const checksum = hash2.slice(0, 4);
    
    // Combine version, pubkey hash, and checksum
    const final = Buffer.concat([buffer, checksum]);
    
    // Convert to base58
    return this.toBase58(final);
  }

  private toBase58(buffer: Buffer): string {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = BigInt('0x' + buffer.toString('hex'));
    const base = BigInt(58);
    const zero = BigInt(0);
    let result = '';
    
    while (num > zero) {
      const mod = Number(num % base);
      result = ALPHABET[mod] + result;
      num = num / base;
    }
    
    // Add leading zeros
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
      result = '1' + result;
    }
    
    return result;
  }

  private async verifyTransferTransaction(txId: string): Promise<boolean> {
    try {
      const tx = await this.bsvService.getTransaction(txId);
      if (!tx) {
        throw new BSVError('TX_ERROR', 'Transaction not found');
      }

      // Verify contract state in the transaction
      const contract = InscriptionHolder.fromTx(tx);
      return contract !== null;
    } catch (error) {
      console.error('Transfer verification failed:', error);
      return false;
    }
  }

  private createInscriptionScript(metadata: HolderMetadata, address: string): Script {
    // Create P2PKH script for the address
    const p2pkhScript = bsv.Script.buildPublicKeyHashOut(address);
    
    // Convert metadata to buffer
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));
    
    // Create PUSHDATA for metadata
    const pushdataMetadata = this.createPushData(metadataBuffer);
    
    // Combine all parts
    const scriptParts = [
      '00',  // OP_FALSE
      '63',  // OP_IF
      pushdataMetadata.toString('hex'),
      '68',  // OP_ENDIF
      p2pkhScript.toHex()
    ];

    return Script.fromHex(scriptParts.join(''));
  }

  private calculateHash(data: Buffer): Buffer {
    return createHash('sha256').update(data).digest();
  }
} 