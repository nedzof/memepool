import { BSVService } from '../src/services/bsv-service.js';
import { TransactionVerificationService } from '../src/services/transaction-verification-service.js';
import { InscriptionService } from '../src/services/inscription-service.js';
import fs from 'fs/promises';
import path from 'path';

// Utility function for API calls with retry
async function fetchWithRetry(url, options = {}, retries = 5) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Attempt ${i + 1} to fetch ${url}`);
            const response = await fetch(url, options);
            
            // Handle rate limiting
            if (response.status === 429) {
                const delay = Math.pow(2, i) * 1000;
                console.log(`Rate limited, waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            // Handle 502 Bad Gateway
            if (response.status === 502) {
                const delay = Math.pow(2, i) * 2000; // Longer delay for 502s
                console.log(`Server error (502), waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            console.log(`Attempt ${i + 1} failed:`, error.message);
            lastError = error;
            if (i < retries - 1) {
                const delay = Math.pow(2, i) * 2000;
                console.log(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

/**
 * Script to verify inscription and check ownership
 * @param {string} txid - Transaction ID of the inscription
 */
async function verifyInscription(txid) {
    try {
        console.log('Verifying inscription:', txid);
        
        // Initialize services
        const bsvService = new BSVService();
        
        // Get transaction status
        console.log('\nChecking transaction status...');
        const status = await bsvService.getTransactionStatus(txid);
        console.log('Status:', {
            confirmed: status.confirmed,
            confirmations: status.confirmations,
            timestamp: new Date(status.timestamp).toISOString()
        });

        // Get transaction details
        console.log('\nFetching transaction details...');
        const txResponse = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}/hex`);
        const rawTxHex = await txResponse.text();
        
        // Parse raw transaction to get complete script
        console.log('\nParsing raw transaction...');
        const rawTxData = Buffer.from(rawTxHex, 'hex');
        
        // Helper function to read varint
        function readVarInt(buffer, offset) {
            const first = buffer[offset];
            if (first < 0xfd) {
                return { value: first, size: 1 };
            } else if (first === 0xfd) {
                return { value: buffer.readUInt16LE(offset + 1), size: 3 };
            } else if (first === 0xfe) {
                return { value: buffer.readUInt32LE(offset + 1), size: 5 };
            } else {
                const low = buffer.readUInt32LE(offset + 1);
                const high = buffer.readUInt32LE(offset + 5);
                return { value: high * 0x100000000 + low, size: 9 };
            }
        }
        
        // Skip version (4 bytes)
        let offset = 4;
        
        // Read input count
        const { value: inputCount, size: inputCountSize } = readVarInt(rawTxData, offset);
        offset += inputCountSize;
        
        // Skip inputs
        for (let i = 0; i < inputCount; i++) {
            offset += 36; // Previous tx hash (32) + output index (4)
            const { value: scriptLen, size: scriptLenSize } = readVarInt(rawTxData, offset);
            offset += scriptLenSize + scriptLen + 4; // script length + script + sequence
        }
        
        // Read output count
        const { value: outputCount, size: outputCountSize } = readVarInt(rawTxData, offset);
        offset += outputCountSize;
        
        // First output should be our OP_RETURN
        offset += 8; // Skip value (8 bytes)
        
        // Read script length
        const { value: scriptLen, size: scriptLenSize } = readVarInt(rawTxData, offset);
        offset += scriptLenSize;
        
        // Extract complete script
        const scriptData = rawTxData.slice(offset, offset + scriptLen);
        console.log('Complete script length:', scriptData.length);
        
        // Get transaction info for fee calculation
        const txData = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}`);
        const txJson = await txData.json();

        // Parse script data
        console.log('\nParsing inscription data...');
        console.log('Script start bytes:', scriptData.slice(0, 4).toString('hex'));

        // Initialize position
        let pos = 0;
        
        // Find OP_RETURN (0x6a)
        if (scriptData[0] === 0x00 && scriptData[1] === 0x6a) {
            // OP_FALSE OP_RETURN format
            pos = 2;
        } else if (scriptData[0] === 0x6a) {
            // OP_RETURN format
            pos = 1;
        } else {
            throw new Error('Invalid script start - expected OP_RETURN or OP_FALSE OP_RETURN');
        }
        
        const chunks = [];
        
        // Parse PUSHDATA4 chunks
        while (pos < scriptData.length) {
            const currentByte = scriptData[pos];
            console.log('Examining byte at position', pos, ':', currentByte.toString(16));
            
            if (currentByte === 0x4e) { // PUSHDATA4
                const length = scriptData.readUInt32LE(pos + 1);
                console.log(`Found PUSHDATA4 chunk at position ${pos}, length: ${length}`);
                pos += 5; // Skip PUSHDATA4 + length bytes
                
                if (pos + length > scriptData.length) {
                    console.warn(`Warning: Chunk at position ${pos} extends beyond script data`);
                    console.warn(`Remaining data: ${scriptData.length - pos} bytes`);
                    console.warn(`Claimed length: ${length} bytes`);
                    // Take all remaining data for this chunk
                    const chunk = scriptData.slice(pos);
                    chunks.push(chunk);
                    break;
                }

                const chunk = scriptData.slice(pos, pos + length);
                chunks.push(chunk);
                console.log(`Extracted chunk of ${chunk.length} bytes`);
                pos += length;
            } else {
                console.warn('Unexpected byte:', currentByte.toString(16), 'at position:', pos);
                pos++;
            }
        }

        if (chunks.length !== 2) {
            throw new Error(`Expected 2 PUSHDATA4 chunks, found ${chunks.length}`);
        }

        // Parse metadata
        const metadata = JSON.parse(chunks[0].toString('utf8'));
        console.log('\nMetadata:', metadata);
        
        if (metadata.type !== 'memepool' || metadata.version !== '1.0') {
            throw new Error('Invalid inscription format - wrong type or version');
        }

        // Extract video data
        const videoData = chunks[1];
        console.log('\nVideo data analysis:');
        console.log('Total size:', videoData.length, 'bytes');
        console.log('First 32 bytes:', videoData.slice(0, 32));
        console.log('Last 32 bytes:', videoData.slice(-32));
        
        // Verify video format
        const isMP4 = videoData.slice(4, 8).toString() === 'ftyp';
        if (!isMP4) {
            console.warn('Warning: Video data does not appear to be a valid MP4 file');
        }
        
        // Save video file
        const fileName = `extracted_${metadata.content.title}`;
        await fs.writeFile(fileName, videoData);
        console.log('Video saved to:', fileName);

        // Verify video integrity
        const videoSize = videoData.length;
        const expectedSize = metadata.content.metadata.size;
        const formatMatch = metadata.content.metadata.format === 'video/mp4' && isMP4;
        
        console.log('\nVideo integrity check:');
        console.log('Expected size:', expectedSize, 'bytes');
        console.log('Actual size:', videoSize, 'bytes');
        console.log('Size match:', videoSize === expectedSize);
        console.log('Format match:', formatMatch);
        
        if (!formatMatch) {
            console.warn('Warning: Video format mismatch or corruption detected');
        }

        if (videoSize !== expectedSize) {
            console.warn('Warning: Video size mismatch');
            console.warn('This could indicate truncated or corrupted data');
            if (videoSize < expectedSize) {
                console.warn(`Missing ${expectedSize - videoSize} bytes`);
            }
        }

        // Check ownership
        const changeOutput = txJson.vout[1];
        const currentOwner = changeOutput.scriptPubKey.addresses[0];
        console.log('\nOwnership:');
        console.log('Creator:', metadata.content.creator);
        console.log('Current owner:', currentOwner);
        console.log('Is owned by creator:', currentOwner === metadata.content.creator);

        // Calculate fee rate
        const txSize = txJson.size;
        const inputValue = txJson.vin.reduce((sum, input) => {
            return sum + (input.value || 0) * 100000000;
        }, 0);
        const outputValue = txJson.vout.reduce((sum, output) => {
            return sum + (output.value || 0) * 100000000;
        }, 0);
        const fee = inputValue - outputValue;
        const feeRate = (fee / txSize) * 1024; // Convert to sats/KB

        console.log('\nFee analysis:');
        console.log('Transaction size:', txSize, 'bytes');
        console.log('Fee paid:', fee, 'satoshis');
        console.log('Fee rate:', feeRate.toFixed(3), 'sats/KB');

    } catch (error) {
        console.error('Failed to verify inscription:', error);
        throw error;
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