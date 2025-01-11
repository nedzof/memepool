import { BSVService } from '../src/services/bsv-service';
import { OwnershipTransferService } from '../src/services/ownership-transfer-service';
import { TransactionVerificationService } from '../src/services/transaction-verification-service';
import { InscriptionSecurityService } from '../src/services/inscription-security-service';
import { Script, Transaction, P2PKH, PrivateKey } from '@bsv/sdk';
import { BSVError } from '../src/types';
import { UTXO, TransactionStatus } from '../src/types/bsv';

// Mock dependencies
jest.mock('../src/services/bsv-service');
jest.mock('../src/services/transaction-verification-service');
jest.mock('../src/services/inscription-security-service');

describe('OwnershipTransferService', () => {
  let service: OwnershipTransferService;
  let bsvService: jest.Mocked<BSVService>;
  let verificationService: jest.Mocked<TransactionVerificationService>;
  let securityService: jest.Mocked<InscriptionSecurityService>;
  let mockPrivateKey: PrivateKey;
  let mockPublicKey: any;

  beforeEach(() => {
    // Create mock private key and public key
    mockPrivateKey = new PrivateKey();
    mockPublicKey = mockPrivateKey.toPublicKey();

    // Create mock BSV service
    bsvService = {
      wallet: {
        privateKey: mockPrivateKey,
        fetchWithRetry: jest.fn().mockImplementation(async () => new Response()),
        getUtxos: jest.fn().mockResolvedValue([]),
        broadcastTransaction: jest.fn().mockResolvedValue('')
      },
      getWalletAddress: jest.fn(),
      getTransactionStatus: jest.fn(),
      getTransaction: jest.fn(),
      createTransaction: jest.fn(),
      broadcastTransaction: jest.fn(),
      connect: jest.fn(),
      connectWallet: jest.fn(),
      getUTXOs: jest.fn(),
      estimateFee: jest.fn(),
      getNetworkConfig: jest.fn()
    } as unknown as jest.Mocked<BSVService>;

    // Create mock verification service
    verificationService = {
      validateOwnership: jest.fn()
    } as unknown as jest.Mocked<TransactionVerificationService>;

    // Create mock security service
    securityService = {
      validateTransferParams: jest.fn(),
      verifyOwnershipForTransfer: jest.fn(),
      minConfirmations: 1
    } as unknown as jest.Mocked<InscriptionSecurityService>;

    // Create service instance
    service = new OwnershipTransferService(bsvService, verificationService, securityService);
  });

  describe('createTransferTransaction', () => {
    const mockInscriptionTxId = 'mock_txid';
    const mockRecipientAddress = 'mock_recipient_address';
    const mockSenderAddress = 'mock_sender_address';

    beforeEach(() => {
      // Mock wallet address
      bsvService.getWalletAddress.mockResolvedValue(mockSenderAddress);

      // Mock security checks
      (securityService.validateTransferParams as jest.Mock).mockResolvedValue(undefined);
      (securityService.verifyOwnershipForTransfer as jest.Mock).mockResolvedValue(true);

      // Mock transaction data
      const mockTxHex = '0100000001...'; // Add proper mock hex
      const mockTxData = {
        vout: [{
          scriptPubKey: {
            type: 'nonstandard',
            hex: '6a044d454d45' // MEME marker
          },
          n: 0,
          value: 0.00000001
        }]
      };

      // Mock API responses
      (bsvService.wallet.fetchWithRetry as jest.Mock)
        .mockImplementationOnce(async () => ({
          text: async () => mockTxHex
        }))
        .mockImplementationOnce(async () => ({
          json: async () => mockTxData
        }));

      // Mock UTXOs
      const mockUtxo: UTXO = {
        txId: mockInscriptionTxId,
        outputIndex: 0,
        script: Script.fromHex('6a044d454d45'),
        satoshis: 1,
        sourceTransaction: Transaction.fromHex(mockTxHex)
      };
      (bsvService.wallet.getUtxos as jest.Mock).mockResolvedValue([mockUtxo]);

      // Mock transaction broadcast
      (bsvService.wallet.broadcastTransaction as jest.Mock).mockResolvedValue('new_txid');
    });

    it('should create and broadcast a transfer transaction', async () => {
      const txid = await service.createTransferTransaction(
        mockInscriptionTxId,
        mockRecipientAddress
      );

      // Verify security checks
      expect(securityService.validateTransferParams).toHaveBeenCalledWith({
        txid: mockInscriptionTxId,
        senderAddress: mockSenderAddress,
        recipientAddress: mockRecipientAddress
      });
      expect(securityService.verifyOwnershipForTransfer).toHaveBeenCalledWith(
        mockInscriptionTxId,
        mockSenderAddress
      );

      // Verify UTXO fetching
      expect(bsvService.wallet.getUtxos).toHaveBeenCalled();

      // Verify transaction broadcast
      expect(bsvService.wallet.broadcastTransaction).toHaveBeenCalled();
      expect(txid).toBe('new_txid');
    });

    it('should throw error if security check fails', async () => {
      (securityService.verifyOwnershipForTransfer as jest.Mock).mockResolvedValue(false);

      await expect(
        service.createTransferTransaction(mockInscriptionTxId, mockRecipientAddress)
      ).rejects.toThrow(BSVError);
    });

    it('should throw error if no UTXOs available', async () => {
      (bsvService.wallet.getUtxos as jest.Mock).mockResolvedValue([]);

      await expect(
        service.createTransferTransaction(mockInscriptionTxId, mockRecipientAddress)
      ).rejects.toThrow(BSVError);
    });

    it('should throw error if inscription UTXO not found', async () => {
      (bsvService.wallet.getUtxos as jest.Mock).mockResolvedValue([
        {
          txId: 'different_txid',
          outputIndex: 0,
          script: Script.fromHex(''),
          satoshis: 1000
        }
      ]);

      await expect(
        service.createTransferTransaction(mockInscriptionTxId, mockRecipientAddress)
      ).rejects.toThrow(BSVError);
    });
  });

  describe('verifyTransfer', () => {
    const mockTransferTxId = 'mock_transfer_txid';
    const mockRecipientAddress = 'mock_recipient_address';

    it('should verify a completed transfer', async () => {
      const mockStatus: TransactionStatus = {
        confirmations: 2,
        timestamp: Date.now()
      };
      bsvService.getTransactionStatus.mockResolvedValue(mockStatus);
      (verificationService.validateOwnership as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyTransfer(mockTransferTxId, mockRecipientAddress);
      expect(result).toBe(true);
    });

    it('should return false if not enough confirmations', async () => {
      const mockStatus: TransactionStatus = {
        confirmations: 0,
        timestamp: Date.now()
      };
      bsvService.getTransactionStatus.mockResolvedValue(mockStatus);

      const result = await service.verifyTransfer(mockTransferTxId, mockRecipientAddress);
      expect(result).toBe(false);
    });

    it('should return false if ownership validation fails', async () => {
      const mockStatus: TransactionStatus = {
        confirmations: 2,
        timestamp: Date.now()
      };
      bsvService.getTransactionStatus.mockResolvedValue(mockStatus);
      (verificationService.validateOwnership as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyTransfer(mockTransferTxId, mockRecipientAddress);
      expect(result).toBe(false);
    });
  });

  describe('getTransferStatus', () => {
    const mockTransferTxId = 'mock_transfer_txid';

    it('should return transfer status', async () => {
      const mockStatus: TransactionStatus = {
        confirmations: 2,
        timestamp: Date.now()
      };
      bsvService.getTransactionStatus.mockResolvedValue(mockStatus);

      const status = await service.getTransferStatus(mockTransferTxId);
      expect(status).toEqual({
        confirmed: true,
        confirmations: 2,
        timestamp: mockStatus.timestamp,
        complete: true
      });
    });

    it('should throw error if status fetch fails', async () => {
      const mockStatus: TransactionStatus = {
        confirmations: 0,
        timestamp: 0
      };
      bsvService.getTransactionStatus.mockResolvedValue(mockStatus);

      await expect(
        service.getTransferStatus(mockTransferTxId)
      ).rejects.toThrow(BSVError);
    });
  });
}); 