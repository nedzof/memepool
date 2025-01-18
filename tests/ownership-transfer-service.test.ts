import { BSVService } from '../src/services/bsv-service';
import { TransactionVerificationService } from '../src/services/transaction-verification-service';
import { InscriptionSecurityService } from '../src/services/inscription-security-service';
import { Script, Transaction, P2PKH, PublicKey, Signature } from '@bsv/sdk';
import { BSVError } from '../src/types';
import { OwnershipTransferService } from '../src/services/ownership-transfer-service';
import { UTXO } from '../src/types/bsv';

jest.mock('../src/services/bsv-service');
jest.mock('../src/services/transaction-verification-service');
jest.mock('../src/services/inscription-security-service');
jest.mock('@bsv/sdk', () => {
  const originalModule = jest.requireActual('@bsv/sdk');

  class MockScript {
    private hex: string;

    constructor(hex = '') {
      this.hex = hex;
    }

    static fromHex(hex: string) {
      return new MockScript(hex);
    }

    toHex() {
      return this.hex;
    }

    add(data: Buffer) {
      this.hex += data.toString('hex');
    }

    toBuffer() {
      return Buffer.from(this.hex, 'hex');
    }
  }

  class MockTransaction {
    public inputs: any[] = [];
    public outputs: any[] = [];
    private hex: string = '';

    public addInput: jest.Mock;
    public addOutput: jest.Mock;
    public fee: jest.Mock;
    public sign: jest.Mock;
    public getSignaturePreimage: jest.Mock;

    constructor() {
      this.addInput = jest.fn().mockImplementation((input) => {
        this.inputs.push(input);
        return this;
      });
      this.addOutput = jest.fn().mockImplementation((output) => {
        this.outputs.push(output);
        return this;
      });
      this.fee = jest.fn().mockResolvedValue(undefined);
      this.sign = jest.fn().mockResolvedValue(undefined);
      this.getSignaturePreimage = jest.fn().mockReturnValue(Buffer.from('mock_preimage'));
    }

    static fromHex(hex: string) {
      const tx = new MockTransaction();
      tx.hex = hex;
      return tx;
    }

    toHex() {
      return this.hex;
    }
  }

  class MockP2PKH {
    lock(address: string) {
      return new MockScript('76a914mock88ac');
    }

    unlock(privateKey: any) {
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
    Transaction: MockTransaction,
    Script: MockScript,
    P2PKH: MockP2PKH
  };
});

describe('OwnershipTransferService', () => {
  let service: OwnershipTransferService;
  let bsvService: jest.Mocked<BSVService>;
  let verificationService: jest.Mocked<TransactionVerificationService>;
  let securityService: jest.Mocked<InscriptionSecurityService>;
  
  // Mock transaction data
  const mockTxHex = '0100000001c6e21c0c9d3e0bb2ad6689cd877c0c234d8cd5e0a76e6f8acd8a615a06d87738000000006a47304402207f8c3f0b244e6e96a82603f04546d1c017c5386f82c7e3d7a8c29f3aa6c156f902205f1e6cbba2e11823ed3f38f7fd88e3d57b66a9448be7d2c07c72d55273e6e7c7412102f7ae76d41d0099e04912bf0c132ee2f1e060be0e4133b69ca50ad7ea8a58b8e0ffffffff02e8030000000000001976a914d8b6fcc85a383261df05423ddf068a8987bf0d7f88ac0000000000000000066a044d454d4500000000';
  const mockTransferTxId = 'mock_transfer_tx_id';
  const mockRecipientAddress = 'mock_recipient_address';
  const mockSourceTxId = 'mock_source_tx_id';
  const mockSourceOutputIndex = 0;

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
      const mockUtxo: UTXO = {
        txId: mockSourceTxId,
        outputIndex: mockSourceOutputIndex,
        script: Script.fromHex(
          '76a914d8b6fcc85a383261df05423ddf068a8987bf0d7f88ac' + // P2PKH script
          '6a20' + '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' + // Inscription ID
          '6a044d454d45' // MEME marker
        ),
        satoshis: 1,
        sourceTransaction: Transaction.fromHex(mockTxHex)
      };

      // Mock additional UTXO for fees
      const mockFeeUtxo: UTXO = {
        txId: 'mock_fee_utxo',
        outputIndex: 0,
        script: Script.fromHex('76a914d8b6fcc85a383261df05423ddf068a8987bf0d7f88ac'),
        satoshis: 10000, // Increased to ensure enough for fees
        sourceTransaction: Transaction.fromHex(mockTxHex)
      };

      // Mock the fetch responses
      (bsvService.wallet.fetchWithRetry as jest.Mock).mockImplementation(async (url: string) => {
        if (url.includes('/hex')) {
          return {
            ok: true,
            text: async () => mockTxHex
          };
        }
        return {
          ok: true,
          json: async () => ({
            txid: mockSourceTxId,
            hash: mockSourceTxId,
            version: 1,
            size: 225,
            locktime: 0,
            vin: [{
              txid: "7387d8065a618acd8a6f6ea7e0d58c4d230c7c87cd8966adb20b3e9d0c1ce2c6",
              vout: 0,
              scriptSig: {
                asm: "304402207f8c3f0b244e6e96a82603f04546d1c017c5386f82c7e3d7a8c29f3aa6c156f902205f1e6cbba2e11823ed3f38f7fd88e3d57b66a9448be7d2c07c72d55273e6e7c7412102f7ae76d41d0099e04912bf0c132ee2f1e060be0e4133b69ca50ad7ea8a58b8e0",
                hex: "47304402207f8c3f0b244e6e96a82603f04546d1c017c5386f82c7e3d7a8c29f3aa6c156f902205f1e6cbba2e11823ed3f38f7fd88e3d57b66a9448be7d2c07c72d55273e6e7c7412102f7ae76d41d0099e04912bf0c132ee2f1e060be0e4133b69ca50ad7ea8a58b8e0"
              },
              sequence: 4294967295
            }],
            vout: [
              {
                value: 0.00001,
                n: 0,
                scriptPubKey: {
                  asm: "OP_DUP OP_HASH160 d8b6fcc85a383261df05423ddf068a8987bf0d7f OP_EQUALVERIFY OP_CHECKSIG",
                  hex: "76a914d8b6fcc85a383261df05423ddf068a8987bf0d7f88ac",
                  reqSigs: 1,
                  type: "pubkeyhash",
                  addresses: ["1LZk8TPrt7UDMQrqpxuDcX3mZoKnwtEa9K"]
                }
              },
              {
                value: 0.00000001,
                n: 1,
                scriptPubKey: {
                  asm: "OP_RETURN 4d454d45",
                  hex: "6a044d454d45",
                  type: "nonstandard"
                }
              }
            ]
          })
        };
      });

      (bsvService.wallet.getUtxos as jest.Mock).mockResolvedValue([mockUtxo, mockFeeUtxo]);
      (bsvService.getWalletAddress as jest.Mock).mockResolvedValue('mock_sender_address');
      (securityService.validateTransferParams as jest.Mock).mockResolvedValue(true);
      (securityService.verifyOwnershipForTransfer as jest.Mock).mockResolvedValue(true);

      const result = await service.createTransferTransaction(mockSourceTxId, mockRecipientAddress);
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