import { RecoveryService } from '../src/services/recovery-service';
import { BlockchainService } from '../src/services/blockchain-service';
import { InscriptionIndexService } from '../src/services/inscription-index-service';
import { TransactionCacheService } from '../src/services/transaction-cache-service';
import { VerificationService } from '../src/services/verification-service';
import { RecoveryProgressService } from '../src/services/recovery-progress-service';

jest.mock('../src/services/blockchain-service');
jest.mock('../src/services/inscription-index-service');
jest.mock('../src/services/transaction-cache-service');
jest.mock('../src/services/verification-service');
jest.mock('../src/services/recovery-progress-service');

describe('RecoveryService', () => {
    let service;
    let mockBlockchainService;
    let mockInscriptionIndexService;
    let mockTransactionCacheService;
    let mockVerificationService;
    let mockProgressService;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock instances
        mockBlockchainService = new BlockchainService();
        mockInscriptionIndexService = new InscriptionIndexService();
        mockTransactionCacheService = new TransactionCacheService();
        mockVerificationService = new VerificationService();
        mockProgressService = new RecoveryProgressService();

        // Create service instance
        service = new RecoveryService();

        // Replace service dependencies with mocks
        service.blockchainService = mockBlockchainService;
        service.inscriptionIndexService = mockInscriptionIndexService;
        service.transactionCacheService = mockTransactionCacheService;
        service.verificationService = mockVerificationService;
        service.progressService = mockProgressService;
    });

    describe('initialize', () => {
        it('should initialize inscription index service', async () => {
            mockInscriptionIndexService.initialize.mockResolvedValue(true);

            const result = await service.initialize();
            expect(result).toBe(true);
            expect(mockInscriptionIndexService.initialize).toHaveBeenCalled();
        });
    });

    describe('startProgressiveRecovery', () => {
        it('should start recovery process', async () => {
            mockProgressService.recoveryState = { isRunning: false };
            const progressCallback = jest.fn();

            await service.startProgressiveRecovery(100, 200, progressCallback);

            expect(mockProgressService.updateState).toHaveBeenCalledWith({
                isRunning: true,
                currentBlock: 100,
                processedBlocks: 0,
                totalBlocks: 101,
                errors: []
            });
        });

        it('should prevent multiple concurrent recoveries', async () => {
            mockProgressService.recoveryState = { isRunning: true };
            const progressCallback = jest.fn();

            await expect(service.startProgressiveRecovery(100, 200, progressCallback))
                .rejects
                .toThrow('Recovery process already running');
            expect(progressCallback).not.toHaveBeenCalled();
        });
    });

    describe('processBlocksProgressively', () => {
        it('should process blocks in batches', async () => {
            const progressCallback = jest.fn();
            mockBlockchainService.getBlockTransactions.mockResolvedValue([]);
            mockProgressService.getRecoveryStatus.mockReturnValue({ progress: '50.00' });

            await service.processBlocksProgressively(100, 200, progressCallback);

            expect(mockBlockchainService.getBlockTransactions).toHaveBeenCalled();
            expect(progressCallback).toHaveBeenCalled();
            expect(mockProgressService.updateState).toHaveBeenCalled();
        });

        it('should save checkpoints at intervals', async () => {
            mockBlockchainService.getBlockTransactions.mockResolvedValue([]);
            mockProgressService.CHECKPOINT_INTERVAL = 100;

            await service.processBlocksProgressively(100, 300);

            expect(mockProgressService.saveCheckpoint).toHaveBeenCalled();
        });
    });

    describe('processBatch', () => {
        it('should process transactions in batch', async () => {
            const mockTransactions = [
                { txid: 'tx1' },
                { txid: 'tx2' }
            ];
            mockBlockchainService.getBlockTransactions.mockResolvedValue(mockTransactions);

            await service.processBatch(100, 110);

            expect(mockBlockchainService.getBlockTransactions).toHaveBeenCalledWith(100, 110);
        });

        it('should handle batch processing errors', async () => {
            mockBlockchainService.getBlockTransactions.mockRejectedValue(new Error('API error'));

            const result = await service.processBatch(100, 110);
            expect(result).toBe(false);
            expect(mockProgressService.addError).toHaveBeenCalledWith(
                expect.stringContaining('Error processing batch 100-110: API error')
            );
        });
    });

    describe('processTransaction', () => {
        const mockTransaction = {
            txid: 'tx123',
            vout: [{
                scriptPubKey: {
                    type: 'nulldata',
                    hex: 'test'
                }
            }],
            blockhash: 'block123',
            blockheight: 100
        };

        it('should skip cached transactions', async () => {
            mockTransactionCacheService.getCachedTransaction.mockReturnValue({ cached: true });

            const result = await service.processTransaction(mockTransaction);
            expect(result).toEqual({ cached: true });
            expect(mockVerificationService.isInscriptionTransaction).not.toHaveBeenCalled();
        });

        it('should process and verify new inscriptions', async () => {
            mockTransactionCacheService.getCachedTransaction.mockReturnValue(null);
            mockVerificationService.isInscriptionTransaction.mockReturnValue(true);
            mockVerificationService.verifyInscription.mockResolvedValue({
                verified: true,
                inscription: { content: { id: 'test' } }
            });

            await service.processTransaction(mockTransaction);

            expect(mockInscriptionIndexService.addToIndex).toHaveBeenCalled();
            expect(mockTransactionCacheService.cacheTransaction).toHaveBeenCalled();
        });

        it('should handle failed verifications', async () => {
            mockTransactionCacheService.getCachedTransaction.mockReturnValue(null);
            mockVerificationService.isInscriptionTransaction.mockReturnValue(true);
            mockVerificationService.verifyInscription.mockResolvedValue({
                verified: false,
                errors: ['Verification failed']
            });

            await service.processTransaction(mockTransaction);

            expect(mockProgressService.addPartialData).toHaveBeenCalled();
        });
    });

    describe('resumeRecovery', () => {
        it('should resume from last checkpoint', async () => {
            mockProgressService.recoveryState = {
                lastCheckpoint: 100
            };
            const progressCallback = jest.fn();

            await service.resumeRecovery(200, progressCallback);

            expect(mockProgressService.restoreFromCheckpoint).toHaveBeenCalledWith(100);
        });

        it('should throw error if no checkpoint exists', async () => {
            mockProgressService.recoveryState = {
                lastCheckpoint: null
            };

            await expect(service.resumeRecovery(200)).rejects.toThrow('No checkpoint found to resume from');
        });
    });

    describe('getRecoveryStatus', () => {
        it('should return current recovery status', () => {
            const mockStatus = {
                isRunning: true,
                progress: '50.00'
            };
            mockProgressService.getRecoveryStatus.mockReturnValue(mockStatus);

            const status = service.getRecoveryStatus();
            expect(status).toEqual(mockStatus);
        });
    });

    describe('getInscription', () => {
        it('should retrieve inscription by content ID', () => {
            const mockInscription = { content: { id: 'test' } };
            mockInscriptionIndexService.getInscription.mockReturnValue(mockInscription);

            const result = service.getInscription('test');
            expect(result).toEqual(mockInscription);
        });
    });

    describe('getAllInscriptions', () => {
        it('should retrieve all inscriptions', () => {
            const mockInscriptions = [
                { content: { id: 'test1' } },
                { content: { id: 'test2' } }
            ];
            mockInscriptionIndexService.getAllInscriptions.mockReturnValue(mockInscriptions);

            const result = service.getAllInscriptions();
            expect(result).toEqual(mockInscriptions);
        });
    });

    describe('getVerifiedInscriptions', () => {
        it('should retrieve verified inscriptions', () => {
            const mockVerifiedInscriptions = [
                { content: { id: 'test1' }, verified: true }
            ];
            mockInscriptionIndexService.getVerifiedInscriptions.mockReturnValue(mockVerifiedInscriptions);

            const result = service.getVerifiedInscriptions();
            expect(result).toEqual(mockVerifiedInscriptions);
        });
    });
}); 