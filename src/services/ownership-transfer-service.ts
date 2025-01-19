import { BSVService } from './bsv-service';
import { TransactionVerificationService } from './transaction-verification-service';
import { InscriptionSecurityService } from './inscription-security-service';
import { Script, Transaction, P2PKH, PublicKey, Signature } from '@bsv/sdk';
import { BSVError } from '../types';
import { BSVServiceInterface, UTXO, TransactionInput, TransactionOutput } from '../types/bsv';
import { InscriptionHolderScript, HolderMetadata } from '../types/inscription';
import crypto from 'crypto';

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
      const senderAddress = await this.bsvService.getWalletAddress();
      console.log('Sender address:', senderAddress);

      // Validate transfer parameters
      await this.securityService.validateTransferParams({
        txid: inscriptionTxId,
        senderAddress,
        recipientAddress
      });

      // Verify ownership and security checks
      const securityCheck = await this.securityService.verifyOwnershipForTransfer(
        inscriptionTxId,
        senderAddress
      );

      if (!securityCheck) {
        throw new BSVError('SECURITY_ERROR', 'Security check failed');
      }

      // Get all available UTXOs
      const allUtxos = await this.bsvService.wallet.getUtxos();
      if (!allUtxos?.length) {
        throw new BSVError('UTXO_ERROR', 'No UTXOs available');
      }

      // Find the inscription holder UTXO
      const inscriptionUtxo = allUtxos.find((utxo: UTXO) => utxo.txId === inscriptionTxId);
      if (!inscriptionUtxo) {
        throw new BSVError('UTXO_ERROR', 'Inscription holder UTXO not found');
      }

      // Fetch complete transaction data
      const txResponse = await this.bsvService.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/tx/${inscriptionTxId}`
      );
      const txData = await txResponse.json();

      // Find inscription output
      const sourceOutput = txData.vout.find((out: any) => {
        const scriptHex = out.scriptPubKey.hex;
        return out.scriptPubKey.type === 'nonstandard' && this.validateInscriptionScript(scriptHex);
      });

      if (!sourceOutput) {
        throw new BSVError('INSCRIPTION_ERROR', 'No inscription output found in transaction');
      }

      // Update UTXO with correct script
      inscriptionUtxo.script = Script.fromHex(sourceOutput.scriptPubKey.hex);
      inscriptionUtxo.outputIndex = sourceOutput.n;
      inscriptionUtxo.satoshis = Math.round(sourceOutput.value * 100000000);

      // Extract holder metadata
      const holderMetadata = await this.extractHolderMetadata(inscriptionUtxo.script.toHex());
      if (!holderMetadata) {
        throw new BSVError('INSCRIPTION_ERROR', 'Failed to extract holder metadata');
      }

      // Create transfer metadata
      const transferMetadata = {
        ...holderMetadata,
        operation: 'transfer' as const,
        txid: inscriptionTxId
      };

      // Create new inscription holder script
      const p2pkh = new P2PKH();
      const recipientP2PKH = p2pkh.lock(recipientAddress);
      
      const scriptParts = [
        '00',  // OP_FALSE
        '63',  // OP_IF
        this.createPushData(Buffer.from(JSON.stringify(transferMetadata))).toString('hex'),
        '68',  // OP_ENDIF
        recipientP2PKH.toHex()
      ];

      const transferScript = Script.fromHex(scriptParts.join(''));

      // Create and sign transaction
      const tx = await this.createAndSignTransferTx(
        inscriptionUtxo,
        transferScript,
        recipientAddress,
        senderAddress
      );

      // Broadcast transaction
      return await this.bsvService.wallet.broadcastTransaction(tx);
    } catch (error) {
      console.error('Failed to create transfer transaction:', error);
      throw error instanceof BSVError ? error : new BSVError('TRANSFER_ERROR', 'Failed to create transfer transaction');
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
        
        // Create initial inscription metadata
        return {
          version: 1,
          prefix: 'meme',
          operation: 'inscribe',
          name: 'inscription',
          contentID: this.extractOriginalInscriptionId(scriptHex) || scriptHex,
          txid: 'deploy',
          creator: this.pubKeyHashToAddress(pubKeyHash)
        };
      }

      // Handle standard inscription format
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
    
    // Calculate double SHA256 for checksum
    const hash1 = crypto.createHash('sha256').update(buffer).digest();
    const hash2 = crypto.createHash('sha256').update(hash1).digest();
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

  private async createAndSignTransferTx(
    inscriptionUtxo: UTXO,
    transferScript: Script,
    recipientAddress: string,
    senderAddress: string
  ): Promise<Transaction> {
    // Create new transaction
    const tx = new Transaction();
    const privateKey = this.bsvService.wallet.privateKey;

    // Add inscription holder UTXO as input
    if (!inscriptionUtxo.sourceTransaction) {
      inscriptionUtxo.sourceTransaction = await this.fetchSourceTransaction(inscriptionUtxo.txId);
    }

    // Create a fresh P2PKH instance for unlocking the input
    const p2pkhUnlock = new P2PKH();
    const unlockingTemplate = p2pkhUnlock.unlock(privateKey);

    // Add input with proper script template
    const inscriptionInput = {
      sourceTXID: inscriptionUtxo.txId,
      sourceOutputIndex: inscriptionUtxo.outputIndex,
      sourceSatoshis: 1, // Always 1 satoshi for inscription
      sourceTransaction: inscriptionUtxo.sourceTransaction,
      unlockingScriptTemplate: unlockingTemplate
    };
    tx.addInput(inscriptionInput);

    // Get all UTXOs for fee calculation
    const allUtxos = await this.bsvService.wallet.getUtxos();

    // Calculate minimum fee and select UTXOs for fee
    const minFee = 1000; // 1000 satoshis minimum fee
    let totalFeeInputs = 0;

    // Select UTXOs for fee
    const selectedFeeUtxos: UTXO[] = [];
    for (const utxo of allUtxos) {
      if (utxo.txId !== inscriptionUtxo.txId && totalFeeInputs < minFee) {
        selectedFeeUtxos.push(utxo);
        totalFeeInputs += utxo.satoshis;
      }
    }

    if (totalFeeInputs < minFee) {
      throw new BSVError('UTXO_ERROR', 'Insufficient funds for fee');
    }

    // Add fee UTXOs to transaction
    for (const utxo of selectedFeeUtxos) {
      if (!utxo.sourceTransaction) {
        utxo.sourceTransaction = await this.fetchSourceTransaction(utxo.txId);
      }

      const feeUnlockingTemplate = p2pkhUnlock.unlock(privateKey);
      
      const feeInput = {
        sourceTXID: utxo.txId,
        sourceOutputIndex: utxo.outputIndex,
        sourceSatoshis: utxo.satoshis,
        sourceTransaction: utxo.sourceTransaction,
        unlockingScriptTemplate: feeUnlockingTemplate
      };
      tx.addInput(feeInput);
    }

    // Add inscription holder output
    tx.addOutput({
      lockingScript: transferScript,
      satoshis: 1
    });

    // Calculate total input and change amount
    const totalInput = inscriptionUtxo.satoshis + totalFeeInputs;
    const changeAmount = totalInput - 1 - minFee;

    // Add change output if amount is sufficient (dust limit: 546 sats)
    if (changeAmount >= 546) {
      const changeScript = p2pkhUnlock.lock(senderAddress);
      tx.addOutput({
        lockingScript: changeScript,
        satoshis: changeAmount
      });
    }

    // Sign transaction
    await tx.sign();

    // Verify transaction structure
    await this.verifyTransferTransaction(tx, transferScript, recipientAddress);

    return tx;
  }

  private async verifyTransferTransaction(
    tx: Transaction,
    transferScript: Script,
    recipientAddress: string
  ): Promise<void> {
    console.log('\nVerifying transaction structure before broadcast...');
    
    // 1. Verify inputs
    const verifyInscriptionInput = tx.inputs[0];
    if (!verifyInscriptionInput) {
      throw new BSVError('SCRIPT_ERROR', 'Transaction is missing inscription input');
    }

    // 2. Verify outputs
    const outputs = tx.outputs;
    if (!outputs || outputs.length === 0) {
      throw new BSVError('SCRIPT_ERROR', 'Transaction has no outputs');
    }

    // Verify inscription output
    const verifyInscriptionOutput = outputs[0];
    if (!verifyInscriptionOutput || verifyInscriptionOutput.satoshis !== 1) {
      throw new BSVError('SCRIPT_ERROR', 'First output must be inscription output with 1 satoshi');
    }

    // Verify script format
    const outputScriptHex = verifyInscriptionOutput.lockingScript.toHex();
    const transferScriptHex = transferScript.toHex();
    
    if (!this.validateInscriptionScript(outputScriptHex)) {
      throw new BSVError('SCRIPT_ERROR', 'Invalid inscription output script format');
    }

    if (outputScriptHex !== transferScriptHex) {
      throw new BSVError('SCRIPT_ERROR', 'Output script does not match transfer script');
    }

    console.log('Transaction verification passed ✓');
    console.log('- Inscription input verified');
    console.log('- Script format verified');
    console.log('- Output value is 1 satoshi');
    console.log('- Transfer script matches');
  }
} 