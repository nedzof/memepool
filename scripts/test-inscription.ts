import { BSVService } from '../src/services/bsv-service';
import { TestnetWallet } from '../src/services/testnet-wallet';
import { InscriptionService } from '../src/services/inscription-service';
import type { 
  Inscription,
  InscriptionContent,
  InscriptionMetadata,
  InscriptionContentType
} from '../src/types/inscription';
import { BSVError } from '../src/types';
import fs from 'fs/promises';
import path from 'path';

interface VideoFile {
  buffer: Buffer;
  name: string;
  size: number;
  type: string;
}

async function createVideoFile(filePath: string): Promise<VideoFile> {
  const buffer = await fs.readFile(filePath);
  const name = path.basename(filePath);
  const size = (await fs.stat(filePath)).size;
  const type = path.extname(filePath).toLowerCase() === '.mp4' ? 'video/mp4' : 'video/webm';

  return {
    buffer,
    name,
    size,
    type
  };
}

async function testInscription(filePath: string): Promise<string> {
  try {
    console.log('Starting inscription test...');
    
    // Initialize services
    const wallet = new TestnetWallet('cRsKt5VevoePWtgn31nQT52PXMLaVDiALouhYUw2ogtNFMC5RPBy');
    const bsvService = new BSVService();
    const inscriptionService = new InscriptionService();

    // Get wallet address
    const address = await wallet.getAddress();
    console.log('Wallet address:', address);

    // Create file with metadata
    console.log('Reading file:', filePath);
    const file = await createVideoFile(filePath);
    console.log('File loaded:', file.name, 'Size:', file.size, 'bytes');

    // Get latest transaction for block info
    console.log('\nGetting latest transaction...');
    const utxos = await wallet.getUtxos();
    if (utxos.length === 0) {
      throw new BSVError('NO_UTXOS', 'No UTXOs found for wallet');
    }

    // Sort UTXOs by value (ascending) to use smallest sufficient UTXO
    utxos.sort((a, b) => a.satoshis - b.satoshis);

    // Calculate minimum required amount (fee will be calculated by BSV service)
    const inscriptionHolderAmount = 1; // 1 satoshi for inscription holder
    
    // Find the smallest UTXO that can cover our needs
    // Note: Actual fee will be calculated by BSV service
    const estimatedFee = 1000; // Conservative initial estimate
    const minimumRequired = inscriptionHolderAmount + estimatedFee;
    
    const selectedUtxo = utxos.find(utxo => utxo.satoshis >= minimumRequired);
    if (!selectedUtxo) {
      throw new BSVError('INSUFFICIENT_FUNDS', 
        `No suitable UTXO found. Need at least ${minimumRequired} satoshis`);
    }

    console.log('Selected UTXO:', {
      txId: selectedUtxo.txId,
      outputIndex: selectedUtxo.outputIndex,
      satoshis: selectedUtxo.satoshis,
      minimumRequired,
      availableForChange: selectedUtxo.satoshis - minimumRequired
    });

    // Create inscription content
    const content: InscriptionContent = {
      type: file.type as InscriptionContentType,
      data: file.buffer,
      size: file.size,
      duration: 4.01, // This should be dynamically determined
      width: 854,
      height: 480
    };

    // Create inscription metadata
    const metadata: InscriptionMetadata = {
      type: "memepool",
      version: "1.0",
      content: {
        type: file.type,
        size: file.size,
        duration: 4.01, // This should be dynamically determined
        width: 854,
        height: 480
      },
      metadata: {
        title: file.name,
        creator: address,
        createdAt: Date.now(),
        attributes: {
          blockHash: selectedUtxo.txId, // Using selected UTXO's TXID as reference
          bitrate: 312904,
          format: file.type,
          dimensions: '854x480'
        }
      }
    };

    // Create inscription data
    const inscriptionData = metadata;

    // Create inscription transaction
    console.log('\nCreating inscription transaction...');
    console.log('Transaction structure:');
    console.log('1. Input:', {
      txId: selectedUtxo.txId,
      vout: selectedUtxo.outputIndex,
      satoshis: selectedUtxo.satoshis
    });
    console.log('2. Outputs:');
    console.log('   a. OP_RETURN (inscription data): 0 satoshis');
    console.log('      - OP_FALSE OP_RETURN');
    console.log('      - PUSHDATA4 [metadata]');
    console.log('      - PUSHDATA4 [file data]');
    console.log('   b. Inscription holder (nonstandard): 1 satoshi');
    console.log('      - P2PKH script for:', address);
    console.log('      - OP_RETURN MEME marker (0x6a044d454d45)');
    console.log('   c. Change output (P2PKH): remaining amount minus fee');

    const txid = await bsvService.createInscriptionTransaction(
      inscriptionData, 
      Buffer.isBuffer(content.data) ? content.data : Buffer.concat(content.data.map(chunk => chunk.data))
    );
    console.log('Transaction ID:', txid);

    // Wait for confirmation
    console.log('\nWaiting 5 seconds before verification...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify transaction
    console.log('\nVerifying transaction...');
    const status = await bsvService.getTransactionStatus(txid);
    console.log('Transaction status:', status);

    // Create inscription object for validation
    const inscription: Inscription = {
      txid, // Using the actual transaction ID
      content,
      metadata,
      owner: address,
      location: {
        txid,
        vout: 0,
        script: selectedUtxo.script,
        satoshis: 1,
        height: 0 // Will be set when transaction is confirmed
      },
      transaction: {
        txid,
        confirmations: status.confirmations,
        timestamp: status.timestamp,
        fee: 0,
        blockHeight: 0 // Will be set when transaction is confirmed
      },
      history: []
    };

    // Validate inscription
    console.log('\nValidating inscription...');
    const validation = await inscriptionService.validateInscription(inscription);
    if (!validation.isValid) {
      throw new BSVError('INVALID_INSCRIPTION', `Validation failed: ${validation.errors.join(', ')}`);
    }
    console.log('Inscription validated successfully');

    console.log('\nTest completed successfully!');
    return txid;
  } catch (error) {
    if (error instanceof BSVError) {
      console.error('BSV Error during inscription test:', error.message, `(${error.code})`);
    } else {
      console.error('Error during inscription test:', error);
    }
    throw error;
  }
}

// Get file path from command line argument
const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a file path as an argument');
  process.exit(1);
}

// Run the test
testInscription(filePath).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
}); 