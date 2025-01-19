import { BSVService } from './bsv-service';
import { TransactionVerificationService } from './transaction-verification-service';
import { InscriptionSecurityService } from './inscription-security-service';
import { Script, Transaction, P2PKH, PublicKey, Signature } from '@bsv/sdk';
import { BSVError } from '../types';
import { BSVServiceInterface, UTXO, TransactionInput, TransactionOutput } from '../types/bsv';
import { InscriptionHolderScript, HolderMetadata } from '../types/inscription';

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

      // Fetch complete transaction data to get the full script
      const txResponse = await this.bsvService.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/tx/${inscriptionTxId}`
      );
      const txData = await txResponse.json();

      // Find the output with nonstandard type and P2PKH + OP_RETURN format
      const inscriptionOutput = txData.vout.find((out: any) => 
        out.scriptPubKey.type === 'nonstandard' && 
        out.scriptPubKey.hex.match(/76a914[0-9a-f]{40}88ac.*6a/)
      );

      if (!inscriptionOutput) {
        throw new BSVError('INSCRIPTION_ERROR', 'No inscription output found in transaction');
      }

      // Update UTXO with correct script and output index
      inscriptionUtxo.script = Script.fromHex(inscriptionOutput.scriptPubKey.hex);
      inscriptionUtxo.outputIndex = inscriptionOutput.n;
      inscriptionUtxo.satoshis = Math.round(inscriptionOutput.value * 100000000); // Convert BSV to satoshis

      // Extract and decode holder metadata
      const scriptHex = inscriptionUtxo.script.toHex();
      const p2pkhScript = scriptHex.slice(0, 50);  // 76a914{20-bytes}88ac is 50 chars
      const opReturnStart = scriptHex.indexOf('6a', 50);
      
      if (opReturnStart < 0) {
        throw new BSVError('INSCRIPTION_ERROR', 'Invalid holder script format');
      }

      const opReturnData = scriptHex.slice(opReturnStart + 2);
      let jsonStartIndex = 0;
      let jsonLength = 0;
      
      // Handle PUSHDATA prefixes
      if (opReturnData.startsWith('4c')) {
        jsonLength = parseInt(opReturnData.slice(2, 4), 16);
        jsonStartIndex = 4;
      } else if (opReturnData.startsWith('4d')) {
        jsonLength = parseInt(opReturnData.slice(2, 6).match(/../g)!.reverse().join(''), 16);
        jsonStartIndex = 6;
      } else if (opReturnData.startsWith('4e')) {
        jsonLength = parseInt(opReturnData.slice(2, 10).match(/../g)!.reverse().join(''), 16);
        jsonStartIndex = 10;
      } else {
        jsonLength = parseInt(opReturnData.slice(0, 2), 16);
        jsonStartIndex = 2;
      }

      const jsonHex = opReturnData.slice(jsonStartIndex, jsonStartIndex + (jsonLength * 2));
      const jsonBuffer = Buffer.from(jsonHex, 'hex');
      
      let holderMetadata: HolderMetadata;
      try {
        holderMetadata = JSON.parse(jsonBuffer.toString()) as HolderMetadata;
      } catch (error) {
        throw new BSVError('INSCRIPTION_ERROR', 'Failed to decode holder metadata');
      }

      // Create new transaction
      const tx = new Transaction();
      const privateKey = this.bsvService.wallet.privateKey;
      const p2pkhUnlock = new P2PKH();

      // Add inscription holder UTXO as input with proper unlocking script
      if (!inscriptionUtxo.sourceTransaction) {
        inscriptionUtxo.sourceTransaction = await this.fetchSourceTransaction(inscriptionUtxo.txId);
      }

      // Get the source transaction output's locking script
      const sourceOutput = inscriptionUtxo.sourceTransaction.outputs[inscriptionUtxo.outputIndex];
      if (!sourceOutput) {
        throw new BSVError('SCRIPT_ERROR', 'Source output not found');
      }

      // Create unlocking script template for the inscription input using sender's key
      const unlockingTemplate = p2pkhUnlock.unlock(privateKey);

      // Add input with proper script template
      const inscriptionInput = {
        sourceTXID: inscriptionUtxo.txId,
        sourceOutputIndex: inscriptionUtxo.outputIndex,
        sourceSatoshis: inscriptionUtxo.satoshis,
        sourceTransaction: inscriptionUtxo.sourceTransaction,
        unlockingScriptTemplate: unlockingTemplate
      };
      tx.addInput(inscriptionInput);

      // Calculate minimum fee
      const minFee = 1000; // 1000 satoshis minimum fee
      let totalFeeInputs = 0;

      // Select UTXOs for fee
      const selectedFeeUtxos: UTXO[] = [];
      for (const utxo of allUtxos) {
        if (utxo.txId !== inscriptionTxId && totalFeeInputs < minFee) {
          selectedFeeUtxos.push(utxo);
          totalFeeInputs += utxo.satoshis;
        }
      }

      if (totalFeeInputs < minFee) {
        throw new BSVError('UTXO_ERROR', 'Insufficient funds for fee');
      }

      // Add fee UTXOs to transaction with proper unlocking scripts
      for (const utxo of selectedFeeUtxos) {
        if (!utxo.sourceTransaction) {
          utxo.sourceTransaction = await this.fetchSourceTransaction(utxo.txId);
        }

        // Get the source transaction output's locking script for fee UTXO
        const feeSourceOutput = utxo.sourceTransaction.outputs[utxo.outputIndex];
        if (!feeSourceOutput) {
          throw new BSVError('SCRIPT_ERROR', `Fee source output not found for UTXO ${utxo.txId}:${utxo.outputIndex}`);
        }

        // Create unlocking script template for the fee output
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

      // Update metadata for transfer
      const transferMetadata: HolderMetadata = {
        ...holderMetadata,
        operation: 'transfer',
        txid: inscriptionTxId
      };

      // Create recipient's inscription locking script
      const recipientP2pkh = new P2PKH();
      const recipientLockingScript = recipientP2pkh.lock(recipientAddress);

      // Create the combined locking script with metadata
      const lockingScriptParts = [
        recipientLockingScript.toHex(),
        '6a' + Buffer.from(JSON.stringify(transferMetadata)).toString('hex')
      ];

      const lockingScript = Script.fromHex(lockingScriptParts.join(''));

      // Verify the locking script starts with the correct P2PKH for the recipient
      if (!lockingScript.toHex().startsWith(recipientLockingScript.toHex())) {
        throw new BSVError('SCRIPT_ERROR', 'Locking script does not contain correct recipient P2PKH');
      }

      // Add the inscription output (1 satoshi)
      tx.addOutput({
        lockingScript,
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

      // Sign all inputs
      await tx.sign();

      // Verify the transaction structure before broadcasting
      const outputScripts = tx.outputs.map(output => output.lockingScript.toHex());
      const hasRecipientOutput = outputScripts.some(script => script.startsWith(recipientLockingScript.toHex()));
      if (!hasRecipientOutput) {
        throw new BSVError('SCRIPT_ERROR', 'Transaction does not contain recipient output');
      }

      // Broadcast transaction
      try {
        const txid = await this.bsvService.wallet.broadcastTransaction(tx);
        return txid;
      } catch (error) {
        throw new BSVError('BROADCAST_ERROR', `Failed to broadcast transaction: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error('Failed to create transfer transaction:', error);
      throw error instanceof BSVError ? error : new BSVError('TRANSFER_ERROR', 'Failed to create transfer transaction');
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
} 