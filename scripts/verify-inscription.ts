import { BSVService } from '../src/services/bsv-service';
import { InscriptionMetadata, HolderMetadata } from '../src/types/inscription';
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

    // Try to parse the data as JSON
    try {
      const jsonData = Buffer.from(data, 'hex').toString();
      console.log('\nTrying to parse as JSON...');
      const metadata: InscriptionMetadata = JSON.parse(jsonData);
      console.log('Successfully parsed metadata:', metadata);

      // Look for the next PUSHDATA chunk which should contain the video
      const remainingData = scriptData.slice(dataStart + dataLength * 2);
      console.log('\nLooking for video data...');
      console.log('Remaining data length:', remainingData.length);

      // Find the next PUSHDATA
      let pos = 0;
      while (pos < remainingData.length) {
        const opcode = parseInt(remainingData.slice(pos, pos + 2), 16);
        if (opcode === 0x4e || opcode <= 0x4b || opcode === 0x4c || opcode === 0x4d) {
          console.log('Found PUSHDATA for video at offset:', pos);
          
          // Get video data length based on PUSHDATA type
          let videoLength: number;
          let videoDataStart: number;
          
          if (opcode <= 0x4b) {
            videoLength = opcode;
            videoDataStart = pos + 2;
          } else if (opcode === 0x4c) {
            videoLength = parseInt(remainingData.slice(pos + 2, pos + 4), 16);
            videoDataStart = pos + 4;
          } else if (opcode === 0x4d) {
            videoLength = parseInt(remainingData.slice(pos + 2, pos + 6).match(/../g)!.reverse().join(''), 16);
            videoDataStart = pos + 6;
          } else {
            videoLength = parseInt(remainingData.slice(pos + 2, pos + 10).match(/../g)!.reverse().join(''), 16);
            videoDataStart = pos + 10;
          }
          
          console.log('Video length from PUSHDATA:', videoLength);
          
          // Extract video data
          const videoData = Buffer.from(remainingData.slice(videoDataStart, videoDataStart + videoLength * 2), 'hex');
          
          console.log('\nFound inscription data:');
          console.log('Metadata size:', Buffer.from(data, 'hex').length, 'bytes');
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

          // Get current owner from the input transaction
          console.log('\nOwnership details:');
          console.log('Original transaction:', originalTxId);
          console.log('Current transaction:', txid);
          
          // Get the current owner from the 1 satoshi output
          const currentOwnerOutput = currentTx?.vout.find(out => out.value === 0.00000001);
          if (!currentOwnerOutput) {
            throw new Error('No valid inscription holder output found');
          }

          // Extract the P2PKH script and JSON metadata from the output
          const scriptHex = currentOwnerOutput.scriptPubKey.hex;
          const p2pkhMatch = scriptHex.match(/76a914([0-9a-f]{40})88ac/);
          if (!p2pkhMatch) {
            throw new Error('Invalid P2PKH script format');
          }

          // Convert pubKeyHash to address
          const currentOwnerAddress = pubKeyHashToAddress(p2pkhMatch[1]);

          // Extract and decode holder metadata
          const p2pkhScript = scriptHex.slice(0, 50);  // 76a914{20-bytes}88ac is 50 chars
          const opReturnStart = scriptHex.indexOf('6a', 50);  // Look for OP_RETURN after P2PKH
          
          if (opReturnStart > 0) {
            const opReturnData = scriptHex.slice(opReturnStart + 2);  // Skip the 6a
            console.log('\nExtracting holder metadata:');
            console.log('P2PKH script:', p2pkhScript);
            console.log('OP_RETURN position:', opReturnStart);
            console.log('OP_RETURN data:', opReturnData);
            
            // Handle PUSHDATA prefixes
            let jsonStartIndex = 0;
            let jsonLength = 0;
            
            if (opReturnData.startsWith('4c')) {
              // PUSHDATA1: 1 byte length
              const lengthHex = opReturnData.slice(2, 4);
              jsonLength = parseInt(lengthHex, 16);
              jsonStartIndex = 4;
              console.log('PUSHDATA1 detected:');
              console.log('- Length hex:', lengthHex);
              console.log('- Decoded length:', jsonLength);
            } else if (opReturnData.startsWith('4d')) {
              // PUSHDATA2: 2 bytes length
              const lengthHex = opReturnData.slice(2, 6);
              jsonLength = parseInt(lengthHex.match(/../g)!.reverse().join(''), 16);
              jsonStartIndex = 6;
              console.log('PUSHDATA2 detected:');
              console.log('- Length hex:', lengthHex);
              console.log('- Decoded length:', jsonLength);
            } else if (opReturnData.startsWith('4e')) {
              // PUSHDATA4: 4 bytes length
              const lengthHex = opReturnData.slice(2, 10);
              jsonLength = parseInt(lengthHex.match(/../g)!.reverse().join(''), 16);
              jsonStartIndex = 10;
              console.log('PUSHDATA4 detected:');
              console.log('- Length hex:', lengthHex);
              console.log('- Decoded length:', jsonLength);
            } else {
              // Direct push: 1 byte length
              const lengthHex = opReturnData.slice(0, 2);
              jsonLength = parseInt(lengthHex, 16);
              jsonStartIndex = 2;
              console.log('Direct push detected:');
              console.log('- Length hex:', lengthHex);
              console.log('- Decoded length:', jsonLength);
            }
            
            // Extract JSON data
            const jsonHex = opReturnData.slice(jsonStartIndex, jsonStartIndex + (jsonLength * 2));
            console.log('\nExtracted JSON data:');
            console.log('- Start index:', jsonStartIndex);
            console.log('- Length:', jsonLength);
            console.log('- Hex:', jsonHex);
            
            const jsonBuffer = Buffer.from(jsonHex, 'hex');
            
            try {
              const holderMetadata = JSON.parse(jsonBuffer.toString()) as HolderMetadata;
              console.log('\nHolder Script Analysis:');
              console.log('------------------------');
              console.log('1. Script Components:');
              console.log('   - P2PKH Script (lock):', p2pkhScript);
              console.log('   - OP_RETURN Marker: 0x6a');
              console.log('   - PUSHDATA Format:', opReturnData.startsWith('4c') ? 'PUSHDATA1' :
                                                opReturnData.startsWith('4d') ? 'PUSHDATA2' :
                                                opReturnData.startsWith('4e') ? 'PUSHDATA4' : 'Direct Push');
              console.log('   - JSON Data Length:', jsonLength, 'bytes');
              
              console.log('\n2. Holder Metadata (Decoded):');
              console.log('   Version:', holderMetadata.version);
              console.log('   Prefix:', holderMetadata.prefix);
              console.log('   Operation:', holderMetadata.operation);
              console.log('   Name:', holderMetadata.name);
              console.log('   Content ID:', holderMetadata.contentID);
              console.log('   Transaction ID:', holderMetadata.txid);
              console.log('   Creator:', holderMetadata.creator);

              console.log('\n3. Validation:');
              const validationResults = {
                hasVersion: typeof holderMetadata.version === 'number',
                hasPrefix: holderMetadata.prefix === 'meme',
                hasValidOp: ['inscribe', 'transfer'].includes(holderMetadata.operation),
                hasName: typeof holderMetadata.name === 'string',
                hasContentId: typeof holderMetadata.contentID === 'string',
                hasTxid: typeof holderMetadata.txid === 'string',
                hasCreator: typeof holderMetadata.creator === 'string'
              };

              Object.entries(validationResults).forEach(([key, value]) => {
                console.log(`   ${key}: ${value ? '✓' : '✗'}`);
              });

              console.log('\n4. Original JSON Structure:');
              console.log(JSON.stringify({
                version: holderMetadata.version,
                prefix: holderMetadata.prefix,
                operation: holderMetadata.operation,
                name: holderMetadata.name,
                contentID: holderMetadata.contentID,
                txid: holderMetadata.txid,
                creator: holderMetadata.creator
              }, null, 2));

            } catch (error) {
              console.error('Failed to decode holder metadata:', error);
              console.log('Debug info:');
              console.log('JSON buffer length:', jsonBuffer.length);
              console.log('First few bytes:', Buffer.from(jsonBuffer.slice(0, 10)).toString('hex'));
            }
          }

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
      throw new Error('Could not find video data PUSHDATA chunk');
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