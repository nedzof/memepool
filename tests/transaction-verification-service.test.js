import { TransactionVerificationService } from '../src/services/transaction-verification-service';
import { BlockchainService } from '../src/services/blockchain-service';

// Mock blockchain service
jest.mock('../src/services/blockchain-service');

describe('TransactionVerificationService', () => {
    let verificationService;
    let mockBlockchainService;

    beforeEach(() => {
        mockBlockchainService = {
            getTransactionInfo: jest.fn(),
            isOutputUnspent: jest.fn()
        };
        verificationService = new TransactionVerificationService(mockBlockchainService);
    });

    describe('Transaction Confirmation', () => {
        it('should confirm transaction with enough confirmations', async () => {
            mockBlockchainService.getTransactionInfo.mockResolvedValue({
                confirmations: 6
            });

            const result = await verificationService.checkTransactionConfirmations('test_txid');
            expect(result.confirmed).toBe(true);
            expect(result.confirmations).toBe(6);
        });

        it('should not confirm transaction with insufficient confirmations', async () => {
            mockBlockchainService.getTransactionInfo.mockResolvedValue({
                confirmations: 3
            });

            const result = await verificationService.checkTransactionConfirmations('test_txid');
            expect(result.confirmed).toBe(false);
            expect(result.confirmations).toBe(3);
        });

        it('should handle transaction info errors', async () => {
            mockBlockchainService.getTransactionInfo.mockRejectedValue(
                new Error('Network error')
            );

            await expect(
                verificationService.checkTransactionConfirmations('test_txid')
            ).rejects.toThrow('Failed to check transaction confirmations: Network error');
        });
    });

    describe('Content Verification', () => {
        const testContent = {
            type: 'video',
            timestamp: 1234567890,
            size: 1024,
            data: 'test_content'
        };

        const testInscription = {
            contentHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', // Hash of "test"
            metadata: {
                type: 'video',
                timestamp: 1234567890,
                size: 1024
            }
        };

        it('should verify matching content and inscription', () => {
            const result = verificationService.verifyContent(testContent, testInscription);
            expect(result).toBe(true);
        });

        it('should reject content with mismatched metadata', () => {
            const modifiedContent = { ...testContent, size: 2048 };
            const result = verificationService.verifyContent(modifiedContent, testInscription);
            expect(result).toBe(false);
        });

        it('should handle verification errors gracefully', () => {
            const result = verificationService.verifyContent(null, testInscription);
            expect(result).toBe(false);
        });
    });

    describe('Ownership Validation', () => {
        const testAddress = 'test_address';
        const testTxid = 'test_txid';

        it('should validate current ownership', async () => {
            mockBlockchainService.getTransactionInfo.mockResolvedValue({
                vout: [{
                    n: 0,
                    scriptPubKey: {
                        addresses: [testAddress]
                    }
                }]
            });
            mockBlockchainService.isOutputUnspent.mockResolvedValue(true);

            const result = await verificationService.validateOwnership(testAddress, testTxid);
            expect(result).toBe(true);
        });

        it('should reject if address is not recipient', async () => {
            mockBlockchainService.getTransactionInfo.mockResolvedValue({
                vout: [{
                    n: 0,
                    scriptPubKey: {
                        addresses: ['different_address']
                    }
                }]
            });

            const result = await verificationService.validateOwnership(testAddress, testTxid);
            expect(result).toBe(false);
        });

        it('should reject if output is spent', async () => {
            mockBlockchainService.getTransactionInfo.mockResolvedValue({
                vout: [{
                    n: 0,
                    scriptPubKey: {
                        addresses: [testAddress]
                    }
                }]
            });
            mockBlockchainService.isOutputUnspent.mockResolvedValue(false);

            const result = await verificationService.validateOwnership(testAddress, testTxid);
            expect(result).toBe(false);
        });

        it('should handle validation errors', async () => {
            mockBlockchainService.getTransactionInfo.mockRejectedValue(
                new Error('Network error')
            );

            await expect(
                verificationService.validateOwnership(testAddress, testTxid)
            ).rejects.toThrow('Failed to validate ownership: Network error');
        });
    });
}); 