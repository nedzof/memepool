import { getWalletProperties, publicKeyToLegacyAddress } from './walletEvents.js';
import { fetchBalanceFromWhatsOnChain } from './blockchain.js';
import { logError, logSecurityEvent } from '../errors.js';
import { terminateSession } from './auth/session.js';
import { bsv } from '../bsv.js';

// Derive public key from private key
function derivePublicKey(privateKey) {
  try {
    const bsvPrivateKey = bsv.PrivateKey.fromWIF(privateKey);
    const publicKey = bsvPrivateKey.toPublicKey();
    return publicKey.toString('hex');
  } catch (error) {
    console.error('Error deriving public key:', error);
    throw new Error('Failed to derive public key from private key');
  }
}

// Validation pipeline
export async function validateSession() {
  try {
    // Get session data
    const session = localStorage.getItem('memepire_wallet_session');
    if (!session) {
      throw new Error('No session found');
    }
    const sessionData = JSON.parse(session);
    
    // Validate based on login type
    switch (sessionData.loginType) {
      case 'okx':
      case 'unisat':
      case 'yours':
        await validateWalletIntegration(sessionData);
        break;
      case 'manual':
      case 'imported':  
        await validateManualImport(sessionData);
        break;
      default:
        throw new Error(`Invalid login type: ${sessionData.loginType}`);
    }
    
    console.log('Session validation successful');
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    logError(error);
    logSecurityEvent('Session validation failed', { error });
    
    // Reset session state
    localStorage.removeItem('memepire_wallet_session');
    
    // Terminate session
    await terminateSession();
    
    // Force re-authentication
    window.location.href = '/login';
    
    return false;
  }
}

// Validate wallet integrations (OKX, Unisat, Yours)
async function validateWalletIntegration(sessionData) {
  // Verify public key authenticity
  const { publicKey } = sessionData;
  if (!publicKey) {
    throw new Error('Public key not found in session');
  }
  
  await validatePublicKey(publicKey);
}

// Validate manual login and imported wallets  
async function validateManualImport(sessionData) {
  // Derive public key from private key
  const { privateKey } = sessionData;
  if (!privateKey) {
    throw new Error('Private key not found in session');
  }
  
  const publicKey = derivePublicKey(privateKey);
  await validatePublicKey(publicKey);
}

// Common public key validation logic
async function validatePublicKey(publicKey) {
  try {
    // Validate legacy address derivation
    const legacyAddress = await publicKeyToLegacyAddress(publicKey);
    if (!legacyAddress) {
      throw new Error('Failed to derive legacy address');
    }
    
    // Confirm balance retrieval
    const balance = await fetchBalanceFromWhatsOnChain(legacyAddress);
    if (balance === null) {
      throw new Error('Failed to retrieve balance');
    }
    
    // Authenticate wallet connection type
    const properties = await getWalletProperties();
    if (!properties.connectionType) {
      throw new Error('Failed to authenticate connection type');
    }
  } catch (error) {
    console.error('Public key validation failed:', error);
    throw error;
  }
}

// Validate wallet properties
export function validateWalletProperties(wallet) {
  if (!wallet) {
    throw new Error('No wallet instance found');
  }

  try {
    // Check required properties
    const requiredProperties = ['publicKey', 'legacyAddress', 'connectionType', 'balance'];
    for (const prop of requiredProperties) {
      if (!(prop in wallet)) {
        throw new Error(`Missing required property: ${prop}`);
      }
    }

    // Validate public key format
    const pubKeyRegex = /^[0-9a-fA-F]{66}$/;  // 33 bytes (compressed) = 66 hex chars
    if (!pubKeyRegex.test(wallet.publicKey)) {
      throw new Error('Invalid public key format');
    }

    // Validate legacy address format
    const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    if (!legacyRegex.test(wallet.legacyAddress)) {
      throw new Error('Invalid legacy address format');
    }

    // Validate connection type
    const validTypes = ['okx', 'unisat', 'yours', 'manual', 'imported'];
    if (!validTypes.includes(wallet.connectionType)) {
      throw new Error('Invalid connection type');
    }

    // Validate balance
    if (typeof wallet.balance !== 'number' || isNaN(wallet.balance) || wallet.balance < 0) {
      throw new Error('Invalid balance');
    }

    return true;
  } catch (error) {
    console.error('Wallet properties validation failed:', error);
    throw error;
  }
} 