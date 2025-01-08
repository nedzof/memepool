import { BSVService } from '../src/services/bsv-service.js';
import fs from 'fs/promises';
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

async function verifyInscription(txid) {
    try {
        const bsv = new BSVService();
        console.log('Testnet wallet initialized with address:', await bsv.getWalletAddress());
        console.log('Verifying inscription:', txid);

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

        // Now verify the original inscription
        console.log('\nVerifying original inscription...');
        const response = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${originalTxId}/hex`);
        if (!response.ok) {
            throw new Error('Failed to fetch transaction data');
        }

        console.log('Parsing raw transaction...');
        const txHex = await response.text();
        console.log('Complete script length:', txHex.length);

        // Find OP_RETURN output
        const opReturnMatch = txHex.match(/006a([0-9a-f]*)/);
        if (!opReturnMatch) {
            throw new Error('No OP_RETURN output found in transaction');
        }

        // Extract data after OP_RETURN
        const data = opReturnMatch[1];
        console.log('Parsing inscription data...');

        // Find OP_FALSE OP_RETURN sequence (0x006a)
        let scriptStart = -1;
        for (let i = 0; i < data.length - 4; i += 2) {
            if (data.slice(i, i + 4) === '006a') {
                scriptStart = i;
                break;
            }
        }

        if (scriptStart === -1) {
            throw new Error('Invalid inscription format: no OP_FALSE OP_RETURN found');
        }

        console.log('Found OP_FALSE OP_RETURN at position:', scriptStart);
        
        let pos = scriptStart + 4; // Skip OP_FALSE OP_RETURN
        const chunks = [];
        
        while (pos < data.length) {
            const opcode = parseInt(data.slice(pos, pos + 2), 16);
            
            // Handle PUSHDATA4 (0x4e)
            if (opcode === 0x4e) {
                pos += 2; // Skip opcode
                // Read 4-byte length
                const length = parseInt(data.slice(pos, pos + 8).match(/../g).reverse().join(''), 16);
                pos += 8;
                const chunk = data.slice(pos, pos + length * 2);
                chunks.push(chunk);
                console.log(`Extracted chunk of ${chunk.length / 2} bytes`);
                pos += length * 2;
            } else {
                console.log(`Unexpected opcode: ${opcode.toString(16)}`);
                break; // Stop if we hit an unexpected opcode
            }
        }

        if (chunks.length < 2) {
            throw new Error('Invalid inscription format: missing required chunks');
        }

        // Parse metadata from first chunk
        const metadata = JSON.parse(Buffer.from(chunks[0], 'hex').toString());
        console.log('\nMetadata:', metadata);

        // Extract and verify video data from second chunk
        const videoData = Buffer.from(chunks[1], 'hex');
        console.log('\nVideo data analysis:');
        console.log('Total size:', videoData.length, 'bytes');
        console.log('First 32 bytes:', videoData.slice(0, 32));
        console.log('Last 32 bytes:', videoData.slice(-32));

        // Save video for verification
        const outputFile = `extracted_${metadata.content.title}`;
        await fs.writeFile(outputFile, videoData);
        console.log(`\nVideo saved to: ${outputFile}`);

        // Verify video integrity
        console.log('\nVideo integrity check:');
        console.log('Expected size:', metadata.content.metadata.size, 'bytes');
        console.log('Actual size:', videoData.length, 'bytes');
        console.log('Size match:', metadata.content.metadata.size === videoData.length);
        console.log('Format match:', videoData.slice(4, 8).toString() === 'ftyp');

        // Check for protection marker
        console.log('\nChecking protection marker...');
        const markerHex = '6a044d454d45'; // OP_RETURN MEME
        const hasMarker = txHex.includes(markerHex);
        console.log('Protection marker found:', hasMarker);
        console.log('Protection marker (hex):', markerHex);
        console.log('Protection marker (decoded):', 'OP_RETURN "MEME"');

        // Get current owner from the input transaction
        console.log('\nOwnership details:');
        console.log('Original transaction:', originalTxId);
        console.log('Current transaction:', txid);
        
        // Get the current owner from the 1 satoshi output
        const currentOwnerOutput = currentTx.vout.find(out => out.value === 0.00000001);
        if (!currentOwnerOutput) {
            throw new Error('No valid inscription holder output found');
        }

        // Extract the P2PKH address from the output
        const pubKeyHashMatch = currentOwnerOutput.scriptPubKey.hex.match(/76a914([0-9a-f]{40})88ac/);
        if (!pubKeyHashMatch) {
            throw new Error('Invalid P2PKH script format');
        }

        // Convert pubKeyHash to address
        const currentOwnerAddress = pubKeyHashToAddress(pubKeyHashMatch[1]);

        console.log('\nInscription holder output found:');
        console.log('Value:', currentOwnerOutput.value, 'BSV');
        console.log('Script type:', currentOwnerOutput.scriptPubKey.type);
        console.log('Script (hex):', currentOwnerOutput.scriptPubKey.hex);
        console.log('Current owner:', currentOwnerAddress);
        console.log('Is creator:', currentOwnerAddress === metadata.content.creator ? 'Yes' : 'No');

        return true;
    } catch (error) {
        console.error('Failed to verify inscription:', error);
        throw error;
    }
}

// Get transaction ID from command line
const txid = process.argv[2];
if (!txid) {
    console.error('Please provide a transaction ID');
    process.exit(1);
}

// Run verification
verifyInscription(txid); 