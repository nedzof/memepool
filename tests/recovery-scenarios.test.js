import { RecoveryService } from '../src/services/recovery-service';
import { BlockchainService } from '../src/services/blockchain-service';
import { InscriptionIndexService } from '../src/services/inscription-index-service';
import { TransactionCacheService } from '../src/services/transaction-cache-service';
import { VerificationService } from '../src/services/verification-service';
import { RecoveryProgressService } from '../src/services/recovery-progress-service';

// Mock data
const mockBlocks = Array.from({ length: 1000 }, (_, i) => ({
    height: i + 1,
    hash: `blockhash${i + 1}`,
    transactions: [
        {
            txid: `tx${i + 1}`,
            vout: [{
                scriptPubKey: {
                    hex: '6a' + Buffer.from(JSON.stringify({
                        type: 'meme',
                        content: {
                            timestamp: Date.now(),
                            data: 'test_content'
                        }
                    })).toString('hex')
                }
            }]
        }
    ]
}));

// Mock blockchain service
jest.mock('../src/services/blockchain-service', () => {
    return {
        BlockchainService: jest.fn().mockImplementation(() => ({
            getBlockTransactions: jest.fn().mockImplementation(async (start, end) => {
                return mockBlocks.slice(start - 1, end).flatMap(block => block.transactions);
            }),
            getBlockTransactionDetails: jest.fn().mockImplementation(async (blockHash) => {
                const block = mockBlocks.find(b => b.hash === blockHash);
                return block ? block.transactions : [];
            }),
            verifyBlockHash: jest.fn().mockImplementation(async (hash, height) => {
                const block = mockBlocks[height - 1];
                return block && block.hash === hash;
            })
        }))
    };
});

describe('Recovery Scenarios', () => {
    let recoveryService;

    beforeEach(() => {
        recoveryService = new RecoveryService();
    });

    describe('Basic Recovery', () => {
        it('should recover inscriptions from a small range of blocks', async () => {
            await recoveryService.initialize();
            const startBlock = 1;
            const endBlock = 10;
            
            await recoveryService.startProgressiveRecovery(startBlock, endBlock);
            const status = recoveryService.getRecoveryStatus();
            
            expect(status.processedBlocks).toBe(endBlock - startBlock + 1);
            expect(status.isRunning).toBe(false);
        });

        it('should handle empty blocks gracefully', async () => {
            // Temporarily modify mock data for this test
            const originalBlocks = [...mockBlocks];
            mockBlocks.splice(0, 10, ...Array(10).fill({ transactions: [] }));
            
            await recoveryService.initialize();
            await recoveryService.startProgressiveRecovery(1, 10);
            const status = recoveryService.getRecoveryStatus();
            
            expect(status.processedBlocks).toBe(10);
            expect(status.errors.length).toBe(0);
            
            // Restore mock data
            mockBlocks.splice(0, 10, ...originalBlocks.slice(0, 10));
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors and retry', async () => {
            const mockError = new Error('Network error');
            const originalGetTransactions = BlockchainService.prototype.getBlockTransactions;
            
            // Mock network error on first attempt
            let attempts = 0;
            const mockGetTransactions = jest.fn().mockImplementation(async () => {
                if (attempts++ === 0) {
                    throw mockError;
                }
                return mockBlocks[0].transactions;
            });

            // Replace the mock implementation
            jest.spyOn(recoveryService.blockchainService, 'getBlockTransactions')
                .mockImplementation(mockGetTransactions);
            
            await recoveryService.initialize();
            await recoveryService.startProgressiveRecovery(1, 1);
            const status = recoveryService.getRecoveryStatus();
            
            expect(mockGetTransactions).toHaveBeenCalledTimes(1);
            expect(status.errors[0].message).toBe('Error processing batch 1-1: Network error');
            expect(status.errors[0].timestamp).toBeGreaterThan(0);
            expect(status.processedBlocks).toBe(1);
            
            // Restore original mock
            jest.restoreAllMocks();
        });
    });

    describe('Performance Testing', () => {
        it('should process large batches efficiently', async () => {
            const startBlock = 1;
            const endBlock = 1000;
            const startTime = Date.now();
            
            await recoveryService.initialize();
            await recoveryService.startProgressiveRecovery(startBlock, endBlock);
            const endTime = Date.now();
            const status = recoveryService.getRecoveryStatus();
            
            expect(status.processedBlocks).toBe(endBlock - startBlock + 1);
            expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
        });

        it('should maintain memory usage during large recoveries', async () => {
            const startBlock = 1;
            const endBlock = 1000;
            const initialMemory = process.memoryUsage().heapUsed;
            
            await recoveryService.initialize();
            await recoveryService.startProgressiveRecovery(startBlock, endBlock);
            const finalMemory = process.memoryUsage().heapUsed;
            
            // Memory increase should be reasonable (less than 100MB)
            expect(finalMemory - initialMemory).toBeLessThan(100 * 1024 * 1024);
        });
    });

    describe('Recovery Progress', () => {
        it('should report progress accurately', async () => {
            const progressUpdates = [];
            const progressCallback = (status) => progressUpdates.push({ ...status });
            
            await recoveryService.initialize();
            await recoveryService.startProgressiveRecovery(1, 100, progressCallback);
            
            expect(progressUpdates.length).toBeGreaterThan(0);
            expect(progressUpdates[progressUpdates.length - 1].processedBlocks).toBe(100);
            expect(progressUpdates).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        isRunning: expect.any(Boolean),
                        processedBlocks: expect.any(Number),
                        totalBlocks: expect.any(Number)
                    })
                ])
            );
        });
    });
}); 