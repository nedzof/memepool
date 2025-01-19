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
      const sourceOutput = txData.vout.find((out: any) => 
        out.scriptPubKey.type === 'nonstandard' && 
        out.scriptPubKey.hex.match(/76a914[0-9a-f]{40}88ac.*6a/)
      );

      if (!sourceOutput) {
        throw new BSVError('INSCRIPTION_ERROR', 'No inscription output found in transaction');
      }

      // Update UTXO with correct script and output index
      inscriptionUtxo.script = Script.fromHex(sourceOutput.scriptPubKey.hex);
      inscriptionUtxo.outputIndex = sourceOutput.n;
      inscriptionUtxo.satoshis = Math.round(sourceOutput.value * 100000000); // Convert BSV to satoshis

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

      // Calculate minimum fee and select UTXOs for fee
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

      // Create transfer metadata
      const transferMetadata = {
        ...holderMetadata,
        operation: 'transfer',
        txid: inscriptionTxId
      };
      const metadataBuffer = Buffer.from(JSON.stringify(transferMetadata));

      // Create combined script with metadata in OP_IF and P2PKH
      const recipientTemplate = new P2PKH();
      const recipientScript = recipientTemplate.lock(recipientAddress);
      const recipientScriptHex = recipientScript.toHex();

      // Construct the complete script
      const scriptParts = [
        '00', // OP_FALSE
        '63', // OP_IF
        Buffer.from(metadataBuffer).toString('hex'),
        '68', // OP_ENDIF
        recipientScriptHex
      ];
      const combinedScript = Script.fromHex(scriptParts.join(''));

      // Add single output with combined script
      tx.addOutput({
        lockingScript: combinedScript,
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
      console.log('\nVerifying transaction structure before broadcast...');
      
      // 1. Verify inputs
      const verifyInscriptionInput = tx.inputs[0];
      if (!verifyInscriptionInput) {
        throw new BSVError('SCRIPT_ERROR', 'Transaction is missing inscription input');
      }

      // 2. Verify outputs and find inscription output
      const outputs = tx.outputs;
      if (!outputs || outputs.length === 0) {
        throw new BSVError('SCRIPT_ERROR', 'Transaction has no outputs');
      }

      // Find and verify the inscription output
      const verifyInscriptionOutput = outputs[0];
      if (!verifyInscriptionOutput || verifyInscriptionOutput.satoshis !== 1) {
        throw new BSVError('SCRIPT_ERROR', 'First output must be inscription output with 1 satoshi');
      }

      // Verify the output script format
      const outputScriptHex = verifyInscriptionOutput.lockingScript.toHex();
      if (!outputScriptHex.startsWith('0063') || !outputScriptHex.includes('68' + recipientScriptHex)) {
        throw new BSVError('SCRIPT_ERROR', 'Invalid inscription output script format');
      }

      // Extract and verify recipient's pubKeyHash from the P2PKH part
      const p2pkhStart = outputScriptHex.indexOf(recipientScriptHex);
      if (p2pkhStart === -1) {
        throw new BSVError('SCRIPT_ERROR', 'Output does not contain recipient P2PKH script');
      }

      console.log('Transaction verification passed ✓');
      console.log('- Inscription input verified');
      console.log('- Combined script format verified');
      console.log('- Output value is 1 satoshi');
      console.log('- P2PKH part matches recipient');

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