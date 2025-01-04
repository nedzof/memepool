import { BSVService } from '../src/services/bsv-service.js';
import { TransactionVerificationService } from '../src/services/transaction-verification-service.js';
import { InscriptionService } from '../src/services/inscription-service.js';

/**
 * Script to verify inscription and check ownership
 * @param {string} txid - Transaction ID of the inscription
 */
async function verifyInscription(txid) {
    try {
        console.log('Verifying inscription:', txid);
        
        // Initialize services
        const bsvService = new BSVService();
        const verificationService = new TransactionVerificationService(bsvService);
        
        // Get transaction status
        console.log('\nChecking transaction status...');
        const status = await bsvService.getTransactionStatus(txid);
        console.log('Status:', {
            confirmed: status.confirmed,
            confirmations: status.confirmations,
            timestamp: new Date(status.timestamp * 1000).toISOString()
        });

        // Get transaction details from WhatsOnChain
        const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/out/0`);
        if (!response.ok) {
            throw new Error('Failed to fetch transaction details');
        }
        const txOutput = await response.json();

        // Parse inscription data
        console.log('\nParsing inscription data...');
        const inscriptionData = JSON.parse(Buffer.from(txOutput.scriptPubKey.hex.slice(4), 'hex').toString());
        console.log('Content ID:', inscriptionData.content.id);
        console.log('Title:', inscriptionData.content.title);
        console.log('Creator:', inscriptionData.content.creator);
        console.log('Timestamp:', inscriptionData.content.timestamp);
        console.log('Metadata:', inscriptionData.content.metadata);

        // Verify current ownership
        console.log('\nVerifying current ownership...');
        const currentOwner = txOutput.scriptPubKey.addresses[0];
        console.log('Current owner:', currentOwner);

        // Compare with original creator
        console.log('\nOwnership summary:');
        console.log('Original creator:', inscriptionData.content.creator);
        console.log('Current owner:', currentOwner);
        console.log('Is owned by creator:', currentOwner === inscriptionData.content.creator);

    } catch (error) {
        console.error('Failed to verify inscription:', error);
        process.exit(1);
    }
}

// Check if txid is provided
const txid = process.argv[2];
if (!txid) {
    console.error('Please provide a transaction ID');
    console.error('Usage: node scripts/verify-inscription.mjs <txid>');
    process.exit(1);
}

// Run verification
verifyInscription(txid); 