import InscriptionSecurityService from '../src/services/inscription-security-service.js';

async function runSecurityChecks(txid, senderAddress = 'n2SqMQ3vsUq6d1MYX8rpyY3m78aQi6bLLJ') {
  console.log('\nRunning Security Checks');
  console.log('=====================');
  console.log(`Transaction ID: ${txid}`);
  console.log(`Sender Address: ${senderAddress}`);
  
  const securityService = new InscriptionSecurityService();
  
  try {
    console.log('\n1. Verifying Inscription Format');
    console.log('----------------------------');
    const metadata = await securityService.verifyInscriptionFormat(txid);
    console.log('✓ Inscription format verified');
    console.log('Metadata:', JSON.stringify(metadata, null, 2));
    
    console.log('\n2. Verifying Ownership');
    console.log('-------------------');
    const ownershipValid = await securityService.verifyOwnershipForTransfer(txid, senderAddress);
    console.log('✓ Ownership verification passed');
    
    console.log('\n3. Validating Transfer Parameters');
    console.log('------------------------------');
    const params = {
      txid,
      senderAddress,
      recipientAddress: 'mqGkBvDXyvxgqFWPsZwgv5tWpRBHGzKhQF'
    };
    const paramsValid = securityService.validateTransferParams(params);
    console.log('✓ Transfer parameters validated');
    
    console.log('\n4. Simulating Transfer Confirmation');
    console.log('--------------------------------');
    const confirmed = await securityService.confirmTransfer(metadata, params.recipientAddress);
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
const txid = process.argv[2] || '78ec47dcbce5fa62a0c7a2fa2f9badad47f065a3c572621826796f714eaa0bd8';
runSecurityChecks(txid); 