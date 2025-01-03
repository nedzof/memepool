import { VerificationService } from '../src/services/verification-service';
import { BlockchainService } from '../src/services/blockchain-service';

jest.mock('../src/services/blockchain-service');

describe('VerificationService', () => {
    let service;
    let mockBlockchainService;

    beforeEach(() => {
        mockBlockchainService = new BlockchainService();
        service = new VerificationService(mockBlockchainService);
    });

    describe('isInscriptionTransaction', () => {
        it('should identify valid inscription transactions', () => {
            const tx = {
                vout: [{
                    scriptPubKey: {
                        type: 'nulldata',
                        asm: 'OP_RETURN',
                        hex: Buffer.from(JSON.stringify({
                            type: 'memepool',
                            version: '1.0',
                            data: 'test'
                        })).toString('hex')
                    }
                }]
            };

            const result = service.isInscriptionTransaction(tx);
            expect(result).toBe(true);
        });

        it('should reject non-inscription transactions', () => {
            const tx = {
                vout: [{
                    scriptPubKey: {
                        type: 'nulldata',
                        asm: 'OP_RETURN',
                        hex: Buffer.from('invalid data').toString('hex')
                    }
                }]
            };

            const result = service.isInscriptionTransaction(tx);
            expect(result).toBe(false);
        });

        it('should handle missing OP_RETURN output', () => {
            const tx = {
                vout: [{
                    scriptPubKey: {
                        type: 'pubkeyhash'
                    }
                }]
            };

            const result = service.isInscriptionTransaction(tx);
            expect(result).toBe(false);
        });

        it('should handle malformed vout array', () => {
            const tx = {
                vout: null
            };
            const result = service.isInscriptionTransaction(tx);
            expect(result).toBe(false);
        });

        it('should handle missing scriptPubKey', () => {
            const tx = {
                vout: [{
                    // missing scriptPubKey
                }]
            };
            const result = service.isInscriptionTransaction(tx);
            expect(result).toBe(false);
        });

        it('should handle invalid version in inscription data', () => {
            const tx = {
                vout: [{
                    scriptPubKey: {
                        type: 'nulldata',
                        asm: 'OP_RETURN',
                        hex: Buffer.from(JSON.stringify({
                            type: 'memepool',
                            version: '2.0', // invalid version
                            data: 'test'
                        })).toString('hex')
                    }
                }]
            };
            const result = service.isInscriptionTransaction(tx);
            expect(result).toBe(false);
        });
    });

    describe('decodeInscriptionData', () => {
        it('should decode valid inscription data', () => {
            const data = {
                type: 'memepool',
                version: '1.0',
                data: 'test'
            };
            const hex = Buffer.from(JSON.stringify(data)).toString('hex');

            const result = service.decodeInscriptionData(hex);
            expect(result).toEqual(data);
        });

        it('should return null for invalid hex data', () => {
            const result = service.decodeInscriptionData('invalid');
            expect(result).toBeNull();
        });

        it('should return null for invalid JSON data', () => {
            const hex = Buffer.from('invalid json').toString('hex');
            const result = service.decodeInscriptionData(hex);
            expect(result).toBeNull();
        });
    });

    describe('validateTransactionSignature', () => {
        it('should validate transaction with valid signatures', async () => {
            const tx = {
                vin: [{
                    scriptSig: 'valid_signature'
                }]
            };

            const result = await service.validateTransactionSignature(tx);
            expect(result).toBe(true);
        });

        it('should reject transaction without inputs', async () => {
            const tx = {
                vin: []
            };

            const result = await service.validateTransactionSignature(tx);
            expect(result).toBe(false);
        });

        it('should reject transaction without scriptSig', async () => {
            const tx = {
                vin: [{
                    // missing scriptSig
                }]
            };

            const result = await service.validateTransactionSignature(tx);
            expect(result).toBe(false);
        });
    });

    describe('verifyTimestamp', () => {
        it('should verify valid timestamp', async () => {
            const blockTime = 1000;
            const timestamp = blockTime * 1000 + 1800000; // 30 minutes after block

            mockBlockchainService.API_BASE = 'test-api';
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ time: blockTime })
            });

            const result = await service.verifyTimestamp(timestamp, 100);
            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledWith('test-api/block/height/100');
        });

        it('should reject timestamp too far from block time', async () => {
            const blockTime = 1000;
            const timestamp = blockTime * 1000 + 7200000; // 2 hours after block

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ time: blockTime })
            });

            const result = await service.verifyTimestamp(timestamp, 100);
            expect(result).toBe(false);
        });

        it('should handle API errors', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: false
            });

            const result = await service.verifyTimestamp(Date.now(), 100);
            expect(result).toBe(false);
        });

        it('should handle network timeout', async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));
            
            const result = await service.verifyTimestamp(Date.now(), 100);
            expect(result).toBe(false);
        });

        it('should handle invalid block data response', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ /* missing time field */ })
            });
            
            const result = await service.verifyTimestamp(Date.now(), 100);
            expect(result).toBe(false);
        });

        it('should handle malformed timestamp', async () => {
            const result = await service.verifyTimestamp('invalid', 100);
            expect(result).toBe(false);
        });
    });

    describe('verifyInscription', () => {
        const mockInscription = {
            transaction: {
                txid: 'tx123',
                vin: [{ scriptSig: 'valid_signature' }]
            },
            blockHash: 'block123',
            blockHeight: 100,
            content: {
                timestamp: Date.now()
            }
        };

        beforeEach(() => {
            mockBlockchainService.verifyBlockHash.mockResolvedValue(true);
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ time: Date.now() / 1000 })
            });
        });

        it('should verify valid inscription', async () => {
            const results = await service.verifyInscription(mockInscription);
            expect(results.verified).toBe(true);
            expect(results.blockVerified).toBe(true);
            expect(results.signatureVerified).toBe(true);
            expect(results.timestampVerified).toBe(true);
            expect(results.errors).toEqual([]);
        });

        it('should collect verification errors', async () => {
            mockBlockchainService.verifyBlockHash.mockResolvedValue(false);
            global.fetch = jest.fn().mockResolvedValue({
                ok: false
            });

            const results = await service.verifyInscription(mockInscription);
            expect(results.verified).toBe(false);
            expect(results.errors.length).toBeGreaterThan(0);
        });

        it('should handle verification errors gracefully', async () => {
            mockBlockchainService.verifyBlockHash.mockRejectedValue(new Error('API error'));

            const results = await service.verifyInscription(mockInscription);
            expect(results.verified).toBe(false);
            expect(results.errors).toContain('Block hash verification failed');
        });

        it('should handle missing transaction data', async () => {
            const invalidInscription = {
                blockHash: 'block123',
                blockHeight: 100,
                content: {
                    timestamp: Date.now()
                }
                // missing transaction field
            };

            const results = await service.verifyInscription(invalidInscription);
            expect(results.verified).toBe(false);
            expect(results.signatureVerified).toBe(false);
            expect(results.errors).toContain('Transaction signature verification failed');
        });

        it('should handle missing content data', async () => {
            const invalidInscription = {
                transaction: {
                    txid: 'tx123',
                    vin: [{ scriptSig: 'valid_signature' }]
                },
                blockHash: 'block123',
                blockHeight: 100
                // missing content field
            };

            const results = await service.verifyInscription(invalidInscription);
            expect(results.verified).toBe(false);
            expect(results.timestampVerified).toBe(false);
            expect(results.errors).toContain('Timestamp verification failed');
        });

        it('should handle completely invalid inscription data', async () => {
            const results = await service.verifyInscription(null);
            expect(results.verified).toBe(false);
            expect(results.errors.length).toBeGreaterThan(0);
        });

        it('should handle top-level verification errors', async () => {
            const invalidInscription = {
                transaction: undefined,
                blockHash: undefined,
                blockHeight: 'invalid',
                content: null
            };

            const results = await service.verifyInscription(invalidInscription);
            expect(results.verified).toBe(false);
            expect(results.errors.length).toBeGreaterThan(0);
            expect(results.blockVerified).toBe(true);
            expect(results.signatureVerified).toBe(false);
            expect(results.timestampVerified).toBe(false);
        });
    });

    describe('verifySignature', () => {
        it('should verify valid transaction signature', () => {
            const tx = { /* mock transaction data */ };
            const scriptSig = 'valid_signature';
            
            const result = service.verifySignature(tx, scriptSig);
            expect(result).toBe(true);
        });

        it('should return true as placeholder implementation', () => {
            const tx = null; // even invalid tx should return true as it's a placeholder
            const scriptSig = 'valid_signature';
            
            const result = service.verifySignature(tx, scriptSig);
            expect(result).toBe(true);
        });
    });
}); 