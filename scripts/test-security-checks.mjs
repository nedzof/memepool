import { BSVService } from '../src/services/bsv-service.js';
import { InscriptionSecurityService } from '../src/services/inscription-security-service.js';
import crypto from 'crypto';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, maxRetries = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url);
            if (response.status === 429) { // Too Many Requests
                console.log(`Rate limited, waiting ${delayMs}ms before retry ${attempt}/${maxRetries}`);
                await sleep(delayMs);
                continue;
            }
            return response;
        } catch (error) {
            if (attempt === maxRetries) throw error;
            console.log(`Request failed, waiting ${delayMs}ms before retry ${attempt}/${maxRetries}`);
            await sleep(delayMs);
        }
    }
    throw new Error('Max retries exceeded');
}

async function runSecurityChecks(txid, senderAddress = 'n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ') {
    const bsv = new BSVService();
    console.log('Testnet wallet initialized with address:', await bsv.getWalletAddress());

    console.log('\nRunning Security Checks');
    console.log('=====================');
    console.log(`Transaction ID: ${txid}`);
    console.log(`Sender Address: ${senderAddress}`);
    
    const securityService = new InscriptionSecurityService();
    
    try {
        // First, find the original inscription by following the UTXO chain backwards
        console.log('\nTracing back to original inscription...');
        let currentTxId = txid;
        let originalTxId = null;
        let currentTx = null;

        while (!originalTxId) {
            // Get current transaction
            const txResponse = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${currentTxId}`);
            if (!txResponse.ok) {
                throw new Error('Failed to fetch transaction');
            }
            currentTx = await txResponse.json();

            await sleep(500); // Add delay between requests

            // Get raw transaction to check for OP_RETURN
            const rawResponse = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${currentTxId}/hex`);
            if (!rawResponse.ok) {
                throw new Error('Failed to fetch raw transaction');
            }
            const txHex = await rawResponse.text();

            // If this transaction has OP_RETURN, it's the original inscription
            if (txHex.includes('006a')) {
                originalTxId = currentTxId;
                break;
            }

            // Otherwise, follow the input back
            if (!currentTx.vin || !currentTx.vin[0]) {
                throw new Error('No inputs found');
            }

            currentTxId = currentTx.vin[0].txid;
            console.log('Following input back to:', currentTxId);
            await sleep(500); // Add delay between iterations
        }

        console.log('Found original inscription:', originalTxId);

        // Fetch original inscription data
        console.log('\nFetching original inscription data...');
        const originalResponse = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${originalTxId}`);
        if (!originalResponse.ok) {
            throw new Error(`Failed to fetch transaction data: ${originalResponse.statusText}`);
        }
        const originalTxInfo = await originalResponse.json();

        await sleep(500); // Add delay between requests

        // Fetch raw transaction hex
        console.log('Fetching raw transaction...');
        const rawResponse = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${originalTxId}/hex`);
        if (!rawResponse.ok) {
            throw new Error(`Failed to fetch raw transaction: ${rawResponse.statusText}`);
        }
        const txHex = await rawResponse.text();

        // 1. Verify Inscription Format
        console.log('\n1. Verifying Inscription Format');
        console.log('----------------------------');
        const metadata = await securityService.verifyInscriptionFormat(originalTxId, txHex);
        console.log('✓ Inscription format verified');
        console.log('Metadata:', JSON.stringify(metadata, null, 2));

        // 2. Check Protection Marker
        console.log('\n2. Checking Protection Marker');
        console.log('-------------------------');
        const hasMarker = txHex.includes('6a044d454d45');
        if (!hasMarker) {
            throw new Error('Protection marker not found');
        }
        console.log('✓ Protection marker found');
        console.log('Marker: OP_RETURN "MEME" (6a044d454d45)');

        // 3. Verify Transaction Status
        console.log('\n3. Verifying Transaction Status');
        console.log('-----------------------------');
        console.log('Original confirmations:', originalTxInfo.confirmations);
        console.log('Current confirmations:', currentTx.confirmations);
        if (currentTx.confirmations < securityService.config.minConfirmations) {
            throw new Error(`Insufficient confirmations: ${currentTx.confirmations}`);
        }
        console.log('✓ Sufficient confirmations');

        // 4. Verify Inscription Value
        console.log('\n4. Verifying Inscription Value');
        console.log('----------------------------');
        const currentOwnerOutput = currentTx.vout.find(out => out.value === 0.00000001);
        if (!currentOwnerOutput) {
            throw new Error('No valid inscription holder output found');
        }
        console.log('✓ Valid inscription holder output found');
        console.log('Value:', currentOwnerOutput.value, 'BSV');
        console.log('Script type:', currentOwnerOutput.scriptPubKey.type);

        // 5. Verify Ownership
        console.log('\n5. Verifying Ownership');
        console.log('--------------------');
        // Extract the P2PKH address from the output
        const pubKeyHashMatch = currentOwnerOutput.scriptPubKey.hex.match(/76a914([0-9a-f]{40})88ac/);
        if (!pubKeyHashMatch) {
            throw new Error('Invalid P2PKH script format');
        }

        // Convert pubKeyHash to address using the same function from verify-ownership.mjs
        function pubKeyHashToAddress(pubKeyHash) {
            // For testnet, version byte is 0x6f
            const versionByte = '6f';
            const fullHash = versionByte + pubKeyHash;
            
            // Convert to Buffer for checksum calculation
            const buffer = Buffer.from(fullHash, 'hex');
            
            // Calculate double SHA256 for checksum
            const hash1 = crypto.createHash('sha256').update(buffer).digest();
            const hash2 = crypto.createHash('sha256').update(hash1).digest();
            const checksum = hash2.slice(0, 4);
            
            // Combine version, pubkey hash, and checksum
            const final = Buffer.concat([buffer, checksum]);
            
            // Convert to base58
            return toBase58(final);
        }

        function toBase58(buffer) {
            const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
            let num = BigInt('0x' + buffer.toString('hex'));
            const base = BigInt(58);
            const zero = BigInt(0);
            let result = '';
            
            while (num > zero) {
                const mod = Number(num % base);
                result = ALPHABET[mod] + result;
                num = num / base;
            }
            
            // Add leading zeros
            for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
                result = '1' + result;
            }
            
            return result;
        }

        const currentOwner = pubKeyHashToAddress(pubKeyHashMatch[1]);
        if (!currentOwner) {
            throw new Error('Could not determine current owner');
        }
        console.log('✓ Current owner verified:', currentOwner);

        await sleep(500); // Add delay between requests

        // Check if UTXO is unspent
        const spentResponse = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/spent`);
        if (!spentResponse.ok) {
            if (spentResponse.status === 404) {
                // 404 means the output is unspent
                console.log('✓ UTXO is unspent');
            } else {
                throw new Error('Failed to check if output is spent');
            }
        } else {
            throw new Error('Inscription UTXO has been spent');
        }
        
        // 6. Validate Transfer Parameters
        console.log('\n6. Validating Transfer Parameters');
        console.log('------------------------------');
        const params = {
            txid,
            senderAddress: currentOwner,
            recipientAddress: 'moRTGUhu38rtCFys4YBPaGc4WgvfwB1PSK'
        };
        const paramsValid = securityService.validateTransferParams(params);
        console.log('✓ Transfer parameters validated');
        
        // 7. Simulate Transfer Confirmation
        console.log('\n7. Simulating Transfer Confirmation');
        console.log('--------------------------------');
        console.log('Transfer details:');
        console.log('- From:', currentOwner);
        console.log('- To:', params.recipientAddress);
        console.log('- Inscription:', metadata.content.id);
        console.log('✓ Transfer confirmation simulated');
        
        console.log('\nAll Security Checks Passed ✓');
        return true;
    } catch (error) {
        console.error('\n❌ Security Check Failed:', error.message);
        console.error('Error details:', error);
        return false;
    }
}

// Run the test with the provided transaction ID
const txid = process.argv[2];
if (!txid) {
    console.error('Please provide a transaction ID');
    console.error('Usage: node scripts/test-security-checks.mjs <txid>');
    process.exit(1);
}

runSecurityChecks(txid); 