import { BSVService } from '../src/services/bsv-service';
import { TransactionVerificationService } from '../src/services/transaction-verification-service';
import { InscriptionSecurityService } from '../src/services/inscription-security-service';
import { Script, Transaction, P2PKH, PublicKey, Signature } from '@bsv/sdk';
import { BSVError } from '../src/types';
import { OwnershipTransferService } from '../src/services/ownership-transfer-service';
import { UTXO } from '../src/types/bsv';
import * as cbor from 'cbor';

jest.mock('../src/services/bsv-service');
jest.mock('../src/services/transaction-verification-service');
jest.mock('../src/services/inscription-security-service');
jest.mock('@bsv/sdk', () => {
  const originalModule = jest.requireActual('@bsv/sdk');

  class MockScript {
    private hex: string;

    constructor(hex = '') {
      console.log('Creating MockScript with hex:', hex);
      this.hex = hex;
    }

    static fromHex(hex: string) {
      console.log('MockScript.fromHex:', hex);
      return new MockScript(hex);
    }

    toHex() {
      console.log('MockScript.toHex returning:', this.hex);
      return this.hex;
    }

    add(data: Buffer) {
      console.log('MockScript.add:', data.toString('hex'));
      this.hex += data.toString('hex');
      return this;
    }

    toBuffer() {
      console.log('MockScript.toBuffer for hex:', this.hex);
      return Buffer.from(this.hex, 'hex');
    }
  }

  class MockTransaction {
    public inputs: any[] = [];
    public outputs: any[] = [];
    private hex: string = '';

    constructor() {
      console.log('Creating new MockTransaction');
    }

    addInput(input: any) {
      console.log('MockTransaction.addInput:', input);
      this.inputs.push(input);
      return this;
    }

    addOutput(output: any) {
      console.log('MockTransaction.addOutput:', output);
      this.outputs.push(output);
      return this;
    }

    async sign() {
      console.log('MockTransaction.sign called');
      return Promise.resolve(this);
    }

    static fromHex(hex: string) {
      console.log('MockTransaction.fromHex:', hex);
      const tx = new MockTransaction();
      tx.hex = hex;
      return tx;
    }

    toHex() {
      console.log('MockTransaction.toHex returning:', this.hex);
      return this.hex;
    }
  }

  class MockP2PKH {
    lock(address: string) {
      console.log('MockP2PKH.lock for address:', address);
      return new MockScript('76a914d8b6fcc85a383261df05423ddf068a8987bf0d7f88ac');
    }

    unlock(privateKey: any) {
      console.log('MockP2PKH.unlock called');
      return {
        script: new MockScript('mock_script'),
        satoshis: 1000,
        sign: jest.fn().mockResolvedValue(new MockScript('mock_signature')),
        estimateLength: () => 107
      };
    }
  }

  return {
    ...originalModule,
    Script: MockScript,
    Transaction: MockTransaction,
    P2PKH: MockP2PKH,
  };
});

describe('OwnershipTransferService', () => {
  let service: OwnershipTransferService;
  let bsvService: jest.Mocked<BSVService>;
  let verificationService: jest.Mocked<TransactionVerificationService>;
  let securityService: jest.Mocked<InscriptionSecurityService>;
  
  // Mock data
  const mockTransferTxId = 'mock_transfer_tx_id';
  const mockRecipientAddress = 'mock_recipient_address';
  const mockSourceTxId = 'mock_source_tx_id';
  const mockSourceOutputIndex = 0;
  const mockContentId = 'MEME_1234567890_' + Date.now();

  // Create mock metadata
  const mockMetadata = {
    version: 1,
    prefix: 'meme',
    operation: 'create',
    name: 'test.mp4',
    contentID: mockContentId,
    txid: mockSourceTxId,
    creator: 'mock_creator_address'
  };

  // Serialize metadata to CBOR
  const mockMetadataBuffer = cbor.encode(mockMetadata);
  const mockMetadataHex = mockMetadataBuffer.toString('hex');
  
  // Create PUSHDATA prefix based on length
  let pushdataPrefix = '';
  if (mockMetadataBuffer.length <= 0x4b) {
    pushdataPrefix = mockMetadataBuffer.length.toString(16).padStart(2, '0');
  } else {
    pushdataPrefix = '4c' + mockMetadataBuffer.length.toString(16).padStart(2, '0');
  }

  // Create combined script: P2PKH + OP_RETURN CBOR
  const mockScriptHex = 
    '76a914d8b6fcc85a383261df05423ddf068a8987bf0d7f88ac' + // P2PKH script
    '6a' + pushdataPrefix + mockMetadataHex; // OP_RETURN with CBOR metadata

  beforeEach(() => {
    const mockPrivateKey = {
      sign: jest.fn().mockReturnValue({
        toBuffer: () => Buffer.from('mock_signature')
      }),
      toPublicKey: jest.fn().mockReturnValue({
        toBuffer: () => Buffer.from('mock_pubkey')
      })
    };

    bsvService = {
      wallet: {
        getUtxos: jest.fn(),
        fetchWithRetry: jest.fn(),
        privateKey: mockPrivateKey,
        broadcastTransaction: jest.fn().mockResolvedValue(mockTransferTxId)
      },
      getTransactionStatus: jest.fn(),
      getWalletAddress: jest.fn(),
      broadcastTransaction: jest.fn(),
    } as unknown as jest.Mocked<BSVService>;

    verificationService = {
      checkTransactionConfirmations: jest.fn(),
      validateOwnership: jest.fn(),
    } as unknown as jest.Mocked<TransactionVerificationService>;

    securityService = {
      validateTransferParams: jest.fn(),
      verifyOwnershipForTransfer: jest.fn(),
    } as unknown as jest.Mocked<InscriptionSecurityService>;

    service = new OwnershipTransferService(
      bsvService,
      verificationService,
      securityService
    );
  });

  describe('createTransferTransaction', () => {
    it('should create and broadcast a transfer transaction', async () => {
      console.log('Setting up test mocks...');
      
      // Create mock inscription UTXO with proper script format
      const mockUtxo: UTXO = {
        txId: mockSourceTxId,
        outputIndex: mockSourceOutputIndex,
        script: Script.fromHex(mockScriptHex),
        satoshis: 1,
        sourceTransaction: Transaction.fromHex('mock_tx_hex')
      };

      // Mock additional UTXO for fees
      const mockFeeUtxo: UTXO = {
        txId: 'mock_fee_utxo',
        outputIndex: 0,
        script: Script.fromHex('76a914d8b6fcc85a383261df05423ddf068a8987bf0d7f88ac'),
        satoshis: 100000, // Increased to ensure enough for fees
        sourceTransaction: Transaction.fromHex('mock_tx_hex')
      };

      console.log('Setting up service mocks...');
      
      // Set up all required mocks
      (bsvService.wallet.getUtxos as jest.Mock).mockResolvedValue([mockUtxo, mockFeeUtxo]);
      (bsvService.getWalletAddress as jest.Mock).mockResolvedValue('mock_sender_address');
      (securityService.validateTransferParams as jest.Mock).mockResolvedValue(true);
      (securityService.verifyOwnershipForTransfer as jest.Mock).mockResolvedValue(true);
      (bsvService.wallet.broadcastTransaction as jest.Mock).mockResolvedValue(mockTransferTxId);

      // Mock the fetch responses
      (bsvService.wallet.fetchWithRetry as jest.Mock).mockImplementation(async (url: string) => {
        console.log('Fetching URL:', url);
        if (url.includes('/hex')) {
          console.log('Returning mock transaction hex');
          return {
            ok: true,
            text: async () => 'mock_tx_hex'
          };
        }
        console.log('Returning mock transaction data');
        return {
          ok: true,
          json: async () => ({
            txid: mockSourceTxId,
            hash: mockSourceTxId,
            version: 1,
            size: 225,
            locktime: 0,
            vin: [{
              txid: mockSourceTxId,
              vout: 0,
              scriptSig: {
                hex: '47304402207f8c3f0b244e6e96a82603f04546d1c017c5386f82c7e3d7a8c29f3aa6c156f902205f1e6cbba2e11823ed3f38f7fd88e3d57b66a9448be7d2c07c72d55273e6e7c7412102f7ae76d41d0099e04912bf0c132ee2f1e060be0e4133b69ca50ad7ea8a58b8e0'
              },
              sequence: 4294967295
            }],
            vout: [
              {
                value: 0.00001,
                n: 0,
                scriptPubKey: {
                  hex: mockScriptHex
                }
              }
            ]
          })
        };
      });

      console.log('Executing transfer transaction...');
      const result = await service.createTransferTransaction(mockSourceTxId, mockRecipientAddress);
      console.log('Transfer result:', result);
      expect(result).toBe(mockTransferTxId);
    });

    it('should throw error if security check fails', async () => {
      (bsvService.getWalletAddress as jest.Mock).mockResolvedValue('mock_sender_address');
      (securityService.validateTransferParams as jest.Mock).mockRejectedValue(
        new BSVError('SECURITY_ERROR', 'Security check failed')
      );

      await expect(
        service.createTransferTransaction(mockSourceTxId, mockRecipientAddress)
      ).rejects.toThrow(BSVError);
    });

    it('should throw error if no UTXOs available', async () => {
      (bsvService.getWalletAddress as jest.Mock).mockResolvedValue('mock_sender_address');
      (bsvService.wallet.getUtxos as jest.Mock).mockResolvedValue([]);
      (securityService.validateTransferParams as jest.Mock).mockResolvedValue(true);

      await expect(
        service.createTransferTransaction(mockSourceTxId, mockRecipientAddress)
      ).rejects.toThrow(BSVError);
    });
  });

  describe('verifyTransfer', () => {
    it('should verify a completed transfer', async () => {
      (verificationService.checkTransactionConfirmations as jest.Mock).mockResolvedValue({
        confirmed: true,
        confirmations: 6
      });
      (verificationService.validateOwnership as jest.Mock).mockResolvedValue(true);
      (bsvService.getTransactionStatus as jest.Mock).mockResolvedValue({
        confirmations: 6,
        timestamp: Date.now()
      });

      const result = await service.verifyTransfer(mockTransferTxId, mockRecipientAddress);
      expect(result).toBe(true);
    });

    it('should return false if not enough confirmations', async () => {
      (verificationService.checkTransactionConfirmations as jest.Mock).mockResolvedValue({
        confirmed: false,
        confirmations: 2
      });

      const result = await service.verifyTransfer(mockTransferTxId, mockRecipientAddress);
      expect(result).toBe(false);
    });
  });

  describe('getTransferStatus', () => {
    it('should return transfer status', async () => {
      (bsvService.getTransactionStatus as jest.Mock).mockResolvedValue({
        confirmations: 3,
        timestamp: Date.now()
      });

      const result = await service.getTransferStatus(mockTransferTxId);
      expect(result.confirmations).toBe(3);
      expect(result.confirmed).toBe(false);
    });

    it('should throw error if status fetch fails', async () => {
      (bsvService.getTransactionStatus as jest.Mock).mockRejectedValue(
        new BSVError('FETCH_ERROR', 'Failed to fetch transaction status')
      );

      await expect(
        service.getTransferStatus(mockTransferTxId)
      ).rejects.toThrow(BSVError);
    });
  });
}); 