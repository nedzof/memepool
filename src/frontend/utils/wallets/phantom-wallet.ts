// Types for Phantom Bitcoin Provider
type DisplayEncoding = 'utf8' | 'hex';
type PhantomEvent = 'connect' | 'disconnect' | 'accountChanged';

export type BtcAccount = {
  address: string;
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
  publicKey: string;
  purpose: "payment" | "ordinals";
};

interface PhantomBitcoinProvider {
  isPhantom?: boolean;
  request: (args: { method: string; params?: any }) => Promise<any>;
  on: (event: string, callback: (args: any) => void) => void;
  requestAccounts: () => Promise<BtcAccount[]>;
}

export class PhantomWallet {
  private static instance: PhantomWallet;
  private connected: boolean = false;
  private accounts: BtcAccount[] = [];
  private currentAccount: BtcAccount | null = null;
  private provider: PhantomBitcoinProvider | null = null;

  private constructor() {
    console.log('PhantomWallet: Initializing singleton instance');
    this.setupEventListeners();
  }

  public static getInstance(): PhantomWallet {
    if (!PhantomWallet.instance) {
      PhantomWallet.instance = new PhantomWallet();
    }
    return PhantomWallet.instance;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Wait for provider to be available
    const setupListener = () => {
      const provider = window.phantom?.bitcoin;
      if (provider) {
        provider.on('accountsChanged', (accounts: BtcAccount[]) => {
          console.log('PhantomWallet: Accounts changed:', accounts);
          if (accounts.length === 0) {
            console.log('PhantomWallet: No accounts available - resetting state');
            this.disconnect();
          } else {
            this.accounts = accounts;
            this.currentAccount = accounts.find((acc) => acc.addressType === 'p2tr') || accounts[0];
            this.connected = true;
            console.log('PhantomWallet: Updated accounts:', this.currentAccount);
          }
        });
        console.log('PhantomWallet: Event listener setup complete');
      } else {
        console.log('PhantomWallet: Provider not available for event listener, retrying...');
        setTimeout(setupListener, 100);
      }
    };

    setupListener();
  }

  private getProvider(): PhantomBitcoinProvider | null {
    if (typeof window === 'undefined') return null;
    
    const provider = window.phantom?.bitcoin;
    if (!provider || !provider.isPhantom) {
      return null;
    }
    
    this.provider = provider;
    return provider;
  }

  public isPhantomInstalled(): boolean {
    return this.getProvider() !== null;
  }

  public async requestConnection(): Promise<BtcAccount[]> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('Phantom wallet is not installed');
    }

    try {
      console.log('PhantomWallet: Requesting accounts...');
      const accounts = await provider.requestAccounts();
      console.log('PhantomWallet: Received accounts:', accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available');
      }

      this.accounts = accounts;
      this.connected = true;
      this.currentAccount = accounts.find((acc) => acc.addressType === 'p2tr') || accounts[0];

      return accounts;
    } catch (error) {
      console.error('PhantomWallet: Connection error:', error);
      this.connected = false;
      this.accounts = [];
      this.currentAccount = null;
      throw error;
    }
  }

  public async silentConnect(): Promise<BtcAccount[] | null> {
    const provider = this.getProvider();
    if (!provider) return null;

    try {
      const accounts = await provider.requestAccounts();
      if (accounts && accounts.length > 0) {
        this.accounts = accounts;
        this.connected = true;
        this.currentAccount = accounts.find((acc) => acc.addressType === 'p2tr') || accounts[0];
        return accounts;
      }
    } catch (error) {
      console.log('PhantomWallet: Silent connect failed:', error);
    }
    return null;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.accounts = [];
    this.currentAccount = null;
  }

  public async signMessage(message: string): Promise<string> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('Phantom wallet is not installed');
    }

    if (!this.connected || !this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await provider.request({
        method: 'signMessage',
        params: {
          message: new TextEncoder().encode(message),
          displayContent: message,
        },
      });
      return signature;
    } catch (error) {
      console.error('PhantomWallet: Error signing message:', error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.connected && !!this.currentAccount;
  }

  public getCurrentAccount(): BtcAccount | null {
    return this.currentAccount;
  }

  public getPublicKey(): string | null {
    return this.currentAccount?.publicKey || null;
  }

  public getAccounts(): BtcAccount[] {
    return this.accounts;
  }
} 
