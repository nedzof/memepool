import { OwnershipTransferService } from '../src/services/ownership-transfer-service';
import { BSVService } from '../src/services/bsv-service';
import { TransactionVerificationService } from '../src/services/transaction-verification-service';

jest.mock('../src/services/bsv-service');
jest.mock('../src/services/transaction-verification-service');

describe('OwnershipTransferService', () => {
    let ownershipTransferService;
    let mockBsvService;
    let mockVerificationService;
    
    const mockWallet = {
        getAddress: jest.fn(),
        getUtxos: jest.fn(),
        signTransaction: jest.fn(),
        broadcastTransaction: jest.fn()
    };

    const mockTransaction = {
        from: jest.fn().mockReturnThis(),
        to: jest.fn().mockReturnThis(),
        change: jest.fn().mockReturnThis(),
        fee: jest.fn().mockReturnThis()
    };

    beforeEach(() => {
        mockBsvService = new BSVService();
        mockVerificationService = new TransactionVerificationService();
        
        // Setup BSV service mocks
        mockBsvService.wallet = mockWallet;
        mockBsvService.bsv = {
            Transaction: jest.fn().mockImplementation(() => mockTransaction)
        };
        mockBsvService.getWalletAddress.mockResolvedValue('testAddress');
        mockBsvService.getTransactionStatus.mockResolvedValue({
            confirmations: 6,
            timestamp: Date.now()
        });

        // Setup verification service mocks
        mockVerificationService.validateOwnership.mockResolvedValue(true);

        ownershipTransferService = new OwnershipTransferService(mockBsvService, mockVerificationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createTransferTransaction', () => {
        const inscriptionTxId = 'testInscriptionTxId';
        const recipientAddress = 'testRecipientAddress';

        it('should create a transfer transaction successfully', async () => {
            mockWallet.getUtxos.mockResolvedValue([]);
            mockWallet.signTransaction.mockResolvedValue('signedTx');
            mockWallet.broadcastTransaction.mockResolvedValue('transferTxId');

            const result = await ownershipTransferService.createTransferTransaction(
                inscriptionTxId,
                recipientAddress
            );

            expect(result).toBe('transferTxId');
            expect(mockVerificationService.validateOwnership).toHaveBeenCalledWith('testAddress', inscriptionTxId);
            expect(mockTransaction.to).toHaveBeenCalledWith(recipientAddress, 0);
            expect(mockTransaction.fee).toHaveBeenCalledWith(1);
        });

        it('should throw error if wallet not connected', async () => {
            mockBsvService.wallet = null;

            await expect(
                ownershipTransferService.createTransferTransaction(inscriptionTxId, recipientAddress)
            ).rejects.toThrow('Wallet not connected');
        });

        it('should throw error if not the owner', async () => {
            mockVerificationService.validateOwnership.mockResolvedValue(false);

            await expect(
                ownershipTransferService.createTransferTransaction(inscriptionTxId, recipientAddress)
            ).rejects.toThrow('Not the current owner of the inscription');
        });
    });

    describe('verifyTransfer', () => {
        const transferTxId = 'testTransferTxId';
        const recipientAddress = 'testRecipientAddress';

        it('should verify transfer successfully', async () => {
            const result = await ownershipTransferService.verifyTransfer(
                transferTxId,
                recipientAddress
            );

            expect(result).toBe(true);
            expect(mockBsvService.getTransactionStatus).toHaveBeenCalledWith(transferTxId);
            expect(mockVerificationService.validateOwnership).toHaveBeenCalledWith(recipientAddress, transferTxId);
        });

        it('should return false if not enough confirmations', async () => {
            mockBsvService.getTransactionStatus.mockResolvedValue({
                confirmations: 3,
                timestamp: Date.now()
            });

            const result = await ownershipTransferService.verifyTransfer(
                transferTxId,
                recipientAddress
            );

            expect(result).toBe(false);
        });

        it('should return false if ownership validation fails', async () => {
            mockVerificationService.validateOwnership.mockResolvedValue(false);

            const result = await ownershipTransferService.verifyTransfer(
                transferTxId,
                recipientAddress
            );

            expect(result).toBe(false);
        });
    });

    describe('getTransferStatus', () => {
        const transferTxId = 'testTransferTxId';

        it('should get transfer status successfully', async () => {
            const timestamp = Date.now();
            mockBsvService.getTransactionStatus.mockResolvedValue({
                confirmations: 6,
                timestamp
            });

            const result = await ownershipTransferService.getTransferStatus(transferTxId);

            expect(result).toEqual({
                confirmed: true,
                confirmations: 6,
                timestamp,
                complete: true
            });
        });

        it('should handle incomplete transfer status', async () => {
            const timestamp = Date.now();
            mockBsvService.getTransactionStatus.mockResolvedValue({
                confirmations: 3,
                timestamp
            });

            const result = await ownershipTransferService.getTransferStatus(transferTxId);

            expect(result).toEqual({
                confirmed: false,
                confirmations: 3,
                timestamp,
                complete: false
            });
        });

        it('should throw error on status fetch failure', async () => {
            mockBsvService.getTransactionStatus.mockRejectedValue(new Error('Failed to get status'));

            await expect(
                ownershipTransferService.getTransferStatus(transferTxId)
            ).rejects.toThrow('Failed to get status');
        });
    });
}); 