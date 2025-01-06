import { BSVService } from '../src/services/bsv-service.js';
import { TransactionVerificationService } from '../src/services/transaction-verification-service.js';

async function verifyInscriptionOwnership(txid, expectedOwner = null) {
    try {
        console.log('Verifying inscription ownership...');
        console.log('Transaction ID:', txid);
        
        // Initialize services
        const bsvService = new BSVService();
        const verificationService = new TransactionVerificationService(bsvService);

        // Get transaction info
        console.log('\nFetching transaction info...');
        const txInfo = await bsvService.getTransactionInfo(txid);
        console.log('Transaction confirmations:', txInfo.confirmations);

        // Get all outputs and their current status
        console.log('\nAnalyzing outputs...');
        let valueOutputIndex = -1;
        let valueOutputAddress = null;
        for (const [index, output] of txInfo.vout.entries()) {
            if (output.scriptPubKey.addresses) {
                const address = output.scriptPubKey.addresses[0];
                console.log(`Output ${index}:`, {
                    address,
                    value: output.value,
                    type: output.scriptPubKey.type
                });

                // Track the value output
                if (output.value > 0) {
                    valueOutputIndex = index;
                    valueOutputAddress = address;
                }
            }
        }

        if (valueOutputIndex === -1 || !valueOutputAddress) {
            console.log('\nNo value output found in transaction');
            return null;
        }

        console.log('\nTracing ownership chain...');
        let currentTxId = txid;
        let currentOutputIndex = valueOutputIndex;
        let currentOwnerAddress = valueOutputAddress;
        let isUnspent = false;

        while (!isUnspent) {
            // Check if the output is spent
            const spentResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/${currentTxId}/${currentOutputIndex}/spent`);
            
            if (spentResponse.status === 404) {
                // Output is unspent, we found the current owner
                isUnspent = true;
                break;
            } else if (spentResponse.ok) {
                // Output is spent, follow the chain
                const spentData = await spentResponse.json();
                
                // Get the spending transaction details
                const nextTxResponse = await fetch(`https://api.whatsonchain.com/v1/bsv/test/tx/hash/${spentData.txid}`);
                if (!nextTxResponse.ok) {
                    throw new Error('Failed to fetch next transaction');
                }
                
                const nextTx = await nextTxResponse.json();
                
                // Find the value output in the spending transaction
                for (const [index, output] of nextTx.vout.entries()) {
                    if (output.scriptPubKey.addresses && output.value > 0) {
                        currentTxId = spentData.txid;
                        currentOutputIndex = index;
                        currentOwnerAddress = output.scriptPubKey.addresses[0];
                        console.log('Found transfer:', {
                            txid: currentTxId,
                            outputIndex: currentOutputIndex,
                            address: currentOwnerAddress
                        });
                        break;
                    }
                }
            } else {
                throw new Error('Failed to check if output is spent');
            }
        }

        console.log('\nCurrent ownership details:');
        console.log('Initial owner:', valueOutputAddress);
        console.log('Current owner:', currentOwnerAddress);
        console.log('Final transaction:', currentTxId);
        console.log('Final output index:', currentOutputIndex);

        // Get current owner's balance
        const response = await fetch(`https://api.whatsonchain.com/v1/bsv/test/address/${currentOwnerAddress}/balance`);
        if (!response.ok) {
            throw new Error('Failed to fetch address balance');
        }
        
        const balance = await response.json();
        console.log('\nCurrent owner balance:', {
            confirmed: balance.confirmed / 100000000,
            unconfirmed: balance.unconfirmed / 100000000,
            total: (balance.confirmed + balance.unconfirmed) / 100000000
        });

        return currentOwnerAddress;

    } catch (error) {
        console.error('Error verifying ownership:', error);
    }
}

// Get transaction ID from command line argument
const txid = process.argv[2];
const expectedOwner = process.argv[3]; // Optional

if (!txid) {
    console.error('Please provide a transaction ID as an argument');
    process.exit(1);
}

// Run the verification
verifyInscriptionOwnership(txid, expectedOwner).catch(console.error); 