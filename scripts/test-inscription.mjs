import { BSVService } from '../src/services/bsv-service.js';
import { TestnetWallet } from '../src/services/testnet-wallet.js';
import fs from 'fs';

async function testInscription(filePath) {
    try {
        console.log('Starting inscription test...');
        
        // Initialize services
        const wallet = new TestnetWallet('cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy');
        const bsvService = new BSVService();
        bsvService.wallet = wallet;

        // Get wallet address
        const address = wallet.getAddress();
        console.log('Wallet address:', address);

        // Read file
        console.log('Reading file:', filePath);
        const file = {
            arrayBuffer: async () => fs.readFileSync(filePath),
            name: filePath.split('/').pop(),
            size: fs.statSync(filePath).size
        };
        console.log('File loaded:', file.name, 'Size:', file.size, 'bytes');

        // Get latest block hash
        console.log('\nGetting latest block hash...');
        const blockHash = await bsvService.getLatestBlockHash();
        console.log('Block hash:', blockHash);

        // Create inscription data
        const timestamp = new Date();
        timestamp.setFullYear(2025); // Set future date for testing
        const inscriptionData = {
            type: 'memepool',
            version: '1.0',
            content: {
                id: `${file.name.replace(/\.[^/.]+$/, '')}-${timestamp.getTime()}-${address.slice(-8)}-${blockHash.slice(-6)}`,
                title: file.name,
                creator: address,
                timestamp: timestamp.toISOString(),
                blockHash: blockHash,
                metadata: {
                    format: 'video/mp4',
                    size: file.size,
                    duration: 4.01,
                    dimensions: '854x480',
                    bitrate: 312904
                }
            }
        };

        // Create inscription
        console.log('\nCreating inscription...');
        console.log('Inscription data:', inscriptionData);
        const txid = await bsvService.createInscriptionTransaction(inscriptionData, file);
        console.log('\nInscription created successfully!');
        console.log('Transaction ID:', txid);

        // Wait for a moment then verify the inscription
        console.log('\nWaiting 5 seconds before verification...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Verify inscription
        console.log('\nVerifying inscription...');
        const status = await bsvService.getTransactionStatus(txid);
        console.log('Transaction status:', status);

        console.log('\nTest completed successfully!');
        return txid;
    } catch (error) {
        console.error('Error during inscription test:', error);
        throw error;
    }
}

// Get file path from command line argument
const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide a file path as an argument');
    process.exit(1);
}

// Run the test
testInscription(filePath).catch(console.error); 