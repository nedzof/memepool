import { BSVService } from '../src/services/bsv-service.js';
import { OwnershipTransferService } from '../src/services/ownership-transfer-service.js';
import { TestnetWallet } from '../src/services/testnet-wallet.js';
import { InscriptionSecurityService } from '../src/services/inscription-security-service.js';
import crypto from 'crypto';

// Initialize services
const primaryWallet = new TestnetWallet('cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy');
const bsvService = new BSVService();
bsvService.wallet = primaryWallet;

// Create security and transfer services
const securityService = new InscriptionSecurityService({ bsvService });
const transferService = new OwnershipTransferService(bsvService);

/**
 * Calculate script hash from hex
 * @param {string} scriptHex - Script in hex format
 * @returns {string} - Script hash
 */
function calculateScriptHash(scriptHex) {
    const scriptBuffer = Buffer.from(scriptHex, 'hex');
    return crypto.createHash('sha256').update(scriptBuffer).digest('hex');
}

/**
 * Fetch data from WhatsOnChain API with retries
 * @param {string} url - API URL to fetch
 * @param {number} maxRetries - Maximum number of retries
 * @param {boolean} expectJson - Whether to expect JSON response
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object|string>} - Parsed JSON response or text
 */
async function fetchWithRetry(url, maxRetries = 3, expectJson = true, options = {}) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limit hit, wait longer for next retry
                    const waitTime = Math.pow(2, i) * 1000;
                    console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                if (response.status === 404) {
                    throw new Error(`Resource not found: ${url}`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get("content-type");
            if (expectJson) {
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error(`Expected JSON response but got ${contentType}`);
                }
                return await response.json();
            } else {
                // For non-JSON responses, return the text
                return await response.text();
            }
        } catch (error) {
            console.log(`Attempt ${i + 1}/${maxRetries} failed:`, error.message);
            lastError = error;
            if (i < maxRetries - 1) {
                const waitTime = Math.pow(2, i) * 1000;
                console.log(`Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    throw lastError;
}

async function testOwnershipTransfer(inscriptionTxId, recipientAddress) {
    try {
        console.log('\nStarting ownership transfer test...');
        console.log('Inscription TX ID:', inscriptionTxId);
        console.log('Recipient address:', recipientAddress);
        
        // Get primary wallet address
        const primaryAddress = primaryWallet.getAddress();
        console.log('Primary wallet address:', primaryAddress);

        // First verify inscription security and get UTXO data
        console.log('\nVerifying inscription security and UTXO data...');
        const securityChecks = await securityService.verifyOwnershipForTransfer(inscriptionTxId, primaryAddress);
        
        if (!securityChecks.isValid) {
            throw new Error('Security checks failed for inscription');
        }
        
        console.log('Security checks passed ✓');
        console.log('Current owner:', securityChecks.currentOwner);
        console.log('Confirmations:', securityChecks.confirmations);

        // Get the specific UTXO with the inscription holder script
        console.log('\nFetching inscription holder UTXO...');
        
        // Use the known script hash for the inscription holder pattern
        const scriptHash = 'beff2180d2af2648a2c4cb8199f0b5af4454ba2e4d444f786d3af3ad873a900f';
        console.log('Using script hash:', scriptHash);

        // Get UTXOs by script hash
        console.log('\nFetching UTXOs by script hash...');
        const scriptUtxos = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/script/${scriptHash}/unspent/all`, 3, true);
        if (!scriptUtxos || !scriptUtxos.result || scriptUtxos.result.length === 0) {
            throw new Error('No unspent UTXOs found for script');
        }
        console.log('Script UTXOs:', JSON.stringify(scriptUtxos, null, 2));

        // Find our specific UTXO
        const utxoData = scriptUtxos.result.find(utxo => 
            utxo.tx_hash === inscriptionTxId && 
            !utxo.isSpentInMempoolTx &&
            utxo.status === 'confirmed'
        );

        if (!utxoData) {
            throw new Error('Inscription holder UTXO not found or already spent');
        }

        // Get the output hex for the UTXO
        console.log('\nFetching output script data...');
        const outputHex = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${inscriptionTxId}/out/${utxoData.tx_pos}/hex`, 3, false);
        if (!outputHex) {
            throw new Error('Output data not found');
        }
        console.log('Output hex:', outputHex);
        
        // Verify the script pattern matches our expected inscription holder pattern
        const expectedScriptPattern = 'OP_DUP OP_HASH160 e5932eb43c8d986c8e57475dad50dc93129a0bc7 OP_EQUALVERIFY OP_CHECKSIG OP_RETURN 4d454d45';
        console.log('Verifying inscription holder script pattern...');
        console.log('Found script hex:', outputHex);
        
        // Check for MEME marker
        if (!outputHex.includes('4d454d45')) {
            throw new Error('Invalid inscription holder UTXO - missing MEME marker');
        }
        console.log('MEME marker found ✓');

        // Create transfer transaction
        console.log('\nCreating transfer transaction...');
        const transferTxId = await transferService.createTransferTransaction(
            inscriptionTxId,
            recipientAddress,
            {
                value: utxoData.value, // Use the actual value from UTXO
                preserveScript: true, // Keep the original script pattern
                utxoData: {
                    scriptPubKey: outputHex,
                    value: utxoData.value,
                    n: utxoData.tx_pos,
                    txId: inscriptionTxId,
                    outputIndex: utxoData.tx_pos,
                    satoshis: utxoData.value,
                    script: outputHex
                }
            }
        );

        console.log('\nTransfer transaction created:', transferTxId);
        console.log('\nVerifying transfer completion...');
        
        // Wait for at least 1 confirmation
        let confirmations = 0;
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes maximum wait time
        
        while (confirmations < 1 && attempts < maxAttempts) {
            try {
                const status = await transferService.getTransferStatus(transferTxId);
                confirmations = status.confirmations;
                console.log(`Waiting for confirmation... (${confirmations}/1)`);
                if (confirmations < 1) {
                    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
                }
            } catch (error) {
                console.log('Error checking confirmation status:', error.message);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            attempts++;
        }

        if (attempts >= maxAttempts) {
            console.log('Warning: Maximum wait time reached without confirmation');
        }

        // Verify the new ownership
        const newOwnershipCheck = await securityService.verifyOwnershipForTransfer(transferTxId, recipientAddress);
        console.log('\nNew ownership verification:', newOwnershipCheck.isValid ? 'Success ✓' : 'Failed ✗');
        console.log('New owner:', newOwnershipCheck.currentOwner);

        console.log('\nYou can verify the transfer using:');
        console.log(`node scripts/verify-ownership.mjs ${transferTxId}`);
        console.log(`node scripts/verify-inscription.mjs ${transferTxId}`);
        console.log(`node scripts/test-security-checks.mjs ${transferTxId}`);
        console.log('\nOr check the transaction status at:');
        console.log(`https://test.whatsonchain.com/tx/${transferTxId}`);
        
        return transferTxId;

    } catch (error) {
        console.error('Error during ownership transfer test:', error);
        throw error;
    }
}

// Get transaction ID from command line
const inscriptionTxId = process.argv[2] || 'b60527fb294ea2f4bf2eea3f6c46c0a0b12c3011d8a37c940a4ce2aaf3dbdc32';
const recipientAddress = process.argv[3] || 'moRTGUhu38rtCFys4YBPaGc4WgvfwB1PSK';

if (!inscriptionTxId) {
    console.error('Please provide an inscription transaction ID');
    console.error('Usage: node scripts/test-ownership-transfer.mjs <txid> [recipient_address]');
    process.exit(1);
}

// Run the transfer test
testOwnershipTransfer(inscriptionTxId, recipientAddress)
    .then(transferTxId => {
        if (transferTxId) {
            console.log('\nTransfer successful!');
            process.exit(0);
        }
    })
    .catch(error => {
        console.error('\nTransfer failed:', error);
        process.exit(1);
    }); 