import { BSVService } from '../src/services/bsv-service.js';
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

async function verifyOwnership(txid) {
    try {
        const bsv = new BSVService();
        console.log('Testnet wallet initialized with address:', await bsv.getWalletAddress());
        console.log('Verifying inscription ownership...');
        console.log('Transaction ID:', txid);

        console.log('\nFetching transaction info...');
        const response = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/tx/${txid}`);
        if (!response.ok) {
            throw new Error('Failed to fetch transaction info');
        }

        const txInfo = await response.json();
        console.log('Transaction confirmations:', txInfo.confirmations);

        console.log('\nAnalyzing outputs...');
        // Find the inscription holder output (1 satoshi with protection marker)
        const inscriptionOutput = txInfo.vout.find(out => out.value === 0.00000001);
        if (!inscriptionOutput) {
            throw new Error('No inscription holder output found');
        }

        // Extract the P2PKH address from the output
        const pubKeyHashMatch = inscriptionOutput.scriptPubKey.hex.match(/76a914([0-9a-f]{40})88ac/);
        if (!pubKeyHashMatch) {
            throw new Error('Invalid P2PKH script format');
        }

        // Convert pubKeyHash to address
        const currentOwnerAddress = pubKeyHashToAddress(pubKeyHashMatch[1]);

        // Log all outputs for debugging
        txInfo.vout.forEach((out, index) => {
            console.log(`Output ${index}: {`);
            console.log(`  address: '${currentOwnerAddress}',`);
            console.log(`  value: ${out.value},`);
            console.log(`  type: '${out.scriptPubKey.type}'`);
            console.log('}');
        });

        console.log('\nTracing ownership chain...');
        console.log('\nCurrent ownership details:');
        console.log('Initial owner:', await bsv.getWalletAddress());
        console.log('Current owner:', currentOwnerAddress);
        console.log('Final transaction:', txid);
        console.log('Final output index:', inscriptionOutput.n);

        // Get balance of current owner
        const balanceResponse = await fetchWithRetry(`https://api.whatsonchain.com/v1/bsv/test/address/${currentOwnerAddress}/balance`);
        if (balanceResponse.ok) {
            const balance = await balanceResponse.json();
            console.log('\nCurrent owner balance:', balance);
        }

        return true;
    } catch (error) {
        console.error('Failed to verify ownership:', error);
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
verifyOwnership(txid); 