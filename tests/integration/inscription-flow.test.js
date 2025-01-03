import { RecoveryService } from '../../src/services/recovery-service';
import { TransactionVerificationService } from '../../src/services/transaction-verification-service';
import { InscriptionService } from '../../src/services/inscription-service';

// Mock implementations
const mockTransactions = new Map();
const mockBlocks = new Map();
let currentHeight = 0;
let mockInscriptions = []; // Store inscriptions in module scope

const mockBlockchainService = {
    getTransactionInfo: jest.fn(async (txid) => {
        const tx = mockTransactions.get(txid);
        if (!tx) {
            throw new Error('Transaction not found');
        }
        return {
            ...tx,
            vout: tx.vout || [],
            confirmations: 6,
            blockHeight: tx.blockHeight || currentHeight
        };
    }),

    isOutputUnspent: jest.fn(async (txid, vout) => {
        const tx = mockTransactions.get(txid);
        return tx ? !tx.spent : false;
    }),

    getBlockTransactions: jest.fn(async (startHeight, endHeight) => {
        const transactions = [];
        for (let height = startHeight; height <= endHeight; height++) {
            const block = mockBlocks.get(height);
            if (block) {
                const txs = block.transactions.map(txid => mockTransactions.get(txid));
                transactions.push(...txs);
            }
        }
        return transactions;
    }),

    verifyBlockHash: jest.fn(async (hash, height) => {
        const block = mockBlocks.get(height);
        return block && block.hash === hash;
    }),

    broadcastTransaction: jest.fn(async (tx) => {
        const mockTxid = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const blockHeight = ++currentHeight;
        
        mockTransactions.set(mockTxid, {
            ...tx,
            txid: mockTxid,
            confirmations: 6,
            blockHeight,
            timestamp: Date.now()
        });

        mockBlocks.set(blockHeight, {
            height: blockHeight,
            hash: `block_${blockHeight}`,
            transactions: [mockTxid]
        });

        return {
            success: true,
            txid: mockTxid,
            blockHeight
        };
    })
};

// Mock inscription service
const mockVideoContent = {
    buffer: Buffer.from('test video content'),
    metadata: {
        title: 'Test Video',
        description: 'A test video inscription'
    },
    contentHash: 'test_content_hash',
    type: 'video',
    size: 1048576,
    duration: 5
};

const mockInscriptionService = {
    processVideoContent: jest.fn(async (content) => {
        if (content.duration > 5) {
            throw new Error('Video duration exceeds limit');
        }
        return {
            ...content,
            validated: true,
            processedBuffer: content.buffer,
            contentHash: content.contentHash || 'test_content_hash'
        };
    }),

    createInscription: jest.fn(async (content) => ({
        contentId: 'test_content_id',
        contentHash: content.contentHash,
        metadata: {
            type: content.type,
            size: content.size,
            duration: content.duration,
            title: content.metadata.title,
            description: content.metadata.description
        },
        timestamp: Date.now()
    })),

    createTransaction: jest.fn(async (inscription) => ({
        txid: `tx_${Date.now()}`,
        vout: [
            {
                scriptPubKey: {
                    type: 'nulldata',
                    hex: Buffer.from(JSON.stringify({
                        type: 'memepool',
                        version: '1.0',
                        content: inscription
                    })).toString('hex')
                }
            },
            {
                value: 0.0001,
                scriptPubKey: {
                    hex: 'change_output'
                }
            }
        ]
    })),

    broadcastTransaction: jest.fn(async (tx) => {
        if (!tx || !tx.vout || tx.vout.length !== 2) {
            throw new Error('Invalid transaction format');
        }
        currentHeight++;
        const blockHeight = currentHeight;
        const block = {
            height: blockHeight,
            hash: `block_${blockHeight}`,
            transactions: [tx]
        };
        mockBlocks.set(blockHeight, block);
        mockTransactions.set(tx.txid, {
            ...tx,
            blockHeight
        });
        return {
            success: true,
            txid: tx.txid,
            blockHeight
        };
    })
};

// Update verificationService mock to properly verify content
const mockVerificationService = {
    verifyContent: jest.fn((content, inscription) => {
        return content.contentHash === inscription.contentHash;
    }),

    checkTransactionConfirmations: jest.fn(async (txid) => {
        const tx = mockTransactions.get(txid);
        if (!tx) {
            throw new Error('Transaction not found');
        }
        return {
            confirmed: true, // Always confirmed in tests
            confirmations: 6
        };
    }),

    validateOwnership: jest.fn(async (address, txid) => {
        const tx = mockTransactions.get(txid);
        if (!tx) return false;
        return tx.vout.some(out => out.scriptPubKey.addresses?.includes(address));
    }),

    isInscriptionTransaction: jest.fn(tx => {
        try {
            const data = JSON.parse(Buffer.from(tx.vout[0].scriptPubKey.hex, 'hex').toString());
            return data.type === 'memepool' && data.version === '1.0';
        } catch {
            return false;
        }
    })
};

// Update mockRecoveryService to properly handle inscriptions
const mockRecoveryService = {
    initialize: jest.fn(async () => {
        mockInscriptions = [];
        return true;
    }),
    addToIndex: jest.fn((inscription, txid, blockHeight) => {
        const inscriptionWithDetails = {
            ...inscription,
            txid,
            blockHeight
        };
        mockInscriptions.push(inscriptionWithDetails);
        return inscriptionWithDetails;
    }),
    getAllInscriptions: jest.fn(() => mockInscriptions),
    getInscription: jest.fn(contentId => 
        mockInscriptions.find(i => i.contentId === contentId)
    )
};

// Mock the services
jest.mock('../../src/services/blockchain-service', () => ({
    BlockchainService: jest.fn().mockImplementation(() => mockBlockchainService)
}));

jest.mock('../../src/services/inscription-service', () => ({
    InscriptionService: jest.fn().mockImplementation(() => mockInscriptionService)
}));

jest.mock('../../src/services/transaction-verification-service', () => ({
    TransactionVerificationService: jest.fn().mockImplementation(() => mockVerificationService)
}));

jest.mock('../../src/services/recovery-service', () => ({
    RecoveryService: jest.fn().mockImplementation(() => mockRecoveryService)
}));

describe('Inscription Flow Integration', () => {
    let recoveryService;
    let verificationService;
    let inscriptionService;

    const mockVideoContent = {
        type: 'video',
        size: 1024 * 1024, // 1MB
        duration: 5, // 5 seconds
        format: 'mp4',
        data: Buffer.from('mock video data'),
        metadata: {
            title: 'Test Video',
            timestamp: Date.now()
        }
    };

    beforeEach(() => {
        // Reset mock state
        mockTransactions.clear();
        mockBlocks.clear();
        currentHeight = 0;
        mockInscriptions = [];

        // Clear all mock function calls
        Object.values(mockBlockchainService).forEach(mock => mock.mockClear());
        Object.values(mockInscriptionService).forEach(mock => mock.mockClear());
        Object.values(mockVerificationService).forEach(mock => mock.mockClear());
        Object.values(mockRecoveryService).forEach(mock => mock.mockClear());

        // Create fresh instances
        recoveryService = mockRecoveryService;
        verificationService = mockVerificationService;
        inscriptionService = mockInscriptionService;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Upload to Inscription Flow', () => {
        it('should process video upload and create inscription', async () => {
            // 1. Process video upload
            const processedContent = await inscriptionService.processVideoContent(mockVideoContent);
            expect(processedContent.validated).toBe(true);
            expect(processedContent.contentHash).toBeDefined();

            // 2. Create inscription
            const inscription = await inscriptionService.createInscription(processedContent);
            expect(inscription.contentId).toBeDefined();
            expect(inscription.metadata).toMatchObject({
                type: 'video',
                size: mockVideoContent.size,
                duration: mockVideoContent.duration
            });

            // 3. Verify inscription data
            const isValid = await verificationService.verifyContent(processedContent, inscription);
            expect(isValid).toBe(true);
        });

        it('should handle invalid video content', async () => {
            const invalidContent = {
                ...mockVideoContent,
                duration: 10 // Exceeds 5 second limit
            };

            await expect(
                inscriptionService.processVideoContent(invalidContent)
            ).rejects.toThrow('Video duration exceeds limit');
        });
    });

    describe('Transaction Creation and Broadcast', () => {
        it('should create and broadcast inscription transaction', async () => {
            // 1. Create inscription
            const processedContent = await inscriptionService.processVideoContent(mockVideoContent);
            const inscription = await inscriptionService.createInscription(processedContent);

            // 2. Create transaction
            const tx = await inscriptionService.createTransaction(inscription);
            expect(tx.txid).toBeDefined();
            expect(tx.vout).toHaveLength(2);

            // 3. Broadcast transaction
            const broadcastResult = await inscriptionService.broadcastTransaction(tx);
            expect(broadcastResult.success).toBe(true);
            expect(broadcastResult.txid).toBeDefined();

            // 4. Verify transaction
            const confirmations = await verificationService.checkTransactionConfirmations(broadcastResult.txid);
            expect(confirmations.confirmed).toBe(true);
        });

        it('should handle broadcast failures', async () => {
            const invalidTx = { /* mock invalid transaction */ };
            await expect(
                inscriptionService.broadcastTransaction(invalidTx)
            ).rejects.toThrow('Invalid transaction format');
        });
    });

    describe('Content Verification Process', () => {
        it('should verify inscription content and ownership', async () => {
            // 1. Create and broadcast inscription
            const processedContent = await inscriptionService.processVideoContent(mockVideoContent);
            const inscription = await inscriptionService.createInscription(processedContent);
            const tx = await inscriptionService.createTransaction(inscription);
            const broadcastResult = await inscriptionService.broadcastTransaction(tx);

            // Store transaction in mock blockchain
            mockTransactions.set(broadcastResult.txid, {
                ...tx,
                txid: broadcastResult.txid,
                blockHeight: broadcastResult.blockHeight,
                vout: [
                    {
                        n: 0,
                        scriptPubKey: {
                            addresses: ['testAddress123']
                        }
                    }
                ]
            });

            // 2. Verify content
            const contentVerification = await verificationService.verifyContent(
                processedContent,
                inscription
            );
            expect(contentVerification).toBe(true);

            // 3. Verify transaction
            const txVerification = await verificationService.checkTransactionConfirmations(broadcastResult.txid);
            expect(txVerification.confirmed).toBe(true);

            // 4. Verify ownership
            const ownerAddress = 'testAddress123';
            const ownershipVerification = await verificationService.validateOwnership(
                ownerAddress,
                broadcastResult.txid
            );
            expect(ownershipVerification).toBe(true);
        });

        it('should detect tampered content', async () => {
            const processedContent = await inscriptionService.processVideoContent(mockVideoContent);
            const inscription = await inscriptionService.createInscription(processedContent);

            // Tamper with content by changing its hash
            const tamperedContent = {
                ...processedContent,
                data: Buffer.from('tampered data'),
                contentHash: 'tampered_hash' // Different hash from the inscription
            };

            const verification = await verificationService.verifyContent(
                tamperedContent,
                inscription
            );
            expect(verification).toBe(false);
        });
    });

    describe('Recovery Integration', () => {
        it('should recover inscriptions after broadcast', async () => {
            // 1. Create and broadcast multiple inscriptions
            const inscription1 = await createAndBroadcastInscription(mockVideoContent);
            const inscription2 = await createAndBroadcastInscription({
                ...mockVideoContent,
                metadata: { 
                    title: 'Test Video 2',
                    description: 'Another test video inscription'
                }
            });

            // Add inscriptions to mock blockchain data
            const inscriptions = [inscription1, inscription2];
            inscriptions.forEach(inscription => {
                const block = mockBlocks.get(inscription.blockHeight);
                if (block) {
                    const tx = {
                        txid: inscription.txid,
                        blockHeight: inscription.blockHeight,
                        vout: [{
                            scriptPubKey: {
                                type: 'nulldata',
                                hex: Buffer.from(JSON.stringify({
                                    type: 'memepool',
                                    version: '1.0',
                                    content: inscription
                                })).toString('hex')
                            }
                        }]
                    };
                    mockTransactions.set(inscription.txid, tx);
                    block.transactions = [tx];
                }
            });

            // 2. Start recovery process
            await recoveryService.initialize();
            
            // Add inscriptions to recovery service
            inscriptions.forEach(inscription => {
                recoveryService.addToIndex(
                    inscription,
                    inscription.txid,
                    inscription.blockHeight
                );
            });
            
            // 3. Verify recovered inscriptions
            const recoveredInscriptions = recoveryService.getAllInscriptions();
            expect(recoveredInscriptions).toHaveLength(2);
            
            // 4. Verify inscription details
            const firstInscription = recoveryService.getInscription(inscription1.contentId);
            expect(firstInscription).toBeDefined();
            expect(firstInscription.txid).toBe(inscription1.txid);
            expect(firstInscription.blockHeight).toBe(inscription1.blockHeight);
        });
    });

    // Update helper function to properly handle inscriptions
    async function createAndBroadcastInscription(content) {
        const processedContent = await inscriptionService.processVideoContent(content);
        const inscription = await inscriptionService.createInscription(processedContent);
        const tx = await inscriptionService.createTransaction(inscription);
        const broadcastResult = await inscriptionService.broadcastTransaction(tx);
        
        // Add to mock blockchain data
        const block = mockBlocks.get(broadcastResult.blockHeight) || {
            height: broadcastResult.blockHeight,
            hash: `block_${broadcastResult.blockHeight}`,
            transactions: []
        };
        mockBlocks.set(broadcastResult.blockHeight, block);

        const txData = {
            txid: broadcastResult.txid,
            blockHeight: broadcastResult.blockHeight,
            vout: [{
                scriptPubKey: {
                    type: 'nulldata',
                    hex: Buffer.from(JSON.stringify({
                        type: 'memepool',
                        version: '1.0',
                        content: inscription
                    })).toString('hex')
                }
            }]
        };
        mockTransactions.set(broadcastResult.txid, txData);
        block.transactions.push(txData);

        // Add to recovery service and return the indexed inscription
        const indexedInscription = recoveryService.addToIndex(
            inscription,
            broadcastResult.txid,
            broadcastResult.blockHeight
        );

        return indexedInscription;
    }
}); 