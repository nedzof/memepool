import { BSVService } from './bsv-service';
import { TransactionVerificationService } from './transaction-verification-service';
import { InscriptionSecurityService } from './inscription-security-service';
import { Script, Transaction, P2PKH, PublicKey, Signature } from '@bsv/sdk';
import { BSVError } from '../types';
import { BSVServiceInterface, UTXO, TransactionInput, TransactionOutput } from '../types/bsv';

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
   * Create a transfer transaction
   * @param inscriptionTxId - Transaction ID of the inscription
   * @param recipientAddress - Recipient's wallet address
   * @param options - Transfer options
   * @returns Transaction ID of the transfer
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
        throw new BSVError('UTXO_ERROR', `UTXO not found for transaction ${inscriptionTxId}`);
      }

      // Verify UTXO is unspent
      const response = await this.bsvService.wallet.fetchWithRetry(
        `https://api.whatsonchain.com/v1/bsv/test/tx/${inscriptionTxId}/out/0`
      );
      const outputData = await response.json();
      
      if (outputData.spent) {
        throw new BSVError('UTXO_ERROR', 'Inscription holder UTXO is already spent');
      }

      // Extract original inscription ID from script
      const scriptHex = inscriptionUtxo.script.toHex();
      const originalInscriptionId = options.originalInscriptionId || this.extractOriginalInscriptionId(scriptHex);
      
      if (!originalInscriptionId) {
        throw new BSVError('INSCRIPTION_ERROR', 'Could not find original inscription ID in holder script');
      }

      // Create new transaction
      const tx = new Transaction();

      // Create P2PKH unlocking template for the inscription holder UTXO
      const p2pkhUnlock = new P2PKH();
      const privateKey = this.bsvService.wallet.privateKey;
      const pubKey = privateKey.toPublicKey();

      // Create unlocking template with MEME marker preservation
      const unlockingTemplate = {
        script: Script.fromHex(inscriptionUtxo.script.toHex()),
        satoshis: inscriptionUtxo.satoshis,
        sign: async (tx: Transaction, inputIndex: number): Promise<Script> => {
          const input = tx.inputs[inputIndex];
          if (!input.sourceSatoshis) {
            throw new BSVError('INVALID_INPUT', 'Input satoshis not set');
          }

          // Create signature using SIGHASH_ALL | SIGHASH_FORKID
          const sigtype = 0x41;
          const preimage = tx.getSignaturePreimage(
            inputIndex,
            input.sourceTransaction?.outputs[input.sourceOutputIndex].lockingScript || Script.fromHex(''),
            input.sourceSatoshis,
            sigtype
          );

          const signature = privateKey.sign(preimage);
          
          // Create unlocking script: <signature> <pubkey>
          const unlockingScript = new Script();
          unlockingScript.add(Buffer.concat([
            signature.toBuffer(),
            Buffer.from([sigtype]) // Append sighash type
          ]));
          unlockingScript.add(pubKey.toBuffer());
          
          return unlockingScript;
        },
        estimateLength: () => 107 // Approximate length of signature + pubkey + op_codes
      };

      // Add the inscription input
      tx.addInput({
        sourceTXID: inscriptionUtxo.txId,
        sourceOutputIndex: inscriptionUtxo.outputIndex,
        sourceSatoshis: inscriptionUtxo.satoshis,
        sourceTransaction: inscriptionUtxo.sourceTransaction,
        unlockingScriptTemplate: unlockingTemplate
      });

      // Get additional UTXOs for fees if needed
      const feeUtxos = allUtxos.filter((utxo: UTXO) => 
        utxo.txId !== inscriptionTxId && !utxo.script.toHex().includes('6a044d454d45')
      ).sort((a, b) => a.satoshis - b.satoshis); // Sort by value to use smallest UTXOs first

      // Calculate estimated fee
      const estimatedFee = this.bsvService.estimateFee(
        1 + Math.min(feeUtxos.length, 3), // Use up to 3 additional UTXOs
        2 // Inscription output + change output
      );

      // Select fee UTXOs
      let totalFeeInputs = 0;
      const selectedFeeUtxos: UTXO[] = [];
      for (const utxo of feeUtxos) {
        if (totalFeeInputs >= estimatedFee) break;
        selectedFeeUtxos.push(utxo);
        totalFeeInputs += utxo.satoshis;
      }

      // Add fee UTXOs
      for (const utxo of selectedFeeUtxos) {
        if (!utxo.sourceTransaction) {
          utxo.sourceTransaction = await this.fetchSourceTransaction(utxo.txId);
        }
        const standardUnlockingTemplate = p2pkhUnlock.unlock(privateKey);
        tx.addInput({
          sourceTXID: utxo.txId,
          sourceOutputIndex: utxo.outputIndex,
          sourceSatoshis: utxo.satoshis,
          sourceTransaction: utxo.sourceTransaction,
          unlockingScriptTemplate: standardUnlockingTemplate
        });
      }

      // Create the inscription output script for recipient
      const recipientP2pkh = new P2PKH();
      const recipientScript = recipientP2pkh.lock(recipientAddress);
      
      // Create combined script: P2PKH + Original TXID + MEME marker
      const lockingScript = new Script();
      lockingScript.add(Buffer.from(recipientScript.toHex(), 'hex')); // P2PKH script
      lockingScript.add(Buffer.from('6a20' + originalInscriptionId, 'hex')); // OP_RETURN <32 bytes> for TXID
      lockingScript.add(Buffer.from('6a044d454d45', 'hex')); // OP_RETURN MEME

      // Add the inscription output (1 satoshi)
      tx.addOutput({
        lockingScript,
        satoshis: 1
      });

      // Calculate total input and change amount
      const totalInput = inscriptionUtxo.satoshis + totalFeeInputs;
      const changeAmount = totalInput - 1 - estimatedFee;

      // Add change output if amount is sufficient
      if (changeAmount >= 546) { // Dust limit
        const p2pkh = new P2PKH();
        const changeScript = p2pkh.lock(senderAddress);
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
   * Extract original inscription ID from holder script
   * @private
   */
  private extractOriginalInscriptionId(scriptHex: string): string | undefined {
    const match = scriptHex.match(/6a20([0-9a-f]{64})/);
    return match ? match[1] : undefined;
  }

  /**
   * Verify transfer completion
   * @param transferTxId - Transaction ID of the transfer
   * @param recipientAddress - Expected recipient address
   * @returns True if transfer is complete and valid
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
   * @param transferTxId - Transaction ID of the transfer
   * @returns Transfer status details
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