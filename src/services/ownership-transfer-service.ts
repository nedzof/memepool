import { BSVService } from './bsv-service';
import { TransactionVerificationService } from './transaction-verification-service';
import { InscriptionSecurityService } from './inscription-security-service';
import { Script, Transaction, P2PKH, PublicKey, Signature } from '@bsv/sdk';
import { BSVError } from '../types';
import { BSVServiceInterface, UTXO, TransactionInput, TransactionOutput } from '../types/bsv';
import { InscriptionHolderScript } from '../types/inscription';

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
    this.securityService = securityService || new InscriptionSecurityService(bsvService);
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
      const inscriptionUtxo = allUtxos.find((utxo: UTXO) => {
        const scriptHex = utxo.script.toHex();
        return scriptHex.includes('6a044d454d45') && // Has MEME marker
               scriptHex.includes('6a20') && // Has inscription ID
               utxo.satoshis === 1; // Is 1 satoshi
      });

      if (!inscriptionUtxo) {
        throw new BSVError('UTXO_ERROR', 'Inscription holder UTXO not found');
      }

      // Extract original inscription ID from script
      const scriptHex = inscriptionUtxo.script.toHex();
      const originalInscriptionId = options.originalInscriptionId || this.extractOriginalInscriptionId(scriptHex);
      
      if (!originalInscriptionId) {
        throw new BSVError('INSCRIPTION_ERROR', 'Could not find original inscription ID in holder script');
      }

      // Create new transaction
      const tx = new Transaction();

      // Get source transaction for the inscription UTXO
      const sourceTx = await this.fetchSourceTransaction(inscriptionUtxo.txId);
      inscriptionUtxo.sourceTransaction = sourceTx;

      // Create P2PKH unlocking template
      const p2pkhUnlock = new P2PKH();
      const privateKey = this.bsvService.wallet.privateKey;
      const pubKey = privateKey.toPublicKey();

      // Add the inscription input
      tx.addInput({
        sourceTXID: inscriptionUtxo.txId,
        sourceOutputIndex: inscriptionUtxo.outputIndex,
        sourceSatoshis: inscriptionUtxo.satoshis,
        sourceTransaction: inscriptionUtxo.sourceTransaction,
        unlockingScriptTemplate: p2pkhUnlock.unlock(privateKey)
      });

      // Calculate base size for fee estimation
      const baseSize = 
        148 + // Basic P2PKH input
        34 + // Basic P2PKH output
        44; // OP_RETURN data size (inscription ID + MEME marker)

      // Get additional UTXOs for fees
      const feeUtxos = allUtxos
        .filter((utxo: UTXO) => 
          utxo.txId !== inscriptionUtxo.txId && 
          !utxo.script.toHex().includes('6a044d454d45')
        )
        .sort((a, b) => a.satoshis - b.satoshis); // Sort by value ascending

      // Calculate minimum required fee (1 sat/kb)
      const minFee = Math.ceil(baseSize / 1000);

      // Select fee UTXOs
      let totalFeeInputs = 0;
      const selectedFeeUtxos: UTXO[] = [];
      
      for (const utxo of feeUtxos) {
        if (totalFeeInputs >= minFee) break;
        selectedFeeUtxos.push(utxo);
        totalFeeInputs += utxo.satoshis;
      }

      // Add fee UTXOs to transaction
      for (const utxo of selectedFeeUtxos) {
        if (!utxo.sourceTransaction) {
          utxo.sourceTransaction = await this.fetchSourceTransaction(utxo.txId);
        }
        tx.addInput({
          sourceTXID: utxo.txId,
          sourceOutputIndex: utxo.outputIndex,
          sourceSatoshis: utxo.satoshis,
          sourceTransaction: utxo.sourceTransaction,
          unlockingScriptTemplate: p2pkhUnlock.unlock(privateKey)
        });
      }

      // Create recipient's P2PKH script
      const recipientP2pkh = new P2PKH();
      const recipientScript = recipientP2pkh.lock(recipientAddress);
      
      // Create combined script: P2PKH + Original TXID + MEME marker
      const scriptParts = [
        recipientScript.toHex(),
        '6a20' + originalInscriptionId,
        '6a044d454d45'
      ];
      
      const lockingScript = Script.fromHex(scriptParts.join(''));

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

      // Broadcast transaction
      const txid = await this.bsvService.wallet.broadcastTransaction(tx);
      console.log('Transfer transaction broadcast:', txid);

      return txid;
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