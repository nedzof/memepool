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
      default:
        throw new Error('Unsupported wallet type');
    }
  }
}

export const walletManager = WalletManager.getInstance();

export const generateBtcAddress = (publicKeyHex: string): string => {
  // Convert hex public key string to bytes
  const pubKeyBytes = new Uint8Array(
    publicKeyHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );
  
  const hash = sha256(pubKeyBytes);
  
  // Create a BTC public key hash (RIPEMD160(SHA256(pubKey)))
  const pubKeyHash = ripemd160(hash);
  
  // Add version byte for P2PKH (0x00 for mainnet)
  const versionedPubKeyHash = new Uint8Array([0x00, ...pubKeyHash]);
  
  // Calculate checksum (first 4 bytes of double SHA256)
  const checksum = sha256(sha256(versionedPubKeyHash)).slice(0, 4);
  
  // Combine everything and encode in base58
  const binaryAddr = new Uint8Array([...versionedPubKeyHash, ...checksum]);
  const address = base58.encode(binaryAddr);
  
  return address;
}; 