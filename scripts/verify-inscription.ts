import { BSVService } from '../src/services/bsv-service';
import { InscriptionMetadata } from '../src/types/inscription';
import fs from 'fs/promises';
import crypto from 'crypto';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, maxRetries = 3, delayMs = 1000): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) { // Too Many Requests
        console.log(`Rate limited, waiting ${delayMs}ms before retry ${attempt}/${maxRetries}`);
        await sleep(delayMs);
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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

function pubKeyHashToAddress(pubKeyHash: string): string {
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

function toBase58(buffer: Buffer): string {
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

interface TransactionOutput {
  value: number;
  scriptPubKey: {
    hex: string;
    type: string;
  };
}

interface Transaction {
  vin: Array<{ txid: string }>;
  vout: TransactionOutput[];
}

async function verifyInscription(txid: string): Promise<boolean> {
  try {
    const bsv = new BSVService();
    console.log('Testnet wallet initialized with address:', await bsv.getWalletAddress());
    console.log('Verifying inscription:', txid);

    // First, find the original inscription by following the UTXO chain backwards
    console.log('\nTracing back to original inscription...');
    let currentTxId = txid;
    let originalTxId: string | null = null;
    let currentTx: Transaction | null = null;

    while (!originalTxId) {
      // Get current transaction
      const txResponse = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${currentTxId}`);
      currentTx = await txResponse.json();

      await sleep(500); // Add delay between requests

      // Get raw transaction to check for OP_RETURN
      const rawResponse = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${currentTxId}/hex`);
      const txHex = await rawResponse.text();

      // If this transaction has OP_RETURN, it's the original inscription
      if (txHex.includes('006a')) {
        originalTxId = currentTxId;
        break;
      }

      // Otherwise, follow the input back
      if (!currentTx?.vin?.[0]) {
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
    
    console.log('Parsing raw transaction...');
    const txHex = await response.text();
    console.log('Complete script length:', txHex.length);

    // Debug the transaction structure
    console.log('\nLooking for OP_RETURN output...');
    
    // First, find any OP_RETURN
    const opReturnPos = txHex.indexOf('006a');
    if (opReturnPos === -1) {
      throw new Error('No OP_RETURN found in transaction');
    }
    console.log('Found OP_RETURN at position:', opReturnPos);

    // Extract all data after OP_RETURN
    const scriptData = txHex.slice(opReturnPos + 4); // Skip 006a
    console.log('Script data length:', scriptData.length);
    console.log('First 100 bytes of script:', scriptData.slice(0, 100));

    // Look for PUSHDATA opcodes
    const firstByte = parseInt(scriptData.slice(0, 2), 16);
    console.log('First byte after OP_RETURN:', firstByte.toString(16));

    // Handle different PUSHDATA variants
    let dataStart = 2; // Skip first byte
    let dataLength: number;

    if (firstByte <= 0x4b) {
      // Direct push of 1-75 bytes
      dataLength = firstByte;
      console.log('Direct push of', dataLength, 'bytes');
    } else if (firstByte === 0x4c) {
      // PUSHDATA1
      dataLength = parseInt(scriptData.slice(2, 4), 16);
      dataStart = 4;
      console.log('PUSHDATA1 of', dataLength, 'bytes');
    } else if (firstByte === 0x4d) {
      // PUSHDATA2
      dataLength = parseInt(scriptData.slice(2, 6).match(/../g)!.reverse().join(''), 16);
      dataStart = 6;
      console.log('PUSHDATA2 of', dataLength, 'bytes');
    } else if (firstByte === 0x4e) {
      // PUSHDATA4
      dataLength = parseInt(scriptData.slice(2, 10).match(/../g)!.reverse().join(''), 16);
      dataStart = 10;
      console.log('PUSHDATA4 of', dataLength, 'bytes');
    } else {
      throw new Error(`Unexpected opcode after OP_RETURN: ${firstByte.toString(16)}`);
    }

    // Extract the actual data
    const data = scriptData.slice(dataStart, dataStart + dataLength * 2);
    console.log('Extracted data length:', data.length);
    console.log('First 100 bytes of data:', data.slice(0, 100));

    // Try to parse the data directly as JSON first
    try {
      const jsonData = Buffer.from(data, 'hex').toString('utf8');
      console.log('\nTrying to parse as JSON...');
      const metadata: InscriptionMetadata = JSON.parse(jsonData);
      console.log('Successfully parsed metadata:', metadata);

      // Look for the next PUSHDATA4 chunk which should contain the video
      const remainingData = scriptData.slice(dataStart + dataLength * 2);
      console.log('\nLooking for video data...');
      console.log('Remaining data length:', remainingData.length);

      // Find the next PUSHDATA4
      let pos = 0;
      while (pos < remainingData.length) {
        const opcode = parseInt(remainingData.slice(pos, pos + 2), 16);
        if (opcode === 0x4e) {
          console.log('Found PUSHDATA4 for video at offset:', pos);
          
          // Read 4-byte length (little-endian)
          const lengthHex = remainingData.slice(pos + 2, pos + 10);
          const lengthBytes = lengthHex.match(/../g)!.reverse();
          const videoLength = parseInt(lengthBytes.join(''), 16);
          console.log('Video length from PUSHDATA4:', videoLength);
          
          // Extract video data
          const videoDataStart = pos + 10; // Skip opcode and length
          const videoData = Buffer.from(remainingData.slice(videoDataStart, videoDataStart + videoLength * 2), 'hex');
          
          console.log('\nFound inscription data:');
          console.log('Metadata size:', jsonData.length, 'bytes');
          console.log('Video size:', videoData.length, 'bytes');

          // Save video for verification
          const outputFile = `extracted_${metadata.metadata.title}`;
          await fs.writeFile(outputFile, videoData);
          console.log(`\nVideo saved to: ${outputFile}`);

          // Verify video integrity
          console.log('\nVideo integrity check:');
          console.log('Expected size:', metadata.content.size, 'bytes');
          console.log('Actual size:', videoData.length, 'bytes');
          console.log('Size match:', metadata.content.size === videoData.length);
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
          const currentOwnerOutput = currentTx?.vout.find(out => out.value === 0.00000001);
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
          console.log('Is creator:', currentOwnerAddress === metadata.metadata.creator ? 'Yes' : 'No');

          return true;
        }
        pos += 2;
      }
      throw new Error('Could not find video data PUSHDATA4 chunk');
    } catch (error) {
      console.error('Failed to parse data:', error);
      throw error;
    }
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
verifyInscription(txid).catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
}); 