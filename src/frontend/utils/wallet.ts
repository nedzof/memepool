import { Wallet, WalletType } from '../../shared/types/wallet';

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

  async connect(type: WalletType): Promise<Wallet> {
    try {
      // Disconnect existing wallet if any
      await this.disconnect();

      // Create and connect new wallet based on type
      const wallet = await this.createWallet(type);
      await wallet.initiateLogin();

      // Store wallet instance
      this.currentWallet = wallet;
      return wallet;
    } catch (error) {
      throw new Error('Failed to connect wallet');
    }
  }

  async disconnect(): Promise<void> {
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