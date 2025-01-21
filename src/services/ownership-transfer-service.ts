import { BSVService } from './bsv-service';
import { TransactionVerificationService } from './transaction-verification-service';
import { InscriptionSecurityService } from './inscription-security-service';
import { BSVError } from '../types';
import { BSVServiceInterface, UTXO } from '../types/bsv';
import { InscriptionHolder } from '../contracts/inscription-holder';
import { bsv } from 'scrypt-ts';
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

      // Get the transaction if not included in UTXO
      const tx = utxo.tx || await this.bsvService.getTransaction(inscriptionTxId);
      if (!tx) {
        throw new BSVError('TX_ERROR', 'Transaction not found');
      }

      // Load and verify the contract instance
      const contract = InscriptionHolder.fromTx(tx);
      
      // Create transaction
      const transferTx = new bsv.Transaction();
      transferTx.addInput(new bsv.Transaction.Input({
        prevTxId: inscriptionTxId,
        outputIndex: utxo.outputIndex,
        script: utxo.script,
        output: new bsv.Transaction.Output({
          script: utxo.script,
          satoshis: utxo.satoshis
        })
      }));

      // Add contract output
      transferTx.addOutput(new bsv.Transaction.Output({
        script: contract.lockingScript,
        satoshis: utxo.satoshis
      }));

      // Sign transaction
      const currentPrivateKey = await this.bsvService.getPrivateKey();
      transferTx.sign(currentPrivateKey);

      // Broadcast transaction
      const txid = await this.bsvService.broadcastTx(transferTx);

      return txid;
    } catch (error) {
      console.error('Transfer transaction creation failed:', error);
      throw error;
    }
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
} 