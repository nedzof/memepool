import { BSVService } from '../src/services/bsv-service';
import { TestnetWallet } from '../src/services/testnet-wallet';
import { OwnershipTransferService } from '../src/services/ownership-transfer-service';
import { TransactionVerificationService } from '../src/services/transaction-verification-service';
import { BSVError } from '../src/types';
import { Script } from '@bsv/sdk';
import { UTXO } from '../src/types/bsv';
import { HolderMetadata } from '../src/types/inscription';

async function testOwnershipTransfer(inscriptionTxId: string, recipientAddress: string): Promise<void> {
  try {
    console.log('Starting ownership transfer test...');
    console.log('Inscription TXID:', inscriptionTxId);
    console.log('Recipient address:', recipientAddress);

    // Initialize services
    const bsvService = new BSVService();
    const verificationService = new TransactionVerificationService(bsvService);
    const transferService = new OwnershipTransferService(bsvService, verificationService);

    // Get current wallet address
    const senderAddress = await bsvService.getWalletAddress();
    console.log('\nSender address:', senderAddress);

    // Get initial UTXOs and analyze them
    const initialUtxos = await bsvService.wallet.getUtxos();
    console.log('\nInitial UTXOs:');
    initialUtxos.forEach((utxo: UTXO) => {
      const scriptHex = utxo.script.toHex();
      const hasP2PKH = /76a914[0-9a-f]{40}88ac/.test(scriptHex);
      const hasOpReturn = scriptHex.includes('6a');
      console.log(`- TXID: ${utxo.txId}`);
      console.log(`  Output Index: ${utxo.outputIndex}`);
      console.log(`  Satoshis: ${utxo.satoshis}`);
      console.log(`  Script Type: ${hasP2PKH && hasOpReturn ? 'Inscription holder' : 'standard'}`);
      if (hasP2PKH && hasOpReturn) {
        // Extract and decode holder metadata
        const p2pkhScript = scriptHex.slice(0, 50);  // 76a914{20-bytes}88ac is 50 chars
        const opReturnStart = scriptHex.indexOf('6a', 50);
        if (opReturnStart > 0) {
          const opReturnData = scriptHex.slice(opReturnStart + 2);
          let jsonStartIndex = 0;
          let jsonLength = 0;
          
          // Handle PUSHDATA prefixes
          if (opReturnData.startsWith('4c')) {
            jsonLength = parseInt(opReturnData.slice(2, 4), 16);
            jsonStartIndex = 4;
          } else if (opReturnData.startsWith('4d')) {
            jsonLength = parseInt(opReturnData.slice(2, 6).match(/../g)!.reverse().join(''), 16);
            jsonStartIndex = 6;
          } else if (opReturnData.startsWith('4e')) {
            jsonLength = parseInt(opReturnData.slice(2, 10).match(/../g)!.reverse().join(''), 16);
            jsonStartIndex = 10;
          } else {
            jsonLength = parseInt(opReturnData.slice(0, 2), 16);
            jsonStartIndex = 2;
          }

          const jsonHex = opReturnData.slice(jsonStartIndex, jsonStartIndex + (jsonLength * 2));
          const jsonBuffer = Buffer.from(jsonHex, 'hex');
          try {
            const metadata = JSON.parse(jsonBuffer.toString()) as HolderMetadata;
            console.log('  Holder Metadata:');
            console.log('    Version:', metadata.version);
            console.log('    Prefix:', metadata.prefix);
            console.log('    Operation:', metadata.operation);
            console.log('    Name:', metadata.name);
            console.log('    Content ID:', metadata.contentID);
            console.log('    Transaction ID:', metadata.txid);
            console.log('    Creator:', metadata.creator);
          } catch (error) {
            console.log('  Failed to decode metadata:', error);
          }
        }
      }
      console.log(`  Script: ${scriptHex}`);
    });

    const initialBalance = initialUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
    console.log('\nInitial wallet balance:', initialBalance, 'satoshis');

    // Find the inscription holder UTXO
    const inscriptionUtxo = initialUtxos.find((utxo: UTXO) => utxo.txId === inscriptionTxId);

    if (!inscriptionUtxo) {
      throw new BSVError('UTXO_ERROR', 'No inscription holder UTXO found in wallet');
    }

    // Fetch complete transaction data to get the full script
    const txResponse = await bsvService.wallet.fetchWithRetry(
      `https://api.whatsonchain.com/v1/bsv/test/tx/${inscriptionTxId}`
    );
    const txData = await txResponse.json();

    // Find the output with nonstandard type and P2PKH + OP_RETURN format
    const inscriptionOutput = txData.vout.find((out: any) => 
      out.scriptPubKey.type === 'nonstandard' && 
      out.scriptPubKey.hex.match(/76a914[0-9a-f]{40}88ac.*6a/)
    );

    if (!inscriptionOutput) {
      throw new BSVError('INSCRIPTION_ERROR', 'No inscription output found in transaction');
    }

    // Update UTXO with correct script and output index
    inscriptionUtxo.script = Script.fromHex(inscriptionOutput.scriptPubKey.hex);
    inscriptionUtxo.outputIndex = inscriptionOutput.n;
    inscriptionUtxo.satoshis = Math.round(inscriptionOutput.value * 100000000); // Convert BSV to satoshis

    console.log('\nFound inscription holder UTXO:');
    console.log('TXID:', inscriptionUtxo.txId);
    console.log('Output Index:', inscriptionUtxo.outputIndex);
    console.log('Script:', inscriptionUtxo.script.toHex());

    // Extract and decode holder metadata
    const scriptHex = inscriptionUtxo.script.toHex();
    const p2pkhScript = scriptHex.slice(0, 50);  // 76a914{20-bytes}88ac is 50 chars
    const opReturnStart = scriptHex.indexOf('6a', 50);
    
    console.log('\nExtracting JSON metadata:');
    console.log('Full script hex:', scriptHex);
    console.log('P2PKH script:', p2pkhScript);
    console.log('OP_RETURN start position:', opReturnStart);
    
    if (opReturnStart < 0) {
      throw new BSVError('INSCRIPTION_ERROR', 'Invalid holder script format');
    }

    const opReturnData = scriptHex.slice(opReturnStart + 2);
    console.log('OP_RETURN data:', opReturnData);
    
    let jsonStartIndex = 0;
    let jsonLength = 0;
    
    // Handle PUSHDATA prefixes
    if (opReturnData.startsWith('4c')) {
      jsonLength = parseInt(opReturnData.slice(2, 4), 16);
      jsonStartIndex = 4;
      console.log('Found PUSHDATA1 prefix, length:', jsonLength);
    } else if (opReturnData.startsWith('4d')) {
      jsonLength = parseInt(opReturnData.slice(2, 6).match(/../g)!.reverse().join(''), 16);
      jsonStartIndex = 6;
      console.log('Found PUSHDATA2 prefix, length:', jsonLength);
    } else if (opReturnData.startsWith('4e')) {
      jsonLength = parseInt(opReturnData.slice(2, 10).match(/../g)!.reverse().join(''), 16);
      jsonStartIndex = 10;
      console.log('Found PUSHDATA4 prefix, length:', jsonLength);
    } else {
      jsonLength = parseInt(opReturnData.slice(0, 2), 16);
      jsonStartIndex = 2;
      console.log('Found direct push prefix, length:', jsonLength);
    }

    const jsonHex = opReturnData.slice(jsonStartIndex, jsonStartIndex + (jsonLength * 2));
    console.log('JSON hex:', jsonHex);
    console.log('JSON length:', jsonLength);
    
    const jsonBuffer = Buffer.from(jsonHex, 'hex');
    console.log('JSON buffer length:', jsonBuffer.length);
    console.log('First few bytes:', jsonBuffer.slice(0, 10));
    
    try {
      const holderMetadata = JSON.parse(jsonBuffer.toString()) as HolderMetadata;
      console.log('\nHolder Metadata:');
      console.log('Version:', holderMetadata.version);
      console.log('Prefix:', holderMetadata.prefix);
      console.log('Operation:', holderMetadata.operation);
      console.log('Name:', holderMetadata.name);
      console.log('Content ID:', holderMetadata.contentID);
      console.log('Transaction ID:', holderMetadata.txid);
      console.log('Creator:', holderMetadata.creator);

      // Verify current ownership
      console.log('\nVerifying current ownership...');
      const isOwner = await verificationService.validateOwnership(senderAddress, inscriptionUtxo.txId);
      if (!isOwner) {
        throw new BSVError('OWNERSHIP_ERROR', 'Current wallet is not the owner of this inscription');
      }
      console.log('Ownership verified for sender');

      // Create transfer transaction
      console.log('\nCreating transfer transaction...');
      console.log('Transaction structure:');
      console.log('1. Input: Inscription holder UTXO');
      console.log('   - TXID:', inscriptionUtxo.txId);
      console.log('   - Script type: P2PKH + OP_RETURN JSON');
      console.log('   - Content ID:', holderMetadata.contentID);
      console.log('   - Value: 1 satoshi');
      console.log('2. Output: New inscription holder');
      console.log('   - Address:', recipientAddress);
      console.log('   - Script type: P2PKH + OP_RETURN JSON');
      console.log('   - Value: 1 satoshi');
      console.log('3. Output: Change (if any)');
      console.log('   - Address:', senderAddress);
      console.log('   - Script type: P2PKH');

      const transferTxId = await transferService.createTransferTransaction(
        inscriptionUtxo.txId,
        recipientAddress,
        {}
      );
      console.log('\nTransfer transaction created:', transferTxId);

      // Get transaction details
      const tx = await bsvService.getTransaction(transferTxId);
      console.log('\nTransaction details:');
      console.log('Size:', tx.toHex().length / 2, 'bytes');
      console.log('Input count:', tx.inputs.length);
      console.log('Output count:', tx.outputs.length);

      // Verify holder script format
      const newHolderOutput = tx.outputs.find(output => {
        const scriptHex = output.lockingScript.toHex();
        return scriptHex.match(/76a914[0-9a-f]{40}88ac.*6a/);
      });

      if (newHolderOutput) {
        const newScriptHex = newHolderOutput.lockingScript.toHex();
        console.log('\nNew holder script analysis:');
        console.log('Full script:', newScriptHex);
        
        // Extract and decode new holder metadata
        const p2pkhScript = newScriptHex.slice(0, 50);
        const opReturnStart = newScriptHex.indexOf('6a', 50);
        if (opReturnStart > 0) {
          const opReturnData = newScriptHex.slice(opReturnStart + 2);
          let jsonStartIndex = 0;
          let jsonLength = 0;
          
          // Handle PUSHDATA prefixes
          if (opReturnData.startsWith('4c')) {
            jsonLength = parseInt(opReturnData.slice(2, 4), 16);
            jsonStartIndex = 4;
          } else if (opReturnData.startsWith('4d')) {
            jsonLength = parseInt(opReturnData.slice(2, 6).match(/../g)!.reverse().join(''), 16);
            jsonStartIndex = 6;
          } else if (opReturnData.startsWith('4e')) {
            jsonLength = parseInt(opReturnData.slice(2, 10).match(/../g)!.reverse().join(''), 16);
            jsonStartIndex = 10;
          } else {
            jsonLength = parseInt(opReturnData.slice(0, 2), 16);
            jsonStartIndex = 2;
          }

          const jsonHex = opReturnData.slice(jsonStartIndex, jsonStartIndex + (jsonLength * 2));
          const jsonBuffer = Buffer.from(jsonHex, 'hex');
          try {
            const newMetadata = JSON.parse(jsonBuffer.toString()) as HolderMetadata;
            console.log('\nNew Holder Metadata:');
            console.log('Version:', newMetadata.version);
            console.log('Prefix:', newMetadata.prefix);
            console.log('Operation:', newMetadata.operation);
            console.log('Name:', newMetadata.name);
            console.log('Content ID:', newMetadata.contentID);
            console.log('Transaction ID:', newMetadata.txid);
            console.log('Creator:', newMetadata.creator);
            
            console.log('\nMetadata Validation:');
            console.log('Operation changed to transfer:', newMetadata.operation === 'transfer');
            console.log('Content ID preserved:', newMetadata.contentID === holderMetadata.contentID);
            console.log('Creator preserved:', newMetadata.creator === holderMetadata.creator);
          } catch (error) {
            console.log('Failed to decode new metadata:', error);
          }
        }
        
        console.log('\nScript Analysis:');
        console.log('Has P2PKH:', /76a914[0-9a-f]{40}88ac/.test(newScriptHex));
        console.log('Has OP_RETURN:', newScriptHex.includes('6a'));
        console.log('Value:', newHolderOutput.satoshis, 'satoshis');
      }

      // Wait for network propagation
      console.log('\nWaiting 5 seconds for network propagation...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify transfer status
      console.log('\nVerifying transfer status...');
      const transferStatus = await transferService.getTransferStatus(transferTxId);
      console.log('Transfer status:', {
        confirmed: transferStatus.confirmed,
        confirmations: transferStatus.confirmations,
        timestamp: new Date(transferStatus.timestamp).toISOString()
      });

      // Verify new ownership
      console.log('\nVerifying new ownership...');
      const recipientIsOwner = await verificationService.validateOwnership(recipientAddress, transferTxId);
      if (!recipientIsOwner) {
        console.warn('Warning: New ownership not yet confirmed. This is normal if the transaction is not yet confirmed.');
      } else {
        console.log('New ownership confirmed for recipient');
      }

      // Get final UTXOs and analyze them
      const finalUtxos = await bsvService.wallet.getUtxos();
      console.log('\nFinal UTXOs:');
      finalUtxos.forEach((utxo: UTXO) => {
        const scriptHex = utxo.script.toHex();
        const hasP2PKH = /76a914[0-9a-f]{40}88ac/.test(scriptHex);
        const hasOpReturn = scriptHex.includes('6a');
        console.log(`- TXID: ${utxo.txId}`);
        console.log(`  Output Index: ${utxo.outputIndex}`);
        console.log(`  Satoshis: ${utxo.satoshis}`);
        console.log(`  Script Type: ${hasP2PKH && hasOpReturn ? 'Inscription holder' : 'standard'}`);
        if (hasP2PKH && hasOpReturn) {
          // Extract and decode holder metadata
          const p2pkhScript = scriptHex.slice(0, 50);
          const opReturnStart = scriptHex.indexOf('6a', 50);
          if (opReturnStart > 0) {
            const opReturnData = scriptHex.slice(opReturnStart + 2);
            let jsonStartIndex = 0;
            let jsonLength = 0;
            
            // Handle PUSHDATA prefixes
            if (opReturnData.startsWith('4c')) {
              jsonLength = parseInt(opReturnData.slice(2, 4), 16);
              jsonStartIndex = 4;
            } else if (opReturnData.startsWith('4d')) {
              jsonLength = parseInt(opReturnData.slice(2, 6).match(/../g)!.reverse().join(''), 16);
              jsonStartIndex = 6;
            } else if (opReturnData.startsWith('4e')) {
              jsonLength = parseInt(opReturnData.slice(2, 10).match(/../g)!.reverse().join(''), 16);
              jsonStartIndex = 10;
            } else {
              jsonLength = parseInt(opReturnData.slice(0, 2), 16);
              jsonStartIndex = 2;
            }

            const jsonHex = opReturnData.slice(jsonStartIndex, jsonStartIndex + (jsonLength * 2));
            const jsonBuffer = Buffer.from(jsonHex, 'hex');
            try {
              const metadata = JSON.parse(jsonBuffer.toString()) as HolderMetadata;
              console.log('  Holder Metadata:');
              console.log('    Version:', metadata.version);
              console.log('    Prefix:', metadata.prefix);
              console.log('    Operation:', metadata.operation);
              console.log('    Name:', metadata.name);
              console.log('    Content ID:', metadata.contentID);
              console.log('    Transaction ID:', metadata.txid);
              console.log('    Creator:', metadata.creator);
            } catch (error) {
              console.log('  Failed to decode metadata:', error);
            }
          }
        }
        console.log(`  Script: ${scriptHex}`);
      });

      const finalBalance = finalUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
      console.log('\nFinal wallet balance:', finalBalance, 'satoshis');
      console.log('Total fee paid:', initialBalance - finalBalance, 'satoshis');
      console.log('Fee rate:', ((initialBalance - finalBalance) * 1000) / (tx.toHex().length / 2), 'sat/kb');

      console.log('\nTransfer test completed successfully!');
    } catch (error) {
      if (error instanceof BSVError) {
        console.error('BSV Error during transfer test:', error.message, `(${error.code})`);
      } else {
        console.error('Error during transfer test:', error);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof BSVError) {
      console.error('BSV Error during transfer test:', error.message, `(${error.code})`);
    } else {
      console.error('Error during transfer test:', error);
    }
    throw error;
  }
}

// Get command line arguments
const inscriptionTxId = process.argv[2];
const recipientAddress = process.argv[3];

if (!inscriptionTxId || !recipientAddress) {
  console.error('Usage: tsx scripts/test-ownership-transfer.ts <inscriptionTxId> <recipientAddress>');
  process.exit(1);
}

// Run the test
testOwnershipTransfer(inscriptionTxId, recipientAddress).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
}); 