import { BSVService } from '../src/services/bsv-service';
import { TestnetWallet } from '../src/services/testnet-wallet';
import { OwnershipTransferService } from '../src/services/ownership-transfer-service';
import { TransactionVerificationService } from '../src/services/transaction-verification-service';
import { BSVError } from '../src/types';
import { UTXO } from '../src/types/bsv';

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
      const isMEME = scriptHex.includes('6a044d454d45');
      const hasInscriptionId = scriptHex.includes('6a20');
      console.log(`- TXID: ${utxo.txId}`);
      console.log(`  Output Index: ${utxo.outputIndex}`);
      console.log(`  Satoshis: ${utxo.satoshis}`);
      console.log(`  Script Type: ${isMEME ? 'MEME (nonstandard)' : 'standard'}`);
      if (isMEME) {
        console.log(`  Has Inscription ID: ${hasInscriptionId}`);
        if (hasInscriptionId) {
          const match = scriptHex.match(/6a20([0-9a-f]{64})/);
          if (match) {
            console.log(`  Original Inscription ID: ${match[1]}`);
          }
        }
      }
      console.log(`  Script: ${scriptHex}`);
    });

    const initialBalance = initialUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
    console.log('\nInitial wallet balance:', initialBalance, 'satoshis');

    // Find the inscription holder UTXO
    const inscriptionUtxo = initialUtxos.find((utxo: UTXO) => {
      const scriptHex = utxo.script.toHex();
      return scriptHex.includes('6a044d454d45') && // Has MEME marker
             scriptHex.includes('6a20') && // Has inscription ID
             utxo.satoshis === 1; // Is 1 satoshi
    });

    if (!inscriptionUtxo) {
      throw new BSVError('UTXO_ERROR', 'No inscription holder UTXO found in wallet');
    }

    console.log('\nFound inscription holder UTXO:');
    console.log('TXID:', inscriptionUtxo.txId);
    console.log('Output Index:', inscriptionUtxo.outputIndex);
    console.log('Script:', inscriptionUtxo.script.toHex());

    // Extract original inscription ID
    const scriptHex = inscriptionUtxo.script.toHex();
    const originalInscriptionIdMatch = scriptHex.match(/6a20([0-9a-f]{64})/);
    if (!originalInscriptionIdMatch) {
      throw new BSVError('INSCRIPTION_ERROR', 'Could not find original inscription ID in holder script');
    }

    const originalInscriptionId = originalInscriptionIdMatch[1];
    console.log('Original inscription ID:', originalInscriptionId);

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
    console.log('   - Script type: P2PKH + Original TXID + MEME marker');
    console.log('   - Original inscription:', originalInscriptionId);
    console.log('   - Value: 1 satoshi');
    console.log('2. Output: New inscription holder');
    console.log('   - Address:', recipientAddress);
    console.log('   - Script type: P2PKH + Original TXID + MEME marker');
    console.log('   - Value: 1 satoshi');
    console.log('3. Output: Change (if any)');
    console.log('   - Address:', senderAddress);
    console.log('   - Script type: P2PKH');

    const transferTxId = await transferService.createTransferTransaction(
      inscriptionUtxo.txId,
      recipientAddress,
      { originalInscriptionId }
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
      return scriptHex.includes('6a044d454d45'); // MEME marker
    });

    if (newHolderOutput) {
      const newScriptHex = newHolderOutput.lockingScript.toHex();
      console.log('\nNew holder script analysis:');
      console.log('Full script:', newScriptHex);
      console.log('Has P2PKH:', /76a914[0-9a-f]{40}88ac/.test(newScriptHex));
      console.log('Has original TXID:', newScriptHex.includes(originalInscriptionId));
      console.log('Has MEME marker:', newScriptHex.includes('6a044d454d45'));
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
      const isMEME = scriptHex.includes('6a044d454d45');
      const hasInscriptionId = scriptHex.includes('6a20');
      console.log(`- TXID: ${utxo.txId}`);
      console.log(`  Output Index: ${utxo.outputIndex}`);
      console.log(`  Satoshis: ${utxo.satoshis}`);
      console.log(`  Script Type: ${isMEME ? 'MEME (nonstandard)' : 'standard'}`);
      if (isMEME) {
        console.log(`  Has Inscription ID: ${hasInscriptionId}`);
        if (hasInscriptionId) {
          const match = scriptHex.match(/6a20([0-9a-f]{64})/);
          if (match) {
            console.log(`  Original Inscription ID: ${match[1]}`);
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