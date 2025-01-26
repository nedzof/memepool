import { WalletType } from '../../shared/types/wallet';

// Use browser's crypto API for random values
const getRandomValues = (size: number): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(size));
};

// Convert bytes to hex string
const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert hex string to bytes
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

// Generate mnemonic from entropy
const generateMnemonic = (): string => {
  const entropy = getRandomValues(16);
  const entropyHex = bytesToHex(entropy);
  
  // This is a simplified version. In production, you should use a proper BIP39 implementation
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent',
    'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
    // ... add more words from BIP39 wordlist
  ];
  
  const checksumBits = 4;
  const checksumSize = entropy.length / 4;
  const hashHex = bytesToHex(entropy); // In production, use SHA256
  const checksum = parseInt(hashHex.slice(0, checksumSize), 16);
  
  const indices = [];
  let remainingBits = entropyHex + checksum.toString(2).padStart(checksumBits, '0');
  
  while (remainingBits.length >= 11) {
    const index = parseInt(remainingBits.slice(0, 11), 2);
    indices.push(index % words.length);
    remainingBits = remainingBits.slice(11);
  }
  
  return indices.map(i => words[i]).join(' ');
};

// Validate mnemonic
const validateMnemonic = (mnemonic: string): boolean => {
  // This is a simplified validation. In production, use a proper BIP39 implementation
  const words = mnemonic.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
};

class WalletService {
  private baseUrl = '/api/wallet';

  async createWallet(type: WalletType): Promise<any> {
    try {
      const mnemonic = generateMnemonic();
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, mnemonic }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create wallet');
      }
      
      const wallet = await response.json();
      return { wallet, mnemonic };
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    }
  }

  async importWallet(type: WalletType, mnemonic: string): Promise<any> {
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    try {
      const response = await fetch(`${this.baseUrl}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, mnemonic }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to import wallet');
      }
      
      return response.json();
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/balance/${address}`);
      if (!response.ok) {
        throw new Error('Failed to get balance');
      }
      const data = await response.json();
      return data.balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async sendTransaction(from: string, to: string, amount: number): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, amount }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send transaction');
      }
      
      const data = await response.json();
      return data.txId;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }
}

export const walletService = new WalletService();
export default walletService; 