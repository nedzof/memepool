import { RecoveryProgressService } from '../src/services/recovery-progress-service';

describe('RecoveryProgressService', () => {
    let service;

    beforeEach(() => {
        service = new RecoveryProgressService();
    });

    describe('saveCheckpoint', () => {
        it('should save checkpoint data', async () => {
            const state = {
                currentBlock: 100,
                processedBlocks: 50
            };

            const result = await service.saveCheckpoint(100, state);
            expect(result).toBe(true);
            expect(service.recoveryState.checkpoints.has(100)).toBe(true);
            expect(service.recoveryState.lastCheckpoint).toBe(100);
        });

        it('should maintain only last 5 checkpoints', async () => {
            for (let i = 1; i <= 7; i++) {
                await service.saveCheckpoint(i * 100, { block: i * 100 });
            }

            const checkpoints = Array.from(service.recoveryState.checkpoints.keys()).sort((a, b) => a - b);
            expect(checkpoints.length).toBe(5);
            expect(checkpoints[0]).toBe(300); // First two checkpoints should be removed
            expect(checkpoints[4]).toBe(700);
        });
    });

    describe('restoreFromCheckpoint', () => {
        it('should restore state from checkpoint', async () => {
            const state = {
                currentBlock: 100,
                processedBlocks: 50
            };
            await service.saveCheckpoint(100, state);

            const result = await service.restoreFromCheckpoint(100);
            expect(result).toBe(true);
            expect(service.recoveryState.currentBlock).toBe(101);
            expect(service.recoveryState.lastProcessedHeight).toBe(100);
        });

        it('should handle non-existent checkpoint', async () => {
            const result = await service.restoreFromCheckpoint(999);
            expect(result).toBe(false);
        });
    });

    describe('getRecoveryStatus', () => {
        it('should calculate progress correctly', () => {
            service.recoveryState.processedBlocks = 50;
            service.recoveryState.totalBlocks = 100;

            const status = service.getRecoveryStatus();
            expect(status.progress).toBe('50.00');
            expect(status.processedBlocks).toBe(50);
            expect(status.totalBlocks).toBe(100);
        });

        it('should handle zero total blocks', () => {
            const status = service.getRecoveryStatus();
            expect(status.progress).toBe('0.00');
        });
    });

    describe('addPartialData', () => {
        it('should add partial data for retry', () => {
            const data = { txid: 'tx123', error: 'test error' };
            service.addPartialData('tx123', data);

            expect(service.recoveryState.partialData.has('tx123')).toBe(true);
            expect(service.recoveryState.partialData.get('tx123')).toEqual(data);
        });
    });

    describe('getPartialData', () => {
        it('should return all partial data entries', () => {
            service.addPartialData('tx1', { data: 'test1' });
            service.addPartialData('tx2', { data: 'test2' });

            const partialData = service.getPartialData();
            expect(partialData.length).toBe(2);
            expect(partialData).toEqual([
                ['tx1', { data: 'test1' }],
                ['tx2', { data: 'test2' }]
            ]);
        });
    });

    describe('clearPartialData', () => {
        it('should clear specific partial data entry', () => {
            service.addPartialData('tx1', { data: 'test1' });
            service.addPartialData('tx2', { data: 'test2' });

            service.clearPartialData('tx1');
            expect(service.recoveryState.partialData.has('tx1')).toBe(false);
            expect(service.recoveryState.partialData.has('tx2')).toBe(true);
        });
    });

    describe('updateState', () => {
        it('should update recovery state', () => {
            const updates = {
                currentBlock: 200,
                processedBlocks: 150,
                isRunning: true
            };

            service.updateState(updates);
            expect(service.recoveryState.currentBlock).toBe(200);
            expect(service.recoveryState.processedBlocks).toBe(150);
            expect(service.recoveryState.isRunning).toBe(true);
        });
    });

    describe('addError', () => {
        it('should add error with timestamp', () => {
            const errorMessage = 'Test error';
            service.addError(errorMessage);

            expect(service.recoveryState.errors.length).toBe(1);
            expect(service.recoveryState.errors[0].message).toBe(errorMessage);
            expect(service.recoveryState.errors[0].timestamp).toBeDefined();
        });
    });

    describe('clearErrors', () => {
        it('should clear all errors', () => {
            service.addError('Error 1');
            service.addError('Error 2');

            service.clearErrors();
            expect(service.recoveryState.errors).toEqual([]);
        });
    });
}); 