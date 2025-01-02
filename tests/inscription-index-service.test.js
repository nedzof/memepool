import { InscriptionIndexService } from '../src/services/inscription-index-service';

describe('InscriptionIndexService', () => {
    let service;
    const mockInscription = {
        content: {
            id: 'test123',
            metadata: { title: 'Test' },
            creator: 'creator123',
            timestamp: Date.now()
        }
    };

    beforeEach(() => {
        service = new InscriptionIndexService();
    });

    describe('initialize', () => {
        it('should clear all indices', async () => {
            service.recoveryIndex.set('test', 'data');
            service.blockHeightIndex.set(1, new Set(['test']));
            service.contentIdMap.set('test', { verified: true });

            await service.initialize();

            expect(service.recoveryIndex.size).toBe(0);
            expect(service.blockHeightIndex.size).toBe(0);
            expect(service.contentIdMap.size).toBe(0);
        });
    });

    describe('addToIndex', () => {
        it('should add inscription to all indices', () => {
            service.addToIndex(mockInscription, 'txid123', 100);

            expect(service.recoveryIndex.has(mockInscription.content.id)).toBe(true);
            expect(service.blockHeightIndex.has(100)).toBe(true);
            expect(service.contentIdMap.has(mockInscription.content.id)).toBe(true);
        });

        it('should update existing block height index', () => {
            service.addToIndex(mockInscription, 'txid123', 100);
            const anotherInscription = {
                content: {
                    id: 'test456',
                    metadata: { title: 'Another Test' },
                    creator: 'creator123',
                    timestamp: Date.now()
                }
            };
            service.addToIndex(anotherInscription, 'txid456', 100);

            const heightIndex = service.blockHeightIndex.get(100);
            expect(heightIndex.size).toBe(2);
            expect(heightIndex.has(mockInscription.content.id)).toBe(true);
            expect(heightIndex.has(anotherInscription.content.id)).toBe(true);
        });
    });

    describe('getInscriptionsByHeight', () => {
        it('should return inscriptions at specified height', () => {
            service.addToIndex(mockInscription, 'txid123', 100);

            const inscriptions = service.getInscriptionsByHeight(100);
            expect(inscriptions.length).toBe(1);
            expect(inscriptions[0].txid).toBe('txid123');
        });

        it('should return empty array for non-existent height', () => {
            const inscriptions = service.getInscriptionsByHeight(999);
            expect(inscriptions).toEqual([]);
        });
    });

    describe('getInscription', () => {
        it('should return inscription by content ID', () => {
            service.addToIndex(mockInscription, 'txid123', 100);

            const inscription = service.getInscription(mockInscription.content.id);
            expect(inscription.txid).toBe('txid123');
            expect(inscription.blockHeight).toBe(100);
        });

        it('should return null for non-existent content ID', () => {
            const inscription = service.getInscription('nonexistent');
            expect(inscription).toBeNull();
        });
    });

    describe('getInscriptionStatus', () => {
        it('should return status by content ID', () => {
            service.addToIndex(mockInscription, 'txid123', 100);

            const status = service.getInscriptionStatus(mockInscription.content.id);
            expect(status.txid).toBe('txid123');
            expect(status.blockHeight).toBe(100);
            expect(status.verified).toBe(false);
        });

        it('should return null for non-existent content ID', () => {
            const status = service.getInscriptionStatus('nonexistent');
            expect(status).toBeNull();
        });
    });

    describe('getAllInscriptions', () => {
        it('should return all indexed inscriptions', () => {
            service.addToIndex(mockInscription, 'txid123', 100);
            const anotherInscription = {
                content: {
                    id: 'test456',
                    metadata: { title: 'Another Test' },
                    creator: 'creator123',
                    timestamp: Date.now()
                }
            };
            service.addToIndex(anotherInscription, 'txid456', 101);

            const inscriptions = service.getAllInscriptions();
            expect(inscriptions.length).toBe(2);
        });

        it('should return empty array when no inscriptions', () => {
            const inscriptions = service.getAllInscriptions();
            expect(inscriptions).toEqual([]);
        });
    });

    describe('setVerificationStatus', () => {
        it('should update verification status', () => {
            service.addToIndex(mockInscription, 'txid123', 100);
            service.setVerificationStatus(mockInscription.content.id, true);

            const status = service.getInscriptionStatus(mockInscription.content.id);
            expect(status.verified).toBe(true);
        });

        it('should handle non-existent content ID', () => {
            service.setVerificationStatus('nonexistent', true);
            expect(service.contentIdMap.has('nonexistent')).toBe(false);
        });
    });

    describe('getVerifiedInscriptions', () => {
        it('should return only verified inscriptions', () => {
            service.addToIndex(mockInscription, 'txid123', 100);
            const anotherInscription = {
                content: {
                    id: 'test456',
                    metadata: { title: 'Another Test' },
                    creator: 'creator123',
                    timestamp: Date.now()
                }
            };
            service.addToIndex(anotherInscription, 'txid456', 101);
            service.setVerificationStatus(mockInscription.content.id, true);

            const verified = service.getVerifiedInscriptions();
            expect(verified.length).toBe(1);
            expect(verified[0].txid).toBe('txid123');
        });
    });

    describe('getBlockHeightStats', () => {
        it('should return correct statistics', () => {
            service.addToIndex(mockInscription, 'txid123', 100);
            const anotherInscription = {
                content: {
                    id: 'test456',
                    metadata: { title: 'Another Test' },
                    creator: 'creator123',
                    timestamp: Date.now()
                }
            };
            service.addToIndex(anotherInscription, 'txid456', 101);

            const stats = service.getBlockHeightStats();
            expect(stats.totalBlocks).toBe(2);
            expect(stats.minHeight).toBe(100);
            expect(stats.maxHeight).toBe(101);
            expect(stats.inscriptionCount).toBe(2);
        });

        it('should handle empty indices', () => {
            const stats = service.getBlockHeightStats();
            expect(stats.totalBlocks).toBe(0);
            expect(stats.inscriptionCount).toBe(0);
        });
    });
}); 