import { Wallet, WalletType } from '../../shared/types/wallet';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { base58 } from '@scure/base';

class WalletManager {
  private static instance: WalletManager;
  private currentWallet: Wallet | null = null;

  private constructor() {}

  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  async connect(type: WalletType, publicKey?: string): Promise<Wallet> {
    try {
      // Disconnect existing wallet if any
      await this.disconnect();

      // Create and connect new wallet based on type
      const wallet = await this.createWallet(type);
      await wallet.initiateLogin(publicKey);

      // Store wallet instance
      this.currentWallet = wallet;
      return wallet;
    } catch (error) {
      console.error('WalletManager: Failed to connect wallet:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.currentWallet) {
      await this.currentWallet.disconnect();
    }
    this.currentWallet = null;
  }

  getWallet(): Wallet | null {
    return this.currentWallet;
  }

  private async createWallet(type: WalletType): Promise<Wallet> {
    switch (type) {
      case WalletType.BSV:
        const { BSVWallet } = await import('./wallets/bsv-wallet');
        return new BSVWallet();
      case WalletType.Manual:
        const { ManualWallet } = await import('./wallets/manual-wallet');
        return new ManualWallet();
      case WalletType.Imported:
        const { ImportedWallet } = await import('./wallets/imported-wallet');
        return new ImportedWallet();
      case WalletType.Yours:
        const { YoursWallet } = await import('./wallets/yours-wallet');
        return YoursWallet.getInstance();
      default:
        throw new Error('Unsupported wallet type');
    }
  }
}

export const walletManager = WalletManager.getInstance();
export default walletManager;

// Helper function to generate BSV address from public key
export function generateBtcAddress(publicKeyHex: string): string {
  // Convert hex public key to Uint8Array
  const publicKey = new Uint8Array(Buffer.from(publicKeyHex, 'hex'));

  // Perform SHA-256 hashing
  const sha256Hash = sha256(publicKey);

  // Perform RIPEMD-160 hashing
  const ripemd160Hash = ripemd160(sha256Hash);

  // Add version byte (0x00 for mainnet)
  const versionedHash = new Uint8Array(21);
  versionedHash[0] = 0x00;
  versionedHash.set(ripemd160Hash, 1);

  // Perform double SHA-256 for checksum
  const checksum = sha256(sha256(versionedHash));

  // Take first 4 bytes of checksum
  const addressBytes = new Uint8Array(25);
  addressBytes.set(versionedHash);
  addressBytes.set(checksum.slice(0, 4), 21);

  // Encode in base58
  return base58.encode(addressBytes);
} 