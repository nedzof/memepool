import { BSVService } from '../src/services/bsv-service';
import { TestnetWallet } from '../src/services/testnet-wallet';
import { InscriptionService } from '../src/services/inscription-service';
import type { 
  Inscription,
  InscriptionContent,
  InscriptionMetadata,
  InscriptionContentType
} from '../src/types/inscription';
import { VideoMetadata } from '../src/types/video';
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
    const videoFile = await createVideoFile(filePath);
    console.log('File loaded:', videoFile.name, 'Size:', videoFile.size, 'bytes');

    // Get latest transaction for block info
    console.log('\nGetting latest transaction...');
    const utxos = await wallet.getUtxos();
    if (utxos.length === 0) {
      throw new BSVError('NO_UTXOS', 'No UTXOs found for wallet');
    }

    // Sort UTXOs by value (ascending) to use smallest sufficient UTXO
    utxos.sort((a, b) => a.satoshis - b.satoshis);

    // Calculate minimum required amount
    const inscriptionHolderAmount = 1;
    const estimatedFee = 1000;
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

    // Create video metadata
    const videoMetadata: VideoMetadata = {
      duration: 4.01,
      dimensions: {
        width: 854,
        height: 480
      },
      codec: 'h264',
      bitrate: 312904
    };

    // Create inscription data
    console.log('\nCreating inscription data...');
    const inscriptionData = await inscriptionService.createInscriptionData({
      videoFile,
      metadata: videoMetadata,
      creatorAddress: address,
      blockHash: selectedUtxo.txId
    });

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
    console.log('   b. Inscription holder (nonstandard): 1 satoshi');
    console.log('      - P2PKH script for:', address);
    console.log('      - Original inscription ID');
    console.log('      - OP_RETURN MEME marker');
    console.log('   c. Change output (P2PKH): remaining amount minus fee');

    // Create initial transaction with temporary script
    const txid = await bsvService.createInscriptionTransaction(
      inscriptionData.metadata,
      Buffer.isBuffer(inscriptionData.content.data) 
        ? inscriptionData.content.data 
        : Buffer.concat(inscriptionData.content.data.map(chunk => chunk.data)),
      inscriptionData.holderScript
    );
    console.log('Transaction ID:', txid);

    // Wait for confirmation
    console.log('\nWaiting 5 seconds before verification...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify transaction
    console.log('\nVerifying transaction...');
    const status = await bsvService.getTransactionStatus(txid);
    console.log('Transaction status:', status);

    // Get the final holder script with the actual txid
    const finalHolderScript = inscriptionService.updateHolderScript(address, txid);

    // Create inscription object for validation
    const inscription: Inscription = {
      txid,
      content: inscriptionData.content,
      metadata: inscriptionData.metadata,
      owner: address,
      location: {
        txid,
        vout: 1,
        script: finalHolderScript,
        satoshis: 1,
        height: 0,
        metadata: {
          version: 1,
          prefix: 'meme',
          operation: 'inscribe',
          name: videoFile.name,
          contentID: inscriptionData.inscriptionId,
          txid: 'deploy',
          creator: address
        }
      },
      transaction: {
        txid,
        confirmations: status.confirmations,
        timestamp: status.timestamp,
        fee: 0,
        blockHeight: 0
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

    // Print metadata for verification
    console.log('\nInscription details:');
    console.log('Content type:', inscriptionData.content.type);
    console.log('Content size:', inscriptionData.content.size, 'bytes');
    console.log('Video duration:', inscriptionData.metadata.content.duration, 'seconds');
    console.log('Resolution:', `${inscriptionData.metadata.content.width}x${inscriptionData.metadata.content.height}`);
    console.log('Creator:', inscriptionData.metadata.metadata.creator);
    console.log('Creation time:', new Date(inscriptionData.metadata.metadata.createdAt).toISOString());
    console.log('Block hash:', inscriptionData.metadata.metadata.attributes.blockHash);

    console.log('\nTest completed successfully!');
    return txid;
  } catch (error) {
    if (error instanceof BSVError) {
      console.error('BSV Error during inscription test:', error.message, `(${error.code})`);
    } else {
      const err = error as Error;
      console.error('Error during inscription test:', err.message);
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