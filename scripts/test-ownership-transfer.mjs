import { BSVService } from '../src/services/bsv-service.js';
import { OwnershipTransferService } from '../src/services/ownership-transfer-service.js';
import { TestnetWallet } from '../src/services/testnet-wallet.js';

// Initialize services
const primaryWallet = new TestnetWallet('cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy');
const secondaryWallet = new TestnetWallet('cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6');

// Create BSV service with primary wallet
const bsvService = new BSVService();
bsvService.wallet = primaryWallet;

// Create ownership transfer service
const transferService = new OwnershipTransferService(bsvService);

async function testOwnershipTransfer() {
    try {
        console.log('Starting ownership transfer test...');
        
        // Transaction ID of the inscription to transfer
        const inscriptionTxId = '78ec47dcbce5fa62a0c7a2fa2f9badad47f065a3c572621826796f714eaa0bd8';
        
        // Get addresses
        const primaryAddress = primaryWallet.getAddress();
        const secondaryAddress = secondaryWallet.getAddress();
        
        console.log('Primary wallet address:', primaryAddress);
        console.log('Secondary wallet address:', secondaryAddress);

        // Verify current ownership
        console.log('\nVerifying current ownership...');
        const isOwner = await transferService.verificationService.validateOwnership(primaryAddress, inscriptionTxId);
        if (!isOwner) {
            throw new Error('Primary wallet is not the current owner of the inscription');
        }
        console.log('Current ownership verified ✓');

        // Create transfer transaction
        console.log('\nCreating transfer transaction...');
        const transferTxId = await transferService.createTransferTransaction(inscriptionTxId, secondaryAddress);
        console.log('Transfer transaction created:', transferTxId);

        // Monitor transfer status
        console.log('\nMonitoring transfer status...');
        let transferComplete = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!transferComplete && attempts < maxAttempts) {
            attempts++;
            const status = await transferService.getTransferStatus(transferTxId);
            console.log(`Transfer status (attempt ${attempts}/${maxAttempts}):`, status);

            if (status.confirmed) {
                transferComplete = true;
                break;
            }

            // Wait 30 seconds before next check
            console.log('Waiting 30 seconds before next check...');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }

        // Verify transfer completion
        if (transferComplete) {
            console.log('\nVerifying transfer completion...');
            const isTransferred = await transferService.verifyTransfer(transferTxId, secondaryAddress);
            if (isTransferred) {
                console.log('Transfer completed successfully! ✓');
                console.log('New owner:', secondaryAddress);
            } else {
                console.log('Transfer verification failed. Please check manually.');
            }
        } else {
            console.log('\nTransfer not confirmed after maximum attempts.');
            console.log('Please check the transfer status manually later.');
        }

    } catch (error) {
        console.error('Error during ownership transfer test:', error);
    }
}

// Run the test
testOwnershipTransfer().catch(console.error); 